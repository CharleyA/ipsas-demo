"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  FileText,
  Users,
  Building2,
  PieChart,
  Settings,
  Wallet,
  ArrowRightLeft,
  ShieldCheck,
  History,
  BookOpen,
  Wrench,
  FileSpreadsheet,
  AlertTriangle,
  Package,
  Boxes,
  ClipboardList,
  Receipt,
  CreditCard,
  FileStack,
  Bot,
  PackageCheck,
  Truck,
  ClipboardCheck,
  ListChecks,
  Upload,
  Play,
  Tag,
  CalendarDays,
  Inbox,
  BarChart3,
  BarChart2,
  TrendingUp,
  Scale,
  Coins,
} from "lucide-react";


import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarGroup,
  SidebarGroupLabel,
  SidebarGroupContent,
} from "@/components/ui/sidebar";
import { useAuth } from "@/components/providers/auth-provider";
import { NavUser } from "./nav-user";

const menuItems = [
  {
    title: "General",
    items: [
      {
        title: "Dashboard",
        href: "/dashboard",
        icon: LayoutDashboard,
        roles: ["ADMIN", "CLERK", "BURSAR", "HEADMASTER", "AUDITOR", "ACCOUNTANT"],
      },

      {
        title: "Teachers Portal",
        href: "/dashboard/teachers",
        icon: Users,
        roles: ["TEACHER", "ADMIN", "HEADMASTER", "BURSAR"],
      },
      {
        title: "Documentation",
        href: "/docs",
        icon: BookOpen,
        roles: ["ADMIN", "CLERK", "BURSAR", "HEADMASTER", "AUDITOR", "ACCOUNTANT"],
      },
      {
        title: "Control Panel",
        href: "/dashboard/admin",
        icon: ShieldCheck,
        roles: ["ADMIN"],
      },
      {
        title: "Approvals Inbox",
        href: "/dashboard/approvals",
        icon: Inbox,
        roles: ["ADMIN", "BURSAR", "HEADMASTER", "ACCOUNTANT"],
      },
    ],
  },
  {
    title: "Accounting",
    items: [
      {
        title: "Vouchers",
        href: "/dashboard/vouchers",
        icon: FileText,
        roles: ["ADMIN", "CLERK", "BURSAR", "AUDITOR", "ACCOUNTANT"],
      },
      {
        title: "Chart of Accounts",
        href: "/dashboard/accounts",
        icon: BookOpen,
        roles: ["ADMIN", "CLERK", "BURSAR", "AUDITOR", "ACCOUNTANT"],
      },
      {
        title: "Budgets",
        href: "/dashboard/budgets",
        icon: BarChart2,
        roles: ["ADMIN", "BURSAR", "ACCOUNTANT", "HEADMASTER"],
      },
      {
        title: "Fiscal Periods",
        href: "/dashboard/settings/fiscal-periods",
        icon: CalendarDays,
        roles: ["ADMIN", "BURSAR", "ACCOUNTANT", "AUDITOR"],
      },
    ],
  },
  {
    title: "Sub-Ledgers",
        items: [
          {
            title: "Students (AR)",
            href: "/dashboard/students",
            icon: Users,
            roles: ["ADMIN", "CLERK", "BURSAR", "AUDITOR", "ACCOUNTANT"],
          },
          {
            title: "Invoices",
            href: "/dashboard/ar/invoices",
            icon: Receipt,
            roles: ["ADMIN", "CLERK", "BURSAR", "AUDITOR", "ACCOUNTANT"],
          },
          {
            title: "Receipts",
            href: "/dashboard/ar/receipts",
            icon: CreditCard,
            roles: ["ADMIN", "CLERK", "BURSAR", "AUDITOR", "ACCOUNTANT"],
          },
          {
            title: "Fee Templates",
            href: "/dashboard/ar/fee-templates",
            icon: FileStack,
            roles: ["ADMIN", "BURSAR", "ACCOUNTANT"],
          },
          {
            title: "Suppliers (AP)",
            href: "/dashboard/suppliers",
            icon: Building2,
            roles: ["ADMIN", "CLERK", "BURSAR", "AUDITOR", "ACCOUNTANT"],
          },
        ],
      },
      {
        title: "Procurement",
        items: [
          {
            title: "Purchase Orders",
            href: "/dashboard/procurement",
            icon: ClipboardList,
            roles: ["ADMIN", "CLERK", "BURSAR", "AUDITOR", "ACCOUNTANT"],
          },
          {
            title: "Goods Received (GRN)",
            href: "/dashboard/procurement/grn",
            icon: PackageCheck,
            roles: ["ADMIN", "CLERK", "BURSAR", "AUDITOR", "ACCOUNTANT"],
          },
          {
            title: "Stock Requisitions",
            href: "/dashboard/inventory/requisitions",
            icon: ClipboardList,
            roles: ["ADMIN", "CLERK", "BURSAR", "AUDITOR", "ACCOUNTANT"],
          },
          {
            title: "Fixed Assets",
            href: "/dashboard/assets",
            icon: Package,
            roles: ["ADMIN", "CLERK", "BURSAR", "AUDITOR", "ACCOUNTANT"],
          },
          {
            title: "Asset Register",
            href: "/dashboard/assets/register",
            icon: ListChecks,
            roles: ["ADMIN", "CLERK", "BURSAR", "AUDITOR", "ACCOUNTANT"],
          },
          {
            title: "Asset Categories",
            href: "/dashboard/assets/categories",
            icon: Tag,
            roles: ["ADMIN", "BURSAR", "ACCOUNTANT"],
          },
          {
            title: "Import Assets",
            href: "/dashboard/assets/import",
            icon: Upload,
            roles: ["ADMIN", "CLERK", "BURSAR", "ACCOUNTANT"],
          },
          {
            title: "Run Depreciation",
            href: "/dashboard/assets/depreciation",
            icon: Play,
            roles: ["ADMIN", "BURSAR", "ACCOUNTANT"],
          },
          {
            title: "Inventory",
            href: "/dashboard/inventory",
            icon: Boxes,
            roles: ["ADMIN", "CLERK", "BURSAR", "AUDITOR", "ACCOUNTANT"],
          },
          {
            title: "Issue Stock",
            href: "/dashboard/inventory/issue",
            icon: Truck,
            roles: ["ADMIN", "CLERK", "BURSAR", "ACCOUNTANT"],
          },
          {
            title: "Stock Movements",
            href: "/dashboard/inventory/movements",
            icon: ClipboardCheck,
            roles: ["ADMIN", "CLERK", "BURSAR", "AUDITOR", "ACCOUNTANT"],
          },
        ],
      },
      {
        title: "Banking",
        items: [
          {
            title: "Bank Accounts",
            href: "/dashboard/bank/accounts",
            icon: Wallet,
            roles: ["ADMIN", "CLERK", "BURSAR", "AUDITOR", "ACCOUNTANT"],
          },
          {
            title: "Cashbook Entry",
            href: "/dashboard/bank/cashbook/new",
            icon: FileText,
            roles: ["ADMIN", "CLERK", "BURSAR", "ACCOUNTANT"],
          },
          {
            title: "Reconciliation",
            href: "/dashboard/bank/reconcile",
            icon: ArrowRightLeft,
            roles: ["ADMIN", "BURSAR", "ACCOUNTANT"],
          },
        ],
      },
      {
        title: "Reporting",
        items: [
          {
            title: "Reports Hub",
            href: "/dashboard/reports",
            icon: PieChart,
            roles: ["ADMIN", "CLERK", "BURSAR", "HEADMASTER", "AUDITOR", "ACCOUNTANT"],
          },
          {
            title: "Trial Balance",
            href: "/dashboard/reports/trial-balance",
            icon: BarChart3,
            roles: ["ADMIN", "CLERK", "BURSAR", "HEADMASTER", "AUDITOR", "ACCOUNTANT"],
          },
          {
            title: "General Ledger",
            href: "/dashboard/reports/general-ledger",
            icon: BookOpen,
            roles: ["ADMIN", "BURSAR", "HEADMASTER", "AUDITOR", "ACCOUNTANT"],
          },
          {
            title: "Financial Position",
            href: "/dashboard/reports/financial-position",
            icon: Scale,
            roles: ["ADMIN", "BURSAR", "HEADMASTER", "AUDITOR", "ACCOUNTANT"],
          },
          {
            title: "Financial Performance",
            href: "/dashboard/reports/financial-performance",
            icon: TrendingUp,
            roles: ["ADMIN", "BURSAR", "HEADMASTER", "AUDITOR", "ACCOUNTANT"],
          },
          {
            title: "Cash Flow",
            href: "/dashboard/reports/cash-flow",
            icon: Coins,
            roles: ["ADMIN", "BURSAR", "HEADMASTER", "AUDITOR", "ACCOUNTANT"],
          },
          {
            title: "Budget vs Actuals",
            href: "/dashboard/reports/budget-vs-actuals",
            icon: BarChart2,
            roles: ["ADMIN", "BURSAR", "HEADMASTER", "AUDITOR", "ACCOUNTANT"],
          },
          {
            title: "Departmental Expenditure",
            href: "/dashboard/reports/departmental-expenditure",
            icon: Building2,
            roles: ["ADMIN", "BURSAR", "HEADMASTER", "AUDITOR", "ACCOUNTANT"],
          },
          {
            title: "AR Ageing",
            href: "/dashboard/reports/ar-ageing",
            icon: Users,
            roles: ["ADMIN", "CLERK", "BURSAR", "HEADMASTER", "AUDITOR", "ACCOUNTANT"],
          },
          {
            title: "Student Statement",
            href: "/dashboard/reports/student-statement",
            icon: FileText,
            roles: ["ADMIN", "CLERK", "BURSAR", "HEADMASTER", "AUDITOR", "ACCOUNTANT"],
          },
          {
            title: "AP Ageing",
            href: "/dashboard/reports/ap-ageing",
            icon: Building2,
            roles: ["ADMIN", "CLERK", "BURSAR", "HEADMASTER", "AUDITOR", "ACCOUNTANT"],
          },
          {
            title: "Supplier Statement",
            href: "/dashboard/reports/supplier-statement",
            icon: FileText,
            roles: ["ADMIN", "CLERK", "BURSAR", "HEADMASTER", "AUDITOR", "ACCOUNTANT"],
          },
          {
            title: "Audit Log",
            href: "/dashboard/reports/audit-log",
            icon: History,
            roles: ["ADMIN", "AUDITOR", "ACCOUNTANT"],
          },
          {
            title: "Exceptions Report",
            href: "/dashboard/reports/exceptions",
            icon: AlertTriangle,
            roles: ["ADMIN", "AUDITOR", "HEADMASTER", "BURSAR", "ACCOUNTANT"],
          },
        ],
      },
    {
      title: "Tools",
      items: [
        {
          title: "Import Data",
          href: "/dashboard/imports",
          icon: FileSpreadsheet,
          roles: ["ADMIN", "BURSAR", "ACCOUNTANT"],
        },
      ],
    },
    {
      title: "System",

    items: [
      {
        title: "Currencies",
        href: "/dashboard/settings/currencies",
        icon: ArrowRightLeft,
        roles: ["ADMIN"],
      },
        {
          title: "Maintenance",
          href: "/dashboard/admin/maintenance",
          icon: Wrench,
          roles: ["ADMIN"],
        },
        {
          title: "Settings",

        href: "/dashboard/settings",
        icon: Settings,
        roles: ["ADMIN"],
      },
    ],
  },
];

export function AppSidebar() {
  const pathname = usePathname();
  const { user } = useAuth();

  if (!user) return null;

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader>
        <SidebarMenu>
            <SidebarMenuItem>
              <SidebarMenuButton size="lg" asChild>
                <Link href="/dashboard">
                  <div className="flex aspect-square size-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
                    <Wallet className="size-4" />
                  </div>
                  <div className="flex flex-col gap-0.5 leading-none">
                    <span className="font-semibold">IPSAS Core</span>
                    <span className="text-xs text-muted-foreground">Zimbabwe Schools</span>
                  </div>
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>
      <SidebarContent>
        {menuItems.map((group) => {
          const visibleItems = group.items.filter((item) => 
            item.roles.includes(user.role)
          );

          if (visibleItems.length === 0) return null;

          return (
            <SidebarGroup key={group.title}>
              <SidebarGroupLabel>{group.title}</SidebarGroupLabel>
                <SidebarGroupContent>
                  <SidebarMenu>
                    {visibleItems.map((item) => {
                      return (
                        <SidebarMenuItem key={item.href}>
                          <SidebarMenuButton
                            asChild
                            isActive={pathname === item.href}
                            tooltip={item.title}
                          >
                            <Link href={item.href}>
                              <item.icon />
                              <span>{item.title}</span>
                            </Link>
                          </SidebarMenuButton>
                        </SidebarMenuItem>
                      );
                    })}
                  </SidebarMenu>
                </SidebarGroupContent>
            </SidebarGroup>
          );
        })}
      </SidebarContent>
      <SidebarFooter>
        <NavUser />
      </SidebarFooter>
    </Sidebar>
  );
}
