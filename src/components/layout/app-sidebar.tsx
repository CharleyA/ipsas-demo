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
        roles: ["ADMIN", "ACCOUNTANT", "BURSAR", "AUDITOR", "VIEWER"],
      },
      {
        title: "Approvals",
        href: "/dashboard/approvals",
        icon: ShieldCheck,
        roles: ["ADMIN", "BURSAR", "VIEWER"],
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
        roles: ["ADMIN", "ACCOUNTANT", "BURSAR", "AUDITOR"],
      },
      {
        title: "Chart of Accounts",
        href: "/dashboard/accounts",
        icon: BookOpen,
        roles: ["ADMIN", "ACCOUNTANT", "BURSAR", "AUDITOR"],
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
        roles: ["ADMIN", "ACCOUNTANT", "BURSAR", "AUDITOR"],
      },
      {
        title: "Suppliers (AP)",
        href: "/dashboard/suppliers",
        icon: Building2,
        roles: ["ADMIN", "ACCOUNTANT", "BURSAR", "AUDITOR"],
      },
    ],
  },
  {
    title: "Reporting",
    items: [
      {
        title: "Financial Reports",
        href: "/dashboard/reports",
        icon: PieChart,
        roles: ["ADMIN", "ACCOUNTANT", "BURSAR", "AUDITOR", "VIEWER"],
      },
      {
        title: "Audit Log",
        href: "/dashboard/reports/audit-log",
        icon: History,
        roles: ["ADMIN", "AUDITOR"],
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
                  {visibleItems.map((item) => (
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
                  ))}
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
