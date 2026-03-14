"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Users, Truck, ListTree, Calculator, Receipt, ArrowRight } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";

const importTypes = [
  {
    title: "Students",
    description: "Import student records, grades, and contact info.",
    icon: Users,
    href: "/dashboard/imports/students",
    color: "text-blue-500",
  },
  {
    title: "Suppliers",
    description: "Import vendor records and tax information.",
    icon: Truck,
    href: "/dashboard/imports/suppliers",
    color: "text-orange-500",
  },
  {
    title: "Chart of Accounts",
    description: "Bulk create your ledger accounts and structure.",
    icon: ListTree,
    href: "/dashboard/imports/accounts",
    color: "text-green-500",
  },
  {
    title: "Opening Balances",
    description: "Import initial ledger balances as a balanced journal.",
    icon: Calculator,
    href: "/dashboard/imports/opening_balances",
    color: "text-purple-500",
  },
  {
    title: "Bulk Receipts",
    description: "Import fee payments and auto-allocate to invoices.",
    icon: Receipt,
    href: "/dashboard/imports/receipts",
    color: "text-red-500",
  },
];

export default function ImportsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Data Imports</h1>
        <p className="text-muted-foreground">
          Bulk import data into the system using CSV or Excel templates.
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {importTypes.map((type) => (
          <Card key={type.title} className="hover:shadow-md transition-shadow">
            <CardHeader className="flex flex-row items-center space-x-4 pb-2">
              <div className={`p-2 rounded-lg bg-muted ${type.color}`}>
                <type.icon className="h-6 w-6" />
              </div>
              <CardTitle className="text-xl">{type.title}</CardTitle>
            </CardHeader>
            <CardContent>
              <CardDescription className="mb-4 h-10">
                {type.description}
              </CardDescription>
              <Button asChild variant="outline" className="w-full">
                <Link href={type.href}>
                  Start Import
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
