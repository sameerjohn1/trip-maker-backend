import mongoose from "mongoose";

const conversationSchema = new mongoose.Schema(
  {
    participants: [{ type: mongoose.Schema.Types.ObjectId, ref: "User", required: true }],
    lastMessage: { type: mongoose.Schema.Types.ObjectId, ref: "Message" },
    // Tracks which users have "deleted" the conversation (soft delete per-user)
    deletedBy: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
    lastMessageAt: { type: Date, default: Date.now },
  },
  { timestamps: true },
);

conversationSchema.index({ participants: 1 });
conversationSchema.index({ participants: 1, deletedBy: 1 });

export default mongoose.model("Conversation", conversationSchema);
