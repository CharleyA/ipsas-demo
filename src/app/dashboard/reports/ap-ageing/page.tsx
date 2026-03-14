"use client";

import { useEffect, useState, useRef } from "react";
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
  ArrowLeft,
  Search,
  Printer,
  Mail,
  RefreshCcw,
  Calendar,
  Layers,
  Activity,
  AlertTriangle,
  TrendingUp,
  ShieldAlert,
  Coins,
  History,
  Clock,
  ExternalLink,
  Truck
} from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";
import { useAuth } from "@/components/providers/auth-provider";
import { ReportToolbar } from "@/components/reports/report-toolbar";
import { 
  PieChart, 
  Pie, 
  Cell, 
  ResponsiveContainer, 
  Tooltip, 
  Legend,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid
} from "recharts";
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select";
import { format } from "date-fns";
import { cn } from "@/lib/utils";

const COLORS = ['#ef4444', '#f59e0b', '#3b82f6', '#10b981', '#8b5cf6'];

export default function APAgeingPage() {
  const { token } = useAuth();
  const [data, setData] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [date, setDate] = useState(new Date().toISOString().split("T")[0]);
  const [reportingCurrency, setReportingCurrency] = useState("USD");
  const [search, setSearch] = useState("");
  const printRef = useRef<HTMLDivElement>(null);

  const fetchReport = async () => {
    setIsLoading(true);
    try {
      const response = await fetch(`/api/reports/ap-ageing?date=${date}&currency=${reportingCurrency}`, {
        headers: { "Authorization": `Bearer ${token}` }
      });
      const result = await response.json();
      setData(result);
    } catch (error) {
      toast.error("Failed to fetch AP Ageing Report");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (token) fetchReport();
  }, [token, date, reportingCurrency]);

  const handlePrint = () => {
    window.print();
  };

  const handleEmailReport = async () => {
    try {
      const response = await fetch("/api/reports/email", {
        method: "POST",
        headers: { 
          "Authorization": `Bearer ${token}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          reportName: "AP Ageing Report",
          endpoint: `/api/reports/ap-ageing?date=${date}&currency=${reportingCurrency}`,
          summary: {
            "As At": format(new Date(date), "PP"),
            "Currency": reportingCurrency,
            "Total Payables": `${reportingCurrency} ${parseFloat(data.summary.totalOutstanding).toLocaleString()}`,
            "Current": `${reportingCurrency} ${parseFloat(data.summary.currentAmount).toLocaleString()}`,
            "Overdue (>30 Days)": `${reportingCurrency} ${parseFloat(data.summary.overdueAmount).toLocaleString()}`,
            "Critical (>90 Days)": `${reportingCurrency} ${parseFloat(data.summary.criticalAmount).toLocaleString()}`,
          }
        })
      });

      if (!response.ok) throw new Error("Failed to send email");
      toast.success("Report emailed successfully");
    } catch (error) {
      toast.error("Failed to send report email");
    }
  };

  const filteredRows = data?.rows?.filter((r: any) => 
    r.name.toLowerCase().includes(search.toLowerCase())
  ) || [];

  const SummaryCard = ({ title, value, icon: Icon, colorClass, subtitle }: any) => (
    <Card className="overflow-hidden border-slate-200/60 shadow-sm hover:shadow-md transition-all duration-300">
      <CardContent className="p-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-slate-500 mb-1 uppercase tracking-wider">{title}</p>
            <h3 className="text-2xl font-bold text-slate-900 tracking-tight">
               {title.includes("Age") ? `${Math.round(value)} Days` :
               `${reportingCurrency} ${parseFloat(value).toLocaleString(undefined, { minimumFractionDigits: 2 })}`}
            </h3>
            {subtitle && <p className="text-xs text-muted-foreground mt-1">{subtitle}</p>}
          </div>
          <div className={cn("p-3 rounded-xl", colorClass)}>
            <Icon className="w-6 h-6" />
          </div>
        </div>
      </CardContent>
    </Card>
  );

  return (
    <div className="space-y-8 pb-10">
      {/* Top Navigation & Actions */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 print:hidden">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" asChild className="rounded-full hover:bg-slate-100 transition-colors">
            <Link href="/dashboard/reports">
              <ArrowLeft className="w-4 h-4" />
            </Link>
          </Button>
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider bg-rose-50 text-rose-600 rounded-full border border-rose-100 flex items-center gap-1">
                <Truck className="w-2.5 h-2.5" />
                Payables
              </span>
              <span className="text-slate-300">/</span>
              <span className="text-xs font-medium text-slate-400">Ageing Analysis</span>
            </div>
            <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">AP Ageing Report</h1>
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={handlePrint} className="gap-2 border-slate-200 font-medium">
            <Printer className="w-4 h-4" />
            Print
          </Button>
          <Button variant="outline" size="sm" onClick={handleEmailReport} className="gap-2 border-slate-200 font-medium">
            <Mail className="w-4 h-4" />
            Email
          </Button>
          <div className="h-4 w-[1px] bg-slate-200 mx-1" />
          <ReportToolbar 
            reportName="AP Ageing" 
            endpoint="/api/reports/ap-ageing" 
            filters={{ date, currency: reportingCurrency }} 
          />
        </div>
      </div>

      {/* Control Panel */}
      <Card className="border-slate-200/60 shadow-sm print:hidden">
        <CardContent className="p-4 sm:p-6">
          <div className="flex flex-wrap items-end gap-6">
            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-500 uppercase tracking-widest flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5" />
                As Of Date
              </label>
              <Input 
                type="date" 
                value={date} 
                onChange={(e) => setDate(e.target.value)}
                className="w-[180px] border-slate-200 focus:ring-rose-500 focus:border-rose-500"
              />
            </div>

            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-500 uppercase tracking-widest flex items-center gap-1.5">
                <Layers className="w-3.5 h-3.5" />
                Currency
              </label>
              <Select value={reportingCurrency} onValueChange={setReportingCurrency}>
                <SelectTrigger className="w-[140px] border-slate-200">
                  <SelectValue placeholder="Currency" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="USD">USD</SelectItem>
                  <SelectItem value="ZWG">ZWG</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-500 uppercase tracking-widest flex items-center gap-1.5">
                <Search className="w-3.5 h-3.5" />
                Search Suppliers
              </label>
              <div className="relative w-64">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Supplier name..."
                  className="pl-9 border-slate-200 focus:ring-rose-500 focus:border-rose-500"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>
            </div>

            <Button onClick={fetchReport} disabled={isLoading} variant="secondary" className="gap-2 ml-auto">
              {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCcw className="w-4 h-4" />}
              Refresh Data
            </Button>
          </div>
        </CardContent>
      </Card>

      {isLoading ? (
        <div className="flex flex-col items-center justify-center py-24 gap-4">
          <Loader2 className="w-12 h-12 animate-spin text-rose-500" />
          <p className="text-slate-500 font-medium animate-pulse">Calculating ageing buckets...</p>
        </div>
      ) : data ? (
        <div ref={printRef} className="space-y-8 print:p-8 print:bg-white print:text-black print:m-0 landscape-container">
          {/* Print Header */}
          <div className="hidden print:block mb-10 border-b-2 border-slate-900 pb-6">
            <div className="flex justify-between items-start">
              <div>
                <h1 className="text-3xl font-black text-slate-900 uppercase tracking-tighter">AP Ageing Report</h1>
                <p className="text-slate-600 font-bold mt-1 uppercase tracking-widest text-sm">{data.organisationName || "Accounts Payable"}</p>
                <p className="text-slate-500 text-xs mt-1 italic">As at {format(new Date(date), "MMMM d, yyyy")}</p>
              </div>
              <div className="text-right">
                <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Reported Currency</p>
                <p className="text-lg font-bold text-slate-900">{reportingCurrency}</p>
                <p className="text-xs font-bold text-rose-600 mt-1 uppercase tracking-widest">ZFRM COMPLIANT</p>
              </div>
            </div>
          </div>

          {/* Info Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 print:grid-cols-4">
            <SummaryCard 
              title="Total Payables" 
              value={data.summary.totalOutstanding} 
              icon={TrendingUp} 
              colorClass="bg-slate-50 text-slate-600"
              subtitle="Total gross obligations"
            />
            <SummaryCard 
              title="Current (0-30d)" 
              value={data.summary.currentAmount} 
              icon={Activity} 
              colorClass="bg-blue-50 text-blue-600"
              subtitle="Due within 30 days"
            />
            <SummaryCard 
              title="Overdue (>30d)" 
              value={data.summary.overdueAmount} 
              icon={Clock} 
              colorClass="bg-amber-50 text-amber-600"
              subtitle="Past due bills"
            />
            <SummaryCard 
              title="Critical (>90d)" 
              value={data.summary.criticalAmount} 
              icon={ShieldAlert} 
              colorClass="bg-rose-50 text-rose-600"
              subtitle="At risk of litigation"
            />
          </div>

          {/* Charts Row */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 print:grid-cols-2">
            <Card className="border-slate-200/60 shadow-sm">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <div>
                  <CardTitle className="text-base font-bold text-slate-800">Ageing Distribution</CardTitle>
                  <CardDescription>Value distribution by age bucket</CardDescription>
                </div>
                <Activity className="w-5 h-5 text-slate-400" />
              </CardHeader>
              <CardContent className="h-[300px] mt-4">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={data.chartData.distribution}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                    <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#64748b' }} />
                    <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#64748b' }} />
                    <Tooltip 
                      cursor={{ fill: '#f8fafc' }}
                      formatter={(value: any) => `${reportingCurrency} ${parseFloat(value).toLocaleString()}`}
                      contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                    />
                    <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                      {data.chartData.distribution.map((entry: any, index: number) => (
                        <Cell 
                          key={`cell-${index}`} 
                          fill={index === 0 ? '#10b981' : index === 1 ? '#3b82f6' : index === 2 ? '#f59e0b' : '#ef4444'} 
                          fillOpacity={0.8} 
                        />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card className="border-slate-200/60 shadow-sm">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <div>
                  <CardTitle className="text-base font-bold text-slate-800">Top Suppliers</CardTitle>
                  <CardDescription>Highest outstanding balances</CardDescription>
                </div>
                <AlertTriangle className="w-5 h-5 text-slate-400" />
              </CardHeader>
              <CardContent className="h-[300px] mt-4">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={data.chartData.topEntities}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={100}
                      paddingAngle={5}
                      dataKey="value"
                      minAngle={15}
                      label={({ name, percent }) => 
                        percent > 0.05 ? `${name.substring(0, 10)}...` : ""
                      }
                    >
                      {data.chartData.topEntities.map((entry: any, index: number) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip 
                      formatter={(value: any) => `${reportingCurrency} ${parseFloat(value).toLocaleString()}`}
                      contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                    />
                    <Legend verticalAlign="bottom" height={36} />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>

          {/* Data Table */}
          <Card className="border-slate-200/60 shadow-sm overflow-hidden print:border-none print:shadow-none">
            <CardHeader className="bg-slate-50/50 border-b border-slate-100 px-6 py-4 print:hidden">
              <div className="flex items-center justify-between">
                  <CardTitle className="text-lg font-bold text-slate-800 flex items-center justify-between w-full">
                    <div className="flex items-center gap-2">
                      <Layers className="w-5 h-5 text-rose-500" />
                      Detailed Payables Ledger
                    </div>
                    <div className="flex items-center gap-3 px-3 py-1 bg-white border border-slate-200 rounded-lg text-xs font-semibold text-slate-500 shadow-sm">
                      <span className="flex items-center gap-1"><History className="w-3 h-3" /> Ledger Data</span>
                      <span className="w-1 h-1 rounded-full bg-slate-300" />
                      <span>{reportingCurrency}</span>
                    </div>
                  </CardTitle>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow className="bg-slate-50/50 hover:bg-slate-50/50 border-slate-100">
                    <TableHead className="font-bold text-slate-900 pl-6 py-4">Supplier Name</TableHead>
                    <TableHead className="text-right font-bold text-slate-900">Current</TableHead>
                    <TableHead className="text-right font-bold text-slate-900">31-60 Days</TableHead>
                    <TableHead className="text-right font-bold text-slate-900">61-90 Days</TableHead>
                    <TableHead className="text-right font-bold text-slate-900">91-120 Days</TableHead>
                    <TableHead className="text-right font-bold text-slate-900">121+ Days</TableHead>
                    <TableHead className="text-right font-bold text-slate-900 pr-6">Total Owed</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredRows.map((row: any) => (
                    <TableRow key={row.id} className="hover:bg-slate-50/30 transition-colors border-slate-50">
                      <TableCell className="pl-6 font-medium text-slate-700">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-[10px] font-bold text-slate-500">
                            {row.name.substring(0, 2).toUpperCase()}
                          </div>
                          <div>
                            <p className="font-semibold text-slate-900">{row.name}</p>
                            <Link href={`/dashboard/suppliers/${row.id}`} className="text-[10px] text-rose-600 hover:underline flex items-center gap-0.5">
                              View Statement <ExternalLink className="w-2 h-2" />
                            </Link>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="text-right text-slate-600">{parseFloat(row.current).toLocaleString(undefined, { minimumFractionDigits: 2 })}</TableCell>
                      <TableCell className="text-right text-slate-600">{parseFloat(row.p30).toLocaleString(undefined, { minimumFractionDigits: 2 })}</TableCell>
                      <TableCell className="text-right text-slate-600">{parseFloat(row.p60).toLocaleString(undefined, { minimumFractionDigits: 2 })}</TableCell>
                      <TableCell className="text-right text-slate-600 font-medium text-amber-600">{parseFloat(row.p90).toLocaleString(undefined, { minimumFractionDigits: 2 })}</TableCell>
                      <TableCell className="text-right text-slate-600 font-medium text-rose-600">{parseFloat(row.p120).toLocaleString(undefined, { minimumFractionDigits: 2 })}</TableCell>
                      <TableCell className="text-right font-black text-slate-900 pr-6">{parseFloat(row.total).toLocaleString(undefined, { minimumFractionDigits: 2 })}</TableCell>
                    </TableRow>
                  ))}
                  {filteredRows.length > 0 && (
                    <TableRow className="bg-slate-900 hover:bg-slate-900 border-none">
                      <TableCell className="pl-6 py-5 font-black text-white uppercase tracking-widest text-xs">Total Liabilities</TableCell>
                      <TableCell className="text-right font-bold text-white/90">{parseFloat(data.totals.current).toLocaleString(undefined, { minimumFractionDigits: 2 })}</TableCell>
                      <TableCell className="text-right font-bold text-white/90">{parseFloat(data.totals.p30).toLocaleString(undefined, { minimumFractionDigits: 2 })}</TableCell>
                      <TableCell className="text-right font-bold text-white/90">{parseFloat(data.totals.p60).toLocaleString(undefined, { minimumFractionDigits: 2 })}</TableCell>
                      <TableCell className="text-right font-bold text-amber-400">{parseFloat(data.totals.p90).toLocaleString(undefined, { minimumFractionDigits: 2 })}</TableCell>
                      <TableCell className="text-right font-bold text-rose-400">{parseFloat(data.totals.p120).toLocaleString(undefined, { minimumFractionDigits: 2 })}</TableCell>
                      <TableCell className="text-right font-black text-white pr-6 text-lg">{parseFloat(data.totals.total).toLocaleString(undefined, { minimumFractionDigits: 2 })}</TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          {/* Print Footer */}
          <div className="hidden print:block mt-12 pt-8 border-t border-slate-200">
            <div className="grid grid-cols-3 gap-8">
              <div className="space-y-4">
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Accounts Payable Clerk</p>
                <div className="h-10 border-b border-slate-300 w-full" />
                <p className="text-xs font-bold text-slate-900">Signature / Date</p>
              </div>
              <div className="space-y-4">
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Bursar / Accountant</p>
                <div className="h-10 border-b border-slate-300 w-full" />
                <p className="text-xs font-bold text-slate-900">Signature / Date</p>
              </div>
              <div className="space-y-4">
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Headmaster / Principal</p>
                <div className="h-10 border-b border-slate-300 w-full" />
                <p className="text-xs font-bold text-slate-900">Signature / Date</p>
              </div>
            </div>
            <div className="mt-12 text-center">
              <p className="text-[9px] text-slate-400 uppercase tracking-[0.2em]">Generated by IPSAS Accounting System • Confidential Supplier Payable Data</p>
            </div>
          </div>
        </div>
      ) : (
        <div className="text-center py-24 bg-slate-50 rounded-2xl border-2 border-dashed border-slate-200">
          <ShieldAlert className="w-12 h-12 text-slate-300 mx-auto mb-4" />
          <h3 className="text-lg font-bold text-slate-900">No Ageing Data Available</h3>
          <p className="text-slate-500 max-w-xs mx-auto mt-2">All supplier obligations are currently settled.</p>
        </div>
      )}

      {/* Global CSS for Landscape Print */}
      <style jsx global>{`
        @media print {
          @page {
            size: landscape;
            margin: 0.5cm;
          }
          body {
            margin: 0;
            padding: 0;
            background: white !important;
            color: black !important;
          }
          .landscape-container {
            width: 100% !important;
            max-width: none !important;
          }
          header, nav, footer, .print-hidden {
            display: none !important;
          }
          .recharts-responsive-container {
            width: 100% !important;
            height: 250px !important;
          }
        }
      `}</style>
    </div>
  );
}
