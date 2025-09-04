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
router.get("/:conversationId", async (req, res) => {
  try {
    const messages = await Message.find({ conversationId: req.params.conversationId })
      .populate("sender", "name image");
    res.json(messages);
  } catch (err) {
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
