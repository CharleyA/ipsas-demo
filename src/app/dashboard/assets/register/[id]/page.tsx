"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import {
  ArrowLeft,
  Loader2,
  Package,
  Calendar,
  DollarSign,
  MapPin,
  User,
  Tag,
  BarChart2,
  Trash2,
  Pencil,
  X,
  Check,
} from "lucide-react";
import { toast } from "sonner";

const statusColors: Record<string, string> = {
  ACTIVE: "bg-green-100 text-green-800",
  DISPOSED: "bg-red-100 text-red-800",
  WRITTEN_OFF: "bg-gray-100 text-gray-700",
  UNDER_MAINTENANCE: "bg-yellow-100 text-yellow-800",
};

function fmt(n: number) {
  return new Intl.NumberFormat("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(n);
}
function fmtDate(d: string | null | undefined) {
  if (!d) return "-";
  return new Date(d).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
}

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
    id: string;
    name: string;
    depreciationMethod: string;
    usefulLifeMonths: number;
    residualValuePercent: number;
  } | null;
  depreciationEntries: {
    id: string;
    depreciationDate: string;
    amount: number;
    accumulatedDepreciation: number;
    netBookValue: number;
  }[];
}

interface EditForm {
  description: string;
  serialNumber: string;
  location: string;
  custodian: string;
  notes: string;
}

export default function AssetDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [asset, setAsset] = useState<Asset | null>(null);
  const [loading, setLoading] = useState(true);
  const [disposing, setDisposing] = useState(false);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState<EditForm>({
    description: "",
    serialNumber: "",
    location: "",
    custodian: "",
    notes: "",
  });

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
    setForm({
      description: asset.description || "",
      serialNumber: asset.serialNumber || "",
      location: asset.location || "",
      custodian: asset.custodian || "",
      notes: asset.notes || "",
    });
    setEditing(true);
  }

  function cancelEdit() {
    setEditing(false);
  }

  async function saveEdit() {
    setSaving(true);
    try {
      const res = await fetch(`/api/assets/register/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          description: form.description,
          serialNumber: form.serialNumber || null,
          location: form.location || null,
          custodian: form.custodian || null,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to save");
      setAsset((prev) => prev ? { ...prev, ...data } : prev);
      setEditing(false);
      toast.success("Asset updated successfully");
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setSaving(false);
    }
  }

  async function handleDispose() {
    if (!confirm("Are you sure you want to dispose of this asset? This cannot be undone.")) return;
    setDisposing(true);
    try {
      const res = await fetch(`/api/assets/register/${id}/dispose`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ disposalDate: new Date().toISOString() }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to dispose asset");
      toast.success("Asset disposed successfully");
      router.push("/dashboard/assets/register");
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setDisposing(false);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!asset) {
    return (
      <div className="p-8 text-center text-muted-foreground">
        Asset not found.{" "}
        <Link href="/dashboard/assets/register" className="underline">
          Back to register
        </Link>
      </div>
    );
  }

  const accumulated = Number(asset.acquisitionCost) - Number(asset.netBookValue);
  const depreciationPct = Number(asset.acquisitionCost) > 0
    ? (accumulated / Number(asset.acquisitionCost)) * 100
    : 0;

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
          <Badge variant="secondary" className={statusColors[asset.status] || ""}>
            {asset.status}
          </Badge>
        </div>
        <div className="flex items-center gap-2">
          {asset.status === "ACTIVE" && !editing && (
            <Button variant="outline" size="sm" onClick={startEdit}>
              <Pencil className="w-4 h-4 mr-2" /> Edit
            </Button>
          )}
          {asset.status === "ACTIVE" && (
            <Button variant="destructive" size="sm" onClick={handleDispose} disabled={disposing}>
              {disposing ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Trash2 className="w-4 h-4 mr-2" />}
              Dispose
            </Button>
          )}
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2 text-muted-foreground text-sm mb-1">
              <DollarSign className="w-4 h-4" /> Acquisition Cost
            </div>
            <p className="text-xl font-bold font-mono">{fmt(Number(asset.acquisitionCost))}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2 text-muted-foreground text-sm mb-1">
              <BarChart2 className="w-4 h-4" /> Net Book Value
            </div>
            <p className="text-xl font-bold font-mono text-blue-600">{fmt(Number(asset.netBookValue))}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2 text-muted-foreground text-sm mb-1">
              <BarChart2 className="w-4 h-4" /> Accumulated Depreciation
            </div>
            <p className="text-xl font-bold font-mono text-red-600">{fmt(accumulated)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2 text-muted-foreground text-sm mb-1">
              <BarChart2 className="w-4 h-4" /> Depreciated
            </div>
            <p className="text-xl font-bold">{depreciationPct.toFixed(1)}%</p>
            <div className="w-full bg-muted rounded-full h-1.5 mt-2">
              <div className="bg-primary h-1.5 rounded-full" style={{ width: `${Math.min(depreciationPct, 100)}%` }} />
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Asset Details — view or edit */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
            <CardTitle className="flex items-center gap-2">
              <Package className="w-5 h-5" /> Asset Details
            </CardTitle>
            {editing && (
              <div className="flex gap-2">
                <Button variant="ghost" size="sm" onClick={cancelEdit} disabled={saving}>
                  <X className="w-4 h-4 mr-1" /> Cancel
                </Button>
                <Button size="sm" onClick={saveEdit} disabled={saving}>
                  {saving ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : <Check className="w-4 h-4 mr-1" />}
                  Save
                </Button>
              </div>
            )}
          </CardHeader>
          <CardContent>
            {editing ? (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="text-muted-foreground flex items-center gap-1 mb-1"><Tag className="w-3 h-3" /> Asset Number</p>
                    <p className="font-medium">{asset.assetNumber}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground flex items-center gap-1 mb-1"><Calendar className="w-3 h-3" /> Acquisition Date</p>
                    <p className="font-medium">{fmtDate(asset.acquisitionDate)}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground flex items-center gap-1 mb-1"><Tag className="w-3 h-3" /> Category</p>
                    <p className="font-medium">{asset.category?.name || "-"}</p>
                  </div>
                </div>
                <Separator />
                <div className="space-y-3">
                  <div>
                    <Label htmlFor="description">Description</Label>
                    <Input
                      id="description"
                      value={form.description}
                      onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <Label htmlFor="serialNumber">Serial Number</Label>
                    <Input
                      id="serialNumber"
                      value={form.serialNumber}
                      onChange={(e) => setForm((f) => ({ ...f, serialNumber: e.target.value }))}
                      placeholder="Optional"
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <Label htmlFor="location">Location</Label>
                    <Input
                      id="location"
                      value={form.location}
                      onChange={(e) => setForm((f) => ({ ...f, location: e.target.value }))}
                      placeholder="e.g. Main Office, Block A"
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <Label htmlFor="custodian">Custodian</Label>
                    <Input
                      id="custodian"
                      value={form.custodian}
                      onChange={(e) => setForm((f) => ({ ...f, custodian: e.target.value }))}
                      placeholder="Name of responsible person"
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <Label htmlFor="notes">Notes</Label>
                    <Textarea
                      id="notes"
                      value={form.notes}
                      onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
                      placeholder="Any additional notes..."
                      className="mt-1"
                      rows={3}
                    />
                  </div>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="text-muted-foreground flex items-center gap-1"><Tag className="w-3 h-3" /> Asset Number</p>
                    <p className="font-medium mt-0.5">{asset.assetNumber}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground flex items-center gap-1"><Tag className="w-3 h-3" /> Serial Number</p>
                    <p className="font-medium mt-0.5">{asset.serialNumber || "-"}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground flex items-center gap-1"><Calendar className="w-3 h-3" /> Acquisition Date</p>
                    <p className="font-medium mt-0.5">{fmtDate(asset.acquisitionDate)}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground flex items-center gap-1"><Tag className="w-3 h-3" /> Category</p>
                    <p className="font-medium mt-0.5">{asset.category?.name || "-"}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground flex items-center gap-1"><MapPin className="w-3 h-3" /> Location</p>
                    <p className="font-medium mt-0.5">{asset.location || "-"}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground flex items-center gap-1"><User className="w-3 h-3" /> Custodian</p>
                    <p className="font-medium mt-0.5">{asset.custodian || "-"}</p>
                  </div>
                </div>
                {asset.notes && (
                  <>
                    <Separator />
                    <div>
                      <p className="text-muted-foreground text-sm mb-1">Notes</p>
                      <p className="text-sm">{asset.notes}</p>
                    </div>
                  </>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Depreciation Policy */}
        {asset.category && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BarChart2 className="w-5 h-5" /> Depreciation Policy
              </CardTitle>
              <CardDescription>{asset.category.name}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Method</span>
                <span className="font-medium">{asset.category.depreciationMethod?.replace("_", " ") || "-"}</span>
              </div>
              <Separator />
              <div className="flex justify-between">
                <span className="text-muted-foreground">Useful Life</span>
                <span className="font-medium">{asset.category.usefulLifeMonths} months</span>
              </div>
              <Separator />
              <div className="flex justify-between">
                <span className="text-muted-foreground">Residual Value %</span>
                <span className="font-medium">{asset.category.residualValuePercent}%</span>
              </div>
              <Separator />
              <div className="flex justify-between">
                <span className="text-muted-foreground">Residual Value</span>
                <span className="font-medium font-mono">{fmt(Number(asset.residualValue || 0))}</span>
              </div>
              <Separator />
              <div className="flex justify-between">
                <span className="text-muted-foreground">Depreciable Amount</span>
                <span className="font-medium font-mono">
                  {fmt(Number(asset.acquisitionCost) - Number(asset.residualValue || 0))}
                </span>
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Depreciation History */}
      <Card>
        <CardHeader>
          <CardTitle>Depreciation History</CardTitle>
          <CardDescription>
            {asset.depreciationEntries.length} entries recorded
          </CardDescription>
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
    </div>
  );
}
