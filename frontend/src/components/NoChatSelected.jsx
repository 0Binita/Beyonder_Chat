import { MessageSquare } from "lucide-react";
import { useState, useEffect } from "react";
import { useAuthStore } from "../store/useAuthStore";

const NoChatSelected = () => {
  const { authUser } = useAuthStore();

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
  }, [displayText, isDeleting, loopNum, words]);

  return (
    <div className="w-full flex flex-1 flex-col items-center justify-center p-16 bg-base-100/50">
      <div className="max-w-md text-center space-y-6">
        {/* Icon Display */}
        <div className="flex justify-center gap-4 mb-4">
          <div className="relative">
            <div
              className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center 
              justify-center animate-bounce"
            >
              <MessageSquare className="w-8 h-8 text-primary " />
            </div>
          </div>
        </div>

        {/* Welcome Message with Typing Animation */}
        <h2 className="text-2xl font-bold min-h-[2rem]">
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
        </h2>

        <p className="text-base-content/60">
          Select a conversation from the sidebar to start chatting
        </p>
      </div>
    </div>
  );
};

export default NoChatSelected;
