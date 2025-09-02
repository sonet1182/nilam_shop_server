import express from "express";
import Message from "../model/messageModel.js";

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

export default router;
