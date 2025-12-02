import User from "../models/user.model.js";
import Report from "../models/report.model.js";

export const getAllUsers = async (req, res) => {
  try {
    const users = await User.find().select("-password");
    res.status(200).json(users);
  } catch (err) {
    console.error("Error fetching users:", err);
    res.status(500).json({ message: "Failed to fetch users" });
  }
};

export const deleteUser = async (req, res) => {
  try {
    const userId = req.params.id;
    await User.findByIdAndDelete(userId);
    res.status(200).json({ message: "User deleted successfully" });
  } catch (err) {
    console.error("Error deleting user:", err);
    res.status(500).json({ message: "Failed to delete user" });
  }
};

export const getReportedUsers = async (req, res) => {
  try {
    const reports = await Report.find()
      .populate("reportedUser", "fullName email profilePic")
      .populate("reportedBy", "fullName email")
      .sort({ createdAt: -1 });

    res.status(200).json(reports);
  } catch (err) {
    console.error("Error fetching reported users:", err);
    res.status(500).json({ message: "Failed to fetch reported users" });
  }
};
