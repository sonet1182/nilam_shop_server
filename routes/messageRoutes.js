import express from "express";
import Message from "../model/messageModel.js";
import messageModel from "../model/messageModel.js";
import conversationModel from "../model/conversationModel.js";

const router = express.Router();

// Send message
router.post("/", async (req, res) => {
  const { conversationId, sender, text, receiverId } = req.body;
  console.log('object', req.body);

  try {
    let convo = (conversationId && conversationId != "new")
      ? await conversationModel.findById(conversationId)
      : null;

    console.log('convo', convo);

    let isNew = false;

    // ✅ If no convo exists yet, create one
    if (!convo && receiverId) {
      convo = new conversationModel({
        participants: [sender, receiverId],
        isGroup: false,
      });
      await convo.save();
      isNew = true;
    }

    const newMsg = new messageModel({
      sender: sender,
      text: text,
      conversationId: convo._id,
      seenBy: [sender],
    });
    await newMsg.save();

    convo.lastMessage = newMsg._id;
    await convo.save();

    if (isNew) {
      const io = req.app.get("io");

      const populatedConvo = await conversationModel.findById(convo._id)
        .populate("participants", "name image")
        .populate({
          path: "lastMessage",
          populate: { path: "sender", select: "name image _id" },
        });

      // Send to both participants (their user rooms)
      convo.participants.forEach((p) => {
        io.to(`user_${p}`).emit("newConversation", populatedConvo);
      });
    }

    res.json(newMsg);
  } catch (err) {
    res.status(500).json({ error: "Failed to send message", err });
  }
});

// Get messages of conversation
router.get("/:conversationId", async (req, res) => {
  try {
    const { page = 1, limit = 10 } = req.query; // default page=1, 20 messages per page
    const skip = (page - 1) * limit;

    const messages = await Message.find({ conversationId: req.params.conversationId })
      .sort({ createdAt: -1 }) // newest first
      .skip(skip)
      .limit(parseInt(limit))
      .populate("sender", "name image");

    res.json(messages.reverse()); // reverse so UI sees oldest → newest
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to fetch messages" });
  }
});


router.post("/seen", async (req, res) => {
  const { conversationId, userId } = req.body;

  try {
    const now = new Date();

    await messageModel.updateMany(
      { conversationId, seenBy: { $ne: userId } },
      {
        $addToSet: { seenBy: userId }, // prevent duplicate user
        $push: { seenData: { id: userId, at: new Date() } } // push to array correctly
      }
    );
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get("/unseen/:userId", async (req, res) => {
  try {
    const userId = req.params.userId;

    // First, get all conversation IDs where the user is a participant
    const conversations = await conversationModel.find(
      { participants: userId },
      { _id: 1 }
    );

    const conversationIds = conversations.map(c => c._id);

    // Aggregate unseen messages per conversation
    const unseenCounts = await messageModel.aggregate([
      {
        $match: {
          conversationId: { $in: conversationIds },
          sender: { $ne: userId },
          seenBy: { $not: { $elemMatch: { $eq: userId } } },
        },
      },
      {
        $group: {
          _id: "$conversationId",
          count: { $sum: 1 },
        },
      },
    ]);

    // Convert to object { conversationId: count }
    const result = {};
    unseenCounts.forEach((item) => {
      result[item._id] = item.count;
    });

    res.json(result);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to get unseen counts" });
  }
});



export default router;
