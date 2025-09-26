import express from 'express';
import mongoose from 'mongoose';
import bodyParser from 'body-parser';
import cors from "cors";
import dotenv from 'dotenv';
import userRoutes from './routes/userRoute.js';
import adminUserRoutes from './routes/admin/userRoutes.js';
import adminDashboardRoutes from './routes/admin/dashboardRoutes.js';
import adminCategoryRoutes from './routes/admin/categoryRoutes.js';
import authRoute from './routes/authRoute.js';
import productRoutes from './routes/productRoutes.js';
import demandRoutes from './routes/demandRoutes.js';
import categoryRoutes from './routes/categoryRoutes.js';
import conversationRoutes from './routes/conversationRoutes.js';
import messageRoutes from './routes/messageRoutes.js';
import http from "http";
import { Server } from 'socket.io';
import messageModel from './model/messageModel.js';
import conversationModel from './model/conversationModel.js';
import bidModel from './model/bidModel.js';
import productModel from './model/productModel.js';
import { isAdmin } from './controller/authController.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 7000;
const MONGO_URL = process.env.MONGO_URL || 'mongodb://localhost:27017/admin';

const server = http.createServer(app);
const io = new Server(server, {
    cors: { origin: "*" },
});

app.set("io", io);

// Store bids in memory (or database)
let bidsByProduct = {};

io.on("connection", (socket) => {
    console.log("User connected:", socket.id);

    socket.on("userOnline", (user) => {
        if (!user || !user._id) return;

        socket.userId = user._id;
        onlineUsers.set(user._id, user); // store full user object

        // Broadcast array of full users
        io.emit("onlineUsers", Array.from(onlineUsers.values()));
    });

    socket.on("joinProductRoom", async (productId) => {
        socket.join(productId);

        const bids = await bidModel
            .find({ productId })
            .sort({ amount: -1 })
            .populate("user", "name image _id");

        bidsByProduct[productId] = bids;


        socket.emit("updateBids", bidsByProduct[productId]);
    });


    socket.on("placeBid", async ({ productId, bid, user }) => {
        try {
            const newBid = await bidModel.create({
                productId,
                user: user._id,
                amount: bid.price,
            });

            // Update highest bid in Product collection (optional, for quick reference)
            await productModel.findOneAndUpdate(
                { _id: productId },
                {
                    $inc: { totalBids: 1 },
                    $max: { "highestBid.amount": bid.amount },
                },
                { new: true }
            ).then(async (product) => {
                // if this bid actually became the highest, update bidder + time
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


            // Emit new bid to all users in product room
            const bids = await bidModel.find({ productId }).sort({ amount: -1 }).populate("user", "name image _id");
            console.log('bidding Data', bids);
            io.to(productId).emit("updateBids", bids);
        } catch (err) {
            console.error("Place bid error:", err);
        }
    });

    // Join conversation room
    socket.on("joinConversation", (conversationId) => {
        socket.join(conversationId);
        console.log(`User joined conversation ${conversationId}`);
    });

    socket.on("joinUser", (userId) => {
        socket.join(`user_${userId}`);
        console.log(`User ${userId} joined room user_${userId}`);
    });

    // Typing events
    socket.on("typing", ({ conversationId, sender }) => {
        io.to(conversationId).emit("typing", { conversationId, sender });
        io.to(`user_${sender._id}`).emit("typing", { conversationId, sender });
    });

    socket.on("stopTyping", ({ conversationId, sender }) => {
        io.to(conversationId).emit("stopTyping", { conversationId, sender });
        io.to(`user_${sender._id}`).emit("stopTyping", { conversationId, sender });
    });

    // Send message
    socket.on("sendMessage", async ({ conversationId, message }) => {
        try {
            const newMsg = new messageModel({ ...message, seenBy: [message.sender?._id] }); // sender has seen
            await newMsg.save();
            const populatedMsg = await newMsg.populate("sender", "name image _id");

            await conversationModel.findByIdAndUpdate(conversationId, {
                lastMessage: newMsg._id,
            });

            // Emit message to everyone in conversation
            io.to(conversationId).emit("receiveMessage", populatedMsg);

            // Also emit to all participants' user rooms
            const convo = await conversationModel.findById(conversationId).populate("participants", "_id name image");
            convo.participants.forEach(p => {
                io.to(`user_${p._id}`).emit("receiveMessage", populatedMsg);
            });
        } catch (err) {
            console.error("Message save error:", err);
        }
    });

    socket.on("seenMessage", async ({ conversationId, userId }) => {
        try {
            const updated = await messageModel.updateMany(
                { conversationId, seenBy: { $ne: userId } },
                { $push: { seenBy: userId, seenData: { id: userId, at: new Date() } } }
            );

            // Get which message IDs were updated
            const updatedMessages = await messageModel.find({
                conversationId,
                seenBy: userId
            }).select("_id");

            const messageIds = updatedMessages.map((m) => m._id.toString());

            io.to(conversationId).emit("seenUpdate", { userId, messageIds });
        } catch (err) {
            console.error("Seen update error:", err);
        }
    });

    // When user disconnects
    socket.on("disconnect", () => {
        removeUser(socket.userId);
        io.emit("onlineUsers", getAllOnlineUsers());
    });
});

let onlineUsers = new Map(); // store userId => userData


function getAllOnlineUsers() {
    return Array.from(onlineUsers.values());
}

function removeUser(userId) {
    onlineUsers.delete(userId);
}

// Middleware
app.use(bodyParser.json());
app.use(cors({ origin: process.env.CLIENT_URL, credentials: true }));

app.get("/api/hello", (req, res) => {
    res.json({ message: "Hello from Express!" });
});

app.use('/api', userRoutes);
app.use('/api/auth', authRoute);
app.use("/api/products", productRoutes);
app.use("/api/categories", categoryRoutes);
app.use("/api/demands", demandRoutes);

app.use("/uploads", express.static("uploads"));

app.use("/api/conversations", conversationRoutes);
app.use("/api/messages", messageRoutes);

//Admin Routes
app.use("/api/admin/users", isAdmin, adminUserRoutes);
app.use("/api/admin/dashboard", isAdmin, adminDashboardRoutes);
app.use("/api/admin/categories", isAdmin, adminCategoryRoutes);

// MongoDB connection and server start
mongoose
    .connect(MONGO_URL)
    .then(() => {
        console.log('MongoDB connected');
        server.listen(PORT, () => {
            console.log(`Server is running on port ${PORT}`);
        });
    })
    .catch((error) => console.error('MongoDB connection error:', error));
