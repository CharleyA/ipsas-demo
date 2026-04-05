"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";
import { Receipt, FileText, ChevronRight, Users, AlertCircle } from "lucide-react";
import { formatCurrency } from "@/lib/utils";
import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from "recharts";
import { ChartContainer, ChartLegend, ChartLegendContent, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { format } from "date-fns";

interface BursarDashboardProps {
  data: {
    receiptsThisMonth: number;
    receiptsCountThisMonth: number;
    outstandingBalance: number;
    outstandingCount: number;
    invoicesByStatus: Array<{ status: string; count: number }>;
    recentReceipts: Array<{ id: string; receiptNumber: string; student: string; admissionNumber: string; amount: number; date: string; status: string }>;
    monthlyTrend: Array<{ month: string; receipts: number; invoiced: number }>;
  };
}

const chartConfig = {
  receipts: { label: "Receipts", color: "hsl(var(--chart-1))" },
  invoiced: { label: "Invoiced", color: "hsl(var(--chart-2))" },
};

const statusColors: Record<string, string> = {
  DRAFT: "bg-gray-100 text-gray-800",
  POSTED: "bg-blue-100 text-blue-800",
  APPROVED: "bg-green-100 text-green-800",
  CANCELLED: "bg-red-100 text-red-800",
};

export function BursarDashboard({ data }: BursarDashboardProps) {
  const chartData = (data.monthlyTrend || []).map((row) => ({
    month: format(new Date(row.month), "MMM yy"),
    receipts: row.receipts,
    invoiced: row.invoiced,
  }));

  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card className="bg-primary/5 border-primary/20">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Receipts This Month</CardTitle>
            <Receipt className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(data.receiptsThisMonth)}</div>
            <p className="text-xs text-muted-foreground">{data.receiptsCountThisMonth} receipts captured</p>
          </CardContent>
        </Card>

        <Card className={data.outstandingBalance > 0 ? "border-yellow-400" : ""}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Outstanding Balance</CardTitle>
            <AlertCircle className={`h-4 w-4 ${data.outstandingBalance > 0 ? "text-yellow-500" : "text-muted-foreground"}`} />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(data.outstandingBalance)}</div>
            <p className="text-xs text-muted-foreground">{data.outstandingCount} unpaid invoices</p>
          </CardContent>
        </Card>

        {(data.invoicesByStatus || []).slice(0, 2).map((s) => (
          <Card key={s.status}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Invoices — {s.status}</CardTitle>
              <FileText className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{s.count}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Monthly Billing vs Receipts</CardTitle>
            <CardDescription>Last 6 months — invoiced vs collected</CardDescription>
          </CardHeader>
          <CardContent>
            {chartData.length === 0 ? (
              <p className="text-sm text-muted-foreground italic">No data available yet.</p>
            ) : (
              <ChartContainer config={chartConfig} className="h-[240px]">
                <BarChart data={chartData} margin={{ left: 0, right: 0, top: 10, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="month" tickLine={false} axisLine={false} />
                  <YAxis tickLine={false} axisLine={false} width={60} />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <ChartLegend content={<ChartLegendContent />} />
                  <Bar dataKey="invoiced" fill="var(--color-invoiced)" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="receipts" fill="var(--color-receipts)" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ChartContainer>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Recent Receipts</CardTitle>
            <CardDescription>Latest fee payments captured</CardDescription>
          </CardHeader>
          <CardContent>
            {(data.recentReceipts || []).length === 0 ? (
              <p className="text-sm text-muted-foreground italic">No receipts yet.</p>
            ) : (
              <div className="space-y-3">
                {data.recentReceipts.map((r) => (
                  <div key={r.id} className="flex items-center justify-between p-2 border rounded-lg">
                    <div>
                      <p className="text-sm font-medium">{r.student}</p>
                      <p className="text-xs text-muted-foreground">{r.admissionNumber} · {r.receiptNumber}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-bold">{formatCurrency(r.amount)}</p>
                      <Badge variant="secondary" className={`text-xs ${statusColors[r.status] || ""}`}>{r.status}</Badge>
                    </div>
                  </div>
                ))}
              </div>
            )}
            <Button asChild variant="outline" className="w-full mt-4" size="sm">
              <Link href="/dashboard/ar/receipts"><ChevronRight className="w-4 h-4 mr-2" />All Receipts</Link>
            </Button>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        {[
          { label: "Generate Invoices", sub: "Bulk student billing", href: "/dashboard/ar/invoices/generate", icon: FileText },
          { label: "New Receipt", sub: "Capture fee payment", href: "/dashboard/ar/receipts/new", icon: Receipt },
          { label: "Student Accounts", sub: "View debtor balances", href: "/dashboard/students", icon: Users },
        ].map((item) => {
          const Icon = item.icon;
          return (
            <Card key={item.href} className="hover:border-primary/40 transition-colors">
              <CardContent className="pt-6">
                <Button asChild variant="ghost" className="w-full h-auto flex-col gap-2 py-4">
                  <Link href={item.href}>
                    <Icon className="w-6 h-6 text-primary" />
                    <div>
                      <p className="font-medium">{item.label}</p>
                      <p className="text-xs text-muted-foreground">{item.sub}</p>
                    </div>
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
