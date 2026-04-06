"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, Download, Printer, RefreshCcw, BookOpen, ArrowUpRight, ArrowDownRight } from "lucide-react";
import { format } from "date-fns";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import Link from "next/link";

type GLRow = {
  id: string; date: string; entryNumber: string;
  voucherId?: string; voucherNumber?: string; voucherType?: string;
  accountCode: string; accountName: string; accountType: string;
  description: string; costCentre?: string; fund?: string;
  debit: number; credit: number; currency: string;
};

type ByAccount = {
  accountCode: string; accountName: string; accountType: string;
  totalDebit: number; totalCredit: number; net: number;
};

type Summary = { totalDebits: number; totalCredits: number; netMovement: number };

const ACCOUNT_TYPES = ["ASSET", "LIABILITY", "EQUITY", "REVENUE", "EXPENSE"];
const VOUCHER_TYPES = ["JOURNAL", "AR_INVOICE", "AR_RECEIPT", "AP_BILL", "AP_PAYMENT", "CASHBOOK"];

function fmt(n: number) {
  return Math.abs(n).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export default function ConsolidatedLedgerPage() {
  const currentYear = new Date().getFullYear();
  const [startDate, setStartDate] = useState(`${currentYear}-01-01`);
  const [endDate, setEndDate] = useState(new Date().toISOString().split("T")[0]);
  const [accountType, setAccountType] = useState("all");
  const [sourceModule, setSourceModule] = useState("all");
  const [reportingCurrency, setReportingCurrency] = useState("ZWG");
  const [view, setView] = useState<"detail" | "summary">("detail");

  const [data, setData] = useState<{ entries: GLRow[]; byAccount: ByAccount[]; summary: Summary; totalCount: number; page: number; totalPages: number } | null>(null);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);

  async function load(p = page) {
    setLoading(true);
    try {
      const params = new URLSearchParams({ startDate, endDate, page: p.toString(), pageSize: "100" });
      if (accountType && accountType !== "all") params.set("accountType", accountType);
      if (sourceModule && sourceModule !== "all") params.set("sourceModule", sourceModule);
      if (reportingCurrency) params.set("reportingCurrency", reportingCurrency);
      const res = await fetch(`/api/reports/consolidated-ledger?${params}`);
      if (!res.ok) throw new Error(await res.text());
      setData(await res.json());
      setPage(p);
    } catch (e: any) { toast.error(e.message); }
    finally { setLoading(false); }
  }

  useEffect(() => { load(1); }, []); // eslint-disable-line

  function exportCSV() {
    if (!data) return;
    const headers = ["Date", "Entry#", "Voucher#", "Type", "Account Code", "Account Name", "Account Type", "Description", "Cost Centre", "Fund", "Debit", "Credit", "Currency"];
    const rows = data.entries.map((r) => [
      format(new Date(r.date), "yyyy-MM-dd"), r.entryNumber, r.voucherNumber ?? "", r.voucherType ?? "",
      r.accountCode, r.accountName, r.accountType, `"${r.description}"`,
      r.costCentre ?? "", r.fund ?? "", r.debit, r.credit, r.currency,
    ].join(","));
    const blob = new Blob([headers.join(",") + "\n" + rows.join("\n")], { type: "text/csv" });
    const a = document.createElement("a"); a.href = URL.createObjectURL(blob);
    a.download = `consolidated-ledger-${startDate}-${endDate}.csv`; a.click();
  }

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6 print:p-4">
      {/* Header */}
      <div className="flex items-start justify-between gap-4 print:hidden">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
            <BookOpen className="h-6 w-6 text-indigo-500" /> Consolidated General Ledger
          </h1>
          <p className="text-sm text-slate-500 mt-1">All posted journal entries across all accounts — filterable by type, module, and currency</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => window.print()}><Printer className="h-4 w-4 mr-1" />Print</Button>
          <Button variant="outline" size="sm" onClick={exportCSV} disabled={!data}><Download className="h-4 w-4 mr-1" />CSV</Button>
        </div>
      </div>

      {/* Filters */}
      <Card className="print:hidden">
        <CardContent className="pt-4">
          <div className="flex flex-wrap gap-3 items-end">
            <div>
              <label className="text-xs font-medium text-slate-500 block mb-1">From</label>
              <Input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className="w-36" />
            </div>
            <div>
              <label className="text-xs font-medium text-slate-500 block mb-1">To</label>
              <Input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} className="w-36" />
            </div>
            <div>
              <label className="text-xs font-medium text-slate-500 block mb-1">Account Type</label>
              <Select value={accountType} onValueChange={setAccountType}>
                <SelectTrigger className="w-36"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Types</SelectItem>
                  {ACCOUNT_TYPES.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-xs font-medium text-slate-500 block mb-1">Source Module</label>
              <Select value={sourceModule} onValueChange={setSourceModule}>
                <SelectTrigger className="w-44"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Modules</SelectItem>
                  {VOUCHER_TYPES.map((t) => <SelectItem key={t} value={t}>{t.replace("_", " ")}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-xs font-medium text-slate-500 block mb-1">Currency</label>
              <Select value={reportingCurrency} onValueChange={setReportingCurrency}>
                <SelectTrigger className="w-24"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="ZWG">ZWG</SelectItem>
                  <SelectItem value="USD">USD</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-xs font-medium text-slate-500 block mb-1">View</label>
              <Select value={view} onValueChange={(v) => setView(v as "detail" | "summary")}>
                <SelectTrigger className="w-28"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="detail">Detail</SelectItem>
                  <SelectItem value="summary">By Account</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Button onClick={() => load(1)} disabled={loading}>
              {loading ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <RefreshCcw className="h-4 w-4 mr-1" />}
              Run
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Summary cards */}
      {data && (
        <div className="grid grid-cols-3 gap-4">
          <Card><CardContent className="pt-4">
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">Total Entries</p>
            <p className="text-3xl font-bold">{data.totalCount.toLocaleString()}</p>
          </CardContent></Card>
          <Card><CardContent className="pt-4">
            <p className="text-xs font-semibold text-blue-600 uppercase tracking-wide mb-1">Total Debits</p>
            <p className="text-2xl font-bold text-blue-600">{reportingCurrency} {fmt(data.summary.totalDebits)}</p>
          </CardContent></Card>
          <Card><CardContent className="pt-4">
            <p className="text-xs font-semibold text-indigo-600 uppercase tracking-wide mb-1">Total Credits</p>
            <p className="text-2xl font-bold text-indigo-600">{reportingCurrency} {fmt(data.summary.totalCredits)}</p>
          </CardContent></Card>
        </div>
      )}

      {/* Detail view */}
      {view === "detail" && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              Journal Entries
              {data && <span className="ml-auto text-xs font-normal text-slate-400">Page {data.page} of {data.totalPages} ({data.totalCount} entries)</span>}
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {loading ? (
              <div className="flex justify-center py-16"><Loader2 className="h-6 w-6 animate-spin text-slate-400" /></div>
            ) : (
              <>
                <div className="overflow-x-auto">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="border-b bg-slate-50">
                        {["Date","Entry#","Voucher","Account","Description","CC / Fund","Debit","Credit"].map((h) => (
                          <th key={h} className="text-left px-3 py-2.5 font-semibold text-slate-500 uppercase tracking-wide whitespace-nowrap">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {data?.entries.map((row) => (
                        <tr key={row.id} className="border-b hover:bg-slate-50 transition-colors">
                          <td className="px-3 py-2 text-slate-500 whitespace-nowrap">{format(new Date(row.date), "dd MMM yyyy")}</td>
                          <td className="px-3 py-2 font-mono text-slate-400">{row.entryNumber}</td>
                          <td className="px-3 py-2">
                            {row.voucherId ? (
                              <Link href={`/dashboard/vouchers/${row.voucherId}`} className="text-blue-600 hover:underline font-medium">
                                {row.voucherNumber}
                              </Link>
                            ) : <span className="text-slate-400">—</span>}
                            {row.voucherType && <span className="ml-1 text-slate-400">({row.voucherType})</span>}
                          </td>
                          <td className="px-3 py-2">
                            <p className="font-medium text-slate-800">{row.accountCode}</p>
                            <p className="text-slate-400">{row.accountName}</p>
                          </td>
                          <td className="px-3 py-2 text-slate-600 max-w-[200px] truncate" title={row.description}>{row.description}</td>
                          <td className="px-3 py-2 text-slate-400">{[row.costCentre, row.fund].filter(Boolean).join(" / ") || "—"}</td>
                          <td className="px-3 py-2 text-right font-medium text-blue-700">
                            {row.debit > 0 ? <span className="flex items-center justify-end gap-0.5"><ArrowUpRight className="h-3 w-3" />{fmt(row.debit)}</span> : "—"}
                          </td>
                          <td className="px-3 py-2 text-right font-medium text-indigo-700">
                            {row.credit > 0 ? <span className="flex items-center justify-end gap-0.5"><ArrowDownRight className="h-3 w-3" />{fmt(row.credit)}</span> : "—"}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Pagination */}
                {data && data.totalPages > 1 && (
                  <div className="flex items-center justify-between px-4 py-3 border-t bg-slate-50">
                    <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => load(page - 1)}>Previous</Button>
                    <span className="text-sm text-slate-500">Page {data.page} of {data.totalPages}</span>
                    <Button variant="outline" size="sm" disabled={page >= data.totalPages} onClick={() => load(page + 1)}>Next</Button>
                  </div>
                )}
              </>
            )}
          </CardContent>
        </Card>
      )}

      {/* Summary / by-account view */}
      {view === "summary" && (
        <Card>
          <CardHeader><CardTitle className="text-base">Account Summary</CardTitle></CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-slate-50">
                    {["Account Code","Account Name","Type","Total Debit","Total Credit","Net"].map((h) => (
                      <th key={h} className={cn("px-4 py-3 font-semibold text-slate-500 text-xs uppercase tracking-wide", h.includes("Total") || h === "Net" ? "text-right" : "text-left")}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {data?.byAccount.map((row) => (
                    <tr key={row.accountCode} className="border-b hover:bg-slate-50">
                      <td className="px-4 py-2.5 font-mono text-slate-600">{row.accountCode}</td>
                      <td className="px-4 py-2.5 font-medium text-slate-800">{row.accountName}</td>
                      <td className="px-4 py-2.5"><span className="text-xs bg-slate-100 text-slate-600 rounded px-1.5 py-0.5">{row.accountType}</span></td>
                      <td className="px-4 py-2.5 text-right text-blue-600 font-medium">{fmt(row.totalDebit)}</td>
                      <td className="px-4 py-2.5 text-right text-indigo-600 font-medium">{fmt(row.totalCredit)}</td>
                      <td className={cn("px-4 py-2.5 text-right font-bold", row.net >= 0 ? "text-emerald-600" : "text-rose-600")}>
                        {row.net >= 0 ? "+" : ""}{fmt(row.net)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
