"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Eye, Loader2, PackageCheck, Search } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/components/providers/auth-provider";
import { TablePagination, usePagination } from "@/components/ui/table-pagination";

const statusColors: Record<string, string> = {
  PENDING_INSPECTION: "bg-yellow-100 text-yellow-800",
  INSPECTED: "bg-green-100 text-green-800",
  PARTIALLY_RETURNED: "bg-orange-100 text-orange-800",
  CLOSED: "bg-gray-100 text-gray-700",
};

const fmtDate = (d: string | null | undefined) =>
  d ? new Date(d).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" }) : "-";

export default function GRNListPage() {
  const { token } = useAuth();
  const [grns, setGrns] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);

  useEffect(() => {
    if (!token) return;
    fetch("/api/procurement/grn", { headers: { Authorization: `Bearer ${token}` } })
      .then((r) => r.json())
      .then((d) => setGrns(Array.isArray(d) ? d : []))
      .catch(() => toast.error("Failed to load GRNs"))
      .finally(() => setLoading(false));
  }, [token]);

  const filtered = grns.filter((g) =>
    `${g.grnNumber} ${g.supplier?.name} ${g.purchaseOrder?.poNumber} ${g.status}`
      .toLowerCase()
      .includes(search.toLowerCase())
  );
  const paged = usePagination(filtered, pageSize, page);

  return (
    <div className="space-y-6 p-6">
      <div>
        <h1 className="text-2xl font-bold">Goods Received Notes</h1>
        <p className="text-muted-foreground">All deliveries received against purchase orders.</p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: "Total GRNs", value: grns.length },
          { label: "Pending Inspection", value: grns.filter((g) => g.status === "PENDING_INSPECTION").length },
          { label: "Inspected", value: grns.filter((g) => g.status === "INSPECTED").length },
          { label: "Closed", value: grns.filter((g) => g.status === "CLOSED").length },
        ].map((s) => (
          <Card key={s.label}>
            <CardHeader className="pb-2"><CardTitle className="text-sm font-medium">{s.label}</CardTitle></CardHeader>
            <CardContent><div className="text-2xl font-bold">{s.value}</div></CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Goods Received Notes</CardTitle>
              <CardDescription>Delivery records against purchase orders.</CardDescription>
            </div>
            <div className="relative w-64">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input placeholder="Search GRNs..." className="pl-8" value={search}
                onChange={(e) => { setSearch(e.target.value); setPage(1); }} />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex justify-center py-8"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-12">
              <PackageCheck className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
              <p className="text-muted-foreground">No goods received notes yet.</p>
              <p className="text-sm text-muted-foreground mt-1">GRNs are created when you receive goods against a purchase order.</p>
              <Button asChild variant="outline" className="mt-4">
                <Link href="/dashboard/procurement">View Purchase Orders</Link>
              </Button>
            </div>
          ) : (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>GRN Number</TableHead>
                    <TableHead>PO Number</TableHead>
                    <TableHead>Supplier</TableHead>
                    <TableHead>Received Date</TableHead>
                    <TableHead>Delivery Ref</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {paged.map((g) => (
                    <TableRow key={g.id}>
                      <TableCell className="font-medium">{g.grnNumber}</TableCell>
                      <TableCell>
                        <Link href={`/dashboard/procurement/purchase-orders/${g.poId}`}
                          className="text-primary hover:underline">
                          {g.purchaseOrder?.poNumber || "-"}
                        </Link>
                      </TableCell>
                      <TableCell>{g.supplier?.name || "-"}</TableCell>
                      <TableCell>{fmtDate(g.receivedDate)}</TableCell>
                      <TableCell>{g.deliveryNoteRef || "-"}</TableCell>
                      <TableCell>
                        <Badge variant="secondary" className={statusColors[g.status] || ""}>
                          {g.status?.replace(/_/g, " ")}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <Button variant="ghost" size="icon" asChild>
                          <Link href={`/dashboard/procurement/grn/${g.id}`}><Eye className="w-4 h-4" /></Link>
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              <TablePagination total={filtered.length} page={page} pageSize={pageSize}
                onPageChange={setPage} onPageSizeChange={setPageSize} />
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
