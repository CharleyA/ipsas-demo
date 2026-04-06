"use client";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import {
  ArrowRightLeft,
  Banknote,
  ChevronRight,
  Clock,
  FileText,
  TrendingUp,
  Wallet,
} from "lucide-react";
import { formatCurrency } from "@/lib/utils";
import {
  Area,
  AreaChart,
  CartesianGrid,
  XAxis,
  YAxis,
} from "recharts";
import {
  ChartContainer,
  ChartLegend,
  ChartLegendContent,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";
import { format } from "date-fns";

interface AccountantDashboardProps {
  data: {
    cashAtBank: number;
    cashInHand: number;
    totalLiquidity: number;
    receivables: number;
    payables: number;
    pendingApprovals: number;
    arInvoicesCount: number;
    apBillsCount: number;
    exchangeRate?: {
      rate: number;
      effectiveDate: string;
      lastSync: string;
    } | null;
    incomeExpenseTrend: Array<{
      month: string;
      income: number;
      expense: number;
    }>;
  };
}

const chartConfig = {
  income: {
    label: "Income",
    color: "hsl(var(--chart-1))",
  },
  expense: {
    label: "Expense",
    color: "hsl(var(--chart-2))",
  },
};

export function AccountantDashboard({ data }: AccountantDashboardProps) {
  const chartData = (data.incomeExpenseTrend || []).map((row) => ({
    month: format(new Date(row.month), "MMM yyyy"),
    income: row.income,
    expense: row.expense,
  }));

  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card className="bg-primary/5 border-primary/20">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">RBZ Exchange Rate</CardTitle>
            <ArrowRightLeft className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            {data.exchangeRate ? (
              <>
                <div className="text-2xl font-bold">
                  1 USD : {data.exchangeRate.rate.toFixed(4)} ZWG
                </div>
                <p className="text-[10px] text-muted-foreground mt-1">
                  Synced: {format(new Date(data.exchangeRate.lastSync), "dd MMM yyyy, HH:mm")}
                </p>
              </>
            ) : (
              <p className="text-sm text-muted-foreground italic">No exchange rate data available.</p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Liquidity</CardTitle>
            <Wallet className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(data.totalLiquidity)}</div>
            <p className="text-xs text-muted-foreground">Cash at bank + cash in hand</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Receivables</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(data.receivables)}</div>
            <p className="text-xs text-muted-foreground">Outstanding AR invoices</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Payables</CardTitle>
            <Banknote className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(data.payables)}</div>
            <p className="text-xs text-muted-foreground">Outstanding AP bills</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Cash at Bank</CardTitle>
            <Banknote className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(data.cashAtBank)}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Cash in Hand</CardTitle>
            <Wallet className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(data.cashInHand)}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending Approvals</CardTitle>
            <Clock className="h-4 w-4 text-yellow-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data.pendingApprovals}</div>
            <p className="text-xs text-muted-foreground">Vouchers awaiting sign-off</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Income vs Expense</CardTitle>
            <CardDescription>Last 6 months trend</CardDescription>
          </CardHeader>
          <CardContent>
            {chartData.length === 0 ? (
              <p className="text-sm text-muted-foreground italic">No chart data available.</p>
            ) : (
              <ChartContainer config={chartConfig} className="h-[240px]">
                <AreaChart data={chartData} margin={{ left: 0, right: 0, top: 10, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="month" tickLine={false} axisLine={false} />
                  <YAxis tickLine={false} axisLine={false} width={60} />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <ChartLegend content={<ChartLegendContent />} />
                  <Area type="monotone" dataKey="income" stroke="var(--color-income)" fill="var(--color-income)" fillOpacity={0.2} />
                  <Area type="monotone" dataKey="expense" stroke="var(--color-expense)" fill="var(--color-expense)" fillOpacity={0.15} />
                </AreaChart>
              </ChartContainer>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Work Queue</CardTitle>
            <CardDescription>Key accountant actions</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-between p-3 border rounded-lg">
                <div>
                  <p className="text-sm font-medium">AR Invoices</p>
                  <p className="text-xs text-muted-foreground">{data.arInvoicesCount} active</p>
                </div>
                <Button size="sm" variant="ghost" asChild>
                  <Link href="/dashboard/ar/invoices"><ChevronRight className="h-4 w-4" /></Link>
                </Button>
              </div>
              <div className="flex items-center justify-between p-3 border rounded-lg">
                <div>
                  <p className="text-sm font-medium">AP Bills</p>
                  <p className="text-xs text-muted-foreground">{data.apBillsCount} active</p>
                </div>
                <Button size="sm" variant="ghost" asChild>
                  <Link href="/dashboard/ap/bills"><ChevronRight className="h-4 w-4" /></Link>
                </Button>
              </div>
              <div className="flex items-center justify-between p-3 border rounded-lg">
                <div>
                  <p className="text-sm font-medium">View Financial Reports</p>
                  <p className="text-xs text-muted-foreground">Performance & position</p>
                </div>
                <Button size="sm" variant="ghost" asChild>
                  <Link href="/dashboard/reports"><TrendingUp className="h-4 w-4" /></Link>
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
