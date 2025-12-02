import { useState } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { useAuthStore } from "../store/useAuthStore";
import { useThemeStore } from "../store/useThemeStore";
import { LogOut, Settings, User, Bell, Heart, Sparkles } from "lucide-react";
import { useSentimentModel } from "../../context/SentimentModelContext";
import FriendSuggestionPopup from "./FriendSuggestionPopup";

const Navbar = () => {
  const { logout, authUser } = useAuthStore();
  const { theme } = useThemeStore();
  const { model, setModel } = useSentimentModel(); 
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [showFriendSuggestion, setShowFriendSuggestion] = useState(false);

  const darkThemes = [
    "dark", "black", "synthwave", "halloween", "forest", "aqua",
    "luxury", "dracula", "business", "night", "coffee", "dim", "sunset"
  ];
  const logoSrc = darkThemes.includes(theme?.toLowerCase()) ? "/Aadi - White.png" : "/Aadi.png";

  const navigate = useNavigate();
  const location = useLocation();
  const isAdmin = authUser?.email === "bey@email.com";
  const isAuthPage = ["/login", "/signup"].includes(location.pathname);

  return (
    <>
      <header className="bg-base-100 border-b border-base-300 fixed w-full top-0 z-40 backdrop-blur-lg bg-base-100/80">
        <div className="container mx-auto px-4 h-16">
          <div className="flex items-center justify-between h-full">
            {/* Left - Logo */}
            <div className="flex items-center gap-8">
              <Link to="/" className="flex items-center gap-2.5 hover:opacity-80 transition-all">
                <img
                  src={location.pathname === "/admin-dashboard" ? "/BeyonderAdmin.png" : logoSrc}
                  alt="Logo"
                  className="h-28 sm:h-28 w-auto"
                />
              </Link>
            </div>

            {/* Right - Navigation */}
            <div className="flex items-center gap-2 relative">
              {/* Looking for a partner - only show when logged in */}
              {authUser && (
                <Link
                  to="#"
                  onClick={(e) => {
                    e.preventDefault();
                    setShowFriendSuggestion(true);
                  }}
                  className="btn btn-sm gap-2 transition-colors btn-ghost"
                >
                  <Heart className="size-4 bg-gradient-to-r from-pink-500 to-purple-500 bg-clip-text text-transparent" style={{ fill: 'url(#heartGradient)' }} />
                  <span className="hidden sm:inline bg-gradient-to-r from-pink-500 to-purple-500 bg-clip-text text-transparent font-semibold">
                    Looking for a Friend?
                  </span>
                  <svg width="0" height="0">
                    <defs>
                      <linearGradient id="heartGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                        <stop offset="0%" style={{ stopColor: 'rgb(236, 72, 153)', stopOpacity: 1 }} />
                        <stop offset="100%" style={{ stopColor: 'rgb(168, 85, 247)', stopOpacity: 1 }} />
                      </linearGradient>
                    </defs>
                  </svg>
                </Link>
              )}

              {/* Interests Tab - only show when logged in */}
              {authUser && (
                <Link
                  to="/interests"
                  className="btn btn-sm gap-2 transition-colors"
                >
                  <Sparkles className="w-4 h-4" />
                  <span className="hidden sm:inline">Interests</span>
                </Link>
              )}

              {/* Notification bell for non-admins */}
              {!isAdmin && authUser && (
                <button
                  onClick={() => navigate("/notifications")}
                  className="btn btn-sm gap-2 transition-colors flex items-center"
                  aria-label="Go to notifications"
                >
                  <Bell className="w-4 h-4" />
                </button>
              )}

              {/* Admin Dashboard + Model Switcher */}
              {isAdmin && (
                <>
                  <button
                    onClick={() => navigate("/admin-dashboard")}
                    className="btn btn-sm gap-2 transition-colors flex items-center"
                    aria-label="Go to admin dashboard"
                  >
                    Dashboard
                  </button>
                </>
              )}

              {/* Settings Button */}
              <Link
                to={"/settings"}
                className="btn btn-sm gap-2 transition-colors"
              >
                <Settings className="w-4 h-4" />
                <span className="hidden sm:inline">Settings</span>
              </Link>

              {/* Profile and Logout */}
              {authUser && (
                <>
                  <Link to={"/profile"} className="btn btn-sm gap-2">
                    <User className="size-5" />
                    <span className="hidden sm:inline">Profile</span>
                  </Link>

                  <button
                    className="flex gap-2 items-center"
                    onClick={logout}
                  >
                    <LogOut className="size-5" />
                    <span className="hidden sm:inline">Logout</span>
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Friend Suggestion Popup */}
      <FriendSuggestionPopup
        isOpen={showFriendSuggestion}
        onClose={() => setShowFriendSuggestion(false)}
      />
    </>
  );
};

export default Navbar;