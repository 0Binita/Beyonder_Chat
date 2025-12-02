import mongoose from "mongoose";

const userSchema = new mongoose.Schema(
  {
    email: {
      type: String,
      required: true,
      unique: true,
    },
    fullName: {
      type: String,
      required: true,
    },
    password: {
      type: String,
      required: true,
      minlength: 6,
    },
    profilePic: {
      type: String,
      default: "",
    },
    isAdmin: {
      type: Boolean,
      default: false,
    },
    interests: {
      type: [String],
      default: [],
    },
    friends: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
      },
    ],
    // End-to-End Encryption fields
    publicKey: {
      type: String,
      default: null,
      required: false,
    },
    privateKey: {
      type: String,
      default: null,
      required: false,
    },
    keyId: {
      type: String,
      default: null,
      required: false,
      sparse: true, // Only create unique constraint for non-null values
    },
    encryptionEnabled: {
      type: Boolean,
      default: true, // Changed from false to true - encryption enabled by default
    },
  },
  { timestamps: true }
);

const User = mongoose.model("User", userSchema);

export default User;
