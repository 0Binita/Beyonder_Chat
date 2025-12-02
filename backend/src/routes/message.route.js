import express from "express";
import { protectRoute } from "../middleware/auth.middleware.js";
import {
  getUsersForSidebar,
  getMessages,
  sendMessage,
  editMessage,
  deleteMessage,
  pinMessage
} from "../controllers/message.controller.js";

const router = express.Router();

// GET endpoints (more specific first)
router.get("/users", protectRoute, getUsersForSidebar);

// Message operations (more specific routes before generic :id route)
router.put("/edit/:messageId", protectRoute, editMessage);
router.delete("/delete/:messageId", protectRoute, deleteMessage);
router.put("/pin/:messageId", protectRoute, pinMessage);

// POST endpoints
router.post("/send", protectRoute, sendMessage);
router.post("/send/:id", protectRoute, sendMessage);

// Generic message retrieval (least specific route - last)
router.get("/:id", protectRoute, getMessages);

export default router;
