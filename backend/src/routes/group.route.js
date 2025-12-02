import express from 'express';
const router = express.Router();
import { createGroup, getMyGroups, getAllGroups, addMembersToGroup, removeMemberFromGroup, deleteGroup, updateGroupProfile } from '../controllers/group.controller.js';
import { protectRoute } from '../middleware/auth.middleware.js';
import { isAdmin } from '../middleware/isAdmin.middleware.js';

router.post('/', protectRoute, createGroup);
router.get('/', protectRoute, getMyGroups);
router.get('/all', protectRoute, getAllGroups);
router.post('/add-members/:groupId', protectRoute, addMembersToGroup);
router.post('/remove-member/:groupId', protectRoute, removeMemberFromGroup);
router.put('/update-profile/:groupId', protectRoute, updateGroupProfile);
router.delete('/:groupId', protectRoute, isAdmin, deleteGroup);

export default router;