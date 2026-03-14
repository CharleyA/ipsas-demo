"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ArrowLeft, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/components/providers/auth-provider";

export default function IssueStockPage() {
  const router = useRouter();
  const { token } = useAuth();
  const [items, setItems] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [formData, setFormData] = useState({
    itemId: "",
    quantity: 1,
    issuedTo: "",
    notes: "",
    movementDate: new Date().toISOString().split("T")[0],
  });

  const fetchItems = async () => {
    setIsLoading(true);
    try {
      const response = await fetch("/api/inventory/items", {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await response.json();
      setItems(Array.isArray(data) ? data : []);
    } catch {
      toast.error("Failed to fetch inventory items");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (token) fetchItems();
  }, [token]);

  const selectedItem = items.find((i) => i.id === formData.itemId);

  const handleSubmit = async () => {
    if (!formData.itemId || !formData.quantity) {
      toast.error("Please select an item and enter quantity");
      return;
    }

    if (selectedItem && formData.quantity > Number(selectedItem.quantityOnHand)) {
      toast.error(
        `Insufficient stock. Available: ${Number(selectedItem.quantityOnHand).toFixed(2)}`
      );
      return;
    }

    setIsSubmitting(true);
    try {
      const response = await fetch("/api/inventory/issue", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(formData),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to issue stock");
      }

      toast.success("Stock issued successfully");
      router.push("/dashboard/inventory");
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6 max-w-2xl">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" asChild>
          <Link href="/dashboard/inventory">
            <ArrowLeft className="w-4 h-4" />
          </Link>
        </Button>
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Issue Stock</h1>
          <p className="text-muted-foreground">
            Issue inventory items to departments or individuals.
          </p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Stock Issue Details</CardTitle>
          <CardDescription>
            Select an item and quantity to issue from inventory.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="w-8 h-8 animate-spin text-primary" />
            </div>
          ) : (
            <>
              <div className="space-y-2">
                <Label>Item *</Label>
                <Select
                  value={formData.itemId}
                  onValueChange={(v) =>
                    setFormData({ ...formData, itemId: v })
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select item to issue" />
                  </SelectTrigger>
                  <SelectContent>
                    {items.map((item) => (
                      <SelectItem key={item.id} value={item.id}>
                        {item.code} - {item.name} (Qty:{" "}
                        {Number(item.quantityOnHand).toFixed(2)})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {selectedItem && (
                <div className="p-4 bg-muted rounded-lg">
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="text-muted-foreground">Available:</span>{" "}
                      <strong>
                        {Number(selectedItem.quantityOnHand).toFixed(2)}{" "}
                        {selectedItem.unitOfMeasure}
                      </strong>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Avg Cost:</span>{" "}
                      <strong>
                        ${Number(selectedItem.averageCost).toFixed(2)}
                      </strong>
                    </div>
                  </div>
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="quantity">Quantity *</Label>
                  <Input
                    id="quantity"
                    type="number"
                    min="0.01"
                    step="0.01"
                    value={formData.quantity}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        quantity: parseFloat(e.target.value) || 0,
                      })
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="date">Date *</Label>
                  <Input
                    id="date"
                    type="date"
                    value={formData.movementDate}
                    onChange={(e) =>
                      setFormData({ ...formData, movementDate: e.target.value })
                    }
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="issuedTo">Issued To</Label>
                <Input
                  id="issuedTo"
                  value={formData.issuedTo}
                  onChange={(e) =>
                    setFormData({ ...formData, issuedTo: e.target.value })
                  }
                  placeholder="Department or person name"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="notes">Notes</Label>
                <Textarea
                  id="notes"
                  value={formData.notes}
                  onChange={(e) =>
                    setFormData({ ...formData, notes: e.target.value })
                  }
                  placeholder="Optional notes about this issue"
                />
              </div>

              {selectedItem && formData.quantity > 0 && (
                <div className="p-4 bg-primary/5 border border-primary/20 rounded-lg">
                  <div className="text-sm">
                    <span className="text-muted-foreground">Total Value:</span>{" "}
                    <strong>
                      $
                      {(
                        formData.quantity * Number(selectedItem.averageCost)
                      ).toFixed(2)}
                    </strong>
                  </div>
                </div>
              )}

              <div className="flex justify-end gap-2 pt-4">
                <Button variant="outline" asChild>
                  <Link href="/dashboard/inventory">Cancel</Link>
                </Button>
                <Button onClick={handleSubmit} disabled={isSubmitting}>
                  {isSubmitting && (
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  )}
                  Issue Stock
                </Button>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
