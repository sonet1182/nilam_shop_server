import express from "express";
import mongoose from "mongoose";
import conversationModel from "../model/conversationModel.js";

const router = express.Router();

// Create a new conversation
router.post("/", async (req, res) => {
  try {
    const { participants } = req.body;

    if (!participants || participants.length < 2) {
      return res.status(400).json({ message: "Participants array must have at least 2 users" });
    }

    const conversation = new conversationModel({
      participants: participants.map((id) => new mongoose.Types.ObjectId(id)), // ✅ use 'new'
    });

    const savedConversation = await conversation.save();
    res.status(201).json(savedConversation);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error creating conversation", error: err.message });
  }
});

export default router;
