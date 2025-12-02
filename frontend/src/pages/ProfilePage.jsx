import { useState, useEffect } from "react";
import { useAuthStore } from "../store/useAuthStore";
import { useChatStore } from "../store/useChatStore";
import { useNavigate } from "react-router-dom";
import { Camera, Mail, User, Users, MessageCircle } from "lucide-react";
import { useThemeStore } from "../store/useThemeStore";
import { toast } from "react-hot-toast";
import { axiosInstance } from "../lib/axios";

const ProfilePage = () => {
  const { authUser, isUpdatingProfile, updateProfile } = useAuthStore();
  const { setSelectedUser } = useChatStore();
  const navigate = useNavigate();
  const [selectedImg, setSelectedImg] = useState(null);
  const [friends, setFriends] = useState([]);
  const [groups, setGroups] = useState([]);
  const [allGroups, setAllGroups] = useState([]);
  const [loading, setLoading] = useState(true);
  const { theme } = useThemeStore();

  // Fetch friends and groups data
  useEffect(() => {
    const fetchUserData = async () => {
      setLoading(true);
      try {
        // Fetch friends
        const friendsRes = await axiosInstance.get("/user/friends");
        console.log("Friends data:", friendsRes.data);
        setFriends(friendsRes.data.slice(0, 3));

        // Fetch groups
        const groupsRes = await axiosInstance.get("/group");
        console.log("Groups data:", groupsRes.data);
        setAllGroups(groupsRes.data);
        setGroups(groupsRes.data.slice(0, 3));
      } catch (error) {
        console.error("Error fetching user data:", error);
        if (error.response) {
          console.error("Error response:", error.response.data);
        }
      } finally {
        setLoading(false);
      }
    };

    if (authUser) {
      fetchUserData();
    }
  }, [authUser]);

  const handleImageUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const formData = new FormData();
    formData.append("file", file);
    formData.append("upload_preset", "frontend_upload");

    try {
      const response = await fetch(
        "https://api.cloudinary.com/v1_1/doc4f27bu/upload",
        {
          method: "POST",
          body: formData,
        }
      );

      const data = await response.json();

      if (data.secure_url) {
        await updateProfile({ profilePic: data.secure_url });
        setSelectedImg(data.secure_url);
        // ❌ REMOVED: toast.success("✅ Profile updated successfully!");
        // The toast is already shown by updateProfile in the store
      } else {
        throw new Error("Cloudinary upload failed");
      }
    } catch (error) {
      console.error("Upload error:", error);
      toast.error("❌ Image upload failed. Please try again.");
    }
  };

  const handleFriendClick = (friend) => {
    setSelectedUser(friend);
    navigate("/");
  };

  const handleGroupClick = (group) => {
    setSelectedUser({
      _id: group._id,
      fullName: group.name,
      isGroup: true,
      members: group.members,
    });
    navigate("/");
  };

  if (!authUser) return null;

  const interests = authUser.interests || [];

  return (
    <div className="min-h-screen pt-16 px-4 bg-base-100" data-theme={theme}>
      <div className="max-w-5xl mx-auto">
        {/* Main Profile Card */}
        <div className="bg-base-200 backdrop-blur-lg mt-10 rounded-3xl border border-base-300 overflow-hidden shadow-xl">
          {/* Header with Profile */}
          <div className="bg-base-300 px-6 py-6 border-b border-base-300">
            <div className="flex flex-col lg:flex-row items-center lg:items-start gap-4">
              <div className="relative group">
                <img
                  src={selectedImg || authUser.profilePic || "/avatar.png"}
                  alt="Profile"
                  className="w-24 h-24 rounded-full object-cover border-4 border-base-100 shadow-xl group-hover:scale-105 transition-transform duration-300"
                />
                <label
                  htmlFor="avatar-upload"
                  className={`
                    absolute bottom-1 right-1 
                    bg-primary hover:bg-primary-focus hover:scale-110
                    p-2 rounded-full cursor-pointer 
                    transition-all duration-300 shadow-lg
                    ${isUpdatingProfile ? "animate-pulse pointer-events-none" : ""}
                  `}
                >
                  <Camera className="w-4 h-4 text-white" />
                  <input
                    type="file"
                    id="avatar-upload"
                    className="hidden"
                    accept="image/*"
                    onChange={handleImageUpload}
                    disabled={isUpdatingProfile}
                  />
                </label>
              </div>
              
              <div className="flex-1 text-center lg:text-left">
                <h1 className="text-3xl font-bold text-base-content mb-2">{authUser.fullName}</h1>
                <p className="text-base text-base-content/70 mb-3 flex items-center gap-2 justify-center lg:justify-start">
                  <Mail className="w-4 h-4" />
                  {authUser.email}
                </p>
                <div className="flex items-center gap-6 justify-center lg:justify-start">
                  <div className="text-center">
                    <div className="text-xl font-bold text-primary">{loading ? "..." : friends.length}</div>
                    <div className="text-xs text-base-content/60">Friends</div>
                  </div>
                  <div className="text-center">
                    <div className="text-xl font-bold text-secondary">{loading ? "..." : allGroups.length}</div>
                    <div className="text-xs text-base-content/60">Groups</div>
                  </div>
                  <div className="text-center">
                    <div className="text-xl font-bold text-accent">{interests.length}</div>
                    <div className="text-xs text-base-content/60">Interests</div>
                  </div>
                </div>
                {isUpdatingProfile && (
                  <p className="text-sm text-primary mt-2 font-medium">📸 Uploading new photo...</p>
                )}
              </div>
            </div>
          </div>

          {/* Content Grid */}
          <div className="p-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
              
              {/* Left Column - Personal Info & Interests */}
              <div className="space-y-6 h-full">
                
                {/* Account Information Card */}
                <div className="bg-base-300 rounded-3xl p-5 border border-base-content/10 h-60 flex flex-col">
                  <h3 className="text-lg font-bold text-base-content mb-4 flex items-center gap-2">
                    <User className="w-5 h-5" />
                    Account Information
                  </h3>
                  <div className="space-y-3 flex-1">
                    <div className="flex items-center justify-between py-2 border-b border-base-content/20">
                      <span className="text-base-content/80 font-medium text-sm">Member Since</span>
                      <span className="text-base-content font-semibold text-sm">
                        {authUser.createdAt ? (
                          new Date(authUser.createdAt).toLocaleDateString('en-US', {
                            year: 'numeric',
                            month: 'short',
                            day: 'numeric'
                          })
                        ) : (
                          'N/A'
                        )}
                      </span>
                    </div>
                    <div className="flex items-center justify-between py-2 border-b border-base-content/20">
                      <span className="text-base-content/80 font-medium text-sm">Account Status</span>
                      <span className="bg-success/20 text-success px-2 py-1 rounded-full text-xs font-semibold">
                        ✅ Active
                      </span>
                    </div>
                  </div>
                </div>

                {/* Interests Section */}
                {interests.length > 0 ? (
                  <div className="bg-primary/10 rounded-3xl p-5 border border-primary/20 h-60 flex flex-col">
                    <h3 className="text-lg font-bold text-primary mb-3 flex items-center gap-2">
                      ❤️ My Interests
                      <span className="bg-primary/20 text-primary text-xs px-2 py-1 rounded-full">
                        {interests.length}
                      </span>
                    </h3>
                    <div className="flex flex-wrap gap-2 flex-1 overflow-y-auto">
                      {interests.map((interest, index) => (
                        <span
                          key={index}
                          className="px-3 py-1 bg-primary/20 hover:bg-primary/30 text-primary rounded-full font-medium border border-primary/30 transition-colors cursor-default h-fit text-sm"
                        >
                          {interest}
                        </span>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div className="bg-base-300 rounded-3xl p-5 border border-base-content/10 h-60 flex flex-col justify-center">
                    <h3 className="text-lg font-bold text-base-content/70 mb-2">✨ Add Your Interests</h3>
                    <p className="text-base-content/60 text-sm">
                      Share your interests to connect with like-minded people! 
                      You can add interests through your profile settings.
                    </p>
                  </div>
                )}
              </div>

              {/* Right Column - Friends & Groups */}
              <div className="space-y-6 h-full">
                
                {/* Top Friends Section */}
                {friends.length > 0 ? (
                  <div className="bg-secondary/10 rounded-3xl p-5 border border-secondary/20 h-60 flex flex-col">
                    <h3 className="text-lg font-bold text-secondary mb-3 flex items-center gap-2">
                      👥 Top Friends
                      <span className="bg-secondary/20 text-secondary text-xs px-2 py-1 rounded-full">
                        {friends.length}
                      </span>
                    </h3>
                    <div className="space-y-2 overflow-y-auto flex-1">
                      {friends.map((friend) => (
                        <div 
                          key={friend._id} 
                          className="flex items-center gap-3 p-2 bg-secondary/10 hover:bg-secondary/20 rounded-xl transition-colors cursor-pointer transform hover:scale-105"
                          onClick={() => handleFriendClick(friend)}
                        >
                          <img
                            src={friend.profilePic || "/avatar.png"}
                            alt={friend.fullName}
                            className="w-8 h-8 rounded-full object-cover border-2 border-secondary/30 flex-shrink-0"
                          />
                          <div className="flex-1 min-w-0">
                            <h4 className="font-semibold text-secondary truncate text-sm">{friend.fullName}</h4>
                            <p className="text-xs text-secondary/70">Friend • Click to chat</p>
                          </div>
                          <MessageCircle className="w-4 h-4 text-secondary flex-shrink-0" />
                        </div>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div className="bg-base-300 rounded-3xl p-5 border border-base-content/10 h-60 flex flex-col justify-center">
                    <h3 className="text-lg font-bold text-base-content/70 mb-2">👥 Make New Friends</h3>
                    <p className="text-base-content/60 text-sm">
                      Start chatting and making connections! Your top friends will appear here.
                    </p>
                  </div>
                )}

                {/* Top Groups Section */}
                {groups.length > 0 ? (
                  <div className="bg-accent/10 rounded-3xl p-5 border border-accent/20 h-60 flex flex-col">
                    <h3 className="text-lg font-bold text-accent mb-3 flex items-center gap-2">
                      🏘️ My Groups
                      <span className="bg-accent/20 text-accent text-xs px-2 py-1 rounded-full">
                        {allGroups.length} total
                      </span>
                    </h3>
                    <div className="space-y-2 overflow-y-auto flex-1">
                      {groups.map((group) => (
                        <div 
                          key={group._id} 
                          className="flex items-center gap-3 p-2 bg-accent/10 hover:bg-accent/20 rounded-xl transition-colors cursor-pointer transform hover:scale-105"
                          onClick={() => handleGroupClick(group)}
                        >
                          <div className="w-8 h-8 rounded-full flex items-center justify-center border-2 border-accent/40 flex-shrink-0 overflow-hidden">
                            {group.profilePic ? (
                              <img 
                                src={group.profilePic} 
                                alt={group.name}
                                className="w-full h-full object-cover"
                              />
                            ) : (
                              <div className="w-full h-full bg-accent/30 flex items-center justify-center">
                                <Users className="w-4 h-4 text-accent" />
                              </div>
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <h4 className="font-semibold text-accent truncate text-sm">{group.name}</h4>
                            <p className="text-xs text-accent/70">
                              {group.members?.length || 0} members • Click to chat
                            </p>
                          </div>
                          <MessageCircle className="w-4 h-4 text-accent flex-shrink-0" />
                        </div>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div className="bg-base-300 rounded-3xl p-5 border border-base-content/10 h-60 flex flex-col justify-center">
                    <h3 className="text-lg font-bold text-base-content/70 mb-2">🏘️ Join Groups</h3>
                    <p className="text-base-content/60 text-sm">
                      Create or join groups to chat with multiple friends at once! Your groups will appear here.
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProfilePage;
