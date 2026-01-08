"use client";

import { useEffect, useState } from "react";
import {
  Card,
  CardContent,
  CardHeader,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { 
  Loader2, 
  ArrowLeft
} from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";
import { useAuth } from "@/components/providers/auth-provider";
import { ReportToolbar } from "@/components/reports/report-toolbar";
import { FinancialStatementTable } from "@/components/reports/financial-statement-table";

export default function CashFlowPage() {
  const { token } = useAuth();
  const [data, setData] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [startDate, setStartDate] = useState(
    new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split("T")[0]
  );
  const [endDate, setEndDate] = useState(new Date().toISOString().split("T")[0]);

  const fetchReport = async () => {
    setIsLoading(true);
    try {
      const response = await fetch(`/api/reports/cashflow?startDate=${startDate}&endDate=${endDate}`, {
        headers: { "Authorization": `Bearer ${token}` }
      });
      const result = await response.json();
      setData(result);
    } catch (error) {
      toast.error("Failed to fetch Cash Flow Statement");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (token) fetchReport();
  }, [token, startDate, endDate]);

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
            <h1 className="text-3xl font-bold tracking-tight">Cash Flow Statement</h1>
            <p className="text-muted-foreground">Statement of Cash Flows (IPSAS 2)</p>
          </div>
        </div>
        <ReportToolbar 
          reportName="Cash Flow" 
          endpoint="/api/reports/cashflow" 
          filters={{ startDate, endDate }} 
        />
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-4">
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
            <FinancialStatementTable data={data.rows} />
          ) : (
            <div className="text-center py-12 text-muted-foreground">
              No data available for the selected range.
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
