// routes/messageRoute.js
import express from "express";
import conversationModel from "../model/conversationModel.js";
import messageModel from "../model/messageModel.js";
import mongoose from "mongoose";

const router = express.Router();

// Get conversations for a user
router.get("/conversations/:userId", async (req, res) => {
  try {
    const { userId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(userId)) {
      return res.status(400).json({ message: "Invalid user ID" });
    }

    const conversations = await conversationModel
      .find({
        participants: new mongoose.Types.ObjectId(userId)  // ✅ use 'new'
      })
      .populate("participants", "name image");

    res.json(conversations);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error fetching conversations.", error: err.message });
  }
});

// Get messages for a conversation
router.get("/:conversationId", async (req, res) => {
  try {
    const messages = await messageModel.find({
      conversationId: req.params.conversationId,
    }).populate("sender", "name image");
    res.json(messages);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Send a new message
router.post("/", async (req, res) => {
  try {
    const { sender, receiver, text } = req.body;

    // Find or create conversation
    let conversation = await conversationModel.findOne({
      participants: { $all: [sender, receiver] },
    });

    if (!conversation) {
      conversation = await conversationModel.create({
        participants: [sender, receiver],
      });
    }

    const message = await messageModel.create({
      conversationId: conversation._id,
      sender,
      text,
    });

    res.json(message);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
