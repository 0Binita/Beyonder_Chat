import { X, Users, Lock, Shield } from "lucide-react";
import { useAuthStore } from "../store/useAuthStore";
import { useChatStore } from "../store/useChatStore";
import { useEffect, useState } from "react";

const ChatHeader = () => {
  const { selectedUser, setSelectedUser } = useChatStore();
  const { onlineUsers, socket } = useAuthStore();
  const [encryptionSupported, setEncryptionSupported] = useState(false);

  // Check if encryption is supported for the selected user
  useEffect(() => {
    const checkEncryptionSupport = async () => {
      if (!selectedUser || selectedUser.isGroup) {
        setEncryptionSupported(false);
        return;
      }

      try {
        // Check if the user has encryption enabled
        const response = await fetch(`/api/encryption/public-key/${selectedUser._id}`);
        if (response.ok) {
          const data = await response.json();
          setEncryptionSupported(data.encryptionEnabled || false);
        } else {
          setEncryptionSupported(false);
        }
      } catch (error) {
        console.error("Failed to check encryption support:", error);
        setEncryptionSupported(false);
      }
    };

    checkEncryptionSupport();
  }, [selectedUser]);

  // Socket listener for group profile updates
  useEffect(() => {
    if (!socket || !selectedUser) return;

    const handleGroupProfileUpdate = (data) => {
      // If this is the currently selected group, update it
      if (selectedUser.groupId === data.groupId) {
        setSelectedUser({ ...selectedUser, profilePic: data.profilePic });
      }
    };

    socket.on("groupProfileUpdated", handleGroupProfileUpdate);

    return () => {
      socket.off("groupProfileUpdated", handleGroupProfileUpdate);
    };
  }, [socket, selectedUser, setSelectedUser]);

  return (
    <div className="p-2.5 border-b border-base-300">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          {/* Avatar */}
          <div className="avatar">
            <div className="relative size-10 rounded-full">
              <img
                src={selectedUser.profilePic || "/avatar.png"}
                alt={selectedUser.fullName}
                className="w-10 h-10 rounded-full object-cover"
              />
              {selectedUser.isGroup && (
                <div className="absolute bottom-0 right-0 bg-white rounded-full p-1 shadow-md">
                  <Users className="size-4 text-gray-700" />
                </div>
              )}
            </div>
          </div>

          {/* User info */}
          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-medium">{selectedUser.fullName}</h3>
              {!selectedUser.isGroup && encryptionSupported && (
                <div className="flex items-center gap-1 text-xs text-emerald-600">
                  {/* <Shield className="w-3 h-3" />
                  <span>E2E Encrypted</span> */}
                </div>
              )}
            </div>
            {!selectedUser.isGroup ? (
              <p className="text-sm text-base-content/70">
                {onlineUsers.includes(selectedUser._id) ? "Online" : "Offline"}
              </p>
            ) : (
              <p className="text-sm text-base-content/70">
                Group Chat • {selectedUser.members?.length || 0} members
              </p>
            )}
          </div>
        </div>

        {/* Close button */}
        <button onClick={() => setSelectedUser(null)}>
          <X />
        </button>
      </div>
    </div>
  );
};
export default ChatHeader;
