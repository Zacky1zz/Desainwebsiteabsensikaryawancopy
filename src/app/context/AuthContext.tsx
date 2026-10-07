import React, { createContext, useContext, useState, ReactNode, useEffect } from "react";

export type UserRole = "admin" | "karyawan";

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  department: string;
  position: string;
  avatar?: string;
}

export interface RegistrationDetails {
  role: UserRole;
  fullName: string;
  email: string;
  password: string;
  department: string;
  position: string;
  phone: string;
  inviteCode: string;
}

type RegistrationResult = { success: true } | { success: false; message: string };

interface AuthContextType {
  user: User | null;
  login: (email: string, password: string) => Promise<boolean>;
  register: (details: RegistrationDetails) => Promise<RegistrationResult>;
  logout: () => void;
  isAuthenticated: boolean;
  isLoading: boolean;
}

const AuthContext = createContext<AuthContextType | null>(null);

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5000/api/v1";

const mapUser = (apiUser: {
  id: string;
  email: string;
  role: string | { name: string };
  name?: string | null;
  department?: string | null;
  position?: string | null;
  employee?: {
    fullName?: string;
    department?: string;
    position?: string;
    avatarUrl?: string | null;
  } | null;
}): User => {
  const role = typeof apiUser.role === "string" ? apiUser.role : apiUser.role.name;
  return {
    id: apiUser.id,
    email: apiUser.email,
    role: role === "admin" ? "admin" : "karyawan",
    name: apiUser.name || apiUser.employee?.fullName || "Admin MCC",
    department: apiUser.department || apiUser.employee?.department || "Manajemen",
    position: apiUser.position || apiUser.employee?.position || "Administrator",
    avatar: apiUser.employee?.avatarUrl || undefined,
  };
};

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const initAuth = async () => {
      const token = sessionStorage.getItem("mcc_token");
      if (token) {
        try {
          const res = await fetch(`${API_URL}/auth/me`, {
            headers: { Authorization: `Bearer ${token}` },
          });
          if (res.ok) {
            const data = await res.json();
            setUser(mapUser(data.data));
          } else {
            sessionStorage.removeItem("mcc_token");
          }
        } catch (e) {
          console.error("Failed to load profile", e);
        }
      }
      setIsLoading(false);
    };
    initAuth();
  }, []);

  const login = async (email: string, password: string): Promise<boolean> => {
    try {
      const res = await fetch(`${API_URL}/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      if (res.ok) {
        const data = await res.json();
        const { accessToken, user: u } = data.data;
        sessionStorage.setItem("mcc_token", accessToken);
        const authenticatedUser = mapUser(u);
        sessionStorage.removeItem("mcc_demo_user");
        sessionStorage.setItem("mcc_user", JSON.stringify(authenticatedUser));
        setUser(authenticatedUser);
        return true;
      }
      return false;
    } catch (e) {
      console.error("Login error", e);
      return false;
    }
  };

  const register = async (details: RegistrationDetails): Promise<RegistrationResult> => {
    try {
      const res = await fetch(`${API_URL}/auth/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(details),
      });
      const data = await res.json();
      if (!res.ok) {
        return { success: false, message: data.message || "Pendaftaran gagal." };
      }

      const { accessToken, user: apiUser } = data.data;
      const authenticatedUser = mapUser(apiUser);
      sessionStorage.setItem("mcc_token", accessToken);
      sessionStorage.removeItem("mcc_demo_user");
      sessionStorage.setItem("mcc_user", JSON.stringify(authenticatedUser));
      setUser(authenticatedUser);
      return { success: true };
    } catch (e) {
      console.error("Registration error", e);
      return { success: false, message: "Tidak dapat menghubungi server. Silakan coba lagi." };
    }
  };

  const logout = () => {
    setUser(null);
    sessionStorage.removeItem("mcc_token");
    sessionStorage.removeItem("mcc_demo_user");
    sessionStorage.removeItem("mcc_user");
  };

  return (
    <AuthContext.Provider
      value={{ user, login, register, logout, isAuthenticated: !!user, isLoading }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
