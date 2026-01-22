"use client";

import { useEffect, useState, useRef } from "react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { 
  Loader2, 
  ArrowLeft,
  TrendingUp,
  Wallet,
  ShieldAlert,
  PieChart as PieChartIcon,
  Printer,
  Mail,
  FileDown,
  ChevronRight,
  RefreshCcw,
  Building2,
  Calendar,
  Layers,
  Activity
} from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";
import { useAuth } from "@/components/providers/auth-provider";
import { ReportToolbar } from "@/components/reports/report-toolbar";
import { FinancialStatementTable } from "@/components/reports/financial-statement-table";
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

const COLORS = ['#10b981', '#ef4444', '#3b82f6', '#f59e0b', '#8b5cf6'];

export default function FinancialPositionPage() {
  const { token } = useAuth();
  const [data, setData] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [date, setDate] = useState(new Date().toISOString().split("T")[0]);
  const [reportingCurrency, setReportingCurrency] = useState("ZWG");
  const printRef = useRef<HTMLDivElement>(null);

  const fetchReport = async () => {
    setIsLoading(true);
    try {
      const response = await fetch(`/api/reports/financial-position?date=${date}&reportingCurrency=${reportingCurrency}`, {
        headers: { "Authorization": `Bearer ${token}` }
      });
      const result = await response.json();
      setData(result);
    } catch (error) {
      toast.error("Failed to fetch Financial Position");
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
          reportName: "Statement of Financial Position",
          endpoint: `/api/reports/financial-position?date=${date}&reportingCurrency=${reportingCurrency}`,
          summary: {
            "As At": format(new Date(date), "PPP"),
            "Currency": reportingCurrency,
            "Total Assets": `${reportingCurrency} ${parseFloat(data.summary.totalAssets).toLocaleString()}`,
            "Total Liabilities": `${reportingCurrency} ${parseFloat(data.summary.totalLiabilities).toLocaleString()}`,
            "Net Assets/Equity": `${reportingCurrency} ${parseFloat(data.summary.netAssets).toLocaleString()}`,
          }
        })
      });

      if (!response.ok) throw new Error("Failed to send email");
      toast.success("Report emailed successfully");
    } catch (error) {
      toast.error("Failed to send report email");
    }
  };

  const SummaryCard = ({ title, value, icon: Icon, trend, colorClass }: any) => (
    <Card className="overflow-hidden border-slate-200/60 shadow-sm hover:shadow-md transition-all duration-300">
      <CardContent className="p-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-slate-500 mb-1 uppercase tracking-wider">{title}</p>
            <h3 className="text-2xl font-bold text-slate-900 tracking-tight">
              {reportingCurrency} {parseFloat(value).toLocaleString(undefined, { minimumFractionDigits: 2 })}
            </h3>
            {trend && (
              <div className="flex items-center gap-1 mt-2">
                <TrendingUp className="w-3.5 h-3.5 text-emerald-500" />
                <span className="text-xs font-semibold text-emerald-600">{trend}</span>
              </div>
            )}
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
              <span className="px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider bg-indigo-50 text-indigo-600 rounded-full border border-indigo-100">IPSAS 1</span>
              <span className="text-slate-300">/</span>
              <span className="text-xs font-medium text-slate-400">Financial Reports</span>
            </div>
            <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">Statement of Financial Position</h1>
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
            reportName="Financial Position" 
            endpoint="/api/reports/financial-position" 
            filters={{ date, reportingCurrency }} 
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
                Reporting Date
              </label>
              <Input 
                type="date" 
                value={date} 
                onChange={(e) => setDate(e.target.value)}
                className="w-[200px] border-slate-200 focus:ring-indigo-500 focus:border-indigo-500"
              />
            </div>

            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-500 uppercase tracking-widest flex items-center gap-1.5">
                <Layers className="w-3.5 h-3.5" />
                Reporting Currency
              </label>
              <Select value={reportingCurrency} onValueChange={setReportingCurrency}>
                <SelectTrigger className="w-[180px] border-slate-200">
                  <SelectValue placeholder="Select Currency" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ZWG">ZWG (Base)</SelectItem>
                  <SelectItem value="USD">USD</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <Button onClick={fetchReport} disabled={isLoading} variant="secondary" className="gap-2">
              {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCcw className="w-4 h-4" />}
              Generate Report
            </Button>
          </div>
        </CardContent>
      </Card>

      {isLoading ? (
        <div className="flex flex-col items-center justify-center py-24 gap-4">
          <Loader2 className="w-12 h-12 animate-spin text-indigo-500" />
          <p className="text-slate-500 font-medium animate-pulse">Assembling financial statement...</p>
        </div>
      ) : data ? (
        <div ref={printRef} className="space-y-8 print:p-8 print:bg-white print:text-black print:m-0 landscape-container">
          {/* Print Header */}
          <div className="hidden print:block mb-10 border-b-2 border-slate-900 pb-6">
            <div className="flex justify-between items-start">
              <div>
                <h1 className="text-3xl font-black text-slate-900 uppercase tracking-tighter">Statement of Financial Position</h1>
                <p className="text-slate-600 font-bold mt-1 uppercase tracking-widest text-sm">{data.organisationName || "Official Report"}</p>
              </div>
              <div className="text-right">
                <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Reporting Date</p>
                <p className="text-lg font-bold text-slate-900">{format(new Date(date), "MMMM d, yyyy")}</p>
                <p className="text-xs font-bold text-indigo-600 mt-1">CURRENCY: {reportingCurrency}</p>
              </div>
            </div>
          </div>

          {/* Info Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 print:grid-cols-4">
            <SummaryCard 
              title="Total Assets" 
              value={data.summary.totalAssets} 
              icon={Wallet} 
              colorClass="bg-emerald-50 text-emerald-600"
            />
            <SummaryCard 
              title="Total Liabilities" 
              value={data.summary.totalLiabilities} 
              icon={ShieldAlert} 
              colorClass="bg-rose-50 text-rose-600"
            />
            <SummaryCard 
              title="Net Assets/Equity" 
              value={data.summary.netAssets} 
              icon={Building2} 
              colorClass="bg-indigo-50 text-indigo-600"
            />
            <Card className="overflow-hidden border-slate-200/60 shadow-sm hover:shadow-md transition-all duration-300">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-slate-500 mb-1 uppercase tracking-wider">Asset Coverage</p>
                    <h3 className="text-2xl font-bold text-slate-900 tracking-tight">
                      {data.summary.totalLiabilities > 0 
                        ? (Number(data.summary.totalAssets) / Number(data.summary.totalLiabilities)).toFixed(2) 
                        : "∞"}x
                    </h3>
                  </div>
                  <div className="p-3 rounded-xl bg-slate-50 text-slate-600">
                    <Activity className="w-6 h-6" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Charts Row */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 print:grid-cols-2">
            <Card className="border-slate-200/60 shadow-sm">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <div>
                  <CardTitle className="text-base font-bold text-slate-800">Composition of Financial Position</CardTitle>
                  <CardDescription>Breakdown of top-level categories</CardDescription>
                </div>
                <PieChartIcon className="w-5 h-5 text-slate-400" />
              </CardHeader>
              <CardContent className="h-[300px] mt-4">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={data.chartData.composition}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={80}
                      paddingAngle={5}
                      dataKey="value"
                      label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                    >
                        {data.chartData.composition.map((entry: any, index: number) => (
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

            <Card className="border-slate-200/60 shadow-sm">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <div>
                  <CardTitle className="text-base font-bold text-slate-800">Institutional Balance Summary</CardTitle>
                  <CardDescription>Major account categories volume</CardDescription>
                </div>
                <Activity className="w-5 h-5 text-slate-400" />
              </CardHeader>
              <CardContent className="h-[300px] mt-4">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={data.chartData.composition}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                    <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#64748b' }} />
                    <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#64748b' }} />
                    <Tooltip 
                      cursor={{ fill: '#f8fafc' }}
                      formatter={(value: any) => `${reportingCurrency} ${parseFloat(value).toLocaleString()}`}
                      contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                    />
                    <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                      {data.chartData.composition.map((entry: any, index: number) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} fillOpacity={0.8} />
                      ))}
                    </Bar>
                  </BarChart>
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
                      <Layers className="w-5 h-5 text-indigo-500" />
                      Classification Breakdown
                    </div>
                    <div className="flex items-center gap-3 px-3 py-1 bg-slate-100 rounded-lg text-xs font-semibold text-slate-500">
                      <span>Total Lines: {data.rows.length}</span>
                      <span className="w-1 h-1 rounded-full bg-slate-300" />
                      <span>Display Limit: 50+</span>
                    </div>
                  </CardTitle>

              </div>
            </CardHeader>
            <CardContent className="p-0">
              <FinancialStatementTable data={data.rows} currency={reportingCurrency} />
            </CardContent>
          </Card>

          {/* Print Footer */}
          <div className="hidden print:block mt-12 pt-8 border-t border-slate-200">
            <div className="grid grid-cols-3 gap-8">
              <div className="space-y-4">
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Prepared By</p>
                <div className="h-10 border-b border-slate-300 w-full" />
                <p className="text-xs font-bold">Financial Controller</p>
              </div>
              <div className="space-y-4">
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Authorized By</p>
                <div className="h-10 border-b border-slate-300 w-full" />
                <p className="text-xs font-bold">Head of Institution / Principal</p>
              </div>
              <div className="space-y-4">
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Verification Date</p>
                <div className="h-10 border-b border-slate-300 w-full" />
                <p className="text-xs font-bold">{format(new Date(), "PPpp")}</p>
              </div>
            </div>
            <div className="mt-12 text-center">
              <p className="text-[9px] text-slate-400 uppercase tracking-[0.2em]">Generated by IPSAS Accounting System • Confidential Regulatory Document</p>
            </div>
          </div>
        </div>
      ) : (
        <div className="text-center py-24 bg-slate-50 rounded-2xl border-2 border-dashed border-slate-200">
          <ShieldAlert className="w-12 h-12 text-slate-300 mx-auto mb-4" />
          <h3 className="text-lg font-bold text-slate-900">No Data Discovered</h3>
          <p className="text-slate-500 max-w-xs mx-auto mt-2">We couldn't find any financial records for the selected period. Please verify your data entry or try a different date.</p>
        </div>
      )}

      {/* Global CSS for Landscape Print */}
      <style jsx global>{`
        @media print {
          @page {
            size: landscape;
            margin: 0;
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
          header, nav, .print-hidden {
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
