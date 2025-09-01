import { useAuth } from "./useAuth";

export const useRoles = () => {
  const { user } = useAuth();

  const hasRole = (allowedRoles: string[]): boolean => {
    return !!user?.role && allowedRoles.includes(user.role);
  };

  const isAdmin = (): boolean => hasRole(["admin"]);
  const isManager = (): boolean => hasRole(["manager", "admin"]);
  const isTrainee = (): boolean => hasRole(["trainee", "manager", "admin"]);

  return {
    hasRole,
    isAdmin,
    isManager,
    isTrainee,
    currentRole: user?.role,
  };
};
