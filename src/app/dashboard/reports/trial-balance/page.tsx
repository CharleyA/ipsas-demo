"use client";

import { useEffect, useState, useMemo } from "react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
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
  Loader2, 
  Search,
  ArrowLeft,
  Filter,
  TrendingUp,
  TrendingDown,
  Scale,
  PieChart as PieChartIcon,
  BarChart as BarChartIcon
} from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";
import { useAuth } from "@/components/providers/auth-provider";
import { ReportToolbar } from "@/components/reports/report-toolbar";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { 
  PieChart, 
  Pie, 
  Cell, 
  ResponsiveContainer, 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  Tooltip, 
  Legend,
  CartesianGrid
} from "recharts";

const COLORS = ['#0ea5e9', '#6366f1', '#8b5cf6', '#ec4899', '#f43f5e', '#f59e0b', '#10b981'];

export default function TrialBalancePage() {
  const { token } = useAuth();
  const [data, setData] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [date, setDate] = useState(new Date().toISOString().split("T")[0]);
  const [fundId, setFundId] = useState<string>("all");
  const [costCentreId, setCostCentreId] = useState<string>("all");
  const [funds, setFunds] = useState<any[]>([]);
  const [costCentres, setCostCentres] = useState<any[]>([]);
  const [search, setSearch] = useState("");

  const fetchDimensions = async () => {
    try {
      const [fundsRes, ccRes] = await Promise.all([
        fetch("/api/organisations/current/funds", { headers: { "Authorization": `Bearer ${token}` } }),
        fetch("/api/organisations/current/cost-centres", { headers: { "Authorization": `Bearer ${token}` } })
      ]);
      if (fundsRes.ok) setFunds(await fundsRes.json());
      if (ccRes.ok) setCostCentres(await ccRes.json());
    } catch (e) {
      console.error("Failed to fetch dimensions");
    }
  };

  const fetchReport = async () => {
    setIsLoading(true);
    try {
      let url = `/api/reports/trial-balance?date=${date}`;
      if (fundId !== "all") url += `&fundId=${fundId}`;
      if (costCentreId !== "all") url += `&costCentreId=${costCentreId}`;
      
      const response = await fetch(url, {
        headers: { "Authorization": `Bearer ${token}` }
      });
      const result = await response.json();
      setData(result);
    } catch (error) {
      toast.error("Failed to fetch Trial Balance");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (token) {
      fetchReport();
      fetchDimensions();
    }
  }, [token, date, fundId, costCentreId]);

  const filteredRows = useMemo(() => {
    return data?.rows?.filter((r: any) => 
      `${r.code} ${r.name}`.toLowerCase().includes(search.toLowerCase())
    ) || [];
  }, [data, search]);

  const chartData = useMemo(() => {
    if (!data?.rows) return { typeData: [], topAccounts: [] };

    // Group by type
    const types: Record<string, number> = {};
    data.rows.forEach((r: any) => {
      const type = r.type || "Other";
      types[type] = (types[type] || 0) + Math.abs(parseFloat(r.balance));
    });

    const typeData = Object.entries(types).map(([name, value]) => ({ name, value }));

    // Top 10 accounts by absolute balance
    const topAccounts = [...data.rows]
      .sort((a, b) => Math.abs(parseFloat(b.balance)) - Math.abs(parseFloat(a.balance)))
      .slice(0, 10)
      .map(a => ({
        name: a.name.length > 20 ? a.name.substring(0, 20) + "..." : a.name,
        balance: Math.abs(parseFloat(a.balance))
      }));

    return { typeData, topAccounts };
  }, [data]);

  const variance = useMemo(() => {
    if (!data?.totals) return 0;
    return Math.abs(parseFloat(data.totals.debit) - parseFloat(data.totals.credit));
  }, [data]);

  return (
    <div className="space-y-6 pb-12">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" asChild>
            <Link href="/dashboard/reports">
              <ArrowLeft className="w-4 h-4" />
            </Link>
          </Button>
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Trial Balance</h1>
            <p className="text-muted-foreground">
              Institutional performance summary as of {new Date(date).toLocaleDateString()}
            </p>
          </div>
        </div>
        <ReportToolbar 
          reportName="Trial Balance" 
          endpoint="/api/reports/trial-balance" 
          filters={{ 
            date, 
            fundId: fundId === "all" ? undefined : fundId, 
            costCentreId: costCentreId === "all" ? undefined : costCentreId 
          }} 
        />
      </div>

      {/* Quick Analysis Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="bg-blue-50/50 border-blue-100">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-blue-900">Total Institutional Debits</CardTitle>
            <TrendingUp className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-700">
              {data?.totals ? parseFloat(data.totals.debit).toLocaleString(undefined, { minimumFractionDigits: 2 }) : "—"}
            </div>
            <p className="text-xs text-blue-600/70 mt-1">ZWG Currency</p>
          </CardContent>
        </Card>
        
        <Card className="bg-indigo-50/50 border-indigo-100">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-indigo-900">Total Institutional Credits</CardTitle>
            <TrendingDown className="h-4 w-4 text-indigo-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-indigo-700">
              {data?.totals ? parseFloat(data.totals.credit).toLocaleString(undefined, { minimumFractionDigits: 2 }) : "—"}
            </div>
            <p className="text-xs text-indigo-600/70 mt-1">ZWG Currency</p>
          </CardContent>
        </Card>

        <Card className={`${variance < 0.01 ? "bg-emerald-50/50 border-emerald-100" : "bg-amber-50/50 border-amber-100"}`}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className={`text-sm font-medium ${variance < 0.01 ? "text-emerald-900" : "text-amber-900"}`}>
              Trial Balance Variance
            </CardTitle>
            <Scale className={`h-4 w-4 ${variance < 0.01 ? "text-emerald-600" : "text-amber-600"}`} />
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${variance < 0.01 ? "text-emerald-700" : "text-amber-700"}`}>
              {variance.toLocaleString(undefined, { minimumFractionDigits: 2 })}
            </div>
            <p className={`text-xs mt-1 ${variance < 0.01 ? "text-emerald-600/70" : "text-amber-600/70"}`}>
              {variance < 0.01 ? "Perfectly Balanced" : "Out of Balance"}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Visualizations */}
      {!isLoading && data?.rows && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <PieChartIcon className="w-4 h-4 text-primary" />
                <CardTitle className="text-lg">Account Type Distribution</CardTitle>
              </div>
              <CardDescription>Absolute balance weight by category</CardDescription>
            </CardHeader>
            <CardContent className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={chartData.typeData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="value"
                    label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                  >
                    {chartData.typeData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip 
                    formatter={(value: number) => value.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                  />
                </PieChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <BarChartIcon className="w-4 h-4 text-primary" />
                <CardTitle className="text-lg">Top 10 Account Balances</CardTitle>
              </div>
              <CardDescription>Highest value exposure by account</CardDescription>
            </CardHeader>
            <CardContent className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData.topAccounts} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} />
                  <XAxis type="number" hide />
                  <YAxis 
                    dataKey="name" 
                    type="category" 
                    width={120} 
                    fontSize={11} 
                    tickLine={false}
                    axisLine={false}
                  />
                  <Tooltip 
                    formatter={(value: number) => value.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                  />
                  <Bar dataKey="balance" fill="#6366f1" radius={[0, 4, 4, 0]} barSize={20} />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>
      )}

      <Card>
        <CardHeader>
          <div className="flex flex-col gap-4">
            <div className="flex flex-wrap items-end gap-4">
              <div className="flex flex-col gap-1">
                <label className="text-xs font-medium text-muted-foreground">Report Date</label>
                <Input 
                  type="date" 
                  value={date} 
                  onChange={(e) => setDate(e.target.value)}
                  className="w-[180px]"
                />
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-xs font-medium text-muted-foreground">Fund Filter</label>
                <Select value={fundId} onValueChange={setFundId}>
                  <SelectTrigger className="w-[200px]">
                    <SelectValue placeholder="All Funds" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Funds</SelectItem>
                    {funds.map(f => <SelectItem key={f.id} value={f.id}>{f.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-xs font-medium text-muted-foreground">Cost Centre</label>
                <Select value={costCentreId} onValueChange={setCostCentreId}>
                  <SelectTrigger className="w-[200px]">
                    <SelectValue placeholder="All Centres" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Centres</SelectItem>
                    {costCentres.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>

              <div className="flex flex-col gap-1 flex-1 min-w-[200px]">
                <label className="text-xs font-medium text-muted-foreground">Search Accounts</label>
                <div className="relative">
                  <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Code or name..."
                    className="pl-8"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                  />
                </div>
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-8 h-8 animate-spin text-primary" />
            </div>
          ) : (
            <div className="rounded-md border overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow className="bg-slate-50">
                    <TableHead className="w-[150px]">Code</TableHead>
                    <TableHead>Account Name</TableHead>
                    <TableHead className="text-right w-[180px]">Debit (ZWG)</TableHead>
                    <TableHead className="text-right w-[180px]">Credit (ZWG)</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredRows.map((row: any) => (
                    <TableRow key={row.id} className="group hover:bg-slate-50/50">
                      <TableCell className="font-mono text-sm">{row.code}</TableCell>
                      <TableCell>
                        <Link 
                          href={`/dashboard/reports/general-ledger?accountId=${row.id}&endDate=${date}`}
                          className="text-blue-600 hover:underline font-medium"
                        >
                          {row.name}
                        </Link>
                      </TableCell>
                      <TableCell className="text-right font-mono">
                        {row.debit > 0 ? parseFloat(row.debit).toLocaleString(undefined, { minimumFractionDigits: 2 }) : "—"}
                      </TableCell>
                      <TableCell className="text-right font-mono text-red-600">
                        {row.credit > 0 ? parseFloat(row.credit).toLocaleString(undefined, { minimumFractionDigits: 2 }) : "—"}
                      </TableCell>
                    </TableRow>
                  ))}
                  {filteredRows.length > 0 && (
                    <TableRow className="bg-slate-100/50 font-bold border-t-2">
                      <TableCell colSpan={2} className="text-right pr-4">Institutional Totals</TableCell>
                      <TableCell className="text-right font-mono">
                        {parseFloat(data.totals.debit).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                      </TableCell>
                      <TableCell className="text-right font-mono">
                        {parseFloat(data.totals.credit).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                      </TableCell>
                    </TableRow>
                  )}
                  {filteredRows.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={4} className="h-24 text-center text-muted-foreground italic">
                        No accounting records found matching the current filters.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
