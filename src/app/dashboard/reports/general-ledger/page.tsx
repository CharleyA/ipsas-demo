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
    FileText,
    TrendingUp,
    TrendingDown,
      ArrowUpRight,
      ArrowDownRight,
      Wallet,
      CalendarDays,
      Coins
  } from "lucide-react";

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  AreaChart,
  Area,
  Legend
} from "recharts";
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
    const [reportingCurrency, setReportingCurrency] = useState<string>("");
    const [affectedAccounts, setAffectedAccounts] = useState<any[]>([]);

  const [voucherInfo, setVoucherInfo] = useState<any>(null);
  
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(50);

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
      params.set("page", page.toString());
      params.set("pageSize", pageSize.toString());
      if (reportingCurrency) params.set("reportingCurrency", reportingCurrency);
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
  }, [token, selectedAccountId, startDate, endDate, urlVoucherId, page, pageSize]);

  const handlePageChange = (newPage: number) => {
    setPage(newPage);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const displayedAccounts = urlVoucherId && affectedAccounts.length > 0 
    ? affectedAccounts 
    : accounts;

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" className="h-9 w-9" asChild>
            <Link href={urlVoucherId ? `/dashboard/vouchers/${urlVoucherId}` : "/dashboard/reports"}>
              <ArrowLeft className="w-4 h-4" />
            </Link>
          </Button>
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-foreground">General Ledger</h1>
            <p className="text-xs text-muted-foreground">
              {urlVoucherId ? `Viewing impact of ${voucherInfo?.number || "voucher"}` : "Institutional account auditing and transaction history"}
            </p>
          </div>
        </div>
        <ReportToolbar 
          reportName="General Ledger" 
          endpoint="/api/reports/general-ledger" 
          filters={{ accountId: selectedAccountId, startDate, endDate, voucherId: urlVoucherId }} 
        />
      </div>

      <Card className="border-primary/10 bg-card/50 backdrop-blur-sm">
        <CardContent className="p-4">
          <div className="flex flex-wrap items-end gap-4">
            <div className="flex flex-col gap-1.5 min-w-[300px] flex-1">
              <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1">
                <Wallet className="w-3 h-3" /> Select Account
              </label>
              <Select value={selectedAccountId} onValueChange={setSelectedAccountId}>
                <SelectTrigger className="h-9 bg-background/50">
                  <SelectValue placeholder="Select account" />
                </SelectTrigger>
                <SelectContent>
                  {Array.isArray(displayedAccounts) && displayedAccounts.map((acc) => (
                    <SelectItem key={acc.id} value={acc.id}>
                      <span className="font-mono text-xs mr-2">{acc.code}</span>
                      <span>{acc.name}</span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1">
                <CalendarDays className="w-3 h-3" /> Start Date
              </label>
              <Input 
                type="date" 
                value={startDate} 
                onChange={(e) => setStartDate(e.target.value)}
                className="h-9 w-[160px] bg-background/50"
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1">
                <CalendarDays className="w-3 h-3" /> End Date
              </label>
                <Input 
                  type="date" 
                  value={endDate} 
                  onChange={(e) => setEndDate(e.target.value)}
                  className="h-9 w-[160px] bg-background/50"
                />
              </div>

              <div className="flex flex-col gap-1.5 min-w-[140px]">
                <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1">
                  <Coins className="w-3 h-3" /> Reporting Currency
                </label>
                <Select 
                  value={reportingCurrency || (data?.accountCurrency || "")} 
                  onValueChange={setReportingCurrency}
                >
                  <SelectTrigger className="h-9 bg-background/50">
                    <SelectValue placeholder="Currency" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={data?.accountCurrency || "ORIGINAL"}>
                      Original ({data?.accountCurrency || "..."})
                    </SelectItem>
                    <SelectItem value="ZWG">ZWG (Base)</SelectItem>
                    <SelectItem value="USD">USD</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

        </CardContent>
      </Card>

      {isLoading ? (
        <div className="flex flex-col items-center justify-center py-24 gap-4">
          <Loader2 className="w-10 h-10 animate-spin text-primary" />
          <p className="text-sm text-muted-foreground animate-pulse font-medium">Synthesizing ledger data...</p>
        </div>
      ) : data && !data.error ? (
        <>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
              <Card className="border-border/50 bg-card/30 shadow-sm transition-all hover:shadow-md">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Opening Balance</p>
                    <div className="p-1.5 rounded-md bg-muted/50">
                      <Wallet className="w-3.5 h-3.5 text-muted-foreground" />
                    </div>
                  </div>
                  <p className="text-xl font-bold font-mono tracking-tight">
                    <span className="text-[10px] mr-1 opacity-50">{data.reportingCurrency}</span>
                    {parseFloat(data.openingBalance || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                  </p>
                </CardContent>
              </Card>
              <Card className="border-emerald-500/20 bg-emerald-500/5 shadow-sm transition-all hover:shadow-md">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-[10px] font-bold text-emerald-600 uppercase tracking-widest">Total Debits</p>
                    <div className="p-1.5 rounded-md bg-emerald-500/20">
                      <ArrowUpRight className="w-3.5 h-3.5 text-emerald-600" />
                    </div>
                  </div>
                    <p className="text-xl font-bold font-mono text-emerald-600 tracking-tight">
                      <span className="text-[10px] mr-1 opacity-50">{data.reportingCurrency}</span>
                      {parseFloat(data.summary.totalDebits || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                    </p>

                </CardContent>
              </Card>
              <Card className="border-rose-500/20 bg-rose-500/5 shadow-sm transition-all hover:shadow-md">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-[10px] font-bold text-rose-600 uppercase tracking-widest">Total Credits</p>
                    <div className="p-1.5 rounded-md bg-rose-500/20">
                      <ArrowDownRight className="w-3.5 h-3.5 text-rose-600" />
                    </div>
                  </div>
                    <p className="text-xl font-bold font-mono text-rose-600 tracking-tight">
                      <span className="text-[10px] mr-1 opacity-50">{data.reportingCurrency}</span>
                      {parseFloat(data.summary.totalCredits || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                    </p>

                </CardContent>
              </Card>
              <Card className="border-blue-500/20 bg-blue-500/5 shadow-sm transition-all hover:shadow-md">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-[10px] font-bold text-blue-600 uppercase tracking-widest">Net Movement</p>
                    <div className={`p-1.5 rounded-md ${parseFloat(data.summary.netMovement) >= 0 ? 'bg-emerald-500/20' : 'bg-rose-500/20'}`}>
                      {parseFloat(data.summary.netMovement) >= 0 ? 
                        <TrendingUp className="w-3.5 h-3.5 text-emerald-600" /> : 
                        <TrendingDown className="w-3.5 h-3.5 text-rose-600" />
                      }
                    </div>
                  </div>
                    <p className={`text-xl font-bold font-mono tracking-tight ${parseFloat(data.summary.netMovement) >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                      <span className="text-[10px] mr-1 opacity-50">{data.reportingCurrency}</span>
                      {parseFloat(data.summary.netMovement || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                    </p>

                </CardContent>
              </Card>
              <Card className="border-primary/20 bg-primary/10 shadow-sm transition-all hover:shadow-md">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-[10px] font-bold text-primary uppercase tracking-widest">Closing Balance</p>
                    <div className="p-1.5 rounded-md bg-primary/20">
                      <FileText className="w-3.5 h-3.5 text-primary" />
                    </div>
                  </div>
                    <p className="text-xl font-black font-mono tracking-tight text-primary">
                      <span className="text-[10px] mr-1 opacity-50">{data.reportingCurrency}</span>
                      {parseFloat(data.closingBalance || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                    </p>

                </CardContent>
              </Card>
            </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card className="border-border/50 shadow-sm">
              <CardHeader className="pb-2 px-4 pt-4">
                <h3 className="text-sm font-bold flex items-center gap-2">
                  <FileText className="w-4 h-4 text-primary" /> Daily Activity Digest
                </h3>
              </CardHeader>
              <CardContent className="p-4">
                <div className="h-[250px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={data.chartData.dailyActivity}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                      <XAxis 
                        dataKey="date" 
                        fontSize={10} 
                        tickFormatter={(val) => new Date(val).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                      />
                      <YAxis fontSize={10} />
                      <Tooltip 
                        contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
                        labelFormatter={(val) => new Date(val).toLocaleDateString(undefined, { dateStyle: 'medium' })}
                      />
                      <Legend iconType="circle" />
                      <Bar dataKey="debits" name="Debits" fill="#10b981" radius={[4, 4, 0, 0]} />
                      <Bar dataKey="credits" name="Credits" fill="#f43f5e" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

            <Card className="border-border/50 shadow-sm">
              <CardHeader className="pb-2 px-4 pt-4">
                <h3 className="text-sm font-bold flex items-center gap-2">
                  <TrendingUp className="w-4 h-4 text-primary" /> Balance Evolution
                </h3>
              </CardHeader>
              <CardContent className="p-4">
                <div className="h-[250px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={data.chartData.balanceEvolution}>
                      <defs>
                        <linearGradient id="colorBalance" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3}/>
                          <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                      <XAxis 
                        dataKey="date" 
                        fontSize={10}
                        tickFormatter={(val) => new Date(val).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                      />
                      <YAxis fontSize={10} />
                      <Tooltip 
                        contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
                        labelFormatter={(val) => new Date(val).toLocaleDateString(undefined, { dateStyle: 'medium' })}
                      />
                      <Area type="monotone" dataKey="balance" name="Balance" stroke="#3b82f6" fillOpacity={1} fill="url(#colorBalance)" strokeWidth={2} />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          </div>

          <Card className="border-border/50 shadow-sm overflow-hidden">
            <div className="p-0">
              <Table>
                <TableHeader className="bg-muted/50">
                    <TableRow>
                      <TableHead className="text-[10px] font-bold uppercase tracking-wider w-[100px] px-4">Date</TableHead>
                      <TableHead className="text-[10px] font-bold uppercase tracking-wider w-[120px]">Entry #</TableHead>
                      <TableHead className="text-[10px] font-bold uppercase tracking-wider w-[120px]">Voucher #</TableHead>
                      <TableHead className="text-[10px] font-bold uppercase tracking-wider">Description</TableHead>
                      <TableHead className="text-[10px] font-bold uppercase tracking-wider text-right w-[150px]">Debit ({data.reportingCurrency})</TableHead>
                      <TableHead className="text-[10px] font-bold uppercase tracking-wider text-right w-[150px]">Credit ({data.reportingCurrency})</TableHead>
                      <TableHead className="text-[10px] font-bold uppercase tracking-wider text-right w-[150px] px-4">Balance ({data.reportingCurrency})</TableHead>
                    </TableRow>

                </TableHeader>
                  <TableBody>
                    <TableRow className="bg-muted/20 italic group">
                      <TableCell colSpan={6} className="text-xs font-medium text-muted-foreground px-4">
                        {data.page > 1 ? `Opening Balance for Page ${data.page}` : "Opening Balance"}
                      </TableCell>
                      <TableCell className="text-right font-mono text-sm font-bold px-4">
                        {parseFloat(data.pageOpeningBalance || data.openingBalance || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                      </TableCell>
                    </TableRow>
                    {data?.entries && Array.isArray(data.entries) && data.entries.map((entry: any) => (
                      <TableRow key={entry.id} className="hover:bg-muted/30 transition-colors">
                        <TableCell className="whitespace-nowrap text-[11px] font-medium px-4">
                          {entry.date ? new Date(entry.date).toLocaleDateString(undefined, { dateStyle: 'medium' }) : "-"}
                        </TableCell>
                        <TableCell className="font-mono text-[10px] text-muted-foreground">{entry.entryNumber}</TableCell>
                        <TableCell className="font-mono text-xs">
                          {entry.voucherId ? (
                            <Link 
                              href={`/dashboard/vouchers/${entry.voucherId}`}
                              className="text-primary hover:underline flex items-center gap-1.5 font-bold"
                            >
                              {entry.voucherNumber || "View"}
                              <Eye className="w-3 h-3" />
                            </Link>
                          ) : <span className="text-muted-foreground italic">{entry.voucherNumber || "-"}</span>}
                        </TableCell>
                        <TableCell className="text-xs leading-relaxed max-w-[300px]">{entry.description}</TableCell>
                        <TableCell className="text-right font-mono text-xs text-emerald-600 font-medium">
                          {parseFloat(entry.debit) > 0 ? parseFloat(entry.debit).toLocaleString(undefined, { minimumFractionDigits: 2 }) : "-"}
                        </TableCell>
                        <TableCell className="text-right font-mono text-xs text-rose-600 font-medium">
                          {parseFloat(entry.credit) > 0 ? parseFloat(entry.credit).toLocaleString(undefined, { minimumFractionDigits: 2 }) : "-"}
                        </TableCell>
                        <TableCell className="text-right font-mono text-xs font-bold px-4">
                          {parseFloat(entry.balance || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                        </TableCell>
                      </TableRow>
                    ))}
                    {data.page === data.totalPages && (
                      <TableRow className="bg-primary/5 font-bold">
                        <TableCell colSpan={6} className="text-sm font-bold uppercase tracking-tight text-primary px-4">Closing Balance</TableCell>
                        <TableCell className="text-right font-mono text-lg text-primary underline decoration-double underline-offset-4 px-4">
                          {parseFloat(data.closingBalance || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
              
              {data.totalPages > 1 && (
                <div className="flex items-center justify-between p-4 bg-muted/30 border-t border-border/50">
                  <p className="text-xs text-muted-foreground font-medium">
                    Showing {(data.page - 1) * data.pageSize + 1} to {Math.min(data.page * data.pageSize, data.totalCount)} of {data.totalCount} entries
                  </p>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handlePageChange(data.page - 1)}
                      disabled={data.page === 1}
                      className="h-8 text-xs font-bold uppercase tracking-wider"
                    >
                      Previous
                    </Button>
                    <div className="flex items-center gap-1 px-4">
                      {Array.from({ length: Math.min(5, data.totalPages) }, (_, i) => {
                        let pageNum = data.page;
                        if (data.page <= 3) pageNum = i + 1;
                        else if (data.page >= data.totalPages - 2) pageNum = data.totalPages - 4 + i;
                        else pageNum = data.page - 2 + i;
                        
                        if (pageNum <= 0 || pageNum > data.totalPages) return null;

                        return (
                          <Button
                            key={pageNum}
                            variant={data.page === pageNum ? "default" : "ghost"}
                            size="sm"
                            onClick={() => handlePageChange(pageNum)}
                            className="h-8 w-8 text-xs font-bold"
                          >
                            {pageNum}
                          </Button>
                        );
                      })}
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handlePageChange(data.page + 1)}
                      disabled={data.page === data.totalPages}
                      className="h-8 text-xs font-bold uppercase tracking-wider"
                    >
                      Next
                    </Button>
                  </div>
                </div>
              )}

          </Card>
        </>
      ) : (
        <div className="flex flex-col items-center justify-center py-24 text-center">
          <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mb-4">
            <FileText className="w-8 h-8 text-muted-foreground" />
          </div>
          <h3 className="text-lg font-bold mb-2">No Ledger Data</h3>
          <p className="text-sm text-muted-foreground max-w-xs">
            {data?.error ? data.error : "Select an account and defined date range to analyze transaction history."}
          </p>
        </div>
      )}
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
