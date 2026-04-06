"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
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
import { Separator } from "@/components/ui/separator";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  ArrowLeft, Loader2, Plus, Trash2, Save, CheckCircle2, Lock, Send, AlertTriangle,
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

export default function BudgetDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const { token, user } = useAuth();
  const [budget, setBudget] = useState<any>(null);
  const [accounts, setAccounts] = useState<any[]>([]);
  const [funds, setFunds] = useState<any[]>([]);
  const [costCentres, setCostCentres] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [actioning, setActioning] = useState<string | null>(null);
  const [confirmAction, setConfirmAction] = useState<null | "submit" | "approve" | "lock">(null);

  // Edit state
  const [editLines, setEditLines] = useState<any[]>([]);
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const fetchBudget = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await fetch(`/api/budgets/${params.id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error("Not found");
      const data = await res.json();
      setBudget(data);
      setEditLines(
        (data.lines ?? []).map((l: any) => ({
          id: l.id,
          accountId: l.accountId,
          fundId: l.fundId,
          costCentreId: l.costCentreId,
          periodLabel: l.periodLabel ?? "",
          amount: l.amount?.toString() ?? "0",
        }))
      );
    } catch {
      toast.error("Failed to load budget");
    } finally {
      setIsLoading(false);
    }
  }, [token, params.id]);

  const fetchSupporting = useCallback(async () => {
    if (!user?.organisationId) return;
    const [accs, fnds, ccs] = await Promise.all([
      fetch("/api/accounts", { headers: { Authorization: `Bearer ${token}` } }).then((r) => r.json()),
      fetch("/api/organisations/current/funds", { headers: { Authorization: `Bearer ${token}` } }).then((r) => r.json()),
      fetch("/api/organisations/current/cost-centres", { headers: { Authorization: `Bearer ${token}` } }).then((r) => r.json()),
    ]);
    setAccounts(Array.isArray(accs) ? accs : []);
    setFunds(Array.isArray(fnds) ? fnds : []);
    setCostCentres(Array.isArray(ccs) ? ccs : []);
  }, [token, user?.organisationId]);

  useEffect(() => {
    if (token) {
      fetchBudget();
      fetchSupporting();
    }
  }, [token, fetchBudget, fetchSupporting]);

  const handleAction = async (action: "submit" | "approve" | "lock") => {
    setActioning(action);
    try {
      const endpoint =
        action === "submit" ? "submit" : action === "approve" ? "approve" : "lock";
      const res = await fetch(`/api/budgets/${params.id}/${endpoint}`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || `Failed to ${action}`);
      }
      toast.success(`Budget ${action}d successfully`);
      fetchBudget();
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setActioning(null);
      setConfirmAction(null);
    }
  };

  const handleSaveLines = async () => {
    setIsSaving(true);
    try {
      const lines = editLines.map((l) => ({
        accountId: l.accountId,
        fundId: l.fundId,
        costCentreId: l.costCentreId,
        periodLabel: l.periodLabel || null,
        amount: parseFloat(l.amount) || 0,
      }));
      const res = await fetch(`/api/budgets/${params.id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ lines }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed to save");
      }
      toast.success("Budget lines saved");
      setIsEditing(false);
      fetchBudget();
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setIsSaving(false);
    }
  };

  const addLine = () => {
    setEditLines([
      ...editLines,
      {
        accountId: accounts[0]?.id ?? "",
        fundId: funds[0]?.id ?? "",
        costCentreId: costCentres[0]?.id ?? "",
        periodLabel: "",
        amount: "0",
      },
    ]);
  };

  const removeLine = (idx: number) => {
    setEditLines(editLines.filter((_, i) => i !== idx));
  };

  const updateLine = (idx: number, field: string, value: string) => {
    setEditLines(editLines.map((l, i) => (i === idx ? { ...l, [field]: value } : l)));
  };

  const totalAmount = (isEditing ? editLines : budget?.lines ?? []).reduce(
    (sum: number, l: any) => sum + (parseFloat(l.amount) || 0),
    0
  );

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!budget) {
    return (
      <div className="text-center py-20 text-muted-foreground">
        Budget not found.{" "}
        <Link href="/dashboard/budgets" className="text-primary underline">
          Back to Budgets
        </Link>
      </div>
    );
  }

  const cfg = STATUS_CONFIG[budget.status] ?? STATUS_CONFIG.DRAFT;
  const canEdit = ["DRAFT", "REVIEWED"].includes(budget.status) &&
    user && ["ADMIN", "BURSAR", "ACCOUNTANT"].includes(user.role);
  const canSubmit = budget.status === "DRAFT" &&
    user && ["ADMIN", "BURSAR", "ACCOUNTANT"].includes(user.role);
  const canApprove = ["DRAFT", "REVIEWED"].includes(budget.status) &&
    user && ["ADMIN", "BURSAR", "HEADMASTER"].includes(user.role);
  const canLock = budget.status === "APPROVED" &&
    user && ["ADMIN", "BURSAR"].includes(user.role);

  return (
    <div className="space-y-8 max-w-6xl mx-auto pb-10">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" asChild>
            <Link href="/dashboard/budgets">
              <ArrowLeft className="w-4 h-4" />
            </Link>
          </Button>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-3xl font-bold">
                Budget — {budget.fiscalPeriod?.name}
              </h1>
              <Badge variant="outline" className={cn("text-sm", cfg.color)}>
                {cfg.label}
              </Badge>
            </div>
            <p className="text-muted-foreground mt-1">
              v{budget.version} · Created by {budget.createdBy?.firstName}{" "}
              {budget.createdBy?.lastName} ·{" "}
              {new Date(budget.createdAt).toLocaleDateString()}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {canEdit && !isEditing && (
            <Button variant="outline" onClick={() => setIsEditing(true)}>
              Edit Lines
            </Button>
          )}
          {isEditing && (
            <>
              <Button variant="outline" onClick={() => { setIsEditing(false); fetchBudget(); }}>
                Cancel
              </Button>
              <Button onClick={handleSaveLines} disabled={isSaving}>
                {isSaving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
                Save Lines
              </Button>
            </>
          )}
          {!isEditing && canSubmit && (
            <Button
              variant="outline"
              className="border-blue-500/50 text-blue-600 hover:bg-blue-50"
              onClick={() => setConfirmAction("submit")}
              disabled={!!actioning}
            >
              <Send className="w-4 h-4 mr-2" />
              Submit for Review
            </Button>
          )}
          {!isEditing && canApprove && (
            <Button
              className="bg-green-600 hover:bg-green-700 text-white"
              onClick={() => setConfirmAction("approve")}
              disabled={!!actioning}
            >
              <CheckCircle2 className="w-4 h-4 mr-2" />
              Approve
            </Button>
          )}
          {!isEditing && canLock && (
            <Button
              className="bg-purple-600 hover:bg-purple-700 text-white"
              onClick={() => setConfirmAction("lock")}
              disabled={!!actioning}
            >
              <Lock className="w-4 h-4 mr-2" />
              Lock Budget
            </Button>
          )}
        </div>
      </div>

      {/* Info cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="shadow-sm">
          <CardHeader className="pb-2">
            <CardDescription>Fiscal Period</CardDescription>
            <CardTitle className="text-base">{budget.fiscalPeriod?.name}</CardTitle>
          </CardHeader>
        </Card>
        <Card className="shadow-sm">
          <CardHeader className="pb-2">
            <CardDescription>Total Budget</CardDescription>
            <CardTitle className="text-base">
              {totalAmount.toLocaleString(undefined, { minimumFractionDigits: 2 })}
            </CardTitle>
          </CardHeader>
        </Card>
        <Card className="shadow-sm">
          <CardHeader className="pb-2">
            <CardDescription>Line Items</CardDescription>
            <CardTitle className="text-base">
              {isEditing ? editLines.length : budget.lines?.length ?? 0}
            </CardTitle>
          </CardHeader>
        </Card>
        <Card className="shadow-sm">
          <CardHeader className="pb-2">
            <CardDescription>Approved By</CardDescription>
            <CardTitle className="text-base">
              {budget.approvedBy
                ? `${budget.approvedBy.firstName} ${budget.approvedBy.lastName}`
                : "—"}
            </CardTitle>
          </CardHeader>
        </Card>
      </div>

      {/* Notes */}
      {budget.notes && (
        <Card className="shadow-sm bg-amber-50/40 border-amber-200">
          <CardContent className="pt-4 flex items-start gap-2">
            <AlertTriangle className="w-4 h-4 text-amber-600 mt-0.5 shrink-0" />
            <p className="text-sm text-amber-800">{budget.notes}</p>
          </CardContent>
        </Card>
      )}

      {/* Lines Table */}
      <Card className="shadow-md">
        <CardHeader className="bg-muted/30 border-b">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Budget Lines</CardTitle>
              <CardDescription>Account allocations by fund and cost centre</CardDescription>
            </div>
            {isEditing && (
              <Button size="sm" onClick={addLine}>
                <Plus className="w-4 h-4 mr-1" />
                Add Line
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent className="p-0 overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Account</TableHead>
                <TableHead>Fund</TableHead>
                <TableHead>Cost Centre</TableHead>
                <TableHead>Period Label</TableHead>
                <TableHead className="text-right">Amount</TableHead>
                {isEditing && <TableHead />}
              </TableRow>
            </TableHeader>
            <TableBody>
              {(isEditing ? editLines : budget.lines ?? []).length === 0 ? (
                <TableRow>
                  <TableCell colSpan={isEditing ? 6 : 5} className="h-24 text-center text-muted-foreground">
                    {isEditing
                      ? 'No lines yet. Click "Add Line" to begin.'
                      : "No budget lines have been added."}
                  </TableCell>
                </TableRow>
              ) : isEditing ? (
                editLines.map((line, idx) => (
                  <TableRow key={idx}>
                    <TableCell className="min-w-[200px]">
                      <Select
                        value={line.accountId}
                        onValueChange={(v) => updateLine(idx, "accountId", v)}
                      >
                        <SelectTrigger className="h-8 text-xs">
                          <SelectValue placeholder="Account..." />
                        </SelectTrigger>
                        <SelectContent className="max-h-[300px]">
                          {accounts.map((a) => (
                            <SelectItem key={a.id} value={a.id}>
                              {a.code} – {a.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </TableCell>
                    <TableCell className="min-w-[160px]">
                      <Select
                        value={line.fundId}
                        onValueChange={(v) => updateLine(idx, "fundId", v)}
                      >
                        <SelectTrigger className="h-8 text-xs">
                          <SelectValue placeholder="Fund..." />
                        </SelectTrigger>
                        <SelectContent>
                          {funds.map((f) => (
                            <SelectItem key={f.id} value={f.id}>
                              {f.code} – {f.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </TableCell>
                    <TableCell className="min-w-[160px]">
                      <Select
                        value={line.costCentreId}
                        onValueChange={(v) => updateLine(idx, "costCentreId", v)}
                      >
                        <SelectTrigger className="h-8 text-xs">
                          <SelectValue placeholder="Cost Centre..." />
                        </SelectTrigger>
                        <SelectContent>
                          {costCentres.map((c) => (
                            <SelectItem key={c.id} value={c.id}>
                              {c.code} – {c.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </TableCell>
                    <TableCell>
                      <Input
                        className="h-8 text-xs w-28"
                        value={line.periodLabel}
                        onChange={(e) => updateLine(idx, "periodLabel", e.target.value)}
                        placeholder="e.g. Q1"
                      />
                    </TableCell>
                    <TableCell>
                      <Input
                        type="number"
                        className="h-8 text-xs text-right w-32"
                        value={line.amount}
                        onChange={(e) => updateLine(idx, "amount", e.target.value)}
                      />
                    </TableCell>
                    <TableCell>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-rose-500"
                        onClick={() => removeLine(idx)}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                budget.lines.map((line: any) => (
                  <TableRow key={line.id} className="hover:bg-muted/30">
                    <TableCell className="font-mono text-sm">
                      {line.account?.code} – {line.account?.name}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {line.fund?.code} – {line.fund?.name}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {line.costCentre?.code} – {line.costCentre?.name}
                    </TableCell>
                    <TableCell className="text-sm">{line.periodLabel ?? "—"}</TableCell>
                    <TableCell className="text-right font-mono font-semibold">
                      {parseFloat(line.amount).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                    </TableCell>
                  </TableRow>
                ))
              )}
              {!isEditing && budget.lines?.length > 0 && (
                <TableRow className="bg-muted/30 font-bold">
                  <TableCell colSpan={4} className="text-right text-sm">
                    Total
                  </TableCell>
                  <TableCell className="text-right font-mono">
                    {totalAmount.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Confirm Action Dialog */}
      <AlertDialog open={!!confirmAction} onOpenChange={(o) => !o && setConfirmAction(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {confirmAction === "submit"
                ? "Submit for Review?"
                : confirmAction === "approve"
                ? "Approve Budget?"
                : "Lock Budget?"}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {confirmAction === "submit" &&
                "This will move the budget to 'Under Review' status. You can still edit it until it is approved."}
              {confirmAction === "approve" &&
                "This will mark the budget as Approved. It can then be locked to prevent further changes."}
              {confirmAction === "lock" &&
                "Locking the budget will prevent any further edits. This action cannot be undone."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => confirmAction && handleAction(confirmAction)}
              className={
                confirmAction === "approve"
                  ? "bg-green-600 hover:bg-green-700"
                  : confirmAction === "lock"
                  ? "bg-purple-600 hover:bg-purple-700"
                  : undefined
              }
            >
              {actioning ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : confirmAction === "submit" ? (
                "Submit"
              ) : confirmAction === "approve" ? (
                "Approve"
              ) : (
                "Lock"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
