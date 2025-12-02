import { create } from "zustand";
import { axiosInstance } from "../lib/axios.js";
import toast from "react-hot-toast";
import { io } from "socket.io-client";


// Dynamically set socket URL based on environment
const BASE_URL =
  import.meta.env.MODE === "development"
    ? "http://localhost:5001"
    : "/";

// Zustand store for Auth and Socket state
export const useAuthStore = create((set, get) => ({
  // --- STATE VARIABLES ---
  authUser: null,
  isSigningUp: false,
  isLoggingIn: false,
  isUpdatingProfile: false,
  isCheckingAuth: true,
  onlineUsers: [],
  friends: [],
  friendRequests: [],
  socket: null,

  // --- Helper to check if user has required interests ---
  hasRequiredInterests: () => {
    const { authUser } = get();
    console.log('Checking interests:', authUser?.interests, 'Length:', authUser?.interests?.length);
    return authUser?.interests && authUser.interests.length >= 3;
  },

  // --- SETTER METHODS ---
  setFriends: async (friends) => {
    try {
      // Fetch the admin user by email from backend
      const adminRes = await axiosInstance.get("/user/admin-user");
      const adminUser = adminRes.data;

      // Check if admin user is already in friends list
      const hasAdmin = friends.some(friend => friend.email === adminUser.email);
      let updatedFriends = friends;
      if (!hasAdmin) {
        updatedFriends = [adminUser, ...friends];
      }
      set({ friends: updatedFriends });
    } catch (error) {
      console.error("Failed to fetch admin user:", error);
      set({ friends }); // fallback to original list if admin fetch fails
    }
  },

  setFriendRequests: (friendRequests) => {
    set({ friendRequests });
  },

  // Add a new friend request to the list
  addFriendRequest: (friendRequest) => {
    set((state) => ({
      friendRequests: [...state.friendRequests, friendRequest]
    }));
  },

  // Remove a friend request from the list
  removeFriendRequest: (requestId) => {
    set((state) => ({
      friendRequests: state.friendRequests.filter(req => req._id !== requestId)
    }));
  },

  // Update a friend request status
  updateFriendRequest: (requestId, updates) => {
    set((state) => ({
      friendRequests: state.friendRequests.map(req => 
        req._id === requestId ? { ...req, ...updates } : req
      )
    }));
  },

  // --- AUTH METHODS ---

  // Check user authentication status
  checkAuth: async () => {
    try {
      const res = await axiosInstance.get("/auth/check");
      set({ authUser: res.data });
      
      // ✅ AUTOMATIC: Ensure user has encryption keys
      try {
        await axiosInstance.post("/user/ensure-keys");
        console.log("✅ Encryption keys verified/generated");
      } catch (keyError) {
        console.error("Failed to ensure encryption keys:", keyError);
      }
      
      get().connectSocket();
    } catch (error) {
      console.log("Error in checkAuth:", error);
      set({ authUser: null });
    } finally {
      set({ isCheckingAuth: false });
    }
  },

  // User signup
  signup: async (data) => {
    set({ isSigningUp: true });
    try {
      const res = await axiosInstance.post("/auth/signup", data);
      set({ authUser: res.data });
      toast.success("Account created successfully");
      get().connectSocket();
    } catch (error) {
      toast.error(error.response?.data?.message || "Signup failed");
    } finally {
      set({ isSigningUp: false });
    }
  },

  // User login
  login: async (data) => {
    set({ isLoggingIn: true });
    try {
      const res = await axiosInstance.post("/auth/login", data);
      set({ authUser: res.data });
      
      // ✅ AUTOMATIC: Ensure user has encryption keys
      try {
        await axiosInstance.post("/user/ensure-keys");
        console.log("✅ Encryption keys verified/generated");
      } catch (keyError) {
        console.error("Failed to ensure encryption keys:", keyError);
      }
      
      toast.success("Logged in successfully");
      get().connectSocket();
    } catch (error) {
      toast.error(error.response?.data?.message || "Login failed");
    } finally {
      set({ isLoggingIn: false });
    }
  },

  // Logout user
  logout: async () => {
    try {
      await axiosInstance.post("/auth/logout");
      set({ authUser: null });
      toast.success("Logged out successfully");
      get().disconnectSocket();
    } catch (error) {
      toast.error(error.response?.data?.message || "Logout failed");
    }
  },

  // Update user profile info
  updateProfile: async (data) => {
    set({ isUpdatingProfile: true });
    try {
      const res = await axiosInstance.put("/auth/update-profile", data);
      set({ authUser: res.data.user || res.data }); // adjust if your backend response differs
      toast.success("Profile updated successfully");
    } catch (error) {
      console.error("Error in update profile:", error);
      toast.error(error.response?.data?.message || "Update failed");
    } finally {
      set({ isUpdatingProfile: false });
    }
  },

  // Update interests controller
  updateInterests: async (interests) => {
    try {
      const res = await axiosInstance.put("/auth/update-interests", { interests });
      set({ authUser: res.data });
      toast.success("Interests updated successfully"); // ✅ Only one toast shown here
      return res.data;
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to update interests");
      throw error;
    }
  },

  // --- SOCKET.IO CONNECTION METHODS ---

  connectSocket: () => {
    const { authUser, socket } = get();
    if (!authUser || socket?.connected) return;

    const newSocket = io(BASE_URL, {
      auth: { userId: authUser._id },
    });

    console.log("Connecting socket for userId:", authUser?._id);
    newSocket.connect();

    // Make socket available globally for debugging
    window.socket = newSocket;

    set({ socket: newSocket });

    // Handle online users list
    newSocket.on("getOnlineUsers", (userIds) => {
      set({ onlineUsers: userIds });
    });

    // --- FRIEND REQUEST SOCKET LISTENERS ---
    
    // When someone sends you a friend request
    newSocket.on("friendRequestReceived", (friendRequest) => {
      console.log("Received friend request:", friendRequest);
      get().addFriendRequest(friendRequest);
      toast.success(`${friendRequest.sender.fullName} sent you a friend request!`);
    });

    // When your friend request gets accepted
    newSocket.on("friendRequestAccepted", (data) => {
      console.log("Friend request accepted:", data);
      get().removeFriendRequest(data._id);
      toast.success(`${data.acceptedBy.fullName} accepted your friend request!`);
      // Optionally refresh friends list
      get().fetchFriends();
    });

    // When your friend request gets rejected
    newSocket.on("friendRequestRejected", (data) => {
      console.log("Friend request rejected:", data);
      get().removeFriendRequest(data._id);
      toast.info(`${data.rejectedBy.fullName} declined your friend request.`);
    });

    // When someone cancels their friend request to you
    newSocket.on("friendRequestCancelled", (data) => {
      console.log("Friend request cancelled:", data);
      get().removeFriendRequest(data._id);
      // ❌ REMOVED: Don't show toast for cancellation (silent operation)
    });

    // General friend request updates (for confirmation)
    newSocket.on("friendRequestUpdated", (data) => {
      console.log("Friend request updated:", data);
      get().updateFriendRequest(data._id, { status: data.status });
      // ❌ REMOVED: Don't show toast here (duplicate)
    });

    // Confirmation when you send a friend request
    newSocket.on("friendRequestSent", (data) => {
      console.log("Friend request sent confirmation:", data);
      // ❌ REMOVED: Don't show toast here (already shown by API response)
    });

    // When someone unfriends you
    newSocket.on("friendRemoved", (data) => {
      console.log("Friend removed:", data);
      get().removeFriend(data.userId);
      toast.error(`A friend has removed you from their friend list.`);
    });
  },

  // Remove a friend from the list
  removeFriend: (friendId) => {
    set((state) => ({
      friends: state.friends.filter(friend => friend._id !== friendId)
    }));
  },

  // Helper method to fetch friends (for refreshing after acceptance)
  fetchFriends: async () => {
    try {
      const res = await axiosInstance.get("/user/friends");
      get().setFriends(res.data);
    } catch (error) {
      console.error("Error fetching friends:", error);
    }
  },

  disconnectSocket: () => {
    const { socket } = get();
    if (socket?.connected) {
      // Remove all event listeners before disconnecting
      socket.off("getOnlineUsers");
      socket.off("friendRequestReceived");
      socket.off("friendRequestAccepted");
      socket.off("friendRequestRejected");
      socket.off("friendRequestCancelled");
      socket.off("friendRequestUpdated");
      socket.off("friendRequestSent");
      socket.off("friendRemoved");
      
      socket.disconnect();
    }
    set({ socket: null });
  },
}));