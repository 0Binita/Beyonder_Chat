import { useState, useEffect } from "react";
import { CheckCircle, MessageSquareHeart, AlertCircle } from "lucide-react";
import { useNavigate, useLocation } from "react-router-dom";
import AuthImagePattern from "../components/AuthImagePattern";
import { useAuthStore } from "../store/useAuthStore";
import toast from "react-hot-toast";

const availableTopics = [
  "Technology",
  "Music",
  "Fitness",
  "Art",
  "Travel",
  "Cooking",
  "Education",
  "Gaming",
  "Finance",
  "Fashion",
  "Movies",
  "Books",
  "Photography",
  "Health",
];

const SelectInterestsPage = () => {
  const [selectedTopics, setSelectedTopics] = useState([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const { updateInterests, authUser } = useAuthStore();

  // Prevent navigation away from this page using browser back/forward
  useEffect(() => {
    const preventNavigation = (e) => {
      if (selectedTopics.length < 3) {
        e.preventDefault();
        e.returnValue = '';
        toast.error("Please select at least 3 interests before leaving");
      }
    };

    // Add beforeunload event to prevent closing/refreshing
    window.addEventListener('beforeunload', preventNavigation);
    
    // Prevent back button navigation
    const handlePopState = (e) => {
      if (selectedTopics.length < 3) {
        window.history.pushState(null, '', location.pathname);
        toast.error("Please select at least 3 interests to continue");
      }
    };

    window.history.pushState(null, '', location.pathname);
    window.addEventListener('popstate', handlePopState);

    return () => {
      window.removeEventListener('beforeunload', preventNavigation);
      window.removeEventListener('popstate', handlePopState);
    };
  }, [selectedTopics.length, location.pathname]);

  // Initialize with existing interests if any
  useEffect(() => {
    if (authUser?.interests && authUser.interests.length > 0) {
      setSelectedTopics(authUser.interests);
    }
  }, [authUser]);

  const toggleTopic = (topic) => {
    setSelectedTopics((prev) =>
      prev.includes(topic)
        ? prev.filter((t) => t !== topic)
        : [...prev, topic]
    );
  };

  const handleContinue = async () => {
    if (selectedTopics.length < 3) {
      toast.error("Please select at least 3 interests");
      return;
    }

    setIsSubmitting(true);
    try {
      await updateInterests(selectedTopics);
      
      // ✅ Navigate to add-friends page after saving interests
      navigate("/add-friends", { replace: true });
    } catch (error) {
      console.error("Failed to save interests:", error);
      toast.error("Failed to save interests. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const remainingSelections = Math.max(0, 3 - selectedTopics.length);

  return (
    <div className="min-h-screen grid lg:grid-cols-2">
      {/* left side */}
      <div className="flex flex-col justify-center items-center p-6 sm:p-12">
        <div className="w-full max-w-md space-y-8">
          <div className="text-center mb-8">
            <div className="flex flex-col items-center gap-2 group">
              <div
                className="size-12 rounded-xl bg-primary/10 flex items-center justify-center 
                group-hover:bg-primary/20 transition-colors"
              >
                <MessageSquareHeart className="size-6 text-primary" />
              </div>
              <h1 className="text-2xl font-bold mt-2">Select Your Interests</h1>
              <p className="text-base-content/60">Choose at least 3 topics you love</p>
            </div>
          </div>

          {/* Selection counter */}
          <div className="flex items-center justify-between px-2">
            <span className="text-sm text-base-content/70">
              Selected: <span className="font-bold text-primary">{selectedTopics.length}</span>
            </span>
            <span className="text-sm text-base-content/70">
              Minimum: <span className="font-bold">3</span>
            </span>
          </div>

          {/* Progress bar */}
          <div className="w-full bg-base-300 rounded-full h-2">
            <div 
              className={`h-2 rounded-full transition-all duration-300 ${
                selectedTopics.length >= 3 ? 'bg-success' : 'bg-primary'
              }`}
              style={{ width: `${Math.min((selectedTopics.length / 3) * 100, 100)}%` }}
            />
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
            {availableTopics.map((topic) => {
              const isSelected = selectedTopics.includes(topic);
              return (
                <button
                  key={topic}
                  onClick={() => toggleTopic(topic)}
                  className={`px-4 py-2 rounded-full text-sm font-medium border transition-all duration-200 hover:scale-105
                    ${
                      isSelected
                        ? "bg-primary text-white border-primary shadow-lg"
                        : "bg-base-100 text-base-content/80 border-base-content/20 hover:border-primary/50"
                    }`}
                >
                  {topic}
                  {isSelected && <CheckCircle className="inline-block ml-1 w-3 h-3" />}
                </button>
              );
            })}
          </div>

          <button
            onClick={handleContinue}
            className={`btn w-full mt-6 ${
              selectedTopics.length >= 3 
                ? 'btn-primary' 
                : 'btn-disabled'
            }`}
            disabled={selectedTopics.length < 3 || isSubmitting}
          >
            {isSubmitting ? (
              <>
                <svg
                  className="animate-spin h-5 w-5 mr-3 text-white"
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                >
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                  />
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8v8H4zm16 0a8 8 0 01-8 8v-8h8z"
                  />
                </svg>
                Saving...
              </>
            ) : (
              <>
                <CheckCircle className="size-5 mr-2" />
                {selectedTopics.length >= 3 
                  ? 'Continue' 
                  : `Select ${remainingSelections} more to continue`}
              </>
            )}
          </button>

          {selectedTopics.length >= 3 && (
            <p className="text-center text-sm text-success">
              ✓ You've selected enough interests! Click continue to proceed.
            </p>
          )}
        </div>
      </div>

      {/* right side - AuthImagePattern */}
      <AuthImagePattern
        title="Personalize Your Experience"
        subtitle="Select your interests to connect with like-minded people and get personalized content."
      />
    </div>
  );
};

export default SelectInterestsPage;