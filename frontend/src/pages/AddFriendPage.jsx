import { useState, useEffect } from "react";
import { UserPlus, Search, CheckCircle } from "lucide-react";
import AuthImagePattern from "../components/AuthImagePattern";
import { useAuthStore } from "../store/useAuthStore";
import { axiosInstance } from "../lib/axios";
import toast from "react-hot-toast";
import { useNavigate } from "react-router-dom";

const AddFriendPage = () => {
  const { authUser } = useAuthStore();
  const navigate = useNavigate();
  const [relatedUsers, setRelatedUsers] = useState([]);
  const [search, setSearch] = useState("");
  const [requestedUsers, setRequestedUsers] = useState([]);
  const [sentRequests, setSentRequests] = useState([]);
  const [existingFriends, setExistingFriends] = useState([]);

  const [displayText, setDisplayText] = useState("");
  const [isDeleting, setIsDeleting] = useState(false);
  const [loopNum, setLoopNum] = useState(0);
  const [typingSpeed, setTypingSpeed] = useState(150);

  // Updated words array to include user's name and Beyonder
  const words = authUser?.fullName
    ? [`Welcome ${authUser.fullName}`, "Welcome to Beyonder"]
    : ["Welcome", "Welcome to Beyonder"];

  useEffect(() => {
    const handleTyping = () => {
      const i = loopNum % words.length;
      const fullText = words[i];

      setDisplayText(
        isDeleting
          ? fullText.substring(0, displayText.length - 1)
          : fullText.substring(0, displayText.length + 1)
      );

      setTypingSpeed(isDeleting ? 80 : 150);

      if (!isDeleting && displayText === fullText) {
        setTimeout(() => setIsDeleting(true), 1000);
      } else if (isDeleting && displayText === "") {
        setIsDeleting(false);
        setLoopNum(loopNum + 1);
      }
    };

    const timer = setTimeout(handleTyping, typingSpeed);
    return () => clearTimeout(timer);
  }, [displayText, isDeleting, loopNum]);

  useEffect(() => {
    const fetchRecommendedFriends = async () => {
      try {
        const res = await axiosInstance.get("/user/recommend-friends");
        console.log("Recommended friends:", res.data);
        setRelatedUsers(res.data);
      } catch (err) {
        toast.error("Failed to load recommended friends");
      }
    };

    const fetchOutgoingRequests = async () => {
      try {
        const res = await axiosInstance.get("/user/friend-requests");
        const outgoing = res.data.filter((req) => req.direction === "outgoing");
        const requestedUserIds = outgoing.map((req) =>
          req.direction === "outgoing" && req.receiver?._id ? req.receiver._id : null
        ).filter(Boolean);
        setRequestedUsers(requestedUserIds);
        setSentRequests(outgoing);
      } catch (err) {
        toast.error("Failed to load sent friend requests");
      }
    };

    const fetchFriends = async () => {
      try {
        const res = await axiosInstance.get("/user/friends");
        setExistingFriends(res.data.map((f) => f._id));
      } catch (err) {
        toast.error("Failed to load friend list");
      }
    };

    if (authUser?.interests?.length) {
      fetchRecommendedFriends();
    }
    fetchOutgoingRequests();
    fetchFriends();
  }, [authUser?.interests]);

  const handleAddFriend = async (userId) => {
    try {
      await axiosInstance.post(`/user/friend-requests/${userId}/send`);
      setRequestedUsers((prev) => [...prev, userId]);
      // ✅ Show toast here (only one place)
      toast.success("Friend request sent!");
    } catch {
      toast.error("Failed to send friend request");
    }
  };

  const handleContinue = () => {
    // Navigate to home page
    navigate("/", { replace: true });
  };

  return (
    <div className="min-h-screen grid mt-10 grid-cols-1 lg:grid-cols-2">
      {/* Left side - Add Friend Form */}
      <div className="flex flex-col justify-center items-center p-6 sm:p-12">
        <div className="w-full max-w-md space-y-8">
          <div className="text-center mb-8">
            <div className="flex flex-col items-center gap-2 group">
              <div
                className="size-12 rounded-xl bg-primary/10 flex items-center justify-center 
                group-hover:bg-primary/20 transition-colors"
              >
                <UserPlus className="size-6 text-primary" />
              </div>
              <h1 className="text-2xl font-bold min-h-[2rem] mt-2">
                <span
                  className={
                    loopNum % words.length === 0
                      ? "text-primary"
                      : "bg-gradient-to-r from-pink-500 to-purple-500 bg-clip-text text-transparent"
                  }
                >
                  {displayText}
                  <span className="border-r-2 border-primary animate-blink ml-1" />
                </span>
              </h1>
              <p className="text-base-content/60">Suggested users with similar interests</p>
            </div>
          </div>

          <div className="form-control mb-4">
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Search className="size-5 text-base-content/40" />
              </div>
              <input
                type="text"
                placeholder="Search by name..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="input input-bordered w-full pl-10"
              />
            </div>
          </div>

          <div className="space-y-4">
            {relatedUsers
              .filter((user) =>
                user.fullName.toLowerCase().includes(search.toLowerCase()) &&
                !requestedUsers.includes(user._id) &&
                !existingFriends.includes(user._id)
              )
              .map((user) => (
                <div
                  key={user._id}
                  className="flex items-center justify-between p-4 border rounded-lg bg-base-100"
                >
                  <div>
                    <h2 className="font-medium">{user.fullName}</h2>
                    <p className="text-sm text-base-content/60">
                      Interest Match: {user.similarityPercentage || 0}%
                    </p>
                    {/* <p className="text-sm text-base-content/60">{user.interests.join(", ")}</p> */}
                  </div>
                  <button
                    className={`btn btn-sm ${
                      requestedUsers.includes(user._id) ? "btn-disabled" : "btn-primary"
                    }`}
                    disabled={requestedUsers.includes(user._id)}
                    onClick={() => handleAddFriend(user._id)}
                  >
                    {requestedUsers.includes(user._id) ? "Requested" : "Add"}
                  </button>
                </div>
              ))}
            {relatedUsers.length === 0 && (
              <div className="text-center text-sm text-base-content/60">No recommended friends found.</div>
            )}
          </div>
          <div className="text-center mt-6">
            <button
              onClick={handleContinue}
              className="btn btn-primary w-full mt-6"
            >
              <CheckCircle className="size-5 mr-2" />
              Continue to Home
            </button>
          </div>
        </div>
      </div>

      {/* Right side - AuthImagePattern */}
      <AuthImagePattern
        title="Connect with like-minded people"
        subtitle="Send friend requests to those who share your passions."
      />
    </div>
  );
};

export default AddFriendPage;
