"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Loader2, PackageCheck } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/components/providers/auth-provider";

const statusColors: Record<string, string> = {
  PENDING_INSPECTION: "bg-yellow-100 text-yellow-800",
  INSPECTED: "bg-green-100 text-green-800",
  PARTIALLY_RETURNED: "bg-orange-100 text-orange-800",
  CLOSED: "bg-gray-100 text-gray-700",
};

const fmtDate = (d: string | null | undefined) =>
  d ? new Date(d).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" }) : "-";
const fmt = (n: number) =>
  new Intl.NumberFormat("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(n);

export default function GRNDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { token } = useAuth();
  const [grn, setGrn] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!token || !id) return;
    fetch(`/api/procurement/grn/${id}`, { headers: { Authorization: `Bearer ${token}` } })
      .then((r) => r.json())
      .then((d) => {
        if (d.error) throw new Error(d.error);
        setGrn(d);
      })
      .catch((e) => toast.error(e.message || "Failed to load GRN"))
      .finally(() => setLoading(false));
  }, [token, id]);

  if (loading) return <div className="flex justify-center py-16"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>;
  if (!grn) return <div className="p-8 text-center text-muted-foreground">GRN not found. <Link href="/dashboard/procurement/grn" className="underline">Back</Link></div>;

  const totalAccepted = grn.lines?.reduce((s: number, l: any) => s + Number(l.qtyAccepted), 0) || 0;
  const totalRejected = grn.lines?.reduce((s: number, l: any) => s + Number(l.qtyRejected), 0) || 0;

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" asChild>
            <Link href="/dashboard/procurement/grn"><ArrowLeft className="w-4 h-4" /></Link>
          </Button>
          <div>
            <h1 className="text-2xl font-bold">{grn.grnNumber}</h1>
            <p className="text-muted-foreground">
              Against PO:{" "}
              <Link href={`/dashboard/procurement/purchase-orders/${grn.poId}`} className="text-primary hover:underline">
                {grn.purchaseOrder?.poNumber}
              </Link>
            </p>
          </div>
          <Badge variant="secondary" className={statusColors[grn.status] || ""}>{grn.status?.replace(/_/g, " ")}</Badge>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: "Supplier", value: grn.supplier?.name || "-" },
          { label: "Received Date", value: fmtDate(grn.receivedDate) },
          { label: "Delivery Ref", value: grn.deliveryNoteRef || "-" },
          { label: "Total Accepted", value: `${totalAccepted.toFixed(2)} units` },
        ].map(({ label, value }) => (
          <Card key={label}>
            <CardContent className="pt-5">
              <p className="text-xs text-muted-foreground mb-1">{label}</p>
              <p className="font-semibold text-sm">{value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader><CardTitle className="flex items-center gap-2"><PackageCheck className="w-5 h-5" />Received Lines</CardTitle></CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Description</TableHead>
                <TableHead className="text-right">Ordered</TableHead>
                <TableHead className="text-right">Delivered</TableHead>
                <TableHead className="text-right">Accepted</TableHead>
                <TableHead className="text-right">Rejected</TableHead>
                <TableHead>Rejection Reason</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {grn.lines?.map((l: any) => (
                <TableRow key={l.id}>
                  <TableCell>{l.poLine?.description || "-"}</TableCell>
                  <TableCell className="text-right font-mono">{fmt(Number(l.poLine?.quantity || 0))}</TableCell>
                  <TableCell className="text-right font-mono">{fmt(Number(l.qtyDelivered))}</TableCell>
                  <TableCell className="text-right font-mono text-green-600">{fmt(Number(l.qtyAccepted))}</TableCell>
                  <TableCell className="text-right font-mono text-red-600">{fmt(Number(l.qtyRejected))}</TableCell>
                  <TableCell className="text-muted-foreground text-sm">{l.rejectionReason || "-"}</TableCell>
                </TableRow>
              ))}
              {totalRejected > 0 && (
                <TableRow className="bg-red-50">
                  <TableCell colSpan={5} className="text-right font-medium text-red-600">Total Rejected</TableCell>
                  <TableCell className="text-right font-mono font-bold text-red-600">{fmt(totalRejected)}</TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {grn.inspectionNotes && (
        <Card>
          <CardHeader><CardTitle className="text-sm">Inspection Notes</CardTitle></CardHeader>
          <CardContent><p className="text-sm text-muted-foreground">{grn.inspectionNotes}</p></CardContent>
        </Card>
      )}
    </div>
  );
}
