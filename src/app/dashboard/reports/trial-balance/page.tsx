"use client";

import { useEffect, useState } from "react";
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
  Loader2, 
  Search,
  ArrowLeft,
  Filter
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
        fetch("/api/admin/funds", { headers: { "Authorization": `Bearer ${token}` } }),
        fetch("/api/admin/cost-centres", { headers: { "Authorization": `Bearer ${token}` } })
      ]);
      setFunds(await fundsRes.json());
      setCostCentres(await ccRes.json());
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

  const filteredRows = data?.rows?.filter((r: any) => 
    `${r.code} ${r.name}`.toLowerCase().includes(search.toLowerCase())
  ) || [];

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
