import express from "express";
import { protectRoute } from "../middleware/auth.middleware.js";
import { addReaction, removeReaction, getMessageReactions } from "../controllers/reaction.controller.js";

const router = express.Router();

router.post("/:messageId", protectRoute, addReaction);
router.delete("/:messageId", protectRoute, removeReaction);
router.get("/:messageId", protectRoute, getMessageReactions);

export default router;