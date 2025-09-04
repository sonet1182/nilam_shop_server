import express from "express";
import Message from "../model/messageModel.js";
import messageModel from "../model/messageModel.js";

const router = express.Router();

// Send message
router.post("/", async (req, res) => {
  const { conversationId, sender, text } = req.body;

  try {
    const msg = new Message({ conversationId, sender, text });
    await msg.save();
    res.json(msg);
  } catch (err) {
    res.status(500).json({ error: "Failed to send message" });
  }
});

// Get messages of conversation
// routes/messageRoutes.js
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
    await messageModel.updateMany(
      { conversationId, seenBy: { $ne: userId } },
      { $push: { seenBy: userId } }
    );
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
