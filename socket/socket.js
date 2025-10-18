import messageModel from "../model/messageModel.js";
import conversationModel from "../model/conversationModel.js";
import bidModel from "../model/bidModel.js";
import productModel from "../model/productModel.js";
import path from "path";
import fs from "fs";
import demandModel from "../model/demandModel.js";
import demandBidModel from "../model/demandBidModel.js";

let onlineUsers = new Map(); // store userId => userData
let bidsByProduct = {}; // store bids for each product
let bidsByDemand = {}; // store bids for each product

const uploadDir = path.join(process.cwd(), "uploads", "bids");

// Ensure uploads directory exists
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

export default function socketHandler(io) {

    io.on("connection", (socket) => {
        console.log("User connected:", socket.id);

        // --- ONLINE USERS ---
        socket.on("userOnline", (user) => {
            if (!user || !user._id) return;

            socket.userId = user._id;
            onlineUsers.set(user._id, user);

            io.emit("onlineUsers", Array.from(onlineUsers.values()));
        });

        socket.on("disconnect", () => {
            onlineUsers.delete(socket.userId);
            io.emit("onlineUsers", Array.from(onlineUsers.values()));
        });

        // --- BIDDING SYSTEM ---
        socket.on("joinProductRoom", async (productId) => {
            socket.join(productId);

            const bids = await bidModel
                .find({ productId })
                .sort({ amount: -1 })
                .populate("user", "name image _id");

            bidsByProduct[productId] = bids;
            socket.emit("updateBids", bidsByProduct[productId]);
        });

        socket.on("joinDemandRoom", async (productId) => {
            socket.join(productId);

            const bids = await demandBidModel
                .find({ productId })
                .sort({ amount: -1 })
                .populate("user", "name image _id");

            bidsByDemand[productId] = bids;
            socket.emit("updateDemandBids", bidsByDemand[productId]);
        });

        socket.on("placeBid", async ({ productId, bid, user }) => {
            try {
                const newBid = await bidModel.create({
                    productId,
                    user: user._id,
                    amount: bid.price,
                });

                await productModel.findOneAndUpdate(
                    { _id: productId },
                    {
                        $inc: { totalBids: 1 },
                        $max: { "highestBid.amount": bid.amount },
                    },
                    { new: true }
                ).then(async (product) => {
                    if (product.highestBid.amount === bid.amount) {
                        await productModel.updateOne(
                            { _id: productId },
                            {
                                $set: {
                                    "highestBid.bidderId": user._id,
                                    "highestBid.biddingTime": new Date(),
                                },
                            }
                        );
                    }
                });

                const bids = await bidModel
                    .find({ productId })
                    .sort({ amount: -1 })
                    .populate("user", "name image _id");

                io.to(productId).emit("updateBids", bids);
            } catch (err) {
                console.error("Place bid error:", err);
            }
        });

        // --- CHAT SYSTEM ---
        socket.on("joinConversation", (conversationId) => {
            socket.join(conversationId);
        });

        socket.on("joinUser", (userId) => {
            socket.join(`user_${userId}`);
        });

        socket.on("typing", ({ conversationId, sender }) => {
            io.to(conversationId).emit("typing", { conversationId, sender });
            io.to(`user_${sender._id}`).emit("typing", { conversationId, sender });
        });

        socket.on("stopTyping", ({ conversationId, sender }) => {
            io.to(conversationId).emit("stopTyping", { conversationId, sender });
            io.to(`user_${sender._id}`).emit("stopTyping", { conversationId, sender });
        });

        socket.on("sendMessage", async ({ conversationId, message }) => {
            try {
                const newMsg = new messageModel({
                    ...message,
                    seenBy: [message.sender?._id],
                });
                await newMsg.save();
                const populatedMsg = await newMsg.populate("sender", "name image _id");

                await conversationModel.findByIdAndUpdate(conversationId, {
                    lastMessage: newMsg._id,
                });

                io.to(conversationId).emit("receiveMessage", populatedMsg);

                const convo = await conversationModel
                    .findById(conversationId)
                    .populate("participants", "_id name image");

                convo.participants.forEach((p) => {
                    io.to(`user_${p._id}`).emit("receiveMessage", populatedMsg);
                });
            } catch (err) {
                console.error("Message save error:", err);
            }
        });

        socket.on("seenMessage", async ({ conversationId, userId }) => {
            try {
                await messageModel.updateMany(
                    { conversationId, seenBy: { $ne: userId } },
                    { $push: { seenBy: userId, seenData: { id: userId, at: new Date() } } }
                );

                const updatedMessages = await messageModel.find({
                    conversationId,
                    seenBy: userId,
                }).select("_id");

                const messageIds = updatedMessages.map((m) => m._id.toString());
                io.to(conversationId).emit("seenUpdate", { userId, messageIds });
            } catch (err) {
                console.error("Seen update error:", err);
            }
        });

        socket.on("placeDemandBid", async ({ productId, bid, user }) => {
            try {
                // Extract bid details
                const { price, note, images } = bid; // images could be base64 or file URLs

                // ✅ If images are base64, save them locally (optional — skip if handled via HTTP API)
                const savedImages = [];
                if (Array.isArray(images) && images.length > 0) {
                    for (const img of images) {
                        if (img.startsWith("data:image")) {
                            const base64Data = img.replace(/^data:image\/\w+;base64,/, "");
                            const fileName = `${Date.now()}_${Math.random().toString(36).substring(2, 8)}.jpg`;
                            const filePath = path.join(uploadDir, fileName);
                            fs.writeFileSync(filePath, base64Data, "base64");
                            savedImages.push(`/uploads/bids/${fileName}`);
                        } else {
                            // if frontend already uploads image and sends URL
                            savedImages.push(img);
                        }
                    }
                }

                // ✅ Create new bid
                const newBid = await demandBidModel.create({
                    productId,
                    user: user._id,
                    amount: price,
                    note: note || "",
                    images: savedImages,
                });

                // ✅ Update product info
                const product = await demandModel.findOneAndUpdate(
                    { _id: productId },
                    {
                        $inc: { totalBids: 1 },
                        $max: { "highestBid.amount": price },
                    },
                    { new: true }
                );

                if (product?.highestBid?.amount === price) {
                    await demandModel.updateOne(
                        { _id: productId },
                        {
                            $set: {
                                "highestBid.bidderId": user._id,
                                "highestBid.biddingTime": new Date(),
                            },
                        }
                    );
                }

                // ✅ Fetch all bids for the product with user info
                const bids = await demandBidModel
                    .find({ productId })
                    .sort({ amount: -1 })
                    .populate("user", "name image _id");

                // ✅ Emit updated bids to all users in the product room
                io.to(productId).emit("updateDemandBids", bids);

                console.log("✅ New bid placed and broadcasted:", { productId, bidCount: bids.length });
            } catch (err) {
                console.error("❌ Place bid error:", err);
            }
        });
    });


}
