import express from "express";
import Conversation from "../model/conversationModel.js";

const router = express.Router();

// Create or get existing 1-to-1 conversation
router.post("/", async (req, res) => {
  const { senderId, receiverId } = req.body;

  try {
    let convo = await Conversation.findOne({
      participants: { $all: [senderId, receiverId] },
      isGroup: false,
    });

    if (!convo) {
      convo = new Conversation({ participants: [senderId, receiverId] });
      await convo.save();
    }

    res.json(convo);
  } catch (err) {
    res.status(500).json({ error: "Failed to create/get conversation" });
  }
});

// Get all conversations of a user
router.get("/:userId", async (req, res) => {
  try {
    const convos = await Conversation.find({
      participants: { $in: [req.params.userId] },
    }).populate("participants", "name image");
    res.json(convos);
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch conversations" });
  }
});

export default router;
