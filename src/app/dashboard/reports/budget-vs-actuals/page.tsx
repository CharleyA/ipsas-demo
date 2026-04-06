"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import {
  Card, CardContent, CardDescription, CardHeader, CardTitle,
} from "@/components/ui/card";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  ArrowLeft, Loader2, RefreshCcw, Printer, TrendingUp, TrendingDown,
  CheckCircle2, AlertTriangle, BarChart2,
} from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/components/providers/auth-provider";
import { cn } from "@/lib/utils";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  ResponsiveContainer, Cell,
} from "recharts";

export default function BudgetVsActualsPage() {
  const { token, user } = useAuth();
  const [data, setData] = useState<any>(null);
  const [budgets, setBudgets] = useState<any[]>([]);
  const [selectedBudget, setSelectedBudget] = useState<string>("latest");
  const [isLoading, setIsLoading] = useState(true);

  const fetchBudgets = useCallback(async () => {
    try {
      const res = await fetch("/api/budgets", {
        headers: { Authorization: `Bearer ${token}` },
      });
      const d = await res.json();
      const approved = Array.isArray(d)
        ? d.filter((b: any) => ["APPROVED", "LOCKED"].includes(b.status))
        : [];
      setBudgets(approved);
    } catch {
      // silently fail
    }
  }, [token]);

  const fetchReport = useCallback(async () => {
    setIsLoading(true);
    try {
      const params = new URLSearchParams();
      if (selectedBudget !== "latest") params.set("budgetId", selectedBudget);
      const res = await fetch(`/api/reports/budget-vs-actuals?${params}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const d = await res.json();
      if (!res.ok) throw new Error(d.error || "Failed to load report");
      setData(d);
    } catch (e: any) {
      toast.error(e.message);
      setData(null);
    } finally {
      setIsLoading(false);
    }
  }, [token, selectedBudget]);

  useEffect(() => {
    if (token) fetchBudgets();
  }, [token, fetchBudgets]);

  useEffect(() => {
    if (token) fetchReport();
  }, [token, fetchReport]);

  const exportCSV = () => {
    if (!data?.rows) return;
    const headers = ["Account Code", "Account Name", "Type", "Fund", "Cost Centre", "Budgeted", "Actual", "Variance", "Variance %", "Utilised %"];
    const rows = data.rows.map((r: any) => [
      r.accountCode, r.accountName, r.accountType, r.fund, r.costCentre,
      r.budgeted.toFixed(2), r.actual.toFixed(2), r.variance.toFixed(2),
      r.variancePct.toFixed(1), r.utilized.toFixed(1),
    ]);
    const csv = [headers, ...rows].map((r) => r.join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `budget-vs-actuals-${new Date().toISOString().split("T")[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 print:hidden">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" asChild>
            <Link href="/dashboard/reports">
              <ArrowLeft className="w-4 h-4" />
            </Link>
          </Button>
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider bg-blue-50 text-blue-600 rounded-full border border-blue-100">
                Budget Control
              </span>
            </div>
            <h1 className="text-3xl font-extrabold tracking-tight">Budget vs Actuals</h1>
            <p className="text-muted-foreground text-sm">
              {data?.budget ? `${data.budget.fiscalPeriod} — v${data.budget.version} (${data.budget.status})` : "Select an approved budget"}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={exportCSV} disabled={!data}>
            Export CSV
          </Button>
          <Button variant="outline" size="sm" onClick={() => window.print()}>
            <Printer className="w-4 h-4 mr-2" /> Print
          </Button>
        </div>
      </div>

      {/* Filters */}
      <Card className="print:hidden">
        <CardContent className="p-4 flex flex-wrap items-end gap-4">
          <div className="space-y-1">
            <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Budget</label>
            <Select value={selectedBudget} onValueChange={setSelectedBudget}>
              <SelectTrigger className="w-[280px]">
                <SelectValue placeholder="Select budget..." />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="latest">Latest Approved Budget</SelectItem>
                {budgets.map((b) => (
                  <SelectItem key={b.id} value={b.id}>
                    {b.fiscalPeriod?.name ?? b.fiscalPeriodId} — v{b.version} ({b.status})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <Button onClick={fetchReport} disabled={isLoading} variant="secondary" size="sm">
            {isLoading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <RefreshCcw className="w-4 h-4 mr-2" />}
            Refresh
          </Button>
        </CardContent>
      </Card>

      {isLoading ? (
        <div className="flex flex-col items-center justify-center py-24 gap-4">
          <Loader2 className="w-12 h-12 animate-spin text-primary" />
          <p className="text-muted-foreground animate-pulse">Comparing budget to actuals...</p>
        </div>
      ) : !data ? (
        <div className="text-center py-24 bg-slate-50 rounded-2xl border-2 border-dashed border-slate-200">
          <BarChart2 className="w-12 h-12 text-slate-300 mx-auto mb-4" />
          <h3 className="text-lg font-bold">No Budget Data</h3>
          <p className="text-slate-500 max-w-xs mx-auto mt-2">
            No approved budget found. Please approve a budget from the Budgets module first.
          </p>
          <Button asChild className="mt-4" variant="outline">
            <Link href="/dashboard/budgets">Go to Budgets</Link>
          </Button>
        </div>
      ) : (
        <>
          {/* Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card className="bg-blue-50/50 border-blue-100">
              <CardContent className="p-6">
                <p className="text-xs font-bold text-blue-600 uppercase tracking-wider mb-1">Total Budgeted</p>
                <p className="text-2xl font-bold text-blue-800">
                  {Number(data.summary.totalBudgeted).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                </p>
              </CardContent>
            </Card>
            <Card className="bg-slate-50/50 border-slate-200">
              <CardContent className="p-6">
                <p className="text-xs font-bold text-slate-600 uppercase tracking-wider mb-1">Total Actual</p>
                <p className="text-2xl font-bold text-slate-800">
                  {Number(data.summary.totalActual).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                </p>
              </CardContent>
            </Card>
            <Card className={cn(
              "border",
              data.summary.totalVariance > 0
                ? "bg-rose-50/50 border-rose-100"
                : "bg-emerald-50/50 border-emerald-100"
            )}>
              <CardContent className="p-6">
                <p className={cn("text-xs font-bold uppercase tracking-wider mb-1",
                  data.summary.totalVariance > 0 ? "text-rose-600" : "text-emerald-600"
                )}>
                  Variance (Actual − Budget)
                </p>
                <div className="flex items-center gap-2">
                  {data.summary.totalVariance > 0
                    ? <TrendingUp className="w-5 h-5 text-rose-500" />
                    : <TrendingDown className="w-5 h-5 text-emerald-500" />}
                  <p className={cn("text-2xl font-bold",
                    data.summary.totalVariance > 0 ? "text-rose-700" : "text-emerald-700"
                  )}>
                    {Number(data.summary.totalVariance).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Charts */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Budget vs Actual by Account Type</CardTitle>
                <CardDescription>Grouped comparison across account categories</CardDescription>
              </CardHeader>
              <CardContent className="h-[280px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={data.chartData.byType}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                    <XAxis dataKey="name" fontSize={11} tickLine={false} axisLine={false} />
                    <YAxis fontSize={11} tickLine={false} axisLine={false} />
                    <Tooltip formatter={(v: any) => Number(v).toLocaleString(undefined, { minimumFractionDigits: 2 })} />
                    <Legend />
                    <Bar dataKey="budgeted" name="Budgeted" fill="#6366f1" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="actual" name="Actual" fill="#f59e0b" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Top Over-Budget Lines</CardTitle>
                <CardDescription>Accounts with highest expenditure above budget</CardDescription>
              </CardHeader>
              <CardContent className="h-[280px]">
                {data.chartData.overBudget.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-full gap-2 text-emerald-600">
                    <CheckCircle2 className="w-10 h-10" />
                    <p className="text-sm font-semibold">All within budget!</p>
                  </div>
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={data.chartData.overBudget} layout="vertical">
                      <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} />
                      <XAxis type="number" fontSize={10} tickLine={false} />
                      <YAxis dataKey="name" type="category" width={130} fontSize={10} tickLine={false} axisLine={false} />
                      <Tooltip formatter={(v: any) => Number(v).toLocaleString(undefined, { minimumFractionDigits: 2 })} />
                      <Bar dataKey="variance" name="Over Budget" fill="#ef4444" radius={[0, 4, 4, 0]} barSize={18}>
                        {data.chartData.overBudget.map((_: any, i: number) => (
                          <Cell key={i} fill={i < 3 ? "#ef4444" : "#f87171"} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Detail Table */}
          <Card>
            <CardHeader className="bg-muted/30 border-b">
              <CardTitle>Line-by-Line Comparison</CardTitle>
              <CardDescription>{data.rows.length} budget lines</CardDescription>
            </CardHeader>
            <CardContent className="p-0 overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Account</TableHead>
                    <TableHead>Fund</TableHead>
                    <TableHead>Cost Centre</TableHead>
                    <TableHead className="text-right">Budgeted</TableHead>
                    <TableHead className="text-right">Actual</TableHead>
                    <TableHead className="text-right">Variance</TableHead>
                    <TableHead className="text-right">Utilised</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.rows.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={8} className="h-24 text-center text-muted-foreground">
                        No budget lines found.
                      </TableCell>
                    </TableRow>
                  ) : (
                    data.rows.map((row: any, i: number) => {
                      const over = row.variance > 0;
                      const pct = row.utilized;
                      return (
                        <TableRow key={i} className="hover:bg-muted/30">
                          <TableCell>
                            <div className="font-mono text-xs text-muted-foreground">{row.accountCode}</div>
                            <div className="font-medium text-sm">{row.accountName}</div>
                          </TableCell>
                          <TableCell className="text-sm text-muted-foreground">{row.fund}</TableCell>
                          <TableCell className="text-sm text-muted-foreground">{row.costCentre}</TableCell>
                          <TableCell className="text-right font-mono text-sm">
                            {Number(row.budgeted).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                          </TableCell>
                          <TableCell className="text-right font-mono text-sm">
                            {Number(row.actual).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                          </TableCell>
                          <TableCell className={cn("text-right font-mono text-sm font-semibold", over ? "text-rose-600" : "text-emerald-600")}>
                            {over ? "+" : ""}{Number(row.variance).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                          </TableCell>
                          <TableCell className="text-right font-mono text-sm">
                            <div className="flex items-center justify-end gap-2">
                              <div className="w-16 bg-muted rounded-full h-1.5">
                                <div
                                  className={cn("h-1.5 rounded-full", pct > 100 ? "bg-rose-500" : pct > 80 ? "bg-amber-500" : "bg-emerald-500")}
                                  style={{ width: `${Math.min(pct, 100)}%` }}
                                />
                              </div>
                              <span className={cn("text-xs", pct > 100 ? "text-rose-600" : "text-muted-foreground")}>
                                {pct.toFixed(0)}%
                              </span>
                            </div>
                          </TableCell>
                          <TableCell>
                            {pct > 100 ? (
                              <Badge variant="outline" className="text-xs bg-rose-50 border-rose-200 text-rose-700">
                                <AlertTriangle className="w-3 h-3 mr-1" /> Over
                              </Badge>
                            ) : pct > 80 ? (
                              <Badge variant="outline" className="text-xs bg-amber-50 border-amber-200 text-amber-700">
                                Near
                              </Badge>
                            ) : (
                              <Badge variant="outline" className="text-xs bg-emerald-50 border-emerald-200 text-emerald-700">
                                <CheckCircle2 className="w-3 h-3 mr-1" /> OK
                              </Badge>
                            )}
                          </TableCell>
                        </TableRow>
                      );
                    })
                  )}
                  <TableRow className="bg-muted/40 font-bold">
                    <TableCell colSpan={3} className="text-right text-sm">Total</TableCell>
                    <TableCell className="text-right font-mono">
                      {Number(data.summary.totalBudgeted).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                    </TableCell>
                    <TableCell className="text-right font-mono">
                      {Number(data.summary.totalActual).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                    </TableCell>
                    <TableCell className={cn("text-right font-mono", data.summary.totalVariance > 0 ? "text-rose-600" : "text-emerald-600")}>
                      {data.summary.totalVariance > 0 ? "+" : ""}
                      {Number(data.summary.totalVariance).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                    </TableCell>
                    <TableCell colSpan={2} />
                  </TableRow>
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </>
      )}

      <style jsx global>{`
        @media print {
          @page { size: landscape; margin: 0.5cm; }
          body { background: white !important; }
          .print\\:hidden { display: none !important; }
        }
      `}</style>
    </div>
  );
}
