import Group from '../models/group.model.js';
import User from '../models/user.model.js';
import cloudinary from '../lib/cloudinary.js';
import { io } from '../lib/socket.js';

export const createGroup = async (req, res) => {
  const { name, members } = req.body;
  try {
    const group = await Group.create({
      name,
      members: [...new Set([...members, req.user.id])], // Ensure creator is included
      admin: req.user.id,
    });
    res.status(201).json(group);
  } catch (error) {
    res.status(500).json({ message: 'Failed to create group', error: error.message });
  }
};

export const getMyGroups = async (req, res) => {
  try {
    const groups = await Group.find({ members: req.user.id }).populate('members', 'fullName profilePic');
    res.status(200).json(groups);
  } catch (error) {
    res.status(500).json({ message: 'Failed to fetch groups', error: error.message });
  }
};

export const getAllGroups = async (req, res) => {
  try {
    const groups = await Group.find().populate('members', 'fullName email profilePic');
    res.status(200).json(groups);
  } catch (error) {
    res.status(500).json({ message: 'Failed to fetch all groups', error: error.message });
  }
};

export const addMembersToGroup = async (req, res) => {
  const { groupId } = req.params;
  const { members } = req.body;

  if (!Array.isArray(members) || members.length === 0) {
    return res.status(400).json({ message: "Members array is required" });
  }

  try {
    const group = await Group.findById(groupId);
    if (!group) return res.status(404).json({ message: "Group not found" });

    const existingMembers = group.members.map(member => member.toString());
    const uniqueMembers = [...new Set([...existingMembers, ...members])];

    group.members = uniqueMembers;
    await group.save();

    const populatedGroup = await Group.findById(groupId).populate('members', 'fullName profilePic');

    res.status(200).json(populatedGroup);
  } catch (error) {
    res.status(500).json({ message: "Failed to add members", error: error.message });
  }
};
export const removeMemberFromGroup = async (req, res) => {
  const { groupId } = req.params;
  const userId = req.user.id;

  try {
    const group = await Group.findById(groupId);
    if (!group) return res.status(404).json({ message: "Group not found" });

    if (!group.members.includes(userId)) {
      return res.status(400).json({ message: "User is not a member of the group" });
    }

    group.members = group.members.filter(member => member.toString() !== userId.toString());

    await group.save();

    const updatedGroup = await Group.findById(groupId).populate('members', 'fullName profilePic');

    res.status(200).json({ message: "You have left the group", group: updatedGroup });
  } catch (error) {
    res.status(500).json({ message: "Failed to leave group", error: error.message });
  }
};

export const deleteGroup = async (req, res) => {
  const { groupId } = req.params;

  try {
    const group = await Group.findById(groupId);
    if (!group) {
      return res.status(404).json({ message: "Group not found" });
    }

    // Delete the group
    await Group.findByIdAndDelete(groupId);

    res.status(200).json({ message: "Group deleted successfully" });
  } catch (error) {
    res.status(500).json({ message: "Failed to delete group", error: error.message });
  }
};

export const updateGroupProfile = async (req, res) => {
  try {
    const { groupId } = req.params;
    const { profilePic } = req.body;
    const userId = req.user._id;

    console.log("🖼️ [updateGroupProfile] Starting update", {
      groupId,
      profilePic: profilePic?.substring(0, 50) + "...",
      userId
    });

    if (!profilePic) {
      console.log("❌ No profile pic provided");
      return res.status(400).json({ message: "Profile pic is required" });
    }

    // Check if group exists
    const group = await Group.findById(groupId);
    if (!group) {
      console.log("❌ Group not found:", groupId);
      return res.status(404).json({ message: "Group not found" });
    }

    console.log("✅ Group found:", group.name);

    // Check if user is admin or member of the group
    const isAdmin = group.admin.toString() === userId.toString();
    const isMember = group.members.some(member => member.toString() === userId.toString());
    
    console.log("👤 Permission check:", { isAdmin, isMember, groupId });
    
    if (!isAdmin && !isMember) {
      console.log("❌ User not authorized");
      return res.status(403).json({ message: "You don't have permission to update this group" });
    }

    let finalProfilePicUrl;

    // Check if profilePic is a URL
    if (profilePic.startsWith("http://") || profilePic.startsWith("https://")) {
      finalProfilePicUrl = profilePic; // Use as is
      console.log("✅ Using provided URL:", finalProfilePicUrl);
    } else {
      // Upload to Cloudinary
      try {
        console.log("📤 Uploading to Cloudinary...");
        const uploadResponse = await cloudinary.uploader.upload(profilePic, {
          folder: "group_profiles",
        });
        finalProfilePicUrl = uploadResponse.secure_url;
        console.log("✅ Cloudinary upload success:", finalProfilePicUrl);
      } catch (uploadError) {
        console.log("❌ Error uploading to Cloudinary:", uploadError);
        return res.status(500).json({ message: "Failed to upload group profile picture" });
      }
    }

    console.log("💾 Updating database with URL:", finalProfilePicUrl);
    const updatedGroup = await Group.findByIdAndUpdate(
      groupId,
      { profilePic: finalProfilePicUrl },
      { new: true }
    ).populate('members', 'fullName profilePic');

    console.log("✅ Database updated, new profilePic:", updatedGroup.profilePic);

    // Emit group profile update to all group members
    // Both to the group room (for users in the chat) and via userSocketMap (for users viewing group details)
    console.log("📡 Emitting to group room:", groupId.toString());
    io.to(groupId.toString()).emit("groupProfileUpdated", {
      groupId: updatedGroup._id,
      profilePic: updatedGroup.profilePic,
      updatedGroup: updatedGroup
    });

    // Also broadcast to all connected clients (fallback for users not in the room)
    console.log("📡 Broadcasting to all clients");
    io.emit("groupProfileUpdated", {
      groupId: updatedGroup._id,
      profilePic: updatedGroup.profilePic,
      updatedGroup: updatedGroup
    });

    console.log("✅ [updateGroupProfile] Complete");
    res.status(200).json(updatedGroup);
  } catch (error) {
    console.log("error in update group profile:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};