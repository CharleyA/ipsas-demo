"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import {
  Card, CardContent, CardDescription, CardHeader, CardTitle,
} from "@/components/ui/card";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  ArrowLeft, Loader2, RefreshCcw, Printer, ChevronDown, ChevronRight,
  Building2, BarChart2,
} from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/components/providers/auth-provider";
import { cn } from "@/lib/utils";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Cell,
} from "recharts";
import { format } from "date-fns";

const BAR_COLORS = ["#6366f1", "#8b5cf6", "#06b6d4", "#10b981", "#f59e0b", "#ef4444", "#ec4899", "#64748b"];

export default function DepartmentalExpenditurePage() {
  const { token } = useAuth();
  const [data, setData] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [startDate, setStartDate] = useState(
    new Date(new Date().getFullYear(), 0, 1).toISOString().split("T")[0]
  );
  const [endDate, setEndDate] = useState(new Date().toISOString().split("T")[0]);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  const fetchReport = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await fetch(
        `/api/reports/departmental-expenditure?startDate=${startDate}&endDate=${endDate}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      const d = await res.json();
      if (!res.ok) throw new Error(d.error || "Failed to load report");
      setData(d);
      // Auto-expand first department
      if (d.departments?.length > 0) {
        setExpanded(new Set([d.departments[0].costCentreId]));
      }
    } catch (e: any) {
      toast.error(e.message);
      setData(null);
    } finally {
      setIsLoading(false);
    }
  }, [token, startDate, endDate]);

  useEffect(() => {
    if (token) fetchReport();
  }, [token, fetchReport]);

  const toggleExpand = (id: string) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const exportCSV = () => {
    if (!data?.departments) return;
    const rows: string[][] = [
      ["Department", "Account Code", "Account Name", "Amount"],
    ];
    data.departments.forEach((dept: any) => {
      dept.accounts.forEach((acc: any) => {
        rows.push([dept.costCentreName, acc.code, acc.name, acc.amount.toFixed(2)]);
      });
      rows.push([dept.costCentreName, "TOTAL", "", dept.total.toFixed(2)]);
    });
    rows.push(["GRAND TOTAL", "", "", data.grandTotal.toFixed(2)]);
    const csv = rows.map((r) => r.join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `departmental-expenditure-${startDate}-to-${endDate}.csv`;
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
              <span className="px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider bg-purple-50 text-purple-600 rounded-full border border-purple-100">
                Cost Analysis
              </span>
            </div>
            <h1 className="text-3xl font-extrabold tracking-tight">Departmental Expenditure</h1>
            <p className="text-muted-foreground text-sm">
              {data
                ? `${format(new Date(data.startDate), "d MMM yyyy")} – ${format(new Date(data.endDate), "d MMM yyyy")}`
                : "Expense breakdown by cost centre"}
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
            <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Start Date</label>
            <Input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="w-44"
            />
          </div>
          <div className="space-y-1">
            <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider">End Date</label>
            <Input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="w-44"
            />
          </div>
          <Button onClick={fetchReport} disabled={isLoading} variant="secondary" size="sm">
            {isLoading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <RefreshCcw className="w-4 h-4 mr-2" />}
            Refresh
          </Button>
        </CardContent>
      </Card>

      {isLoading ? (
        <div className="flex flex-col items-center justify-center py-24 gap-4">
          <Loader2 className="w-12 h-12 animate-spin text-purple-500" />
          <p className="text-muted-foreground animate-pulse">Aggregating departmental spend...</p>
        </div>
      ) : !data || data.departments?.length === 0 ? (
        <div className="text-center py-24 bg-slate-50 rounded-2xl border-2 border-dashed border-slate-200">
          <BarChart2 className="w-12 h-12 text-slate-300 mx-auto mb-4" />
          <h3 className="text-lg font-bold">No Expenditure Data</h3>
          <p className="text-slate-500 max-w-xs mx-auto mt-2">
            No posted expense entries found for the selected period.
          </p>
        </div>
      ) : (
        <>
          {/* KPI */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card className="bg-purple-50/40 border-purple-100">
              <CardContent className="p-6">
                <p className="text-xs font-bold text-purple-600 uppercase tracking-wider mb-1">Total Expenditure</p>
                <p className="text-2xl font-bold text-purple-800">
                  {Number(data.grandTotal).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                </p>
              </CardContent>
            </Card>
            <Card className="bg-slate-50/50 border-slate-200">
              <CardContent className="p-6">
                <p className="text-xs font-bold text-slate-600 uppercase tracking-wider mb-1">Departments</p>
                <p className="text-2xl font-bold text-slate-800">{data.departments.length}</p>
              </CardContent>
            </Card>
            <Card className="bg-indigo-50/40 border-indigo-100">
              <CardContent className="p-6">
                <p className="text-xs font-bold text-indigo-600 uppercase tracking-wider mb-1">Largest Dept</p>
                <p className="text-2xl font-bold text-indigo-800">
                  {data.departments[0]?.costCentreName ?? "—"}
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  {data.grandTotal > 0
                    ? `${((data.departments[0]?.total / data.grandTotal) * 100).toFixed(1)}% of total`
                    : ""}
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Chart */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Building2 className="w-4 h-4 text-purple-500" />
                Top Departments by Expenditure
              </CardTitle>
              <CardDescription>Highest spending cost centres</CardDescription>
            </CardHeader>
            <CardContent className="h-[280px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={data.chartData} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} />
                  <XAxis type="number" fontSize={10} tickLine={false} />
                  <YAxis dataKey="name" type="category" width={140} fontSize={10} tickLine={false} axisLine={false} />
                  <Tooltip
                    formatter={(v: any) => Number(v).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                  />
                  <Bar dataKey="amount" name="Expenditure" radius={[0, 4, 4, 0]} barSize={20}>
                    {data.chartData.map((_: any, i: number) => (
                      <Cell key={i} fill={BAR_COLORS[i % BAR_COLORS.length]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Expandable Department Table */}
          <Card>
            <CardHeader className="bg-muted/30 border-b">
              <CardTitle>Breakdown by Department</CardTitle>
              <CardDescription>Click a department row to expand account detail</CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-8" />
                    <TableHead>Department / Account</TableHead>
                    <TableHead className="text-right">Amount</TableHead>
                    <TableHead className="text-right">% of Total</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.departments.map((dept: any) => {
                    const isOpen = expanded.has(dept.costCentreId);
                    const pct = data.grandTotal > 0 ? (dept.total / data.grandTotal) * 100 : 0;
                    return [
                      <TableRow
                        key={dept.costCentreId}
                        className="cursor-pointer hover:bg-muted/40 bg-muted/20"
                        onClick={() => toggleExpand(dept.costCentreId)}
                      >
                        <TableCell className="py-3">
                          {isOpen
                            ? <ChevronDown className="w-4 h-4 text-primary" />
                            : <ChevronRight className="w-4 h-4 text-muted-foreground" />}
                        </TableCell>
                        <TableCell className="font-semibold">
                          <div className="flex items-center gap-2">
                            <Building2 className="w-4 h-4 text-purple-500" />
                            {dept.costCentreName}
                            <Badge variant="outline" className="text-xs ml-1">
                              {dept.accounts.length} lines
                            </Badge>
                          </div>
                        </TableCell>
                        <TableCell className="text-right font-mono font-bold">
                          {Number(dept.total).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-2">
                            <div className="w-16 bg-muted rounded-full h-1.5">
                              <div
                                className="h-1.5 rounded-full bg-purple-500"
                                style={{ width: `${Math.min(pct, 100)}%` }}
                              />
                            </div>
                            <span className="text-xs text-muted-foreground w-10 text-right">
                              {pct.toFixed(1)}%
                            </span>
                          </div>
                        </TableCell>
                      </TableRow>,
                      ...(isOpen
                        ? dept.accounts.map((acc: any) => (
                            <TableRow key={`${dept.costCentreId}-${acc.id}`} className="hover:bg-muted/20">
                              <TableCell />
                              <TableCell className="pl-10 text-sm text-muted-foreground">
                                <span className="font-mono text-xs mr-2">{acc.code}</span>
                                {acc.name}
                              </TableCell>
                              <TableCell className="text-right font-mono text-sm">
                                {Number(acc.amount).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                              </TableCell>
                              <TableCell className="text-right text-xs text-muted-foreground">
                                {dept.total > 0 ? ((acc.amount / dept.total) * 100).toFixed(1) : "0"}%
                              </TableCell>
                            </TableRow>
                          ))
                        : []),
                    ];
                  })}
                  <TableRow className="bg-slate-800 font-bold hover:bg-slate-800">
                    <TableCell />
                    <TableCell className="text-white font-black uppercase tracking-wider text-sm">Grand Total</TableCell>
                    <TableCell className="text-right font-mono font-black text-white text-base">
                      {Number(data.grandTotal).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                    </TableCell>
                    <TableCell className="text-right text-white/70 text-sm">100%</TableCell>
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
