"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { ArrowLeft, Loader2, Package, ArrowUpDown, AlertTriangle, Pencil, X, Check } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/components/providers/auth-provider";
import { TablePagination, usePagination } from "@/components/ui/table-pagination";

export default function InventoryItemDetailPage() {
  const { token } = useAuth();
  const params = useParams();
  const router = useRouter();
  const [item, setItem] = useState<any>(null);
  const [movements, setMovements] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ name: "", unitOfMeasure: "", reorderLevel: "" });
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);

  const fetchItem = async () => {
    setIsLoading(true);
    try {
      const [itemRes, movRes] = await Promise.all([
        fetch(`/api/inventory/items/${params.id}`, { headers: { Authorization: `Bearer ${token}` } }),
        fetch(`/api/inventory/movements?itemId=${params.id}`, { headers: { Authorization: `Bearer ${token}` } }),
      ]);
      const itemData = await itemRes.json();
      const movData = await movRes.json();
      if (!itemRes.ok) { toast.error("Item not found"); router.push("/dashboard/inventory"); return; }
      setItem(itemData);
      setMovements(Array.isArray(movData) ? movData : []);
    } catch {
      toast.error("Failed to fetch item details");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => { if (token && params.id) fetchItem(); }, [token, params.id]);

  function startEdit() {
    if (!item) return;
    setForm({
      name: item.name || "",
      unitOfMeasure: item.unitOfMeasure || "",
      reorderLevel: item.reorderLevel != null ? String(item.reorderLevel) : "",
    });
    setEditing(true);
  }

  async function saveEdit() {
    setSaving(true);
    try {
      const res = await fetch(`/api/inventory/items/${params.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          name: form.name,
          unitOfMeasure: form.unitOfMeasure,
          reorderLevel: form.reorderLevel ? parseFloat(form.reorderLevel) : null,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to save");
      setItem((prev: any) => ({ ...prev, ...data }));
      setEditing(false);
      toast.success("Item updated successfully");
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setSaving(false);
    }
  }

  const fmt = (n: number) => new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(n);
  const fmtDate = (d: string) => d ? new Date(d).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" }) : "-";

  const movementColors: Record<string, string> = {
    RECEIPT: "bg-green-100 text-green-800",
    ISSUE: "bg-red-100 text-red-800",
    ADJUSTMENT_IN: "bg-blue-100 text-blue-800",
    ADJUSTMENT_OUT: "bg-orange-100 text-orange-800",
    RETURN_TO_SUPPLIER: "bg-purple-100 text-purple-800",
    OPENING_BALANCE: "bg-gray-100 text-gray-700",
  };

  const pagedMovements = usePagination(movements, pageSize, page);

  if (isLoading) return <div className="flex justify-center py-16"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>;
  if (!item) return null;

  const qty = Number(item.quantityOnHand);
  const isLow = item.reorderLevel && qty <= Number(item.reorderLevel);

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" asChild>
            <Link href="/dashboard/inventory"><ArrowLeft className="w-4 h-4" /></Link>
          </Button>
          <div>
            <h1 className="text-2xl font-bold">{item.name}</h1>
            <p className="text-muted-foreground">Code: {item.code} · {item.category?.name}</p>
          </div>
          {isLow && (
            <Badge variant="destructive" className="gap-1">
              <AlertTriangle className="w-3 h-3" /> Low Stock
            </Badge>
          )}
        </div>
        <div className="flex gap-2">
          {!editing && (
            <Button variant="outline" size="sm" onClick={startEdit}>
              <Pencil className="w-4 h-4 mr-2" />Edit
            </Button>
          )}
          <Button size="sm" asChild>
            <Link href={`/dashboard/inventory/issue?itemId=${item.id}`}>
              <ArrowUpDown className="w-4 h-4 mr-2" />Issue Stock
            </Link>
          </Button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm font-medium">Qty on Hand</CardTitle></CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${isLow ? "text-red-600" : ""}`}>{qty.toFixed(2)}</div>
            <p className="text-xs text-muted-foreground">{item.unitOfMeasure}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm font-medium">Average Cost</CardTitle></CardHeader>
          <CardContent><div className="text-2xl font-bold">{fmt(Number(item.averageCost || 0))}</div></CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm font-medium">Stock Value</CardTitle></CardHeader>
          <CardContent><div className="text-2xl font-bold">{fmt(qty * Number(item.averageCost || 0))}</div></CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm font-medium">Reorder Level</CardTitle></CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${isLow ? "text-red-600" : ""}`}>{item.reorderLevel || "-"}</div>
            {isLow && <p className="text-xs text-red-600 mt-1">Below reorder level!</p>}
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Item Details — view or edit */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
            <CardTitle className="flex items-center gap-2"><Package className="w-5 h-5" />Item Details</CardTitle>
            {editing && (
              <div className="flex gap-2">
                <Button variant="ghost" size="sm" onClick={() => setEditing(false)} disabled={saving}>
                  <X className="w-4 h-4 mr-1" />Cancel
                </Button>
                <Button size="sm" onClick={saveEdit} disabled={saving}>
                  {saving ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : <Check className="w-4 h-4 mr-1" />}Save
                </Button>
              </div>
            )}
          </CardHeader>
          <CardContent>
            {editing ? (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4 text-sm pb-3 border-b">
                  <div>
                    <p className="text-muted-foreground text-xs">Item Code</p>
                    <p className="font-medium">{item.code}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground text-xs">Category</p>
                    <p className="font-medium">{item.category?.name || "-"}</p>
                  </div>
                </div>
                <div>
                  <Label htmlFor="name">Name</Label>
                  <Input id="name" value={form.name}
                    onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} className="mt-1" />
                </div>
                <div>
                  <Label htmlFor="uom">Unit of Measure</Label>
                  <Input id="uom" value={form.unitOfMeasure}
                    onChange={(e) => setForm((f) => ({ ...f, unitOfMeasure: e.target.value }))}
                    placeholder="e.g. EACH, KG, LITRE" className="mt-1" />
                </div>
                <div>
                  <Label htmlFor="reorder">Reorder Level</Label>
                  <Input id="reorder" type="number" min="0" value={form.reorderLevel}
                    onChange={(e) => setForm((f) => ({ ...f, reorderLevel: e.target.value }))}
                    placeholder="Minimum stock quantity" className="mt-1" />
                </div>
              </div>
            ) : (
              <div className="space-y-0">
                {[
                  ["Item Code", item.code],
                  ["Name", item.name],
                  ["Category", item.category?.name || "-"],
                  ["Unit of Measure", item.unitOfMeasure],
                  ["Reorder Level", item.reorderLevel ?? "-"],
                  ["Last Purchase Price", item.lastPurchasePrice != null ? fmt(Number(item.lastPurchasePrice)) : "-"],
                  ["Status", item.isActive ? "Active" : "Inactive"],
                ].map(([label, value]) => (
                  <div key={String(label)} className="flex justify-between py-2 border-b last:border-0 text-sm">
                    <span className="text-muted-foreground">{label}</span>
                    <span className="font-medium">{String(value)}</span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>Quick Actions</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <Button asChild className="w-full">
              <Link href={`/dashboard/inventory/issue?itemId=${item.id}`}>
                <ArrowUpDown className="w-4 h-4 mr-2" />Issue Stock
              </Link>
            </Button>
            <Button asChild variant="outline" className="w-full">
              <Link href="/dashboard/inventory/movements">View All Movements</Link>
            </Button>
            <Separator />
            <p className="text-xs text-muted-foreground">Stock Levels</p>
            <div className="space-y-1">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">On Hand</span>
                <span className={`font-mono font-medium ${isLow ? "text-red-600" : "text-green-600"}`}>{qty.toFixed(2)}</span>
              </div>
              {item.reorderLevel && (
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Reorder Level</span>
                  <span className="font-mono">{Number(item.reorderLevel).toFixed(2)}</span>
                </div>
              )}
              {qty > 0 && item.reorderLevel && (
                <div className="w-full bg-muted rounded-full h-1.5 mt-2">
                  <div
                    className={`h-1.5 rounded-full ${isLow ? "bg-red-500" : "bg-green-500"}`}
                    style={{ width: `${Math.min((qty / Number(item.reorderLevel)) * 50, 100)}%` }}
                  />
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Movement History */}
      <Card>
        <CardHeader>
          <CardTitle>Stock Movement History</CardTitle>
          <CardDescription>{movements.length} movements recorded</CardDescription>
        </CardHeader>
        <CardContent>
          {movements.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">No movements recorded for this item.</div>
          ) : (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Issued To / Notes</TableHead>
                    <TableHead className="text-right">Qty</TableHead>
                    <TableHead className="text-right">Unit Cost</TableHead>
                    <TableHead className="text-right">Balance Qty</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {pagedMovements.map((m) => {
                    const isIn = ["RECEIPT", "ADJUSTMENT_IN", "OPENING_BALANCE"].includes(m.movementType);
                    return (
                      <TableRow key={m.id}>
                        <TableCell>{fmtDate(m.movementDate || m.createdAt)}</TableCell>
                        <TableCell>
                          <Badge variant="secondary" className={movementColors[m.movementType] || ""}>
                            {m.movementType?.replace(/_/g, " ")}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {m.issuedTo || m.notes || "-"}
                        </TableCell>
                        <TableCell className={`text-right font-mono ${isIn ? "text-green-600" : "text-red-600"}`}>
                          {isIn ? "+" : "-"}{Math.abs(Number(m.quantity)).toFixed(2)}
                        </TableCell>
                        <TableCell className="text-right font-mono">{fmt(Number(m.unitCost || 0))}</TableCell>
                        <TableCell className="text-right font-mono">{Number(m.balanceQty || 0).toFixed(2)}</TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
              <TablePagination total={movements.length} page={page} pageSize={pageSize}
                onPageChange={setPage} onPageSizeChange={setPageSize} />
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
