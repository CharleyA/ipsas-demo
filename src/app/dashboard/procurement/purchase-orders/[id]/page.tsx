"use client";

import { useEffect, useState } from "react";
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
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import {
  ArrowLeft, Loader2, CheckCircle2, XCircle, PackageCheck, FileText, Calendar, Building2,
} from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/components/providers/auth-provider";

const statusColors: Record<string, string> = {
  DRAFT: "bg-gray-100 text-gray-800",
  APPROVED: "bg-blue-100 text-blue-800",
  PARTIALLY_RECEIVED: "bg-orange-100 text-orange-800",
  FULLY_RECEIVED: "bg-green-100 text-green-800",
  CLOSED: "bg-green-100 text-green-800",
  CANCELLED: "bg-red-100 text-red-800",
};

const fmt = (n: number) =>
  new Intl.NumberFormat("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(n);
const fmtDate = (d: string | null | undefined) =>
  d ? new Date(d).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" }) : "-";

export default function PODetailPage() {
  const { id } = useParams<{ id: string }>();
  const { token } = useAuth();
  const router = useRouter();
  const [po, setPo] = useState<any>(null);
  const [grns, setGrns] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [actioning, setActioning] = useState<string | null>(null);
  const [receiveOpen, setReceiveOpen] = useState(false);
  const [receiveForm, setReceiveForm] = useState({
    receivedDate: new Date().toISOString().split("T")[0],
    deliveryNoteRef: "",
    inspectionNotes: "",
    lines: [] as { poLineId: string; description: string; ordered: number; alreadyReceived: number; qtyDelivered: string; qtyAccepted: string }[],
  });

  async function load() {
    setLoading(true);
    try {
      const [poRes, grnRes] = await Promise.all([
        fetch(`/api/procurement/purchase-orders/${id}`, { headers: { Authorization: `Bearer ${token}` } }),
        fetch(`/api/procurement/grn?poId=${id}`, { headers: { Authorization: `Bearer ${token}` } }),
      ]);
      const poData = await poRes.json();
      const grnData = await grnRes.json();
      if (!poRes.ok) throw new Error(poData.error || "Not found");
      setPo(poData);
      setGrns(Array.isArray(grnData) ? grnData.filter((g: any) => g.poId === id) : []);
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { if (token && id) load(); }, [token, id]);

  function openReceive() {
    if (!po) return;
    setReceiveForm({
      receivedDate: new Date().toISOString().split("T")[0],
      deliveryNoteRef: "",
      inspectionNotes: "",
      lines: po.lines
        .filter((l: any) => Number(l.quantity) > Number(l.qtyReceived || 0))
        .map((l: any) => ({
          poLineId: l.id,
          description: l.description,
          ordered: Number(l.quantity),
          alreadyReceived: Number(l.qtyReceived || 0),
          qtyDelivered: String(Number(l.quantity) - Number(l.qtyReceived || 0)),
          qtyAccepted: String(Number(l.quantity) - Number(l.qtyReceived || 0)),
        })),
    });
    setReceiveOpen(true);
  }

  async function submitReceive() {
    setActioning("receive");
    try {
      const res = await fetch("/api/procurement/grn", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          poId: id,
          supplierId: po.supplierId,
          receivedDate: receiveForm.receivedDate,
          deliveryNoteRef: receiveForm.deliveryNoteRef || undefined,
          inspectionNotes: receiveForm.inspectionNotes || undefined,
          lines: receiveForm.lines.map((l) => ({
            poLineId: l.poLineId,
            qtyDelivered: parseFloat(l.qtyDelivered) || 0,
            qtyAccepted: parseFloat(l.qtyAccepted) || 0,
            qtyRejected: Math.max(0, (parseFloat(l.qtyDelivered) || 0) - (parseFloat(l.qtyAccepted) || 0)),
          })),
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to create GRN");
      toast.success(`GRN ${data.grnNumber} created successfully`);
      setReceiveOpen(false);
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
      const res = await fetch(`/api/procurement/purchase-orders/${id}/approve`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to approve");
      toast.success("Purchase order approved");
      load();
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setActioning(null);
    }
  }

  async function handleCancel() {
    if (!confirm("Cancel this purchase order? This cannot be undone.")) return;
    setActioning("cancel");
    try {
      const res = await fetch(`/api/procurement/purchase-orders/${id}/cancel`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to cancel");
      toast.success("Purchase order cancelled");
      load();
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setActioning(null);
    }
  }

  if (loading) return <div className="flex justify-center py-16"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>;
  if (!po) return <div className="p-8 text-center text-muted-foreground">Purchase order not found. <Link href="/dashboard/procurement" className="underline">Back</Link></div>;

  const canApprove = po.status === "DRAFT";
  const canReceive = ["APPROVED", "PARTIALLY_RECEIVED"].includes(po.status);
  const canCancel = ["DRAFT", "APPROVED"].includes(po.status);
  const hasUnreceivedLines = po.lines?.some((l: any) => Number(l.quantity) > Number(l.qtyReceived || 0));

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" asChild>
            <Link href="/dashboard/procurement"><ArrowLeft className="w-4 h-4" /></Link>
          </Button>
          <div>
            <h1 className="text-2xl font-bold">{po.poNumber}</h1>
            <p className="text-muted-foreground">{po.supplier?.name}</p>
          </div>
          <Badge variant="secondary" className={statusColors[po.status] || ""}>{po.status}</Badge>
        </div>
        <div className="flex gap-2">
          {canApprove && (
            <Button size="sm" onClick={handleApprove} disabled={actioning === "approve"}>
              {actioning === "approve" ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <CheckCircle2 className="w-4 h-4 mr-2" />}
              Approve
            </Button>
          )}
          {canReceive && hasUnreceivedLines && (
            <Button size="sm" variant="outline" onClick={openReceive}>
              <PackageCheck className="w-4 h-4 mr-2" />Receive Goods
            </Button>
          )}
          {canCancel && (
            <Button size="sm" variant="destructive" onClick={handleCancel} disabled={actioning === "cancel"}>
              {actioning === "cancel" ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <XCircle className="w-4 h-4 mr-2" />}
              Cancel
            </Button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: "Order Date", value: fmtDate(po.orderDate), icon: Calendar },
          { label: "Expected", value: fmtDate(po.expectedDate), icon: Calendar },
          { label: "Supplier", value: po.supplier?.name || "-", icon: Building2 },
          { label: "Total Amount", value: `$${fmt(Number(po.totalAmount))}`, icon: FileText },
        ].map(({ label, value, icon: Icon }) => (
          <Card key={label}>
            <CardContent className="pt-5">
              <div className="flex items-center gap-2 text-muted-foreground text-xs mb-1"><Icon className="w-3.5 h-3.5" />{label}</div>
              <p className="font-semibold text-sm">{value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader><CardTitle>Order Lines</CardTitle></CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>#</TableHead>
                <TableHead>Description</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Inventory Link</TableHead>
                <TableHead className="text-right">Qty Ordered</TableHead>
                <TableHead className="text-right">Qty Received</TableHead>
                <TableHead className="text-right">Unit Price</TableHead>
                <TableHead className="text-right">Amount</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {po.lines?.map((l: any, i: number) => {
                const remaining = Number(l.quantity) - Number(l.qtyReceived || 0);
                const brokenInventoryLink = l.itemType === "INVENTORY" && !l.inventoryItemId;
                return (
                  <TableRow key={l.id} className={brokenInventoryLink ? "bg-red-50" : ""}>
                    <TableCell>{i + 1}</TableCell>
                    <TableCell>{l.description}</TableCell>
                    <TableCell><Badge variant="outline" className="text-xs">{l.itemType}</Badge></TableCell>
                    <TableCell>
                      {l.itemType === "INVENTORY" ? (
                        l.inventoryItem ? (
                          <div>
                            <div className="font-medium">{l.inventoryItem.name}</div>
                            <div className="text-xs text-muted-foreground">{l.inventoryItem.code}</div>
                          </div>
                        ) : (
                          <Badge variant="destructive">Missing inventory link</Badge>
                        )
                      ) : (
                        <span className="text-muted-foreground">-</span>
                      )}
                    </TableCell>
                    <TableCell className="text-right font-mono">{Number(l.quantity).toFixed(2)}</TableCell>
                    <TableCell className="text-right font-mono">
                      <span className={remaining > 0 ? "text-orange-600" : "text-green-600"}>
                        {Number(l.qtyReceived || 0).toFixed(2)}
                      </span>
                    </TableCell>
                    <TableCell className="text-right font-mono">{fmt(Number(l.unitPrice))}</TableCell>
                    <TableCell className="text-right font-mono">{fmt(Number(l.amount))}</TableCell>
                  </TableRow>
                );
              })}
              <TableRow className="font-bold bg-muted/30">
                <TableCell colSpan={7} className="text-right">Total</TableCell>
                <TableCell className="text-right font-mono">${fmt(Number(po.totalAmount))}</TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {grns.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Goods Received Notes</CardTitle>
            <CardDescription>{grns.length} GRN(s) against this order</CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>GRN Number</TableHead>
                  <TableHead>Received Date</TableHead>
                  <TableHead>Delivery Ref</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {grns.map((g: any) => (
                  <TableRow key={g.id}>
                    <TableCell className="font-medium">{g.grnNumber}</TableCell>
                    <TableCell>{fmtDate(g.receivedDate)}</TableCell>
                    <TableCell>{g.deliveryNoteRef || "-"}</TableCell>
                    <TableCell><Badge variant="secondary">{g.status}</Badge></TableCell>
                    <TableCell className="text-right">
                      <Button variant="ghost" size="sm" asChild>
                        <Link href={`/dashboard/procurement/grn/${g.id}`}>View</Link>
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {po.notes && (
        <Card>
          <CardHeader><CardTitle className="text-sm">Notes</CardTitle></CardHeader>
          <CardContent><p className="text-sm text-muted-foreground">{po.notes}</p></CardContent>
        </Card>
      )}

      <Dialog open={receiveOpen} onOpenChange={setReceiveOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Receive Goods — {po.poNumber}</DialogTitle>
            <DialogDescription>Record quantities received against this purchase order.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Received Date</Label>
                <Input type="date" value={receiveForm.receivedDate}
                  onChange={(e) => setReceiveForm((f) => ({ ...f, receivedDate: e.target.value }))} className="mt-1" />
              </div>
              <div>
                <Label>Delivery Note Ref</Label>
                <Input placeholder="DN-12345" value={receiveForm.deliveryNoteRef}
                  onChange={(e) => setReceiveForm((f) => ({ ...f, deliveryNoteRef: e.target.value }))} className="mt-1" />
              </div>
            </div>
            <div>
              <Label>Inspection Notes</Label>
              <Input placeholder="Optional inspection notes..." value={receiveForm.inspectionNotes}
                onChange={(e) => setReceiveForm((f) => ({ ...f, inspectionNotes: e.target.value }))} className="mt-1" />
            </div>
            <Separator />
            <p className="text-sm font-medium">Lines to Receive</p>
            <div className="space-y-3">
              {receiveForm.lines.map((line, idx) => (
                <div key={line.poLineId} className="border rounded-lg p-3 space-y-2">
                  <p className="text-sm font-medium">{line.description}</p>
                  <p className="text-xs text-muted-foreground">
                    Ordered: {line.ordered} | Already received: {line.alreadyReceived} | Outstanding: {(line.ordered - line.alreadyReceived).toFixed(2)}
                  </p>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <Label className="text-xs">Qty Delivered</Label>
                      <Input type="number" min="0" max={line.ordered - line.alreadyReceived}
                        value={line.qtyDelivered}
                        onChange={(e) => {
                          const lines = [...receiveForm.lines];
                          lines[idx] = { ...lines[idx], qtyDelivered: e.target.value, qtyAccepted: e.target.value };
                          setReceiveForm((f) => ({ ...f, lines }));
                        }} className="mt-1" />
                    </div>
                    <div>
                      <Label className="text-xs">Qty Accepted</Label>
                      <Input type="number" min="0" max={parseFloat(line.qtyDelivered) || 0}
                        value={line.qtyAccepted}
                        onChange={(e) => {
                          const lines = [...receiveForm.lines];
                          lines[idx] = { ...lines[idx], qtyAccepted: e.target.value };
                          setReceiveForm((f) => ({ ...f, lines }));
                        }} className="mt-1" />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setReceiveOpen(false)}>Cancel</Button>
            <Button onClick={submitReceive} disabled={actioning === "receive"}>
              {actioning === "receive" ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <PackageCheck className="w-4 h-4 mr-2" />}
              Confirm Receipt
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
