"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Card, CardContent, CardDescription, CardHeader, CardTitle,
} from "@/components/ui/card";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import {
  PlusCircle, Loader2, BookOpen, CheckCircle2, Lock, FileEdit, Clock, Search,
} from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/components/providers/auth-provider";
import { cn } from "@/lib/utils";

const STATUS_CONFIG: Record<string, { label: string; color: string }> = {
  DRAFT: { label: "Draft", color: "bg-slate-100 text-slate-700 border-slate-200" },
  REVIEWED: { label: "Under Review", color: "bg-blue-100 text-blue-700 border-blue-200" },
  APPROVED: { label: "Approved", color: "bg-green-100 text-green-700 border-green-200" },
  LOCKED: { label: "Locked", color: "bg-purple-100 text-purple-700 border-purple-200" },
};

export default function BudgetsPage() {
  const { token, user } = useAuth();
  const router = useRouter();
  const [budgets, setBudgets] = useState<any[]>([]);
  const [fiscalPeriods, setFiscalPeriods] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [creating, setCreating] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [form, setForm] = useState({ fiscalPeriodId: "", notes: "" });

  const fetchBudgets = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await fetch("/api/budgets", {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      setBudgets(Array.isArray(data) ? data : []);
    } catch {
      toast.error("Failed to load budgets");
    } finally {
      setIsLoading(false);
    }
  }, [token]);

  const fetchFiscalPeriods = useCallback(async () => {
    if (!user?.organisationId) return;
    try {
      const res = await fetch(`/api/organisations/${user.organisationId}/fiscal-periods`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      const periods = data?.data ?? data ?? [];
      setFiscalPeriods(Array.isArray(periods) ? periods : []);
    } catch {
      // silently fail
    }
  }, [token, user?.organisationId]);

  useEffect(() => {
    if (token) {
      fetchBudgets();
      fetchFiscalPeriods();
    }
  }, [token, fetchBudgets, fetchFiscalPeriods]);

  const handleCreate = async () => {
    if (!form.fiscalPeriodId) {
      toast.error("Please select a fiscal period");
      return;
    }
    setIsCreating(true);
    try {
      const res = await fetch("/api/budgets", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(form),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed to create budget");
      }
      const budget = await res.json();
      toast.success("Budget created");
      setCreating(false);
      setForm({ fiscalPeriodId: "", notes: "" });
      router.push(`/dashboard/budgets/${budget.id}`);
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setIsCreating(false);
    }
  };

  const filtered = budgets.filter((b) => {
    const term = search.toLowerCase();
    return (
      b.fiscalPeriod?.name?.toLowerCase().includes(term) ||
      b.status?.toLowerCase().includes(term)
    );
  });

  const stats = {
    DRAFT: budgets.filter((b) => b.status === "DRAFT").length,
    REVIEWED: budgets.filter((b) => b.status === "REVIEWED").length,
    APPROVED: budgets.filter((b) => b.status === "APPROVED").length,
    LOCKED: budgets.filter((b) => b.status === "LOCKED").length,
  };

  const canCreate = user && ["ADMIN", "BURSAR", "ACCOUNTANT"].includes(user.role);

  return (
    <div className="space-y-8 max-w-6xl mx-auto pb-10">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h1 className="text-4xl font-extrabold tracking-tight flex items-center gap-3">
            <div className="p-2 rounded-xl bg-primary/10">
              <BookOpen className="w-8 h-8 text-primary" />
            </div>
            Budgets
          </h1>
          <p className="text-muted-foreground mt-2 text-lg">
            Create, review, approve and lock organisational budgets.
          </p>
        </div>
        {canCreate && (
          <Button onClick={() => setCreating(true)} className="shadow-md">
            <PlusCircle className="w-4 h-4 mr-2" />
            New Budget
          </Button>
        )}
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { key: "DRAFT", icon: FileEdit, color: "text-slate-600" },
          { key: "REVIEWED", icon: Clock, color: "text-blue-600" },
          { key: "APPROVED", icon: CheckCircle2, color: "text-green-600" },
          { key: "LOCKED", icon: Lock, color: "text-purple-600" },
        ].map(({ key, icon: Icon, color }) => (
          <Card key={key} className="shadow-sm">
            <CardHeader className="pb-2">
              <CardDescription className={cn("font-medium flex items-center gap-2", color)}>
                <Icon className="w-4 h-4" />
                {STATUS_CONFIG[key].label}
              </CardDescription>
              <CardTitle className="text-2xl">{stats[key as keyof typeof stats]}</CardTitle>
            </CardHeader>
          </Card>
        ))}
      </div>

      <Card className="shadow-md">
        <CardHeader className="bg-muted/30 border-b">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <CardTitle>All Budgets</CardTitle>
              <CardDescription>Manage budget versions by fiscal period</CardDescription>
            </div>
            <div className="relative w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search..."
                className="pl-10"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="flex items-center justify-center py-16">
              <Loader2 className="w-8 h-8 animate-spin text-primary" />
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Fiscal Period</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Version</TableHead>
                  <TableHead>Lines</TableHead>
                  <TableHead>Approved By</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead />
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="h-32 text-center text-muted-foreground">
                      {search ? `No budgets matching "${search}"` : "No budgets yet. Create one to get started."}
                    </TableCell>
                  </TableRow>
                ) : (
                  filtered.map((b) => {
                    const cfg = STATUS_CONFIG[b.status] ?? STATUS_CONFIG.DRAFT;
                    return (
                      <TableRow key={b.id} className="hover:bg-muted/40">
                        <TableCell className="font-semibold">
                          {b.fiscalPeriod?.name ?? b.fiscalPeriodId}
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className={cn("text-xs", cfg.color)}>
                            {cfg.label}
                          </Badge>
                        </TableCell>
                        <TableCell>v{b.version}</TableCell>
                        <TableCell>{b.lines?.length ?? 0}</TableCell>
                        <TableCell className="text-muted-foreground text-sm">
                          {b.approvedBy
                            ? `${b.approvedBy.firstName} ${b.approvedBy.lastName}`
                            : "—"}
                        </TableCell>
                        <TableCell className="text-muted-foreground text-sm">
                          {new Date(b.createdAt).toLocaleDateString()}
                        </TableCell>
                        <TableCell className="text-right">
                          <Button variant="ghost" size="sm" asChild>
                            <Link href={`/dashboard/budgets/${b.id}`}>Open</Link>
                          </Button>
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Create Dialog */}
      <Dialog open={creating} onOpenChange={setCreating}>
        <DialogContent className="sm:max-w-[480px]">
          <DialogHeader>
            <DialogTitle>Create New Budget</DialogTitle>
            <DialogDescription>
              Select a fiscal period to create a new budget draft.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label>Fiscal Period</Label>
              <Select
                value={form.fiscalPeriodId}
                onValueChange={(v) => setForm({ ...form, fiscalPeriodId: v })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select fiscal period..." />
                </SelectTrigger>
                <SelectContent>
                  {fiscalPeriods.length === 0 ? (
                    <SelectItem value="_none" disabled>No fiscal periods found</SelectItem>
                  ) : (
                    fiscalPeriods.map((p: any) => (
                      <SelectItem key={p.id} value={p.id}>
                        {p.name} ({p.status})
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label>Notes (Optional)</Label>
              <Textarea
                placeholder="Any notes about this budget..."
                value={form.notes}
                onChange={(e) => setForm({ ...form, notes: e.target.value })}
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreating(false)}>Cancel</Button>
            <Button onClick={handleCreate} disabled={isCreating}>
              {isCreating && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Create Budget
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
