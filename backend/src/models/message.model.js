import mongoose from "mongoose";

const messageSchema = new mongoose.Schema(
  {
    senderId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    receiverId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: false,
    },
    groupId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Group",
      default: null,
    },
    text: {
      type: String,
    },
    image: {
      type: String,
    },
    // ✅ Simplified encryption fields for Caesar cipher
    isEncrypted: {
      type: Boolean,
      default: true, // ✅ All messages encrypted by default
    },
    encryptionMethod: {
      type: String,
      default: 'caesar',
      enum: ['caesar', 'none']
    },
    encryptionKey: {
      type: Number,
      default: 4 // ✅ Fixed key
    },
    edited: {
      type: Boolean,
      default: false,
    },
    isDeleted: {
      type: Boolean,
      default: false,
    },
    pinned: {
      type: Boolean,
      default: false,
    },
    sentiment: {
      type: String,
      enum: ["positive", "negative", "neutral"],
      default: "neutral",
    },
    sentimentAnalysis: {
      value: {
        type: String,
        enum: ["positive", "negative", "neutral"],
        default: "neutral",
      },
      confidence: {
        type: Number,
        default: 0,
        min: 0,
        max: 1,
      },
      score: {
        type: Number,
        default: 0,
        min: -1,
        max: 1,
      },
      source: {
        type: String,
        enum: ["user_provided", "enhanced_analysis", "toxicity_override", "fallback", "error_fallback"],
        default: "user_provided",
      },
      wordAnalysis: [{
        word: String,
        original_score: Number,
        final_score: Number,
        is_negated: Boolean,
        intensity_multiplier: Number,
        sentiment: String,
      }],
      enhanced: {
        type: Boolean,
        default: false,
      },
    },
    sentimentOverridden: {
      type: Boolean,
      default: false,
    },
    toxicity: {
      isToxic: {
        type: Boolean,
        default: false,
      },
      toxicityScore: {
        type: Number,
        default: 0,
        min: 0,
        max: 1,
      },
      severity: {
        type: String,
        enum: ["none", "warning", "high", "severe"],
        default: "none",
      },
      categories: [{
        type: String,
        enum: ["identity_attack", "insult", "profanity", "threat"],
      }],
    },
    replyTo: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Message",
      default: null,
    },
  },
  { timestamps: true }
);

const Message = mongoose.model("Message", messageSchema);

export default Message;
