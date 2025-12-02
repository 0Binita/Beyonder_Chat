import axios from "axios";
import { useSentimentModel } from "../../context/SentimentModelContext";
import { useChatStore } from "../store/useChatStore";
import { useEffect, useRef, useState } from "react";
import { analyzeConversationSentiment } from "../lib/sentimentAnalysis";
import { axiosInstance } from "../lib/axios";
import toast from "react-hot-toast";

import ChatHeader from "./ChatHeader";
import MessageInput from "./MessageInput";
import MessageSkeleton from "./skeletons/MessageSkeleton";
import TypingIndicator from "./TypingIndicator";
import ToxicityWarning from "./ToxicityWarning";
import { useAuthStore } from "../store/useAuthStore";
import { formatMessageTime } from "../lib/utils";
import { Info, X, Lock, Eye } from "lucide-react";
import UserDetailsPage from "./UserDetailsPage";

const ChatContainer = () => {
  const {
    messages,
    getMessages,
    isMessagesLoading,
    selectedUser,
    subscribeToMessages,
    unsubscribeFromMessages,
  } = useChatStore();
  const [frequentWords, setFrequentWords] = useState([]);
  const { authUser, socket } = useAuthStore();
  const { selectedModel } = useSentimentModel();
  const messageEndRef = useRef(null);
  // Store pinned message id and associated user id
  const [pinnedMessageData, setPinnedMessageData] = useState(null);
  const [highlightedMessageId, setHighlightedMessageId] = useState(null);
  const messageRefs = useRef({});
  const [editMessageData, setEditMessageData] = useState(null);
  const [typingUsers, setTypingUsers] = useState([]); // Array to track multiple typing users
  const [sentimentStats, setSentimentStats] = useState({ positive: 0, negative: 0, neutral: 0 });
  const [showUserDetails, setShowUserDetails] = useState(false);
  const [showMoreOptionsDropdown, setShowMoreOptionsDropdown] = useState(null); // Track which message more options dropdown is open
  const [replyingTo, setReplyingTo] = useState(null); // Track which message we're replying to
  const [showReactionPicker, setShowReactionPicker] = useState(null); // Track which message reaction picker is open
  const [messageReactions, setMessageReactions] = useState({}); // Store reactions for each message

  // Handler functions for message actions
  const handleReplyMessage = (message) => {
    setReplyingTo(message);
    setShowMoreOptionsDropdown(null);
  };

  const handleReactMessage = (message) => {
    setShowReactionPicker(showReactionPicker === message._id ? null : message._id);
    setShowMoreOptionsDropdown(null);
  };

  const handleAddReaction = async (messageId, reactionType) => {
    try {
      await axiosInstance.post(`/reactions/${messageId}`, { type: reactionType });
      await fetchMessageReactions(messageId);
      setShowReactionPicker(null);
    } catch (error) {
      console.error("Failed to add reaction:", error);
    }
  };

  const handleRemoveReaction = async (messageId) => {
    try {
      await axiosInstance.delete(`/reactions/${messageId}`);
      await fetchMessageReactions(messageId);
    } catch (error) {
      console.error("Failed to remove reaction:", error);
    }
  };

  const fetchMessageReactions = async (messageId) => {
    try {
      const response = await axiosInstance.get(`/reactions/${messageId}`);
      setMessageReactions(prev => ({
        ...prev,
        [messageId]: response.data
      }));
    } catch (error) {
      console.error("Failed to fetch reactions:", error);
    }
  };

  const reactionEmojis = ["👍", "❤️", "😂", "😮", "😢", "😡"];

  const handleEditMessage = (message) => {
    setEditMessageData({
      id: message._id,
      oldText: message.text,
      newText: message.text
    });
    setShowMoreOptionsDropdown(null);
  };

  const handleDeleteMessage = async (messageId) => {
    try {
      // Send delete request to backend
      // The backend will emit socket event 'messageDeleted' to all users
      // Don't update local state here - let the socket event handle it
      await axiosInstance.delete(`/messages/delete/${messageId}`);
      setShowMoreOptionsDropdown(null);
    } catch (error) {
      console.error("Failed to delete message:", error);
      toast.error("Failed to delete message");
    }
  };

  const handlePinMessage = async (messageId) => {
    try {
      // Send pin request to backend
      // The backend will emit socket event 'messagePinned' to all users
      // Don't refetch messages here - let the socket event handle it
      await axiosInstance.put(`/messages/pin/${messageId}`);
      setShowMoreOptionsDropdown(null);
    } catch (error) {
      console.error("Failed to pin/unpin message:", error);
      toast.error("Failed to pin/unpin message");
    }
  };
  // Effect to close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (showMoreOptionsDropdown && !event.target.closest('.dropdown-container')) {
        setShowMoreOptionsDropdown(null);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showMoreOptionsDropdown]);

  // Effect to fetch frequent words between authUser and selectedUser
  useEffect(() => {
    if (!selectedUser?._id || !authUser?._id) {
      setFrequentWords([]);
      return;
    }

    const fetchFrequentWords = async () => {
      try {
        const response = await axiosInstance.get(`/messages/frequent-words/${selectedUser._id}`);
        setFrequentWords(response.data);
      } catch (error) {
        console.error("Failed to fetch frequent words:", error);
        setFrequentWords([]);
      }
    };

    fetchFrequentWords();
  }, [selectedUser, authUser]);

  const selectedUserRef = useRef(selectedUser);
  useEffect(() => {
    selectedUserRef.current = selectedUser;
  }, [selectedUser]);

  // Add a messagesRef to keep the latest messages state
  const messagesRef = useRef(messages);
  useEffect(() => {
    messagesRef.current = messages;
  }, [messages]);

  // Compute sentiment stats dynamically from messages using context-aware analysis
  useEffect(() => {
    if (!messages || messages.length === 0) {
      setSentimentStats({ positive: 0, neutral: 0, negative: 0 });
      return;
    }

    // Use the new context-aware sentiment analysis
    const analysisResult = analyzeConversationSentiment(messages, authUser?._id);
    
    setSentimentStats({
      positive: analysisResult.positive,
      neutral: analysisResult.neutral,
      negative: analysisResult.negative,
      conversationTone: analysisResult.conversationTone,
      insights: analysisResult.insights
    });
  }, [messages, authUser?._id]);

// Dedicated effect for group joining and fetching messages
useEffect(() => {
  console.log(">>> GROUP JOIN CHECK", {
    selectedUser,
    groupId: selectedUser?.groupId,
    isGroup: selectedUser?.isGroup,
    socketConnected: socket?.connected,
  });

  if (!socket || !selectedUser) return;

  // Clear typing users when switching chats
  setTypingUsers([]);

  if (selectedUser?.groupId) {
    console.log("Emitting join-group with groupId:", selectedUser.groupId);
    socket.emit("join-group", selectedUser.groupId.toString());
    getMessages(undefined, selectedUser.groupId);
  } else {
    getMessages(selectedUser._id);
  }
}, [selectedUser, getMessages, socket]);

useEffect(() => {
  if (!socket || !selectedUser) {
    console.log("⚠️ Cannot subscribe - missing socket or selectedUser");
    return;
  }
  
  console.log("🔗 Setting up message subscription for:", selectedUser._id);
  subscribeToMessages();
  
  return () => {
    console.log("🔗 Cleaning up message subscription");
    unsubscribeFromMessages();
  };
}, [socket, selectedUser]);

  // ✅ Make sure socket is properly connected
  useEffect(() => {
    if (!socket) {
      console.log("⚠️ Socket not available yet");
      return;
    }

    console.log("✅ Socket connected:", socket.id);

    socket.on("connect", () => {
      console.log("🔌 Socket connected:", socket.id);
    });
    
    socket.on("disconnect", () => {
      console.log("🔌 Socket disconnected");
    });

    return () => {
      socket.off("connect");
      socket.off("disconnect");
    };
  }, [socket]);

  useEffect(() => {
    if (messageEndRef.current && messages) {
      messageEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages]);

  useEffect(() => {
    if (messages && messages.length > 0) {
      // Fetch reactions for all messages
      messages.forEach(message => {
        fetchMessageReactions(message._id);
      });
      
      const pinned = messages.find((msg) => msg.pinned === true);
      if (pinned) {
        setPinnedMessageData({ id: pinned._id, userId: selectedUser._id });
      } else {
        setPinnedMessageData(null);
      }
    }
  }, [messages, selectedUser._id]);

  useEffect(() => {
    if (!socket || !selectedUser) return;

    const handleTyping = ({ senderId, groupId }) => {
      console.log("Received typing from", senderId, "in group:", groupId);
      console.log("Current selectedUser:", selectedUser._id, "groupId:", selectedUser?.groupId);
      
      // For direct messages, check if sender is the selected user
      if (!groupId && senderId?.toString() === selectedUser._id?.toString()) {
        console.log("Adding user to typing list for direct message");
        setTypingUsers(prev => {
          if (!prev.find(user => user._id === senderId)) {
            return [...prev, selectedUser];
          }
          return prev;
        });
      }
      
      // For group messages, check if we're in the same group
      if (groupId && selectedUser?.groupId === groupId) {
        console.log("Adding user to typing list for group message");
        // Get the actual user info from group members
        const typingUser = selectedUser.members?.find(member => member._id === senderId);
        
        setTypingUsers(prev => {
          if (!prev.find(user => user._id === senderId)) {
            return [...prev, typingUser || { _id: senderId, fullName: `User ${senderId.slice(-4)}` }];
          }
          return prev;
        });
      }
    };

    const handleStopTyping = ({ senderId, groupId }) => {
      console.log("Received stopTyping from", senderId, "in group:", groupId);
      console.log("Removing user from typing list");
      
      setTypingUsers(prev => prev.filter(user => user._id !== senderId));
    };

    socket.on("typing", handleTyping);
    socket.on("stopTyping", handleStopTyping);

    return () => {
      socket.off("typing", handleTyping);
      socket.off("stopTyping", handleStopTyping);
    };
  }, [selectedUser?._id, selectedUser?.groupId, socket, selectedUser]);

  useEffect(() => {
    if (!socket) {
      console.log("Socket not available for reaction handlers");
      return;
    }

    const handleReactionAdded = ({ messageId, reaction }) => {
      console.log("Received reactionAdded event:", { messageId, reaction });
      fetchMessageReactions(messageId);
    };

    const handleReactionRemoved = ({ messageId, userId }) => {
      console.log("Received reactionRemoved event:", { messageId, userId });
      fetchMessageReactions(messageId);
    };

    socket.on("reactionAdded", handleReactionAdded);
    socket.on("reactionRemoved", handleReactionRemoved);

    return () => {
      socket.off("reactionAdded", handleReactionAdded);
      socket.off("reactionRemoved", handleReactionRemoved);
    };
  }, [socket]);

  // Handle message delete, edit, and pin in real-time
  useEffect(() => {
    if (!socket) {
      console.log("Socket not available for message update handlers");
      return;
    }

    const handleMessageDeleted = (deletedMessage) => {
      console.log("🗑️ [ChatContainer] Message deleted via socket:", deletedMessage._id);
      useChatStore.getState().updateMessageDeleted(deletedMessage);
    };

    const handleMessageEdited = (editedMessage) => {
      console.log("✏️ [ChatContainer] Message edited via socket:", editedMessage._id);
      useChatStore.getState().updateMessageEdited(editedMessage);
    };

    const handleMessagePinned = (pinnedMessage) => {
      console.log("📌 [ChatContainer] Message pinned status updated via socket:", pinnedMessage._id, "- Pinned:", pinnedMessage.pinned);
      useChatStore.getState().updateMessagePinned(pinnedMessage);
    };

    socket.on("messageDeleted", handleMessageDeleted);
    socket.on("messageEdited", handleMessageEdited);
    socket.on("messagePinned", handleMessagePinned);

    return () => {
      socket.off("messageDeleted", handleMessageDeleted);
      socket.off("messageEdited", handleMessageEdited);
      socket.off("messagePinned", handleMessagePinned);
    };
  }, [socket]);

  if (isMessagesLoading) {
    return (
      <div className="flex flex-1 overflow-hidden">
        <div className="flex flex-col flex-1 overflow-auto">
          <div className="flex items-center justify-between border-b p-2 bg-base-100">
            <div className="flex-grow">
              <ChatHeader />
            </div>
            <div className="flex gap-2">
              <button
                className="btn btn-sm btn-ghost"
                title="View Info"
                onClick={() => setShowUserDetails(true)}
              >
                <Info className="w-5 h-5" />
              </button>
            </div>
          </div>
          <MessageSkeleton />
          <MessageInput />
        </div>
        {showUserDetails && (
          <UserDetailsPage
            user={selectedUser}
            sentimentStats={sentimentStats}
            onClose={() => setShowUserDetails(false)}
          />
        )}
      </div>
    );
  }

  return (
    <div className="flex flex-1 overflow-hidden">
      <div className="flex flex-col flex-1 overflow-auto">
        {/* Messenger-style header */}
        <div className="flex items-center justify-between border-b px-6 py-2 bg-base-100">
          <div className="flex-grow">
            <ChatHeader />
          </div>
          <div className="flex gap-4">
            <button className="text-black-400 hover:text-blue-400 transition" title="Info" onClick={() => setShowUserDetails(true)}><Info className="w-5 h-5" /></button>
          </div>
        </div>

        {pinnedMessageData?.id && pinnedMessageData?.userId === selectedUser._id && (
          <div
            className="bg-base-200 p-3 border-b cursor-pointer text-sm flex justify-between items-center"
          >
            <div 
              className="flex-1 flex items-center gap-2"
              onClick={() => {
                const el = messageRefs.current[pinnedMessageData.id];
                if (el) {
                  el.scrollIntoView({ behavior: "smooth", block: "center" });
                  setHighlightedMessageId(pinnedMessageData.id);
                  setTimeout(() => setHighlightedMessageId(null), 1500);
                }
              }}
            >
              <span className="text-lg">📌</span>
              <div className="flex-1">
                <div className="font-medium text-xs text-gray-600 uppercase tracking-wide">Pinned Message</div>
                <div className="text-base truncate">
                  {(() => {
                    const pinnedMsg = messages.find(msg => msg._id === pinnedMessageData.id);
                    return pinnedMsg?.text || "Click to view pinned message";
                  })()}
                </div>
              </div>
            </div>
            <button
              className="ml-4 text-xs text-error hover:bg-error/10 px-2 py-1 rounded transition-colors"
              onClick={async () => {
                try {
                  await axios.put(`/api/messages/pin/${pinnedMessageData.id}`);
                  setPinnedMessageData(null);
                } catch (err) {
                  console.error("Failed to unpin message:", err);
                }
              }}
            >
              Unpin
            </button>
          </div>
        )}

        <div className="flex-1 overflow-y-auto px-8 py-6 space-y-2 messenger-scrollbar">
          {messages.map((message, index) => {
            const senderId = message.senderId._id || message.senderId;
            // For group chats, get the actual sender's name, otherwise use selectedUser for direct chats
            const senderName = senderId === authUser._id 
              ? authUser.fullName || "You" 
              : selectedUser.isGroup 
                ? message.senderId?.fullName || "Unknown User"
                : selectedUser.fullName || "Unknown";
            const isOwn = senderId === authUser._id;
            
            // Message grouping logic for consecutive messages from same sender
            const prevMessage = index > 0 ? messages[index - 1] : null;
            const nextMessage = index < messages.length - 1 ? messages[index + 1] : null;
            const prevSenderId = prevMessage?.senderId?._id || prevMessage?.senderId;
            const nextSenderId = nextMessage?.senderId?._id || nextMessage?.senderId;
            
            const isFirstInGroup = !prevMessage || prevSenderId !== senderId;
            const isLastInGroup = !nextMessage || nextSenderId !== senderId;
            const isMiddleInGroup = !isFirstInGroup && !isLastInGroup;
            return (
              <div
                key={message._id}
                className={`flex items-start gap-2 group relative ${isOwn ? "justify-end" : "justify-start"} ${
                  selectedUser.isGroup && !isFirstInGroup ? "mt-1" : "mt-4"
                }`}
                ref={(el) => {
                  if (el) messageRefs.current[message._id] = el;
                  if (message._id === messages[messages.length - 1]._id) messageEndRef.current = el;
                }}
              >
                {/* Avatar only for received messages and only show for last message in group */}
                {!isOwn && (
                  <div className="w-8 h-8 flex-shrink-0">
                    {(isLastInGroup || !selectedUser.isGroup) ? (
                      <img
                        src={message.senderId?.profilePic || "/avatar.png"}
                        alt="profile pic"
                        className="w-8 h-8 rounded-full object-cover"
                      />
                    ) : (
                      <div className="w-8 h-8"></div> // Invisible spacer for grouped messages
                    )}
                  </div>
                )}
                
                {/* Hover actions for received messages (right side) */}
                {!isOwn && (
                  <div className="opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1 z-10 ml-2 order-3">
                    {message.sentiment && (
                      <span
                        className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold whitespace-nowrap ${
                          message.sentiment === "positive"
                            ? "bg-green-100 text-green-600"
                            : message.sentiment === "negative"
                            ? "bg-red-100 text-red-600"
                            : "bg-gray-100 text-gray-600"
                        }`}
                        style={{ minWidth: '80px', justifyContent: 'center', textAlign: 'center' }}
                      >
                        {message.sentiment === "positive"
                          ? "😊 Positive"
                          : message.sentiment === "negative"
                          ? "😞 Negative"
                          : "😐 Neutral"}
                      </span>
                    )}
                    <button 
                      className="p-1.5 hover:bg-base-200 rounded-full transition-colors bg-base-100 shadow-sm"
                      title="Reply"
                      onClick={() => handleReplyMessage(message)}
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" />
                      </svg>
                    </button>
                    <button 
                      className="p-1.5 hover:bg-base-200 rounded-full transition-colors bg-base-100 shadow-sm relative"
                      title="React"
                      onClick={() => handleReactMessage(message)}
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.828 14.828a4 4 0 01-5.656 0M9 10h1.01M15 10h1.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      
                      {/* Reaction picker for received messages */}
                      {showReactionPicker === message._id && (
                        <div className="absolute top-8 right-0 bg-base-100 border border-base-300 rounded-lg shadow-lg p-2 z-20 flex gap-1">
                          {reactionEmojis.map((emoji) => (
                            <button
                              key={emoji}
                              className="p-1 hover:bg-base-200 rounded text-lg transition-colors"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleAddReaction(message._id, emoji);
                              }}
                            >
                              {emoji}
                            </button>
                          ))}
                        </div>
                      )}
                    </button>
                    <button 
                      className="p-1.5 hover:bg-base-200 rounded-full transition-colors bg-base-100 shadow-sm relative dropdown-container"
                      title="More options"
                      onClick={() => setShowMoreOptionsDropdown(showMoreOptionsDropdown === message._id ? null : message._id)}
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z" />
                      </svg>
                      
                      {/* Dropdown menu for received messages */}
                      {showMoreOptionsDropdown === message._id && (
                        <div className="absolute top-8 right-0 bg-base-100 border border-base-300 rounded-lg shadow-lg py-2 z-20 min-w-[140px]">
                          <button
                            className="w-full px-4 py-2 text-left hover:bg-base-200 transition-colors text-sm"
                            onClick={() => handleEditMessage(message)}
                          >
                            Edit
                          </button>
                          <button
                            className="w-full px-4 py-2 text-left hover:bg-base-200 transition-colors text-sm"
                            onClick={() => handleDeleteMessage(message._id)}
                          >
                            Delete
                          </button>
                          <button
                            className="w-full px-4 py-2 text-left hover:bg-base-200 transition-colors text-sm"
                            onClick={() => handlePinMessage(message._id)}
                          >
                            {message.pinned ? 'Unpin' : 'Pin'}
                          </button>
                        </div>
                      )}
                    </button>
                  </div>
                )}
                
                {/* Hover actions for sent messages (left side) */}
                {isOwn && (
                  <div className="opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1 z-10 mr-2 order-1">
                    {message.sentiment && (
                      <span
                        className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold whitespace-nowrap ${
                          message.sentiment === "positive"
                            ? "bg-green-100 text-green-600"
                            : message.sentiment === "negative"
                            ? "bg-red-100 text-red-600"
                            : "bg-gray-100 text-gray-600"
                        }`}
                        style={{ minWidth: '80px', justifyContent: 'center', textAlign: 'center' }}
                      >
                        {message.sentiment === "positive"
                          ? "😊 Positive"
                          : message.sentiment === "negative"
                          ? "😞 Negative"
                          : "😐 Neutral"}
                      </span>
                    )}
                    <button 
                      className="p-1.5 hover:bg-base-200 rounded-full transition-colors bg-base-100 shadow-sm"
                      title="Reply"
                      onClick={() => handleReplyMessage(message)}
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" />
                      </svg>
                    </button>
                    <button 
                      className="p-1.5 hover:bg-base-200 rounded-full transition-colors bg-base-100 shadow-sm relative"
                      title="React"
                      onClick={() => handleReactMessage(message)}
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.828 14.828a4 4 0 01-5.656 0M9 10h1.01M15 10h1.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      
                      {/* Reaction picker for sent messages */}
                      {showReactionPicker === message._id && (
                        <div className="absolute top-8 right-0 bg-base-100 border border-base-300 rounded-lg shadow-lg p-2 z-20 flex gap-1">
                          {reactionEmojis.map((emoji) => (
                            <button
                              key={emoji}
                              className="p-1 hover:bg-base-200 rounded text-lg transition-colors"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleAddReaction(message._id, emoji);
                              }}
                            >
                              {emoji}
                            </button>
                          ))}
                        </div>
                      )}
                    </button>
                    <button 
                      className="p-1.5 hover:bg-base-200 rounded-full transition-colors bg-base-100 shadow-sm relative dropdown-container"
                      title="More options"
                      onClick={() => setShowMoreOptionsDropdown(showMoreOptionsDropdown === message._id ? null : message._id)}
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z" />
                      </svg>
                      
                      {/* Dropdown menu */}
                      {showMoreOptionsDropdown === message._id && (
                        <div className="absolute top-8 right-0 bg-base-100 border border-base-300 rounded-lg shadow-lg py-2 z-20 min-w-[140px]">
                          <button
                            className="w-full px-4 py-2 text-left hover:bg-base-200 transition-colors text-sm"
                            onClick={() => handleEditMessage(message)}
                          >
                            Edit
                          </button>
                          <button
                            className="w-full px-4 py-2 text-left hover:bg-base-200 transition-colors text-sm"
                            onClick={() => handleDeleteMessage(message._id)}
                          >
                            Delete
                          </button>
                          <button
                            className="w-full px-4 py-2 text-left hover:bg-base-200 transition-colors text-sm"
                            onClick={() => handlePinMessage(message._id)}
                          >
                            {message.pinned ? 'Unpin' : 'Pin'}
                          </button>
                        </div>
                      )}
                    </button>
                  </div>
                )}
                
                <div className={`max-w-[70%] flex flex-col ${isOwn ? "items-end order-2" : "items-start"}`}>
                  {/* Reply context display */}
                  {message.replyTo && (
                    <div className="mb-2 p-2 bg-gray-700 rounded-lg cursor-pointer hover:bg-gray-600 transition-colors max-w-full"
                         onClick={() => {
                           // Scroll to the replied message
                           const replyElement = messageRefs.current[message.replyTo._id];
                           if (replyElement) {
                             replyElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
                             setHighlightedMessageId(message.replyTo._id);
                             setTimeout(() => setHighlightedMessageId(null), 2000);
                           }
                         }}>
                      <div className="flex items-center gap-1 mb-1">
                        <svg className="w-3 h-3 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" />
                        </svg>
                        <span className="text-xs text-gray-300 font-medium">
                          {message.replyTo.senderId.fullName || "Unknown User"} replied to you
                        </span>
                      </div>
                      <div className="text-sm text-gray-200">
                        {message.replyTo.image ? (
                          <div className="flex items-center gap-2">
                            <svg className="w-4 h-4 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 002 2z" />
                            </svg>
                            <span>Photo</span>
                            {message.replyTo.text && (
                              <span>• {message.replyTo.text.length > 40 ? message.replyTo.text.substring(0, 40) + '...' : message.replyTo.text}</span>
                            )}
                          </div>
                        ) : (
                          <span>
                            {message.replyTo.text && message.replyTo.text.length > 60 ? message.replyTo.text.substring(0, 60) + '...' : message.replyTo.text || "Message"}
                          </span>
                        )}
                      </div>
                    </div>
                  )}
                  
                  {/* Sender name for group chats (non-own messages only, first in group) */}
                  {selectedUser.isGroup && !isOwn && isFirstInGroup && (
                    <div className="text-xs font-medium text-base-content/70 mb-1 px-1">
                      {senderName}
                    </div>
                  )}
                  
                  {/* Message bubble */}
                  <div 
                    className={`relative px-4 py-3 rounded-2xl shadow-sm transition-all duration-300 ${
                      highlightedMessageId === message._id 
                        ? "ring-2 ring-primary/50 bg-primary/10" 
                        : ""
                    } ${
                      isOwn 
                        ? "bg-primary text-primary-content shadow-md" 
                        : "bg-gray-100 text-gray-800 border border-gray-200 shadow-sm"
                    }`}
                    style={{ 
                      borderBottomRightRadius: isOwn ? (isLastInGroup ? 6 : 12) : 18, 
                      borderBottomLeftRadius: isOwn ? 18 : (isLastInGroup ? 6 : 12),
                      borderTopRightRadius: isOwn ? (isFirstInGroup ? 18 : 12) : 18,
                      borderTopLeftRadius: isOwn ? 18 : (isFirstInGroup ? 18 : 12)
                    }}
                  >
                    {/* Message content - directly show text/image (backend auto-decrypts) */}
                    {message.image && (
                      <img
                        src={message.image}
                        alt="Attachment"
                        className="max-w-[250px] rounded-lg mb-2"
                      />
                    )}
                    
                    {message.isDeleted ? (
                      <p className="italic opacity-60 text-sm">This message was deleted</p>
                    ) : (
                      <div>
                        {/* Toxicity Warning */}
                        <ToxicityWarning toxicity={message.toxicity} />
                        
                        {/* Show actual message text */}
                        <p className="whitespace-pre-wrap break-words text-sm leading-relaxed">
                          {message.text}
                        </p>
                        
                        {message.edited && (
                          <span className="text-xs opacity-70 ml-1 font-medium">(edited)</span>
                        )}
                        
                        {/* Remove or comment out the encryption indicator - messages are auto-decrypts by backend */}
                        {/* 
                        {message.isEncrypted && (
                          <div className="flex items-center gap-1 mt-1">
                            <Lock className="w-3 h-3 text-emerald-600" />
                            <span className="text-xs text-emerald-600 font-medium">End-to-end encrypted</span>
                          </div>
                        )}
                        */}
                      </div>
                    )}
                  </div>
                  
                  {/* Message metadata */}
                  <div className={`flex items-center gap-2 mt-1.5 text-xs opacity-50 ${isOwn ? "flex-row-reverse" : ""}`}>
                    <span className="font-medium">{formatMessageTime(message.createdAt)}</span>
                  </div>

                  {/* Message reactions display with overlapping effect */}
                  {messageReactions[message._id]?.summary && Object.keys(messageReactions[message._id].summary).length > 0 && (
                    <div className={`flex items-center mt-1 ${isOwn ? "justify-end" : "justify-start"}`}>
                      {Object.entries(messageReactions[message._id].summary).map(([emoji, users], index) => (
                        <button
                          key={emoji}
                          className="flex items-center gap-1 px-2 py-1 bg-base-200 rounded-full text-xs hover:bg-base-300 transition-all duration-200 hover:scale-110 hover:z-20 relative border-2 border-white shadow-sm"
                          style={{ 
                            marginLeft: index > 0 ? '-8px' : '0',
                            zIndex: Object.keys(messageReactions[message._id].summary).length - index
                          }}
                          onClick={() => {
                            const userReacted = users.some(user => user.userId === authUser._id);
                            if (userReacted) {
                              handleRemoveReaction(message._id);
                            } else {
                              handleAddReaction(message._id, emoji);
                            }
                          }}
                          title={users.map(user => user.fullName).join(', ')}
                        >
                          <span>{emoji}</span>
                          <span className="font-medium">{users.length}</span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>

              </div>
            );
          })}
        </div>

        {/* Messenger-style typing indicator at the bottom */}
        {typingUsers.length > 0 && (
          <div className="px-8 pb-2">
            <TypingIndicator 
              users={typingUsers} 
              isGroup={!!selectedUser?.groupId}
            />
          </div>
        )}


  <div className="w-full px-6 py-2 bg-base-100 flex items-center gap-3 sticky bottom-0 z-30 border-t border-base-200">
          <MessageInput
            selectedUser={selectedUser}
            authUser={authUser}
            frequentWords={frequentWords}
            quickReplies={frequentWords.slice(0, 5).map(({ word }) => word)}
            replyingTo={replyingTo}
            onCancelReply={() => setReplyingTo(null)}
            sendMessage={async (text, image, shouldEncrypt = true) => {
              try {
                console.log("📤 Sending message:", { hasText: !!text, hasImage: !!image });
                
                // ✅ Get sentiment only if text is provided
                let sentiment = "neutral";
                if (text?.trim()) {
                  try {
                    const response = await axios.post("http://127.0.0.1:8000/api/sentiment/analyze/", {
                      text,
                      model: selectedModel,
                    });
                    sentiment = response.data.sentiment;
                    console.log("📊 Sentiment analyzed:", sentiment);
                  } catch (sentimentError) {
                    console.error("⚠️ Sentiment analysis failed, using default:", sentimentError.message);
                    sentiment = "neutral";
                  }
                } else {
                  console.log("ℹ️ No text, using default sentiment");
                }
                
                const replyToId = replyingTo?._id;
                
                if (selectedUser?.groupId) {
                  const payload = { 
                    text, 
                    image,
                    groupId: selectedUser.groupId, 
                    sentiment,
                    replyTo: replyToId,
                    selectedModel,
                    encrypt: true
                  };
                  const payloadSize = JSON.stringify(payload).length;
                  console.log("📤 Sending group message");
                  console.log("   - Payload size:", payloadSize, "bytes");
                  console.log("   - Has text:", !!text?.trim());
                  console.log("   - Has image:", !!image);
                  console.log("   - Image length:", image?.length || 0);
                  console.log("   - URL:", `/api/messages/send`);
                  const response = await axiosInstance.post(`/messages/send`, payload);
                  console.log("✅ Group message sent successfully:", response.data._id);
                } else {
                  const payload = { 
                    text,
                    image, 
                    sentiment,
                    replyTo: replyToId,
                    selectedModel,
                    encrypt: true
                  };
                  const payloadSize = JSON.stringify(payload).length;
                  console.log("📤 Sending DM");
                  console.log("   - Receiver ID:", selectedUser._id);
                  console.log("   - Payload size:", payloadSize, "bytes");
                  console.log("   - Has text:", !!text?.trim());
                  console.log("   - Has image:", !!image);
                  console.log("   - Image length:", image?.length || 0);
                  console.log("   - URL:", `/api/messages/send/${selectedUser._id}`);
                  const response = await axiosInstance.post(`/messages/send/${selectedUser._id}`, payload);
                  console.log("✅ DM sent successfully:", response.data._id);
                }
                
                setReplyingTo(null);
              } catch (err) {
                console.error("❌ Failed to send message");
                console.error("   - Status:", err.response?.status);
                console.error("   - Data:", err.response?.data);
                console.error("   - Message:", err.message);
                console.error("   - Full error:", err);
                if (err.request && !err.response) {
                  console.error("   - No response received (network error)");
                }
                toast.error(err.response?.data?.message || err.message || "Failed to send message");
              }
            }}
          />
        </div>
        {editMessageData && (
          <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50">
            <div className="bg-base-100 p-4 rounded shadow-lg w-80">
              <textarea
                className="w-full p-2 border rounded mb-2"
                defaultValue={editMessageData.oldText}
                onChange={(e) =>
                  setEditMessageData((prev) => ({ ...prev, newText: e.target.value }))
                }
              />
              <div className="flex justify-end space-x-2">
                <button
                  className="btn btn-sm"
                  onClick={() => setEditMessageData(null)}
                >
                  Cancel
                </button>
                <button
                  className="btn btn-sm btn-primary"
                  onClick={async () => {
                    try {
                      // Send edit request to backend
                      // The backend will emit socket event 'messageEdited' to all users
                      // Don't refetch messages here - let the socket event handle it
                      await axiosInstance.put(`/messages/edit/${editMessageData.id}`, {
                        newText: editMessageData.newText,
                      });
                      setEditMessageData(null);
                    } catch (err) {
                      console.error("Failed to edit message", err);
                      toast.error("Failed to edit message");
                    }
                  }}
                >
                  Save
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
      {showUserDetails && (
        <UserDetailsPage
          user={selectedUser}
          sentimentStats={sentimentStats}
          onClose={() => setShowUserDetails(false)}
        />
      )}
    </div>
  );
};
export default ChatContainer;


