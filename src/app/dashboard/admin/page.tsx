"use client";

import { useAuth } from "@/components/providers/auth-provider";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Users,
  Building2,
  ShieldCheck,
  Wrench,
  History,
  ArrowRightLeft,
  Settings,
} from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function AdminDashboardPage() {
  const { user } = useAuth();

  if (user?.role !== "ADMIN") {
    return null; // Should be handled by middleware or parent layout
  }

  const adminTools = [
    {
      title: "System Maintenance",
      description: "Purge data, reset system state, and more.",
      href: "/dashboard/admin/maintenance",
      icon: Wrench,
      color: "text-red-500",
    },
    {
      title: "Organisation Settings",
      description: "Manage school details and configuration.",
      href: "/dashboard/settings/organisation",
      icon: Building2,
      color: "text-blue-500",
    },
      {
        title: "User Management",
        description: "Manage users, roles and access permissions.",
        href: "/dashboard/admin/users",
        icon: Users,
        color: "text-green-500",
      },
    {
      title: "Currency & Exchange",
      description: "Configure multi-currency and rates.",
      href: "/dashboard/settings/currencies",
      icon: ArrowRightLeft,
      color: "text-orange-500",
    },
    {
      title: "Audit Logs",
      description: "Track all system activities and changes.",
      href: "/dashboard/reports/audit-log",
      icon: History,
      color: "text-purple-500",
    },
    {
      title: "Security & Permissions",
      description: "Review system security state.",
      href: "/dashboard/approvals",
      icon: ShieldCheck,
      color: "text-indigo-500",
    },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Admin Dashboard</h1>
        <p className="text-muted-foreground">
          Welcome, {user.firstName}. You have full administrative access to the system.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {adminTools.map((tool) => (
          <Card key={tool.title} className="hover:border-primary/50 transition-colors">
            <CardHeader className="flex flex-row items-center gap-4 space-y-0">
              <div className={`p-2 rounded-lg bg-background border ${tool.color}`}>
                <tool.icon className="w-6 h-6" />
              </div>
              <div>
                <CardTitle className="text-lg">{tool.title}</CardTitle>
                <CardDescription>{tool.description}</CardDescription>
              </div>
            </CardHeader>
            <CardContent>
              <Button variant="ghost" className="w-full justify-start" asChild>
                <Link href={tool.href}>
                  Manage <Settings className="ml-2 w-4 h-4" />
                </Link>
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>System Overview</CardTitle>
          <CardDescription>Quick stats about the current organisation.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="space-y-1">
              <p className="text-sm text-muted-foreground font-medium">Role</p>
              <p className="text-2xl font-bold">{user.role}</p>
            </div>
            <div className="space-y-1">
              <p className="text-sm text-muted-foreground font-medium">Organisation</p>
              <p className="text-2xl font-bold">IPSAS Core</p>
            </div>
            <div className="space-y-1">
              <p className="text-sm text-muted-foreground font-medium">Status</p>
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-green-500" />
                <p className="text-2xl font-bold text-green-500">Active</p>
              </div>
            </div>
            <div className="space-y-1">
              <p className="text-sm text-muted-foreground font-medium">Base Currency</p>
              <p className="text-2xl font-bold">ZWG</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
