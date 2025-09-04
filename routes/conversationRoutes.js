import express from "express";
import Conversation from "../model/conversationModel.js";
import conversationModel from "../model/conversationModel.js";
import messageModel from "../model/messageModel.js";

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
    })
      .populate("participants", "name image")
      .populate({
        path: "lastMessage",
        populate: { path: "sender", select: "name image _id" },
      })
      .sort({ updatedAt: -1 });

    res.json(convos);
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch conversations" });
  }
});


router.get("/details/:id", async (req, res) => {
  try {
    const conversation = await conversationModel.findById(req.params.id)
      .populate("participants", "name image")
      .lean();

    if (!conversation) {
      return res.status(404).json({ message: "Conversation not found" });
    }

    const messages = await messageModel.find({ conversationId: req.params.id })
      .populate("sender", "name image")
      .sort({ createdAt: 1 })
      .lean();

    res.json({
      conversation,
      messages,
    });
  } catch (err) {
    console.error("Error fetching conversation details:", err);
    res.status(500).json({ message: "Server error:", err });
  }
});

export default router;
