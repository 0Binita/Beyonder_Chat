import { useState, useEffect } from "react";
import { UserPlus, Check, X, Loader2, Users, Send, Star, Bell } from "lucide-react";
import { useAuthStore } from "../store/useAuthStore";
import { useThemeStore } from "../store/useThemeStore";
import { axiosInstance } from "../lib/axios";
import toast from "react-hot-toast";

const NotificationsPage = () => {
  const { authUser, setFriends, friendRequests, setFriendRequests, socket } = useAuthStore();
  const { theme } = useThemeStore();
  const [recommendedFriends, setRecommendedFriends] = useState([]);
  const [loadingRequests, setLoadingRequests] = useState(false);
  const [loadingRecommended, setLoadingRecommended] = useState(false);
  const [requestedUsers, setRequestedUsers] = useState([]);
  const [sentRequests, setSentRequests] = useState([]);

  // Derived request lists from the store's friend requests
  const incomingRequests = friendRequests.filter((req) => req.direction === "incoming");
  const outgoingRequests = friendRequests.filter((req) => req.direction === "outgoing");

  useEffect(() => {
    const fetchFriendRequests = async () => {
      setLoadingRequests(true);
      try {
        const res = await axiosInstance.get("/user/friend-requests");
        const pending = res.data.filter((req) => req.status === "pending");
        
        // Update the store's friend requests
        setFriendRequests(pending);

        // Populate outgoing requests for the local component state
        const outgoing = pending.filter((req) => req.direction === "outgoing");
        setRequestedUsers(outgoing.map((r) => r._id));
        setSentRequests(outgoing.map((r) => ({ userId: r._id, requestId: r._id })));
      } catch (error) {
        const msg = error.response?.data?.message || "Failed to load friend requests";
        if (!error.response || error.response.status !== 404) {
          toast.error(msg);
        }
      } finally {
        setLoadingRequests(false);
      }
    };

    const fetchRecommendedFriends = async () => {
      setLoadingRecommended(true);
      try {
        const res = await axiosInstance.get("/user/recommend-friends");
        setRecommendedFriends(res.data);
      } catch (error) {
        const msg = error.response?.data?.message || "Failed to load recommended friends";
        toast.error(msg);
      } finally {
        setLoadingRecommended(false);
      }
    };

    fetchFriendRequests();
    fetchRecommendedFriends();
  }, [setFriendRequests]);

  // Sync local state when friend requests change via socket
  useEffect(() => {
    const outgoing = friendRequests.filter((req) => req.direction === "outgoing");
    setRequestedUsers(outgoing.map((r) => r._id));
    setSentRequests(outgoing.map((r) => ({ userId: r._id, requestId: r._id })));
  }, [friendRequests]);

  // Helper function to refresh recommended friends
  const refreshRecommendedFriends = async () => {
    try {
      const res = await axiosInstance.get("/user/recommend-friends");
      setRecommendedFriends(res.data);
    } catch (error) {
      console.error("Error refreshing recommended friends:", error);
    }
  };

  // Real-time socket listeners for notifications
  useEffect(() => {
    if (!socket) return;

    // When friend request is received - remove sender from recommendations
    const handleFriendRequestReceived = (friendRequest) => {
      // Remove this user from recommended friends if they're there
      setRecommendedFriends((prev) =>
        prev.filter((friend) => friend._id !== friendRequest.sender._id)
      );
    };

    // Listen for socket events
    socket.on("friendRequestReceived", handleFriendRequestReceived);

    return () => {
      socket.off("friendRequestReceived", handleFriendRequestReceived);
    };
  }, [socket]);

  const handleAccept = async (requestId) => {
    try {
      await axiosInstance.post(`/user/friend-requests/${requestId}/accept`);
      toast.success("Friend request accepted");
      
      // The socket will handle updating the store automatically
      // We just need to update local component state for requested users
      const request = friendRequests.find(req => req._id === requestId);
      if (request && request.direction === "outgoing") {
        setRequestedUsers((prev) => prev.filter((id) => id !== request._id));
        setSentRequests((prev) => prev.filter((req) => req.requestId !== requestId));
      }

      // Refresh recommended friends as the accepted user should be removed
      try {
        const recommendedRes = await axiosInstance.get("/user/recommend-friends");
        setRecommendedFriends(recommendedRes.data);
      } catch (error) {
        console.error("Error refreshing recommended friends:", error);
      }
    } catch (error) {
      const msg = error.response?.data?.message || "Failed to accept friend request";
      toast.error(msg);
    }
  };

  const handleReject = async (requestId) => {
    try {
      await axiosInstance.post(`/user/friend-requests/${requestId}/reject`);
      toast.success("Friend request rejected");
      
      // The socket will handle updating the store automatically
      // No need to manually update friendRequests since the socket will handle it
    } catch (error) {
      const msg = error.response?.data?.message || "Failed to reject friend request";
      toast.error(msg);
    }
  };

  const handleSendFriendRequest = async (userId) => {
    try {
      const res = await axiosInstance.post(`/user/friend-requests/${userId}/send`);
      setRequestedUsers((prev) => [...prev, userId]);
      setSentRequests((prev) => [...prev, { userId, requestId: res.data._id }]);
      
      // ✅ Show toast here (only one place)
      toast.success("Friend request sent successfully!");
    } catch (error) {
      const msg = error.response?.data?.message || "Failed to send friend request";
      toast.error(msg);
    }
  };

  const handleCancelRequest = async (userId) => {
    try {
      const request = sentRequests.find((req) => req.userId === userId);
      if (!request) return;

      await axiosInstance.delete(`/user/friend-requests/${request.requestId}/cancel`);
      setRequestedUsers((prev) => prev.filter((id) => id !== userId));
      setSentRequests((prev) => prev.filter((req) => req.userId !== userId));
      
      // The socket will handle updating the store automatically
      toast.success("Friend request cancelled");
    } catch (error) {
      const msg = error.response?.data?.message || "Failed to cancel friend request";
      toast.error(msg);
    }
  };

  return (
    <div className={`min-h-screen pt-14 bg-base-100 ${theme === "dark" ? "dark" : ""}`}>
      <div className="max-w-[1600px] mx-auto p-6 py-8">
        {/* Header */}
        <div className="text-center mb-10">
          <div className="flex items-center justify-center gap-3 mb-2">
            <Bell className="w-8 h-8 text-primary" />
            <h1 className="text-3xl font-bold text-base-content">Notifications</h1>
          </div>
          <p className="text-base-content/70">Manage your friend requests and discover new connections</p>
        </div>

        {/* Cards Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          {/* Requests Received Card */}
          <div className="card bg-base-200 shadow-xl min-h-[650px]">
            <div className="card-body p-8">
              <div className="flex items-center gap-4 mb-6">
                <div className="p-3 rounded-xl">
                  <Users className="w-8 h-8 text-base-content/70" />
                </div>
                <div>
                  <h2 className="card-title text-xl text-base-content">Requests Received</h2>
                  <p className="text-base text-base-content/60">Incoming friend requests</p>
                </div>
              </div>

              {loadingRequests ? (
                <div className="flex justify-center py-12">
                  <Loader2 className="animate-spin w-10 h-10 text-base-content/70" />
                </div>
              ) : incomingRequests.length === 0 ? (
                <div className="text-center py-16">
                  <Users className="w-20 h-20 mx-auto mb-4 text-base-content/30" />
                  <p className="text-lg text-base-content/60">No incoming requests</p>
                </div>
              ) : (
                <div className="space-y-3 max-h-[450px] overflow-y-auto pr-2">
                  {incomingRequests.map((req) => (
                    <div
                      key={req._id}
                      className="flex items-center gap-3 p-3 bg-base-100 rounded-lg border border-base-300 hover:shadow-md transition-all duration-200"
                    >
                      <div className="avatar">
                        <div className="w-12 h-12 rounded-full">
                          <img
                            src={req.profilePic || '/avatar.png'}
                            alt={req.fullName}
                            className="w-full h-full object-cover"
                          />
                        </div>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-base-content truncate text-sm">{req.fullName}</p>
                        <p className="text-xs text-base-content/60 truncate">{req.email}</p>
                      </div>
                      <div className="flex flex-col gap-1">
                        <button
                          onClick={() => handleAccept(req._id)}
                          className="btn btn-xs btn-success gap-1 min-w-[70px]"
                          title="Accept"
                        >
                          <Check className="w-3 h-3" />
                          Accept
                        </button>
                        <button
                          onClick={() => handleReject(req._id)}
                          className="btn btn-xs btn-error gap-1 min-w-[70px]"
                          title="Reject"
                        >
                          <X className="w-3 h-3" />
                          Reject
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
              
              {incomingRequests.length > 0 && (
                <div className="mt-6 text-center">
                  <div className="text-base-content/70 font-semibold text-lg">
                    {incomingRequests.length} pending request{incomingRequests.length !== 1 ? 's' : ''}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Requests Sent Card */}
          <div className="card bg-base-200 shadow-xl min-h-[650px]">
            <div className="card-body p-8">
              <div className="flex items-center gap-4 mb-6">
                <div className="p-3 rounded-xl">
                  <Send className="w-8 h-8 text-base-content/70" />
                </div>
                <div>
                  <h2 className="card-title text-xl text-base-content">Requests Sent</h2>
                  <p className="text-base text-base-content/60">Outgoing friend requests</p>
                </div>
              </div>

              {loadingRequests ? (
                <div className="flex justify-center py-12">
                  <Loader2 className="animate-spin w-10 h-10 text-base-content/70" />
                </div>
              ) : outgoingRequests.length === 0 ? (
                <div className="text-center py-16">
                  <Send className="w-20 h-20 mx-auto mb-4 text-base-content/30" />
                  <p className="text-lg text-base-content/60">No outgoing requests</p>
                </div>
              ) : (
                <div className="space-y-3 max-h-[450px] overflow-y-auto pr-2">
                  {outgoingRequests.map((req) => (
                    <div
                      key={req._id}
                      className="flex items-center gap-3 p-3 bg-base-100 rounded-lg border border-base-300 hover:shadow-md transition-all duration-200"
                    >
                      <div className="avatar">
                        <div className="w-12 h-12 rounded-full">
                          <img
                            src={req.profilePic || '/avatar.png'}
                            alt={req.fullName}
                            className="w-full h-full object-cover"
                          />
                        </div>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-base-content truncate text-sm">{req.fullName}</p>
                        <p className="text-xs text-base-content/60 truncate">{req.email}</p>
                        <div className="border border-base-content/30 text-base-content/70 text-xs px-2 py-1 rounded-md mt-1 w-fit">Pending</div>
                      </div>
                      <button
                        onClick={() => handleCancelRequest(req._id)}
                        className="btn btn-xs btn-outline btn-base-300 gap-1 min-w-[70px] hover:btn-error"
                        title="Cancel Request"
                      >
                        <X className="w-3 h-3" />
                        Cancel
                      </button>
                    </div>
                  ))}
                </div>
              )}
              
              {outgoingRequests.length > 0 && (
                <div className="mt-6 text-center">
                  <div className="text-base-content/70 font-semibold text-lg">
                    {outgoingRequests.length} pending request{outgoingRequests.length !== 1 ? 's' : ''}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Recommended Friends Card */}
          <div className="card bg-base-200 shadow-xl min-h-[650px]">
            <div className="card-body p-8">
              <div className="flex items-center gap-4 mb-6">
                <div className="p-3 rounded-xl">
                  <Star className="w-8 h-8 text-primary" />
                </div>
                <div>
                  <h2 className="card-title text-xl text-base-content">Recommended Friends</h2>
                  <p className="text-base text-base-content/60">People you might know</p>
                </div>
              </div>

              {loadingRecommended ? (
                <div className="flex justify-center py-12">
                  <Loader2 className="animate-spin w-10 h-10 text-primary" />
                </div>
              ) : recommendedFriends.length === 0 ? (
                <div className="text-center py-16">
                  <Star className="w-20 h-20 mx-auto mb-4 text-base-content/30" />
                  <p className="text-lg text-base-content/60">No recommendations</p>
                </div>
              ) : (
                <div className="space-y-3 max-h-[450px] overflow-y-auto pr-2">
                  {recommendedFriends.map((user) => (
                    <div
                      key={user._id}
                      className="flex items-center gap-3 p-3 bg-base-100 rounded-lg border border-base-300 hover:shadow-md transition-all duration-200"
                    >
                      <div className="avatar">
                        <div className="w-12 h-12 rounded-full">
                          <img
                            src={user.profilePic || '/avatar.png'}
                            alt={user.fullName}
                            className="w-full h-full object-cover"
                          />
                        </div>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-base-content truncate text-sm">{user.fullName}</p>
                        <div className="flex items-center gap-2 mt-1">
                          <div className="border border-primary text-primary text-xs px-2 py-1 rounded-md w-fit">
                            {user.similarityPercentage || 0}% match
                          </div>
                        </div>
                      </div>
                      <button
                        onClick={() =>
                          requestedUsers.includes(user._id)
                            ? handleCancelRequest(user._id)
                            : handleSendFriendRequest(user._id)
                        }
                        className={`btn btn-xs gap-1 min-w-[70px] ${
                          requestedUsers.includes(user._id)
                            ? "btn-outline btn-warning"
                            : "btn-primary"
                        }`}
                        title={requestedUsers.includes(user._id) ? "Cancel Request" : "Send Request"}
                      >
                        <UserPlus className="w-3 h-3" />
                        {requestedUsers.includes(user._id) ? "Cancel" : "Add"}
                      </button>
                    </div>
                  ))}
                </div>
              )}
              
              {recommendedFriends.length > 0 && (
                <div className="mt-6 text-center">
                  <div className="text-primary font-semibold text-lg">
                    {recommendedFriends.length} recommendation{recommendedFriends.length !== 1 ? 's' : ''}
                  </div>
                </div>
              )}
            </div>
          </div>

        </div>
      </div>
    </div>
  );
};

export default NotificationsPage;
