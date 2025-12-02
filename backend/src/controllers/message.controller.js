import User from "../models/user.model.js";
import Message from "../models/message.model.js";
import Group from "../models/group.model.js";

import cloudinary from "../lib/cloudinary.js";
import { getReceiverSocketId, io } from "../lib/socket.js";
import { analyzeToxicity, analyzeKeywordToxicity, analyzeTextToxicity, analyzeTextToxicityWithEnhancedSentiment, getEnhancedSentiment } from "../lib/toxicity.js";
import e2eEncryption from "../lib/encryption.js";
import { encryptCaesar, decryptCaesar } from "../lib/caesarCipher.js";

export const getUsersForSidebar = async (req, res) => {
  try {
    const loggedInUserId = req.user._id;
    const loggedInUserEmail = req.user.email;

    if (loggedInUserEmail === "bey@email.com") {
      // Admin: return all users except self
      const filteredUsers = await User.find({ _id: { $ne: loggedInUserId } }).select("-password");
      return res.status(200).json(filteredUsers);
    }

    // Non-admin: return all users except self (enables messaging with anyone)
    const filteredUsers = await User.find({ _id: { $ne: loggedInUserId } }).select("-password");
    if (!filteredUsers) return res.status(404).json({ message: "No users found" });

    res.status(200).json(filteredUsers);
  } catch (error) {
    console.error("Error in getUsersForSidebar: ", error.message);
    res.status(500).json({ error: "Internal server error" });
  }
};

export const getMessages = async (req, res) => {
  try {
    const { id: userToChatId } = req.params;
    const { groupId } = req.query;
    const myId = req.user._id;

    let messages;
    if (groupId) {
      messages = await Message.find({ groupId })
        .populate("senderId", "fullName profilePic email")
        .populate({
          path: "replyTo",
          populate: {
            path: "senderId",
            select: "fullName profilePic email",
          },
        })
        .sort({ createdAt: 1 });
    } else {
      messages = await Message.find({
        $or: [
          { senderId: myId, receiverId: userToChatId },
          { senderId: userToChatId, receiverId: myId },
        ],
      })
        .populate("senderId", "fullName profilePic email")
        .populate("receiverId", "fullName profilePic email")
        .populate({
          path: "replyTo",
          populate: {
            path: "senderId",
            select: "fullName profilePic email",
          },
        })
        .sort({ createdAt: 1 });
    }

    // ✅ Import Reaction model to fetch reactions
    const Reaction = (await import("../models/reaction.model.js")).default;

    // ✅ AUTO-DECRYPT MESSAGES using Caesar cipher
    const decryptedMessages = await Promise.all(messages.map(async (message) => {
      const messageObj = message.toObject();
      
      // Decrypt text if it's encrypted
      if (messageObj.isEncrypted && messageObj.text) {
        messageObj.text = decryptCaesar(messageObj.text);
        messageObj.isDecryptedForDisplay = true;
      }

      // ✅ Also decrypt replyTo message if it exists and is encrypted
      if (messageObj.replyTo && messageObj.replyTo.isEncrypted && messageObj.replyTo.text) {
        messageObj.replyTo.text = decryptCaesar(messageObj.replyTo.text);
        messageObj.replyTo.isDecryptedForDisplay = true;
      }

      // ✅ Fetch reactions for this message
      const reactions = await Reaction.find({ messageId: messageObj._id })
        .populate("userId", "fullName profilePic");
      
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

      messageObj.reactions = reactions;
      messageObj.reactionSummary = reactionSummary;
      messageObj.totalReactions = reactions.length;
      
      return messageObj;
    }));

    res.status(200).json(decryptedMessages);
  } catch (error) {
    console.error("Error in getMessages controller:", error.message);
    res.status(500).json({ error: "Internal server error" });
  }
};

export const sendMessage = async (req, res) => {
  try {
    const { text, image, groupId, sentiment, replyTo, selectedModel } = req.body;
    const receiverId = req.params.id;
    const senderId = req.user._id;

    console.log("📨 [START] sendMessage called");
    console.log("   - Text:", text?.substring(0, 50) || "EMPTY");
    console.log("   - Has Image:", !!image);
    console.log("   - Receiver ID:", receiverId);
    console.log("   - Sender ID:", senderId);
    console.log("   - Group ID:", groupId);
    console.log("   - Selected Model:", selectedModel);

    // ✅ VALIDATE: At least text or image must be present
    if (!text?.trim() && !image) {
      console.log("❌ Message validation failed: Neither text nor image provided");
      return res.status(400).json({ message: "Message must contain text or image" });
    }
    
    console.log("✅ Message validation passed");

    // ✅ UPLOAD IMAGE TO CLOUDINARY if provided
    let uploadedImageUrl = null;
    if (image) {
      try {
        // Check if image is too large (base64 can be huge)
        const imageSizeInMB = (image.length * 0.75) / 1024 / 1024;
        console.log(`📸 Image size: ${imageSizeInMB.toFixed(2)}MB`);
        
        if (imageSizeInMB > 10) {
          console.warn("⚠️ Image too large (>10MB base64), storing base64 directly:", imageSizeInMB);
          // Store base64 directly if too large for Cloudinary
          uploadedImageUrl = image;
        } else {
          console.log("📸 Uploading image to Cloudinary...");
          try {
            const uploadResult = await cloudinary.uploader.upload(image, {
              folder: "chat-app/messages",
              resource_type: "auto",
              quality: "auto",
              fetch_format: "auto",
              timeout: 60000,
            });
            uploadedImageUrl = uploadResult.secure_url;
            console.log("✅ Image uploaded to Cloudinary:", uploadedImageUrl);
          } catch (cloudinaryError) {
            console.warn("⚠️ Cloudinary upload failed, storing base64 directly:", cloudinaryError.message);
            // Fallback to storing base64 directly
            uploadedImageUrl = image;
          }
        }
      } catch (uploadError) {
        console.error("❌ Image processing error:", uploadError.message);
        // Store base64 as fallback
        uploadedImageUrl = image;
      }
    }

    // Analyze sentiment and toxicity (only if text is provided)
    let analysisResult;
    if (text?.trim()) {
      try {
        console.log("🔍 Analyzing sentiment for text:", text.substring(0, 50));
        analysisResult = await analyzeTextToxicityWithEnhancedSentiment(text, selectedModel || 'svc');
        console.log("✅ Analysis complete:", analysisResult.sentiment.value);
      } catch (error) {
        console.warn("⚠️ Sentiment analysis failed, using fallback:", error.message);
        analysisResult = {
          sentiment: { 
            value: sentiment || "neutral", 
            confidence: 0, 
            score: 0, 
            source: "fallback", 
            wordAnalysis: [], 
            enhanced: false 
          },
          toxicity: { 
            isToxic: false, 
            toxicityScore: 0, 
            severity: "none", 
            categories: [] 
          },
          sentimentOverridden: false
        };
      }
    } else {
      // No text to analyze - use default sentiment
      console.log("ℹ️ No text to analyze, using default sentiment");
      analysisResult = {
        sentiment: { 
          value: "neutral", 
          confidence: 0, 
          score: 0, 
          source: "default", 
          wordAnalysis: [], 
          enhanced: false 
        },
        toxicity: { 
          isToxic: false, 
          toxicityScore: 0, 
          severity: "none", 
          categories: [] 
        },
        sentimentOverridden: false
      };
    }

    const finalSentiment = analysisResult.sentiment.value;

    // ✅ ENCRYPT MESSAGE using Caesar cipher with key=4
    const encryptedText = text ? encryptCaesar(text) : null;
    console.log(`🔐 Caesar cipher encryption (key=4):`);
    console.log(`   Original: "${text}"`);
    console.log(`   Encrypted: "${encryptedText}"`);

    // Create message object
    const messageData = {
      senderId,
      text: encryptedText, // ✅ Store encrypted text
      image: uploadedImageUrl || null, // ✅ Use Cloudinary URL
      sentiment: finalSentiment,
      sentimentAnalysis: analysisResult.sentiment,
      sentimentOverridden: analysisResult.sentimentOverridden || false,
      toxicity: analysisResult.toxicity,
      replyTo: replyTo || null,
      isEncrypted: true,
      encryptionMethod: 'caesar',
      encryptionKey: 4
    };

    // Add receiverId or groupId
    if (groupId) {
      messageData.groupId = groupId;
    } else {
      messageData.receiverId = receiverId;
    }

    const newMessage = new Message(messageData);
    await newMessage.save();

    console.log("✅ Message saved successfully (encrypted)");

    // Populate for response
    await newMessage.populate("senderId", "fullName profilePic email");
    if (receiverId) {
      await newMessage.populate("receiverId", "fullName profilePic email");
    }
    if (replyTo) {
      await newMessage.populate({
        path: "replyTo",
        populate: { path: "senderId", select: "fullName profilePic email" }
      });
    }

    const messageForSocket = newMessage.toObject();
    
    // ✅ DECRYPT for socket emission
    if (messageForSocket.isEncrypted && messageForSocket.text) {
      messageForSocket.text = decryptCaesar(messageForSocket.text);
      messageForSocket.isDecryptedForDisplay = true;
      console.log(`🔓 Decrypted for socket: "${messageForSocket.text}"`);
    }

    // ✅ DECRYPT replyTo message for socket emission
    if (messageForSocket.replyTo && messageForSocket.replyTo.isEncrypted && messageForSocket.replyTo.text) {
      messageForSocket.replyTo.text = decryptCaesar(messageForSocket.replyTo.text);
      messageForSocket.replyTo.isDecryptedForDisplay = true;
      console.log(`🔓 Decrypted replyTo for socket: "${messageForSocket.replyTo.text}"`);
    }

    // ✅ EMIT SOCKET EVENTS - Only emit ONCE per message
    if (groupId) {
      console.log("📡 Emitting newMessage to group:", groupId);
      io.to(groupId.toString()).emit("newMessage", messageForSocket);
    } else {
      // Emit to receiver
      const receiverSocketId = getReceiverSocketId(receiverId);
      console.log("📡 Receiver socketId lookup:", { receiverId, receiverSocketId });
      if (receiverSocketId) {
        io.to(receiverSocketId).emit("newMessage", messageForSocket);
        console.log("✅ Socket event emitted to receiver:", receiverSocketId);
      } else {
        console.log("⚠️ No receiver socket found for receiverId:", receiverId);
      }
      
      // Emit to sender (so they see their own message in real-time)
      const senderIdStr = senderId.toString();
      const senderSocketId = getReceiverSocketId(senderIdStr);
      console.log("📡 Sender socketId lookup:", { senderId: senderIdStr, senderSocketId });
      if (senderSocketId) {
        io.to(senderSocketId).emit("newMessage", messageForSocket);
        console.log("✅ Socket event emitted to sender:", senderSocketId);
      } else {
        console.log("⚠️ No sender socket found for senderId:", senderIdStr);
      }
    }

    // Return the decrypted message
    res.status(201).json(messageForSocket);
  } catch (error) {
    console.error("❌ sendMessage error:", error);
    console.error("❌ Error stack:", error.stack);
    res.status(500).json({ 
      message: error.message || "Internal Server Error",
      error: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
};

export const editMessage = async (req, res) => {
  try {
    const { messageId } = req.params;
    const { newText } = req.body;
    const userId = req.user._id;

    // Find the message
    const message = await Message.findById(messageId);
    if (!message) {
      return res.status(404).json({ error: "Message not found" });
    }

    // Check if user is the sender or receiver (for private messages) or group member (for group messages)
    const isPrivateMessage = message.receiverId && !message.groupId;
    const isSender = message.senderId.toString() === userId.toString();
    const isReceiver = isPrivateMessage && message.receiverId.toString() === userId.toString();
    const isGroupMember = message.groupId ? (await Group.findOne({ _id: message.groupId, members: userId })) : false;

    if (!isSender && !isReceiver && !isGroupMember) {
      return res.status(403).json({ error: "You don't have permission to edit this message" });
    }

    // ✅ ENCRYPT the new text using Caesar cipher
    const encryptedText = newText ? encryptCaesar(newText) : null;
    console.log(`🔐 Caesar cipher encryption for edited message (key=4):`);
    console.log(`   Original: "${newText}"`);
    console.log(`   Encrypted: "${encryptedText}"`);

    // Update message
    message.text = encryptedText;
    message.edited = true;
    await message.save();

    // Populate for response
    await message.populate("senderId", "fullName profilePic email");
    if (message.receiverId) {
      await message.populate("receiverId", "fullName profilePic email");
    }
    if (message.replyTo) {
      await message.populate({
        path: "replyTo",
        populate: { path: "senderId", select: "fullName profilePic email" }
      });
    }

    const messageForSocket = message.toObject();

    // ✅ DECRYPT for socket emission
    if (messageForSocket.isEncrypted && messageForSocket.text) {
      messageForSocket.text = decryptCaesar(messageForSocket.text);
      messageForSocket.isDecryptedForDisplay = true;
      console.log(`🔓 Decrypted for socket: "${messageForSocket.text}"`);
    }

    // ✅ DECRYPT replyTo message for socket emission
    if (messageForSocket.replyTo && messageForSocket.replyTo.isEncrypted && messageForSocket.replyTo.text) {
      messageForSocket.replyTo.text = decryptCaesar(messageForSocket.replyTo.text);
      messageForSocket.replyTo.isDecryptedForDisplay = true;
      console.log(`🔓 Decrypted replyTo for socket: "${messageForSocket.replyTo.text}"`);
    }

    // Emit updated message to all clients
    if (message.groupId) {
      console.log("📡 Emitting messageEdited to group:", message.groupId);
      io.to(message.groupId.toString()).emit("messageEdited", messageForSocket);
    } else {
      // For DM: emit to both sender and receiver
      console.log("📡 Emitting messageEdited to both users");
      const receiverSocketId = getReceiverSocketId(message.receiverId.toString());
      const senderSocketId = getReceiverSocketId(userId.toString());
      
      console.log("   Receiver Socket ID:", receiverSocketId);
      console.log("   Sender Socket ID:", senderSocketId);
      
      if (receiverSocketId) {
        io.to(receiverSocketId).emit("messageEdited", messageForSocket);
        console.log("   ✅ Sent to receiver");
      }
      
      if (senderSocketId) {
        io.to(senderSocketId).emit("messageEdited", messageForSocket);
        console.log("   ✅ Sent to sender");
      }
    }

    res.status(200).json(messageForSocket);
  } catch (error) {
    console.error("❌ editMessage error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

export const deleteMessage = async (req, res) => {
  try {
    const { messageId } = req.params;
    const userId = req.user._id;

    // Find the message
    const message = await Message.findById(messageId);
    if (!message) {
      return res.status(404).json({ error: "Message not found" });
    }

    // Check if user is the sender or receiver (for private messages) or group member (for group messages)
    const isPrivateMessage = message.receiverId && !message.groupId;
    const isSender = message.senderId.toString() === userId.toString();
    const isReceiver = isPrivateMessage && message.receiverId.toString() === userId.toString();
    const isGroupMember = message.groupId ? (await Group.findOne({ _id: message.groupId, members: userId })) : false;

    if (!isSender && !isReceiver && !isGroupMember) {
      return res.status(403).json({ error: "You don't have permission to delete this message" });
    }

    // Soft delete - mark as deleted instead of actually removing
    message.isDeleted = true;
    message.text = null; // Clear the text
    await message.save();

    console.log("✅ Message marked as deleted:", messageId);

    // Populate for response
    await message.populate("senderId", "fullName profilePic email");
    if (message.receiverId) {
      await message.populate("receiverId", "fullName profilePic email");
    }

    const messageForSocket = message.toObject();

    // ✅ DECRYPT replyTo message for socket emission
    if (messageForSocket.replyTo && messageForSocket.replyTo.isEncrypted && messageForSocket.replyTo.text) {
      messageForSocket.replyTo.text = decryptCaesar(messageForSocket.replyTo.text);
      messageForSocket.replyTo.isDecryptedForDisplay = true;
      console.log(`🔓 Decrypted replyTo for socket: "${messageForSocket.replyTo.text}"`);
    }

    // Emit deleted message to all clients
    if (message.groupId) {
      console.log("📡 Emitting messageDeleted to group:", message.groupId);
      io.to(message.groupId.toString()).emit("messageDeleted", messageForSocket);
    } else {
      // For DM: emit to both sender and receiver
      console.log("📡 Emitting messageDeleted to both users");
      const receiverSocketId = getReceiverSocketId(message.receiverId.toString());
      const senderSocketId = getReceiverSocketId(userId.toString());
      
      console.log("   Receiver Socket ID:", receiverSocketId);
      console.log("   Sender Socket ID:", senderSocketId);
      
      if (receiverSocketId) {
        io.to(receiverSocketId).emit("messageDeleted", messageForSocket);
        console.log("   ✅ Sent to receiver");
      }
      
      if (senderSocketId) {
        io.to(senderSocketId).emit("messageDeleted", messageForSocket);
        console.log("   ✅ Sent to sender");
      }
    }

    res.status(200).json({ message: "Message deleted successfully" });
  } catch (error) {
    console.error("❌ deleteMessage error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

export const pinMessage = async (req, res) => {
  try {
    const { messageId } = req.params;
    const userId = req.user._id;

    // Find the message
    const message = await Message.findById(messageId);
    if (!message) {
      return res.status(404).json({ error: "Message not found" });
    }

    // Check if user is the sender or receiver (for private messages) or group member (for group messages)
    const isPrivateMessage = message.receiverId && !message.groupId;
    const isSender = message.senderId.toString() === userId.toString();
    const isReceiver = isPrivateMessage && message.receiverId.toString() === userId.toString();
    const isGroupMember = message.groupId ? (await Group.findOne({ _id: message.groupId, members: userId })) : false;

    if (!isSender && !isReceiver && !isGroupMember) {
      return res.status(403).json({ error: "You don't have permission to pin this message" });
    }

    // Toggle pin status
    const wasPinned = message.pinned;
    message.pinned = !message.pinned;
    await message.save();

    console.log(`✅ Message ${wasPinned ? 'unpinned' : 'pinned'}: ${messageId}`);

    // Populate for response
    await message.populate("senderId", "fullName profilePic email");
    if (message.receiverId) {
      await message.populate("receiverId", "fullName profilePic email");
    }

    const messageForSocket = message.toObject();

    // ✅ DECRYPT for socket emission if encrypted
    if (messageForSocket.isEncrypted && messageForSocket.text) {
      messageForSocket.text = decryptCaesar(messageForSocket.text);
      messageForSocket.isDecryptedForDisplay = true;
      console.log(`🔓 Decrypted for socket: "${messageForSocket.text}"`);
    }

    // ✅ DECRYPT replyTo message for socket emission
    if (messageForSocket.replyTo && messageForSocket.replyTo.isEncrypted && messageForSocket.replyTo.text) {
      messageForSocket.replyTo.text = decryptCaesar(messageForSocket.replyTo.text);
      messageForSocket.replyTo.isDecryptedForDisplay = true;
      console.log(`🔓 Decrypted replyTo for socket: "${messageForSocket.replyTo.text}"`);
    }

    // Emit updated message to all clients
    if (message.groupId) {
      console.log("📡 Emitting messagePinned to group:", message.groupId);
      io.to(message.groupId.toString()).emit("messagePinned", messageForSocket);
    } else {
      // For DM: emit to both sender and receiver
      console.log("📡 Emitting messagePinned to both users");
      const receiverSocketId = getReceiverSocketId(message.receiverId.toString());
      const senderSocketId = getReceiverSocketId(userId.toString());
      
      console.log("   Receiver Socket ID:", receiverSocketId);
      console.log("   Sender Socket ID:", senderSocketId);
      
      if (receiverSocketId) {
        io.to(receiverSocketId).emit("messagePinned", messageForSocket);
        console.log("   ✅ Sent to receiver");
      }
      
      if (senderSocketId) {
        io.to(senderSocketId).emit("messagePinned", messageForSocket);
        console.log("   ✅ Sent to sender");
      }
    }

    res.status(200).json(messageForSocket);
  } catch (error) {
    console.error("❌ pinMessage error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};