"use client";

import Link from "next/link";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { FileText, CreditCard, Users, Plus } from "lucide-react";

export default function APLandingPage() {
  const modules = [
    {
      title: "Supplier Bills",
      description: "Capture supplier invoices and manage accounts payable. Track what is owed to suppliers.",
      href: "/dashboard/ap/bills",
      icon: FileText,
      actions: [{ label: "New Bill", href: "/dashboard/ap/bills/new" }],
    },
    {
      title: "Supplier Payments",
      description: "Record payments to suppliers. Allocate payments against outstanding bills.",
      href: "/dashboard/ap/payments",
      icon: CreditCard,
      actions: [{ label: "New Payment", href: "/dashboard/ap/payments/new" }],
    },
    {
      title: "Suppliers",
      description: "Manage supplier master records, contacts, and account details.",
      href: "/dashboard/suppliers",
      icon: Users,
      actions: [{ label: "New Supplier", href: "/dashboard/suppliers/new" }],
    },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Accounts Payable</h1>
        <p className="text-muted-foreground">Manage supplier bills, payments, and trade creditors.</p>
      </div>
      <div className="grid gap-6 md:grid-cols-3">
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
