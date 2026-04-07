"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select";
import { ArrowLeft, Loader2, Plus, Trash2, Save } from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";
import { useAuth } from "@/components/providers/auth-provider";

export default function NewBillPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { token, user } = useAuth();
  
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [suppliers, setSuppliers] = useState<any[]>([]);
  const [accounts, setAccounts] = useState<any[]>([]);
  const [currencies, setCurrencies] = useState<any[]>([]);
  
  const [formData, setFormData] = useState({
    supplierId: searchParams.get("supplierId") || "",
    currencyCode: "ZWG",
    dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    lines: [
      { description: "", quantity: 1, unitPrice: 0, amount: 0, accountId: "" }
    ],
    description: "",
  });

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [supRes, accRes, curRes] = await Promise.all([
          fetch("/api/suppliers", { headers: { "Authorization": `Bearer ${token}` } }),
          fetch(`/api/accounts?organisationId=${user?.organisationId}`, { headers: { "Authorization": `Bearer ${token}` } }),
          fetch(`/api/organisations/${user?.organisationId}/currencies`, { headers: { "Authorization": `Bearer ${token}` } }),
        ]);
        const [supData, accData, curData] = await Promise.all([supRes.json(), accRes.json(), curRes.json()]);
        setSuppliers(supData);
        setAccounts(accData.filter((a: any) => a.type === "EXPENSE" || a.type === "ASSET"));
        setCurrencies(Array.isArray(curData) ? curData : (curData?.data ?? []));
      } catch (error) {
        toast.error("Failed to load form data");
      }
    };
    if (token && user) fetchData();
  }, [token, user]);

  const addLine = () => {
    setFormData({
      ...formData,
      lines: [...formData.lines, { description: "", quantity: 1, unitPrice: 0, amount: 0, accountId: "" }]
    });
  };

  const removeLine = (index: number) => {
    if (formData.lines.length === 1) return;
    const newLines = [...formData.lines];
    newLines.splice(index, 1);
    setFormData({ ...formData, lines: newLines });
  };

  const updateLine = (index: number, field: string, value: any) => {
    const newLines = [...formData.lines];
    const line = { ...newLines[index], [field]: value };
    
    if (field === "quantity" || field === "unitPrice") {
      line.amount = line.quantity * line.unitPrice;
    }
    
    newLines[index] = line;
    setFormData({ ...formData, lines: newLines });
  };

  const totalAmount = formData.lines.reduce((sum, line) => sum + line.amount, 0);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.supplierId) return toast.error("Please select a supplier");
    if (formData.lines.some(l => !l.accountId)) return toast.error("Please select an account for all lines");

    setIsSubmitting(true);
    try {
      const response = await fetch("/api/ap/bills", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify({
          ...formData,
          organisationId: user?.organisationId,
          dueDate: new Date(formData.dueDate).toISOString(),
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to create bill");
      }

      toast.success("Bill created successfully as draft");
      router.push("/dashboard/suppliers/" + formData.supplierId);
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto pb-12">
      <div className="flex items-center gap-4">
        <Button variant="outline" size="icon" onClick={() => router.back()}>
          <ArrowLeft className="w-4 h-4" />
        </Button>
        <h1 className="text-3xl font-bold tracking-tight">Create Supplier Bill</h1>
      </div>

      <form onSubmit={handleSubmit}>
        <Card>
          <CardHeader>
            <CardTitle>Bill Details</CardTitle>
            <CardDescription>
              Enter the supplier and line items for this bill.
            </CardDescription>
          </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="space-y-2">
                  <Label>Supplier</Label>
                  <Select 
                    value={formData.supplierId} 
                    onValueChange={(v) => setFormData({ ...formData, supplierId: v })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select supplier" />
                    </SelectTrigger>
                    <SelectContent>
                      {suppliers.map(s => (
                        <SelectItem key={s.id} value={s.id}>{s.name} ({s.code})</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Currency</Label>
                  <Select 
                    value={formData.currencyCode} 
                    onValueChange={(v) => setFormData({ ...formData, currencyCode: v })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select Currency" />
                    </SelectTrigger>
                    <SelectContent>
                      {currencies.map(c => (
                        <SelectItem key={c.currencyCode} value={c.currencyCode}>
                          {c.currencyCode} {c.isBaseCurrency ? "(Base)" : ""}
                        </SelectItem>
                      ))}
                      {currencies.length === 0 && (
                        <>
                          <SelectItem value="ZWG">ZWG</SelectItem>
                          <SelectItem value="USD">USD</SelectItem>
                        </>
                      )}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Due Date</Label>
                  <Input
                    type="date"
                    value={formData.dueDate}
                    onChange={(e) => setFormData({ ...formData, dueDate: e.target.value })}
                    required
                  />
                </div>
              </div>


            <div className="space-y-4">
              <Label>Line Items</Label>
              {formData.lines.map((line, index) => (
                <div key={index} className="grid grid-cols-12 gap-2 items-end border-b pb-4">
                  <div className="col-span-4 space-y-1">
                    <Label className="text-xs">Description</Label>
                    <Input
                      placeholder="Item description"
                      value={line.description}
                      onChange={(e) => updateLine(index, "description", e.target.value)}
                      required
                    />
                  </div>
                  <div className="col-span-3 space-y-1">
                    <Label className="text-xs">Account</Label>
                    <Select 
                      value={line.accountId} 
                      onValueChange={(v) => updateLine(index, "accountId", v)}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Account" />
                      </SelectTrigger>
                      <SelectContent>
                        {accounts.map(a => (
                          <SelectItem key={a.id} value={a.id}>{a.code} - {a.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="col-span-1 space-y-1">
                    <Label className="text-xs">Qty</Label>
                    <Input
                      type="number"
                      value={line.quantity}
                      onChange={(e) => updateLine(index, "quantity", parseFloat(e.target.value))}
                      required
                    />
                  </div>
                  <div className="col-span-2 space-y-1">
                    <Label className="text-xs">Unit Price</Label>
                    <Input
                      type="number"
                      step="0.01"
                      value={line.unitPrice}
                      onChange={(e) => updateLine(index, "unitPrice", parseFloat(e.target.value))}
                      required
                    />
                  </div>
                  <div className="col-span-1 py-2 text-right font-medium">
                    {line.amount.toFixed(2)}
                  </div>
                  <div className="col-span-1 flex justify-end">
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      className="text-destructive"
                      onClick={() => removeLine(index)}
                      type="button"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              ))}
              <Button type="button" variant="outline" size="sm" onClick={addLine}>
                <Plus className="w-4 h-4 mr-2" /> Add Line
              </Button>
            </div>

            <div className="flex justify-end pt-4">
              <div className="text-right space-y-1">
                <div className="text-sm text-muted-foreground">Total Amount</div>
                <div className="text-2xl font-bold">{formData.currencyCode} {totalAmount.toLocaleString(undefined, { minimumFractionDigits: 2 })}</div>
              </div>
            </div>
          </CardContent>
          <CardFooter className="flex justify-end gap-2 border-t pt-6">
            <Button variant="outline" type="button" onClick={() => router.back()}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <Save className="w-4 h-4 mr-2" />
              )}
              Save Draft Bill
            </Button>
          </CardFooter>
        </Card>
      </form>
    </div>
  );
}
