"use client";

import Link from "next/link";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Building2, BookOpen, ArrowRightLeft, Plus, FileText } from "lucide-react";

export default function BankLandingPage() {
  const modules = [
    {
      title: "Bank Accounts",
      description: "Set up and manage bank and cash accounts. View balances and link to GL accounts.",
      href: "/dashboard/bank/accounts",
      icon: Building2,
      actions: [{ label: "New Bank Account", href: "/dashboard/bank/accounts/new" }],
    },
    {
      title: "Cashbook",
      description: "Record cashbook entries for receipts and payments. View cashbook transactions.",
      href: "/dashboard/bank/cashbook",
      icon: BookOpen,
      actions: [{ label: "New Entry", href: "/dashboard/bank/cashbook/new" }],
    },
    {
      title: "Bank Reconciliation",
      description: "Import bank statements and reconcile against cashbook entries.",
      href: "/dashboard/bank/reconcile",
      icon: ArrowRightLeft,
      actions: [{ label: "Reconcile", href: "/dashboard/bank/reconcile" }],
    },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Bank & Cashbook</h1>
        <p className="text-muted-foreground">
          Manage bank accounts, cashbook entries, and reconciliations.
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        {modules.map((mod) => {
          const Icon = mod.icon;
          return (
            <Card key={mod.href} className="flex flex-col">
              <CardHeader>
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-primary/10 rounded-lg">
                    <Icon className="w-5 h-5 text-primary" />
                  </div>
                  <CardTitle className="text-lg">{mod.title}</CardTitle>
                </div>
                <CardDescription>{mod.description}</CardDescription>
              </CardHeader>
              <CardContent className="flex flex-col gap-2 mt-auto">
                <Button asChild variant="outline" className="w-full">
                  <Link href={mod.href}>
                    <FileText className="w-4 h-4 mr-2" />
                    Open {mod.title}
                  </Link>
                </Button>
                {mod.actions.map((action) => (
                  <Button key={action.href} asChild size="sm" variant="ghost" className="w-full">
                    <Link href={action.href}>
                      <Plus className="w-4 h-4 mr-2" />
                      {action.label}
                    </Link>
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
