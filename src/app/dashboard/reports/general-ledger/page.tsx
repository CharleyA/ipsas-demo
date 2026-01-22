"use client";

import { useEffect, useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import {
  Card,
  CardContent,
  CardHeader,
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
  SelectValue 
} from "@/components/ui/select";
import { 
  Loader2, 
  ArrowLeft
} from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";
import { useAuth } from "@/components/providers/auth-provider";
import { ReportToolbar } from "@/components/reports/report-toolbar";

function GeneralLedgerContent() {
  const { token } = useAuth();
  const searchParams = useSearchParams();
  const urlAccountId = searchParams.get("accountId");
  const [data, setData] = useState<any>(null);
  const [accounts, setAccounts] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedAccountId, setSelectedAccountId] = useState("");
  const [startDate, setStartDate] = useState(
    new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split("T")[0]
  );
  const [endDate, setEndDate] = useState(new Date().toISOString().split("T")[0]);

  const fetchAccounts = async () => {
    try {
      const response = await fetch("/api/accounts", {
        headers: { "Authorization": `Bearer ${token}` }
      });
      const result = await response.json();
      setAccounts(result);
      
      // Prioritize URL parameter for drill-down
      if (urlAccountId) {
        setSelectedAccountId(urlAccountId);
      } else if (result.length > 0) {
        setSelectedAccountId(result[0].id);
      }
    } catch (error) {
      toast.error("Failed to fetch accounts");
    }
  };

  const fetchReport = async () => {
    if (!selectedAccountId) return;
    setIsLoading(true);
    try {
      const response = await fetch(
        `/api/reports/general-ledger?accountId=${selectedAccountId}&startDate=${startDate}&endDate=${endDate}`,
        { headers: { "Authorization": `Bearer ${token}` } }
      );
      const result = await response.json();
      setData(result);
    } catch (error) {
      toast.error("Failed to fetch General Ledger");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (token) fetchAccounts();
  }, [token]);

  useEffect(() => {
    if (token && selectedAccountId) fetchReport();
  }, [token, selectedAccountId, startDate, endDate]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" asChild>
            <Link href="/dashboard/reports">
              <ArrowLeft className="w-4 h-4" />
            </Link>
          </Button>
          <div>
            <h1 className="text-3xl font-bold tracking-tight">General Ledger</h1>
            <p className="text-muted-foreground">Detailed account activity</p>
          </div>
        </div>
        <ReportToolbar 
          reportName="General Ledger" 
          endpoint="/api/reports/general-ledger" 
          filters={{ accountId: selectedAccountId, startDate, endDate }} 
        />
      </div>

      <Card>
        <CardHeader>
          <div className="flex flex-wrap items-end gap-4">
            <div className="flex flex-col gap-1 w-[300px]">
              <label className="text-xs font-medium text-muted-foreground">Account</label>
              <Select value={selectedAccountId} onValueChange={setSelectedAccountId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select account" />
                </SelectTrigger>
                <SelectContent>
                  {accounts.map((acc) => (
                    <SelectItem key={acc.id} value={acc.id}>
                      {acc.code} - {acc.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-xs font-medium text-muted-foreground">Start Date</label>
              <Input 
                type="date" 
                value={startDate} 
                onChange={(e) => setStartDate(e.target.value)}
                className="w-[180px]"
              />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-xs font-medium text-muted-foreground">End Date</label>
              <Input 
                type="date" 
                value={endDate} 
                onChange={(e) => setEndDate(e.target.value)}
                className="w-[180px]"
              />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-8 h-8 animate-spin text-primary" />
            </div>
          ) : data ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Entry #</TableHead>
                  <TableHead>Voucher #</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead className="text-right">Debit</TableHead>
                  <TableHead className="text-right">Credit</TableHead>
                  <TableHead className="text-right">Balance</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                <TableRow className="bg-muted/30 italic">
                  <TableCell colSpan={6}>Opening Balance</TableCell>
                  <TableCell className="text-right font-medium">
                    {parseFloat(data.openingBalance).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                  </TableCell>
                </TableRow>
                {data.entries.map((entry: any) => (
                  <TableRow key={entry.id}>
                    <TableCell className="whitespace-nowrap">
                      {new Date(entry.date).toLocaleDateString()}
                    </TableCell>
                    <TableCell className="font-mono text-xs">{entry.entryNumber}</TableCell>
                    <TableCell className="font-mono text-xs">{entry.voucherNumber || "-"}</TableCell>
                    <TableCell className="max-w-[200px] truncate">{entry.description}</TableCell>
                    <TableCell className="text-right">
                      {parseFloat(entry.debit) > 0 ? parseFloat(entry.debit).toLocaleString(undefined, { minimumFractionDigits: 2 }) : ""}
                    </TableCell>
                    <TableCell className="text-right text-red-600">
                      {parseFloat(entry.credit) > 0 ? parseFloat(entry.credit).toLocaleString(undefined, { minimumFractionDigits: 2 }) : ""}
                    </TableCell>
                    <TableCell className="text-right font-medium">
                      {parseFloat(entry.balance).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                    </TableCell>
                  </TableRow>
                ))}
                <TableRow className="bg-muted/50 font-bold">
                  <TableCell colSpan={6}>Closing Balance</TableCell>
                  <TableCell className="text-right underline decoration-double">
                    {parseFloat(data.closingBalance).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                  </TableCell>
                </TableRow>
              </TableBody>
            </Table>
          ) : (
            <div className="text-center py-12 text-muted-foreground">
              Select an account and dates to view ledger activity.
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
