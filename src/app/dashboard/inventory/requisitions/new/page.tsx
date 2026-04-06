"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowLeft, Loader2, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/components/providers/auth-provider";

export default function NewRequisitionPage() {
  const router = useRouter();
  const { token } = useAuth();
  const [items, setItems] = useState<any[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({
    department: "",
    requestDate: new Date().toISOString().split("T")[0],
    requiredDate: "",
    notes: "",
  });
  const [lines, setLines] = useState([{ itemId: "", qtyRequested: "1", notes: "" }]);

  useEffect(() => {
    if (!token) return;
    fetch("/api/inventory/items", { headers: { Authorization: `Bearer ${token}` } })
      .then((r) => r.json())
      .then((d) => setItems(Array.isArray(d) ? d.filter((i: any) => i.isActive) : []))
      .catch(() => toast.error("Failed to load items"));
  }, [token]);

  function addLine() {
    setLines((l) => [...l, { itemId: "", qtyRequested: "1", notes: "" }]);
  }

  function removeLine(idx: number) {
    setLines((l) => l.filter((_, i) => i !== idx));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const validLines = lines.filter((l) => l.itemId && parseFloat(l.qtyRequested) > 0);
    if (validLines.length === 0) { toast.error("Add at least one item line"); return; }

    setSubmitting(true);
    try {
      const res = await fetch("/api/inventory/requisitions", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          ...form,
          requiredDate: form.requiredDate || undefined,
          lines: validLines.map((l) => ({
            itemId: l.itemId,
            qtyRequested: parseFloat(l.qtyRequested),
            notes: l.notes || undefined,
          })),
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to submit");
      toast.success(`Requisition ${data.reqNumber} submitted`);
      router.push(`/dashboard/inventory/requisitions/${data.id}`);
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="space-y-6 p-6 max-w-3xl mx-auto">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" asChild>
          <Link href="/dashboard/inventory/requisitions"><ArrowLeft className="w-4 h-4" /></Link>
        </Button>
        <div>
          <h1 className="text-2xl font-bold">New Stock Requisition</h1>
          <p className="text-muted-foreground">Request stock items from stores.</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <Card>
          <CardHeader><CardTitle>Requisition Details</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="department">Department / Requester</Label>
                <Input id="department" value={form.department}
                  onChange={(e) => setForm((f) => ({ ...f, department: e.target.value }))}
                  placeholder="e.g. Science Dept, Admin" className="mt-1" />
              </div>
              <div>
                <Label htmlFor="requestDate">Request Date</Label>
                <Input id="requestDate" type="date" value={form.requestDate}
                  onChange={(e) => setForm((f) => ({ ...f, requestDate: e.target.value }))} className="mt-1" />
              </div>
              <div>
                <Label htmlFor="requiredDate">Required By (optional)</Label>
                <Input id="requiredDate" type="date" value={form.requiredDate}
                  onChange={(e) => setForm((f) => ({ ...f, requiredDate: e.target.value }))} className="mt-1" />
              </div>
            </div>
            <div>
              <Label htmlFor="notes">Notes</Label>
              <Textarea id="notes" value={form.notes}
                onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
                placeholder="Reason for request or additional notes..." className="mt-1" rows={2} />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0">
            <CardTitle>Requested Items</CardTitle>
            <Button type="button" variant="outline" size="sm" onClick={addLine}>
              <Plus className="w-4 h-4 mr-1" />Add Item
            </Button>
          </CardHeader>
          <CardContent className="space-y-3">
            {lines.map((line, idx) => (
              <div key={idx} className="grid grid-cols-12 gap-3 items-end border rounded-lg p-3">
                <div className="col-span-6">
                  <Label className="text-xs">Item</Label>
                  <Select value={line.itemId} onValueChange={(v) => {
                    const updated = [...lines];
                    updated[idx] = { ...updated[idx], itemId: v };
                    setLines(updated);
                  }}>
                    <SelectTrigger className="mt-1">
                      <SelectValue placeholder="Select item..." />
                    </SelectTrigger>
                    <SelectContent>
                      {items.map((item) => (
                        <SelectItem key={item.id} value={item.id}>
                          {item.code} — {item.name} ({Number(item.quantityOnHand).toFixed(0)} {item.unitOfMeasure})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="col-span-2">
                  <Label className="text-xs">Qty</Label>
                  <Input type="number" min="0.01" step="0.01" value={line.qtyRequested}
                    onChange={(e) => {
                      const updated = [...lines];
                      updated[idx] = { ...updated[idx], qtyRequested: e.target.value };
                      setLines(updated);
                    }} className="mt-1" />
                </div>
                <div className="col-span-3">
                  <Label className="text-xs">Notes</Label>
                  <Input value={line.notes} placeholder="Optional"
                    onChange={(e) => {
                      const updated = [...lines];
                      updated[idx] = { ...updated[idx], notes: e.target.value };
                      setLines(updated);
                    }} className="mt-1" />
                </div>
                <div className="col-span-1">
                  <Button type="button" variant="ghost" size="icon"
                    onClick={() => removeLine(idx)} disabled={lines.length === 1}>
                    <Trash2 className="w-4 h-4 text-destructive" />
                  </Button>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        <div className="flex justify-end gap-3">
          <Button type="button" variant="outline" asChild>
            <Link href="/dashboard/inventory/requisitions">Cancel</Link>
          </Button>
          <Button type="submit" disabled={submitting}>
            {submitting ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
            Submit Requisition
          </Button>
        </div>
      </form>
    </div>
  );
}
