"use client";

import Link from "next/link";
import { 
  BookOpen, 
  Building2, 
  FileText, 
  BarChart3, 
  Settings,
  Calendar,
  Wallet,
  ArrowRightLeft,
  ChevronRight,
  Shield
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useAuth } from "@/components/providers/auth-provider";

const features = [
  {
    icon: Building2,
    title: "Multi-Organisation",
    description: "Manage multiple schools and organisations with separate charts of accounts",
  },
  {
    icon: FileText,
    title: "Voucher Management",
    description: "Complete approval workflow: Draft, Submit, Approve, Post, with reversal support",
  },
  {
    icon: BookOpen,
    title: "Double-Entry Ledger",
    description: "Full double-entry accounting with immutable posted journal entries",
  },
  {
    icon: ArrowRightLeft,
    title: "Multi-Currency",
    description: "Support for USD and ZWG with automatic FX rate conversion and tracking",
  },
  {
    icon: Calendar,
    title: "Period Management",
    description: "Fiscal period control with period locks to prevent unauthorized changes",
  },
  {
    icon: Shield,
    title: "Full Audit Trail",
    description: "Append-only audit log tracking all changes for accountability",
  },
];

const quickActions = [
  { href: "/dashboard", label: "Dashboard", icon: BarChart3 },
  { href: "/organisations", label: "Organisations", icon: Building2 },
  { href: "/vouchers", label: "Vouchers", icon: FileText },
  { href: "/accounts", label: "Chart of Accounts", icon: BookOpen },
  { href: "/reports", label: "Reports", icon: BarChart3 },
  { href: "/settings", label: "Settings", icon: Settings },
];

export default function HomePage() {
  const { user } = useAuth();

  return (
    <div className="min-h-screen bg-background">
      <nav className="border-b border-border bg-card/50 backdrop-blur-sm sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                <Wallet className="w-5 h-5 text-primary" />
              </div>
              <div>
                <span className="font-semibold text-foreground">IPSAS Accounting</span>
                <span className="text-xs text-muted-foreground ml-2">Zimbabwe Schools</span>
              </div>
            </div>
            <div className="flex items-center gap-4">
              {user ? (
                <>
                  <Button variant="ghost" size="sm" asChild>
                    <Link href="/docs">Documentation</Link>
                  </Button>
                  <Button size="sm" asChild>
                    <Link href="/dashboard">Open Dashboard</Link>
                  </Button>
                </>
              ) : (
                <>
                  <Button variant="ghost" size="sm" asChild>
                    <Link href="/login">Sign In</Link>
                  </Button>
                  <Button size="sm" asChild>
                    <Link href="/register">Get Started</Link>
                  </Button>
                </>
              )}
            </div>
          </div>
        </div>
      </nav>

      <main>
        <section className="py-20 px-4">
          <div className="max-w-4xl mx-auto text-center">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 text-primary text-sm mb-6">
              <span className="w-2 h-2 rounded-full bg-primary animate-pulse" />
              IPSAS Compliant
            </div>
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tight mb-6">
              Modern Accounting for
              <span className="text-primary block mt-2">Zimbabwe Schools</span>
            </h1>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto mb-8">
              A lightweight, IPSAS-aligned accounting system built for educational institutions.
              Double-entry bookkeeping, multi-currency support, and complete audit trails.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <Button size="lg" asChild>
                <Link href="/dashboard">
                  Open Dashboard
                  <ChevronRight className="w-4 h-4 ml-2" />
                </Link>
              </Button>
              <Button size="lg" variant="outline" asChild>
                <Link href="/docs">View Documentation</Link>
              </Button>
            </div>
          </div>
        </section>

        <section className="py-16 px-4 border-t border-border">
          <div className="max-w-7xl mx-auto">
            <h2 className="text-2xl font-bold text-center mb-12">Core Features</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {features.map((feature) => (
                <Card key={feature.title} className="bg-card/50 border-border hover:border-primary/50 transition-colors">
                  <CardHeader>
                    <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center mb-4">
                      <feature.icon className="w-6 h-6 text-primary" />
                    </div>
                    <CardTitle className="text-lg">{feature.title}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <CardDescription className="text-muted-foreground">
                      {feature.description}
                    </CardDescription>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </section>

        <section className="py-16 px-4 border-t border-border bg-card/30">
          <div className="max-w-7xl mx-auto">
            <h2 className="text-2xl font-bold text-center mb-4">Quick Access</h2>
            <p className="text-muted-foreground text-center mb-12">
              Jump to any module in the system
            </p>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
              {quickActions.map((action) => (
                <Link key={action.href} href={action.href}>
                  <Card className="bg-card border-border hover:border-primary/50 hover:bg-accent transition-all cursor-pointer h-full">
                    <CardContent className="flex flex-col items-center justify-center p-6">
                      <action.icon className="w-8 h-8 text-primary mb-3" />
                      <span className="text-sm font-medium">{action.label}</span>
                    </CardContent>
                  </Card>
                </Link>
              ))}
            </div>
          </div>
        </section>

        <section className="py-16 px-4 border-t border-border">
          <div className="max-w-4xl mx-auto">
            <Card className="bg-gradient-to-r from-primary/10 via-card to-primary/5 border-primary/20">
              <CardContent className="p-8 text-center">
                <h2 className="text-2xl font-bold mb-4">ZFRM Compliance</h2>
                <p className="text-muted-foreground mb-6 max-w-2xl mx-auto">
                  Built according to the Zimbabwe Financial Reporting Manual guidelines,
                  supporting IPSAS adoption for public sector entities as mandated by
                  Statutory Instrument 41 of 2019.
                </p>
                <div className="flex flex-wrap items-center justify-center gap-4 text-sm text-muted-foreground">
                  <span className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-green-500" />
                    IPSAS 1-48 Aligned
                  </span>
                  <span className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-green-500" />
                    Accrual Basis
                  </span>
                  <span className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-green-500" />
                    Full Transparency
                  </span>
                </div>
              </CardContent>
            </Card>
          </div>
        </section>
      </main>

      <footer className="border-t border-border py-8 px-4">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Wallet className="w-4 h-4" />
            <span>IPSAS Accounting System</span>
          </div>
          <div className="text-center md:text-right text-sm text-muted-foreground space-y-1">
            <p>Supporting Zimbabwe&apos;s public sector financial management reforms</p>
            <p>Designed and developed by iThink Systems</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
