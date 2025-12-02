import { useEffect } from "react";
import { Routes, Route, Navigate, useNavigate, useLocation } from "react-router-dom";

import { SentimentModelProvider } from '../context/SentimentModelContext';
import Navbar from "./components/Navbar";
import InterestGuard from "./components/InterestGuard";
import { Loader } from "lucide-react";
import { Toaster } from "react-hot-toast";

import HomePage from "./pages/HomePage";
import SignUpPage from "./pages/SignUpPage";
import LoginPage from "./pages/LoginPage";
import SettingsPage from "./pages/SettingsPage";
import ProfilePage from "./pages/ProfilePage";
import SelectInterestsPage from "./pages/SelectInterestsPage"; 
import AddFriendPage from "./pages/AddFriendPage";
import NotificationsPage from "./pages/NotificationsPage";
import AdminDashboard from "./pages/AdminDashboard";
import ModelTestPage from "./pages/ModelTestPage";

import { useAuthStore } from "./store/useAuthStore";
import { useThemeStore } from "./store/useThemeStore";
import { connectSocket } from "./lib/socket"; 

const App = () => {
  const { authUser, checkAuth, isCheckingAuth, onlineUsers, hasRequiredInterests } = useAuthStore();
  const { theme } = useThemeStore();
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    checkAuth();
  }, [checkAuth]);

  useEffect(() => {
    if (authUser?.id) {
      connectSocket(authUser.id);
    }
  }, [authUser]);

  // ✅ Redirect logic after authentication check
  useEffect(() => {
    // Skip redirect logic during auth check
    if (isCheckingAuth) return;
    
    // Skip if user is not authenticated
    if (!authUser) return;
    
    // Paths that don't require interests
    const allowedPaths = ['/login', '/signup', '/interests', '/add-friends'];
    const isAllowedPath = allowedPaths.some(path => location.pathname.startsWith(path));
    
    // ✅ Only redirect if user doesn't have interests AND is trying to access protected routes
    if (!hasRequiredInterests()) {
      // Don't redirect if user is already on an allowed path
      if (!isAllowedPath) {
        console.log('User missing required interests, redirecting to /interests');
        navigate('/interests', { replace: true });
      }
    }
    // ✅ No automatic redirect away from /interests or /add-friends
  }, [authUser, location.pathname, navigate, hasRequiredInterests, isCheckingAuth]);

  if (isCheckingAuth && !authUser) {
    return (
      <div className="flex items-center justify-center h-screen">
        <Loader className="size-10 animate-spin" />
      </div>
    );
  }

  return (
    <div data-theme={theme}>
      <SentimentModelProvider>
        <InterestGuard>
          <Navbar />

          <Routes>
            {/* Public routes */}
            <Route 
              path="/signup" 
              element={!authUser ? <SignUpPage /> : <Navigate to="/interests" replace />} 
            />
            <Route 
              path="/login" 
              element={!authUser ? <LoginPage /> : <Navigate to="/" replace />} 
            />
            
            {/* Interests page - accessible anytime for logged-in users */}
            <Route
              path="/interests"
              element={
                authUser 
                  ? <SelectInterestsPage />
                  : <Navigate to="/login" replace />
              }
            />
            
            {/* Add Friends page - accessible for logged-in users with interests */}
            <Route
              path="/add-friends"
              element={
                authUser 
                  ? (hasRequiredInterests() 
                      ? <AddFriendPage /> 
                      : <Navigate to="/interests" replace />)
                  : <Navigate to="/login" replace />
              }
            />
            
            {/* Home route - only accessible with interests */}
            <Route 
              path="/" 
              element={
                authUser 
                  ? (hasRequiredInterests() 
                      ? <HomePage /> 
                      : <Navigate to="/interests" replace />)
                  : <Navigate to="/login" replace />
              } 
            />
            
            {/* Protected routes - require authentication AND interests */}
            <Route 
              path="/settings" 
              element={
                authUser && hasRequiredInterests() 
                  ? <SettingsPage /> 
                  : <Navigate to={authUser ? "/interests" : "/login"} replace />
              } 
            />
            <Route 
              path="/profile" 
              element={
                authUser && hasRequiredInterests() 
                  ? <ProfilePage /> 
                  : <Navigate to={authUser ? "/interests" : "/login"} replace />
              } 
            />
            <Route
              path="/notifications"
              element={
                authUser && hasRequiredInterests() 
                  ? <NotificationsPage /> 
                  : <Navigate to={authUser ? "/interests" : "/login"} replace />
              }
            />
            <Route
              path="/admin-dashboard"
              element={
                authUser?.email === "bey@email.com" && hasRequiredInterests() 
                  ? <AdminDashboard /> 
                  : <Navigate to={authUser ? "/interests" : "/login"} replace />
              }
            />
            
            {/* Test route - only for development */}
            {import.meta.env.DEV && (
              <Route path="/test-model" element={<ModelTestPage />} />
            )}
          </Routes>

          <Toaster />
        </InterestGuard>
      </SentimentModelProvider>
    </div>
  );
};

export default App;