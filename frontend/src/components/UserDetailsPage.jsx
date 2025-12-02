import { useState, useEffect } from "react";
import { toast } from "react-hot-toast";
import { Pie } from 'react-chartjs-2';
import { Chart as ChartJS, ArcElement, Tooltip, Legend } from 'chart.js';
import { X } from "lucide-react";
import { useAuthStore } from "../store/useAuthStore";
import { useChatStore } from "../store/useChatStore";
import ConfirmationDialog from "./ConfirmationDialog";
ChartJS.register(ArcElement, Tooltip, Legend);

const GroupCreationModal = ({ initialMembers, onClose, onGroupCreated, showGroupNameInput = true, group, onRefreshGroup }) => {
  const [groupName, setGroupName] = useState("");
  const [friends, setFriends] = useState([]);
  const [selectedFriends, setSelectedFriends] = useState(initialMembers.map((m) => m._id));
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const fetchFriends = async () => {
      try {
        const token = localStorage.getItem("token");
        const res = await fetch("/api/user/friends", {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });
        const data = await res.json();
        if (res.ok) setFriends(data);
      } catch (err) {
        console.error("Error fetching friends", err);
      }
    };
    fetchFriends();
  }, []);

  const toggleFriend = (id) => {
    setSelectedFriends((prev) =>
      prev.includes(id) ? prev.filter((fid) => fid !== id) : [...prev, id]
    );
  };

  const createGroup = async () => {
    if (showGroupNameInput && !groupName.trim()) {
      toast.error("Please enter a group name");
      return;
    }
    if (selectedFriends.length < 2) {
      toast.error("Please select at least 2 members");
      return;
    }
    setLoading(true);
    try {
      const token = localStorage.getItem("token");
      
      // If editing existing group, only add new members
      if (!showGroupNameInput && group?._id) {
        // Find members that were newly added
        const existingMemberIds = initialMembers.map((m) => m._id);
        const newMembers = selectedFriends.filter((id) => !existingMemberIds.includes(id));
        
        if (newMembers.length === 0) {
          toast.error("Please select new members to add");
          setLoading(false);
          return;
        }

        const res = await fetch(`/api/group/add-members/${group._id}`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            members: selectedFriends,
          }),
        });
        const data = await res.json();
        if (res.ok) {
          toast.success("✅ Members added successfully!");
          // Refresh group data in real-time
          if (onRefreshGroup) {
            await onRefreshGroup(group._id);
          }
          onGroupCreated?.(data);
          onClose();
        } else {
          toast.error(data.message || "❌ Failed to add members");
        }
      } else {
        // Creating new group
        const res = await fetch("/api/group", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            name: groupName,
            members: selectedFriends,
          }),
        });
        const data = await res.json();
        if (res.ok) {
          toast.success("✅ Group created successfully!");
          onGroupCreated?.(data);
          onClose();
        } else {
          toast.error(data.message || "❌ Failed to create group");
        }
      }
    } catch (err) {
      console.error("Error creating group", err);
      toast.error("❌ An error occurred while creating group");
    } finally {
      setLoading(false);
    }
  };

  // Get selected members details
  const selectedMembersDetails = selectedFriends.map(id => 
    friends.find(f => f._id === id) || initialMembers.find(m => m._id === id)
  ).filter(Boolean);

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
      <div className="bg-base-100 rounded-lg max-w-md w-full max-h-[80vh] overflow-hidden border border-base-300">
        {/* Header */}
        <div className="p-4 border-b border-base-300 flex justify-between items-center">
          <h3 className="text-lg font-semibold text-base-content">
            {showGroupNameInput ? "Create Group" : "Add Members to Group"}
          </h3>
          <button onClick={onClose} className="text-base-content/60 hover:text-base-content">
            <X size={20} />
          </button>
        </div>
        
        {/* Form Content */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {showGroupNameInput && (
            <div>
              <label className="block text-sm font-medium text-base-content/70 mb-2">
                Group Name
              </label>
              <input
                type="text"
                value={groupName}
                  onChange={(e) => setGroupName(e.target.value)}
                  className="w-full px-3 py-2 border border-base-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary bg-base-100 text-base-content"
                  placeholder="Enter group name"
                />
              </div>
            )}
            <div>
              <h4 className="text-sm font-medium text-base-content/70 mb-3">
                Select Friends:
              </h4>
              <div className="space-y-2">
                {friends.length > 0 ? (
                  friends.map((friend) => (
                    <label 
                      key={friend._id} 
                      className="flex items-center gap-3 p-2 rounded-lg cursor-pointer hover:bg-base-200/50 transition-colors"
                    >
                      <input
                        type="checkbox"
                        checked={selectedFriends.includes(friend._id)}
                        onChange={() => toggleFriend(friend._id)}
                        className="w-4 h-4 rounded"
                      />
                      <img
                        src={friend.profilePic || "/avatar.png"}
                        alt={friend.fullName}
                        className="w-8 h-8 rounded-full object-cover"
                      />
                      <span className="text-sm text-base-content flex-1">{friend.fullName}</span>
                    </label>
                  ))
                ) : (
                  <div className="text-sm text-base-content/60 text-center py-4">
                    No friends available
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="p-4 border-t border-base-300 bg-base-100">
            <button
              onClick={createGroup}
              disabled={loading}
              className="w-full bg-primary hover:bg-primary-focus text-primary-content px-4 py-2 rounded-lg font-semibold disabled:opacity-50 transition-colors"
            >
              {loading ? (showGroupNameInput ? "Creating..." : "Adding...") : (showGroupNameInput ? "Create Group" : "Add Members")}
            </button>
        </div>
      </div>
    </div>
  );
};

const UserDetailsPage = ({ user, onClose, onGroupCreated, sentimentStats = {} }) => {
  const [showGroupModal, setShowGroupModal] = useState(false);
  const [reportLoading, setReportLoading] = useState(false);
  const [selectedImg, setSelectedImg] = useState(null);
  const [isUploading, setIsUploading] = useState(false);
  const [showReportDialog, setShowReportDialog] = useState(false);
  const [showUnfriendDialog, setShowUnfriendDialog] = useState(false);
  const [currentUser, setCurrentUser] = useState(user);
  const { authUser } = useAuthStore();
  const { updateGroupProfile, refreshGroupData, setSelectedUser } = useChatStore();

  // Update currentUser when user changes
  useEffect(() => {
    setCurrentUser(user);
    setSelectedImg(null); // Reset selected image when user changes
  }, [user]);

  if (!user) return null;

  // Calculate interests
  const interests = user.interests || [];
  const currentUserInterests = authUser?.interests || [];
  
  const matchedInterests = interests.filter(interest => 
    currentUserInterests.includes(interest)
  );
  
  const unmatchedInterests = interests.filter(interest => 
    !currentUserInterests.includes(interest)
  );

  const calculateCompatibilityScore = () => {
    if (interests.length === 0 || currentUserInterests.length === 0) return 0;
    return Math.round((matchedInterests.length / Math.max(interests.length, currentUserInterests.length)) * 100);
  };

  const compatibilityScore = calculateCompatibilityScore();

  const getSentimentMessage = () => {
    const { conversationTone, insights } = sentimentStats;
    
    if (conversationTone === 'very-positive') {
      return { text: "Wonderful conversation! 🌟", color: "text-success" };
    } else if (conversationTone === 'positive') {
      return { text: "Great conversation vibes! 😊", color: "text-success" };
    } else if (conversationTone === 'volatile') {
      return { text: "Mixed conversation dynamics 🎭", color: "text-warning" };
    } else if (conversationTone === 'negative') {
      return { text: "Challenging conversation 😔", color: "text-error" };
    } else {
      return { text: "Neutral conversation 😐", color: "text-base-content/60" };
    }
  };

  // Helper function to get theme-aware chart colors
  const getChartColors = () => {
    return {
      success: '#10b981',    // emerald-500 - good contrast in both themes
      error: '#f87171',      // red-400 - softer red that works better
      neutral: '#9ca3af',    // gray-400 - better contrast
      border: 'transparent'  // No border for cleaner look
    };
  };

  const sentimentMessage = getSentimentMessage();

  const handleRefreshGroup = async (groupId) => {
    try {
      const updatedGroup = await refreshGroupData(groupId);
      setCurrentUser(updatedGroup);
    } catch (error) {
      console.error("Error refreshing group data:", error);
    }
  };

  const reportUser = async () => {
    setReportLoading(true);
    try {
      const token = localStorage.getItem("token");
      const res = await fetch(`/api/report/user/${user._id}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
      });
      if (res.ok) {
        toast.success("✅ User reported successfully");
        setShowReportDialog(false);
        onClose();
      } else {
        const data = await res.json();
        toast.error(data.message || "❌ Failed to report user");
      }
    } catch (err) {
      console.error("Error reporting user", err);
      toast.error("❌ An error occurred while reporting");
    } finally {
      setReportLoading(false);
    }
  };

  const unfriendUser = async () => {
    try {
      const token = localStorage.getItem("token");
      const res = await fetch(`/api/user/friends/unfriend/${user._id}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      if (res.ok) {
        toast.success("✅ User unfriended successfully");
        setShowUnfriendDialog(false);
        onClose();
      } else {
        const data = await res.json();
        toast.error(data.message || "❌ Failed to unfriend user");
      }
    } catch (err) {
      console.error("Error unfriending user", err);
      toast.error("❌ An error occurred while unfriending");
    }
  };

  const handleImageUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    console.log("🖼️ Starting image upload:", file.name);
    setIsUploading(true);
    const formData = new FormData();
    formData.append("file", file);
    formData.append("upload_preset", "frontend_upload");

    try {
      console.log("📤 Uploading to Cloudinary...");
      const res = await fetch(
        "https://api.cloudinary.com/v1_1/doc4f27bu/upload",
        { method: "POST", body: formData }
      );
      
      if (res.ok) {
        const data = await res.json();
        console.log("✅ Cloudinary upload success:", data.secure_url);
        setSelectedImg(data.secure_url);
        console.log("📝 Calling updateGroupProfile with URL:", data.secure_url);
        // Upload to backend
        const result = await updateGroupProfile(user.groupId, { profilePic: data.secure_url });
        console.log("✅ Backend update result:", result);
      } else {
        console.log("❌ Cloudinary upload failed:", res.status);
        throw new Error("Cloudinary upload failed");
      }
    } catch (error) {
      console.error("❌ Upload error:", error);
      toast.error("❌ Image upload failed. Please try again.");
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <>
      <div
        className="fixed inset-0 flex items-center justify-center z-50 px-4 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      >
        <div
          className="max-w-5xl w-full max-h-[90vh] rounded-3xl shadow-2xl overflow-y-auto bg-base-100 border border-base-300"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header with Profile */}
          <div className="bg-base-200 px-8 py-6 border-b border-base-300">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-6">
                <div className="relative">
                  <img
                    src={selectedImg || user.profilePic || "/avatar.png"}
                    alt="User"
                    className="w-20 h-20 rounded-full object-cover border-4 border-base-100 shadow-lg"
                  />
                  {currentUser.isGroup && (
                    <>
                      <div className="absolute -bottom-1 -right-1 w-6 h-6 bg-primary rounded-full flex items-center justify-center border-2 border-base-100">
                        <span className="text-primary-content text-xs">👥</span>
                      </div>
                      {/* Upload button for group profile pictures */}
                      <label 
                        htmlFor="group-avatar-upload"
                        className="absolute -top-2 -left-2 w-8 h-8 bg-primary rounded-full flex items-center justify-center cursor-pointer hover:bg-primary/80 transition-colors border-2 border-base-100 shadow-lg"
                        title="Upload group picture"
                      >
                        <span className="text-primary-content text-xs">📷</span>
                      </label>
                      <input
                        type="file"
                        id="group-avatar-upload"
                        className="hidden"
                        accept="image/*"
                        onChange={handleImageUpload}
                        disabled={isUploading}
                      />
                    </>
                  )}
                </div>
                <div>
                  <h1 className="text-3xl font-bold text-base-content mb-1">{currentUser.fullName}</h1>
                  {currentUser.isGroup && currentUser.members && (
                    <p className="text-base-content/70 mb-2">{currentUser.members.length} members</p>
                  )}
                  {isUploading && (
                    <p className="text-sm text-primary mt-2 font-medium">📸 Uploading new group photo...</p>
                  )}
                  <div className="flex items-center gap-3">
                    <div className="flex items-center gap-1">
                      {[...Array(5)].map((_, i) => (
                        <div
                          key={i}
                          className={`w-2.5 h-2.5 rounded-full ${
                            i < Math.floor((compatibilityScore / 100) * 5)
                              ? 'bg-success'
                              : 'bg-base-content/30'
                          }`}
                        />
                      ))}
                    </div>
                    <span className="text-sm font-medium text-base-content/70">
                      {compatibilityScore}% compatibility
                    </span>
                    {sentimentStats && Object.keys(sentimentStats).length > 0 && (
                      <span className={`text-sm font-medium ${sentimentMessage.color}`}>
                        • {sentimentMessage.text}
                      </span>
                    )}
                  </div>
                </div>
              </div>
              <button
                onClick={onClose}
                className="w-12 h-12 rounded-full bg-base-100 hover:bg-base-300 flex items-center justify-center transition-colors shadow-md"
                aria-label="Close"
              >
                <X size={24} className="text-base-content" />
              </button>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="px-8 py-6 bg-base-100 border-b border-base-300">
            <div className="flex gap-4">
              <button
                onClick={() => setShowGroupModal(true)}
                className="flex-1 bg-primary/80 hover:bg-primary text-primary-content px-8 py-4 rounded-2xl font-semibold text-lg transition-colors shadow-lg hover:shadow-xl transform hover:-translate-y-0.5"
              >
                {currentUser.isGroup ? "Add Members" : "Create Group"} 
              </button>
              {!currentUser.isGroup && (
                <button
                  onClick={() => setShowUnfriendDialog(true)}
                  className="bg-base-200 hover:bg-base-300 text-base-content px-8 py-4 rounded-2xl font-semibold text-lg transition-colors shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 border border-base-300"
                >
                  Unfriend
                </button>
              )}
              <button
                onClick={() => setShowReportDialog(true)}
                disabled={reportLoading}
                className="bg-base-200 hover:bg-base-300 text-base-content/80 px-8 py-4 rounded-2xl font-semibold text-lg transition-colors shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 disabled:opacity-50 border border-base-300"
              >
                Report
              </button>
            </div>
          </div>

          {/* Main Content Grid */}
          <div className="p-8">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              
              {/* Left Column - Compatibility & Interests OR Group Members */}
              <div className="space-y-6">
                {/* Group Members Section for Groups */}
                {currentUser.isGroup && currentUser.members && currentUser.members.length > 0 && (
                  <div className="bg-secondary/10 rounded-3xl p-6 border border-secondary/30">
                    <h3 className="text-xl font-bold text-secondary mb-4 flex items-center gap-2">
                      👥 Group Members
                      <span className="text-sm font-semibold text-secondary bg-secondary/20 px-2 py-1 rounded-full">
                        {currentUser.members.length}
                      </span>
                    </h3>
                    <div className="space-y-2 max-h-96 overflow-y-auto">
                      {currentUser.members.map((member) => (
                        <div 
                          key={member._id}
                          className="flex items-center gap-3 p-3 rounded-lg  transition-all border"
                        >
                          <img
                            src={member.profilePic || "/avatar.png"}
                            alt={member.fullName}
                            className="w-10 h-10 rounded-full object-cover border-2 border-base-300"
                          />
                          <div className="flex-1 min-w-0">
                            <div className="font-semibold text-base-content truncate">
                              {member.fullName}
                            </div>
                            <div className="text-xs text-base-content/60 truncate">
                              {member.email}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Compatibility Score Card - Only for non-groups */}
                {!currentUser.isGroup && interests.length > 0 && currentUserInterests.length > 0 && (
             <div className="bg-accent/10 rounded-3xl p-6 border border-accent/30">
                    <div className="flex items-center justify-between mb-6">
                      <div>
                        <h3 className="text-xl font-bold text-accent">Compatibility Score</h3>
                        <p className="text-accent/70 text-sm">Based on shared interests</p>
                      </div>
                      <div className="text-right">
                        <div className="text-4xl font-bold text-accent">{compatibilityScore}%</div>
                        <div className="text-sm text-accent/70">Match Rate</div>
                      </div>
                    </div>
                    <div className="relative">
                      <div className="w-full bg-accent/30 rounded-full h-4 mb-2">
                        <div 
                          className="bg-accent h-4 rounded-full transition-all duration-1000 shadow-inner"
                          style={{ width: `${compatibilityScore}%` }}
                        />
                      </div>
                      <div className="flex justify-between text-xs text-accent font-medium">
                        <span>0%</span>
                        <span>50%</span>
                        <span>100%</span>
                      </div>
                    </div>
                    <div className="mt-4 text-center">
                      <span className="text-sm text-accent bg-accent/20 px-3 py-1 rounded-full">
                        {matchedInterests.length} of {interests.length} interests match
                      </span>
                    </div>
                  </div>
                )}

                {/* Shared Interests */}
                {!currentUser.isGroup && matchedInterests.length > 0 && (
                  <div className="bg-base-200/50 rounded-3xl p-6 border border-base-300">
                    <h3 className="text-xl font-bold text-base-content mb-4 flex items-center gap-2">
                      🤝 Shared Interests
                      <span className="bg-primary/20 text-primary text-sm px-2 py-1 rounded-full border border-primary/30">
                        {matchedInterests.length}
                      </span>
                    </h3>
                    <div className="flex flex-wrap gap-3">
                      {matchedInterests.map((interest, index) => (
                        <span
                          key={index}
                          className="px-4 py-2 bg-primary/15 hover:bg-primary/25 text-primary rounded-full font-medium border border-primary/30 transition-colors"
                        >
                          {interest}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {/* Other Interests */}
                {!currentUser.isGroup && unmatchedInterests.length > 0 && (
                  <div className="bg-base-200/40 rounded-3xl p-6 border border-base-300">
                    <h3 className="text-xl font-bold text-base-content/90 mb-4 flex items-center gap-2">
                      ✨ Their Other Interests
                      <span className="bg-base-300 text-base-content/80 text-sm px-2 py-1 rounded-full border border-base-300">
                        {unmatchedInterests.length}
                      </span>
                    </h3>
                    <div className="flex flex-wrap gap-3">
                      {unmatchedInterests.slice(0, 12).map((interest, index) => (
                        <span
                          key={index}
                          className="px-4 py-2 bg-base-300/70 hover:bg-base-300 text-base-content/90 rounded-full font-medium border border-base-300 transition-colors"
                        >
                          {interest}
                        </span>
                      ))}
                      {unmatchedInterests.length > 12 && (
                        <span className="px-4 py-2 bg-base-200 text-base-content rounded-full font-medium border border-base-300">
                          +{unmatchedInterests.length - 12} more
                        </span>
                      )}
                    </div>
                  </div>
                )}

                {/* No Shared Interests */}
                {!currentUser.isGroup && matchedInterests.length === 0 && interests.length > 0 && (
                  <div className="bg-base-200/50 rounded-3xl p-6 border border-base-300">
                    <h3 className="text-xl font-bold text-base-content mb-4">🌟 Different but Compatible!</h3>
                    <p className="text-base-content/80 mb-4">You became friends despite different interests - that's special!</p>
                    <div className="flex flex-wrap gap-3">
                      {interests.slice(0, 8).map((interest, index) => (
                        <span
                          key={index}
                          className="px-4 py-2 bg-base-300/60 text-base-content rounded-full font-medium border border-base-300"
                        >
                          {interest}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {/* No Interests */}
                {!currentUser.isGroup && interests.length === 0 && (
                  <div className="bg-base-200 rounded-3xl p-6 border border-base-300">
                    <h3 className="text-xl font-bold text-base-content/70 mb-2">No Interests Listed</h3>
                    <p className="text-base-content/60">This user hasn't added any interests yet.</p>
                  </div>
                )}
              </div>

              {/* Right Column - Sentiment Analysis */}
              {sentimentStats && Object.keys(sentimentStats).length > 0 && (
                <div className="space-y-6">
                  <div className="bg-secondary/10 rounded-3xl p-6 border border-secondary/30">
                    <h3 className="text-xl font-bold text-secondary mb-6 flex items-center gap-2">
                      📊 Conversation Analysis
                    </h3>
                    
                    {/* Sentiment Overview */}
                    <div className="flex items-center justify-between mb-6">
                      <div>
                        <p className="text-lg font-semibold text-secondary">{sentimentMessage.text}</p>
                        <p className="text-sm text-secondary/70">Overall conversation tone</p>
                      </div>
                      <div className="w-20 h-20">
                        <Pie
                          data={{
                            labels: ['Positive', 'Negative', 'Neutral'],
                            datasets: [{
                              data: [
                                sentimentStats.positive || 0,
                                sentimentStats.negative || 0,
                                sentimentStats.neutral || 0
                              ],
                              backgroundColor: [
                                getChartColors().success,
                                getChartColors().error,
                                getChartColors().neutral
                              ],
                              borderWidth: 0,
                              borderColor: getChartColors().border,
                            }]
                          }}
                          options={{
                            responsive: true,
                            maintainAspectRatio: true,
                            plugins: {
                              legend: { display: false }
                            }
                          }}
                        />
                      </div>
                    </div>

                    {/* Stats Grid */}
                    <div className="grid grid-cols-3 gap-4 mb-6">
                      <div className="bg-base-200/70 rounded-2xl p-4 text-center border border-base-300">
                        <div className="text-2xl font-bold text-base-content">{sentimentStats.positive || 0}</div>
                        <div className="text-sm text-base-content/80 font-medium">Positive</div>
                        <div className="text-xs text-base-content/60">
                          {Math.round(((sentimentStats.positive || 0) / ((sentimentStats.positive || 0) + (sentimentStats.negative || 0) + (sentimentStats.neutral || 0))) * 100) || 0}%
                        </div>
                      </div>
                      <div className="bg-base-200/70 rounded-2xl p-4 text-center border border-base-300">
                        <div className="text-2xl font-bold text-base-content">{sentimentStats.negative || 0}</div>
                        <div className="text-sm text-base-content/80 font-medium">Negative</div>
                        <div className="text-xs text-base-content/60">
                          {Math.round(((sentimentStats.negative || 0) / ((sentimentStats.positive || 0) + (sentimentStats.negative || 0) + (sentimentStats.neutral || 0))) * 100) || 0}%
                        </div>
                      </div>
                      <div className="bg-base-200/70 rounded-2xl p-4 text-center border border-base-300">
                        <div className="text-2xl font-bold text-base-content">{sentimentStats.neutral || 0}</div>
                        <div className="text-sm text-base-content/80 font-medium">Neutral</div>
                        <div className="text-xs text-base-content/60">
                          {Math.round(((sentimentStats.neutral || 0) / ((sentimentStats.positive || 0) + (sentimentStats.negative || 0) + (sentimentStats.neutral || 0))) * 100) || 0}%
                        </div>
                      </div>
                    </div>

                    {/* Additional Insights */}
                    {sentimentStats.insights && (
                      <div className="bg-secondary/20 rounded-2xl p-4">
                        <h4 className="font-semibold text-secondary mb-3">Conversation Insights</h4>
                        <div className="grid grid-cols-2 gap-4">
                          <div className="text-center">
                            <div className="text-sm font-medium text-secondary">Recent Trend</div>
                            <div className="text-secondary/80 font-semibold">
                              {sentimentStats.insights.recentTrend === 'improving' ? '📈 Improving' :
                               sentimentStats.insights.recentTrend === 'declining' ? '📉 Declining' : '➡️ Stable'}
                            </div>
                          </div>
                          <div className="text-center">
                            <div className="text-sm font-medium text-secondary">Balance</div>
                            <div className="text-secondary/80 font-semibold">
                              {sentimentStats.insights.reciprocityBalance === 'positive-mutual' ? '🤝 Mutual' :
                               sentimentStats.insights.reciprocityBalance === 'balanced' ? '⚖️ Balanced' :
                               '⚠️ Imbalanced'}
                            </div>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* No additional Group Members Section needed - shown on left column */}
          </div>
        </div>
      </div>

      {/* Group Modal */}
      {showGroupModal && (
        <GroupCreationModal
          initialMembers={currentUser.isGroup ? currentUser.members : [currentUser]}
          onClose={() => setShowGroupModal(false)}
          onGroupCreated={onGroupCreated}
          showGroupNameInput={!currentUser.isGroup}
          group={currentUser.isGroup ? currentUser : null}
          onRefreshGroup={handleRefreshGroup}
        />
      )}

      {/* Report Confirmation Dialog */}
      <ConfirmationDialog
        isOpen={showReportDialog}
        title="Report User"
        message={`Are you sure you want to report ${currentUser.fullName}? This action will be reviewed by our admin team.`}
        confirmText="Report"
        cancelText="Cancel"
        isDangerous={true}
        isLoading={reportLoading}
        onConfirm={reportUser}
        onCancel={() => setShowReportDialog(false)}
      />

      {/* Unfriend Confirmation Dialog */}
      <ConfirmationDialog
        isOpen={showUnfriendDialog}
        title="Unfriend User"
        message={`Are you sure you want to unfriend ${currentUser.fullName}? You will no longer see their messages or profile.`}
        confirmText="Unfriend"
        cancelText="Cancel"
        isDangerous={true}
        isLoading={false}
        onConfirm={unfriendUser}
        onCancel={() => setShowUnfriendDialog(false)}
      />
    </>
  );
};

export default UserDetailsPage;