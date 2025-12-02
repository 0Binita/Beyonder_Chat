import express from "express";
import { reportUser, getReportedUsersCount, reportGroup, getReportedGroupsCount } from "../controllers/report.controller.js";
import { protectRoute } from "../middleware/auth.middleware.js";

const router = express.Router();

// Report a user
router.post("/user/:id", protectRoute, reportUser);
// Get reported users count
router.get("/users/count", protectRoute, getReportedUsersCount);

// Report a group
router.post("/group/:groupId", protectRoute, reportGroup);
// Get reported groups count
router.get("/groups/count", protectRoute, getReportedGroupsCount);

export default router;
