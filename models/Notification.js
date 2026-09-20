import mongoose from "mongoose";

const notificationSchema = new mongoose.Schema(
  {
    recipientId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
    senderId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    type: { type: String, enum: ["MESSAGE"], required: true },
    chatId: { type: mongoose.Schema.Types.ObjectId, ref: "Conversation", required: true },
    message: { type: String, required: true, trim: true, maxlength: 2000 },
    read: { type: Boolean, default: false, index: true },
  },
  { timestamps: true },
);

notificationSchema.index({ recipientId: 1, read: 1, createdAt: -1 });
export default mongoose.model("Notification", notificationSchema);
