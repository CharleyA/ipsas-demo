"use client";

import { useEffect, useState, useCallback, Suspense } from "react";
import { useSearchParams } from "next/navigation";
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
  ArrowLeft, Loader2, Printer, Building2, AlertCircle,
} from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/components/providers/auth-provider";
import { cn } from "@/lib/utils";
import { format } from "date-fns";

function SupplierStatementContent() {
  const { token } = useAuth();
  const searchParams = useSearchParams();
  const [suppliers, setSuppliers] = useState<any[]>([]);
  const [selectedSupplier, setSelectedSupplier] = useState(searchParams.get("supplierId") || "");
  const [statement, setStatement] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingSuppliers, setIsLoadingSuppliers] = useState(true);

  const fetchSuppliers = useCallback(async () => {
    try {
      const res = await fetch("/api/suppliers", {
        headers: { Authorization: `Bearer ${token}` },
      });
      const d = await res.json();
      const list = d?.data ?? d ?? [];
      setSuppliers(Array.isArray(list) ? list : []);
    } catch {
      toast.error("Failed to load suppliers");
    } finally {
      setIsLoadingSuppliers(false);
    }
  }, [token]);

  const fetchStatement = useCallback(async () => {
    if (!selectedSupplier) return;
    setIsLoading(true);
    try {
      const res = await fetch(`/api/ap/suppliers/${selectedSupplier}/statement`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const d = await res.json();
      if (!res.ok) throw new Error(d.error || "Failed to load statement");
      setStatement(d);
    } catch (e: any) {
      toast.error(e.message);
      setStatement(null);
    } finally {
      setIsLoading(false);
    }
  }, [token, selectedSupplier]);

  useEffect(() => {
    if (token) fetchSuppliers();
  }, [token, fetchSuppliers]);

  useEffect(() => {
    if (token && selectedSupplier) fetchStatement();
  }, [token, selectedSupplier, fetchStatement]);

  const selectedSupplierObj = suppliers.find((s) => s.id === selectedSupplier);

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
              <span className="px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider bg-amber-50 text-amber-600 rounded-full border border-amber-100">
                AP
              </span>
              <span className="text-muted-foreground text-xs">/</span>
              <span className="text-xs text-muted-foreground">Supplier Statement</span>
            </div>
            <h1 className="text-3xl font-extrabold tracking-tight">Supplier Statement</h1>
            <p className="text-muted-foreground text-sm">
              {selectedSupplierObj ? selectedSupplierObj.name : "Select a supplier to view statement"}
            </p>
          </div>
        </div>
        <Button variant="outline" size="sm" onClick={() => window.print()} disabled={!statement}>
          <Printer className="w-4 h-4 mr-2" /> Print
        </Button>
      </div>

      {/* Supplier Selector */}
      <Card className="print:hidden">
        <CardContent className="p-4 flex flex-wrap items-end gap-4">
          <div className="space-y-1 flex-1 min-w-[240px]">
            <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Supplier</label>
            {isLoadingSuppliers ? (
              <div className="flex items-center gap-2 h-10 text-sm text-muted-foreground">
                <Loader2 className="w-4 h-4 animate-spin" /> Loading suppliers...
              </div>
            ) : (
              <Select value={selectedSupplier} onValueChange={setSelectedSupplier}>
                <SelectTrigger className="w-full max-w-sm">
                  <SelectValue placeholder="Select supplier..." />
                </SelectTrigger>
                <SelectContent className="max-h-[300px]">
                  {suppliers.map((s) => (
                    <SelectItem key={s.id} value={s.id}>
                      {s.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>
        </CardContent>
      </Card>

      {!selectedSupplier ? (
        <div className="text-center py-24 bg-slate-50 rounded-2xl border-2 border-dashed border-slate-200">
          <Building2 className="w-12 h-12 text-slate-300 mx-auto mb-4" />
          <h3 className="text-lg font-bold">Select a Supplier</h3>
          <p className="text-slate-500 max-w-xs mx-auto mt-2">
            Choose a supplier from the dropdown above to view their account statement.
          </p>
        </div>
      ) : isLoading ? (
        <div className="flex flex-col items-center justify-center py-24 gap-4">
          <Loader2 className="w-12 h-12 animate-spin text-amber-500" />
          <p className="text-muted-foreground animate-pulse">Loading supplier statement...</p>
        </div>
      ) : !statement ? (
        <div className="text-center py-24 bg-slate-50 rounded-2xl border-2 border-dashed border-slate-200">
          <AlertCircle className="w-12 h-12 text-slate-300 mx-auto mb-4" />
          <h3 className="text-lg font-bold">No Statement Data</h3>
          <p className="text-slate-500 max-w-xs mx-auto mt-2">No transactions found for this supplier.</p>
        </div>
      ) : (
        <>
          {/* Print Header */}
          <div className="hidden print:block border-b-2 border-slate-900 pb-6 mb-8">
            <div className="flex justify-between items-start">
              <div>
                <h1 className="text-2xl font-black uppercase">Supplier Account Statement</h1>
                <p className="text-slate-600 font-bold mt-1 uppercase text-sm">{statement.supplier?.name}</p>
                <p className="text-slate-500 text-xs mt-1">Generated: {format(new Date(), "MMMM d, yyyy")}</p>
              </div>
              <div className="text-right">
                <p className="text-xs text-slate-400 uppercase">Outstanding Balance</p>
                <p className="text-xl font-bold">{Number(statement.outstandingBalance ?? 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}</p>
              </div>
            </div>
          </div>

          {/* KPI Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              { label: "Total Bills", value: statement.totalBills ?? 0, format: "count", color: "text-slate-800" },
              { label: "Total Invoiced", value: statement.totalInvoiced ?? 0, format: "money", color: "text-amber-700" },
              { label: "Total Paid", value: statement.totalPaid ?? 0, format: "money", color: "text-emerald-700" },
              { label: "Outstanding", value: statement.outstandingBalance ?? 0, format: "money", color: statement.outstandingBalance > 0 ? "text-rose-700" : "text-emerald-700" },
            ].map(({ label, value, format: fmt, color }) => (
              <Card key={label} className="shadow-sm">
                <CardContent className="p-4">
                  <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-1">{label}</p>
                  <p className={cn("text-xl font-bold", color)}>
                    {fmt === "money"
                      ? Number(value).toLocaleString(undefined, { minimumFractionDigits: 2 })
                      : value}
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Bills Table */}
          <Card>
            <CardHeader className="bg-muted/30 border-b">
              <CardTitle>Transaction History</CardTitle>
              <CardDescription>All bills and payments for {statement.supplier?.name}</CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Reference</TableHead>
                    <TableHead>Description</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead className="text-right">Amount</TableHead>
                    <TableHead className="text-right">Paid</TableHead>
                    <TableHead className="text-right">Balance</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {(statement.transactions ?? []).length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={8} className="h-24 text-center text-muted-foreground">
                        No transactions found.
                      </TableCell>
                    </TableRow>
                  ) : (
                    (statement.transactions ?? []).map((txn: any, i: number) => (
                      <TableRow key={i} className="hover:bg-muted/30">
                        <TableCell className="text-sm whitespace-nowrap">
                          {txn.date ? format(new Date(txn.date), "d MMM yyyy") : "—"}
                        </TableCell>
                        <TableCell className="font-mono text-sm">
                          {txn.billNumber ?? txn.reference ?? "—"}
                        </TableCell>
                        <TableCell className="text-sm max-w-[200px] truncate">
                          {txn.description ?? "—"}
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant="outline"
                            className={cn("text-xs",
                              txn.type === "PAYMENT"
                                ? "bg-green-50 border-green-200 text-green-700"
                                : "bg-amber-50 border-amber-200 text-amber-700"
                            )}
                          >
                            {txn.type ?? "BILL"}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right font-mono text-sm">
                          {Number(txn.amount ?? 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                        </TableCell>
                        <TableCell className="text-right font-mono text-sm text-emerald-600">
                          {txn.amountPaid != null
                            ? Number(txn.amountPaid).toLocaleString(undefined, { minimumFractionDigits: 2 })
                            : "—"}
                        </TableCell>
                        <TableCell className={cn("text-right font-mono text-sm font-semibold",
                          (txn.balance ?? 0) > 0 ? "text-rose-600" : "text-emerald-600"
                        )}>
                          {Number(txn.balance ?? 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                        </TableCell>
                        <TableCell>
                          {txn.status && (
                            <Badge variant="outline" className="text-xs capitalize">
                              {txn.status.toLowerCase().replace("_", " ")}
                            </Badge>
                          )}
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                  {statement.outstandingBalance != null && (
                    <TableRow className="bg-slate-800 font-bold hover:bg-slate-800">
                      <TableCell colSpan={6} className="text-white font-black uppercase tracking-wider text-sm">
                        Outstanding Balance
                      </TableCell>
                      <TableCell className={cn("text-right font-mono text-lg font-black",
                        statement.outstandingBalance > 0 ? "text-rose-400" : "text-emerald-400"
                      )}>
                        {Number(statement.outstandingBalance).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                      </TableCell>
                      <TableCell />
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </>
      )}

      <style jsx global>{`
        @media print {
          @page { size: A4 portrait; margin: 1cm; }
          body { background: white !important; }
          .print\\:hidden { display: none !important; }
        }
      `}</style>
    </div>
  );
}

export default function SupplierStatementPage() {
  return (
    <Suspense fallback={<div className="flex items-center justify-center h-64"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>}>
      <SupplierStatementContent />
    </Suspense>
  );
}
