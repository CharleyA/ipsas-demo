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
  ArrowLeft,
Eye,
FileText
} from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";
import { useAuth } from "@/components/providers/auth-provider";
import { ReportToolbar } from "@/components/reports/report-toolbar";

function GeneralLedgerContent() {
  const { token } = useAuth();
  const searchParams = useSearchParams();
  const urlAccountId = searchParams.get("accountId");
  const urlVoucherId = searchParams.get("voucherId");
  
  const [data, setData] = useState<any>(null);
  const [accounts, setAccounts] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedAccountId, setSelectedAccountId] = useState("");
  const [affectedAccounts, setAffectedAccounts] = useState<any[]>([]);
  const [voucherInfo, setVoucherInfo] = useState<any>(null);
  
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  // Initialize dates on client-side to avoid hydration mismatch
  useEffect(() => {
    const s = searchParams.get("startDate") || new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split("T")[0];
    const e = searchParams.get("endDate") || new Date().toISOString().split("T")[0];
    setStartDate(s);
    setEndDate(e);
  }, [searchParams]);

  const fetchAccounts = async () => {
    try {
      const response = await fetch("/api/accounts", {
        headers: { "Authorization": `Bearer ${token}` }
      });
      const result = await response.json();
      if (!Array.isArray(result)) throw new Error("Invalid accounts data");
      setAccounts(result);
      
      if (urlAccountId) {
        setSelectedAccountId(urlAccountId);
      } else if (result.length > 0) {
        setSelectedAccountId(result[0].id);
      }
    } catch (error) {
      console.error(error);
      toast.error("Failed to fetch accounts");
    }
  };

    const fetchVoucherAffectedAccounts = async () => {
      if (!urlVoucherId) return;
      try {
        const response = await fetch(`/api/vouchers/${urlVoucherId}`, {
          headers: { "Authorization": `Bearer ${token}` }
        });
        const voucher = await response.json();
        if (response.ok && voucher) {
          setVoucherInfo(voucher);
          
          if (voucher.lines && Array.isArray(voucher.lines)) {
            const ids = [...new Set(voucher.lines.map((l: any) => l.accountId))];
            const affected = accounts.filter(acc => ids.includes(acc.id));
            setAffectedAccounts(affected);
          }
        }
      } catch (error) {
        console.error("Failed to fetch voucher info", error);
      }
    };

  const fetchReport = async () => {
    if (!selectedAccountId || !startDate || !endDate) return;
    setIsLoading(true);
    try {
      const params = new URLSearchParams();
      params.set("accountId", selectedAccountId);
      params.set("startDate", startDate);
      params.set("endDate", endDate);
      if (urlVoucherId) params.set("voucherId", urlVoucherId);

      const response = await fetch(`/api/reports/general-ledger?${params.toString()}`, { 
        headers: { "Authorization": `Bearer ${token}` } 
      });
      const result = await response.json();
      setData(result);
    } catch (error) {
      console.error(error);
      toast.error("Failed to fetch General Ledger");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (token) fetchAccounts();
  }, [token]);

  useEffect(() => {
    if (accounts.length > 0 && urlVoucherId) {
      fetchVoucherAffectedAccounts();
    }
  }, [accounts, urlVoucherId]);

  useEffect(() => {
    if (token && selectedAccountId && startDate && endDate) fetchReport();
  }, [token, selectedAccountId, startDate, endDate, urlVoucherId]);

  const displayedAccounts = urlVoucherId && affectedAccounts.length > 0 
    ? affectedAccounts 
    : accounts;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" asChild>
            <Link href={urlVoucherId ? `/dashboard/vouchers/${urlVoucherId}` : "/dashboard/reports"}>
              <ArrowLeft className="w-4 h-4" />
            </Link>
          </Button>
          <div>
            <h1 className="text-3xl font-bold tracking-tight">General Ledger</h1>
            <p className="text-muted-foreground">
              {urlVoucherId ? `Viewing impact of ${voucherInfo?.number || "voucher"}` : "Detailed account activity"}
            </p>
          </div>
        </div>
        <ReportToolbar 
          reportName="General Ledger" 
          endpoint="/api/reports/general-ledger" 
          filters={{ accountId: selectedAccountId, startDate, endDate, voucherId: urlVoucherId }} 
        />
      </div>

        {urlVoucherId && (
          <Card className="bg-primary/5 border-primary/20">
            <CardContent className="p-4 flex flex-wrap items-center gap-4">
                <div className="flex items-center gap-2 text-sm font-medium">
                  <FileText className="w-4 h-4 text-primary" />
                  <span>Affected Accounts for {voucherInfo?.number}:</span>
                </div>
            <div className="flex flex-wrap gap-2">
              {affectedAccounts.map(acc => (
                <Button 
                  key={acc.id}
                  variant={selectedAccountId === acc.id ? "default" : "outline"}
                  size="sm"
                  className="h-8 text-[11px]"
                  onClick={() => setSelectedAccountId(acc.id)}
                >
                  {acc.code}
                </Button>
              ))}
            </div>
            <Button variant="ghost" size="sm" className="ml-auto h-8 text-xs" asChild>
              <Link href="/dashboard/reports/general-ledger">
                Clear Voucher Filter
              </Link>
            </Button>
          </CardContent>
        </Card>
      )}

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
                  {Array.isArray(displayedAccounts) && displayedAccounts.map((acc) => (
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
          ) : data && !data.error ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Entry #</TableHead>
                  <TableHead>Voucher #</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead className="text-right">Debit</TableHead>
                  <TableHead className="text-right">Credit</TableHead>
                  <TableHead className="text-right">
                    Balance {data?.entries?.[0]?.currency && <span className="text-[10px] opacity-70 ml-1">({data.entries[0].currency})</span>}
                  </TableHead>
                </TableRow>
              </TableHeader>

              <TableBody>
                <TableRow className="bg-muted/30 italic">
                  <TableCell colSpan={6}>Opening Balance</TableCell>
                  <TableCell className="text-right font-medium">
                    {parseFloat(data.openingBalance || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                  </TableCell>
                </TableRow>
                {data?.entries && Array.isArray(data.entries) && data.entries.map((entry: any) => (
                  <TableRow key={entry.id}>
                    <TableCell className="whitespace-nowrap text-xs">
                      {entry.date ? new Date(entry.date).toLocaleDateString() : "-"}
                    </TableCell>
                    <TableCell className="font-mono text-[10px]">{entry.entryNumber}</TableCell>
                    <TableCell className="font-mono text-xs">
                      {entry.voucherId ? (
                        <Link 
                          href={`/dashboard/vouchers/${entry.voucherId}`}
                          className="text-primary hover:underline flex items-center gap-1"
                        >
                          {entry.voucherNumber || "View"}
                          <Eye className="w-3 h-3" />
                        </Link>
                      ) : entry.voucherNumber || "-"}
                    </TableCell>
                    <TableCell className="max-w-[200px] truncate text-xs">{entry.description}</TableCell>
                    <TableCell className="text-right text-xs">
                      {parseFloat(entry.debit) > 0 ? parseFloat(entry.debit).toLocaleString(undefined, { minimumFractionDigits: 2 }) : ""}
                    </TableCell>
                    <TableCell className="text-right text-red-600 text-xs">
                      {parseFloat(entry.credit) > 0 ? parseFloat(entry.credit).toLocaleString(undefined, { minimumFractionDigits: 2 }) : ""}
                    </TableCell>
                    <TableCell className="text-right font-medium text-xs">
                      {parseFloat(entry.balance || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                    </TableCell>
                  </TableRow>
                ))}
                <TableRow className="bg-muted/50 font-bold">
                  <TableCell colSpan={6}>Closing Balance</TableCell>
                  <TableCell className="text-right underline decoration-double">
                    {parseFloat(data.closingBalance || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                  </TableCell>
                </TableRow>
              </TableBody>
            </Table>
          ) : (
            <div className="text-center py-12 text-muted-foreground">
              {data?.error ? data.error : "Select an account and dates to view ledger activity."}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

export default function GeneralLedgerPage() {
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    }>
      <GeneralLedgerContent />
    </Suspense>
  );
}
