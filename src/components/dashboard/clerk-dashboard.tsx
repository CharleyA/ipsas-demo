"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";
import { ClipboardList, Users, Building2, Clock, ChevronRight, Plus, FileText } from "lucide-react";
import { formatCurrency } from "@/lib/utils";
import { Cell, Pie, PieChart } from "recharts";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { format } from "date-fns";

interface ClerkDashboardProps {
  data: {
    pendingApprovals: number;
    studentsCount: number;
    suppliersCount: number;
    vouchersByStatus: Array<{ status: string; count: number }>;
    recentVouchers: Array<{ id: string; reference: string; description: string; status: string; date: string; createdBy: string }>;
  };
}

const PIE_COLORS = ["#6366f1", "#22c55e", "#f59e0b", "#ef4444", "#8b5cf6", "#06b6d4"];

const statusColors: Record<string, string> = {
  DRAFT: "bg-gray-100 text-gray-800",
  SUBMITTED: "bg-blue-100 text-blue-800",
  APPROVED: "bg-green-100 text-green-800",
  POSTED: "bg-indigo-100 text-indigo-800",
  REJECTED: "bg-red-100 text-red-800",
  CANCELLED: "bg-gray-200 text-gray-700",
};

const chartConfig: Record<string, { label: string }> = {};

export function ClerkDashboard({ data }: ClerkDashboardProps) {
  const pieData = (data.vouchersByStatus || []).map((v) => ({ name: v.status, value: v.count }));

  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card className={data.pendingApprovals > 0 ? "border-yellow-400 bg-yellow-50" : ""}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending Approvals</CardTitle>
            <Clock className={`h-4 w-4 ${data.pendingApprovals > 0 ? "text-yellow-500" : "text-muted-foreground"}`} />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data.pendingApprovals}</div>
            <p className="text-xs text-muted-foreground">Items awaiting sign-off</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Students</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data.studentsCount}</div>
            <p className="text-xs text-muted-foreground">Registered students</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Suppliers</CardTitle>
            <Building2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data.suppliersCount}</div>
            <p className="text-xs text-muted-foreground">Active suppliers</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Vouchers</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{(data.vouchersByStatus || []).reduce((s, v) => s + v.count, 0)}</div>
            <p className="text-xs text-muted-foreground">All time</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Vouchers by Status</CardTitle>
            <CardDescription>Current distribution of all vouchers</CardDescription>
          </CardHeader>
          <CardContent>
            {pieData.length === 0 ? (
              <p className="text-sm text-muted-foreground italic">No vouchers yet.</p>
            ) : (
              <div className="flex items-center gap-4">
                <ChartContainer config={chartConfig} className="h-[200px] w-[200px] shrink-0">
                  <PieChart>
                    <ChartTooltip content={<ChartTooltipContent />} />
                    <Pie data={pieData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80}>
                      {pieData.map((_, i) => (
                        <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                      ))}
                    </Pie>
                  </PieChart>
                </ChartContainer>
                <div className="space-y-2">
                  {pieData.map((d, i) => (
                    <div key={d.name} className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: PIE_COLORS[i % PIE_COLORS.length] }} />
                      <span className="text-sm">{d.name}</span>
                      <span className="text-sm font-bold ml-auto">{d.value}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Recent Vouchers</CardTitle>
            <CardDescription>Latest transactions entered</CardDescription>
          </CardHeader>
          <CardContent>
            {(data.recentVouchers || []).length === 0 ? (
              <p className="text-sm text-muted-foreground italic">No vouchers yet.</p>
            ) : (
              <div className="space-y-3">
                {data.recentVouchers.map((v) => (
                  <div key={v.id} className="flex items-center justify-between p-2 border rounded-lg">
                    <div>
                      <p className="text-sm font-medium">{v.reference}</p>
                      <p className="text-xs text-muted-foreground truncate max-w-[180px]">{v.description || "No description"}</p>
                    </div>
                    <Badge variant="secondary" className={`text-xs ${statusColors[v.status] || ""}`}>{v.status}</Badge>
                  </div>
                ))}
              </div>
            )}
            <Button asChild variant="outline" className="w-full mt-4" size="sm">
              <Link href="/dashboard/vouchers"><ChevronRight className="w-4 h-4 mr-2" />All Vouchers</Link>
            </Button>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        {[
          { label: "New Voucher", href: "/dashboard/vouchers/new", icon: Plus },
          { label: "Approvals Queue", href: "/dashboard/approvals", icon: Clock },
          { label: "Students", href: "/dashboard/students", icon: Users },
          { label: "Suppliers", href: "/dashboard/suppliers", icon: Building2 },
        ].map((item) => {
          const Icon = item.icon;
          return (
            <Card key={item.href} className="hover:border-primary/40 transition-colors">
              <CardContent className="pt-4">
                <Button asChild variant="ghost" className="w-full h-auto flex-col gap-2 py-3">
                  <Link href={item.href}>
                    <Icon className="w-5 h-5 text-primary" />
                    <p className="text-sm font-medium">{item.label}</p>
                  </Link>
                </Button>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
