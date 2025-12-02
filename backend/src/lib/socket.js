import { Server } from "socket.io";
import http from "http";
import express from "express";

const app = express();
const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: ["http://localhost:5173"],
  },
});

export function getReceiverSocketId(userId) {
  const socketId = userSocketMap[userId];
  console.log("🔍 getReceiverSocketId:", { userId, socketId, allMappings: userSocketMap });
  return socketId;
}

// used to store online users
const userSocketMap = {}; // {userId: socketId}

io.on("connection", (socket) => {
  console.log("A user connected", socket.id);

  const userId = socket.handshake.auth?.userId;

  console.log("New socket connection:", socket.id);
  console.log("Auth payload:", socket.handshake.auth);

  if (userId) {
    userSocketMap[userId] = socket.id;
    console.log(`Mapped userId ${userId} to socket ${socket.id}`);
  } else {
    console.warn("No userId found in socket handshake auth. Mapping skipped.");
  }

  // io.emit() is used to send events to all the connected clients
  io.emit("getOnlineUsers", Object.keys(userSocketMap));

  // Add typing indicator events here
  socket.on("typing", ({ senderId, receiverId, groupId }) => {
    try {
      console.log("Received typing event from", senderId, "to", receiverId, "groupId:", groupId);
      
      if (groupId) {
        // For group typing, emit to all group members except sender
        socket.to(groupId).emit("typing", { senderId, groupId });
      } else if (receiverId) {
        // For direct message typing
        const receiverSocketId = getReceiverSocketId(receiverId);
        if (receiverSocketId) {
          console.log("Forwarding typing to receiver socket:", receiverSocketId);
          io.to(receiverSocketId).emit("typing", { senderId });
        } else {
          console.log("No receiver socket found for userId:", receiverId);
        }
      }
    } catch (err) {
      console.error("Error in typing handler:", err);
    }
  });

  socket.on("stopTyping", ({ senderId, receiverId, groupId }) => {
    try {
      console.log("Received stopTyping event from", senderId, "to", receiverId, "groupId:", groupId);
      
      if (groupId) {
        // For group typing, emit to all group members except sender
        socket.to(groupId).emit("stopTyping", { senderId, groupId });
      } else if (receiverId) {
        // For direct message typing
        const receiverSocketId = getReceiverSocketId(receiverId);
        if (receiverSocketId) {
          console.log("Forwarding stopTyping to receiver socket:", receiverSocketId);
          io.to(receiverSocketId).emit("stopTyping", { senderId });
        } else {
          console.log("No receiver socket found for userId:", receiverId);
        }
      }
    } catch (err) {
      console.error("Error in stopTyping handler:", err);
    }
  });

  socket.on("newMessage", ({ newMessage, receiverId }) => {
    try {
      console.log("Received newMessage event for receiver:", receiverId);
      const receiverSocketId = getReceiverSocketId(receiverId);
      if (receiverSocketId) {
        console.log("Forwarding new message to receiver socket:", receiverSocketId);
        io.to(receiverSocketId).emit("newMessage", newMessage);
      } else {
        console.log("No receiver socket found for userId:", receiverId);
      }
    } catch (err) {
      console.error("Error in newMessage handler:", err);
    }
  });

// Join group room event
socket.on("join-group", (groupId) => {
  console.log(`Socket ${socket.id} joining group room: ${groupId}`);
  socket.join(groupId);
});

// Join DM room event - for real-time message updates between two users
socket.on("join-dm", (dmRoomId) => {
  console.log(`Socket ${socket.id} joining DM room: ${dmRoomId}`);
  socket.join(dmRoomId);
});

// Group message event - Removed to prevent duplicates since API endpoints handle emissions

// Reaction events
socket.on("reactionAdded", ({ messageId, reaction, groupId, receiverId }) => {
  try {
    console.log("Received reactionAdded event for message:", messageId);
    if (groupId) {
      // For group messages, emit to the group room
      io.to(groupId).emit("reactionAdded", { messageId, reaction });
    } else if (receiverId) {
      // For direct messages, emit to the receiver
      const receiverSocketId = getReceiverSocketId(receiverId);
      if (receiverSocketId) {
        io.to(receiverSocketId).emit("reactionAdded", { messageId, reaction });
      }
      // Also emit to the sender (current user) in case they have multiple tabs
      socket.emit("reactionAdded", { messageId, reaction });
    }
  } catch (err) {
    console.error("Error in reactionAdded handler:", err);
  }
});

socket.on("reactionRemoved", ({ messageId, userId, groupId, receiverId }) => {
  try {
    console.log("Received reactionRemoved event for message:", messageId);
    if (groupId) {
      // For group messages, emit to the group room
      io.to(groupId).emit("reactionRemoved", { messageId, userId });
    } else if (receiverId) {
      // For direct messages, emit to the receiver
      const receiverSocketId = getReceiverSocketId(receiverId);
      if (receiverSocketId) {
        io.to(receiverSocketId).emit("reactionRemoved", { messageId, userId });
      }
      // Also emit to the sender (current user) in case they have multiple tabs
      socket.emit("reactionRemoved", { messageId, userId });
    }
  } catch (err) {
    console.error("Error in reactionRemoved handler:", err);
  }
});

  socket.on("disconnect", () => {
    console.log("A user disconnected", socket.id, "with userId:", userId);
    delete userSocketMap[userId];
    io.emit("getOnlineUsers", Object.keys(userSocketMap));
  });
});

export { io, app, server };
