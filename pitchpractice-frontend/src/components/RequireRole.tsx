import { useAuth } from "../hooks/useAuth";

interface RequireRoleProps {
  children: React.ReactNode;
  allowedRoles: string[]; // e.g., ['ADMIN', 'MANAGER']
  fallback?: React.ReactNode; // What to show if role doesn't match (optional)
}

const RequireRole: React.FC<RequireRoleProps> = ({
  children,
  allowedRoles,
  fallback = null,
}) => {
  const { user } = useAuth();

  // Check if the user's role is in the allowedRoles array
  const hasRequiredRole = user && allowedRoles.includes(user.role);

  return <>{hasRequiredRole ? children : fallback}</>;
};

export default RequireRole;
