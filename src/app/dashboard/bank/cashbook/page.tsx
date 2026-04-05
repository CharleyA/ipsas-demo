"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Plus, Search, Loader2, BookOpen } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/components/providers/auth-provider";

export default function CashbookPage() {
  const { token } = useAuth();
  const [entries, setEntries] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState("");

  const fetchEntries = async () => {
    setIsLoading(true);
    try {
      const res = await fetch("/api/bank/cashbook", {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      setEntries(Array.isArray(data) ? data : []);
    } catch {
      toast.error("Failed to fetch cashbook entries");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (token) fetchEntries();
  }, [token]);

  const filtered = entries.filter((e) =>
    `${e.reference} ${e.description} ${e.bankAccount?.bankName}`.toLowerCase().includes(search.toLowerCase())
  );

  const totalReceipts = entries.filter((e) => e.entryType === "RECEIPT").reduce((s, e) => s + Number(e.amount || 0), 0);
  const totalPayments = entries.filter((e) => e.entryType === "PAYMENT").reduce((s, e) => s + Number(e.amount || 0), 0);

  const fmt = (n: number) => new Intl.NumberFormat("en-US", { minimumFractionDigits: 2 }).format(n);
  const fmtDate = (d: string) => new Date(d).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });

  const typeColors: Record<string, string> = {
    RECEIPT: "bg-green-100 text-green-800",
    PAYMENT: "bg-red-100 text-red-800",
    TRANSFER: "bg-blue-100 text-blue-800",
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Cashbook</h1>
          <p className="text-muted-foreground">Cashbook entries for receipts and payments.</p>
        </div>
        <Button asChild>
          <Link href="/dashboard/bank/cashbook/new">
            <Plus className="w-4 h-4 mr-2" /> New Entry
          </Link>
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm font-medium">Total Receipts</CardTitle></CardHeader>
          <CardContent><div className="text-2xl font-bold text-green-600">{fmt(totalReceipts)}</div></CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm font-medium">Total Payments</CardTitle></CardHeader>
          <CardContent><div className="text-2xl font-bold text-red-600">{fmt(totalPayments)}</div></CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm font-medium">Net Position</CardTitle></CardHeader>
          <CardContent><div className={`text-2xl font-bold ${totalReceipts - totalPayments >= 0 ? "text-green-600" : "text-red-600"}`}>{fmt(totalReceipts - totalPayments)}</div></CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Cashbook Entries</CardTitle>
              <CardDescription>All cashbook receipts and payments.</CardDescription>
            </div>
            <div className="relative w-64">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input placeholder="Search..." className="pl-8" value={search} onChange={(e) => setSearch(e.target.value)} />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex justify-center py-8"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-12">
              <BookOpen className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
              <p className="text-muted-foreground">No cashbook entries found.</p>
              <Button asChild className="mt-4"><Link href="/dashboard/bank/cashbook/new">Create First Entry</Link></Button>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Reference</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead>Bank Account</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead className="text-right">Amount</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((e) => (
                  <TableRow key={e.id}>
                    <TableCell>{fmtDate(e.entryDate || e.createdAt)}</TableCell>
                    <TableCell className="font-medium">{e.reference || "-"}</TableCell>
                    <TableCell>{e.description || "-"}</TableCell>
                    <TableCell>{e.bankAccount?.bankName || "-"}</TableCell>
                    <TableCell>
                      <Badge variant="secondary" className={typeColors[e.entryType] || ""}>{e.entryType}</Badge>
                    </TableCell>
                    <TableCell className="text-right font-mono">{fmt(Number(e.amount || 0))}</TableCell>
                    <TableCell>
                      <Badge variant={e.status === "POSTED" ? "default" : "secondary"}>{e.status || "DRAFT"}</Badge>
                    </TableCell>
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
