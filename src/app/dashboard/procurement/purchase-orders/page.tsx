"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Plus, Search, Eye, Loader2, ShoppingCart } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/components/providers/auth-provider";
import { TablePagination, usePagination } from "@/components/ui/table-pagination";

export default function PurchaseOrdersPage() {
  const { token } = useAuth();
  const [orders, setOrders] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);

  const fetchOrders = async () => {
    setIsLoading(true);
    try {
      const res = await fetch("/api/procurement/purchase-orders", { headers: { Authorization: `Bearer ${token}` } });
      if (res.ok) { const data = await res.json(); setOrders(Array.isArray(data) ? data : []); }
    } catch { toast.error("Failed to fetch purchase orders"); }
    finally { setIsLoading(false); }
  };

  useEffect(() => { if (token) fetchOrders(); }, [token]);

  const filtered = orders.filter((o) =>
    `${o.orderNumber} ${o.supplier?.name} ${o.status}`.toLowerCase().includes(search.toLowerCase())
  );
  const pagedOrders = usePagination(filtered, pageSize, page);

  const fmt = (n: number) => new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(n);
  const fmtDate = (d: string) => d ? new Date(d).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" }) : "-";

  const statusColors: Record<string, string> = {
    DRAFT: "bg-gray-100 text-gray-800",
    APPROVED: "bg-blue-100 text-blue-800",
    SENT: "bg-yellow-100 text-yellow-800",
    PARTIALLY_RECEIVED: "bg-orange-100 text-orange-800",
    RECEIVED: "bg-green-100 text-green-800",
    CANCELLED: "bg-red-100 text-red-800",
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Purchase Orders</h1>
          <p className="text-muted-foreground">Manage purchase orders and goods received notes.</p>
        </div>
        <Button asChild>
          <Link href="/dashboard/procurement/purchase-orders/new"><Plus className="w-4 h-4 mr-2" />New Purchase Order</Link>
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        {[
          { label: "Total Orders", value: orders.length, sub: "All time" },
          { label: "Draft", value: orders.filter((o) => o.status === "DRAFT").length, sub: "Pending approval" },
          { label: "Approved", value: orders.filter((o) => o.status === "APPROVED").length, sub: "Ready to send" },
          { label: "Received", value: orders.filter((o) => o.status === "RECEIVED").length, sub: "Completed" },
        ].map((s) => (
          <Card key={s.label}>
            <CardHeader className="pb-2"><CardTitle className="text-sm font-medium">{s.label}</CardTitle></CardHeader>
            <CardContent><div className="text-2xl font-bold">{s.value}</div><p className="text-xs text-muted-foreground">{s.sub}</p></CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div><CardTitle>Purchase Orders</CardTitle><CardDescription>All purchase orders and their current status.</CardDescription></div>
            <div className="relative w-64">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input placeholder="Search..." className="pl-8" value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }} />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex justify-center py-8"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-12">
              <ShoppingCart className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
              <p className="text-muted-foreground">No purchase orders found.</p>
              <Button asChild className="mt-4"><Link href="/dashboard/procurement/purchase-orders/new">Create First PO</Link></Button>
            </div>
          ) : (
            <>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>PO Number</TableHead>
                  <TableHead>Supplier</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Total</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {pagedOrders.map((o) => (
                  <TableRow key={o.id}>
                    <TableCell className="font-medium">{o.orderNumber}</TableCell>
                    <TableCell>{o.supplier?.name || "-"}</TableCell>
                    <TableCell>{fmtDate(o.orderDate || o.createdAt)}</TableCell>
                    <TableCell><Badge variant="secondary" className={statusColors[o.status] || ""}>{o.status}</Badge></TableCell>
                    <TableCell className="text-right font-mono">{fmt(Number(o.totalAmount || 0))}</TableCell>
                    <TableCell className="text-right">
                      <Button variant="ghost" size="icon" asChild>
                        <Link href={`/dashboard/procurement/purchase-orders/${o.id}`}><Eye className="w-4 h-4" /></Link>
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          <TablePagination total={filtered.length} page={page} pageSize={pageSize} onPageChange={setPage} onPageSizeChange={setPageSize} />
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
