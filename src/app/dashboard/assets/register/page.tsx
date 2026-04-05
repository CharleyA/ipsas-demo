"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Plus, Search, Eye, Loader2, Package } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/components/providers/auth-provider";

export default function AssetRegisterPage() {
  const { token } = useAuth();
  const [assets, setAssets] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState("");

  const fetchAssets = async () => {
    setIsLoading(true);
    try {
      const res = await fetch("/api/assets/register", { headers: { Authorization: `Bearer ${token}` } });
      const data = await res.json();
      setAssets(Array.isArray(data) ? data : []);
    } catch {
      toast.error("Failed to fetch asset register");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => { if (token) fetchAssets(); }, [token]);

  const filtered = assets.filter((a) =>
    `${a.assetNumber} ${a.description} ${a.location} ${a.custodian} ${a.category?.name}`.toLowerCase().includes(search.toLowerCase())
  );

  const fmt = (n: number) => new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(n);
  const fmtDate = (d: string) => d ? new Date(d).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" }) : "-";

  const statusColors: Record<string, string> = {
    ACTIVE: "bg-green-100 text-green-800",
    DISPOSED: "bg-red-100 text-red-800",
    WRITTEN_OFF: "bg-gray-100 text-gray-800",
    TRANSFERRED: "bg-blue-100 text-blue-800",
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Asset Register</h1>
          <p className="text-muted-foreground">Full fixed asset register — acquisition, depreciation, disposal.</p>
        </div>
        <Button asChild>
          <Link href="/dashboard/assets/register/new"><Plus className="w-4 h-4 mr-2" />Add Asset</Link>
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm font-medium">Total Assets</CardTitle></CardHeader>
          <CardContent><div className="text-2xl font-bold">{assets.length}</div><p className="text-xs text-muted-foreground">Registered assets</p></CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm font-medium">Acquisition Cost</CardTitle></CardHeader>
          <CardContent><div className="text-2xl font-bold">{fmt(assets.reduce((s, a) => s + Number(a.acquisitionCost || 0), 0))}</div></CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm font-medium">Net Book Value</CardTitle></CardHeader>
          <CardContent><div className="text-2xl font-bold">{fmt(assets.reduce((s, a) => s + Number(a.netBookValue || 0), 0))}</div></CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Asset Register</CardTitle>
              <CardDescription>All registered assets with depreciation and location details.</CardDescription>
            </div>
            <div className="relative w-64">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input placeholder="Search assets..." className="pl-8" value={search} onChange={(e) => setSearch(e.target.value)} />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex justify-center py-8"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-12">
              <Package className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
              <p className="text-muted-foreground">No assets registered.</p>
              <Button asChild className="mt-4"><Link href="/dashboard/assets/register/new">Add First Asset</Link></Button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Asset No.</TableHead>
                    <TableHead>Description</TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead>Location</TableHead>
                    <TableHead>Custodian</TableHead>
                    <TableHead>Acq. Date</TableHead>
                    <TableHead className="text-right">Cost</TableHead>
                    <TableHead className="text-right">NBV</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map((a) => (
                    <TableRow key={a.id}>
                      <TableCell className="font-medium">{a.assetNumber}</TableCell>
                      <TableCell>{a.description}</TableCell>
                      <TableCell>{a.category?.name || "-"}</TableCell>
                      <TableCell>{a.location || "-"}</TableCell>
                      <TableCell>{a.custodian || "-"}</TableCell>
                      <TableCell>{fmtDate(a.acquisitionDate)}</TableCell>
                      <TableCell className="text-right font-mono">{fmt(Number(a.acquisitionCost || 0))}</TableCell>
                      <TableCell className="text-right font-mono">{fmt(Number(a.netBookValue || 0))}</TableCell>
                      <TableCell>
                        <Badge variant="secondary" className={statusColors[a.status] || ""}>{a.status}</Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <Button variant="ghost" size="icon" asChild>
                          <Link href={`/dashboard/assets/register/${a.id}`}><Eye className="w-4 h-4" /></Link>
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
