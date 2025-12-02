import { useState, useEffect } from "react";
import { toast } from "react-hot-toast";
import { Pie } from 'react-chartjs-2';
import { Chart as ChartJS, ArcElement, Tooltip, Legend } from 'chart.js';
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
      if (showGroupNameInput) {
        // Create new group
        res = await fetch("/api/group", {
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
      } else {
        // Add users to existing group
        const groupId = group?._id;
        res = await fetch(`/api/group/add-members/${groupId}`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            members: selectedFriends,
          }),
        });
      }

      const data = await res.json();
      if (res.ok) {
        alert(showGroupNameInput ? "Group created successfully!" : "Members added successfully!");
        onGroupCreated(data);
        onClose();
      } else {
        alert(data.message || (showGroupNameInput ? "Failed to create group" : "Failed to add members"));
      }
    } catch (err) {
      console.error(showGroupNameInput ? "Error creating group" : "Error adding members", err);
      alert(showGroupNameInput ? "Error creating group" : "Error adding members");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="fixed inset-0 flex items-center justify-center z-50 backdrop-blur-sm"
      style={{
        backgroundColor: "rgba(255, 242, 224, 0.4)",
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
            className="btn btn-md rounded-md px-5 py-2"
            style={{
              color: "#898AC4",
              background: "#C0C9EE",
              border: "1px solid #C0C9EE"
            }}
            onClick={onClose}
            disabled={loading}
            aria-label="Cancel group creation"
          >
            Cancel
          </button>
          <button
            className="btn btn-md rounded-md px-5 py-2"
            style={{
              backgroundColor: "#898AC4",
              color: "#FFF2E0",
              border: "1px solid #898AC4"
            }}
            onMouseOver={e => (e.currentTarget.style.backgroundColor = "#A2AADB")}
            onMouseOut={e => (e.currentTarget.style.backgroundColor = "#898AC4")}
            onClick={createGroup}
            disabled={loading}
            aria-label={showGroupNameInput ? "Create group chat" : "Add members to group"}
          >
            {loading
              ? (showGroupNameInput ? "Creating..." : "Adding...")
              : (showGroupNameInput ? "Create" : "Add")}
          </button>
        </div>
      </div>
    </div>
  );
};

const UserDetailsPage = ({ user, onClose, onGroupCreated, sentimentStats = {} }) => {
  const [showGroupModal, setShowGroupModal] = useState(false);
  const [reportLoading, setReportLoading] = useState(false);

  if (!user) return null;

  // Pick all interests or empty array fallback
  const interests = user.interests || [];

  return (
    <>
      <div
        className="fixed inset-0 flex items-center justify-center h-screen w-screen z-50 backdrop-blur-sm px-4"
        style={{
          backgroundColor: "rgba(0, 0, 0, 0.4)",
          backdropFilter: "blur(3px)"
        }}
      >
        <div
          className="max-w-3xl w-full rounded-xl shadow-2xl p-4 flex flex-col lg:flex-row gap-6"
          style={{ backgroundColor: "#000000", border: "1px solid #B6B09F" }}
        >
          {/* User Info Section */}
          <div className="flex-1">
            <h2 className="text-xl font-semibold mb-5" style={{ color: "#898AC4" }}>User Info</h2>
            <div className="space-y-4">
              <img
                src={user.profilePic || "/avatar.png"}
                alt="User"
                className="w-28 h-28 rounded-full object-cover shadow-lg mx-auto"
                style={{ border: "4px solid #C0C9EE" }}
              />
              <p className="text-lg font-semibold text-center" style={{ color: "#898AC4" }}>{user.fullName}</p>

              {/* Interests Section */}
              {interests.length > 0 && (
                <div className="mt-4">
                  <h4 className="font-semibold mb-2" style={{ color: "#898AC4" }}>Interests:</h4>
                  <div className="flex justify-center space-x-3 flex-wrap">
                    {interests.map((interest, index) => (
                      <span
                        key={index}
                        className="inline-block rounded-full px-3 py-1 text-sm font-semibold mr-2 mb-2 select-none"
                        style={{
                          background: "#C0C9EE",
                          color: "#898AC4"
                        }}
                      >
                        {interest}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Buttons and other user info */}
              {user.isGroup && user.members && (
                <div className="mt-4">
                  <h4 className="font-semibold mb-3" style={{ color: "#898AC4" }}>Members:</h4>
                  <div className="flex flex-wrap max-h-36 overflow-auto pr-2 scrollbar-thin">
                    {user.members.map((member) => (
                      <span
                        key={member._id}
                        className="inline-block rounded-full px-3 py-1 text-sm font-semibold mr-2 mb-2 select-none"
                        style={{
                          background: "#C0C9EE",
                          color: "#898AC4"
                        }}
                      >
                        {member.fullName}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {user.isGroup ? (
                <>
                  <button
                    className="btn w-full mt-5 rounded-md"
                    style={{
                      backgroundColor: "#898AC4",
                      color: "#FFF2E0",
                      border: "1px solid #898AC4"
                    }}
                    onMouseOver={e => (e.currentTarget.style.backgroundColor = "#A2AADB")}
                    onMouseOut={e => (e.currentTarget.style.backgroundColor = "#898AC4")}
                    onClick={() => setShowGroupModal(true)}
                  >
                    Add Member
                  </button>
                  <button
                    className="btn w-full mt-3 rounded-md"
                    style={{
                      backgroundColor: "#F6CFCF",
                      color: "#898AC4",
                      border: "1px solid #F6CFCF"
                    }}
                    onMouseOver={e => (e.currentTarget.style.backgroundColor = "#E1B6B6")}
                    onMouseOut={e => (e.currentTarget.style.backgroundColor = "#F6CFCF")}
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
                    className="btn w-full mt-3 rounded-md"
                    style={{
                      backgroundColor: "#FFF3B0",
                      color: "#898AC4",
                      border: "1px solid #FFF3B0"
                    }}
                    onMouseOver={e => (e.currentTarget.style.backgroundColor = "#F8E7A0")}
                    onMouseOut={e => (e.currentTarget.style.backgroundColor = "#FFF3B0")}
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
                    className="btn w-full mt-5 rounded-md"
                    style={{
                      backgroundColor: "#898AC4",
                      color: "#FFF2E0",
                      border: "1px solid #898AC4"
                    }}
                    onMouseOver={e => (e.currentTarget.style.backgroundColor = "#A2AADB")}
                    onMouseOut={e => (e.currentTarget.style.backgroundColor = "#898AC4")}
                    onClick={() => setShowGroupModal(true)}
                    disabled={reportLoading}
                  >
                    Create Group Chat
                  </button>
                  <button
                    className="btn w-full mt-3 rounded-md"
                    style={{
                      backgroundColor: "#F6CFCF",
                      color: "#898AC4",
                      border: "1px solid #F6CFCF"
                    }}
                    onMouseOver={e => (e.currentTarget.style.backgroundColor = "#E1B6B6")}
                    onMouseOut={e => (e.currentTarget.style.backgroundColor = "#F6CFCF")}
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
                          toast.success(data.message || "User unfriended");
                          onClose();
                        } else {
                          toast.error(data.message || "Failed to unfriend");
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
                    className="btn w-full mt-3 rounded-md"
                    style={{
                      backgroundColor: "#FFF3B0",
                      color: "#898AC4",
                      border: "1px solid #FFF3B0"
                    }}
                    onMouseOver={e => (e.currentTarget.style.backgroundColor = "#F8E7A0")}
                    onMouseOut={e => (e.currentTarget.style.backgroundColor = "#FFF3B0")}
                    onClick={async () => {
                      if (reportLoading) return;
                      try {
                        setReportLoading(true);
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

          {/* Sentiment Pie Chart Section */}
          <div className="w-full lg:w-80">
            <div className="flex justify-between items-center mb-4">
              <h4 className="text-lg font-semibold ml-12" style={{ color: "#898AC4" }}>
                Conversation Sentiment
              </h4>
              <button
                onClick={onClose}
                className="btn btn-sm btn-ghost transition rounded-full"
                style={{
                  color: "#A2AADB",
                  background: "transparent"
                }}
                onMouseOver={e => (e.currentTarget.style.color = "#898AC4")}
                onMouseOut={e => (e.currentTarget.style.color = "#A2AADB")}
                aria-label="Close user info"
              >
                ✕
              </button>
            </div>
            <div className="w-full max-w-[180px] mx-auto">
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
                      backgroundColor: ["#bbf7d0", "#e5e7eb", "#fecaca"],
                      borderColor: ["#15803d", "#374151", "#b91c1c"],
                      borderWidth: 1,
                    },
                  ],
                }}
                options={{
                  responsive: true,
                  plugins: {
                    legend: {
                      display: false,
                    },
                  },
                }}
              />
              <div className="mt-4 text-xs text-center" style={{ color: "#A2AADB" }}>
                {/* First row: Positive and Neutral */}
                <div className="flex justify-center items-center gap-2 text-[10px] mb-2">
                  <span className="inline-flex whitespace-nowrap items-center gap-1 px-3 py-1.5 rounded-full font-medium" style={{ background: "#bbf7d0", color: "#15803d" }}>
                    <span className="text-base leading-none">🤗</span>
                    <span className="leading-none">Positive: {sentimentStats.positive || 0}%</span>
                  </span>
                  <span className="inline-flex whitespace-nowrap items-center gap-1 px-3 py-1.5 rounded-full font-medium" style={{ background: "#e5e7eb", color: "#374151" }}>
                    <span className="text-base leading-none">😐</span>
                    <span className="leading-none">Neutral: {sentimentStats.neutral || 0}%</span>
                  </span>
                </div>

                {/* Second row: Negative */}
                <div className="flex justify-center items-center text-[10px]">
                  <span className="inline-flex whitespace-nowrap items-center gap-1 px-3 py-1.5 rounded-full font-medium" style={{ background: "#fecaca", color: "#b91c1c" }}>
                    <span className="text-base leading-none">☹️</span>
                    <span className="leading-none">Negative: {sentimentStats.negative || 0}%</span>
                  </span>
                </div>
              </div>
              <p className="font-semibold mt-6 text-sm animate-pulse mx-auto text-center max-w-[180px]" style={{ color: "#898AC4" }}>
                {sentimentStats.negative > sentimentStats.positive && sentimentStats.negative > sentimentStats.neutral
                  ? "You can do better 😟"
                  : sentimentStats.neutral > sentimentStats.positive && sentimentStats.neutral > sentimentStats.negative
                  ? "You are Almost there 😐"
                  : "Your conversation is going Good 😊"}
              </p>
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