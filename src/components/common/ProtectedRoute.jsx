import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';

export default function ProtectedRoute({ children, role }) {
  const { user } = useAuth();
  const location = useLocation();

  // Not logged in - redirect to login page
  if (!user) {
    return <Navigate to="/login" state={{ from: location.pathname }} replace />;
  }

  // Role required but user role does not match - redirect to 'Home'
  if (role && user.role !== role) {
    return <Navigate to="/" replace />;
  }

  // Pass of all checks - render the children
  return children;
}
