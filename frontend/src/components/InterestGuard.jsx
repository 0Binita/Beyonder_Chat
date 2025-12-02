import { useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useAuthStore } from "../store/useAuthStore";

const InterestGuard = ({ children }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { authUser, hasRequiredInterests } = useAuthStore();

  useEffect(() => {
    // Allow access to auth pages and interests page itself
    const allowedPaths = ['/login', '/signup', '/interests'];
    const isAllowedPath = allowedPaths.some(path => location.pathname.startsWith(path));
    
    // If user is logged in but doesn't have required interests
    if (authUser && !hasRequiredInterests() && !isAllowedPath) {
      navigate('/interests', { replace: true });
    }
  }, [authUser, location.pathname, navigate, hasRequiredInterests]);

  return <>{children}</>;
};

export default InterestGuard;
