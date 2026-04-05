"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Loader2, Package, ArrowUpDown, AlertTriangle } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/components/providers/auth-provider";

export default function InventoryItemDetailPage() {
  const { token } = useAuth();
  const params = useParams();
  const router = useRouter();
  const [item, setItem] = useState<any>(null);
  const [movements, setMovements] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

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

  const fmt = (n: number) => new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(n);
  const fmtDate = (d: string) => d ? new Date(d).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" }) : "-";

  const movementColors: Record<string, string> = {
    RECEIPT: "bg-green-100 text-green-800",
    ISSUE: "bg-red-100 text-red-800",
    TRANSFER: "bg-blue-100 text-blue-800",
    ADJUSTMENT: "bg-yellow-100 text-yellow-800",
  };

  if (isLoading) {
    return <div className="flex justify-center py-16"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>;
  }

  if (!item) return null;

  const qty = Number(item.quantityOnHand);
  const isLow = item.reorderLevel && qty <= Number(item.reorderLevel);

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" asChild>
          <Link href="/dashboard/inventory"><ArrowLeft className="w-4 h-4" /></Link>
        </Button>
        <div>
          <h1 className="text-3xl font-bold tracking-tight">{item.name}</h1>
          <p className="text-muted-foreground">Item Code: {item.code}</p>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm font-medium">Qty on Hand</CardTitle></CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${isLow ? "text-red-600" : ""}`}>{qty.toFixed(2)}</div>
            <p className="text-xs text-muted-foreground">{item.unitOfMeasure}</p>
            {isLow && <p className="text-xs text-red-600 flex items-center gap-1 mt-1"><AlertTriangle className="w-3 h-3" />Below reorder level</p>}
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
          <CardContent><div className="text-2xl font-bold">{item.reorderLevel || "-"}</div></CardContent>
        </Card>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader><CardTitle>Item Details</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            {[
              ["Item Code", item.code],
              ["Name", item.name],
              ["Description", item.description || "-"],
              ["Category", item.category?.name || "-"],
              ["Unit of Measure", item.unitOfMeasure],
              ["Reorder Level", item.reorderLevel || "-"],
              ["GL Account", item.account?.name || "-"],
            ].map(([label, value]) => (
              <div key={label} className="flex justify-between py-1 border-b last:border-0">
                <span className="text-sm text-muted-foreground">{label}</span>
                <span className="text-sm font-medium">{value}</span>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Quick Actions</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            <Button asChild className="w-full">
              <Link href={`/dashboard/inventory/issue?itemId=${item.id}`}>
                <ArrowUpDown className="w-4 h-4 mr-2" />Issue Stock
              </Link>
            </Button>
            <Button asChild variant="outline" className="w-full">
              <Link href="/dashboard/inventory/movements">View All Movements</Link>
            </Button>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Stock Movement History</CardTitle>
          <CardDescription>All receipts, issues, transfers and adjustments for this item.</CardDescription>
        </CardHeader>
        <CardContent>
          {movements.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">No movements recorded for this item.</div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Reference</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead className="text-right">Qty</TableHead>
                  <TableHead className="text-right">Unit Cost</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {movements.map((m) => (
                  <TableRow key={m.id}>
                    <TableCell>{fmtDate(m.movementDate || m.createdAt)}</TableCell>
                    <TableCell>
                      <Badge variant="secondary" className={movementColors[m.movementType] || ""}>{m.movementType}</Badge>
                    </TableCell>
                    <TableCell className="font-medium">{m.reference || "-"}</TableCell>
                    <TableCell>{m.description || "-"}</TableCell>
                    <TableCell className={`text-right font-mono ${["RECEIPT"].includes(m.movementType) ? "text-green-600" : "text-red-600"}`}>
                      {["RECEIPT"].includes(m.movementType) ? "+" : "-"}{Math.abs(Number(m.quantity)).toFixed(2)}
                    </TableCell>
                    <TableCell className="text-right font-mono">{fmt(Number(m.unitCost || 0))}</TableCell>
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
