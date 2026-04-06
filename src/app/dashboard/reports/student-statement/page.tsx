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
import { Input } from "@/components/ui/input";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  ArrowLeft, Loader2, Printer, Users, AlertCircle, Search,
} from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/components/providers/auth-provider";
import { cn } from "@/lib/utils";
import { format } from "date-fns";

function StudentStatementContent() {
  const { token } = useAuth();
  const searchParams = useSearchParams();
  const [students, setStudents] = useState<any[]>([]);
  const [selectedStudent, setSelectedStudent] = useState(searchParams.get("studentId") || "");
  const [statement, setStatement] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingStudents, setIsLoadingStudents] = useState(true);
  const [search, setSearch] = useState("");

  const fetchStudents = useCallback(async () => {
    try {
      const res = await fetch("/api/students", {
        headers: { Authorization: `Bearer ${token}` },
      });
      const d = await res.json();
      const list = d?.data ?? d ?? [];
      setStudents(Array.isArray(list) ? list : []);
    } catch {
      toast.error("Failed to load students");
    } finally {
      setIsLoadingStudents(false);
    }
  }, [token]);

  const fetchStatement = useCallback(async () => {
    if (!selectedStudent) return;
    setIsLoading(true);
    try {
      const res = await fetch(`/api/ar/students/${selectedStudent}/statement`, {
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
  }, [token, selectedStudent]);

  useEffect(() => {
    if (token) fetchStudents();
  }, [token, fetchStudents]);

  useEffect(() => {
    if (token && selectedStudent) fetchStatement();
  }, [token, selectedStudent, fetchStatement]);

  const filteredStudents = students.filter((s) => {
    const term = search.toLowerCase();
    return (
      `${s.firstName} ${s.lastName}`.toLowerCase().includes(term) ||
      s.studentNumber?.toLowerCase().includes(term)
    );
  });

  const selectedStudentObj = students.find((s) => s.id === selectedStudent);

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
              <span className="px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider bg-emerald-50 text-emerald-600 rounded-full border border-emerald-100">
                AR
              </span>
              <span className="text-muted-foreground text-xs">/</span>
              <span className="text-xs text-muted-foreground">Student Statement</span>
            </div>
            <h1 className="text-3xl font-extrabold tracking-tight">Student Account Statement</h1>
            <p className="text-muted-foreground text-sm">
              {selectedStudentObj
                ? `${selectedStudentObj.firstName} ${selectedStudentObj.lastName} (${selectedStudentObj.studentNumber ?? ""})`
                : "Select a student to view their account"}
            </p>
          </div>
        </div>
        <Button variant="outline" size="sm" onClick={() => window.print()} disabled={!statement}>
          <Printer className="w-4 h-4 mr-2" /> Print
        </Button>
      </div>

      {/* Student Selector */}
      <Card className="print:hidden">
        <CardContent className="p-4 flex flex-wrap items-end gap-4">
          <div className="space-y-1">
            <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Search Students</label>
            <div className="relative w-56">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Name or student no..."
                className="pl-9"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
          </div>
          <div className="space-y-1 flex-1 min-w-[240px]">
            <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Student</label>
            {isLoadingStudents ? (
              <div className="flex items-center gap-2 h-10 text-sm text-muted-foreground">
                <Loader2 className="w-4 h-4 animate-spin" /> Loading students...
              </div>
            ) : (
              <Select value={selectedStudent} onValueChange={setSelectedStudent}>
                <SelectTrigger className="w-full max-w-sm">
                  <SelectValue placeholder="Select student..." />
                </SelectTrigger>
                <SelectContent className="max-h-[300px]">
                  {filteredStudents.length === 0 ? (
                    <SelectItem value="_none" disabled>No students found</SelectItem>
                  ) : (
                    filteredStudents.map((s) => (
                      <SelectItem key={s.id} value={s.id}>
                        {s.firstName} {s.lastName} {s.studentNumber ? `(${s.studentNumber})` : ""}
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
            )}
          </div>
        </CardContent>
      </Card>

      {!selectedStudent ? (
        <div className="text-center py-24 bg-slate-50 rounded-2xl border-2 border-dashed border-slate-200">
          <Users className="w-12 h-12 text-slate-300 mx-auto mb-4" />
          <h3 className="text-lg font-bold">Select a Student</h3>
          <p className="text-slate-500 max-w-xs mx-auto mt-2">
            Choose a student from the dropdown above to view their account statement.
          </p>
        </div>
      ) : isLoading ? (
        <div className="flex flex-col items-center justify-center py-24 gap-4">
          <Loader2 className="w-12 h-12 animate-spin text-emerald-500" />
          <p className="text-muted-foreground animate-pulse">Loading student statement...</p>
        </div>
      ) : !statement ? (
        <div className="text-center py-24 bg-slate-50 rounded-2xl border-2 border-dashed border-slate-200">
          <AlertCircle className="w-12 h-12 text-slate-300 mx-auto mb-4" />
          <h3 className="text-lg font-bold">No Statement Data</h3>
          <p className="text-slate-500 max-w-xs mx-auto mt-2">No transactions found for this student.</p>
        </div>
      ) : (
        <>
          {/* Print Header */}
          <div className="hidden print:block border-b-2 border-slate-900 pb-6 mb-8">
            <div className="flex justify-between items-start">
              <div>
                <h1 className="text-2xl font-black uppercase">Student Account Statement</h1>
                <p className="text-slate-600 font-bold mt-1 uppercase text-sm">
                  {statement.student?.firstName} {statement.student?.lastName}
                  {statement.student?.studentNumber ? ` — ${statement.student.studentNumber}` : ""}
                </p>
                <p className="text-slate-500 text-xs mt-1">Generated: {format(new Date(), "MMMM d, yyyy")}</p>
              </div>
              <div className="text-right">
                <p className="text-xs text-slate-400 uppercase">Outstanding Balance</p>
                <p className="text-xl font-bold">{Number(statement.balance ?? 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}</p>
              </div>
            </div>
          </div>

          {/* KPI Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              { label: "Total Invoiced", value: statement.totalInvoiced ?? 0, color: "text-amber-700" },
              { label: "Total Receipted", value: statement.totalRecepted ?? statement.totalPaid ?? 0, color: "text-emerald-700" },
              { label: "Outstanding Balance", value: statement.balance ?? 0, color: (statement.balance ?? 0) > 0 ? "text-rose-700" : "text-emerald-700" },
              { label: "Invoices", value: statement.invoiceCount ?? statement.invoices?.length ?? 0, isCnt: true, color: "text-slate-700" },
            ].map(({ label, value, color, isCnt }) => (
              <Card key={label} className="shadow-sm">
                <CardContent className="p-4">
                  <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-1">{label}</p>
                  <p className={cn("text-xl font-bold", color)}>
                    {isCnt
                      ? value
                      : Number(value).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Invoices Table */}
          <Card>
            <CardHeader className="bg-muted/30 border-b">
              <CardTitle>Account Transactions</CardTitle>
              <CardDescription>
                All invoices and receipts for {statement.student?.firstName} {statement.student?.lastName}
              </CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Reference</TableHead>
                    <TableHead>Term / Description</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead className="text-right">Debit</TableHead>
                    <TableHead className="text-right">Credit</TableHead>
                    <TableHead className="text-right">Balance</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {(statement.transactions ?? statement.invoices ?? []).length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={8} className="h-24 text-center text-muted-foreground">
                        No transactions found.
                      </TableCell>
                    </TableRow>
                  ) : (
                    (statement.transactions ?? statement.invoices ?? []).map((txn: any, i: number) => {
                      const isInvoice = txn.type === "INVOICE" || txn.invoiceNumber != null;
                      return (
                        <TableRow key={i} className="hover:bg-muted/30">
                          <TableCell className="text-sm whitespace-nowrap">
                            {txn.date ? format(new Date(txn.date), "d MMM yyyy") : "—"}
                          </TableCell>
                          <TableCell className="font-mono text-sm">
                            {txn.invoiceNumber ?? txn.receiptNumber ?? txn.reference ?? "—"}
                          </TableCell>
                          <TableCell className="text-sm max-w-[200px] truncate">
                            {txn.term ?? txn.description ?? "—"}
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline" className={cn("text-xs",
                              isInvoice
                                ? "bg-amber-50 border-amber-200 text-amber-700"
                                : "bg-emerald-50 border-emerald-200 text-emerald-700"
                            )}>
                              {isInvoice ? "Invoice" : "Receipt"}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right font-mono text-sm text-amber-700">
                            {isInvoice ? Number(txn.amount ?? 0).toLocaleString(undefined, { minimumFractionDigits: 2 }) : "—"}
                          </TableCell>
                          <TableCell className="text-right font-mono text-sm text-emerald-700">
                            {!isInvoice ? Number(txn.amount ?? 0).toLocaleString(undefined, { minimumFractionDigits: 2 }) : "—"}
                          </TableCell>
                          <TableCell className={cn("text-right font-mono text-sm font-semibold",
                            (txn.balance ?? 0) > 0 ? "text-rose-600" : "text-emerald-600"
                          )}>
                            {txn.balance != null
                              ? Number(txn.balance).toLocaleString(undefined, { minimumFractionDigits: 2 })
                              : "—"}
                          </TableCell>
                          <TableCell>
                            {txn.status && (
                              <Badge variant="outline" className="text-xs capitalize">
                                {txn.status.toLowerCase().replace("_", " ")}
                              </Badge>
                            )}
                          </TableCell>
                        </TableRow>
                      );
                    })
                  )}
                  <TableRow className="bg-slate-800 hover:bg-slate-800">
                    <TableCell colSpan={6} className="text-white font-black uppercase tracking-wider text-sm">
                      Outstanding Balance
                    </TableCell>
                    <TableCell className={cn("text-right font-mono text-lg font-black",
                      (statement.balance ?? 0) > 0 ? "text-rose-400" : "text-emerald-400"
                    )}>
                      {Number(statement.balance ?? 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                    </TableCell>
                    <TableCell />
                  </TableRow>
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

export default function StudentStatementPage() {
  return (
    <Suspense fallback={<div className="flex items-center justify-center h-64"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>}>
      <StudentStatementContent />
    </Suspense>
  );
}
