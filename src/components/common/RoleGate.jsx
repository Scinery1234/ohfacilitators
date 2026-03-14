import { useAuth } from '@/contexts/AuthContext';
import NotAuthorized from '@/pages/NotAuthorized';

export default function RoleGate({ children, allowedRoles }) {
  const { user } = useAuth();

  if (!user) {
    return <NotAuthorized />;
  }

  if (allowedRoles && !allowedRoles.includes(user.role)) {
    return <NotAuthorized />;
  }

  return children;
}
