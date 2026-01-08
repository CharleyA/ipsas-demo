"use client";

import React, { createContext, useContext, useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import { toast } from "sonner";

interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: string;
  organisationId: string;
}

interface AuthContextType {
  user: User | null;
  token: string | null;
  login: (token: string, user: User) => void;
  logout: () => void;
  isLoading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    const storedToken = localStorage.getItem("auth_token");
    const storedUser = localStorage.getItem("auth_user");

    if (storedToken && storedUser) {
      setToken(storedToken);
      setUser(JSON.parse(storedUser));
      // Sync cookie if missing
      if (!document.cookie.includes("token=")) {
        document.cookie = `token=${storedToken}; path=/; max-age=86400; SameSite=Lax`;
      }
    }
    setIsLoading(false);
  }, []);

    useEffect(() => {
      console.log("Auth State:", { token: !!token, isLoading, pathname });
      if (!isLoading) {
        if (!token && !pathname.startsWith("/login") && pathname !== "/") {
          console.log("Redirecting to login");
          router.push("/login");
        } else if (token && pathname.startsWith("/login")) {
          console.log("Redirecting to correct dashboard");
          const redirectPath = user?.role === "ADMIN" ? "/dashboard/admin" : "/dashboard";
          router.push(redirectPath);
        }
      }
    }, [token, isLoading, pathname, router, user?.role]);

  const login = (newToken: string, newUser: User) => {
    setToken(newToken);
    setUser(newUser);
    localStorage.setItem("auth_token", newToken);
    localStorage.setItem("auth_user", JSON.stringify(newUser));
    document.cookie = `token=${newToken}; path=/; max-age=86400; SameSite=Lax`;
    toast.success("Logged in successfully");
    
    const redirectPath = newUser.role === "ADMIN" ? "/dashboard/admin" : "/dashboard";
    window.location.href = redirectPath;
  };

  const logout = () => {
    setToken(null);
    setUser(null);
    localStorage.removeItem("auth_token");
    localStorage.removeItem("auth_user");
    // Remove cookie
    document.cookie = "token=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT";
    toast.info("Logged out");
    router.push("/login");
  };

  return (
    <AuthContext.Provider value={{ user, token, login, logout, isLoading }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};
