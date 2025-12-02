import mongoose from "mongoose";

import Report from "../models/report.model.js";

export const reportUser = async (req, res) => {
  try {
    const reporterId = req.user._id; // from auth middleware
    const { id: reportedUserId } = req.params;

    if (reporterId.toString() === reportedUserId) {
      return res.status(400).json({ message: "You cannot report yourself." });
    }

    // Check if already reported
    const existingReport = await Report.findOne({ reportedUser: reportedUserId, reportedBy: reporterId });
    if (existingReport) {
      return res.status(400).json({ message: "You have already reported this user." });
    }

    const report = new Report({
      reportedUser: reportedUserId,
      reportedBy: reporterId,
    });

    await report.save();

    res.status(201).json({ message: "User reported successfully." });
  } catch (error) {
    console.error("Report user error:", error);
    res.status(500).json({ message: "Failed to report user." });
  }
};

export const getReportedUsersCount = async (req, res) => {
  try {
    const reportCounts = await Report.aggregate([
      {
        $group: {
          _id: "$reportedUser",
          uniqueReportersCount: { $addToSet: "$reportedBy" }
        }
      },
      {
        $project: {
          reportedUser: "$_id",
          _id: 0,
          count: { $size: "$uniqueReportersCount" }
        }
      },
      {
        $lookup: {
          from: "users",
          localField: "reportedUser",
          foreignField: "_id",
          as: "userInfo"
        }
      },
      {
        $unwind: "$userInfo"
      },
      {
        $project: {
          reportedUser: 1,
          count: 1,
          fullName: "$userInfo.fullName",
          email: "$userInfo.email"
        }
      }
    ]);
    res.status(200).json(reportCounts);
  } catch (error) {
    console.error("Error fetching reported users count:", error);
    res.status(500).json({ message: "Failed to fetch reported users count" });
  }
};

export const reportGroup = async (req, res) => {
  try {
    const reporterId = req.user._id;
    const { groupId } = req.params;

    // Check if already reported
    const existingReport = await Report.findOne({ reportedGroup: groupId, reportedBy: reporterId });
    if (existingReport) {
      return res.status(400).json({ message: "You have already reported this group." });
    }

    const report = new Report({
      reportedGroup: groupId,
      reportedBy: reporterId,
    });

    await report.save();

    res.status(201).json({ message: "Group reported successfully." });
  } catch (error) {
    console.error("Report group error:", error);
    res.status(500).json({ message: "Failed to report group." });
  }
};

export const getReportedGroupsCount = async (req, res) => {
  try {
    const reportCounts = await Report.aggregate([
      {
        $match: { reportedGroup: { $exists: true } }
      },
      {
        $group: {
          _id: "$reportedGroup",
          uniqueReportersCount: { $addToSet: "$reportedBy" }
        }
      },
      {
        $project: {
          reportedGroup: "$_id",
          _id: 0,
          count: { $size: "$uniqueReportersCount" }
        }
      },
      {
        $lookup: {
          from: "groups",
          localField: "reportedGroup",
          foreignField: "_id",
          as: "groupInfo"
        }
      },
      {
        $unwind: "$groupInfo"
      },
      {
        $project: {
          reportedGroup: 1,
          count: 1,
          name: "$groupInfo.name"
        }
      }
    ]);
    res.status(200).json(reportCounts);
  } catch (error) {
    console.error("Error fetching reported groups count:", error);
    res.status(500).json({ message: "Failed to fetch reported groups count" });
  }
};