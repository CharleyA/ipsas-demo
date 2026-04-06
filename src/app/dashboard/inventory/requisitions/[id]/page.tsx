"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { ArrowLeft, Loader2, CheckCircle2, XCircle, PackageCheck, ClipboardList } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/components/providers/auth-provider";

const statusColors: Record<string, string> = {
  DRAFT: "bg-gray-100 text-gray-700",
  SUBMITTED: "bg-blue-100 text-blue-800",
  APPROVED: "bg-green-100 text-green-800",
  PARTIALLY_ISSUED: "bg-orange-100 text-orange-800",
  FULLY_ISSUED: "bg-green-200 text-green-900",
  REJECTED: "bg-red-100 text-red-800",
  CANCELLED: "bg-gray-100 text-gray-500",
};

const fmtDate = (d: string | null | undefined) =>
  d ? new Date(d).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" }) : "-";

export default function RequisitionDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { token } = useAuth();
  const [req, setReq] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [actioning, setActioning] = useState<string | null>(null);
  const [issueOpen, setIssueOpen] = useState(false);
  const [rejectOpen, setRejectOpen] = useState(false);
  const [rejectionNote, setRejectionNote] = useState("");
  const [issueLines, setIssueLines] = useState<{ lineId: string; qtyRequested: number; qtyIssued: number; itemName: string; inputQty: string }[]>([]);

  async function load() {
    setLoading(true);
    try {
      const res = await fetch(`/api/inventory/requisitions/${id}`, { headers: { Authorization: `Bearer ${token}` } });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Not found");
      setReq(data);
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { if (token && id) load(); }, [token, id]);

  function openIssue() {
    if (!req) return;
    setIssueLines(
      req.lines
        .filter((l: any) => Number(l.qtyIssued) < Number(l.qtyRequested))
        .map((l: any) => ({
          lineId: l.id,
          qtyRequested: Number(l.qtyRequested),
          qtyIssued: Number(l.qtyIssued),
          itemName: l.item?.name || l.itemId,
          inputQty: String(Number(l.qtyRequested) - Number(l.qtyIssued)),
        }))
    );
    setIssueOpen(true);
  }

  async function submitIssue() {
    setActioning("issue");
    try {
      const res = await fetch(`/api/inventory/requisitions/${id}/issue`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          lines: issueLines.map((l) => ({ lineId: l.lineId, qtyIssued: parseFloat(l.inputQty) || 0 })),
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to issue");
      toast.success("Stock issued successfully");
      setIssueOpen(false);
      load();
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setActioning(null);
    }
  }

  async function handleApprove() {
    setActioning("approve");
    try {
      const res = await fetch(`/api/inventory/requisitions/${id}/approve`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to approve");
      toast.success("Requisition approved");
      load();
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setActioning(null);
    }
  }

  async function submitReject() {
    setActioning("reject");
    try {
      const res = await fetch(`/api/inventory/requisitions/${id}/reject`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ reason: rejectionNote }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to reject");
      toast.success("Requisition rejected");
      setRejectOpen(false);
      load();
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setActioning(null);
    }
  }

  if (loading) return <div className="flex justify-center py-16"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>;
  if (!req) return <div className="p-8 text-center text-muted-foreground">Requisition not found. <Link href="/dashboard/inventory/requisitions" className="underline">Back</Link></div>;

  const canApprove = req.status === "SUBMITTED";
  const canReject = ["SUBMITTED", "APPROVED"].includes(req.status);
  const canIssue = req.status === "APPROVED" || req.status === "PARTIALLY_ISSUED";
  const hasOutstanding = req.lines?.some((l: any) => Number(l.qtyIssued) < Number(l.qtyRequested));

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" asChild>
            <Link href="/dashboard/inventory/requisitions"><ArrowLeft className="w-4 h-4" /></Link>
          </Button>
          <div>
            <h1 className="text-2xl font-bold">{req.reqNumber}</h1>
            <p className="text-muted-foreground">{req.department || "No department"} · Requested {fmtDate(req.requestDate)}</p>
          </div>
          <Badge variant="secondary" className={statusColors[req.status] || ""}>
            {req.status?.replace(/_/g, " ")}
          </Badge>
        </div>
        <div className="flex gap-2">
          {canApprove && (
            <Button size="sm" onClick={handleApprove} disabled={actioning === "approve"}>
              {actioning === "approve" ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <CheckCircle2 className="w-4 h-4 mr-2" />}
              Approve
            </Button>
          )}
          {canIssue && hasOutstanding && (
            <Button size="sm" variant="outline" onClick={openIssue}>
              <PackageCheck className="w-4 h-4 mr-2" />Issue Stock
            </Button>
          )}
          {canReject && (
            <Button size="sm" variant="destructive" onClick={() => setRejectOpen(true)}>
              <XCircle className="w-4 h-4 mr-2" />Reject
            </Button>
          )}
        </div>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: "Department", value: req.department || "-" },
          { label: "Request Date", value: fmtDate(req.requestDate) },
          { label: "Required By", value: fmtDate(req.requiredDate) },
          { label: "Items", value: `${req.lines?.length || 0} lines` },
        ].map(({ label, value }) => (
          <Card key={label}>
            <CardContent className="pt-5">
              <p className="text-xs text-muted-foreground mb-1">{label}</p>
              <p className="font-semibold text-sm">{value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Lines */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><ClipboardList className="w-5 h-5" />Requested Items</CardTitle>
          <CardDescription>{req.lines?.length} item(s)</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Item Code</TableHead>
                <TableHead>Item Name</TableHead>
                <TableHead>UoM</TableHead>
                <TableHead className="text-right">Qty Requested</TableHead>
                <TableHead className="text-right">Qty Issued</TableHead>
                <TableHead className="text-right">Outstanding</TableHead>
                <TableHead>Notes</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {req.lines?.map((l: any) => {
                const outstanding = Number(l.qtyRequested) - Number(l.qtyIssued);
                return (
                  <TableRow key={l.id}>
                    <TableCell className="font-medium">{l.item?.code || "-"}</TableCell>
                    <TableCell>{l.item?.name || "-"}</TableCell>
                    <TableCell>{l.item?.unitOfMeasure || "-"}</TableCell>
                    <TableCell className="text-right font-mono">{Number(l.qtyRequested).toFixed(2)}</TableCell>
                    <TableCell className="text-right font-mono text-green-600">{Number(l.qtyIssued).toFixed(2)}</TableCell>
                    <TableCell className={`text-right font-mono ${outstanding > 0 ? "text-orange-600" : "text-muted-foreground"}`}>
                      {outstanding.toFixed(2)}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">{l.notes || "-"}</TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {req.notes && (
        <Card>
          <CardHeader><CardTitle className="text-sm">Notes</CardTitle></CardHeader>
          <CardContent><p className="text-sm text-muted-foreground">{req.notes}</p></CardContent>
        </Card>
      )}

      {req.rejectionNote && (
        <Card className="border-destructive">
          <CardHeader><CardTitle className="text-sm text-destructive">Rejection Reason</CardTitle></CardHeader>
          <CardContent><p className="text-sm">{req.rejectionNote}</p></CardContent>
        </Card>
      )}

      {/* Issue Dialog */}
      <Dialog open={issueOpen} onOpenChange={setIssueOpen}>
        <DialogContent className="max-w-xl">
          <DialogHeader>
            <DialogTitle>Issue Stock — {req.reqNumber}</DialogTitle>
            <DialogDescription>Enter quantities to issue for each line. Leave at 0 to skip.</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            {issueLines.map((l, idx) => (
              <div key={l.lineId} className="border rounded-lg p-3">
                <p className="text-sm font-medium mb-2">{l.itemName}</p>
                <div className="flex items-center gap-4 text-xs text-muted-foreground mb-2">
                  <span>Requested: {l.qtyRequested}</span>
                  <span>Already Issued: {l.qtyIssued}</span>
                  <span>Outstanding: {(l.qtyRequested - l.qtyIssued).toFixed(2)}</span>
                </div>
                <div>
                  <Label className="text-xs">Qty to Issue Now</Label>
                  <Input type="number" min="0" max={l.qtyRequested - l.qtyIssued} value={l.inputQty}
                    onChange={(e) => {
                      const updated = [...issueLines];
                      updated[idx] = { ...updated[idx], inputQty: e.target.value };
                      setIssueLines(updated);
                    }} className="mt-1" />
                </div>
              </div>
            ))}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIssueOpen(false)}>Cancel</Button>
            <Button onClick={submitIssue} disabled={actioning === "issue"}>
              {actioning === "issue" ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <PackageCheck className="w-4 h-4 mr-2" />}
              Confirm Issue
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Reject Dialog */}
      <Dialog open={rejectOpen} onOpenChange={setRejectOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reject Requisition</DialogTitle>
            <DialogDescription>Provide a reason for rejecting this requisition.</DialogDescription>
          </DialogHeader>
          <div>
            <Label>Reason for Rejection</Label>
            <Textarea value={rejectionNote} onChange={(e) => setRejectionNote(e.target.value)}
              placeholder="Explain why this requisition is being rejected..." className="mt-1" rows={3} />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRejectOpen(false)}>Cancel</Button>
            <Button variant="destructive" onClick={submitReject} disabled={actioning === "reject"}>
              {actioning === "reject" ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <XCircle className="w-4 h-4 mr-2" />}
              Reject
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
