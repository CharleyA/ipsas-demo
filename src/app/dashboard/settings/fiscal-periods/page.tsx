"use client";

import { useEffect, useState, useCallback } from "react";
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
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Calendar, Loader2, PlusCircle, Lock, RotateCcw, X, CalendarDays, CheckCircle2,
} from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/components/providers/auth-provider";
import { cn } from "@/lib/utils";

const STATUS_CONFIG: Record<string, { label: string; color: string }> = {
  OPEN: { label: "Open", color: "bg-green-100 text-green-700 border-green-200" },
  CLOSED: { label: "Closed", color: "bg-amber-100 text-amber-700 border-amber-200" },
  LOCKED: { label: "Locked", color: "bg-rose-100 text-rose-700 border-rose-200" },
};

export default function FiscalPeriodsPage() {
  const { token, user } = useAuth();
  const [periods, setPeriods] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [actioning, setActioning] = useState<string | null>(null);
  const [confirmAction, setConfirmAction] = useState<{
    period: any;
    action: "close" | "lock" | "reopen";
  } | null>(null);
  const [filterYear, setFilterYear] = useState<string>("all");

  const [form, setForm] = useState({
    year: new Date().getFullYear().toString(),
    period: "1",
    name: "",
    startDate: "",
    endDate: "",
  });
  const [genYear, setGenYear] = useState(new Date().getFullYear().toString());

  const fetchPeriods = useCallback(async () => {
    if (!user?.organisationId) return;
    setIsLoading(true);
    try {
      const res = await fetch(
        `/api/organisations/${user.organisationId}/fiscal-periods`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      const data = await res.json();
      const list = data?.data ?? data ?? [];
      setPeriods(Array.isArray(list) ? list.sort((a: any, b: any) => {
        if (b.year !== a.year) return b.year - a.year;
        return b.period - a.period;
      }) : []);
    } catch {
      toast.error("Failed to load fiscal periods");
    } finally {
      setIsLoading(false);
    }
  }, [token, user?.organisationId]);

  useEffect(() => {
    if (token && user) fetchPeriods();
  }, [token, user, fetchPeriods]);

  const handleCreate = async () => {
    if (!form.name || !form.startDate || !form.endDate) {
      toast.error("Please fill all required fields");
      return;
    }
    setActioning("creating");
    try {
      const res = await fetch(
        `/api/organisations/${user!.organisationId}/fiscal-periods`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            year: parseInt(form.year),
            period: parseInt(form.period),
            name: form.name,
            startDate: form.startDate,
            endDate: form.endDate,
          }),
        }
      );
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed to create period");
      }
      toast.success("Fiscal period created");
      setCreating(false);
      setForm({ year: new Date().getFullYear().toString(), period: "1", name: "", startDate: "", endDate: "" });
      fetchPeriods();
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setActioning(null);
    }
  };

  const handleGenerate = async () => {
    if (!genYear) return;
    setActioning("generating");
    try {
      const res = await fetch(
        `/api/organisations/${user!.organisationId}/fiscal-periods?generateYear=${genYear}`,
        {
          method: "POST",
          headers: { Authorization: `Bearer ${token}` },
        }
      );
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed to generate periods");
      }
      toast.success(`12 monthly periods generated for ${genYear}`);
      setGenerating(false);
      fetchPeriods();
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setActioning(null);
    }
  };

  const handlePeriodAction = async (period: any, action: "close" | "lock" | "reopen") => {
    setActioning(period.id + action);
    try {
      const res = await fetch(
        `/api/organisations/${user!.organisationId}/fiscal-periods/${period.id}?action=${action}`,
        {
          method: "POST",
          headers: { Authorization: `Bearer ${token}` },
        }
      );
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || `Failed to ${action} period`);
      }
      toast.success(`Period ${action}d`);
      fetchPeriods();
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setActioning(null);
      setConfirmAction(null);
    }
  };

  const years = [...new Set(periods.map((p) => p.year))].sort((a, b) => b - a);
  const filtered = filterYear === "all" ? periods : periods.filter((p) => p.year === parseInt(filterYear));

  const stats = {
    OPEN: periods.filter((p) => p.status === "OPEN").length,
    CLOSED: periods.filter((p) => p.status === "CLOSED").length,
    LOCKED: periods.filter((p) => p.status === "LOCKED").length,
  };

  const canManage = user && ["ADMIN", "BURSAR"].includes(user.role);

  return (
    <div className="space-y-8 max-w-5xl mx-auto pb-10">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h1 className="text-4xl font-extrabold tracking-tight flex items-center gap-3">
            <div className="p-2 rounded-xl bg-primary/10">
              <CalendarDays className="w-8 h-8 text-primary" />
            </div>
            Fiscal Periods
          </h1>
          <p className="text-muted-foreground mt-2 text-lg">
            Manage accounting periods — open, close, and lock for year-end.
          </p>
        </div>
        {canManage && (
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => setGenerating(true)}>
              <CalendarDays className="w-4 h-4 mr-2" />
              Generate Year
            </Button>
            <Button onClick={() => setCreating(true)}>
              <PlusCircle className="w-4 h-4 mr-2" />
              Add Period
            </Button>
          </div>
        )}
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { key: "OPEN", icon: CheckCircle2, color: "text-green-600" },
          { key: "CLOSED", icon: X, color: "text-amber-600" },
          { key: "LOCKED", icon: Lock, color: "text-rose-600" },
        ].map(({ key, icon: Icon, color }) => (
          <Card key={key} className="shadow-sm">
            <CardHeader className="pb-2">
              <CardDescription className={cn("flex items-center gap-2 font-medium", color)}>
                <Icon className="w-4 h-4" /> {STATUS_CONFIG[key].label}
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
              <CardTitle>All Fiscal Periods</CardTitle>
              <CardDescription>Accounting periods by year</CardDescription>
            </div>
            {years.length > 0 && (
              <Select value={filterYear} onValueChange={setFilterYear}>
                <SelectTrigger className="w-40">
                  <SelectValue placeholder="All years" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Years</SelectItem>
                  {years.map((y) => (
                    <SelectItem key={y} value={String(y)}>
                      {y}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
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
                  <TableHead>Name</TableHead>
                  <TableHead>Year</TableHead>
                  <TableHead>Period</TableHead>
                  <TableHead>Start Date</TableHead>
                  <TableHead>End Date</TableHead>
                  <TableHead>Status</TableHead>
                  {canManage && <TableHead className="text-right">Actions</TableHead>}
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={canManage ? 7 : 6} className="h-32 text-center text-muted-foreground">
                      No fiscal periods found. Use "Generate Year" to create 12 monthly periods.
                    </TableCell>
                  </TableRow>
                ) : (
                  filtered.map((p) => {
                    const cfg = STATUS_CONFIG[p.status] ?? STATUS_CONFIG.OPEN;
                    return (
                      <TableRow key={p.id} className="hover:bg-muted/30">
                        <TableCell className="font-medium">{p.name}</TableCell>
                        <TableCell>{p.year}</TableCell>
                        <TableCell>{p.period}</TableCell>
                        <TableCell>{new Date(p.startDate).toLocaleDateString()}</TableCell>
                        <TableCell>{new Date(p.endDate).toLocaleDateString()}</TableCell>
                        <TableCell>
                          <Badge variant="outline" className={cn("text-xs", cfg.color)}>
                            {cfg.label}
                          </Badge>
                        </TableCell>
                        {canManage && (
                          <TableCell className="text-right">
                            <div className="flex justify-end gap-1">
                              {p.status === "OPEN" && (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="text-amber-600 hover:bg-amber-50 h-8 text-xs"
                                  disabled={!!actioning}
                                  onClick={() => setConfirmAction({ period: p, action: "close" })}
                                >
                                  <X className="w-3 h-3 mr-1" /> Close
                                </Button>
                              )}
                              {p.status === "CLOSED" && (
                                <>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    className="text-rose-600 hover:bg-rose-50 h-8 text-xs"
                                    disabled={!!actioning}
                                    onClick={() => setConfirmAction({ period: p, action: "lock" })}
                                  >
                                    <Lock className="w-3 h-3 mr-1" /> Lock
                                  </Button>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    className="text-green-600 hover:bg-green-50 h-8 text-xs"
                                    disabled={!!actioning}
                                    onClick={() => setConfirmAction({ period: p, action: "reopen" })}
                                  >
                                    <RotateCcw className="w-3 h-3 mr-1" /> Reopen
                                  </Button>
                                </>
                              )}
                              {p.status === "LOCKED" && (
                                <span className="text-xs text-muted-foreground px-2">
                                  Locked {p.lockedAt ? new Date(p.lockedAt).toLocaleDateString() : ""}
                                </span>
                              )}
                            </div>
                          </TableCell>
                        )}
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
            <DialogTitle>Add Fiscal Period</DialogTitle>
            <DialogDescription>Create a single accounting period manually.</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label>Year</Label>
                <Input
                  type="number"
                  value={form.year}
                  onChange={(e) => setForm({ ...form, year: e.target.value })}
                />
              </div>
              <div className="grid gap-2">
                <Label>Period Number</Label>
                <Input
                  type="number"
                  min={1}
                  max={12}
                  value={form.period}
                  onChange={(e) => setForm({ ...form, period: e.target.value })}
                />
              </div>
            </div>
            <div className="grid gap-2">
              <Label>Period Name</Label>
              <Input
                placeholder="e.g. January 2025"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label>Start Date</Label>
                <Input
                  type="date"
                  value={form.startDate}
                  onChange={(e) => setForm({ ...form, startDate: e.target.value })}
                />
              </div>
              <div className="grid gap-2">
                <Label>End Date</Label>
                <Input
                  type="date"
                  value={form.endDate}
                  onChange={(e) => setForm({ ...form, endDate: e.target.value })}
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreating(false)}>Cancel</Button>
            <Button onClick={handleCreate} disabled={actioning === "creating"}>
              {actioning === "creating" && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Create Period
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Generate Year Dialog */}
      <Dialog open={generating} onOpenChange={setGenerating}>
        <DialogContent className="sm:max-w-[380px]">
          <DialogHeader>
            <DialogTitle>Generate Fiscal Year</DialogTitle>
            <DialogDescription>
              Automatically create 12 monthly periods for a calendar year.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label>Year</Label>
              <Input
                type="number"
                value={genYear}
                onChange={(e) => setGenYear(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setGenerating(false)}>Cancel</Button>
            <Button onClick={handleGenerate} disabled={actioning === "generating"}>
              {actioning === "generating" && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Generate 12 Periods
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Confirm Period Action */}
      <AlertDialog open={!!confirmAction} onOpenChange={(o) => !o && setConfirmAction(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {confirmAction?.action === "close" && "Close Period?"}
              {confirmAction?.action === "lock" && "Lock Period?"}
              {confirmAction?.action === "reopen" && "Reopen Period?"}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {confirmAction?.action === "close" &&
                `Closing "${confirmAction.period.name}" will prevent new transactions from being posted. You can reopen it if needed.`}
              {confirmAction?.action === "lock" &&
                `Locking "${confirmAction.period.name}" is permanent and will prevent all further changes including reopening.`}
              {confirmAction?.action === "reopen" &&
                `Reopening "${confirmAction.period.name}" will allow new transactions to be posted again.`}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() =>
                confirmAction &&
                handlePeriodAction(confirmAction.period, confirmAction.action)
              }
              className={
                confirmAction?.action === "lock"
                  ? "bg-rose-600 hover:bg-rose-700"
                  : confirmAction?.action === "close"
                  ? "bg-amber-600 hover:bg-amber-700"
                  : undefined
              }
            >
              {actioning
                ? <Loader2 className="w-4 h-4 animate-spin" />
                : confirmAction?.action === "close"
                ? "Close Period"
                : confirmAction?.action === "lock"
                ? "Lock Period"
                : "Reopen Period"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
