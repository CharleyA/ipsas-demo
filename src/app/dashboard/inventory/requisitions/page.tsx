"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Eye, Loader2, ClipboardList, Plus, Search } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/components/providers/auth-provider";
import { TablePagination, usePagination } from "@/components/ui/table-pagination";

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

export default function RequisitionsPage() {
  const { token } = useAuth();
  const [reqs, setReqs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);

  useEffect(() => {
    if (!token) return;
    fetch("/api/inventory/requisitions", { headers: { Authorization: `Bearer ${token}` } })
      .then((r) => r.json())
      .then((d) => setReqs(Array.isArray(d) ? d : []))
      .catch(() => toast.error("Failed to load requisitions"))
      .finally(() => setLoading(false));
  }, [token]);

  const filtered = reqs.filter((r) =>
    `${r.reqNumber} ${r.department} ${r.status}`.toLowerCase().includes(search.toLowerCase())
  );
  const paged = usePagination(filtered, pageSize, page);

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Stock Requisitions</h1>
          <p className="text-muted-foreground">Request and approve stock issues to departments.</p>
        </div>
        <Button asChild>
          <Link href="/dashboard/inventory/requisitions/new">
            <Plus className="w-4 h-4 mr-2" />New Requisition
          </Link>
        </Button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: "Total", value: reqs.length },
          { label: "Pending Approval", value: reqs.filter((r) => r.status === "SUBMITTED").length },
          { label: "Approved", value: reqs.filter((r) => r.status === "APPROVED").length },
          { label: "Issued", value: reqs.filter((r) => ["FULLY_ISSUED", "PARTIALLY_ISSUED"].includes(r.status)).length },
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
              <CardTitle>Requisitions</CardTitle>
              <CardDescription>All stock requisition requests.</CardDescription>
            </div>
            <div className="relative w-64">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input placeholder="Search..." className="pl-8" value={search}
                onChange={(e) => { setSearch(e.target.value); setPage(1); }} />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex justify-center py-8"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-12">
              <ClipboardList className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
              <p className="text-muted-foreground">No requisitions yet.</p>
              <Button asChild className="mt-4">
                <Link href="/dashboard/inventory/requisitions/new">Create First Requisition</Link>
              </Button>
            </div>
          ) : (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>REQ Number</TableHead>
                    <TableHead>Department</TableHead>
                    <TableHead>Request Date</TableHead>
                    <TableHead>Required By</TableHead>
                    <TableHead>Items</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {paged.map((r) => (
                    <TableRow key={r.id}>
                      <TableCell className="font-medium">{r.reqNumber}</TableCell>
                      <TableCell>{r.department || "-"}</TableCell>
                      <TableCell>{fmtDate(r.requestDate)}</TableCell>
                      <TableCell>{fmtDate(r.requiredDate)}</TableCell>
                      <TableCell>{r.lines?.length || 0} items</TableCell>
                      <TableCell>
                        <Badge variant="secondary" className={statusColors[r.status] || ""}>
                          {r.status?.replace(/_/g, " ")}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <Button variant="ghost" size="icon" asChild>
                          <Link href={`/dashboard/inventory/requisitions/${r.id}`}>
                            <Eye className="w-4 h-4" />
                          </Link>
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
