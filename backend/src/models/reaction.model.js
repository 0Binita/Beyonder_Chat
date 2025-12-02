import mongoose from "mongoose";

const reactionSchema = new mongoose.Schema(
  {
    messageId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Message",
      required: true,
    },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    type: {
      type: String,
      required: true,
      enum: ["👍", "❤️", "😂", "😮", "😢", "😡"], // Common emoji reactions
    },
  },
  { timestamps: true }
);

// Ensure a user can only have one reaction per message
reactionSchema.index({ messageId: 1, userId: 1 }, { unique: true });

const Reaction = mongoose.model("Reaction", reactionSchema);

export default Reaction;