"use client";

import { useEffect, useState, useMemo } from "react";
import Link from "next/link";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
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
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { 
  Loader2, 
  Upload, 
  AlertCircle,
  FileSpreadsheet,
  Download,
  Link as LinkIcon,
  ArrowRightLeft
} from "lucide-react";
import { toast } from "sonner";
import Papa from "papaparse";
import { format } from "date-fns";
import { useAuth } from "@/components/providers/auth-provider";
import * as ExcelJS from "exceljs";
import { cn } from "@/lib/utils";

export default function ReconcilePage() {
  const { token } = useAuth();
  const [bankAccounts, setBankAccounts] = useState<any[]>([]);
  const [selectedBankId, setSelectedBankId] = useState<string>("");
  const [isLoading, setIsLoading] = useState(false);
  const [unmatchedRows, setUnmatchedRows] = useState<any[]>([]);
  const [selectedRow, setSelectedRow] = useState<any>(null);
  const [suggestions, setSuggestions] = useState<any[]>([]);
  const [report, setReport] = useState<any>(null);
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  useEffect(() => {
    if (!token) return;
    fetch("/api/bank/accounts", { headers: { "Authorization": `Bearer ${token}` } })
      .then(res => res.json())
      .then(setBankAccounts)
      .catch(() => toast.error("Failed to fetch bank accounts"));
  }, [token]);

  useEffect(() => {
    if (selectedBankId) {
      fetchUnmatched();
      fetchReport();
    }
  }, [selectedBankId]);

  const fetchUnmatched = async () => {
    setIsLoading(true);
    try {
      const res = await fetch(`/api/bank/import/rows?bankAccountId=${selectedBankId}`, {
        headers: { "Authorization": `Bearer ${token}` }
      });
      const data = await res.json();
      setUnmatchedRows(Array.isArray(data) ? data : []);
    } catch (error) {
      toast.error("Failed to fetch unmatched rows");
    } finally {
      setIsLoading(false);
    }
  };

  const fetchReport = async () => {
    try {
      const res = await fetch(`/api/bank/reconciliation/report?bankAccountId=${selectedBankId}`, {
        headers: { "Authorization": `Bearer ${token}` }
      });
      const data = await res.json();
      setReport(data);
    } catch (error) {}
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: async (results) => {
        const rows = results.data.map((row: any) => ({
          date: row.date || row.Date,
          description: row.description || row.Description,
          reference: row.reference || row.Reference,
          debit: parseFloat(row.debit || row.Debit || 0),
          credit: parseFloat(row.credit || row.Credit || 0),
          balance: parseFloat(row.balance || row.Balance || 0),
        })).filter(r => r.date && r.description);

        if (rows.length === 0) {
          toast.error("No valid rows found in CSV");
          return;
        }

        try {
          setIsLoading(true);
          const res = await fetch("/api/bank/import", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "Authorization": `Bearer ${token}`,
            },
            body: JSON.stringify({
              bankAccountId: selectedBankId,
              filename: file.name,
              rows,
            }),
          });

          if (!res.ok) throw new Error("Import failed");
          toast.success(`Imported ${rows.length} rows`);
          fetchUnmatched();
        } catch (error: any) {
          toast.error(error.message);
        } finally {
          setIsLoading(false);
        }
      },
    });
  };

  const getSuggestions = async (row: any) => {
    setSelectedRow(row);
    setSuggestions([]);
    try {
      const res = await fetch(`/api/bank/reconcile/suggest?rowId=${row.id}`, {
        headers: { "Authorization": `Bearer ${token}` }
      });
      const data = await res.json();
      setSuggestions(data);
    } catch (error) {
      toast.error("Failed to fetch suggestions");
    }
  };

  const matchRow = async (voucherId: string) => {
    try {
      const res = await fetch("/api/bank/reconcile/match", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`,
        },
        body: JSON.stringify({
          rowId: selectedRow.id,
          voucherId,
        }),
      });

      if (!res.ok) throw new Error("Match failed");
      toast.success("Transaction matched");
      setSelectedRow(null);
      fetchUnmatched();
      fetchReport();
    } catch (error: any) {
      toast.error(error.message);
    }
  };

  const downloadReport = async () => {
    if (!report) return;
    
    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet("Reconciliation Report");

    sheet.columns = [
        { header: "Description", key: "desc", width: 40 },
        { header: "Amount", key: "amount", width: 20 },
    ];

    sheet.addRow({ desc: `Bank Reconciliation Report - ${report.bankAccount?.bankName || 'Unknown'}`, amount: "" });
    sheet.addRow({ desc: `As of ${format(new Date(), "PPP")}`, amount: "" });
    sheet.addRow({});

    sheet.addRow({ desc: "Bank Statement Balance", amount: report.bankStatementBalance });
    sheet.addRow({ desc: "Add: Deposits in Transit", amount: report.totalInTransit });
    sheet.addRow({ desc: "Less: Unpresented Checks", amount: -report.totalUnpresented });
    sheet.addRow({ desc: "Adjusted Bank Balance", amount: (parseFloat(report.bankStatementBalance) || 0) + (parseFloat(report.totalInTransit) || 0) - (parseFloat(report.totalUnpresented) || 0) });
    sheet.addRow({});
    sheet.addRow({ desc: "General Ledger Balance", amount: report.glBalance });
    sheet.addRow({ desc: "Difference", amount: report.difference });

    const buffer = await workbook.xlsx.writeBuffer();
    const blob = new Blob([buffer], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `Reconciliation_${report.bankAccount?.bankName || 'Bank'}_${format(new Date(), "yyyyMMdd")}.xlsx`;
    a.click();
  };

  if (!isMounted) return null;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Bank Reconciliation</h1>
          <p className="text-muted-foreground">Match bank statement rows with ledger entries.</p>
        </div>
        <div className="flex items-center gap-4">
          <Select value={selectedBankId} onValueChange={setSelectedBankId}>
            <SelectTrigger className="w-[280px]">
              <SelectValue placeholder="Select Bank Account" />
            </SelectTrigger>
            <SelectContent>
              {bankAccounts.map(acc => (
                <SelectItem key={acc.id} value={acc.id}>
                  {acc.bankName} - {acc.accountNumber}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {selectedBankId && (
            <div className="relative">
              <Input
                type="file"
                accept=".csv"
                className="hidden"
                id="bank-csv-upload"
                onChange={handleFileUpload}
              />
              <Button asChild variant="outline">
                <label htmlFor="bank-csv-upload" className="cursor-pointer">
                  <Upload className="w-4 h-4 mr-2" />
                  Upload CSV
                </label>
              </Button>
            </div>
          )}
        </div>
      </div>

      {!selectedBankId ? (
        <Card className="flex flex-col items-center justify-center py-20 text-center">
            <AlertCircle className="w-12 h-12 text-muted-foreground mb-4" />
            <h2 className="text-xl font-semibold">Select a bank account to start</h2>
            <p className="text-muted-foreground">You need to select an account before you can import or reconcile transactions.</p>
        </Card>
      ) : (
        <Tabs defaultValue="reconcile" className="space-y-4">
          <TabsList>
            <TabsTrigger value="reconcile">Reconciliation</TabsTrigger>
            <TabsTrigger value="report">Summary Report</TabsTrigger>
          </TabsList>

          <TabsContent value="reconcile" className="space-y-4">
            <div className="grid gap-6 lg:grid-cols-2">
              <Card>
                <CardHeader>
                  <CardTitle>Unmatched Bank Rows</CardTitle>
                  <CardDescription>Transactions from your bank statement that need matching.</CardDescription>
                </CardHeader>
                <CardContent>
                  {isLoading ? (
                    <div className="flex justify-center py-8"><Loader2 className="animate-spin" /></div>
                  ) : unmatchedRows.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">No unmatched rows found.</div>
                  ) : (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Date</TableHead>
                          <TableHead>Description</TableHead>
                          <TableHead className="text-right">Amount</TableHead>
                          <TableHead></TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {unmatchedRows.map(row => (
                          <TableRow key={row.id}>
                            <TableCell>{row.date ? format(new Date(row.date), "MMM d") : "N/A"}</TableCell>
                            <TableCell className="max-w-[200px] truncate">{row.description}</TableCell>
                            <TableCell className={cn("text-right font-mono", row.amount > 0 ? "text-green-600" : "text-red-600")}>
                              {new Intl.NumberFormat('en-US', { minimumFractionDigits: 2 }).format(row.amount)}
                            </TableCell>
                            <TableCell className="text-right">
                              <Button variant="ghost" size="sm" onClick={() => getSuggestions(row)}>
                                <LinkIcon className="w-4 h-4 mr-2" />
                                Match
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Match with Ledger</CardTitle>
                  <CardDescription>
                    {selectedRow ? `Suggestions for "${selectedRow.description}" (${selectedRow.amount})` : "Select a row to see matching suggestions."}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {!selectedRow ? (
                    <div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
                        <ArrowRightLeft className="w-12 h-12 mb-4 opacity-20" />
                        <p>Click "Match" on a bank row to find ledger entries.</p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                        <div className="p-4 bg-muted rounded-lg space-y-2">
                            <div className="flex justify-between font-medium">
                                <span>Selected Bank Row</span>
                                <span>{selectedRow.amount}</span>
                            </div>
                            <div className="text-sm text-muted-foreground">{selectedRow.description}</div>
                            <div className="text-xs">{format(new Date(selectedRow.date), "PPP")}</div>
                        </div>

                        <div className="space-y-2">
                            <h4 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">Suggested Matches</h4>
                            {suggestions.length === 0 ? (
                                <div className="text-center py-8 border-2 border-dashed rounded-lg">
                                    No exact date/amount matches found.
                                </div>
                            ) : (
                                suggestions.map(v => (
                                    <div key={v.id} className="flex items-center justify-between p-4 border rounded-lg hover:border-primary cursor-pointer transition-colors" onClick={() => matchRow(v.id)}>
                                        <div>
                                            <div className="font-medium">{v.number}</div>
                                            <div className="text-sm text-muted-foreground">{v.description}</div>
                                            <div className="text-xs">{format(new Date(v.date), "MMM d, yyyy")}</div>
                                        </div>
                                        <div className="flex flex-col items-end gap-1">
                                            <div className="font-mono">{v.lines[0]?.debit || v.lines[0]?.credit}</div>
                                            <Badge variant="outline">Postable</Badge>
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>

                        <Button variant="outline" className="w-full" asChild>
                            <Link href="/dashboard/vouchers/new">Create Manual Voucher</Link>
                        </Button>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="report">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                    <CardTitle>Reconciliation Summary</CardTitle>
                    <CardDescription>Balance comparison between Statement and Ledger.</CardDescription>
                </div>
                <Button onClick={downloadReport} disabled={!report}>
                    <Download className="w-4 h-4 mr-2" />
                    Download Excel
                </Button>
              </CardHeader>
              <CardContent>
                {report ? (
                  <div className="space-y-8">
                    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                        <Card className="bg-primary/5">
                            <CardHeader className="pb-2">
                                <CardDescription>Bank Statement Balance</CardDescription>
                                <CardTitle className="text-2xl">{new Intl.NumberFormat('en-US', { style: 'currency', currency: report.bankAccount.currencyCode }).format(report.bankStatementBalance)}</CardTitle>
                            </CardHeader>
                        </Card>
                        <Card className="bg-green-50">
                            <CardHeader className="pb-2">
                                <CardDescription>Deposits in Transit</CardDescription>
                                <CardTitle className="text-2xl text-green-700">+{new Intl.NumberFormat('en-US').format(report.totalInTransit)}</CardTitle>
                            </CardHeader>
                        </Card>
                        <Card className="bg-red-50">
                            <CardHeader className="pb-2">
                                <CardDescription>Unpresented Checks</CardDescription>
                                <CardTitle className="text-2xl text-red-700">-{new Intl.NumberFormat('en-US').format(report.totalUnpresented)}</CardTitle>
                            </CardHeader>
                        </Card>
                        <Card className={cn(report.difference == 0 ? "bg-blue-50" : "bg-orange-50")}>
                            <CardHeader className="pb-2">
                                <CardDescription>GL Balance</CardDescription>
                                <CardTitle className="text-2xl">{new Intl.NumberFormat('en-US').format(report.glBalance)}</CardTitle>
                            </CardHeader>
                        </Card>
                    </div>

                    <div className="border rounded-lg p-6 space-y-4">
                        <div className="flex justify-between border-b pb-2">
                            <span>Bank Statement Balance</span>
                            <span className="font-mono">{new Intl.NumberFormat('en-US').format(report.bankStatementBalance)}</span>
                        </div>
                        <div className="flex justify-between border-b pb-2 text-green-600">
                            <span>Add: Deposits in Transit (not yet in bank)</span>
                            <span className="font-mono">+{new Intl.NumberFormat('en-US').format(report.totalInTransit)}</span>
                        </div>
                        <div className="flex justify-between border-b pb-2 text-red-600">
                            <span>Less: Unpresented Checks (not yet cleared bank)</span>
                            <span className="font-mono">-{new Intl.NumberFormat('en-US').format(report.totalUnpresented)}</span>
                        </div>
                        <div className="flex justify-between border-b pb-2 font-bold">
                            <span>Adjusted Bank Balance</span>
                            <span className="font-mono">{new Intl.NumberFormat('en-US').format(parseFloat(report.bankStatementBalance) + parseFloat(report.totalInTransit) - parseFloat(report.totalUnpresented))}</span>
                        </div>
                        <div className="flex justify-between pt-4 font-bold text-lg">
                            <span>Difference to GL</span>
                            <span className={cn("font-mono", report.difference == 0 ? "text-green-600" : "text-red-600")}>
                                {new Intl.NumberFormat('en-US').format(report.difference)}
                            </span>
                        </div>
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-20 text-muted-foreground">
                    <FileSpreadsheet className="w-12 h-12 mx-auto mb-4 opacity-20" />
                    <p>Load a bank account to generate the reconciliation summary.</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      )}
    </div>
  );
}
