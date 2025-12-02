import { useState, useEffect } from "react";
import { X, RefreshCw, UserPlus, Heart, Sparkles, Users, TrendingUp } from "lucide-react";
import { axiosInstance } from "../lib/axios";
import toast from "react-hot-toast";

const FriendSuggestionPopup = ({ isOpen, onClose }) => {
  const [currentSuggestion, setCurrentSuggestion] = useState(null);
  const [allSuggestions, setAllSuggestions] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [loading, setLoading] = useState(false);
  const [requestSent, setRequestSent] = useState(false);

  // Fetch suggestions when popup opens
  useEffect(() => {
    if (isOpen) {
      fetchSuggestions();
      setRequestSent(false);
    }
  }, [isOpen]);

  // Update current suggestion when index changes
  useEffect(() => {
    if (allSuggestions.length > 0) {
      setCurrentSuggestion(allSuggestions[currentIndex]);
      // Check if request already sent to this user
      const suggestion = allSuggestions[currentIndex];
      setRequestSent(suggestion.friendRequestSent || false);
    }
  }, [currentIndex, allSuggestions]);

  const fetchSuggestions = async () => {
    setLoading(true);
    try {
      const response = await axiosInstance.get("/user/recommend-friends");
      setAllSuggestions(response.data);
      setCurrentIndex(0);
      if (response.data.length > 0) {
        setCurrentSuggestion(response.data[0]);
      } else {
        toast.error("No friend suggestions available at the moment");
      }
    } catch (error) {
      console.error("Error fetching suggestions:", error);
      toast.error("Failed to load friend suggestions");
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = () => {
    if (allSuggestions.length === 0) {
      fetchSuggestions();
      return;
    }
    
    // Move to next suggestion with animation
    const nextIndex = (currentIndex + 1) % allSuggestions.length;
    setCurrentIndex(nextIndex);
  };

  const handleSendFriendRequest = async () => {
    if (!currentSuggestion || requestSent) return;

    try {
      await axiosInstance.post(`/user/friend-requests/${currentSuggestion._id}/send`);
      
      // Update the suggestions array to mark this user as having received a request
      const updatedSuggestions = allSuggestions.map((suggestion, index) => {
        if (index === currentIndex) {
          return { ...suggestion, friendRequestSent: true };
        }
        return suggestion;
      });
      setAllSuggestions(updatedSuggestions);
      
      setRequestSent(true);
      toast.success("Friend request sent! 🎉");
      
      // Automatically move to next suggestion after 1.5 seconds
      setTimeout(() => {
        handleRefresh();
      }, 1500);
    } catch (error) {
      console.error("Error sending friend request:", error);
      toast.error(error.response?.data?.message || "Failed to send friend request");
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-300">
      <div className="relative w-full max-w-md bg-gradient-to-br from-base-100 via-base-200 to-base-100 rounded-3xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300">
        {/* Decorative background elements */}
        <div className="absolute top-0 right-0 w-64 h-64 bg-gradient-to-br from-primary/20 to-secondary/20 rounded-full blur-3xl -z-10 animate-pulse"></div>
        <div className="absolute bottom-0 left-0 w-64 h-64 bg-gradient-to-tr from-accent/20 to-primary/20 rounded-full blur-3xl -z-10 animate-pulse" style={{ animationDelay: '1s' }}></div>

        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute right-4 top-4 z-10 btn btn-sm btn-circle btn-ghost hover:bg-error/10 hover:text-error transition-all duration-200"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Header */}
        <div className="relative px-8 pt-8 pb-6 text-center">
          <div className="flex justify-center mb-4">
            <div className="relative">
              <div className="absolute inset-0 bg-gradient-to-r from-pink-500 to-purple-500 rounded-full blur-xl opacity-50 animate-pulse"></div>
              <div className="relative bg-gradient-to-r from-pink-500 to-purple-500 p-4 rounded-full">
                <Sparkles className="w-8 h-8 text-white" />
              </div>
            </div>
          </div>
          <h3 className="text-3xl font-bold bg-gradient-to-r from-pink-500 to-purple-500 bg-clip-text text-transparent mb-2">
            Find Your Best Match
          </h3>
          <p className="text-base-content/60 text-sm">
            Discover friends who share your interests
          </p>
        </div>

        {/* Content */}
        <div className="px-6 pb-6">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-16">
              <div className="relative">
                <div className="w-16 h-16 border-4 border-primary/20 border-t-primary rounded-full animate-spin"></div>
                <Heart className="absolute inset-0 m-auto w-6 h-6 text-primary animate-pulse" />
              </div>
              <p className="mt-6 text-base-content/70 font-medium">Finding perfect matches...</p>
            </div>
          ) : currentSuggestion ? (
            <div className="space-y-6">
              {/* Profile Card with modern design */}
              <div className="relative bg-base-200 rounded-2xl p-6 border border-base-300 hover:border-primary/50 transition-all duration-300 hover:shadow-xl">
                {/* Match percentage badge */}
                <div className="absolute -top-3 right-6 bg-gradient-to-r from-pink-500 to-purple-500 text-white px-4 py-1.5 rounded-full shadow-lg">
                  <div className="flex items-center gap-1.5">
                    <TrendingUp className="w-4 h-4" />
                    <span className="font-bold text-sm">{currentSuggestion.similarityPercentage}% Match</span>
                  </div>
                </div>

                {/* Profile content */}
                <div className="flex flex-col items-center mt-2">
                  {/* Avatar with gradient border */}
                  <div className="relative mb-4">
                    <div className="absolute inset-0 bg-gradient-to-r from-pink-500 to-purple-500 rounded-full blur-md opacity-50"></div>
                    <div className="relative p-1 bg-gradient-to-r from-pink-500 to-purple-500 rounded-full">
                      <div className="bg-base-100 rounded-full p-1">
                        <img 
                          src={currentSuggestion.profilePic || "/avatar.png"} 
                          alt={currentSuggestion.fullName}
                          className="w-28 h-28 rounded-full object-cover"
                          onError={(e) => {
                            e.target.onerror = null;
                            e.target.src = "/avatar.png";
                          }}
                        />
                      </div>
                    </div>
                  </div>
                  
                  {/* Name and email */}
                  <h4 className="text-2xl font-bold text-base-content mb-1">
                    {currentSuggestion.fullName}
                  </h4>
                  
                  <p className="text-sm text-base-content/60 mb-4">
                    {currentSuggestion.email}
                  </p>

                  {/* Common Interests */}
                  {currentSuggestion.interests && currentSuggestion.interests.length > 0 && (
                    <div className="w-full mt-4">
                      <div className="flex items-center gap-2 mb-3">
                        <Heart className="w-4 h-4 text-error fill-current" />
                        <h5 className="text-sm font-semibold text-base-content/70">
                          Common Interests
                        </h5>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {currentSuggestion.interests.slice(0, 6).map((interest, index) => (
                          <span
                            key={index}
                            className="px-3 py-1.5 bg-gradient-to-r from-primary/10 to-secondary/10 border border-primary/20 text-primary rounded-full text-sm font-medium hover:scale-105 transition-transform duration-200"
                          >
                            {interest}
                          </span>
                        ))}
                        {currentSuggestion.interests.length > 6 && (
                          <span className="px-3 py-1.5 bg-base-300 rounded-full text-sm font-medium text-base-content/70">
                            +{currentSuggestion.interests.length - 6} more
                          </span>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-3">
                <button
                  onClick={handleRefresh}
                  disabled={allSuggestions.length <= 1}
                  className="btn btn-outline flex-1 gap-2 hover:scale-105 transition-transform duration-200"
                >
                  <RefreshCw className="w-4 h-4" />
                  Next Match
                </button>
                
                <button
                  onClick={handleSendFriendRequest}
                  disabled={requestSent}
                  className={`btn flex-1 gap-2 transition-all duration-200 ${
                    requestSent 
                      ? 'btn-disabled opacity-60' 
                      : 'bg-gradient-to-r from-pink-500 to-purple-500 hover:from-pink-600 hover:to-purple-600 text-white border-0 hover:scale-105'
                  }`}
                >
                  {requestSent ? (
                    <>
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                      Sent Request
                    </>
                  ) : (
                    <>
                      <UserPlus className="w-4 h-4" />
                      Add Friend
                    </>
                  )}
                </button>
              </div>

              {/* Suggestion Counter */}
              {allSuggestions.length > 1 && (
                <div className="text-center">
                  <div className="inline-flex items-center gap-2 px-4 py-2 bg-base-300 rounded-full">
                    <Users className="w-4 h-4 text-base-content/50" />
                    <p className="text-xs font-medium text-base-content/60">
                      {currentIndex + 1} of {allSuggestions.length} suggestions
                    </p>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="text-center py-16">
              <div className="mb-6 relative">
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="w-24 h-24 bg-gradient-to-r from-pink-500/20 to-purple-500/20 rounded-full blur-xl"></div>
                </div>
                <Sparkles className="w-20 h-20 mx-auto text-base-content/30 relative" />
              </div>
              <p className="text-lg font-semibold text-base-content/70 mb-2">
                No suggestions available
              </p>
              <p className="text-sm text-base-content/50 mb-6">
                Add more interests to get better matches!
              </p>
              <button
                onClick={fetchSuggestions}
                className="btn bg-gradient-to-r from-pink-500 to-purple-500 hover:from-pink-600 hover:to-purple-600 text-white border-0 gap-2"
              >
                <RefreshCw className="w-4 h-4" />
                Refresh Suggestions
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default FriendSuggestionPopup;
