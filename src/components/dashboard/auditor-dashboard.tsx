"use client";

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { 
  ShieldAlert, 
  FileSearch, 
  Activity, 
  ChevronRight,
  CheckCircle2,
  XCircle
} from "lucide-react";
import { formatCurrency } from "@/lib/utils";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { format } from "date-fns";

interface AuditorDashboardProps {
  data: {
    trialBalance: {
      totalDebits: number;
      totalCredits: number;
      isBalanced: boolean;
    };
    exceptions: {
      backdatedPostings: number;
      reopenedPeriods: number;
      missingAttachments: number;
      manualJournals: number;
      periodOverrides: number;
      reversals: number;
    };
    recentAuditLogs: Array<{
      id: string;
      action: string;
      user: string;
      date: string;
      entityType: string;
    }>;
  };
}

export function AuditorDashboard({ data }: AuditorDashboardProps) {
  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Trial Balance Status</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              {data.trialBalance.isBalanced ? (
                <CheckCircle2 className="h-5 w-5 text-green-500" />
              ) : (
                <XCircle className="h-5 w-5 text-red-500" />
              )}
              <span className="text-2xl font-bold">
                {data.trialBalance.isBalanced ? "Balanced" : "Out of Balance"}
              </span>
            </div>
            <div className="mt-2 text-xs text-muted-foreground grid grid-cols-2 gap-2">
              <div>Dr: {formatCurrency(data.trialBalance.totalDebits)}</div>
              <div>Cr: {formatCurrency(data.trialBalance.totalCredits)}</div>
            </div>
            <Button size="sm" variant="outline" className="w-full mt-4" asChild>
              <Link href="/dashboard/reports/trial-balance">View Full TB</Link>
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Exception Summary</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-2 text-sm">
              <div className="flex justify-between items-center p-1 border-b">
                <span className="text-muted-foreground">Backdated:</span>
                <span className={`font-bold ${data.exceptions.backdatedPostings > 0 ? 'text-red-500' : ''}`}>
                  {data.exceptions.backdatedPostings}
                </span>
              </div>
              <div className="flex justify-between items-center p-1 border-b">
                <span className="text-muted-foreground">Missing Docs:</span>
                <span className={`font-bold ${data.exceptions.missingAttachments > 0 ? 'text-yellow-600' : ''}`}>
                  {data.exceptions.missingAttachments}
                </span>
              </div>
              <div className="flex justify-between items-center p-1 border-b">
                <span className="text-muted-foreground">Overrides:</span>
                <span className="font-bold">{data.exceptions.periodOverrides}</span>
              </div>
              <div className="flex justify-between items-center p-1 border-b">
                <span className="text-muted-foreground">Reversals:</span>
                <span className="font-bold">{data.exceptions.reversals}</span>
              </div>
            </div>
            <Button size="sm" variant="outline" className="w-full mt-4" asChild>
              <Link href="/dashboard/reports/exceptions">Review Exceptions</Link>
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Audit Readiness</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col justify-center h-[120px]">
            <div className="text-center">
              <ShieldAlert className="h-8 w-8 text-blue-500 mx-auto mb-2" />
              <p className="text-sm font-medium">Internal Controls Active</p>
              <p className="text-xs text-muted-foreground">All posted entries are immutable</p>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
        <Card className="col-span-4">
          <CardHeader>
            <CardTitle>Recent Audit Logs</CardTitle>
            <CardDescription>Latest system-wide actions and modifications</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {data.recentAuditLogs.map((log) => (
                <div key={log.id} className="flex items-center justify-between border-b pb-2 last:border-0">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-slate-100 rounded-full">
                      <Activity className="h-4 w-4 text-slate-600" />
                    </div>
                    <div>
                      <p className="text-sm font-medium">{log.action.replace(/_/g, ' ')}</p>
                      <p className="text-xs text-muted-foreground">
                        {log.user} • {log.entityType}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-muted-foreground">
                      {format(new Date(log.date), 'MMM d, h:mm a')}
                    </p>
                  </div>
                </div>
              ))}
              <Button variant="ghost" className="w-full mt-2" asChild>
                <Link href="/dashboard/reports/audit-log">View Full Audit Trail</Link>
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card className="col-span-3">
          <CardHeader>
            <CardTitle>Verification Shortcuts</CardTitle>
            <CardDescription>Quick links for common audit tasks</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {[
                { label: "Verify Manual Journals", href: "/dashboard/reports/exceptions?tab=journals" },
                { label: "Check Reopened Periods", href: "/dashboard/reports/exceptions?tab=periods" },
                { label: "Review Reversal Chains", href: "/dashboard/reports/exceptions?tab=reversals" },
                { label: "Sample Vouchers & Attachments", href: "/dashboard/vouchers" },
              ].map((item, i) => (
                <Button key={i} variant="outline" className="w-full justify-between" asChild>
                  <Link href={item.href}>
                    {item.label}
                    <ChevronRight className="h-4 w-4" />
                  </Link>
                </Button>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
