"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Loader2, BarChart2, CheckCircle2, AlertTriangle, Play } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/components/providers/auth-provider";

const fmt = (n: number) =>
  new Intl.NumberFormat("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(n);
const fmtDate = (d: string | null | undefined) =>
  d ? new Date(d).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" }) : "-";

export default function DepreciationRunPage() {
  const { token } = useAuth();
  const [assets, setAssets] = useState<any[]>([]);
  const [loadingAssets, setLoadingAssets] = useState(true);
  const [depDate, setDepDate] = useState(() => {
    const d = new Date();
    d.setDate(0); // last day of previous month
    return d.toISOString().split("T")[0];
  });
  const [running, setRunning] = useState(false);
  const [results, setResults] = useState<any[] | null>(null);

  useEffect(() => {
    if (!token) return;
    fetch("/api/assets/register", { headers: { Authorization: `Bearer ${token}` } })
      .then((r) => r.json())
      .then((d) => setAssets(Array.isArray(d) ? d.filter((a: any) => a.status === "ACTIVE") : []))
      .catch(() => toast.error("Failed to load assets"))
      .finally(() => setLoadingAssets(false));
  }, [token]);

  async function runDepreciation() {
    if (!depDate) { toast.error("Select a depreciation date"); return; }
    if (!confirm(`Run depreciation for ALL ${assets.length} active assets as at ${depDate}?`)) return;
    setRunning(true);
    setResults(null);
    try {
      const res = await fetch("/api/assets/depreciation", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ depreciationDate: depDate }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Depreciation run failed");
      setResults(Array.isArray(data) ? data : [data]);
      const processed = Array.isArray(data) ? data.length : 1;
      toast.success(`Depreciation run complete — ${processed} asset(s) processed`);
      // Refresh assets
      const refreshed = await fetch("/api/assets/register", { headers: { Authorization: `Bearer ${token}` } });
      const refreshedData = await refreshed.json();
      setAssets(Array.isArray(refreshedData) ? refreshedData.filter((a: any) => a.status === "ACTIVE") : []);
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setRunning(false);
    }
  }

  const totalNBV = assets.reduce((s, a) => s + Number(a.netBookValue || 0), 0);
  const totalCost = assets.reduce((s, a) => s + Number(a.acquisitionCost || 0), 0);
  const totalAccum = totalCost - totalNBV;

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" asChild>
          <Link href="/dashboard/assets"><ArrowLeft className="w-4 h-4" /></Link>
        </Button>
        <div>
          <h1 className="text-2xl font-bold">Depreciation Run</h1>
          <p className="text-muted-foreground">Calculate and post monthly depreciation for all active assets.</p>
        </div>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card><CardContent className="pt-5">
          <p className="text-xs text-muted-foreground mb-1">Active Assets</p>
          <p className="text-2xl font-bold">{loadingAssets ? "—" : assets.length}</p>
        </CardContent></Card>
        <Card><CardContent className="pt-5">
          <p className="text-xs text-muted-foreground mb-1">Total Cost</p>
          <p className="text-2xl font-bold font-mono">${fmt(totalCost)}</p>
        </CardContent></Card>
        <Card><CardContent className="pt-5">
          <p className="text-xs text-muted-foreground mb-1">Total Accum. Depreciation</p>
          <p className="text-2xl font-bold font-mono text-red-600">${fmt(totalAccum)}</p>
        </CardContent></Card>
        <Card><CardContent className="pt-5">
          <p className="text-xs text-muted-foreground mb-1">Total Net Book Value</p>
          <p className="text-2xl font-bold font-mono text-blue-600">${fmt(totalNBV)}</p>
        </CardContent></Card>
      </div>

      {/* Run Panel */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><Play className="w-5 h-5" />Run Depreciation</CardTitle>
          <CardDescription>
            Select the period end date and run depreciation for all active assets. Each asset will only be depreciated once per period.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-end gap-4">
            <div>
              <Label htmlFor="depDate">Depreciation Date (period end)</Label>
              <Input id="depDate" type="date" value={depDate}
                onChange={(e) => setDepDate(e.target.value)} className="mt-1 w-48" />
            </div>
            <Button onClick={runDepreciation} disabled={running || loadingAssets || assets.length === 0}>
              {running ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Play className="w-4 h-4 mr-2" />}
              Run for {assets.length} Assets
            </Button>
          </div>
          <p className="text-xs text-muted-foreground">
            <AlertTriangle className="w-3 h-3 inline mr-1 text-yellow-500" />
            Assets already depreciated for this period will be skipped automatically.
          </p>
        </CardContent>
      </Card>

      {/* Results */}
      {results && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><CheckCircle2 className="w-5 h-5 text-green-600" />Run Results</CardTitle>
            <CardDescription>{results.length} asset(s) processed for {depDate}</CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Asset No.</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead className="text-right">Depreciation</TableHead>
                  <TableHead className="text-right">New NBV</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {results.map((r: any) => (
                  <TableRow key={r.id || r.assetId}>
                    <TableCell className="font-medium">{r.assetNumber || r.asset?.assetNumber || "-"}</TableCell>
                    <TableCell>{r.description || r.asset?.description || "-"}</TableCell>
                    <TableCell className="text-right font-mono text-red-600">${fmt(Number(r.amount || r.depreciation || 0))}</TableCell>
                    <TableCell className="text-right font-mono text-blue-600">${fmt(Number(r.netBookValue || r.newNBV || 0))}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {/* Asset list preview */}
      <Card>
        <CardHeader>
          <CardTitle>Active Assets</CardTitle>
          <CardDescription>All assets that will be included in the depreciation run.</CardDescription>
        </CardHeader>
        <CardContent>
          {loadingAssets ? (
            <div className="flex justify-center py-6"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>
          ) : assets.length === 0 ? (
            <p className="text-center py-6 text-muted-foreground text-sm">No active assets found.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Asset No.</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead className="text-right">Cost</TableHead>
                  <TableHead className="text-right">NBV</TableHead>
                  <TableHead>Last Depreciation</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {assets.map((a) => (
                  <TableRow key={a.id}>
                    <TableCell className="font-medium">
                      <Link href={`/dashboard/assets/register/${a.id}`} className="text-primary hover:underline">{a.assetNumber}</Link>
                    </TableCell>
                    <TableCell>{a.description}</TableCell>
                    <TableCell><Badge variant="outline" className="text-xs">{a.category?.name || "-"}</Badge></TableCell>
                    <TableCell className="text-right font-mono">${fmt(Number(a.acquisitionCost))}</TableCell>
                    <TableCell className="text-right font-mono">${fmt(Number(a.netBookValue))}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {a.depreciationEntries?.[0] ? fmtDate(a.depreciationEntries[0].depreciationDate) : "Never"}
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
