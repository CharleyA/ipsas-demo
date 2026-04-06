"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import {
  Card, CardContent, CardDescription, CardHeader, CardTitle,
} from "@/components/ui/card";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAuth } from "@/components/providers/auth-provider";
import {
  Eye, CheckCircle, XCircle, Loader2, Inbox, ShieldCheck, FileText,
  ShoppingCart, ClipboardList, BookOpen,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

export default function ApprovalsPage() {
  const { user, token } = useAuth();
  const [voucherTasks, setVoucherTasks] = useState<any[]>([]);
  const [pendingPOs, setPendingPOs] = useState<any[]>([]);
  const [pendingReqs, setPendingReqs] = useState<any[]>([]);
  const [pendingBudgets, setPendingBudgets] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [actioning, setActioning] = useState<string | null>(null);

  const fetchAll = useCallback(
    async (silent = false) => {
      if (!silent) setIsLoading(true);
      try {
        const headers = { Authorization: `Bearer ${token}` };
        const [vRes, poRes, reqRes, budRes] = await Promise.allSettled([
          fetch("/api/approvals", { headers }).then((r) => (r.ok ? r.json() : [])),
          fetch("/api/procurement/purchase-orders?status=SUBMITTED", { headers }).then((r) =>
            r.ok ? r.json() : []
          ),
          fetch("/api/inventory/requisitions?status=SUBMITTED", { headers }).then((r) =>
            r.ok ? r.json() : []
          ),
          fetch("/api/budgets?status=REVIEWED", { headers }).then((r) =>
            r.ok ? r.json() : []
          ),
        ]);

        setVoucherTasks(
          vRes.status === "fulfilled" && Array.isArray(vRes.value) ? vRes.value : []
        );
        setPendingPOs(
          poRes.status === "fulfilled" && Array.isArray(poRes.value)
            ? poRes.value.filter((p: any) => p.status === "SUBMITTED")
            : []
        );
        setPendingReqs(
          reqRes.status === "fulfilled" && Array.isArray(reqRes.value)
            ? reqRes.value.filter((r: any) => r.status === "SUBMITTED")
            : []
        );
        setPendingBudgets(
          budRes.status === "fulfilled" && Array.isArray(budRes.value)
            ? budRes.value.filter((b: any) => b.status === "REVIEWED" || b.status === "DRAFT")
            : []
        );
      } catch {
        if (!silent) toast.error("Failed to load approvals");
      } finally {
        if (!silent) setIsLoading(false);
      }
    },
    [token]
  );

  useEffect(() => {
    if (token) {
      fetchAll();
      const interval = setInterval(() => fetchAll(true), 15000);
      return () => clearInterval(interval);
    }
  }, [token, fetchAll]);

  const handleVoucherAction = async (voucherId: string, action: "approve" | "reject") => {
    setActioning(voucherId + action);
    try {
      const res = await fetch(`/api/vouchers/${voucherId}/${action}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ notes: `${action}d via approvals inbox` }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || `Failed to ${action}`);
      }
      toast.success(`Voucher ${action}d`);
      setVoucherTasks((prev) => prev.filter((t) => t.voucherId !== voucherId));
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setActioning(null);
    }
  };

  const handlePOAction = async (poId: string, action: "approve" | "cancel") => {
    setActioning(poId + action);
    try {
      const res = await fetch(`/api/procurement/purchase-orders/${poId}/${action}`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || `Failed to ${action} PO`);
      }
      toast.success(`PO ${action}d`);
      setPendingPOs((prev) => prev.filter((p) => p.id !== poId));
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setActioning(null);
    }
  };

  const handleReqAction = async (reqId: string, action: "approve" | "reject") => {
    setActioning(reqId + action);
    try {
      const res = await fetch(`/api/inventory/requisitions/${reqId}/${action}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({}),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || `Failed to ${action}`);
      }
      toast.success(`Requisition ${action}d`);
      setPendingReqs((prev) => prev.filter((r) => r.id !== reqId));
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setActioning(null);
    }
  };

  const handleBudgetApprove = async (budgetId: string) => {
    setActioning(budgetId);
    try {
      const res = await fetch(`/api/budgets/${budgetId}/approve`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed to approve budget");
      }
      toast.success("Budget approved");
      setPendingBudgets((prev) => prev.filter((b) => b.id !== budgetId));
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setActioning(null);
    }
  };

  const totalPending =
    voucherTasks.length + pendingPOs.length + pendingReqs.length + pendingBudgets.length;

  const canApproveVouchers = user && ["ADMIN", "BURSAR", "HEADMASTER"].includes(user.role);
  const canApprovePOs = user && ["ADMIN", "BURSAR", "ACCOUNTANT"].includes(user.role);
  const canApproveReqs = user && ["ADMIN", "BURSAR", "ACCOUNTANT"].includes(user.role);
  const canApproveBudgets = user && ["ADMIN", "BURSAR", "HEADMASTER"].includes(user.role);

  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-10">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-4xl font-extrabold tracking-tight flex items-center gap-3">
            <div className="p-2 rounded-xl bg-primary/10">
              <Inbox className="w-8 h-8 text-primary" />
            </div>
            Approvals Inbox
          </h1>
          <p className="text-muted-foreground mt-2">
            Review and authorise pending items across all modules.
          </p>
        </div>
        {totalPending > 0 && (
          <Badge className="text-base px-3 py-1 bg-rose-600 text-white">
            {totalPending} pending
          </Badge>
        )}
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: "Vouchers", count: voucherTasks.length, icon: FileText, color: "text-indigo-600" },
          { label: "Purchase Orders", count: pendingPOs.length, icon: ShoppingCart, color: "text-amber-600" },
          { label: "Requisitions", count: pendingReqs.length, icon: ClipboardList, color: "text-blue-600" },
          { label: "Budgets", count: pendingBudgets.length, icon: BookOpen, color: "text-green-600" },
        ].map(({ label, count, icon: Icon, color }) => (
          <Card key={label} className="shadow-sm">
            <CardHeader className="pb-2">
              <CardDescription className={cn("flex items-center gap-2 font-medium", color)}>
                <Icon className="w-4 h-4" /> {label}
              </CardDescription>
              <CardTitle className="text-2xl">{count}</CardTitle>
            </CardHeader>
          </Card>
        ))}
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      ) : (
        <Tabs defaultValue="vouchers">
          <TabsList className="mb-4">
            <TabsTrigger value="vouchers">
              Vouchers {voucherTasks.length > 0 && <Badge className="ml-2 h-5 px-1.5 text-xs">{voucherTasks.length}</Badge>}
            </TabsTrigger>
            <TabsTrigger value="pos">
              Purchase Orders {pendingPOs.length > 0 && <Badge className="ml-2 h-5 px-1.5 text-xs">{pendingPOs.length}</Badge>}
            </TabsTrigger>
            <TabsTrigger value="reqs">
              Requisitions {pendingReqs.length > 0 && <Badge className="ml-2 h-5 px-1.5 text-xs">{pendingReqs.length}</Badge>}
            </TabsTrigger>
            <TabsTrigger value="budgets">
              Budgets {pendingBudgets.length > 0 && <Badge className="ml-2 h-5 px-1.5 text-xs">{pendingBudgets.length}</Badge>}
            </TabsTrigger>
          </TabsList>

          {/* Vouchers Tab */}
          <TabsContent value="vouchers">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="w-5 h-5 text-indigo-500" /> Vouchers Awaiting Approval
                </CardTitle>
                <CardDescription>Journal entries and payment vouchers submitted for review.</CardDescription>
              </CardHeader>
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Voucher No.</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Date</TableHead>
                      <TableHead>Description</TableHead>
                      <TableHead>Submitted By</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {voucherTasks.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={6} className="h-24 text-center text-muted-foreground">
                          No vouchers pending approval.
                        </TableCell>
                      </TableRow>
                    ) : (
                      voucherTasks.map((task) => (
                        <TableRow key={task.id}>
                          <TableCell className="font-medium font-mono">
                            {task.voucher.number}
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline">{task.voucher.type}</Badge>
                          </TableCell>
                          <TableCell>{new Date(task.voucher.date).toLocaleDateString()}</TableCell>
                          <TableCell className="max-w-[250px] truncate text-sm">
                            {task.voucher.description}
                          </TableCell>
                          <TableCell className="text-sm text-muted-foreground">
                            {task.voucher.createdBy
                              ? `${task.voucher.createdBy.firstName} ${task.voucher.createdBy.lastName}`
                              : "—"}
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex justify-end gap-2">
                              <Button variant="ghost" size="icon" asChild>
                                <Link href={`/dashboard/vouchers/${task.voucher.id}`}>
                                  <Eye className="w-4 h-4" />
                                </Link>
                              </Button>
                              {canApproveVouchers && (
                                <>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="text-green-600 hover:text-green-700"
                                    disabled={actioning === task.voucherId + "approve"}
                                    onClick={() => handleVoucherAction(task.voucherId, "approve")}
                                  >
                                    {actioning === task.voucherId + "approve" ? (
                                      <Loader2 className="w-4 h-4 animate-spin" />
                                    ) : (
                                      <CheckCircle className="w-4 h-4" />
                                    )}
                                  </Button>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="text-rose-600 hover:text-rose-700"
                                    disabled={actioning === task.voucherId + "reject"}
                                    onClick={() => handleVoucherAction(task.voucherId, "reject")}
                                  >
                                    {actioning === task.voucherId + "reject" ? (
                                      <Loader2 className="w-4 h-4 animate-spin" />
                                    ) : (
                                      <XCircle className="w-4 h-4" />
                                    )}
                                  </Button>
                                </>
                              )}
                            </div>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Purchase Orders Tab */}
          <TabsContent value="pos">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <ShoppingCart className="w-5 h-5 text-amber-500" /> Purchase Orders Awaiting Approval
                </CardTitle>
                <CardDescription>Submitted purchase orders requiring authorisation before processing.</CardDescription>
              </CardHeader>
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>PO Number</TableHead>
                      <TableHead>Supplier</TableHead>
                      <TableHead>Order Date</TableHead>
                      <TableHead>Required By</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {pendingPOs.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={5} className="h-24 text-center text-muted-foreground">
                          No purchase orders pending approval.
                        </TableCell>
                      </TableRow>
                    ) : (
                      pendingPOs.map((po) => (
                        <TableRow key={po.id}>
                          <TableCell className="font-mono font-medium">{po.poNumber}</TableCell>
                          <TableCell>{po.supplier?.name ?? "—"}</TableCell>
                          <TableCell>{po.orderDate ? new Date(po.orderDate).toLocaleDateString() : "—"}</TableCell>
                          <TableCell>{po.requiredByDate ? new Date(po.requiredByDate).toLocaleDateString() : "—"}</TableCell>
                          <TableCell className="text-right">
                            <div className="flex justify-end gap-2">
                              <Button variant="ghost" size="icon" asChild>
                                <Link href={`/dashboard/procurement/purchase-orders/${po.id}`}>
                                  <Eye className="w-4 h-4" />
                                </Link>
                              </Button>
                              {canApprovePOs && (
                                <>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="text-green-600 hover:text-green-700"
                                    disabled={actioning === po.id + "approve"}
                                    onClick={() => handlePOAction(po.id, "approve")}
                                  >
                                    {actioning === po.id + "approve" ? (
                                      <Loader2 className="w-4 h-4 animate-spin" />
                                    ) : (
                                      <CheckCircle className="w-4 h-4" />
                                    )}
                                  </Button>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="text-rose-600 hover:text-rose-700"
                                    disabled={actioning === po.id + "cancel"}
                                    onClick={() => handlePOAction(po.id, "cancel")}
                                  >
                                    {actioning === po.id + "cancel" ? (
                                      <Loader2 className="w-4 h-4 animate-spin" />
                                    ) : (
                                      <XCircle className="w-4 h-4" />
                                    )}
                                  </Button>
                                </>
                              )}
                            </div>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Requisitions Tab */}
          <TabsContent value="reqs">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <ClipboardList className="w-5 h-5 text-blue-500" /> Stock Requisitions Awaiting Approval
                </CardTitle>
                <CardDescription>Inventory requisitions submitted for approval before stock can be issued.</CardDescription>
              </CardHeader>
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Req. Number</TableHead>
                      <TableHead>Department</TableHead>
                      <TableHead>Request Date</TableHead>
                      <TableHead>Required By</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {pendingReqs.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={5} className="h-24 text-center text-muted-foreground">
                          No requisitions pending approval.
                        </TableCell>
                      </TableRow>
                    ) : (
                      pendingReqs.map((req) => (
                        <TableRow key={req.id}>
                          <TableCell className="font-mono font-medium">{req.reqNumber}</TableCell>
                          <TableCell>{req.department ?? "—"}</TableCell>
                          <TableCell>{req.requestDate ? new Date(req.requestDate).toLocaleDateString() : "—"}</TableCell>
                          <TableCell>{req.requiredDate ? new Date(req.requiredDate).toLocaleDateString() : "—"}</TableCell>
                          <TableCell className="text-right">
                            <div className="flex justify-end gap-2">
                              <Button variant="ghost" size="icon" asChild>
                                <Link href={`/dashboard/inventory/requisitions/${req.id}`}>
                                  <Eye className="w-4 h-4" />
                                </Link>
                              </Button>
                              {canApproveReqs && (
                                <>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="text-green-600 hover:text-green-700"
                                    disabled={actioning === req.id + "approve"}
                                    onClick={() => handleReqAction(req.id, "approve")}
                                  >
                                    {actioning === req.id + "approve" ? (
                                      <Loader2 className="w-4 h-4 animate-spin" />
                                    ) : (
                                      <CheckCircle className="w-4 h-4" />
                                    )}
                                  </Button>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="text-rose-600 hover:text-rose-700"
                                    disabled={actioning === req.id + "reject"}
                                    onClick={() => handleReqAction(req.id, "reject")}
                                  >
                                    {actioning === req.id + "reject" ? (
                                      <Loader2 className="w-4 h-4 animate-spin" />
                                    ) : (
                                      <XCircle className="w-4 h-4" />
                                    )}
                                  </Button>
                                </>
                              )}
                            </div>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Budgets Tab */}
          <TabsContent value="budgets">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BookOpen className="w-5 h-5 text-green-500" /> Budgets Awaiting Approval
                </CardTitle>
                <CardDescription>Draft and reviewed budgets pending authorisation.</CardDescription>
              </CardHeader>
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Fiscal Period</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Version</TableHead>
                      <TableHead>Lines</TableHead>
                      <TableHead>Created</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {pendingBudgets.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={6} className="h-24 text-center text-muted-foreground">
                          No budgets pending approval.
                        </TableCell>
                      </TableRow>
                    ) : (
                      pendingBudgets.map((b) => (
                        <TableRow key={b.id}>
                          <TableCell className="font-semibold">{b.fiscalPeriod?.name ?? b.fiscalPeriodId}</TableCell>
                          <TableCell>
                            <Badge
                              variant="outline"
                              className={
                                b.status === "REVIEWED"
                                  ? "border-blue-200 bg-blue-50 text-blue-700"
                                  : "border-slate-200 bg-slate-50 text-slate-700"
                              }
                            >
                              {b.status}
                            </Badge>
                          </TableCell>
                          <TableCell>v{b.version}</TableCell>
                          <TableCell>{b.lines?.length ?? 0}</TableCell>
                          <TableCell className="text-muted-foreground text-sm">
                            {new Date(b.createdAt).toLocaleDateString()}
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex justify-end gap-2">
                              <Button variant="ghost" size="icon" asChild>
                                <Link href={`/dashboard/budgets/${b.id}`}>
                                  <Eye className="w-4 h-4" />
                                </Link>
                              </Button>
                              {canApproveBudgets && (
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="text-green-600 hover:text-green-700"
                                  disabled={actioning === b.id}
                                  onClick={() => handleBudgetApprove(b.id)}
                                >
                                  {actioning === b.id ? (
                                    <Loader2 className="w-4 h-4 animate-spin" />
                                  ) : (
                                    <CheckCircle className="w-4 h-4" />
                                  )}
                                </Button>
                              )}
                            </div>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      )}
    </div>
  );
}
