import mongoose from "mongoose";

const chatSchema = new mongoose.Schema(
  {
    participants: [
      { type: mongoose.Schema.Types.ObjectId,ref: "User",required: true,index: true,},],
    isGroup: {type: Boolean,default: false, },
    groupName: {type: String, trim: true, default: "", },
    groupAvatar: {type: String,default: "", },
    admin: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
    lastMessage: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Message",
      default: null,
    },
    unreadCounts: {type: Map,of: Number,default: {},},},
  {timestamps: true,}
);

chatSchema.index({ participants: 1, isGroup: 1 });


chatSchema.statics.findOrCreateOneToOne = async function (userA, userB) {
  let chat = await this.findOne({
    isGroup: false,
    participants: { $all: [userA, userB], $size: 2 },
  });

  if (!chat) {
    chat = await this.create({
      participants: [userA, userB],
      isGroup: false,
    });
  }

  return chat;
};


chatSchema.methods.updateLastMessage = function (messageId) {
  this.lastMessage = messageId;
  return this.save();
};

const Chat = mongoose.model("Chat", chatSchema);
export default Chat;