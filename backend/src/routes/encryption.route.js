import express from "express";
import { protectRoute } from "../middleware/auth.middleware.js";
import {
  generateKeyPair,
  getPublicKey,
  getFriendsPublicKeys,
  disableEncryption,
  getEncryptionStatus
} from "../controllers/encryption.controller.js";

const router = express.Router();

// All encryption routes require authentication
router.use(protectRoute);

// Generate RSA key pair for current user
router.post("/generate-keys", generateKeyPair);

// Get encryption status for current user
router.get("/status", getEncryptionStatus);

// Get public key for a specific user
router.get("/public-key/:userId", getPublicKey);

// Get all friends' public keys
router.get("/friends-keys", getFriendsPublicKeys);

// Disable encryption for current user
router.delete("/disable", disableEncryption);

export default router;