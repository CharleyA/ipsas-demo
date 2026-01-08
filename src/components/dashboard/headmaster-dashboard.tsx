"use client";

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { 
  Banknote, 
  Clock, 
  Users, 
  TrendingUp, 
  ChevronRight,
  AlertCircle
} from "lucide-react";
import { formatCurrency } from "@/lib/utils";
import Link from "next/link";
import { Button } from "@/components/ui/button";

interface HeadmasterDashboardProps {
  data: {
    cashAtBank: number;
    feesArrears: number;
    pendingApprovals: number;
    topSpending: Array<{ name: string; amount: number }>;
    budgetUtilisation: number;
  };
}

export function HeadmasterDashboard({ data }: HeadmasterDashboardProps) {
  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Cash at Bank</CardTitle>
            <Banknote className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(data.cashAtBank)}</div>
            <p className="text-xs text-muted-foreground">Combined liquid balance</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Fees Arrears</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(data.feesArrears)}</div>
            <p className="text-xs text-muted-foreground">Total outstanding student fees</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending Approvals</CardTitle>
            <Clock className="h-4 w-4 text-yellow-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data.pendingApprovals}</div>
            <p className="text-xs text-muted-foreground">Vouchers awaiting your sign-off</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Budget Utilisation</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data.budgetUtilisation}%</div>
            <Progress value={data.budgetUtilisation} className="mt-2" />
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
        <Card className="col-span-4">
          <CardHeader>
            <CardTitle>Top Spending Categories</CardTitle>
            <CardDescription>Major expenditure areas this month</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {data.topSpending.map((item, i) => (
                <div key={i} className="flex items-center">
                  <div className="w-full">
                    <div className="flex justify-between mb-1">
                      <span className="text-sm font-medium">{item.name}</span>
                      <span className="text-sm text-muted-foreground">{formatCurrency(item.amount)}</span>
                    </div>
                    <Progress value={(item.amount / Math.max(...data.topSpending.map(s => s.amount))) * 100} />
                  </div>
                </div>
              ))}
              {data.topSpending.length === 0 && (
                <p className="text-sm text-muted-foreground italic">No spending data for this month.</p>
              )}
            </div>
          </CardContent>
        </Card>

        <Card className="col-span-3">
          <CardHeader>
            <CardTitle>Action Items</CardTitle>
            <CardDescription>Items requiring immediate attention</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {data.pendingApprovals > 0 && (
                <div className="flex items-center justify-between p-3 border rounded-lg bg-yellow-50">
                  <div className="flex items-center gap-3">
                    <AlertCircle className="h-5 w-5 text-yellow-600" />
                    <div>
                      <p className="text-sm font-medium">Approve Pending Vouchers</p>
                      <p className="text-xs text-muted-foreground">{data.pendingApprovals} items waiting</p>
                    </div>
                  </div>
                  <Button size="sm" variant="ghost" asChild>
                    <Link href="/dashboard/approvals"><ChevronRight className="h-4 w-4" /></Link>
                  </Button>
                </div>
              )}
              <div className="flex items-center justify-between p-3 border rounded-lg">
                <div className="flex items-center gap-3">
                  <Users className="h-5 w-5 text-blue-600" />
                  <div>
                    <p className="text-sm font-medium">Review Arrears</p>
                    <p className="text-xs text-muted-foreground">Ageing report analysis</p>
                  </div>
                </div>
                <Button size="sm" variant="ghost" asChild>
                  <Link href="/dashboard/reports/ar-ageing"><ChevronRight className="h-4 w-4" /></Link>
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
