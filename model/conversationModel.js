// models/Conversation.js
import mongoose from "mongoose";

const ConversationSchema = new mongoose.Schema(
  {
    participants: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }], // [user1, user2]
  },
  { timestamps: true }
);

export default mongoose.model("Conversation", ConversationSchema);
