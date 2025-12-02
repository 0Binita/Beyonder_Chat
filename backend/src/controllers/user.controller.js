import User from "../models/user.model.js";
import { FriendRequest } from "../models/friendRequest.model.js";
import { getReceiverSocketId, io } from "../lib/socket.js";
import e2eEncryption from "../lib/encryption.js";

const cosineSimilarity = (a, b) => {
  const intersection = a.filter(item => b.includes(item));
  return intersection.length / Math.sqrt(a.length * b.length);
};

export const recommendFriends = async (req, res) => {
  try {
    const currentUserId = req.user._id;
    
    // Get current user with their interests and friends
    const currentUser = await User.findById(currentUserId)
      .select('interests friends')
      .populate('friends', '_id');
    
    if (!currentUser || !currentUser.interests || currentUser.interests.length === 0) {
      return res.status(200).json([]);
    }

    const friendIds = currentUser.friends.map(friend => friend._id.toString());
    
    // Get all pending friend requests (sent and received)
    const sentRequests = await FriendRequest.find({
      sender: currentUserId,
      status: 'pending'
    }).select('receiver');
    
    const receivedRequests = await FriendRequest.find({
      receiver: currentUserId,
      status: 'pending'
    }).select('sender');
    
    const sentRequestIds = sentRequests.map(req => req.receiver.toString());
    const receivedRequestIds = receivedRequests.map(req => req.sender.toString());
    const pendingRequestIds = [...sentRequestIds, ...receivedRequestIds];
    
    // Find users with similar interests
    const recommendations = await User.find({
      _id: { 
        $ne: currentUserId,
        $nin: [...friendIds, ...pendingRequestIds]
      },
      interests: { $in: currentUser.interests }
    })
      .select('fullName email profilePic interests')
      .limit(20);
    
    // Calculate similarity and add friendRequestSent flag
    const recommendationsWithSimilarity = recommendations.map(user => {
      const commonInterests = user.interests.filter(interest => 
        currentUser.interests.includes(interest)
      );
      
      const similarityPercentage = Math.round(
        (commonInterests.length / currentUser.interests.length) * 100
      );
      
      return {
        _id: user._id,
        fullName: user.fullName,
        email: user.email,
        profilePic: user.profilePic,
        interests: commonInterests,
        similarityPercentage,
        friendRequestSent: sentRequestIds.includes(user._id.toString())
      };
    });
    
    // Sort by similarity percentage
    recommendationsWithSimilarity.sort((a, b) => b.similarityPercentage - a.similarityPercentage);
    
    res.status(200).json(recommendationsWithSimilarity.slice(0, 10));
  } catch (error) {
    console.error("Error in recommendFriends:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

// Send a friend request
export const sendFriendRequest = async (req, res) => {
  try {
    const senderId = req.user._id;
    const receiverId = req.params.receiverId;

    // Validate receiverId is a valid MongoDB ObjectId
    if (!receiverId.match(/^[0-9a-fA-F]{24}$/)) {
      return res.status(400).json({ message: "Invalid user ID format" });
    }

    if (senderId.toString() === receiverId) {
      return res.status(400).json({ message: "You cannot send a friend request to yourself" });
    }

    // Verify receiver exists
    const receiver = await User.findById(receiverId);
    if (!receiver) {
      return res.status(404).json({ message: "User not found" });
    }

    const existingRequest = await FriendRequest.findOne({
      sender: senderId,
      receiver: receiverId,
      status: "pending",
    });

    if (existingRequest) {
      return res.status(400).json({ message: "Friend request already sent" });
    }

    // Check for reverse request (receiver already sent one to sender)
    const reverseRequest = await FriendRequest.findOne({
      sender: receiverId,
      receiver: senderId,
      status: "pending",
    });

    if (reverseRequest) {
      return res.status(400).json({ message: "Friend request already exists from this user" });
    }

    const newRequest = await FriendRequest.create({
      sender: senderId,
      receiver: receiverId,
    });

    // Populate sender details for socket emission
    await newRequest.populate("sender", "fullName email profilePic");

    // Emit socket event to the receiver
    const receiverSocketId = getReceiverSocketId(receiverId);
    if (receiverSocketId) {
      io.to(receiverSocketId).emit("friendRequestReceived", {
        _id: newRequest._id,
        sender: newRequest.sender,
        direction: "incoming",
        status: newRequest.status
      });
    }

    // Emit socket event to the sender for confirmation
    const senderSocketId = getReceiverSocketId(senderId.toString());
    if (senderSocketId) {
      io.to(senderSocketId).emit("friendRequestSent", {
        _id: newRequest._id,
        receiverId: receiverId,
        status: newRequest.status
      });
    }

    res.status(201).json(newRequest);
  } catch (error) {
    console.error("Error sending friend request:", error);
    console.error("Error details:", error.message);
    res.status(500).json({ message: "Internal Server Error", error: error.message });
  }
};

// Get all incoming and outgoing pending friend requests for the logged-in user
export const getFriendRequests = async (req, res) => {
  try {
    const userId = req.user._id;

    const requests = await FriendRequest.find({
      $or: [{ receiver: userId }, { sender: userId }],
      status: "pending"
    })
      .populate("sender", "fullName email profilePic")
      .populate("receiver", "fullName email profilePic");

    // Filter out requests with null/missing sender or receiver and format the valid ones
    const formatted = requests
      .filter(req => req.sender && req.receiver) // Only include requests with valid sender and receiver
      .map(req => {
        const isIncoming = req.receiver._id.toString() === userId.toString();
        return {
          _id: req._id,
          direction: isIncoming ? "incoming" : "outgoing",
          fullName: isIncoming ? req.sender.fullName : req.receiver.fullName,
          email: isIncoming ? req.sender.email : req.receiver.email,
          profilePic: isIncoming ? req.sender.profilePic : req.receiver.profilePic,
          status: req.status,
        };
      });

    res.status(200).json(formatted);
  } catch (error) {
    console.error("Error fetching friend requests:", error);
    res.status(500).json({ message: "Internal Server Error" });
  }
};

// Cleanup orphaned friend requests (requests with deleted users)
export const cleanupOrphanedFriendRequests = async () => {
  try {
    // Find all friend requests
    const allRequests = await FriendRequest.find({})
      .populate("sender", "_id")
      .populate("receiver", "_id");

    // Identify requests with null sender or receiver
    const orphanedRequests = allRequests.filter(req => !req.sender || !req.receiver);
    
    if (orphanedRequests.length > 0) {
      console.log(`Found ${orphanedRequests.length} orphaned friend requests. Cleaning up...`);
      
      // Delete orphaned requests
      const orphanedIds = orphanedRequests.map(req => req._id);
      await FriendRequest.deleteMany({ _id: { $in: orphanedIds } });
      
      console.log(`Cleaned up ${orphanedRequests.length} orphaned friend requests.`);
    }
  } catch (error) {
    console.error("Error cleaning up orphaned friend requests:", error);
  }
};

// Accept a friend request
export const acceptFriendRequest = async (req, res) => {
  try {
    const requestId = req.params.requestId;
    const request = await FriendRequest.findById(requestId).populate("sender receiver", "fullName email profilePic");

    if (!request || request.receiver._id.toString() !== req.user._id.toString()) {
      return res.status(404).json({ message: "Friend request not found or unauthorized" });
    }

    request.status = "accepted";
    await request.save();

    const senderId = request.sender._id?.toString();
    const receiverId = request.receiver._id?.toString();

    if (!senderId || !receiverId) {
      return res.status(400).json({ message: "Invalid friend IDs" });
    }

    await Promise.all([
      User.findByIdAndUpdate(senderId, { $addToSet: { friends: receiverId } }),
      User.findByIdAndUpdate(receiverId, { $addToSet: { friends: senderId } }),
    ]);

    // Emit socket event to the sender (friend request was accepted)
    const senderSocketId = getReceiverSocketId(senderId);
    if (senderSocketId) {
      io.to(senderSocketId).emit("friendRequestAccepted", {
        _id: request._id,
        acceptedBy: request.receiver,
        status: "accepted"
      });
    }

    // Emit socket event to the receiver (confirmation of acceptance)
    const receiverSocketId = getReceiverSocketId(receiverId);
    if (receiverSocketId) {
      io.to(receiverSocketId).emit("friendRequestUpdated", {
        _id: request._id,
        status: "accepted"
      });
    }

    res.status(200).json({ message: "Friend request accepted" });
  } catch (error) {
    console.error("Error accepting friend request:", error.message);
    console.error(error.stack);
    res.status(500).json({ message: "Internal Server Error" });
  }
};

// Reject a friend request
export const rejectFriendRequest = async (req, res) => {
  try {
    const requestId = req.params.requestId;
    const request = await FriendRequest.findById(requestId).populate("sender receiver", "fullName email profilePic");

    if (!request || request.receiver._id.toString() !== req.user._id.toString()) {
      return res.status(404).json({ message: "Friend request not found" });
    }

    request.status = "rejected";
    await request.save();

    // Emit socket event to the sender (friend request was rejected)
    const senderSocketId = getReceiverSocketId(request.sender._id.toString());
    if (senderSocketId) {
      io.to(senderSocketId).emit("friendRequestRejected", {
        _id: request._id,
        rejectedBy: request.receiver,
        status: "rejected"
      });
    }

    // Emit socket event to the receiver (confirmation of rejection)
    const receiverSocketId = getReceiverSocketId(request.receiver._id.toString());
    if (receiverSocketId) {
      io.to(receiverSocketId).emit("friendRequestUpdated", {
        _id: request._id,
        status: "rejected"
      });
    }

    res.status(200).json({ message: "Friend request rejected" });
  } catch (error) {
    console.error("Error rejecting friend request:", error);
    res.status(500).json({ message: "Internal Server Error" });
  }
};

// Cancel a friend request (by sender)
export const cancelFriendRequest = async (req, res) => {
  try {
    const requestId = req.params.requestId;
    const userId = req.user._id;

    const request = await FriendRequest.findById(requestId).populate("sender receiver", "fullName email profilePic");

    if (!request || request.sender._id.toString() !== userId.toString()) {
      return res.status(404).json({ message: "Friend request not found or not authorized" });
    }

    await FriendRequest.findByIdAndDelete(requestId);

    // Emit socket event to the receiver (friend request was cancelled)
    const receiverSocketId = getReceiverSocketId(request.receiver._id.toString());
    if (receiverSocketId) {
      io.to(receiverSocketId).emit("friendRequestCancelled", {
        _id: request._id,
        cancelledBy: request.sender
      });
    }

    // Emit socket event to the sender (confirmation of cancellation)
    const senderSocketId = getReceiverSocketId(userId.toString());
    if (senderSocketId) {
      io.to(senderSocketId).emit("friendRequestUpdated", {
        _id: request._id,
        status: "cancelled"
      });
    }

    res.status(200).json({ message: "Friend request cancelled" });
  } catch (error) {
    console.error("Error cancelling friend request:", error);
    res.status(500).json({ message: "Internal Server Error" });
  }
};


// Get friends list for logged-in user
export const getFriends = async (req, res) => {
  try {
    const userId = req.user._id;
    const user = await User.findById(userId).populate(
      "friends",
      "fullName email profilePic interests"
    );
    if (!user) return res.status(404).json({ message: "User not found" });
    res.status(200).json(user.friends);
  } catch (error) {
    console.error("Error fetching friends:", error);
    res.status(500).json({ message: "Internal Server Error" });
  }
};

// Unfriend a user
export const unfriendUser = async (req, res) => {
  try {
    const currentUserId = req.user._id.toString();
    const friendId = req.params.userId;

    if (currentUserId === friendId) {
      return res.status(400).json({ message: "You cannot unfriend yourself" });
    }

    // Remove friend from both users' friends arrays
    await Promise.all([
      User.findByIdAndUpdate(currentUserId, { $pull: { friends: friendId } }),
      User.findByIdAndUpdate(friendId, { $pull: { friends: currentUserId } })
    ]);

    // Delete any accepted friend requests between these users
    await FriendRequest.deleteMany({
      $or: [
        { sender: currentUserId, receiver: friendId, status: 'accepted' },
        { sender: friendId, receiver: currentUserId, status: 'accepted' }
      ]
    });

    // Emit socket events to notify both users
    const friendSocketId = getReceiverSocketId(friendId);
    if (friendSocketId) {
      io.to(friendSocketId).emit("friendRemoved", {
        userId: currentUserId
      });
    }

    const currentUserSocketId = getReceiverSocketId(currentUserId);
    if (currentUserSocketId) {
      io.to(currentUserSocketId).emit("friendRemoved", {
        userId: friendId
      });
    }

    res.status(200).json({ message: "Unfriended successfully" });
  } catch (error) {
    console.error("Error unfriending user:", error);
    res.status(500).json({ message: "Failed to unfriend user" });
  }
}

export const getUserById = async (req, res) => {
  try {
    const userId = req.params.id;
    const user = await User.findById(userId).select('-password');

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    res.status(200).json(user);
  } catch (error) {
    console.error("Error fetching user by ID:", error);
    res.status(500).json({ message: 'Internal Server Error' });
  }
};

export const getAllUsersExceptAdmin = async (req, res) => {
  try {
    const adminEmail = "bey@email.com";
    const currentUserId = req.user._id;

    const users = await User.find({
      email: { $ne: adminEmail },
      _id: { $ne: currentUserId }
    }).select("fullName email profilePic interests");

    res.status(200).json(users);
  } catch (error) {
    console.error("Error fetching all users except admin:", error);
    res.status(500).json({ message: "Internal Server Error" });
  }
};

// Get admin user details
export const getAdminUser = async (req, res) => {
  try {
    const adminEmail = "bey@email.com";
    const adminUser = await User.findOne({ email: adminEmail }).select("fullName email profilePic");
    if (!adminUser) return res.status(404).json({ message: "Admin user not found" });
    res.status(200).json(adminUser);
  } catch (error) {
    console.error("Error fetching admin user:", error);
    res.status(500).json({ message: "Internal Server Error" });
  }
};
export const updateProfile = async (req, res) => {
  try {
    const userId = req.user._id; // from protectRoute middleware

    const { profilePic, ...otherFields } = req.body;

    const user = await User.findById(userId);

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    if (profilePic) {
      user.profilePic = profilePic;
    }

    // Update other fields if any
    for (const key in otherFields) {
      user[key] = otherFields[key];
    }

    await user.save();

    res.status(200).json({ message: "Profile updated successfully", user });
  } catch (error) {
    console.error("Error updating profile:", error);
    res.status(500).json({ message: "Server error while updating profile" });
  }
};

// Add this new function to generate keys for existing users
export const ensureEncryptionKeys = async (req, res) => {
  try {
    const userId = req.user._id;
    const user = await User.findById(userId);

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    // ✅ Check if user already has keys
    if (user.publicKey && user.privateKey && user.keyId) {
      return res.status(200).json({ 
        message: "Encryption keys already exist",
        hasKeys: true 
      });
    }

    // ✅ Generate NEW keys for existing users without them
    console.log("🔐 Generating encryption keys for existing user:", userId);
    const { publicKey, privateKey, keyId } = await e2eEncryption.generateKeyPair();

    user.publicKey = publicKey;
    user.privateKey = privateKey;
    user.keyId = keyId;
    user.encryptionEnabled = true;

    await user.save();

    console.log("✅ Encryption keys generated for user:", userId);

    res.status(200).json({ 
      message: "Encryption keys generated successfully",
      hasKeys: true 
    });
  } catch (error) {
    console.error("Error generating encryption keys:", error);
    res.status(500).json({ message: "Internal Server Error" });
  }
};