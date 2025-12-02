import { useState, useEffect } from "react";
import { toast } from "react-hot-toast";
import { Pie } from 'react-chartjs-2';
import { Chart as ChartJS, ArcElement, Tooltip, Legend } from 'chart.js';
import { X } from "lucide-react";
import { useAuthStore } from "../store/useAuthStore";
ChartJS.register(ArcElement, Tooltip, Legend);

const GroupCreationModal = ({ initialMembers, onClose, onGroupCreated, showGroupNameInput = true, group }) => {
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
      alert("Please enter a group name");
      return;
    }
    if (selectedFriends.length < 2) {
      alert("Please select at least 2 members");
      return;
    }
    setLoading(true);
    try {
      const token = localStorage.getItem("token");

      let res;
      if (!showGroupNameInput && group) {
        // Adding members to existing group
        res = await fetch(`/api/group/add-members/${group._id}`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ members: selectedFriends }),
        });
      } else {
        // Creating new group
        res = await fetch("/api/group/create", {
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
      }

      const data = await res.json();
      if (res.ok) {
        onGroupCreated?.(data);
        onClose();
        alert(showGroupNameInput ? "Group created successfully!" : "Members added successfully!");
      } else {
        alert(data.message || "Failed to create/update group");
      }
    } catch (err) {
      console.error("Group creation/update error:", err);
      alert("Error creating/updating group");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="fixed inset-0 flex items-center justify-center z-50 px-4"
      style={{
        backgroundColor: "rgba(0, 0, 0, 0.5)",
        backdropFilter: "blur(8px)"
      }}
    >
      <div className="p-7 rounded-xl shadow-2xl w-96 max-h-[80vh] overflow-auto" style={{ backgroundColor: "#F5F5F5", border: "1px solid #C0C9EE" }}>
        <h2 className="text-xl font-semibold mb-5" style={{ color: "#898AC4" }}>
          Create Group Chat
        </h2>
        {showGroupNameInput && (
          <input
            type="text"
            placeholder="Group Name"
            className="input input-bordered w-full mb-5 rounded-md"
            style={{
              border: "1px solid #C0C9EE",
              background: "#FFF2E0",
              color: "#898AC4"
            }}
            value={groupName}
            onChange={(e) => setGroupName(e.target.value)}
            disabled={loading}
          />
        )}
        <div
          className="mb-5 max-h-48 overflow-auto rounded-md p-3 scrollbar-thin"
          style={{ border: "1px solid #C0C9EE", background: "#FFF2E0" }}
        >
          {friends.length === 0 && (
            <p className="text-sm" style={{ color: "#A2AADB" }}>No friends to select</p>
          )}
          {friends.map((friend) => (
            <label
              key={friend._id}
              className="flex items-center mb-2 cursor-pointer transition-colors"
              style={{ color: "#898AC4" }}
            >
              <input
                type="checkbox"
                checked={selectedFriends.includes(friend._id)}
                onChange={() => toggleFriend(friend._id)}
                className="checkbox mr-3 rounded-sm"
                style={{
                  accentColor: "#898AC4",
                  border: "1px solid #C0C9EE"
                }}
                disabled={loading}
              />
              <span className="select-none">{friend.fullName}</span>
            </label>
          ))}
        </div>
        <div className="flex justify-end space-x-3">
          <button
            className="btn px-4 py-2 rounded-md"
            style={{
              background: "#E1E1E1",
              color: "#898AC4",
              border: "1px solid #C0C9EE"
            }}
            onMouseOver={e => (e.currentTarget.style.background = "#D0D0D0")}
            onMouseOut={e => (e.currentTarget.style.background = "#E1E1E1")}
            onClick={onClose}
            disabled={loading}
          >
            Cancel
          </button>
          <button
            className="btn px-4 py-2 rounded-md"
            style={{
              background: "#898AC4",
              color: "#FFF2E0",
              border: "1px solid #898AC4"
            }}
            onMouseOver={e => (e.currentTarget.style.background = "#A2AADB")}
            onMouseOut={e => (e.currentTarget.style.background = "#898AC4")}
            onClick={createGroup}
            disabled={loading}
          >
            {loading ? "Creating..." : showGroupNameInput ? "Create Group" : "Add Members"}
          </button>
        </div>
      </div>
    </div>
  );
};

const UserDetailsPage = ({ user, onClose, onGroupCreated, sentimentStats = {} }) => {
  const [showGroupModal, setShowGroupModal] = useState(false);
  const [reportLoading, setReportLoading] = useState(false);
  const { authUser } = useAuthStore();

  if (!user) return null;

  // Pick all interests or empty array fallback
  const interests = user.interests || [];
  const currentUserInterests = authUser?.interests || [];
  
  // Calculate matched interests
  const matchedInterests = interests.filter(interest => 
    currentUserInterests.includes(interest)
  );
  
  // Calculate unmatched interests (user's interests that current user doesn't have)
  const unmatchedInterests = interests.filter(interest => 
    !currentUserInterests.includes(interest)
  );

  // Enhanced sentiment message based on conversation tone
  const getSentimentMessage = () => {
    const { conversationTone, insights } = sentimentStats;
    const { positive, negative, neutral } = sentimentStats;
    
    if (conversationTone === 'very-positive') {
      return {
        text: "Wonderful conversation! 🌟",
        subtext: insights?.recentTrend === 'improving' ? "Things are getting even better!" : "Keep up the positive energy!"
      };
    } else if (conversationTone === 'positive') {
      return {
        text: "Great conversation vibes! 😊",
        subtext: insights?.reciprocityBalance === 'positive-mutual' ? "You both are bringing positive energy!" : "Mostly positive interactions"
      };
    } else if (conversationTone === 'volatile') {
      return {
        text: "Quite an emotional conversation 🎢",
        subtext: "Lots of ups and downs in the sentiment"
      };
    } else if (conversationTone === 'negative') {
      return {
        text: "Room for improvement 😔",
        subtext: insights?.recentTrend === 'improving' ? "But things are looking up!" : 
                insights?.recentTrend === 'declining' ? "Conversation is getting more tense" :
                "Consider a more positive approach"
      };
    } else if (conversationTone === 'very-negative') {
      return {
        text: "Challenging conversation 😞",
        subtext: insights?.recentTrend === 'improving' ? "Some improvement detected" : "Maybe it's time for a break or fresh start"
      };
    } else {
      // For neutral/balanced conversations, be more specific based on actual numbers
      if (negative > positive + 10) {
        return {
          text: "Conversation leaning negative 😕",
          subtext: insights?.recentTrend === 'improving' ? "But recent messages are better!" :
                  insights?.recentTrend === 'declining' ? "And getting more negative" :
                  "More negative than positive overall"
        };
      } else if (positive > negative + 10) {
        return {
          text: "Mostly positive conversation 😊",
          subtext: insights?.recentTrend === 'improving' ? "And getting even better!" :
                  insights?.recentTrend === 'declining' ? "But recent messages are concerning" :
                  "More positive than negative overall"
        };
      } else {
        return {
          text: "Balanced conversation 😐",
          subtext: insights?.recentTrend === 'improving' ? "Recent trend is positive!" :
                  insights?.recentTrend === 'declining' ? "Recent trend is concerning" :
                  "Neither particularly positive nor negative"
        };
      }
    }
  };

  const sentimentMessage = getSentimentMessage();

  return (
    <>
      <div
        className="fixed inset-0 flex items-center justify-center h-screen w-screen z-50 px-4"
        style={{
          backgroundColor: "rgba(0, 0, 0, 0.6)",
          backdropFilter: "blur(8px)"
        }}
        onClick={onClose}
      >
        <div
          className="max-w-4xl w-full max-h-[90vh] rounded-3xl shadow-2xl overflow-y-auto bg-white"
          style={{ 
            border: "1px solid rgba(229, 231, 235, 0.3)",
          }}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex justify-between items-center px-8 py-6 border-b border-gray-100">
            <div className="flex items-center gap-4">
              <div className="relative">
                <img
                  src={user.profilePic || "/avatar.png"}
                  alt="User"
                  className="w-16 h-16 rounded-full object-cover"
                />
                {user.isGroup && (
                  <div className="absolute -bottom-1 -right-1 w-5 h-5 bg-blue-500 rounded-full flex items-center justify-center">
                    <span className="text-white text-xs">👥</span>
                  </div>
                )}
              </div>
              <div>
                <h2 className="text-2xl font-bold text-gray-800">{user.fullName}</h2>
                {user.isGroup && user.members && (
                  <p className="text-sm text-gray-500">{user.members.length} members</p>
                )}
                <div className="flex items-center gap-2 mt-1">
                  <div className="flex gap-1">
                    {[...Array(5)].map((_, i) => (
                      <div
                        key={i}
                        className={`w-2 h-2 rounded-full ${
                          i < Math.floor((matchedInterests.length / Math.max(interests.length, 1)) * 5)
                            ? 'bg-green-400'
                            : 'bg-gray-200'
                        }`}
                      ></div>
                    ))}
                  </div>
                  <span className="text-xs text-gray-500">
                    {Math.round((matchedInterests.length / Math.max(interests.length, 1)) * 100)}% match
                  </span>
                </div>
              </div>
            </div>
            <button
              onClick={onClose}
              className="w-10 h-10 rounded-full bg-gray-100 hover:bg-gray-200 flex items-center justify-center transition-colors"
              aria-label="Close"
            >
              <X size={20} className="text-gray-600" />
            </button>
          </div>

          {/* Main Content */}
          <div className="p-8">
            {/* Action Buttons */}
            <div className="flex gap-3 mb-8">
              <button
                onClick={() => setShowGroupModal(true)}
                className="flex-1 bg-blue-500 hover:bg-blue-600 text-white px-6 py-3 rounded-xl font-medium transition-colors"
              >
                {user.isGroup ? "Group Options" : "Create Group"}
              </button>
              {!user.isGroup && (
                <button
                  onClick={unfriendUser}
                  className="bg-orange-500 hover:bg-orange-600 text-white px-6 py-3 rounded-xl font-medium transition-colors"
                >
                  Unfriend
                </button>
              )}
              <button
                onClick={reportUser}
                disabled={reportLoading}
                className="bg-red-500 hover:bg-red-600 text-white px-6 py-3 rounded-xl font-medium transition-colors disabled:opacity-50"
              >
                Report
              </button>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
              {/* Compatibility Score */}
              {!user.isGroup && interests.length > 0 && currentUserInterests.length > 0 && (
                <div className="bg-gradient-to-br from-purple-50 to-purple-100 rounded-2xl p-6">
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <h3 className="text-lg font-semibold text-purple-800">Compatibility</h3>
                      <p className="text-sm text-purple-600">Based on shared interests</p>
                    </div>
                    <div className="text-right">
                      <div className="text-3xl font-bold text-purple-900">{compatibilityScore}%</div>
                      <div className="text-xs text-purple-600">Match Rate</div>
                    </div>
                  </div>
                  <div className="w-full bg-purple-200 rounded-full h-3">
                    <div 
                      className="bg-purple-500 h-3 rounded-full transition-all duration-500"
                      style={{ width: `${compatibilityScore}%` }}
                    ></div>
                  </div>
                  <div className="flex justify-between mt-2 text-xs text-purple-600">
                    <span>0%</span>
                    <span>50%</span>
                    <span>100%</span>
                  </div>
                </div>
              )}

              {/* Sentiment Overview */}
              {sentimentStats && Object.keys(sentimentStats).length > 0 && (
                <div className="bg-gradient-to-br from-indigo-50 to-indigo-100 rounded-2xl p-6">
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <h3 className="text-lg font-semibold text-indigo-800">Conversation Analysis</h3>
                      <p className="text-sm text-indigo-600">{sentimentMessage.text}</p>
                    </div>
                    <div className="w-16 h-16">
                      <Pie
                        data={{
                          labels: ['Positive', 'Negative', 'Neutral'],
                          datasets: [{
                            data: [
                              sentimentStats.positive || 0,
                              sentimentStats.negative || 0,
                              sentimentStats.neutral || 0
                            ],
                            backgroundColor: ['#10b981', '#ef4444', '#6b7280'],
                            borderWidth: 0,
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
                  <div className="grid grid-cols-3 gap-3">
                    <div className="text-center">
                      <div className="text-lg font-bold text-green-600">{sentimentStats.positive || 0}</div>
                      <div className="text-xs text-green-500">Positive</div>
                    </div>
                    <div className="text-center">
                      <div className="text-lg font-bold text-red-600">{sentimentStats.negative || 0}</div>
                      <div className="text-xs text-red-500">Negative</div>
                    </div>
                    <div className="text-center">
                      <div className="text-lg font-bold text-gray-600">{sentimentStats.neutral || 0}</div>
                      <div className="text-xs text-gray-500">Neutral</div>
                    </div>
                  </div>
                </div>
              )}
            </div>
              {user.isGroup ? "Group Details" : "User Profile"}
            </h2>
            <button
              onClick={onClose}
              className="w-8 h-8 rounded-full bg-gray-100 hover:bg-gray-200 flex items-center justify-center transition-colors"
              aria-label="Close"
            >
              <X size={18} className="text-gray-600" />
            </button>
          </div>

          <div className="flex flex-col lg:flex-row">
            {/* User Info Section */}
            <div className="flex-1 p-6 space-y-6">
              {/* Profile Section */}
              <div className="text-center">
                <div className="relative inline-block">
                  <img
                    src={user.profilePic || "/avatar.png"}
                    alt="User"
                    className="w-24 h-24 rounded-full object-cover shadow-lg mx-auto ring-4 ring-blue-100"
                  />
                  {user.isGroup && (
                    <div className="absolute -bottom-1 -right-1 w-6 h-6 bg-blue-500 rounded-full flex items-center justify-center">
                      <span className="text-white text-xs">👥</span>
                    </div>
                  )}
                </div>
                <h3 className="text-xl font-semibold text-gray-800 mt-3">{user.fullName}</h3>
                {user.isGroup && user.members && (
                  <p className="text-sm text-gray-500">{user.members.length} members</p>
                )}
                
                {/* Prominent Shared Interests for Friends */}
                {!user.isGroup && matchedInterests.length > 0 && (
                  <div className="mt-4 bg-gradient-to-r from-green-50 to-emerald-50 rounded-lg p-4 border-2 border-green-200">
                    <div className="text-center mb-3">
                      <h5 className="text-lg font-semibold text-green-800 mb-1 flex items-center justify-center">
                        <span className="mr-2">🤝</span>
                        What Brought You Together
                      </h5>
                      <p className="text-xs text-green-600">
                        You both share {matchedInterests.length} common interest{matchedInterests.length > 1 ? 's' : ''}
                      </p>
                    </div>
                    <div className="flex flex-wrap gap-2 justify-center">
                      {matchedInterests.map((interest, index) => (
                        <span
                          key={index}
                          className="px-4 py-2 bg-green-100 text-green-800 rounded-full text-sm font-semibold border-2 border-green-300 shadow-sm animate-pulse"
                          style={{
                            animationDelay: `${index * 0.2}s`,
                            animationDuration: '2s',
                            animationIterationCount: '3'
                          }}
                        >
                          ✨ {interest}
                        </span>
                      ))}
                    </div>
                    
                    {/* Show a nice friendship message */}
                    <div className="mt-3 text-center">
                      <p className="text-xs text-green-700 bg-green-100 rounded-full px-3 py-1 inline-block">
                        💚 {matchedInterests.length === 1 ? 
                          "This shared passion connects you!" : 
                          matchedInterests.length === 2 ? 
                          "Two great things in common!" :
                          `${matchedInterests.length} amazing connections!`}
                      </p>
                    </div>
                  </div>
                )}
                
                {/* Show other interests if any (less prominent) */}
                {!user.isGroup && unmatchedInterests.length > 0 && (
                  <div className="mt-3">
                    <h5 className="text-sm font-medium text-blue-600 mb-2 flex items-center justify-center">
                      <span className="mr-1">✨</span>
                      Their Other Interests
                    </h5>
                    <div className="flex flex-wrap gap-1 justify-center">
                      {unmatchedInterests.slice(0, 6).map((interest, index) => (
                        <span
                          key={index}
                          className="px-2 py-1 bg-blue-50 text-blue-600 rounded-full text-xs font-medium border border-blue-200"
                        >
                          {interest}
                        </span>
                      ))}
                      {unmatchedInterests.length > 6 && (
                        <span className="px-2 py-1 bg-gray-50 text-gray-500 rounded-full text-xs">
                          +{unmatchedInterests.length - 6} more
                        </span>
                      )}
                    </div>
                  </div>
                )}
                
                {/* Show encouragement if no shared interests (rare for friends) */}
                {!user.isGroup && matchedInterests.length === 0 && interests.length > 0 && (
                  <div className="mt-4 p-3 bg-yellow-50 rounded-lg border border-yellow-200">
                    <div className="text-center">
                      <p className="text-sm text-yellow-700 font-medium mb-1">🌟 Different but Compatible!</p>
                      <p className="text-xs text-yellow-600">
                        You became friends despite different interests - that's special!
                      </p>
                    </div>
                    <div className="mt-2 flex flex-wrap gap-1 justify-center">
                      {interests.slice(0, 4).map((interest, index) => (
                        <span
                          key={index}
                          className="px-2 py-1 bg-yellow-100 text-yellow-700 rounded-full text-xs"
                        >
                          {interest}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Remove the old interests section that was displayed separately */}

              {/* Compatibility Score - only show for individual users with interests */}
              {!user.isGroup && interests.length > 0 && currentUserInterests.length > 0 && (
                <div className="bg-gradient-to-r from-purple-50 to-pink-50 rounded-lg p-4 border border-purple-200">
                  <h4 className="font-semibold text-purple-800 mb-2 flex items-center">
                    <span className="mr-2">💫</span>
                    Compatibility Score
                  </h4>
                  {(() => {
                    const totalUserInterests = interests.length;
                    const totalCurrentUserInterests = currentUserInterests.length;
                    const sharedCount = matchedInterests.length;
                    
                    // Calculate compatibility as percentage of shared interests vs total unique interests
                    const uniqueInterests = new Set([...interests, ...currentUserInterests]).size;
                    const compatibilityScore = Math.round((sharedCount / Math.min(totalUserInterests, totalCurrentUserInterests)) * 100);
                    
                    let scoreColor = "text-gray-600";
                    let scoreEmoji = "😐";
                    let scoreText = "Getting to know each other";
                    
                    if (compatibilityScore >= 70) {
                      scoreColor = "text-green-600";
                      scoreEmoji = "🎉";
                      scoreText = "Great match!";
                    } else if (compatibilityScore >= 50) {
                      scoreColor = "text-blue-600";
                      scoreEmoji = "😊";
                      scoreText = "Good compatibility";
                    } else if (compatibilityScore >= 30) {
                      scoreColor = "text-yellow-600";
                      scoreEmoji = "🤔";
                      scoreText = "Some common ground";
                    }
                    
                    return (
                      <div className="text-center">
                        <div className={`text-2xl font-bold ${scoreColor} mb-1`}>
                          {compatibilityScore}% {scoreEmoji}
                        </div>
                        <p className="text-sm text-purple-700">{scoreText}</p>
                        <p className="text-xs text-purple-600 mt-1">
                          {sharedCount} shared • {totalUserInterests} total interests
                        </p>
                      </div>
                    );
                  })()}
                </div>
              )}

              {/* Group Members Section */}
              {user.isGroup && user.members && (
                <div>
                  <h4 className="font-semibold text-gray-700 mb-3">Members</h4>
                  <div className="grid grid-cols-2 gap-2 max-h-40 overflow-auto">
                    {user.members.map((member) => (
                      <div
                        key={member._id}
                        className="flex items-center space-x-2 p-2 rounded-lg bg-gray-50 hover:bg-gray-100 transition-colors"
                      >
                        <img
                          src={member.profilePic || "/avatar.png"}
                          alt={member.fullName}
                          className="w-8 h-8 rounded-full object-cover"
                        />
                        <span className="text-sm text-gray-700 truncate">{member.fullName}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Action Buttons */}
              <div className="space-y-3">
                {user.isGroup ? (
                  <>
                    <button
                      className="w-full py-3 px-4 bg-blue-500 hover:bg-blue-600 text-white rounded-lg font-medium transition-colors"
                      onClick={() => setShowGroupModal(true)}
                    >
                      Add Member
                    </button>
                    <button
                      className="w-full py-3 px-4 bg-red-100 hover:bg-red-200 text-red-700 rounded-lg font-medium transition-colors"
                      onClick={async () => {
                        try {
                          const token = localStorage.getItem("token");
                          const res = await fetch(`/api/group/remove-member/${user._id}`, {
                            method: "POST",
                            headers: {
                              Authorization: `Bearer ${token}`,
                            },
                          });
                          const data = await res.json();
                          if (res.ok) {
                            alert(data.message || "You have left the group");
                            onClose();
                          } else {
                            alert(data.message || "Failed to leave group");
                          }
                        } catch (err) {
                          console.error("Leave group error:", err);
                          alert("Error leaving group");
                        }
                      }}
                    >
                      Leave Group
                    </button>
                    <button
                      className="w-full py-3 px-4 bg-yellow-100 hover:bg-yellow-200 text-yellow-700 rounded-lg font-medium transition-colors"
                      onClick={async () => {
                        try {
                          const token = localStorage.getItem("token");
                          const res = await fetch(`/api/report/group/${user._id}`, {
                            method: "POST",
                            headers: {
                              Authorization: `Bearer ${token}`,
                            },
                          });
                          const data = await res.json();
                          if (res.ok) {
                            toast.success(data.message || "Group reported successfully");
                            onClose();
                          } else {
                            toast.error(data.message || "Failed to report group");
                          }
                        } catch (err) {
                          console.error("Report group error:", err);
                          toast.error("Error reporting group");
                        }
                      }}
                      aria-label="Report group"
                    >
                      Report Group
                    </button>
                  </>
                ) : (
                  <>
                    <button
                      className="w-full py-3 px-4 bg-blue-500 hover:bg-blue-600 text-white rounded-lg font-medium transition-colors"
                      onClick={() => setShowGroupModal(true)}
                    >
                      Create Group Chat
                    </button>
                    <button
                      className="w-full py-3 px-4 bg-orange-100 hover:bg-orange-200 text-orange-700 rounded-lg font-medium transition-colors"
                      onClick={async () => {
                        try {
                          const token = localStorage.getItem("token");
                          const res = await fetch(`/api/user/friends/unfriend/${user._id}`, {
                            method: "DELETE",
                            headers: {
                              Authorization: `Bearer ${token}`,
                            },
                          });
                          const data = await res.json();
                          if (res.ok) {
                            toast.success(data.message || "User unfriended successfully");
                            onClose();
                          } else {
                            toast.error(data.message || "Failed to unfriend user");
                          }
                        } catch (err) {
                          console.error("Unfriend error:", err);
                          toast.error("Error unfriending user");
                        }
                      }}
                      disabled={reportLoading}
                    >
                      Unfriend
                    </button>
                    <button
                      className="w-full py-3 px-4 bg-red-100 hover:bg-red-200 text-red-700 rounded-lg font-medium transition-colors"
                      onClick={async () => {
                        setReportLoading(true);
                        try {
                          const token = localStorage.getItem("token");
                          const res = await fetch(`/api/report/user/${user._id}`, {
                            method: "POST",
                            headers: {
                              Authorization: `Bearer ${token}`,
                            },
                          });
                          const data = await res.json();
                          if (res.ok) {
                            toast.success(data.message || "User reported successfully");
                            onClose();
                          } else {
                            toast.error(data.message || "Failed to report user");
                          }
                        } catch (err) {
                          console.error("Report user error:", err);
                          toast.error("Error reporting user");
                        } finally {
                          setReportLoading(false);
                        }
                      }}
                      disabled={reportLoading}
                      aria-label="Report user"
                    >
                      {reportLoading ? "Reporting..." : "Report User"}
                    </button>
                  </>
                )}
              </div>
            </div>

            {/* Sentiment Analysis Section */}
            <div className="lg:w-80 border-l border-gray-200 p-6 bg-gray-50">
              <h4 className="text-lg font-semibold text-gray-800 mb-4">Conversation Analysis</h4>
              
              {/* Sentiment Chart */}
              <div className="bg-white rounded-xl p-4 shadow-sm mb-4">
                <div className="w-40 h-40 mx-auto mb-4">
                  <Pie
                    data={{
                      labels: ["Positive", "Neutral", "Negative"],
                      datasets: [
                        {
                          data: [
                            sentimentStats.positive || 0,
                            sentimentStats.neutral || 0,
                            sentimentStats.negative || 0
                          ],
                          backgroundColor: [
                            "rgba(34, 197, 94, 0.8)",
                            "rgba(156, 163, 175, 0.8)",
                            "rgba(239, 68, 68, 0.8)"
                          ],
                          borderColor: [
                            "rgba(34, 197, 94, 1)",
                            "rgba(156, 163, 175, 1)",
                            "rgba(239, 68, 68, 1)"
                          ],
                          borderWidth: 2,
                        },
                      ],
                    }}
                    options={{
                      responsive: true,
                      maintainAspectRatio: false,
                      plugins: {
                        legend: {
                          display: false,
                        },
                      },
                    }}
                  />
                </div>
                
                {/* Sentiment Legend */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                      <span className="text-sm text-gray-600">Positive</span>
                    </div>
                    <span className="text-sm font-medium text-gray-800">{sentimentStats.positive || 0}%</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <div className="w-3 h-3 bg-gray-400 rounded-full"></div>
                      <span className="text-sm text-gray-600">Neutral</span>
                    </div>
                    <span className="text-sm font-medium text-gray-800">{sentimentStats.neutral || 0}%</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <div className="w-3 h-3 bg-red-500 rounded-full"></div>
                      <span className="text-sm text-gray-600">Negative</span>
                    </div>
                    <span className="text-sm font-medium text-gray-800">{sentimentStats.negative || 0}%</span>
                  </div>
                </div>
              </div>

              {/* Conversation Insights */}
              <div className="bg-white rounded-xl p-4 shadow-sm">
                <h5 className="font-semibold text-gray-800 mb-2">Conversation Insights</h5>
                <div className="text-center">
                  <p className="text-lg font-medium text-gray-800 mb-1">{sentimentMessage.text}</p>
                  <p className="text-sm text-gray-600 mb-3">{sentimentMessage.subtext}</p>
                </div>
                
                {sentimentStats.insights && (
                  <div className="space-y-2 pt-3 border-t border-gray-100">
                    <div className="flex justify-between text-xs">
                      <span className="text-gray-500">Recent Trend:</span>
                      <span className={`font-medium ${
                        sentimentStats.insights.recentTrend === 'improving' ? 'text-green-600' :
                        sentimentStats.insights.recentTrend === 'declining' ? 'text-red-600' :
                        'text-gray-600'
                      }`}>
                        {sentimentStats.insights.recentTrend === 'improving' ? '📈 Improving' :
                         sentimentStats.insights.recentTrend === 'declining' ? '📉 Declining' :
                         '➡️ Stable'}
                      </span>
                    </div>
                    <div className="flex justify-between text-xs">
                      <span className="text-gray-500">Balance:</span>
                      <span className={`font-medium ${
                        sentimentStats.insights.reciprocityBalance === 'positive-mutual' ? 'text-green-600' :
                        sentimentStats.insights.reciprocityBalance === 'positive-leaning' ? 'text-green-600' :
                        sentimentStats.insights.reciprocityBalance === 'negative-mutual' ? 'text-red-600' :
                        sentimentStats.insights.reciprocityBalance === 'negative-leaning' ? 'text-red-600' :
                        sentimentStats.insights.reciprocityBalance === 'balanced' ? 'text-blue-600' :
                        'text-yellow-600'
                      }`}>
                        {sentimentStats.insights.reciprocityBalance === 'positive-mutual' ? '🤝 Mutual Positivity' :
                         sentimentStats.insights.reciprocityBalance === 'positive-leaning' ? '😊 Positive Leaning' :
                         sentimentStats.insights.reciprocityBalance === 'negative-mutual' ? '😔 Mutual Negativity' :
                         sentimentStats.insights.reciprocityBalance === 'negative-leaning' ? '😟 Negative Leaning' :
                         sentimentStats.insights.reciprocityBalance === 'balanced' ? '⚖️ Balanced' :
                         '⚠️ Imbalanced'}
                      </span>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Group creation modal */}
      {showGroupModal && (
        user.isGroup ? (
          <GroupCreationModal
            initialMembers={user.members}
            onClose={() => setShowGroupModal(false)}
            onGroupCreated={onGroupCreated}
            showGroupNameInput={false}
            group={user}
          />
        ) : (
          <GroupCreationModal
            initialMembers={[user]}
            onClose={() => setShowGroupModal(false)}
            onGroupCreated={onGroupCreated}
          />
        )
      )}
    </>
  );
};

export default UserDetailsPage;