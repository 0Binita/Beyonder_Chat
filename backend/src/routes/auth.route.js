import express from "express";
import { checkAuth, login, logout, signup, updateProfile, updateInterests, validatePasswordStrength } from "../controllers/auth.controller.js";
import { protectRoute } from "../middleware/auth.middleware.js";

const router = express.Router();

router.post("/signup", signup);
router.post("/login", login);
router.post("/logout", logout);
router.post("/validate-password", validatePasswordStrength);

router.put("/update-profile", protectRoute, updateProfile);
router.put("/update-interests", protectRoute, updateInterests);

router.get("/check", protectRoute, checkAuth);

export default router;
