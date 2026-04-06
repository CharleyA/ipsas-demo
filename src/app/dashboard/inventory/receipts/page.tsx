"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
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

export default function ReceiveStockPage() {
  const router = useRouter();
  const { token } = useAuth();
  const [items, setItems] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [formData, setFormData] = useState({
    itemId: "",
    quantity: 1,
    unitCost: 0,
    referenceType: "PURCHASE",
    referenceId: "",
    voucherId: "",
    notes: "",
    movementDate: new Date().toISOString().split("T")[0],
  });

  useEffect(() => {
    if (!token) return;
    setIsLoading(true);
    fetch("/api/inventory/items", {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((r) => r.json())
      .then((data) => setItems(Array.isArray(data) ? data.filter((i: any) => i.isActive) : []))
      .catch(() => toast.error("Failed to fetch inventory items"))
      .finally(() => setIsLoading(false));
  }, [token]);

  const selectedItem = items.find((i) => i.id === formData.itemId);

  const handleSubmit = async () => {
    if (!formData.itemId || !formData.quantity || formData.quantity <= 0) {
      toast.error("Please select an item and enter a valid quantity");
      return;
    }

    if (formData.unitCost < 0) {
      toast.error("Unit cost cannot be negative");
      return;
    }

    setIsSubmitting(true);
    try {
      const response = await fetch("/api/inventory/receipts", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          ...formData,
          quantity: Number(formData.quantity),
          unitCost: Number(formData.unitCost),
          referenceId: formData.referenceId || undefined,
          voucherId: formData.voucherId || undefined,
          notes: formData.notes || undefined,
        }),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || "Failed to receive stock");
      }

      toast.success("Stock received successfully");
      router.push("/dashboard/inventory/movements");
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
          <Link href="/dashboard/inventory/movements">
            <ArrowLeft className="w-4 h-4" />
          </Link>
        </Button>
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Receive Stock</h1>
          <p className="text-muted-foreground">
            Record stock received into inventory for an existing item.
          </p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Stock Receipt Details</CardTitle>
          <CardDescription>
            Select an existing stock item and capture the quantity and cost received.
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
                  onValueChange={(v) => setFormData({ ...formData, itemId: v })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select item to receive" />
                  </SelectTrigger>
                  <SelectContent>
                    {items.map((item) => (
                      <SelectItem key={item.id} value={item.id}>
                        {item.code} - {item.name} (On hand: {Number(item.quantityOnHand).toFixed(2)})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {selectedItem && (
                <div className="p-4 bg-muted rounded-lg">
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="text-muted-foreground">Current On Hand:</span>{" "}
                      <strong>
                        {Number(selectedItem.quantityOnHand).toFixed(2)} {selectedItem.unitOfMeasure}
                      </strong>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Current Avg Cost:</span>{" "}
                      <strong>${Number(selectedItem.averageCost).toFixed(2)}</strong>
                    </div>
                  </div>
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="quantity">Quantity Received *</Label>
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
                  <Label htmlFor="unitCost">Unit Cost *</Label>
                  <Input
                    id="unitCost"
                    type="number"
                    min="0"
                    step="0.01"
                    value={formData.unitCost}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        unitCost: parseFloat(e.target.value) || 0,
                      })
                    }
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="date">Receipt Date *</Label>
                  <Input
                    id="date"
                    type="date"
                    value={formData.movementDate}
                    onChange={(e) =>
                      setFormData({ ...formData, movementDate: e.target.value })
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label>Reference Type</Label>
                  <Select
                    value={formData.referenceType}
                    onValueChange={(v) => setFormData({ ...formData, referenceType: v })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="PURCHASE">Purchase</SelectItem>
                      <SelectItem value="OPENING_BALANCE">Opening Balance</SelectItem>
                      <SelectItem value="DONATION">Donation</SelectItem>
                      <SelectItem value="ADJUSTMENT">Adjustment</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="referenceId">Reference Number</Label>
                  <Input
                    id="referenceId"
                    value={formData.referenceId}
                    onChange={(e) =>
                      setFormData({ ...formData, referenceId: e.target.value })
                    }
                    placeholder="PO number, invoice number, GRN..."
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="voucherId">Voucher ID</Label>
                  <Input
                    id="voucherId"
                    value={formData.voucherId}
                    onChange={(e) =>
                      setFormData({ ...formData, voucherId: e.target.value })
                    }
                    placeholder="Optional voucher link"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="notes">Notes</Label>
                <Textarea
                  id="notes"
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  placeholder="Optional notes about this receipt"
                />
              </div>

              {selectedItem && formData.quantity > 0 && (
                <div className="p-4 bg-primary/5 border border-primary/20 rounded-lg">
                  <div className="text-sm">
                    <span className="text-muted-foreground">Receipt Value:</span>{" "}
                    <strong>${(formData.quantity * Number(formData.unitCost || 0)).toFixed(2)}</strong>
                  </div>
                  <div className="text-sm mt-1">
                    <span className="text-muted-foreground">Projected On Hand:</span>{" "}
                    <strong>{(Number(selectedItem.quantityOnHand) + Number(formData.quantity)).toFixed(2)} {selectedItem.unitOfMeasure}</strong>
                  </div>
                </div>
              )}

              <div className="flex justify-end gap-2 pt-4">
                <Button variant="outline" asChild>
                  <Link href="/dashboard/inventory/movements">Cancel</Link>
                </Button>
                <Button onClick={handleSubmit} disabled={isSubmitting}>
                  {isSubmitting && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                  Receive Stock
                </Button>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
