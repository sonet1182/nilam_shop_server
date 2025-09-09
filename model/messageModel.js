import mongoose from "mongoose";

const messageSchema = new mongoose.Schema(
  {
    conversationId: { type: mongoose.Schema.Types.ObjectId, ref: "Conversation" },
    sender: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    text: { type: String, required: true },
    seenBy: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
    seenData: [
      {
        id: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
        at: { type: Date, default: Date.now }
      }
    ]
  },
  { timestamps: true }
);

export default mongoose.model("Message", messageSchema);
