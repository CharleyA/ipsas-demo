"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/components/providers/auth-provider";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import Link from "next/link";
import { Loader2, LayoutDashboard, Plus } from "lucide-react";
import { HeadmasterDashboard } from "@/components/dashboard/headmaster-dashboard";
import { AuditorDashboard } from "@/components/dashboard/auditor-dashboard";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default function DashboardPage() {
  const { user, token } = useAuth();
  const [data, setData] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [chatInput, setChatInput] = useState("");
  const [messages, setMessages] = useState([
    {
      id: "welcome",
      role: "assistant",
      content:
        "Hi! I can help with reports, entity lookups, and draft-only actions. Ask me what you need and I’ll point you to the right workflow.",
    },
  ]);

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

  const fetchDashboardData = async (showLoading = true) => {
    if (showLoading) setIsLoading(true);
    try {
      const response = await fetch("/api/dashboard", {
        headers: { "Authorization": `Bearer ${token}` }
      });
      if (!response.ok) throw new Error("Failed to fetch dashboard data");
      const result = await response.json();
      setData(result);
    } catch (error) {
      console.error("Dashboard error:", error);
    } finally {
      if (showLoading) setIsLoading(false);
    }
  };

  useEffect(() => {
    if (!token) return;
    
    fetchDashboardData(true);

    const interval = setInterval(() => {
      fetchDashboardData(false);
    }, 10000);

    return () => clearInterval(interval);
  }, [token]);

  if (isLoading) {
    return (
      <div className="flex h-[400px] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const isHeadmaster = user?.role === "HEADMASTER" || user?.role === "ADMIN";
  const isAuditor = user?.role === "AUDITOR";

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

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
          <p className="text-muted-foreground">
            {isHeadmaster ? "Institutional Financial Overview" : 
             isAuditor ? "Compliance & Audit Oversight" : 
             "Welcome to IPSAS Accounting"}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {user?.role !== "AUDITOR" && (
            <Button asChild>
              <Link href="/dashboard/vouchers/new">
                <Plus className="w-4 h-4 mr-2" />
                New Transaction
              </Link>
            </Button>
          )}
        </div>
      </div>

      {isHeadmaster && data ? (
        <HeadmasterDashboard data={data} />
      ) : isAuditor && data ? (
        <AuditorDashboard data={data} />
      ) : (
        <div className="flex flex-col items-center justify-center py-20 bg-slate-50 rounded-xl border-2 border-dashed">
          <LayoutDashboard className="h-12 w-12 text-slate-300 mb-4" />
          <h2 className="text-xl font-semibold text-slate-600">Welcome, {user?.firstName}</h2>
          <p className="text-slate-500 max-w-sm text-center mt-2">
            Use the sidebar to navigate through your assigned tasks and reports.
          </p>
        </div>
      )}

      <Card id="assistant" className="scroll-mt-24">
        <CardHeader>
          <CardTitle>Assistant</CardTitle>
          <CardDescription>
            AI chatbot for read-only insights and draft-only workflows. No submit, approve, or post actions.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="rounded-md border border-border">
            <ScrollArea className="h-72">
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
            Read-only and draft-only assistance. This chatbot will not submit, approve, or post transactions.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
