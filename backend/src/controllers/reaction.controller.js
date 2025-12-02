import Reaction from "../models/reaction.model.js";
import Message from "../models/message.model.js";
import { getReceiverSocketId, io } from "../lib/socket.js";

export const addReaction = async (req, res) => {
  try {
    const { messageId } = req.params;
    const { type } = req.body;
    const userId = req.user._id;

    // Check if message exists
    const message = await Message.findById(messageId);
    if (!message) {
      return res.status(404).json({ error: "Message not found" });
    }

    // Check if user already reacted to this message
    const existingReaction = await Reaction.findOne({ messageId, userId });

    if (existingReaction) {
      // Update existing reaction
      existingReaction.type = type;
      await existingReaction.save();
      
      const populatedReaction = await Reaction.findById(existingReaction._id).populate("userId", "fullName profilePic");
      
      // Emit socket event for real-time updates
      if (message.groupId) {
        io.to(message.groupId.toString()).emit("reactionAdded", { 
          messageId, 
          reaction: populatedReaction 
        });
      } else {
        // For private messages: emit to both receiver and sender
        const receiverSocketId = getReceiverSocketId(message.receiverId.toString());
        const senderSocketId = getReceiverSocketId(message.senderId.toString());
        
        if (receiverSocketId) {
          io.to(receiverSocketId).emit("reactionAdded", { 
            messageId, 
            reaction: populatedReaction 
          });
        }
        if (senderSocketId) {
          io.to(senderSocketId).emit("reactionAdded", { 
            messageId, 
            reaction: populatedReaction 
          });
        }
      }
      
      return res.status(200).json(populatedReaction);
    } else {
      // Create new reaction
      const newReaction = new Reaction({
        messageId,
        userId,
        type,
      });

      await newReaction.save();
      const populatedReaction = await Reaction.findById(newReaction._id).populate("userId", "fullName profilePic");
      
      // Emit socket event for real-time updates
      if (message.groupId) {
        io.to(message.groupId.toString()).emit("reactionAdded", { 
          messageId, 
          reaction: populatedReaction 
        });
      } else {
        // For private messages: emit to both receiver and sender
        const receiverSocketId = getReceiverSocketId(message.receiverId.toString());
        const senderSocketId = getReceiverSocketId(message.senderId.toString());
        
        if (receiverSocketId) {
          io.to(receiverSocketId).emit("reactionAdded", { 
            messageId, 
            reaction: populatedReaction 
          });
        }
        if (senderSocketId) {
          io.to(senderSocketId).emit("reactionAdded", { 
            messageId, 
            reaction: populatedReaction 
          });
        }
      }
      
      return res.status(201).json(populatedReaction);
    }
  } catch (error) {
    console.log("Error in addReaction controller: ", error.message);
    res.status(500).json({ error: "Internal server error" });
  }
};

export const removeReaction = async (req, res) => {
  try {
    const { messageId } = req.params;
    const userId = req.user._id;

    const reaction = await Reaction.findOneAndDelete({ messageId, userId });

    if (!reaction) {
      return res.status(404).json({ error: "Reaction not found" });
    }

    // Get message info for socket emission
    const message = await Message.findById(messageId);
    
    // Emit socket event for real-time updates
    if (message.groupId) {
      io.to(message.groupId.toString()).emit("reactionRemoved", { 
        messageId, 
        userId 
      });
    } else {
      // For private messages: emit to both receiver and sender
      const receiverSocketId = getReceiverSocketId(message.receiverId.toString());
      const senderSocketId = getReceiverSocketId(message.senderId.toString());
      
      if (receiverSocketId) {
        io.to(receiverSocketId).emit("reactionRemoved", { 
          messageId, 
          userId 
        });
      }
      if (senderSocketId) {
        io.to(senderSocketId).emit("reactionRemoved", { 
          messageId, 
          userId 
        });
      }
    }

    res.status(200).json({ message: "Reaction removed successfully" });
  } catch (error) {
    console.log("Error in removeReaction controller: ", error.message);
    res.status(500).json({ error: "Internal server error" });
  }
};

export const getMessageReactions = async (req, res) => {
  try {
    const { messageId } = req.params;

    const reactions = await Reaction.find({ messageId }).populate("userId", "fullName profilePic");

    // Group reactions by type
    const reactionSummary = reactions.reduce((acc, reaction) => {
      if (!acc[reaction.type]) {
        acc[reaction.type] = [];
      }
      acc[reaction.type].push({
        userId: reaction.userId._id,
        fullName: reaction.userId.fullName,
        profilePic: reaction.userId.profilePic,
      });
      return acc;
    }, {});

    res.status(200).json({
      reactions,
      summary: reactionSummary,
      total: reactions.length,
    });
  } catch (error) {
    console.log("Error in getMessageReactions controller: ", error.message);
    res.status(500).json({ error: "Internal server error" });
  }
};