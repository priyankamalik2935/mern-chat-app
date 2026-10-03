import mongoose from "mongoose";

const messageSchema = new mongoose.Schema(
  {
    chat: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Chat",
      required: true,
      index: true,
    },
    sender: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    content: {
      type: String,
      required: [true, "Message content is required"],
      trim: true,
      maxlength: [2000, "Message too long"],
    },
    messageType: {
      type: String,
      enum: ["text", "image", "file"],
      default: "text",
    },
    attachments: [
      {
        url: String,
        filename: String,
        mimetype: String,
        size: Number,
      },
    ],
    isRead: {
      type: Boolean,
      default: false,
    },
    readAt: {
      type: Date,
      default: null,
    },
    isDeleted: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
  }
);

messageSchema.index({ chat: 1, createdAt: -1 });
messageSchema.index({ sender: 1 });
messageSchema.index({ isRead: 1 });

messageSchema.virtual("receiver", {
  ref: "User",
  localField: "chat",
  foreignField: "participants",
  justOne: false,
});

messageSchema.methods.softDelete = function () {
  this.isDeleted = true;
  this.content = "This message was deleted";
  return this.save();
};

const Message = mongoose.model("Message", messageSchema);
export default Message;