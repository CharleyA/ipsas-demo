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
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import {
  ArrowLeft, Loader2, Package, Calendar, DollarSign, MapPin, User, Tag,
  BarChart2, Trash2, Pencil, X, Check, ArrowRightLeft, FileX,
} from "lucide-react";
import { toast } from "sonner";

const statusColors: Record<string, string> = {
  ACTIVE: "bg-green-100 text-green-800",
  DISPOSED: "bg-red-100 text-red-800",
  WRITTEN_OFF: "bg-gray-100 text-gray-700",
  UNDER_MAINTENANCE: "bg-yellow-100 text-yellow-800",
};

const fmt = (n: number) =>
  new Intl.NumberFormat("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(n);
const fmtDate = (d: string | null | undefined) =>
  d ? new Date(d).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" }) : "-";

interface Asset {
  id: string;
  assetNumber: string;
  description: string;
  status: string;
  acquisitionDate: string;
  acquisitionCost: number;
  netBookValue: number;
  residualValue: number;
  location: string | null;
  custodian: string | null;
  serialNumber: string | null;
  notes: string | null;
  category: {
    id: string; name: string; depreciationMethod: string;
    usefulLifeMonths: number; residualValuePercent: number;
  } | null;
  depreciationEntries: {
    id: string; depreciationDate: string; amount: number;
    accumulatedDepreciation: number; netBookValue: number;
  }[];
}

export default function AssetDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [asset, setAsset] = useState<Asset | null>(null);
  const [loading, setLoading] = useState(true);
  const [actioning, setActioning] = useState<string | null>(null);

  // Edit state
  const [editing, setEditing] = useState(false);
  const [editForm, setEditForm] = useState({ description: "", serialNumber: "", location: "", custodian: "", notes: "" });

  // Dispose dialog
  const [disposeOpen, setDisposeOpen] = useState(false);
  const [disposeForm, setDisposeForm] = useState({ disposalDate: new Date().toISOString().split("T")[0], disposalAmount: "", disposalNotes: "" });

  // Write-off dialog
  const [writeOffOpen, setWriteOffOpen] = useState(false);
  const [writeOffForm, setWriteOffForm] = useState({ writeOffDate: new Date().toISOString().split("T")[0], reason: "" });

  // Transfer dialog
  const [transferOpen, setTransferOpen] = useState(false);
  const [transferForm, setTransferForm] = useState({ location: "", custodian: "", notes: "" });

  useEffect(() => {
    fetch(`/api/assets/register/${id}`)
      .then((r) => r.json())
      .then((data) => {
        if (data.error) throw new Error(data.error);
        setAsset(data);
      })
      .catch((e) => toast.error(e.message || "Failed to load asset"))
      .finally(() => setLoading(false));
  }, [id]);

  function startEdit() {
    if (!asset) return;
    setEditForm({
      description: asset.description || "", serialNumber: asset.serialNumber || "",
      location: asset.location || "", custodian: asset.custodian || "", notes: asset.notes || "",
    });
    setEditing(true);
  }

  async function saveEdit() {
    setActioning("save");
    try {
      const res = await fetch(`/api/assets/register/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          description: editForm.description,
          serialNumber: editForm.serialNumber || null,
          location: editForm.location || null,
          custodian: editForm.custodian || null,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to save");
      setAsset((prev) => prev ? { ...prev, ...data } : prev);
      setEditing(false);
      toast.success("Asset updated");
    } catch (e: any) { toast.error(e.message); }
    finally { setActioning(null); }
  }

  async function handleDispose() {
    setActioning("dispose");
    try {
      const res = await fetch(`/api/assets/register/${id}/dispose`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          disposalDate: disposeForm.disposalDate,
          disposalAmount: parseFloat(disposeForm.disposalAmount) || 0,
          disposalNotes: disposeForm.disposalNotes || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to dispose asset");
      toast.success("Asset disposed successfully");
      router.push("/dashboard/assets/register");
    } catch (e: any) { toast.error(e.message); }
    finally { setActioning(null); }
  }

  async function handleWriteOff() {
    setActioning("writeoff");
    try {
      const res = await fetch(`/api/assets/register/${id}/write-off`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ writeOffDate: writeOffForm.writeOffDate, reason: writeOffForm.reason }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to write off asset");
      toast.success("Asset written off");
      router.push("/dashboard/assets/register");
    } catch (e: any) { toast.error(e.message); }
    finally { setActioning(null); }
  }

  async function handleTransfer() {
    setActioning("transfer");
    try {
      const res = await fetch(`/api/assets/register/${id}/transfer`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          location: transferForm.location || undefined,
          custodian: transferForm.custodian || undefined,
          notes: transferForm.notes || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to transfer asset");
      setAsset((prev) => prev ? { ...prev, location: data.location, custodian: data.custodian } : prev);
      setTransferOpen(false);
      toast.success("Asset transferred successfully");
    } catch (e: any) { toast.error(e.message); }
    finally { setActioning(null); }
  }

  function openTransfer() {
    if (!asset) return;
    setTransferForm({ location: asset.location || "", custodian: asset.custodian || "", notes: "" });
    setTransferOpen(true);
  }

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <Loader2 className="w-8 h-8 animate-spin text-primary" />
    </div>
  );

  if (!asset) return (
    <div className="p-8 text-center text-muted-foreground">
      Asset not found.{" "}
      <Link href="/dashboard/assets/register" className="underline">Back to register</Link>
    </div>
  );

  const accumulated = Number(asset.acquisitionCost) - Number(asset.netBookValue);
  const depreciationPct = Number(asset.acquisitionCost) > 0
    ? (accumulated / Number(asset.acquisitionCost)) * 100 : 0;

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" asChild>
            <Link href="/dashboard/assets/register"><ArrowLeft className="w-4 h-4" /></Link>
          </Button>
          <div>
            <h1 className="text-2xl font-bold">{asset.assetNumber}</h1>
            <p className="text-muted-foreground">{asset.description}</p>
          </div>
          <Badge variant="secondary" className={statusColors[asset.status] || ""}>{asset.status}</Badge>
        </div>
        {asset.status === "ACTIVE" && (
          <div className="flex items-center gap-2">
            {!editing && (
              <Button variant="outline" size="sm" onClick={startEdit}>
                <Pencil className="w-4 h-4 mr-2" />Edit
              </Button>
            )}
            <Button variant="outline" size="sm" onClick={openTransfer}>
              <ArrowRightLeft className="w-4 h-4 mr-2" />Transfer
            </Button>
            <Button variant="outline" size="sm" className="text-orange-600 border-orange-200 hover:bg-orange-50"
              onClick={() => { setWriteOffForm({ writeOffDate: new Date().toISOString().split("T")[0], reason: "" }); setWriteOffOpen(true); }}>
              <FileX className="w-4 h-4 mr-2" />Write Off
            </Button>
            <Button variant="destructive" size="sm"
              onClick={() => { setDisposeForm({ disposalDate: new Date().toISOString().split("T")[0], disposalAmount: String(Number(asset.netBookValue)), disposalNotes: "" }); setDisposeOpen(true); }}>
              <Trash2 className="w-4 h-4 mr-2" />Dispose
            </Button>
          </div>
        )}
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card><CardContent className="pt-6">
          <div className="flex items-center gap-2 text-muted-foreground text-sm mb-1"><DollarSign className="w-4 h-4" />Acquisition Cost</div>
          <p className="text-xl font-bold font-mono">{fmt(Number(asset.acquisitionCost))}</p>
        </CardContent></Card>
        <Card><CardContent className="pt-6">
          <div className="flex items-center gap-2 text-muted-foreground text-sm mb-1"><BarChart2 className="w-4 h-4" />Net Book Value</div>
          <p className="text-xl font-bold font-mono text-blue-600">{fmt(Number(asset.netBookValue))}</p>
        </CardContent></Card>
        <Card><CardContent className="pt-6">
          <div className="flex items-center gap-2 text-muted-foreground text-sm mb-1"><BarChart2 className="w-4 h-4" />Accumulated Depreciation</div>
          <p className="text-xl font-bold font-mono text-red-600">{fmt(accumulated)}</p>
        </CardContent></Card>
        <Card><CardContent className="pt-6">
          <div className="flex items-center gap-2 text-muted-foreground text-sm mb-1"><BarChart2 className="w-4 h-4" />Depreciated</div>
          <p className="text-xl font-bold">{depreciationPct.toFixed(1)}%</p>
          <div className="w-full bg-muted rounded-full h-1.5 mt-2">
            <div className="bg-primary h-1.5 rounded-full" style={{ width: `${Math.min(depreciationPct, 100)}%` }} />
          </div>
        </CardContent></Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Asset Details — view or edit */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
            <CardTitle className="flex items-center gap-2"><Package className="w-5 h-5" />Asset Details</CardTitle>
            {editing && (
              <div className="flex gap-2">
                <Button variant="ghost" size="sm" onClick={() => setEditing(false)} disabled={actioning === "save"}>
                  <X className="w-4 h-4 mr-1" />Cancel
                </Button>
                <Button size="sm" onClick={saveEdit} disabled={actioning === "save"}>
                  {actioning === "save" ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : <Check className="w-4 h-4 mr-1" />}Save
                </Button>
              </div>
            )}
          </CardHeader>
          <CardContent>
            {editing ? (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4 text-sm pb-3 border-b">
                  <div><p className="text-muted-foreground text-xs mb-1"><Tag className="w-3 h-3 inline mr-1" />Asset Number</p><p className="font-medium">{asset.assetNumber}</p></div>
                  <div><p className="text-muted-foreground text-xs mb-1"><Calendar className="w-3 h-3 inline mr-1" />Acquisition Date</p><p className="font-medium">{fmtDate(asset.acquisitionDate)}</p></div>
                  <div><p className="text-muted-foreground text-xs mb-1">Category</p><p className="font-medium">{asset.category?.name || "-"}</p></div>
                </div>
                <div className="space-y-3">
                  <div><Label>Description</Label><Input value={editForm.description} onChange={(e) => setEditForm((f) => ({ ...f, description: e.target.value }))} className="mt-1" /></div>
                  <div><Label>Serial Number</Label><Input value={editForm.serialNumber} onChange={(e) => setEditForm((f) => ({ ...f, serialNumber: e.target.value }))} placeholder="Optional" className="mt-1" /></div>
                  <div><Label>Location</Label><Input value={editForm.location} onChange={(e) => setEditForm((f) => ({ ...f, location: e.target.value }))} placeholder="e.g. Main Office, Block A" className="mt-1" /></div>
                  <div><Label>Custodian</Label><Input value={editForm.custodian} onChange={(e) => setEditForm((f) => ({ ...f, custodian: e.target.value }))} placeholder="Name of responsible person" className="mt-1" /></div>
                  <div><Label>Notes</Label><Textarea value={editForm.notes} onChange={(e) => setEditForm((f) => ({ ...f, notes: e.target.value }))} placeholder="Any additional notes..." className="mt-1" rows={3} /></div>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4 text-sm">
                  {[
                    [<Tag className="w-3 h-3" />, "Asset Number", asset.assetNumber],
                    [<Tag className="w-3 h-3" />, "Serial Number", asset.serialNumber || "-"],
                    [<Calendar className="w-3 h-3" />, "Acquisition Date", fmtDate(asset.acquisitionDate)],
                    [<Tag className="w-3 h-3" />, "Category", asset.category?.name || "-"],
                    [<MapPin className="w-3 h-3" />, "Location", asset.location || "-"],
                    [<User className="w-3 h-3" />, "Custodian", asset.custodian || "-"],
                  ].map(([icon, label, value]) => (
                    <div key={String(label)}>
                      <p className="text-muted-foreground flex items-center gap-1 text-xs">{icon}{label}</p>
                      <p className="font-medium mt-0.5 text-sm">{String(value)}</p>
                    </div>
                  ))}
                </div>
                {asset.notes && (<><Separator /><div><p className="text-muted-foreground text-sm mb-1">Notes</p><p className="text-sm">{asset.notes}</p></div></>)}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Depreciation Policy */}
        {asset.category && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2"><BarChart2 className="w-5 h-5" />Depreciation Policy</CardTitle>
              <CardDescription>{asset.category.name}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              {[
                ["Method", asset.category.depreciationMethod?.replace("_", " ") || "-"],
                ["Useful Life", `${asset.category.usefulLifeMonths} months`],
                ["Residual Value %", `${asset.category.residualValuePercent}%`],
                ["Residual Value", fmt(Number(asset.residualValue || 0))],
                ["Depreciable Amount", fmt(Number(asset.acquisitionCost) - Number(asset.residualValue || 0))],
              ].map(([label, value], i, arr) => (
                <div key={String(label)}>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">{label}</span>
                    <span className="font-medium font-mono">{String(value)}</span>
                  </div>
                  {i < arr.length - 1 && <Separator className="mt-3" />}
                </div>
              ))}
            </CardContent>
          </Card>
        )}
      </div>

      {/* Depreciation History */}
      <Card>
        <CardHeader>
          <CardTitle>Depreciation History</CardTitle>
          <CardDescription>{asset.depreciationEntries.length} entries recorded</CardDescription>
        </CardHeader>
        <CardContent>
          {asset.depreciationEntries.length === 0 ? (
            <p className="text-center py-6 text-muted-foreground text-sm">No depreciation entries yet.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Period</TableHead>
                  <TableHead className="text-right">Depreciation</TableHead>
                  <TableHead className="text-right">Accumulated</TableHead>
                  <TableHead className="text-right">Net Book Value</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {asset.depreciationEntries.map((e) => (
                  <TableRow key={e.id}>
                    <TableCell>{fmtDate(e.depreciationDate)}</TableCell>
                    <TableCell className="text-right font-mono">{fmt(Number(e.amount))}</TableCell>
                    <TableCell className="text-right font-mono">{fmt(Number(e.accumulatedDepreciation))}</TableCell>
                    <TableCell className="text-right font-mono">{fmt(Number(e.netBookValue))}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Dispose Dialog */}
      <Dialog open={disposeOpen} onOpenChange={setDisposeOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Dispose Asset — {asset.assetNumber}</DialogTitle>
            <DialogDescription>Record the disposal of this asset. This action cannot be undone.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div><Label>Disposal Date</Label><Input type="date" value={disposeForm.disposalDate} onChange={(e) => setDisposeForm((f) => ({ ...f, disposalDate: e.target.value }))} className="mt-1" /></div>
            <div><Label>Disposal Proceeds ($)</Label><Input type="number" min="0" step="0.01" value={disposeForm.disposalAmount} onChange={(e) => setDisposeForm((f) => ({ ...f, disposalAmount: e.target.value }))} placeholder="0.00 if scrapped" className="mt-1" /></div>
            <div><Label>Notes</Label><Textarea value={disposeForm.disposalNotes} onChange={(e) => setDisposeForm((f) => ({ ...f, disposalNotes: e.target.value }))} placeholder="Disposal reason, buyer, etc." className="mt-1" rows={2} /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDisposeOpen(false)}>Cancel</Button>
            <Button variant="destructive" onClick={handleDispose} disabled={actioning === "dispose"}>
              {actioning === "dispose" ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Trash2 className="w-4 h-4 mr-2" />}Confirm Disposal
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Write-Off Dialog */}
      <Dialog open={writeOffOpen} onOpenChange={setWriteOffOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Write Off Asset — {asset.assetNumber}</DialogTitle>
            <DialogDescription>Write off this asset at its current net book value of <strong>${fmt(Number(asset.netBookValue))}</strong>. This is different from disposal — no proceeds are received.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div><Label>Write-Off Date</Label><Input type="date" value={writeOffForm.writeOffDate} onChange={(e) => setWriteOffForm((f) => ({ ...f, writeOffDate: e.target.value }))} className="mt-1" /></div>
            <div><Label>Reason</Label><Textarea value={writeOffForm.reason} onChange={(e) => setWriteOffForm((f) => ({ ...f, reason: e.target.value }))} placeholder="e.g. Damaged beyond repair, obsolete, lost..." className="mt-1" rows={2} /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setWriteOffOpen(false)}>Cancel</Button>
            <Button className="bg-orange-600 hover:bg-orange-700 text-white" onClick={handleWriteOff} disabled={actioning === "writeoff"}>
              {actioning === "writeoff" ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <FileX className="w-4 h-4 mr-2" />}Confirm Write-Off
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Transfer Dialog */}
      <Dialog open={transferOpen} onOpenChange={setTransferOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Transfer Asset — {asset.assetNumber}</DialogTitle>
            <DialogDescription>Update the location and/or custodian. A transfer log entry will be recorded in the audit trail.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <p className="text-xs text-muted-foreground mb-3">Current: <span className="font-medium">{asset.location || "No location"}</span> · <span className="font-medium">{asset.custodian || "No custodian"}</span></p>
            </div>
            <div><Label>New Location</Label><Input value={transferForm.location} onChange={(e) => setTransferForm((f) => ({ ...f, location: e.target.value }))} placeholder="e.g. Block B, Room 204" className="mt-1" /></div>
            <div><Label>New Custodian</Label><Input value={transferForm.custodian} onChange={(e) => setTransferForm((f) => ({ ...f, custodian: e.target.value }))} placeholder="Name of new responsible person" className="mt-1" /></div>
            <div><Label>Transfer Notes</Label><Input value={transferForm.notes} onChange={(e) => setTransferForm((f) => ({ ...f, notes: e.target.value }))} placeholder="Reason for transfer (optional)" className="mt-1" /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setTransferOpen(false)}>Cancel</Button>
            <Button onClick={handleTransfer} disabled={actioning === "transfer"}>
              {actioning === "transfer" ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <ArrowRightLeft className="w-4 h-4 mr-2" />}Confirm Transfer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
