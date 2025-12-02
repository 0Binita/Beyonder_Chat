import { useRef, useState } from "react";
import { useChatStore } from "../store/useChatStore";
import { useAuthStore } from "../store/useAuthStore";
import { Image, Send, X } from "lucide-react";
import toast from "react-hot-toast";

const MessageInput = ({ selectedUser, authUser, quickReplies = [], replyingTo, onCancelReply, sendMessage: customSendMessage }) => {
  const [text, setText] = useState("");
  const [imagePreview, setImagePreview] = useState(null);
  const [filteredSuggestions, setFilteredSuggestions] = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [activeSuggestionIndex, setActiveSuggestionIndex] = useState(-1);
  const [suggestionsEnabled, setSuggestionsEnabled] = useState(false); // Toggle for suggestions
  const fileInputRef = useRef(null);
  const typingTimeoutRef = useRef(null);
  const { sendMessage: storeSendMessage } = useChatStore();
  const { socket } = useAuthStore();

  const emojiMap = {
    happy: "😊",
    sad: "😢",
    angry: "😠",
    love: "❤️",
    cool: "😎",
    surprised: "😲",
    tired: "😴",
    sick: "🤒",
    party: "🥳",
    laugh: "😂",
    smile: "😁",
    cry: "😭"
  };

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (!file.type.startsWith("image/")) {
      toast.error("Please select an image file");
      return;
    }

    // Check file size (max 5MB)
    const maxSize = 5 * 1024 * 1024; // 5MB
    if (file.size > maxSize) {
      toast.error("Image size must be less than 5MB");
      return;
    }

    const reader = new FileReader();
    reader.onloadend = () => {
      setImagePreview(reader.result);
      console.log("📸 Image preview set, size:", reader.result.length, "bytes");
    };
    reader.readAsDataURL(file);
  };

  const removeImage = () => {
    setImagePreview(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!text.trim() && !imagePreview) return;

    try {
      // Always encrypt - remove the toggle check
      await customSendMessage(text.trim(), imagePreview, true); // Always pass true for encryption
      
      // Clear form
      setText("");
      setImagePreview(null);
      if (fileInputRef.current) fileInputRef.current.value = "";
      
      // Clear reply state if onCancelReply is available
      if (onCancelReply) {
        onCancelReply();
      }
      
      if (socket?.connected) {
        console.log("Emitting stopTyping event on sendMessage", authUser._id, selectedUser._id);
        socket.emit("stopTyping", {
          senderId: authUser._id,
          ...(selectedUser.isGroup ? { groupId: selectedUser.groupId } : { receiverId: selectedUser._id }),
        });
      }
      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    } catch (error) {
      console.error("Failed to send message:", error);
      toast.error("Failed to send message");
    }
  };

  const handleChange = (e) => {
    const input = e.target.value;
    setText(input);

    // Handle typing indicators for any text change
    if (socket?.connected) {
      if (!typingTimeoutRef.current) {
        console.log("Emitting typing event", authUser._id, selectedUser._id);
        socket.emit("typing", { 
          senderId: authUser._id, 
          ...(selectedUser.isGroup ? { groupId: selectedUser.groupId } : { receiverId: selectedUser._id })
        });
      }
      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
      typingTimeoutRef.current = setTimeout(() => {
        console.log("Emitting stopTyping event", authUser._id, selectedUser._id);
        socket.emit("stopTyping", { 
          senderId: authUser._id, 
          ...(selectedUser.isGroup ? { groupId: selectedUser.groupId } : { receiverId: selectedUser._id })
        });
        typingTimeoutRef.current = null;
      }, 1000);
    } else {
      console.warn("Socket not connected for typing indicators");
    }

    // Only show suggestions if enabled and user has typed at least 2 characters
    const lastWord = input.split(/\s+/).pop().toLowerCase();
    if (!suggestionsEnabled || lastWord.length < 2) {
      setFilteredSuggestions([]);
      setShowSuggestions(false);
      setActiveSuggestionIndex(-1);
      return;
    }

    const matched = quickReplies
      .filter((item) => {
        const w = typeof item === "string" ? item : item.word;
        return w.toLowerCase().startsWith(lastWord);
      })
      .sort((a, b) => {
        const countA = typeof a === "string" ? 0 : a.count;
        const countB = typeof b === "string" ? 0 : b.count;
        return countB - countA;
      })
      .slice(0, 3); // Reduce to 3 suggestions max

    // Check for emoji match
    const emoji = emojiMap[lastWord];
    if (emoji && lastWord.length >= 3) { // Only show emoji for 3+ character words
      matched.push({ word: emoji });
    }

    setFilteredSuggestions(matched);
    setShowSuggestions(matched.length > 0 && suggestionsEnabled);
    setActiveSuggestionIndex(-1);
  };

  const insertSuggestion = (suggestion) => {
    const words = text.split(/\s+/);
    words.pop();
    const newText = [...words, suggestion].join(" ") + " ";
    setText(newText);
    setFilteredSuggestions([]);
    setShowSuggestions(false);
    setActiveSuggestionIndex(-1);
  };

  const handleKeyDown = (e) => {
    if (!showSuggestions) return;

    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActiveSuggestionIndex((prev) =>
        prev === filteredSuggestions.length - 1 ? 0 : prev + 1
      );
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveSuggestionIndex((prev) =>
        prev <= 0 ? filteredSuggestions.length - 1 : prev - 1
      );
    } else if (e.key === "Enter") {
      if (activeSuggestionIndex >= 0 && activeSuggestionIndex < filteredSuggestions.length) {
        e.preventDefault();
        const suggestion = filteredSuggestions[activeSuggestionIndex];
        const suggestionWord = typeof suggestion === "string" ? suggestion : suggestion.word;
        insertSuggestion(suggestionWord);
      }
    } else if (e.key === "Escape") {
      setShowSuggestions(false);
      setActiveSuggestionIndex(-1);
    }
  };

  return (
  <div className="px-4 py-2 w-full">
      {/* Reply preview */}
      {replyingTo && (
        <div className="mb-3 p-4 bg-primary/10 rounded-lg border border-primary/20 shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <svg className="w-4 h-4 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" />
              </svg>
              <span className="text-sm font-semibold text-primary">
                Replying to {replyingTo.senderId.fullName || "Unknown User"}
              </span>
            </div>
            <button
              onClick={onCancelReply}
              className="p-1.5 hover:bg-error/20 rounded-full transition-colors flex-shrink-0"
              title="Cancel reply"
            >
              <X className="w-3 h-3 text-error" />
            </button>
          </div>
          <div className="bg-base-100/70 rounded px-3 py-2 border-l-4 border-primary">
            {replyingTo.image ? (
              <div className="flex items-center gap-2 text-sm text-base-content/70">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 002 2z" />
                </svg>
                <span className="italic">Photo</span>
                {replyingTo.text && (
                  <span className="ml-1">• {replyingTo.text.length > 50 ? replyingTo.text.substring(0, 50) + '...' : replyingTo.text}</span>
                )}
              </div>
            ) : (
              <div className="text-sm text-base-content/70 line-clamp-2">
                {replyingTo.text && replyingTo.text.length > 80 ? replyingTo.text.substring(0, 80) + '...' : replyingTo.text || "Message"}
              </div>
            )}
          </div>
        </div>
      )}

      {imagePreview && (
        <div className="mb-3 flex items-center gap-2">
          <div className="relative">
            <img
              src={imagePreview}
              alt="Preview"
              className="w-20 h-20 object-cover rounded-lg border border-zinc-700"
            />
            <button
              onClick={removeImage}
              className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-base-300
              flex items-center justify-center"
              type="button"
            >
              <X className="size-3" />
            </button>
          </div>
        </div>
      )}

      <form onSubmit={handleSendMessage} className="relative">
        <div className="flex items-center gap-2 w-full">
          {showSuggestions && suggestionsEnabled && (
            <div className="absolute -top-24 left-0 w-full max-w-xs bg-base-100 border border-base-300 rounded-lg shadow-lg z-50 p-2">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs text-base-content/70 font-medium">Suggestions</span>
                <button
                  type="button"
                  className="btn btn-ghost btn-xs"
                  onClick={() => setShowSuggestions(false)}
                >
                  ×
                </button>
              </div>
              <div className="flex flex-wrap gap-1">
                {filteredSuggestions.map((sugg, index) => {
                  const displayWord = typeof sugg === "string" ? sugg : sugg.word;
                  return (
                    <button
                      key={displayWord + index}
                      type="button"
                      className={`px-2 py-1 text-xs rounded-md cursor-pointer transition-colors duration-200
                        ${index === activeSuggestionIndex
                          ? "bg-primary text-primary-content"
                          : "bg-base-200 hover:bg-primary hover:text-primary-content"}
                      `}
                      onClick={() => insertSuggestion(displayWord)}
                      onMouseEnter={() => setActiveSuggestionIndex(index)}
                    >
                      {displayWord}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          <input
            type="text"
            className="w-full input input-bordered rounded-lg input-sm"
            placeholder="Type a message..."
            value={text}
            onChange={handleChange}
            onKeyDown={handleKeyDown}
          />
          <input
            type="file"
            accept="image/*"
            className="hidden"
            ref={fileInputRef}
            onChange={handleImageChange}
          />

          <button
            type="button"
            className={`hidden sm:flex btn btn-circle btn-sm
                     ${imagePreview ? "text-emerald-500" : "text-zinc-400"}`}
            onClick={() => fileInputRef.current?.click()}
          >
            <Image size={18} />
          </button>
          <button
            type="submit"
            className={`btn btn-circle btn-sm ${!text.trim() && !imagePreview ? "bg-base-200 text-zinc-400" : "bg-primary text-white"}`}
            disabled={!text.trim() && !imagePreview}
          >
            <Send size={18} />
          </button>
        </div>
      </form>
    </div>
  );
};

export default MessageInput;
