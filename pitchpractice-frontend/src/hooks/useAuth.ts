import {
  createContext,
  useContext,
  useState,
  useEffect,
  createElement,
} from "react";
import type { User, Organization } from "../types";
import { authAPI } from "../services/api";

interface AuthContextType {
  user: User | null;
  organization: Organization | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (data: {
    email: string;
    password: string;
    firstName: string;
    lastName: string;
    organizationName: string;
    organizationType?: string;
    organizationDescription?: string;
  }) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

interface AuthProviderProps {
  children: React.ReactNode;
}

export const AuthProvider = ({ children }: AuthProviderProps) => {
  const [user, setUser] = useState<User | null>(null);
  const [organization, setOrganization] = useState<Organization | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const initAuth = async () => {
      const token = localStorage.getItem("accessToken");
      const userData = localStorage.getItem("user");
      const orgData = localStorage.getItem("organization");

      if (token && userData && orgData) {
        try {
          setUser(JSON.parse(userData));
          setOrganization(JSON.parse(orgData));
        } catch (error) {
          console.error("Error parsing stored auth data:", error);
          logout();
        }
      }
      setLoading(false);
    };

    initAuth();
  }, []);

  const login = async (email: string, password: string) => {
    try {
      const response = await authAPI.login(email, password);
      const { accessToken, refreshToken, user, organization } = response.data;

      localStorage.setItem("accessToken", accessToken);
      localStorage.setItem("refreshToken", refreshToken);
      localStorage.setItem("user", JSON.stringify(user));
      localStorage.setItem("organization", JSON.stringify(organization));

      setUser(user);
      setOrganization(organization);
    } catch (error) {
      console.error("Login failed:", error);
      throw error;
    }
  };

  const register = async (data: {
    email: string;
    password: string;
    firstName: string;
    lastName: string;
    organizationName: string;
    organizationType?: string;
    organizationDescription?: string;
  }) => {
    try {
      const response = await authAPI.register(data);
      const { accessToken, refreshToken, user, organization } = response.data;

      localStorage.setItem("accessToken", accessToken);
      localStorage.setItem("refreshToken", refreshToken);
      localStorage.setItem("user", JSON.stringify(user));
      localStorage.setItem("organization", JSON.stringify(organization));

      setUser(user);
      setOrganization(organization);
    } catch (error) {
      console.error("Registration failed:", error);
      throw error;
    }
  };

  const logout = () => {
    localStorage.removeItem("accessToken");
    localStorage.removeItem("refreshToken");
    localStorage.removeItem("user");
    localStorage.removeItem("organization");
    setUser(null);
    setOrganization(null);
  };

  const value: AuthContextType = {
    user,
    organization,
    loading,
    login,
    register,
    logout,
  };

  // React 19 compatible JSX syntax
  return createElement(AuthContext.Provider, {
    value: value,
    children: children,
  });
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};
