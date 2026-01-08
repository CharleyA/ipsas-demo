"use client";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { 
  BarChart3, 
  BookOpen, 
  History, 
  PieChart, 
  TrendingUp,
  ChevronRight,
  FileText
} from "lucide-react";
import Link from "next/link";
import { useAuth } from "@/components/providers/auth-provider";

const reports = [
  {
    title: "Trial Balance",
    description: "Summary of all ledger balances for a period.",
    href: "/dashboard/reports/trial-balance",
    icon: BarChart3,
    roles: ["ADMIN", "ACCOUNTANT", "BURSAR", "AUDITOR", "VIEWER"],
  },
  {
    title: "General Ledger",
    description: "Detailed transaction listing by account.",
    href: "/dashboard/reports/general-ledger",
    icon: BookOpen,
    roles: ["ADMIN", "ACCOUNTANT", "BURSAR", "AUDITOR"],
  },
  {
    title: "Financial Position",
    description: "Balance Sheet (IPSAS 1).",
    href: "/dashboard/reports/financial-position",
    icon: PieChart,
    roles: ["ADMIN", "BURSAR", "AUDITOR", "VIEWER"],
  },
  {
    title: "Financial Performance",
    description: "Income & Expenditure (IPSAS 1).",
    href: "/dashboard/reports/financial-performance",
    icon: TrendingUp,
    roles: ["ADMIN", "BURSAR", "AUDITOR", "VIEWER"],
  },
  {
    title: "Audit Log",
    description: "Append-only record of all system changes.",
    href: "/dashboard/reports/audit-log",
    icon: History,
    roles: ["ADMIN", "AUDITOR"],
  },
];

export default function ReportsIndexPage() {
  const { user } = useAuth();

  const visibleReports = reports.filter(r => r.roles.includes(user?.role || ""));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Financial Reporting</h1>
        <p className="text-muted-foreground">
          IPSAS-compliant financial statements and ledger reports.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {visibleReports.map((report) => (
          <Link key={report.href} href={report.href}>
            <Card className="hover:border-primary transition-colors cursor-pointer h-full">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                  <report.icon className="w-5 h-5 text-primary" />
                </div>
                <ChevronRight className="w-4 h-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <CardTitle className="text-lg mb-1">{report.title}</CardTitle>
                <CardDescription>{report.description}</CardDescription>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}
