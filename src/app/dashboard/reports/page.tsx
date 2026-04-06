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
  Users,
  Building2,
  Coins,
  BarChart2,
  Scale,
  AlertTriangle,
  FileText,
} from "lucide-react";
import Link from "next/link";
import { useAuth } from "@/components/providers/auth-provider";

const reportCategories = [
  {
    category: "Financial Statements",
    color: "bg-blue-500",
    lightColor: "bg-blue-50",
    textColor: "text-blue-600",
    borderColor: "border-blue-100",
    reports: [
      {
        title: "Financial Position",
        description: "Balance Sheet — assets, liabilities & equity (IPSAS 1).",
        href: "/dashboard/reports/financial-position",
        icon: Scale,
        roles: ["ADMIN", "BURSAR", "HEADMASTER", "AUDITOR", "ACCOUNTANT"],
      },
      {
        title: "Financial Performance",
        description: "Income & Expenditure Statement (IPSAS 1).",
        href: "/dashboard/reports/financial-performance",
        icon: TrendingUp,
        roles: ["ADMIN", "BURSAR", "HEADMASTER", "AUDITOR", "ACCOUNTANT"],
      },
      {
        title: "Cash Flow Statement",
        description: "Statement of Cash Flows (IPSAS 2).",
        href: "/dashboard/reports/cash-flow",
        icon: Coins,
        roles: ["ADMIN", "BURSAR", "HEADMASTER", "AUDITOR", "ACCOUNTANT"],
      },
    ],
  },
  {
    category: "Ledger & GL Reports",
    color: "bg-indigo-500",
    lightColor: "bg-indigo-50",
    textColor: "text-indigo-600",
    borderColor: "border-indigo-100",
    reports: [
      {
        title: "Trial Balance",
        description: "Summary of all ledger account balances for a period.",
        href: "/dashboard/reports/trial-balance",
        icon: BarChart3,
        roles: ["ADMIN", "CLERK", "BURSAR", "HEADMASTER", "AUDITOR", "ACCOUNTANT"],
      },
      {
        title: "General Ledger",
        description: "Detailed transaction listing by account with drill-down.",
        href: "/dashboard/reports/general-ledger",
        icon: BookOpen,
        roles: ["ADMIN", "BURSAR", "HEADMASTER", "AUDITOR", "ACCOUNTANT"],
      },
    ],
  },
  {
    category: "Management Reports",
    color: "bg-purple-500",
    lightColor: "bg-purple-50",
    textColor: "text-purple-600",
    borderColor: "border-purple-100",
    reports: [
      {
        title: "Budget vs Actuals",
        description: "Compare approved budget lines against actual expenditure.",
        href: "/dashboard/reports/budget-vs-actuals",
        icon: BarChart2,
        roles: ["ADMIN", "BURSAR", "HEADMASTER", "AUDITOR", "ACCOUNTANT"],
      },
      {
        title: "Departmental Expenditure",
        description: "Expense breakdown by cost centre with account drill-down.",
        href: "/dashboard/reports/departmental-expenditure",
        icon: Building2,
        roles: ["ADMIN", "BURSAR", "HEADMASTER", "AUDITOR", "ACCOUNTANT"],
      },
    ],
  },
  {
    category: "Sub-Ledger Statements",
    color: "bg-emerald-500",
    lightColor: "bg-emerald-50",
    textColor: "text-emerald-600",
    borderColor: "border-emerald-100",
    reports: [
      {
        title: "AR Ageing",
        description: "Unpaid student invoices grouped by aging bucket.",
        href: "/dashboard/reports/ar-ageing",
        icon: Users,
        roles: ["ADMIN", "CLERK", "BURSAR", "HEADMASTER", "AUDITOR", "ACCOUNTANT"],
      },
      {
        title: "Student Account Statement",
        description: "Full transaction history and running balance for a student.",
        href: "/dashboard/reports/student-statement",
        icon: FileText,
        roles: ["ADMIN", "CLERK", "BURSAR", "HEADMASTER", "AUDITOR", "ACCOUNTANT"],
      },
      {
        title: "AP Ageing",
        description: "Unpaid supplier bills grouped by aging bucket.",
        href: "/dashboard/reports/ap-ageing",
        icon: Building2,
        roles: ["ADMIN", "CLERK", "BURSAR", "HEADMASTER", "AUDITOR", "ACCOUNTANT"],
      },
      {
        title: "Supplier Statement",
        description: "Full transaction history and outstanding balance per supplier.",
        href: "/dashboard/reports/supplier-statement",
        icon: FileText,
        roles: ["ADMIN", "CLERK", "BURSAR", "HEADMASTER", "AUDITOR", "ACCOUNTANT"],
      },
    ],
  },
  {
    category: "Audit & Compliance",
    color: "bg-slate-500",
    lightColor: "bg-slate-50",
    textColor: "text-slate-600",
    borderColor: "border-slate-200",
    reports: [
      {
        title: "Audit Log",
        description: "Append-only record of all system changes.",
        href: "/dashboard/reports/audit-log",
        icon: History,
        roles: ["ADMIN", "AUDITOR"],
      },
      {
        title: "Exceptions Report",
        description: "Flag unusual transactions and control breaches.",
        href: "/dashboard/reports/exceptions",
        icon: AlertTriangle,
        roles: ["ADMIN", "AUDITOR", "HEADMASTER", "BURSAR", "ACCOUNTANT"],
      },
    ],
  },
];

export default function ReportsIndexPage() {
  const { user } = useAuth();
  const role = user?.role || "";

  const visibleCategories = reportCategories
    .map((cat) => ({
      ...cat,
      reports: cat.reports.filter((r) => r.roles.includes(role)),
    }))
    .filter((cat) => cat.reports.length > 0);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-extrabold tracking-tight">Financial Reporting</h1>
        <p className="text-muted-foreground mt-1">
          IPSAS-compliant financial statements, ledger reports, and management analytics.
        </p>
      </div>

      {visibleCategories.map((cat) => (
        <div key={cat.category}>
          <div className="flex items-center gap-2 mb-3">
            <div className={`w-2 h-5 rounded-full ${cat.color}`} />
            <h2 className="text-sm font-bold uppercase tracking-wider text-muted-foreground">
              {cat.category}
            </h2>
          </div>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {cat.reports.map((report) => (
              <Link key={report.href} href={report.href}>
                <Card className={`hover:border-primary/50 hover:shadow-md transition-all cursor-pointer h-full border ${cat.borderColor}`}>
                  <CardHeader className="flex flex-row items-center justify-between pb-2">
                    <div className={`w-10 h-10 rounded-lg ${cat.lightColor} flex items-center justify-center`}>
                      <report.icon className={`w-5 h-5 ${cat.textColor}`} />
                    </div>
                    <ChevronRight className="w-4 h-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <CardTitle className="text-base mb-1">{report.title}</CardTitle>
                    <CardDescription className="text-xs">{report.description}</CardDescription>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
