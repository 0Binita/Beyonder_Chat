import mongoose from 'mongoose';
import User from './src/models/user.model.js';
import bcrypt from 'bcryptjs';
import dotenv from 'dotenv';

dotenv.config();

async function testSignup() {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI);
    console.log("✅ Connected to MongoDB");

    // Create test user
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash("testpassword", salt);

    const testUser = new User({
      fullName: "Test User",
      email: "test@example.com",
      password: hashedPassword,
    });

    await testUser.save();
    console.log("✅ Test user created successfully!");
    console.log("User ID:", testUser._id);

    // Clean up
    await User.deleteOne({ _id: testUser._id });
    console.log("✅ Test user deleted");

    process.exit(0);
  } catch (error) {
    console.error("❌ Test failed:", error);
    console.error("Stack:", error.stack);
    process.exit(1);
  }
}

testSignup();
