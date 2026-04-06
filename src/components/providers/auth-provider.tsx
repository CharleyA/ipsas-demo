"use client";

import React, { createContext, useContext, useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { MessageCircle, X } from "lucide-react";

interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  avatarUrl?: string | null;
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
  const [chatInput, setChatInput] = useState("");
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [messages, setMessages] = useState([
    {
      id: "welcome",
      role: "assistant",
      content:
        "Hi! I can help with reports, entity lookups, and draft-only actions. Ask me what you need and I’ll point you to the right workflow.",
    },
  ]);
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    const storedToken = localStorage.getItem("auth_token");
    const storedUser = localStorage.getItem("auth_user");

    if (storedToken && storedUser) {
      setToken(storedToken);
      setUser(JSON.parse(storedUser));
      // Sync cookie if missing - use SameSite=None; Secure for iframe compatibility
      if (!document.cookie.includes("token=")) {
        document.cookie = `token=${storedToken}; path=/; max-age=86400; SameSite=None; Secure`;
      }
    }
    setIsLoading(false);
  }, []);

    useEffect(() => {
      console.log("Auth State:", { token: !!token, isLoading, pathname });
      if (!isLoading) {
        if (!token && !pathname.startsWith("/login") && pathname !== "/" && !pathname.startsWith("/docs")) {
          console.log("Redirecting to login");
          router.push("/login");
        } else if (token && pathname.startsWith("/login")) {
          console.log("Redirecting to correct dashboard");
          const redirectPath = "/dashboard";
          router.push(redirectPath);
        }
      }
    }, [token, isLoading, pathname, router]);

  const getAssistantResponse = (input: string) => {
    const normalized = input.toLowerCase();

    if (normalized.includes("ap") || normalized.includes("payable") || normalized.includes("supplier")) {
      return "For payables, try AP ageing and supplier lookups. Endpoints: /api/reports/ap-ageing, /api/suppliers, /api/ap/bills.";
    }

    if (normalized.includes("ar") || normalized.includes("invoice") || normalized.includes("receipt")) {
      return "For receivables, check AR ageing and student accounts. Endpoints: /api/reports/ar-ageing, /api/students, /api/ar/invoices, /api/ar/receipts.";
    }

    if (normalized.includes("trial") || normalized.includes("ledger") || normalized.includes("gl")) {
      return "For ledger analysis, use /api/reports/trial-balance or /api/reports/general-ledger.";
    }

    if (normalized.includes("cash") || normalized.includes("cashflow")) {
      return "For cash movements, use /api/reports/cashflow and /api/dashboard for summaries.";
    }

    return "I can help with reports, lookups, and draft-only actions. Tell me which module or record you want to explore.";
  };

  const login = (newToken: string, newUser: User) => {
    console.log("Login initiated", { newToken: !!newToken, newUser });
    setToken(newToken);
    setUser(newUser);
    localStorage.setItem("auth_token", newToken);
    localStorage.setItem("auth_user", JSON.stringify(newUser));
    // Use SameSite=None; Secure for iframe compatibility
    document.cookie = `token=${newToken}; path=/; max-age=86400; SameSite=None; Secure`;
    
    toast.success("Logged in successfully");
    
    const redirectPath = "/dashboard";
    console.log("Redirecting to:", redirectPath);
    
    // Force navigation using window.location for reliability in iframe
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

  const handleChatSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const trimmed = chatInput.trim();
    if (!trimmed) return;

    const userMessage = {
      id: crypto.randomUUID(),
      role: "user",
      content: trimmed,
    };
    const assistantMessage = {
      id: crypto.randomUUID(),
      role: "assistant",
      content: getAssistantResponse(trimmed),
    };

    setMessages((prev) => [...prev, userMessage, assistantMessage]);
    setChatInput("");
  };

  const showAssistant = pathname.startsWith("/docs") || (Boolean(token) && pathname !== "/");

  return (
    <AuthContext.Provider value={{ user, token, login, logout, isLoading }}>
      {children}
      {showAssistant && (
        <div className="fixed bottom-6 right-6 z-50 flex flex-col items-end gap-3">
          {isChatOpen && (
            <Card className="w-80 sm:w-96">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
                <div>
                  <CardTitle className="text-base">Assistant</CardTitle>
                  <CardDescription>
                    Read-only insights and draft-only workflows.
                  </CardDescription>
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={() => setIsChatOpen(false)}
                  aria-label="Close assistant"
                >
                  <X className="h-4 w-4" />
                </Button>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="rounded-md border border-border">
                  <ScrollArea className="h-64">
                    <div className="space-y-3 p-4">
                      {messages.map((message) => (
                        <div
                          key={message.id}
                          className={message.role === "user" ? "flex justify-end" : "flex justify-start"}
                        >
                          <div
                            className={`max-w-[80%] rounded-lg px-3 py-2 text-sm ${
                              message.role === "user"
                                ? "bg-primary text-primary-foreground"
                                : "bg-muted text-foreground"
                            }`}
                          >
                            {message.content}
                          </div>
                        </div>
                      ))}
                    </div>
                  </ScrollArea>
                </div>
                <form className="flex items-center gap-2" onSubmit={handleChatSubmit}>
                  <Input
                    value={chatInput}
                    onChange={(event) => setChatInput(event.target.value)}
                    placeholder="Ask about reports, vouchers, or drafts..."
                    aria-label="Assistant prompt"
                  />
                  <Button type="submit" disabled={!chatInput.trim()}>
                    Send
                  </Button>
                </form>
                <p className="text-xs text-muted-foreground">
                  Read-only and draft-only assistance. No submit, approve, or post actions.
                </p>
              </CardContent>
            </Card>
          )}
          <Button
            type="button"
            size="icon"
            className="rounded-full h-12 w-12"
            onClick={() => setIsChatOpen((prev) => !prev)}
            aria-label="Open assistant"
          >
            <MessageCircle className="h-5 w-5" />
          </Button>
        </div>
      )}
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
