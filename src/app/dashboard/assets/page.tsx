"use client";

import { useEffect, useMemo, useState } from "react";
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
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

type AssetRegisterRow = {
  id: string;
  assetNumber: string;
  description: string;
  serialNumber?: string | null;
  location?: string | null;
  custodian?: string | null;
  acquisitionDate: string;
  acquisitionCost: string | number;
  netBookValue: string | number;
  status: string;
  category?: {
    id: string;
    code?: string | null;
    name?: string | null;
    depreciationMethod?: string | null;
    usefulLifeMonths?: number | null;
  } | null;
};

export default function AssetsPage() {
  const { token } = useAuth();
  const [assets, setAssets] = useState<AssetRegisterRow[]>([]);
  const [pendingCount, setPendingCount] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [locationFilter, setLocationFilter] = useState("all");

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

  const categoryOptions = useMemo(() => {
    const seen = new Map<string, string>();
    assets.forEach((asset) => {
      if (asset.category?.id) {
        seen.set(asset.category.id, asset.category.name || asset.category.code || "Uncategorised");
      }
    });

    return Array.from(seen.entries())
      .map(([value, label]) => ({ value, label }))
      .sort((a, b) => a.label.localeCompare(b.label));
  }, [assets]);

  const locationOptions = useMemo(() => {
    return Array.from(
      new Set(
        assets
          .map((asset) => asset.location?.trim())
          .filter((location): location is string => Boolean(location))
      )
    ).sort((a, b) => a.localeCompare(b));
  }, [assets]);

  const filteredAssets = assets.filter((asset) => {
    const matchesSearch = [
      asset.assetNumber,
      asset.serialNumber,
      asset.description,
      asset.category?.name,
      asset.category?.code,
      asset.location,
      asset.custodian,
    ]
      .filter(Boolean)
      .join(" ")
      .toLowerCase()
      .includes(search.toLowerCase());

    const matchesCategory =
      categoryFilter === "all" || asset.category?.id === categoryFilter;
    const matchesLocation =
      locationFilter === "all" ||
      (asset.location || "").trim().toLowerCase() === locationFilter.toLowerCase();

    return matchesSearch && matchesCategory && matchesLocation;
  });

  const totalValue = assets.reduce(
    (sum, asset) => sum + Number(asset.acquisitionCost || 0),
    0
  );
  const totalNBV = assets.reduce(
    (sum, asset) => sum + Number(asset.netBookValue || 0),
    0
  );

  const formatCurrency = (amount: number) =>
    new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
    }).format(amount);

  const formatDate = (date?: string | null) => {
    if (!date) return "-";
    return new Date(date).toLocaleDateString("en-GB", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  };

  const formatDepreciationMethod = (method?: string | null) => {
    if (!method) return "-";
    return method
      .split("_")
      .map((part) => part.charAt(0) + part.slice(1).toLowerCase())
      .join(" ");
  };

  const formatLifeSpan = (months?: number | null) => {
    if (!months) return "-";
    if (months % 12 === 0) {
      const years = months / 12;
      return `${years} year${years === 1 ? "" : "s"}`;
    }
    return `${months} months`;
  };

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
          <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
            <div>
              <CardTitle>Asset Register</CardTitle>
              <CardDescription>
                Clear register showing asset codes, numbers, names, depreciation method, category, location and custodian.
              </CardDescription>
            </div>
            <div className="flex flex-col gap-2 md:flex-row">
              <div className="relative w-full md:w-72">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search assets..."
                  className="pl-8"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>
              <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                <SelectTrigger className="w-full md:w-56">
                  <SelectValue placeholder="Filter by category" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All categories</SelectItem>
                  {categoryOptions.map((category) => (
                    <SelectItem key={category.value} value={category.value}>
                      {category.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={locationFilter} onValueChange={setLocationFilter}>
                <SelectTrigger className="w-full md:w-56">
                  <SelectValue placeholder="Filter by location" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All locations</SelectItem>
                  {locationOptions.map((location) => (
                    <SelectItem key={location} value={location}>
                      {location}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
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
            <ScrollArea className="w-full whitespace-nowrap rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Asset Code</TableHead>
                    <TableHead>Asset Number</TableHead>
                    <TableHead>Asset Name</TableHead>
                    <TableHead>Asset Description</TableHead>
                    <TableHead>Depreciation Type</TableHead>
                    <TableHead>Date Available for Use</TableHead>
                    <TableHead>Asset Life Span</TableHead>
                    <TableHead>Asset Category</TableHead>
                    <TableHead>Asset Location</TableHead>
                    <TableHead>Asset Custodian</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredAssets.map((asset) => (
                    <TableRow key={asset.id}>
                      <TableCell className="font-medium">
                        {asset.category?.code || "-"}
                      </TableCell>
                      <TableCell className="font-medium">
                        {asset.assetNumber}
                      </TableCell>
                      <TableCell>{asset.description || "-"}</TableCell>
                      <TableCell className="max-w-[320px] whitespace-normal">
                        {asset.description || "-"}
                      </TableCell>
                      <TableCell>
                        {formatDepreciationMethod(asset.category?.depreciationMethod)}
                      </TableCell>
                      <TableCell>{formatDate(asset.acquisitionDate)}</TableCell>
                      <TableCell>
                        {formatLifeSpan(asset.category?.usefulLifeMonths)}
                      </TableCell>
                      <TableCell>{asset.category?.name || "-"}</TableCell>
                      <TableCell>{asset.location || "-"}</TableCell>
                      <TableCell>{asset.custodian || "-"}</TableCell>
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
              <ScrollBar orientation="horizontal" />
            </ScrollArea>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
