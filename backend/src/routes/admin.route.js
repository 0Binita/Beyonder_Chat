

import express from "express";
import { getAllUsers, deleteUser, getReportedUsers } from "../controllers/admin.controller.js";
import { getReportedUsersCount } from "../controllers/report.controller.js";
import { protectRoute } from "../middleware/auth.middleware.js";
import { isAdmin } from "../middleware/isAdmin.middleware.js";

const router = express.Router();

router.get("/users", protectRoute, isAdmin, getAllUsers);
router.delete("/users/:id", protectRoute, isAdmin, deleteUser);
router.get("/reported-users", protectRoute, isAdmin, getReportedUsers);
router.get("/reported-users-count", protectRoute, isAdmin, getReportedUsersCount);

export default router;