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

interface AuthContextType {
  user: User | null;
  login: (email: string, password: string) => Promise<boolean>;
  logout: () => void;
  isAuthenticated: boolean;
  isLoading: boolean;
}

const AuthContext = createContext<AuthContextType | null>(null);

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5000/api/v1";

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
            const u = data.data;
            setUser({
              id: u.id,
              email: u.email,
              role: u.role.name === "admin" ? "admin" : "karyawan",
              name: u.employee?.fullName || "Admin MCC",
              department: u.employee?.department || "Manajemen",
              position: u.employee?.position || "Administrator",
              avatar: u.employee?.avatarUrl || undefined,
            });
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
        const authenticatedUser: User = {
          id: u.id,
          email: u.email,
          role: u.role === "admin" ? "admin" : "karyawan",
          name: u.employee?.fullName || "Admin MCC",
          department: u.employee?.department || "Manajemen",
          position: u.employee?.position || "Administrator",
          avatar: u.employee?.avatarUrl || undefined,
        };
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

  const logout = () => {
    setUser(null);
    sessionStorage.removeItem("mcc_token");
    sessionStorage.removeItem("mcc_demo_user");
    sessionStorage.removeItem("mcc_user");
  };

  return (
    <AuthContext.Provider
      value={{ user, login, logout, isAuthenticated: !!user, isLoading }}
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
