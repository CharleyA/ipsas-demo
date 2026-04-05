"use client";

import Link from "next/link";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { FileText, Receipt, Users, LayoutTemplate, Plus, Zap } from "lucide-react";

export default function ARLandingPage() {
  const modules = [
    {
      title: "Student Invoices",
      description: "Generate, view and manage student fee invoices. Bulk post invoices for the whole school.",
      href: "/dashboard/ar/invoices",
      icon: FileText,
      actions: [
        { label: "New Invoice", href: "/dashboard/ar/invoices/new" },
        { label: "Generate Bulk Invoices", href: "/dashboard/ar/invoices/generate" },
      ],
    },
    {
      title: "Receipts",
      description: "Record fee payments received from students. Allocate receipts to outstanding invoices.",
      href: "/dashboard/ar/receipts",
      icon: Receipt,
      actions: [{ label: "New Receipt", href: "/dashboard/ar/receipts/new" }],
    },
    {
      title: "Fee Templates",
      description: "Set up fee structures and billing templates for different student categories.",
      href: "/dashboard/ar/fee-templates",
      icon: LayoutTemplate,
      actions: [{ label: "New Template", href: "/dashboard/ar/fee-templates/new" }],
    },
    {
      title: "Students",
      description: "View student accounts, balances, and statements.",
      href: "/dashboard/students",
      icon: Users,
      actions: [{ label: "Add Student", href: "/dashboard/students/new" }],
    },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Accounts Receivable</h1>
        <p className="text-muted-foreground">Manage student invoices, receipts, and debtor balances.</p>
      </div>
      <div className="grid gap-6 md:grid-cols-2">
        {modules.map((mod) => {
          const Icon = mod.icon;
          return (
            <Card key={mod.href} className="flex flex-col">
              <CardHeader>
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-primary/10 rounded-lg"><Icon className="w-5 h-5 text-primary" /></div>
                  <CardTitle className="text-lg">{mod.title}</CardTitle>
                </div>
                <CardDescription>{mod.description}</CardDescription>
              </CardHeader>
              <CardContent className="flex flex-col gap-2 mt-auto">
                <Button asChild variant="outline" className="w-full">
                  <Link href={mod.href}><FileText className="w-4 h-4 mr-2" />Open {mod.title}</Link>
                </Button>
                {mod.actions.map((a) => (
                  <Button key={a.href} asChild size="sm" variant="ghost" className="w-full">
                    <Link href={a.href}><Plus className="w-4 h-4 mr-2" />{a.label}</Link>
                  </Button>
                ))}
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
