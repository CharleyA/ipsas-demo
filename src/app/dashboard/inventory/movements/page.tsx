"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Search, Loader2, ArrowUpDown, Plus } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/components/providers/auth-provider";

export default function InventoryMovementsPage() {
  const { token } = useAuth();
  const [movements, setMovements] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState("");

  const fetchMovements = async () => {
    setIsLoading(true);
    try {
      const res = await fetch("/api/inventory/movements", { headers: { Authorization: `Bearer ${token}` } });
      const data = await res.json();
      setMovements(Array.isArray(data) ? data : []);
    } catch { toast.error("Failed to fetch movements"); }
    finally { setIsLoading(false); }
  };

  useEffect(() => { if (token) fetchMovements(); }, [token]);

  const filtered = movements.filter((m) =>
    `${m.reference} ${m.description} ${m.item?.name} ${m.item?.code} ${m.movementType}`.toLowerCase().includes(search.toLowerCase())
  );

  const fmt = (n: number) => new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(n);
  const fmtDate = (d: string) => d ? new Date(d).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" }) : "-";

  const typeColors: Record<string, string> = {
    RECEIPT: "bg-green-100 text-green-800",
    ISSUE: "bg-red-100 text-red-800",
    TRANSFER: "bg-blue-100 text-blue-800",
    ADJUSTMENT: "bg-yellow-100 text-yellow-800",
    RETURN: "bg-purple-100 text-purple-800",
  };

  const totalReceipts = movements.filter((m) => m.movementType === "RECEIPT").reduce((s, m) => s + Number(m.quantity || 0), 0);
  const totalIssues = movements.filter((m) => m.movementType === "ISSUE").reduce((s, m) => s + Number(m.quantity || 0), 0);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Stock Movements</h1>
          <p className="text-muted-foreground">All inventory receipts, issues, transfers and adjustments.</p>
        </div>
        <div className="flex gap-2">
          <Button asChild variant="outline">
            <Link href="/dashboard/inventory/issue"><ArrowUpDown className="w-4 h-4 mr-2" />Issue Stock</Link>
          </Button>
          <Button asChild>
            <Link href="/dashboard/inventory/items/new"><Plus className="w-4 h-4 mr-2" />Receive Stock</Link>
          </Button>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm font-medium">Total Movements</CardTitle></CardHeader>
          <CardContent><div className="text-2xl font-bold">{movements.length}</div></CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm font-medium">Total Received</CardTitle></CardHeader>
          <CardContent><div className="text-2xl font-bold text-green-600">+{totalReceipts.toFixed(2)}</div></CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm font-medium">Total Issued</CardTitle></CardHeader>
          <CardContent><div className="text-2xl font-bold text-red-600">-{totalIssues.toFixed(2)}</div></CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div><CardTitle>Movement History</CardTitle><CardDescription>All stock movements across all items.</CardDescription></div>
            <div className="relative w-64">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input placeholder="Search movements..." className="pl-8" value={search} onChange={(e) => setSearch(e.target.value)} />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex justify-center py-8"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-12">
              <ArrowUpDown className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
              <p className="text-muted-foreground">No stock movements recorded yet.</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Item</TableHead>
                  <TableHead>Reference</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead className="text-right">Qty</TableHead>
                  <TableHead className="text-right">Unit Cost</TableHead>
                  <TableHead className="text-right">Total Value</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((m) => (
                  <TableRow key={m.id}>
                    <TableCell>{fmtDate(m.movementDate || m.createdAt)}</TableCell>
                    <TableCell><Badge variant="secondary" className={typeColors[m.movementType] || ""}>{m.movementType}</Badge></TableCell>
                    <TableCell>
                      <Link href={`/dashboard/inventory/items/${m.item?.id}`} className="font-medium hover:underline">
                        {m.item?.name || "-"}
                      </Link>
                      <div className="text-xs text-muted-foreground">{m.item?.code}</div>
                    </TableCell>
                    <TableCell className="font-medium">{m.reference || "-"}</TableCell>
                    <TableCell>{m.description || "-"}</TableCell>
                    <TableCell className={`text-right font-mono ${m.movementType === "RECEIPT" ? "text-green-600" : "text-red-600"}`}>
                      {m.movementType === "RECEIPT" ? "+" : "-"}{Math.abs(Number(m.quantity || 0)).toFixed(2)}
                    </TableCell>
                    <TableCell className="text-right font-mono">{fmt(Number(m.unitCost || 0))}</TableCell>
                    <TableCell className="text-right font-mono">{fmt(Math.abs(Number(m.quantity || 0)) * Number(m.unitCost || 0))}</TableCell>
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
