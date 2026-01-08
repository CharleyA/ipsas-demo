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
  ArrowLeft
} from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";
import { useAuth } from "@/components/providers/auth-provider";
import { ReportToolbar } from "@/components/reports/report-toolbar";

export default function TrialBalancePage() {
  const { token } = useAuth();
  const [data, setData] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [date, setDate] = useState(new Date().toISOString().split("T")[0]);
  const [search, setSearch] = useState("");

  const fetchReport = async () => {
    setIsLoading(true);
    try {
      const response = await fetch(`/api/reports/trial-balance?date=${date}`, {
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
    if (token) fetchReport();
  }, [token, date]);

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
              As of {new Date(date).toLocaleDateString()}
            </p>
          </div>
        </div>
        <ReportToolbar 
          reportName="Trial Balance" 
          endpoint="/api/reports/trial-balance" 
          filters={{ date }} 
        />
      </div>

      <Card>
        <CardHeader>
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-center gap-4">
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
                <label className="text-xs font-medium text-muted-foreground">Search Accounts</label>
                <div className="relative w-64">
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
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Account Code</TableHead>
                  <TableHead>Account Name</TableHead>
                  <TableHead className="text-right">Debit (ZWG)</TableHead>
                  <TableHead className="text-right">Credit (ZWG)</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredRows.map((row: any) => (
                  <TableRow key={row.id}>
                    <TableCell className="font-mono text-sm">{row.code}</TableCell>
                    <TableCell>{row.name}</TableCell>
                    <TableCell className="text-right">
                      {row.debit > 0 ? parseFloat(row.debit).toLocaleString(undefined, { minimumFractionDigits: 2 }) : ""}
                    </TableCell>
                    <TableCell className="text-right text-red-600">
                      {row.credit > 0 ? parseFloat(row.credit).toLocaleString(undefined, { minimumFractionDigits: 2 }) : ""}
                    </TableCell>
                  </TableRow>
                ))}
                {filteredRows.length > 0 && (
                  <TableRow className="bg-muted/50 font-bold">
                    <TableCell colSpan={2}>Total</TableCell>
                    <TableCell className="text-right">
                      {parseFloat(data.totals.debit).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                    </TableCell>
                    <TableCell className="text-right">
                      {parseFloat(data.totals.credit).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
