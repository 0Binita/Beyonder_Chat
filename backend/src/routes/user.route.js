import express from "express";
import {
  recommendFriends,
  sendFriendRequest,
  getFriendRequests,
  acceptFriendRequest,
  rejectFriendRequest,
  cancelFriendRequest,
  getFriends,
  unfriendUser,
  getUserById,
  getAllUsersExceptAdmin,
  getAdminUser,
  ensureEncryptionKeys,
} from "../controllers/user.controller.js";
import { updateProfile } from "../controllers/user.controller.js";
import { protectRoute } from "../middleware/auth.middleware.js";

const router = express.Router();

router.get("/recommend-friends", protectRoute, recommendFriends);

router.post("/friend-requests/:receiverId/send", protectRoute, sendFriendRequest);
router.get("/friend-requests", protectRoute, getFriendRequests);
router.get("/friends", protectRoute, getFriends);
router.post("/friend-requests/:requestId/accept", protectRoute, acceptFriendRequest);
router.post("/friend-requests/:requestId/reject", protectRoute, rejectFriendRequest);
router.delete("/friend-requests/:requestId/cancel", protectRoute, cancelFriendRequest);
router.delete("/friends/unfriend/:userId", protectRoute, unfriendUser);

router.get("/user/:id", protectRoute, getUserById);

router.get("/all-users-except-admin", protectRoute, getAllUsersExceptAdmin);

router.get("/admin-user", protectRoute, getAdminUser);

router.put("/update-profile", protectRoute, updateProfile);

// Add route for generating encryption keys
router.post("/ensure-keys", protectRoute, ensureEncryptionKeys);

export default router;