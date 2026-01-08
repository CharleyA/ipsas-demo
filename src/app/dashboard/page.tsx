"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/components/providers/auth-provider";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { Loader2, LayoutDashboard, Plus } from "lucide-react";
import { HeadmasterDashboard } from "@/components/dashboard/headmaster-dashboard";
import { AuditorDashboard } from "@/components/dashboard/auditor-dashboard";
import { toast } from "sonner";

export default function DashboardPage() {
  const { user, token } = useAuth();
  const [data, setData] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);

  const fetchDashboardData = async () => {
    setIsLoading(true);
    try {
      const response = await fetch("/api/dashboard", {
        headers: { "Authorization": `Bearer ${token}` }
      });
      if (!response.ok) throw new Error("Failed to fetch dashboard data");
      const result = await response.json();
      setData(result);
    } catch (error) {
      toast.error("Error loading dashboard metrics");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (token) fetchDashboardData();
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
    </div>
  );
}
