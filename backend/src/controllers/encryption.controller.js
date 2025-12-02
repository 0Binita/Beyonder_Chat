import User from "../models/user.model.js";
import e2eEncryption from "../lib/encryption.js";

/**
 * Generate RSA key pair for the authenticated user
 * The private key is returned to the client (must be stored securely client-side)
 * The public key is stored on the server for other users to encrypt messages
 */
export const generateKeyPair = async (req, res) => {
  try {
    const userId = req.user._id;
    
    console.log(`🔐 Generating RSA key pair for user: ${userId}`);
    
    // Generate new RSA key pair
    const { publicKey, privateKey, keyId } = e2eEncryption.generateRSAKeyPair();
    
    // Update user with key information (both public and private)
    const updatedUser = await User.findByIdAndUpdate(
      userId,
      {
        publicKey: publicKey,
        privateKey: privateKey, // Store encrypted private key
        keyId: keyId,
        keyGeneratedAt: new Date(),
        encryptionEnabled: true
      },
      { new: true, select: '-password -privateKey' } // Don't return private key in response
    );
    
    if (!updatedUser) {
      return res.status(404).json({ error: "User not found" });
    }
    
    console.log(`✅ Key pair generated successfully for user: ${userId}`);
    console.log(`📋 Key ID: ${keyId}`);
    
    res.status(200).json({
      message: "Key pair generated successfully",
      keyId: keyId,
      publicKey: publicKey,
      privateKey: privateKey, // ⚠️ IMPORTANT: Client must store this securely!
      encryptionEnabled: true,
      keyGeneratedAt: updatedUser.keyGeneratedAt,
      warning: "IMPORTANT: Store your private key securely! It cannot be recovered if lost."
    });
    
  } catch (error) {
    console.error("❌ Key generation error:", error);
    res.status(500).json({ 
      error: "Key generation failed",
      details: error.message 
    });
  }
};

/**
 * Get user's public key information (for encryption by others)
 */
export const getPublicKey = async (req, res) => {
  try {
    const { userId } = req.params;
    
    const user = await User.findById(userId).select('publicKey keyId encryptionEnabled fullName');
    
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }
    
    if (!user.encryptionEnabled || !user.publicKey) {
      return res.status(400).json({ 
        error: "User has not enabled encryption",
        encryptionEnabled: false
      });
    }
    
    res.status(200).json({
      userId: user._id,
      fullName: user.fullName,
      publicKey: user.publicKey,
      keyId: user.keyId,
      encryptionEnabled: user.encryptionEnabled
    });
    
  } catch (error) {
    console.error("❌ Get public key error:", error);
    res.status(500).json({ 
      error: "Failed to get public key",
      details: error.message 
    });
  }
};

/**
 * Get all friends' public keys for encryption
 */
export const getFriendsPublicKeys = async (req, res) => {
  try {
    const userId = req.user._id;
    
    const user = await User.findById(userId)
      .populate('friends', 'publicKey keyId encryptionEnabled fullName')
      .select('friends');
    
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }
    
    // Filter friends who have encryption enabled
    const encryptedFriends = user.friends.filter(friend => 
      friend.encryptionEnabled && friend.publicKey
    );
    
    const friendsKeys = encryptedFriends.map(friend => ({
      userId: friend._id,
      fullName: friend.fullName,
      publicKey: friend.publicKey,
      keyId: friend.keyId,
      encryptionEnabled: friend.encryptionEnabled
    }));
    
    res.status(200).json({
      friends: friendsKeys,
      totalFriends: user.friends.length,
      encryptedFriends: friendsKeys.length
    });
    
  } catch (error) {
    console.error("❌ Get friends keys error:", error);
    res.status(500).json({ 
      error: "Failed to get friends' public keys",
      details: error.message 
    });
  }
};

/**
 * Disable encryption for user (remove keys)
 */
export const disableEncryption = async (req, res) => {
  try {
    const userId = req.user._id;
    
    const updatedUser = await User.findByIdAndUpdate(
      userId,
      {
        publicKey: null,
        keyId: null,
        keyGeneratedAt: null,
        encryptionEnabled: false
      },
      { new: true, select: '-password' }
    );
    
    if (!updatedUser) {
      return res.status(404).json({ error: "User not found" });
    }
    
    console.log(`🔓 Encryption disabled for user: ${userId}`);
    
    res.status(200).json({
      message: "Encryption disabled successfully",
      encryptionEnabled: false,
      warning: "All future messages will be sent unencrypted"
    });
    
  } catch (error) {
    console.error("❌ Disable encryption error:", error);
    res.status(500).json({ 
      error: "Failed to disable encryption",
      details: error.message 
    });
  }
};

/**
 * Get user's encryption status
 */
export const getEncryptionStatus = async (req, res) => {
  try {
    const userId = req.user._id;
    
    const user = await User.findById(userId).select('encryptionEnabled keyId keyGeneratedAt');
    
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }
    
    res.status(200).json({
      encryptionEnabled: user.encryptionEnabled,
      keyId: user.keyId,
      keyGeneratedAt: user.keyGeneratedAt,
      hasKeys: !!user.keyId
    });
    
  } catch (error) {
    console.error("❌ Get encryption status error:", error);
    res.status(500).json({ 
      error: "Failed to get encryption status",
      details: error.message 
    });
  }
};