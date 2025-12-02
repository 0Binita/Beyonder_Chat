import { generateToken } from "../lib/utils.js";
import User from "../models/user.model.js";
import bcrypt from "bcryptjs";
import cloudinary from "../lib/cloudinary.js";
import e2eEncryption from "../lib/encryption.js";
import { validatePassword } from "../lib/passwordValidator.js";

export const signup = async (req, res) => {
  const { fullName, email, password } = req.body;
  try {
    console.log("📝 Signup attempt:", { fullName, email });

    if (!fullName || !email || !password) {
      return res.status(400).json({ message: "All fields are required" });
    }

    // Validate fullName - no numbers allowed
    if (/\d/.test(fullName)) {
      return res.status(400).json({ message: "Full name cannot contain numbers" });
    }

    // Validate password strength
    const passwordValidation = validatePassword(password);
    if (!passwordValidation.isValid) {
      return res.status(400).json({ 
        message: "Password does not meet security requirements",
        errors: passwordValidation.errors
      });
    }

    const user = await User.findOne({ email });

    if (user) return res.status(400).json({ message: "Email already exists" });

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // ✅ Generate encryption keys for the new user
    console.log("🔐 Generating encryption keys for new user...");
    const { publicKey, privateKey, keyId } = await e2eEncryption.generateKeyPair();

    const newUser = new User({
      fullName,
      email,
      password: hashedPassword,
      publicKey,
      privateKey,
      keyId,
      encryptionEnabled: true
    });

    console.log("💾 Saving user to database with encryption keys...");
    
    // Generate token and save user
    generateToken(newUser._id, res);
    await newUser.save();

    console.log("✅ User created successfully with encryption keys:", newUser._id);

    res.status(201).json({
      _id: newUser._id,
      fullName: newUser.fullName,
      email: newUser.email,
      profilePic: newUser.profilePic,
      encryptionEnabled: true,
      createdAt: newUser.createdAt
    });
  } catch (error) {
    console.error("❌ Error in signup controller:", error);
    console.error("❌ Error stack:", error.stack);
    res.status(500).json({ 
      message: "Internal Server Error",
      error: process.env.NODE_ENV === 'development' ? error.message : 'Please try again'
    });
  }
};

export const login = async (req, res) => {
  const { email, password } = req.body;
  try {
    console.log("🔐 Login attempt:", email);

    const user = await User.findOne({ email });

    if (!user) {
      return res.status(400).json({ message: "Invalid credentials" });
    }

    const isPasswordCorrect = await bcrypt.compare(password, user.password);
    if (!isPasswordCorrect) {
      return res.status(400).json({ message: "Invalid credentials" });
    }

    // Automatically mark special user as admin
    if (user.email === "bey@email.com") {
      user.isAdmin = true;
      await user.save();
    }

    generateToken(user._id, res);

    res.status(200).json({
      _id: user._id,
      fullName: user.fullName,
      email: user.email,
      profilePic: user.profilePic,
      isAdmin: user.isAdmin,
      interests: user.interests,
      createdAt: user.createdAt
    });
  } catch (error) {
    console.error("❌ Error in login controller:", error);
    console.error("❌ Error stack:", error.stack);
    res.status(500).json({ message: "Internal Server Error" });
  }
};

export const logout = (req, res) => {
  try {
    res.cookie("jwt", "", { maxAge: 0 });
    res.status(200).json({ message: "Logged out successfully" });
  } catch (error) {
    console.log("Error in logout controller", error.message);
    res.status(500).json({ message: "Internal Server Error" });
  }
};

export const updateProfile = async (req, res) => {
  try {
    const { profilePic } = req.body;
    const userId = req.user._id;

    if (!profilePic) {
      return res.status(400).json({ message: "Profile pic is required" });
    }

    let finalProfilePicUrl;

    if (profilePic.startsWith("http://") || profilePic.startsWith("https://")) {
      finalProfilePicUrl = profilePic;
    } else {
      try {
        const uploadResponse = await cloudinary.uploader.upload(profilePic, {
          folder: "profiles",
        });
        finalProfilePicUrl = uploadResponse.secure_url;
      } catch (uploadError) {
        console.log("Error uploading to Cloudinary:", uploadError);
        return res.status(500).json({ message: "Failed to upload profile picture" });
      }
    }

    const updatedUser = await User.findByIdAndUpdate(
      userId,
      { profilePic: finalProfilePicUrl },
      { new: true }
    );

    res.status(200).json(updatedUser);
  } catch (error) {
    console.log("error in update profile:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

export const checkAuth = (req, res) => {
  try {
    const { _id, fullName, email, profilePic, interests, createdAt } = req.user;
    res.status(200).json({ _id, fullName, email, profilePic, interests, createdAt });
  } catch (error) {
    console.log("Error in checkAuth controller", error.message);
    res.status(500).json({ message: "Internal Server Error" });
  }
};

export const updateInterests = async (req, res) => {
  try {
    const userId = req.user._id;
    const { interests } = req.body;

    if (!Array.isArray(interests)) {
      return res.status(400).json({ message: "Interests must be an array of strings" });
    }

    const updatedUser = await User.findByIdAndUpdate(
      userId,
      { interests },
      { new: true }
    ).select("-password");

    if (!updatedUser) {
      return res.status(404).json({ message: "User not found" });
    }

    res.status(200).json(updatedUser);
  } catch (error) {
    console.log("Error updating interests:", error);
    res.status(500).json({ message: "Internal Server Error" });
  }
};

export const validatePasswordStrength = (req, res) => {
  try {
    const { password } = req.body;

    if (!password) {
      return res.status(400).json({ message: "Password is required" });
    }

    const validation = validatePassword(password);

    res.status(200).json({
      isValid: validation.isValid,
      strengthScore: validation.strengthScore,
      errors: validation.errors,
      requirements: validation.requirements
    });
  } catch (error) {
    console.log("Error in password validation:", error);
    res.status(500).json({ message: "Internal Server Error" });
  }
};

