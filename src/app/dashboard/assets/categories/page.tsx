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
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Plus, Loader2, ArrowLeft } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/components/providers/auth-provider";

export default function AssetCategoriesPage() {
  const { token } = useAuth();
  const [categories, setCategories] = useState<any[]>([]);
  const [accounts, setAccounts] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);

  const [formData, setFormData] = useState({
    code: "",
    name: "",
    assetAccountId: "",
    depreciationAccountId: "",
    accumulatedDepAccountId: "",
    depreciationMethod: "STRAIGHT_LINE",
    usefulLifeMonths: 60,
    residualValuePercent: 0,
  });

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const [catRes, accRes] = await Promise.all([
        fetch("/api/assets/categories", {
          headers: { Authorization: `Bearer ${token}` },
        }),
        fetch("/api/organisations/${authReq?.user?.organisationId}/accounts", {
          headers: { Authorization: `Bearer ${token}` },
        }).catch(() => fetch("/api/accounts", {
          headers: { Authorization: `Bearer ${token}` },
        })),
      ]);
      const catData = await catRes.json();
      const accData = await accRes.json();
      setCategories(Array.isArray(catData) ? catData : []);
      setAccounts(Array.isArray(accData) ? accData : []);
    } catch {
      toast.error("Failed to fetch data");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (token) fetchData();
  }, [token]);

  const handleSubmit = async () => {
    if (!formData.code || !formData.name) {
      toast.error("Please fill in required fields");
      return;
    }

    setIsSubmitting(true);
    try {
      const response = await fetch("/api/assets/categories", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(formData),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to create category");
      }

      toast.success("Category created successfully");
      setDialogOpen(false);
      setFormData({
        code: "",
        name: "",
        assetAccountId: "",
        depreciationAccountId: "",
        accumulatedDepAccountId: "",
        depreciationMethod: "STRAIGHT_LINE",
        usefulLifeMonths: 60,
        residualValuePercent: 0,
      });
      fetchData();
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const assetAccounts = accounts.filter((a) => a.type === "ASSET");
  const expenseAccounts = accounts.filter((a) => a.type === "EXPENSE");

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" asChild>
            <Link href="/dashboard/assets">
              <ArrowLeft className="w-4 h-4" />
            </Link>
          </Button>
          <div>
            <h1 className="text-3xl font-bold tracking-tight">
              Asset Categories
            </h1>
            <p className="text-muted-foreground">
              Define asset types and depreciation rules.
            </p>
          </div>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="w-4 h-4 mr-2" />
              Add Category
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>New Asset Category</DialogTitle>
              <DialogDescription>
                Create a new asset category with depreciation settings.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="code">Code *</Label>
                  <Input
                    id="code"
                    value={formData.code}
                    onChange={(e) =>
                      setFormData({ ...formData, code: e.target.value })
                    }
                    placeholder="ICT"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="name">Name *</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) =>
                      setFormData({ ...formData, name: e.target.value })
                    }
                    placeholder="ICT Equipment"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Asset Account</Label>
                <Select
                  value={formData.assetAccountId}
                  onValueChange={(v) =>
                    setFormData({ ...formData, assetAccountId: v })
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select account" />
                  </SelectTrigger>
                  <SelectContent>
                    {assetAccounts.map((acc) => (
                      <SelectItem key={acc.id} value={acc.id}>
                        {acc.code} - {acc.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Depreciation Expense Account</Label>
                <Select
                  value={formData.depreciationAccountId}
                  onValueChange={(v) =>
                    setFormData({ ...formData, depreciationAccountId: v })
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select account" />
                  </SelectTrigger>
                  <SelectContent>
                    {expenseAccounts.map((acc) => (
                      <SelectItem key={acc.id} value={acc.id}>
                        {acc.code} - {acc.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Accumulated Depreciation Account</Label>
                <Select
                  value={formData.accumulatedDepAccountId}
                  onValueChange={(v) =>
                    setFormData({ ...formData, accumulatedDepAccountId: v })
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select account" />
                  </SelectTrigger>
                  <SelectContent>
                    {assetAccounts.map((acc) => (
                      <SelectItem key={acc.id} value={acc.id}>
                        {acc.code} - {acc.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Depreciation Method</Label>
                  <Select
                    value={formData.depreciationMethod}
                    onValueChange={(v) =>
                      setFormData({ ...formData, depreciationMethod: v })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="STRAIGHT_LINE">Straight Line</SelectItem>
                      <SelectItem value="REDUCING_BALANCE">
                        Reducing Balance
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Useful Life (months)</Label>
                  <Input
                    type="number"
                    value={formData.usefulLifeMonths}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        usefulLifeMonths: parseInt(e.target.value) || 0,
                      })
                    }
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Residual Value %</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={formData.residualValuePercent}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      residualValuePercent: parseFloat(e.target.value) || 0,
                    })
                  }
                />
              </div>
            </div>
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setDialogOpen(false)}
                disabled={isSubmitting}
              >
                Cancel
              </Button>
              <Button onClick={handleSubmit} disabled={isSubmitting}>
                {isSubmitting && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                Create Category
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Categories</CardTitle>
          <CardDescription>
            Asset categories define depreciation rules for each type.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="w-8 h-8 animate-spin text-primary" />
            </div>
          ) : categories.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No categories found. Create one to get started.
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Code</TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead>Method</TableHead>
                  <TableHead>Useful Life</TableHead>
                  <TableHead>Residual %</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {categories.map((cat) => (
                  <TableRow key={cat.id}>
                    <TableCell className="font-medium">{cat.code}</TableCell>
                    <TableCell>{cat.name}</TableCell>
                    <TableCell>
                      {cat.depreciationMethod === "STRAIGHT_LINE"
                        ? "Straight Line"
                        : "Reducing Balance"}
                    </TableCell>
                    <TableCell>{cat.usefulLifeMonths} months</TableCell>
                    <TableCell>{cat.residualValuePercent}%</TableCell>
                    <TableCell>{cat.isActive ? "Active" : "Inactive"}</TableCell>
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
