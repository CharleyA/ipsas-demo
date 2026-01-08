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

export default function FinancialPositionPage() {
  const { token } = useAuth();
  const [data, setData] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [date, setDate] = useState(new Date().toISOString().split("T")[0]);

  const fetchReport = async () => {
    setIsLoading(true);
    try {
      const response = await fetch(`/api/reports/financial-position?date=${date}`, {
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
  }, [token, date]);

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
            <h1 className="text-3xl font-bold tracking-tight">Financial Position</h1>
            <p className="text-muted-foreground">Balance Sheet (IPSAS 1)</p>
          </div>
        </div>
        <ReportToolbar 
          reportName="Financial Position" 
          endpoint="/api/reports/financial-position" 
          filters={{ date }} 
        />
      </div>

      <Card>
        <CardHeader>
          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium text-muted-foreground">Report Date</label>
            <Input 
              type="date" 
              value={date} 
              onChange={(e) => setDate(e.target.value)}
              className="w-[180px]"
            />
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
              No data available for the selected date.
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
