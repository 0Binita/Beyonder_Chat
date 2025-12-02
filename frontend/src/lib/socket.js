import { io } from "socket.io-client";

export const socket = io("http://localhost:5001", {
  autoConnect: false,
  auth: {
    userId: null, // This will be set dynamically before connect
  },
});

// Function to initialize and connect the socket with the userId
export const connectSocket = (userId) => {
  if (!userId) {
    console.warn("User ID not provided. Socket will not connect.");
    return;
  }
  socket.auth.userId = userId;
  if (!socket.connected) {
    socket.connect();
  }
};