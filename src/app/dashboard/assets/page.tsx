"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Plus,
  Search,
  Eye,
  Loader2,
  Package,
  Clock,
  Calculator,
  FolderCog,
} from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/components/providers/auth-provider";

export default function AssetsPage() {
  const { token } = useAuth();
  const [assets, setAssets] = useState<any[]>([]);
  const [pendingCount, setPendingCount] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState("");

  const fetchAssets = async () => {
    setIsLoading(true);
    try {
      const [assetsRes, pendingRes] = await Promise.all([
        fetch("/api/assets/register", {
          headers: { Authorization: `Bearer ${token}` },
        }),
        fetch("/api/assets/pending", {
          headers: { Authorization: `Bearer ${token}` },
        }),
      ]);
      const assetsData = await assetsRes.json();
      const pendingData = await pendingRes.json();
      setAssets(Array.isArray(assetsData) ? assetsData : []);
      setPendingCount(Array.isArray(pendingData) ? pendingData.length : 0);
    } catch {
      toast.error("Failed to fetch assets");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (token) fetchAssets();
  }, [token]);

  const filteredAssets = assets.filter((a) =>
    `${a.assetNumber} ${a.description} ${a.category?.name}`
      .toLowerCase()
      .includes(search.toLowerCase())
  );

  const totalValue = assets.reduce(
    (sum, a) => sum + Number(a.acquisitionCost || 0),
    0
  );
  const totalNBV = assets.reduce(
    (sum, a) => sum + Number(a.netBookValue || 0),
    0
  );

  const formatCurrency = (amount: number) =>
    new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
    }).format(amount);

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
          <h1 className="text-3xl font-bold tracking-tight">Fixed Assets</h1>
          <p className="text-muted-foreground">
            Manage property, plant and equipment.
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" asChild>
            <Link href="/dashboard/assets/categories">
              <FolderCog className="w-4 h-4 mr-2" />
              Categories
            </Link>
          </Button>
          <Button asChild>
            <Link href="/dashboard/assets/register/new">
              <Plus className="w-4 h-4 mr-2" />
              Add Asset
            </Link>
          </Button>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Assets</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{assets.length}</div>
            <p className="text-xs text-muted-foreground">
              Registered in system
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Acquisition Value
            </CardTitle>
            <Calculator className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(totalValue)}</div>
            <p className="text-xs text-muted-foreground">Total cost</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Net Book Value</CardTitle>
            <Calculator className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(totalNBV)}</div>
            <p className="text-xs text-muted-foreground">After depreciation</p>
          </CardContent>
        </Card>

        <Card className={pendingCount > 0 ? "border-yellow-500" : ""}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending Assets</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{pendingCount}</div>
            <p className="text-xs text-muted-foreground">
              <Link
                href="/dashboard/assets/pending"
                className="text-primary hover:underline"
              >
                Complete registration →
              </Link>
            </p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Asset Register</CardTitle>
              <CardDescription>
                All fixed assets with their current values.
              </CardDescription>
            </div>
            <div className="flex gap-2">
              <div className="relative w-64">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search assets..."
                  className="pl-8"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>
              <Button variant="outline" asChild>
                <Link href="/dashboard/assets/depreciation">Run Depreciation</Link>
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="w-8 h-8 animate-spin text-primary" />
            </div>
          ) : filteredAssets.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No assets found.
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Asset No.</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead>Location</TableHead>
                  <TableHead className="text-right">Cost</TableHead>
                  <TableHead className="text-right">NBV</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredAssets.map((asset) => (
                  <TableRow key={asset.id}>
                    <TableCell className="font-medium">
                      {asset.assetNumber}
                    </TableCell>
                    <TableCell>{asset.description}</TableCell>
                    <TableCell>{asset.category?.name}</TableCell>
                    <TableCell>{asset.location || "-"}</TableCell>
                    <TableCell className="text-right">
                      {formatCurrency(Number(asset.acquisitionCost))}
                    </TableCell>
                    <TableCell className="text-right">
                      {formatCurrency(Number(asset.netBookValue))}
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant="secondary"
                        className={statusColors[asset.status] || ""}
                      >
                        {asset.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button variant="ghost" size="icon" asChild>
                        <Link href={`/dashboard/assets/register/${asset.id}`}>
                          <Eye className="w-4 h-4" />
                        </Link>
                      </Button>
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
