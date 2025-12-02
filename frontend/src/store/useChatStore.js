import { create } from "zustand";
import toast from "react-hot-toast";
import { axiosInstance } from "../lib/axios";
import { useAuthStore } from "./useAuthStore";

export const useChatStore = create((set, get) => {
  let messageHandler = null; // Store the message handler reference
  let messageDeletedHandler = null; // Store the message deleted handler reference
  let messageEditedHandler = null; // Store the message edited handler reference
  let messagePinnedHandler = null; // Store the message pinned handler reference
  let currentSocket = null; // Track current socket

  return {
    messages: [],
    users: [],
    selectedUser: null,
    isUsersLoading: false,
    isMessagesLoading: false,

    getUsers: async () => {
      set({ isUsersLoading: true });
      try {
        const res = await axiosInstance.get("/messages/users");
        set({ users: res.data });
      } catch (error) {
        toast.error(error.response.data.message);
      } finally {
        set({ isUsersLoading: false });
      }
    },

    getMessages: async (userId, groupId) => {
      set({ isMessagesLoading: true });
      try {
        const url = groupId
          ? `/messages/${userId}?groupId=${groupId}`
          : `/messages/${userId}`;
        const res = await axiosInstance.get(url);
        set({ messages: res.data });
      } catch (error) {
        toast.error(error.response?.data?.message || "Failed to fetch messages");
      } finally {
        set({ isMessagesLoading: false });
      }
    },

    sendMessage: async (messageData) => {
      const { selectedUser, messages } = get();
      try {
        let res;
        if (selectedUser.isGroup) {
          // Group chat - no receiverId in URL
          res = await axiosInstance.post("/messages/send", messageData);
        } else {
          // Direct chat - receiverId in URL
          res = await axiosInstance.post(`/messages/send/${selectedUser._id}`, messageData);
        }
        set({ messages: [...messages, res.data] });
        
        // 🔄 Emit messageUpdated event to trigger sidebar re-sort via broadcast
        const socket = useAuthStore.getState().socket;
        if (socket) {
          console.log("📤 Broadcasting sidebarUpdate event");
          socket.emit("sidebarUpdate", {
            userId: useAuthStore.getState().authUser?._id,
            message: res.data,
            timestamp: new Date(res.data.createdAt).getTime()
          });
        }
        
        return res.data; // Return the saved message
      } catch (error) {
        toast.error(error.response?.data?.message || "Failed to send message");
        throw error; // Re-throw to handle in component
      }
    },

    subscribeToMessages: () => {
      const socket = useAuthStore.getState().socket;
      const { selectedUser } = get();
      const authUser = useAuthStore.getState().authUser;

      console.log("📋 [subscribeToMessages] Called with:", { 
        hasSocket: !!socket, 
        socketConnected: socket?.connected,
        selectedUserId: selectedUser?._id, 
        authUserId: authUser?._id 
      });

      if (!socket) {
        console.log("❌ [subscribeToMessages] Socket not available for subscription");
        return;
      }

      if (!selectedUser) {
        console.log("❌ [subscribeToMessages] No selected user for subscription");
        return;
      }

      console.log("✅ [subscribeToMessages] Subscribing to messages for:", selectedUser._id);

      // ✅ Unsubscribe from previous socket if different
      if (currentSocket && currentSocket !== socket) {
        console.log("🔄 [subscribeToMessages] Socket changed, unsubscribing from old socket");
        if (messageHandler) {
          currentSocket.off("newMessage", messageHandler);
        }
        if (messageDeletedHandler) {
          currentSocket.off("messageDeleted", messageDeletedHandler);
        }
        if (messageEditedHandler) {
          currentSocket.off("messageEdited", messageEditedHandler);
        }
        if (messagePinnedHandler) {
          currentSocket.off("messagePinned", messagePinnedHandler);
        }
        messageHandler = null;
        messageDeletedHandler = null;
        messageEditedHandler = null;
        messagePinnedHandler = null;
      }

      // ✅ If already subscribed to same socket, skip
      if (currentSocket === socket && messageHandler) {
        console.log("✅ [subscribeToMessages] Already subscribed to this socket, skipping");
        return;
      }

      // ✅ Remove old handler if it exists
      if (messageHandler && socket) {
        console.log("🧹 [subscribeToMessages] Removing old message handler");
        socket.off("newMessage", messageHandler);
        socket.off("messageDeleted", messageDeletedHandler);
        socket.off("messageEdited", messageEditedHandler);
        socket.off("messagePinned", messagePinnedHandler);
      }

      // ✅ Create new message handler with current context
      messageHandler = (newMessage) => {
        console.log("📨 [ChatStore] New message received via socket:", {
          messageId: newMessage._id,
          text: newMessage.text?.substring(0, 30),
          senderId: newMessage.senderId?._id || newMessage.senderId,
          receiverId: newMessage.receiverId?._id || newMessage.receiverId,
        });
        
        const { selectedUser: currentSelectedUser } = get();
        const currentAuthUser = useAuthStore.getState().authUser;
        
        if (!newMessage || !currentSelectedUser || !currentAuthUser) {
          console.log("❌ [ChatStore] Missing required data:", { 
            hasMessage: !!newMessage, 
            hasSelectedUser: !!currentSelectedUser, 
            hasAuthUser: !!currentAuthUser 
          });
          return;
        }

        // ✅ Check if message belongs to current conversation
        const isGroupMessage = !!newMessage.groupId;
        const isRelevantGroup = currentSelectedUser?.groupId && newMessage.groupId === currentSelectedUser.groupId;
        const isRelevantDM = !currentSelectedUser?.groupId && 
          ((newMessage.senderId._id === currentSelectedUser?._id && newMessage.receiverId._id === currentAuthUser._id) ||
           (newMessage.senderId._id === currentAuthUser._id && newMessage.receiverId._id === currentSelectedUser?._id));
        
        const isRelevant = isRelevantGroup || isRelevantDM;

        console.log("📊 [ChatStore] Message relevance check:", {
          isGroupMessage,
          isRelevantGroup,
          isRelevantDM,
          isRelevant,
          currentSelectedUserId: currentSelectedUser?._id,
          currentAuthUserId: currentAuthUser._id,
        });

        if (isRelevant) {
          console.log("✅ [ChatStore] Message is relevant, adding to state");
          
          // ✅ Check for duplicates before adding
          set((state) => {
            const messageExists = state.messages.some(msg => msg._id === newMessage._id);
            if (messageExists) {
              console.log("⚠️ Duplicate message detected, skipping");
              return state;
            }
            
            console.log("📌 Adding message to chat:", newMessage._id);
            return {
              messages: [...state.messages, newMessage]
            };
          });
        } else {
          console.log("❌ [ChatStore] Message not relevant to current conversation");
        }
      };

      // ✅ Create handler for messageDeleted event
      messageDeletedHandler = (deletedMessage) => {
        console.log("🗑️ [ChatStore] Message deleted via socket:", deletedMessage._id);
        
        set((state) => ({
          messages: state.messages.map(msg => 
            msg._id === deletedMessage._id ? deletedMessage : msg
          )
        }));
      };

      // ✅ Create handler for messageEdited event
      messageEditedHandler = (editedMessage) => {
        console.log("✏️ [ChatStore] Message edited via socket:", editedMessage._id);
        
        set((state) => ({
          messages: state.messages.map(msg => 
            msg._id === editedMessage._id ? editedMessage : msg
          )
        }));
      };

      // ✅ Create handler for messagePinned event
      messagePinnedHandler = (pinnedMessage) => {
        console.log("📌 [ChatStore] Message pinned status updated via socket:", pinnedMessage._id, "- Pinned:", pinnedMessage.pinned);
        
        set((state) => ({
          messages: state.messages.map(msg => 
            msg._id === pinnedMessage._id ? pinnedMessage : msg
          )
        }));
      };

      // ✅ Register all handlers
      currentSocket = socket;
      socket.on("newMessage", messageHandler);
      socket.on("messageDeleted", messageDeletedHandler);
      socket.on("messageEdited", messageEditedHandler);
      socket.on("messagePinned", messagePinnedHandler);
      console.log("✅ [subscribeToMessages] All socket message listeners registered for user:", selectedUser._id);
    },

    unsubscribeFromMessages: () => {
      console.log("🔇 [ChatStore] Attempting to unsubscribe from messages");
      if (currentSocket) {
        console.log("🔇 [ChatStore] Removing all message handlers from socket");
        if (messageHandler) {
          currentSocket.off("newMessage", messageHandler);
          messageHandler = null;
        }
        if (messageDeletedHandler) {
          currentSocket.off("messageDeleted", messageDeletedHandler);
          messageDeletedHandler = null;
        }
        if (messageEditedHandler) {
          currentSocket.off("messageEdited", messageEditedHandler);
          messageEditedHandler = null;
        }
        if (messagePinnedHandler) {
          currentSocket.off("messagePinned", messagePinnedHandler);
          messagePinnedHandler = null;
        }
        currentSocket = null;
      }
    },

    setSelectedUser: (selectedUser) => set({ selectedUser }),

    // Update group profile
    updateGroupProfile: async (groupId, data) => {
      try {
        console.log("📡 updateGroupProfile API call:", { groupId, data });
        const res = await axiosInstance.put(`/group/update-profile/${groupId}`, data);
        console.log("✅ API response:", res.data);
        
        // Update the selectedUser if it's the same group
        const { selectedUser } = get();
        console.log("🔍 Checking if we need to update selectedUser:", { 
          selectedUserGroupId: selectedUser?.groupId, 
          groupId,
          match: selectedUser && selectedUser.groupId === groupId
        });
        
        if (selectedUser && selectedUser.groupId === groupId) {
          console.log("📝 Updating selectedUser with new profilePic");
          set({ selectedUser: { ...selectedUser, profilePic: res.data.profilePic } });
        }
        toast.success("Group profile updated successfully");
        return res.data;
      } catch (error) {
        console.error("❌ Error updating group profile:", error);
        toast.error(error.response?.data?.message || "Failed to update group profile");
        throw error;
      }
    },

    // Refresh group data with latest members
    refreshGroupData: async (groupId) => {
      try {
        const res = await axiosInstance.get(`/group/${groupId}`);
        // Update the selectedUser with fresh group data
        const { selectedUser } = get();
        if (selectedUser && (selectedUser._id === groupId || selectedUser.groupId === groupId)) {
          set({ selectedUser: res.data });
        }
        return res.data;
      } catch (error) {
        console.error("Error refreshing group data:", error);
        throw error;
      }
    },

    // Update message when deleted (real-time)
    updateMessageDeleted: (deletedMessage) => {
      const { messages } = get();
      const updatedMessages = messages.map(msg =>
        msg._id === deletedMessage._id ? deletedMessage : msg
      );
      set({ messages: updatedMessages });
    },

    // Update message when edited (real-time)
    updateMessageEdited: (editedMessage) => {
      const { messages } = get();
      const updatedMessages = messages.map(msg =>
        msg._id === editedMessage._id ? editedMessage : msg
      );
      set({ messages: updatedMessages });
    },

    // Update message when pinned (real-time)
    updateMessagePinned: (pinnedMessage) => {
      const { messages } = get();
      const updatedMessages = messages.map(msg =>
        msg._id === pinnedMessage._id ? pinnedMessage : msg
      );
      set({ messages: updatedMessages });
    },
  };
});