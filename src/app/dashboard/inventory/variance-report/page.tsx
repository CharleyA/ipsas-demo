"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Loader2,
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  Download,
  Printer,
  RefreshCcw,
  PackageSearch,
} from "lucide-react";
import { format } from "date-fns";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

type VarianceRow = {
  id: string;
  sessionRef: string;
  countDate: string;
  itemCode: string;
  itemName: string;
  uom: string;
  category: string;
  systemQty: number;
  physicalQty: number;
  variance: number;
  avgCost: number;
  valueImpact: number;
  notes: string | null;
};

type Summary = {
  totalVarianceLines: number;
  totalPositive: number;
  totalNegative: number;
  totalValueImpact: number;
  totalPositiveValue: number;
  totalNegativeValue: number;
};

type Session = { id: string; reference: string; countDate: string };

function fmt(n: number, decimals = 2) {
  return n.toLocaleString(undefined, {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
}

export default function VarianceReportPage() {
  const [rows, setRows] = useState<VarianceRow[]>([]);
  const [summary, setSummary] = useState<Summary | null>(null);
  const [sessions, setSessions] = useState<Session[]>([]);
  const [loading, setLoading] = useState(false);

  const currentYear = new Date().getFullYear();
  const [fromDate, setFromDate] = useState(`${currentYear}-01-01`);
  const [toDate, setToDate] = useState(new Date().toISOString().split("T")[0]);
  const [sessionId, setSessionId] = useState("all");

  async function load() {
    setLoading(true);
    try {
      const params = new URLSearchParams({ fromDate, toDate });
      if (sessionId && sessionId !== "all") params.set("sessionId", sessionId);
      const res = await fetch(`/api/inventory/variance-report?${params}`);
      if (!res.ok) throw new Error(await res.text());
      const data = await res.json();
      setRows(data.rows);
      setSummary(data.summary);
      setSessions(data.sessions);
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, []); // eslint-disable-line

  function exportCSV() {
    const headers = ["Session","Count Date","Item Code","Item Name","Category","UOM","System Qty","Physical Qty","Variance","Avg Cost","Value Impact","Notes"];
    const csvRows = rows.map((r) => [
      r.sessionRef, format(new Date(r.countDate), "yyyy-MM-dd"),
      r.itemCode, r.itemName, r.category, r.uom,
      r.systemQty, r.physicalQty, r.variance, r.avgCost, r.valueImpact,
      r.notes ?? "",
    ].join(","));
    const blob = new Blob([headers.join(",") + "\n" + csvRows.join("\n")], { type: "text/csv" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `variance-report-${fromDate}-to-${toDate}.csv`;
    a.click();
  }

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6 print:p-4">
      {/* Header */}
      <div className="flex items-start justify-between gap-4 print:hidden">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Stock Variance Report</h1>
          <p className="text-sm text-slate-500 mt-1">
            Differences between physical counts and system quantities from posted stock takes
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => window.print()}>
            <Printer className="h-4 w-4 mr-1" /> Print
          </Button>
          <Button variant="outline" size="sm" onClick={exportCSV} disabled={rows.length === 0}>
            <Download className="h-4 w-4 mr-1" /> Export CSV
          </Button>
        </div>
      </div>

      {/* Filters */}
      <Card className="print:hidden">
        <CardContent className="pt-4">
          <div className="flex flex-wrap gap-3 items-end">
            <div>
              <label className="text-xs font-medium text-slate-500 block mb-1">From Date</label>
              <Input type="date" value={fromDate} onChange={(e) => setFromDate(e.target.value)} className="w-36" />
            </div>
            <div>
              <label className="text-xs font-medium text-slate-500 block mb-1">To Date</label>
              <Input type="date" value={toDate} onChange={(e) => setToDate(e.target.value)} className="w-36" />
            </div>
            <div>
              <label className="text-xs font-medium text-slate-500 block mb-1">Stock Take Session</label>
              <Select value={sessionId} onValueChange={setSessionId}>
                <SelectTrigger className="w-52">
                  <SelectValue placeholder="All sessions" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All posted sessions</SelectItem>
                  {sessions.map((s) => (
                    <SelectItem key={s.id} value={s.id}>
                      {s.reference} — {format(new Date(s.countDate), "dd MMM yyyy")}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Button onClick={load} disabled={loading}>
              {loading ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <RefreshCcw className="h-4 w-4 mr-1" />}
              Run Report
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Summary cards */}
      {summary && (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
          <Card className="col-span-2 md:col-span-1">
            <CardContent className="pt-4">
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">Variance Lines</p>
              <p className="text-3xl font-bold text-slate-900">{summary.totalVarianceLines}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4">
              <p className="text-xs font-semibold text-emerald-600 uppercase tracking-wide mb-1">Surplus (Qty)</p>
              <p className="text-2xl font-bold text-emerald-600">+{fmt(summary.totalPositive)}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4">
              <p className="text-xs font-semibold text-rose-600 uppercase tracking-wide mb-1">Shortage (Qty)</p>
              <p className="text-2xl font-bold text-rose-600">{fmt(summary.totalNegative)}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4">
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">Net Value Impact</p>
              <p className={cn("text-2xl font-bold", summary.totalValueImpact >= 0 ? "text-emerald-600" : "text-rose-600")}>
                {summary.totalValueImpact >= 0 ? "+" : ""}{fmt(summary.totalValueImpact)}
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4">
              <p className="text-xs font-semibold text-emerald-600 uppercase tracking-wide mb-1">Surplus Value</p>
              <p className="text-2xl font-bold text-emerald-600">+{fmt(summary.totalPositiveValue)}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4">
              <p className="text-xs font-semibold text-rose-600 uppercase tracking-wide mb-1">Shortage Value</p>
              <p className="text-2xl font-bold text-rose-600">{fmt(summary.totalNegativeValue)}</p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Table */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base font-semibold flex items-center gap-2">
            <PackageSearch className="h-5 w-5 text-slate-400" />
            Variance Detail
            {rows.length > 0 && (
              <span className="ml-auto text-xs font-normal text-slate-400">{rows.length} line{rows.length !== 1 ? "s" : ""}</span>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {loading ? (
            <div className="flex justify-center py-16">
              <Loader2 className="h-6 w-6 animate-spin text-slate-400" />
            </div>
          ) : rows.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-slate-400">
              <PackageSearch className="h-10 w-10 mb-3" />
              <p className="font-medium">No variances found</p>
              <p className="text-sm mt-1">All posted stock takes match system quantities, or no sessions in range.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-slate-50">
                    <th className="text-left px-4 py-3 font-semibold text-slate-600 text-xs uppercase tracking-wide">Session</th>
                    <th className="text-left px-4 py-3 font-semibold text-slate-600 text-xs uppercase tracking-wide">Count Date</th>
                    <th className="text-left px-4 py-3 font-semibold text-slate-600 text-xs uppercase tracking-wide">Item</th>
                    <th className="text-left px-4 py-3 font-semibold text-slate-600 text-xs uppercase tracking-wide">Category</th>
                    <th className="text-left px-4 py-3 font-semibold text-slate-600 text-xs uppercase tracking-wide">UOM</th>
                    <th className="text-right px-4 py-3 font-semibold text-slate-600 text-xs uppercase tracking-wide">System Qty</th>
                    <th className="text-right px-4 py-3 font-semibold text-slate-600 text-xs uppercase tracking-wide">Physical Qty</th>
                    <th className="text-right px-4 py-3 font-semibold text-slate-600 text-xs uppercase tracking-wide">Variance</th>
                    <th className="text-right px-4 py-3 font-semibold text-slate-600 text-xs uppercase tracking-wide">Avg Cost</th>
                    <th className="text-right px-4 py-3 font-semibold text-slate-600 text-xs uppercase tracking-wide">Value Impact</th>
                    <th className="text-left px-4 py-3 font-semibold text-slate-600 text-xs uppercase tracking-wide">Notes</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row) => (
                    <tr key={row.id} className={cn(
                      "border-b transition-colors hover:bg-slate-50",
                      row.variance < 0 ? "bg-rose-50/40" : "bg-emerald-50/30"
                    )}>
                      <td className="px-4 py-3 font-medium text-slate-700">{row.sessionRef}</td>
                      <td className="px-4 py-3 text-slate-500">{format(new Date(row.countDate), "dd MMM yyyy")}</td>
                      <td className="px-4 py-3">
                        <p className="font-medium text-slate-800">{row.itemName}</p>
                        <p className="text-xs text-slate-400">{row.itemCode}</p>
                      </td>
                      <td className="px-4 py-3 text-slate-500">{row.category}</td>
                      <td className="px-4 py-3 text-slate-500">{row.uom}</td>
                      <td className="px-4 py-3 text-right text-slate-600">{fmt(row.systemQty)}</td>
                      <td className="px-4 py-3 text-right text-slate-600">{fmt(row.physicalQty)}</td>
                      <td className={cn("px-4 py-3 text-right font-bold", row.variance > 0 ? "text-emerald-600" : "text-rose-600")}>
                        <span className="flex items-center justify-end gap-1">
                          {row.variance > 0
                            ? <TrendingUp className="h-3.5 w-3.5" />
                            : <TrendingDown className="h-3.5 w-3.5" />}
                          {row.variance > 0 ? "+" : ""}{fmt(row.variance)}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right text-slate-500">{fmt(row.avgCost)}</td>
                      <td className={cn("px-4 py-3 text-right font-semibold", row.valueImpact > 0 ? "text-emerald-600" : "text-rose-600")}>
                        {row.valueImpact > 0 ? "+" : ""}{fmt(row.valueImpact)}
                      </td>
                      <td className="px-4 py-3 text-xs text-slate-400">{row.notes ?? "—"}</td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="border-t-2 border-slate-200 bg-slate-50 font-semibold">
                    <td colSpan={7} className="px-4 py-3 text-right text-slate-600 text-xs uppercase tracking-wide">Totals</td>
                    <td className={cn("px-4 py-3 text-right font-bold", (summary?.totalPositive ?? 0) + (summary?.totalNegative ?? 0) >= 0 ? "text-emerald-600" : "text-rose-600")}>
                      {fmt((summary?.totalPositive ?? 0) + (summary?.totalNegative ?? 0))}
                    </td>
                    <td className="px-4 py-3" />
                    <td className={cn("px-4 py-3 text-right font-bold", (summary?.totalValueImpact ?? 0) >= 0 ? "text-emerald-600" : "text-rose-600")}>
                      {(summary?.totalValueImpact ?? 0) >= 0 ? "+" : ""}{fmt(summary?.totalValueImpact ?? 0)}
                    </td>
                    <td className="px-4 py-3" />
                  </tr>
                </tfoot>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Explanation banner */}
      {rows.length > 0 && (
        <div className="flex gap-3 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-amber-800 text-sm print:hidden">
          <AlertTriangle className="h-4 w-4 mt-0.5 flex-shrink-0" />
          <p>
            <strong>Variance adjustments have been posted to inventory.</strong> Positive variances (surplus) increase stock value; negative variances (shortage) reduce it. Review these with your Finance Manager and investigate root causes for significant shortages.
          </p>
        </div>
      )}
    </div>
  );
}
