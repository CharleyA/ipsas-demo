"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/components/providers/auth-provider";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { toast } from "sonner";

export default function GuardiansPage() {
  const { token } = useAuth();
  const [guardians, setGuardians] = useState<any[]>([]);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    fullName: "",
    relationship: "",
    primaryPhone: "",
    secondaryPhone: "",
    address: "",
    email: "",
  });

  const load = async () => {
    try {
      const res = await fetch("/api/guardians", { headers: { Authorization: `Bearer ${token}` } });
      const data = await res.json();
      setGuardians(Array.isArray(data) ? data : []);
    } catch {
      toast.error("Failed to load guardians");
    }
  };

  useEffect(() => {
    if (token) load();
  }, [token]);

  const createGuardian = async () => {
    setSaving(true);
    try {
      const res = await fetch("/api/guardians", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to create guardian");
      toast.success("Guardian created");
      setForm({ fullName: "", relationship: "", primaryPhone: "", secondaryPhone: "", address: "", email: "" });
      await load();
    } catch (e: any) {
      toast.error(e.message || "Failed to create guardian");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Guardians</h1>
        <p className="text-muted-foreground">Manage guardian contact records and student links.</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Add Guardian</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <Input placeholder="Full name" value={form.fullName} onChange={(e) => setForm({ ...form, fullName: e.target.value })} />
          <Input placeholder="Relationship" value={form.relationship} onChange={(e) => setForm({ ...form, relationship: e.target.value })} />
          <Input placeholder="Primary phone" value={form.primaryPhone} onChange={(e) => setForm({ ...form, primaryPhone: e.target.value })} />
          <Input placeholder="Secondary phone (optional)" value={form.secondaryPhone} onChange={(e) => setForm({ ...form, secondaryPhone: e.target.value })} />
          <Input placeholder="Email (optional)" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
          <Input placeholder="Address (optional)" value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} />
          <div className="md:col-span-2">
            <Button disabled={saving} onClick={createGuardian}>Create Guardian</Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Guardian Directory</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Relationship</TableHead>
                <TableHead>Primary Phone</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Linked Students</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {guardians.map((g) => (
                <TableRow key={g.id}>
                  <TableCell>{g.fullName}</TableCell>
                  <TableCell>{g.relationship}</TableCell>
                  <TableCell>{g.primaryPhone}</TableCell>
                  <TableCell>{g.email || "-"}</TableCell>
                  <TableCell>{g.studentLinks?.length || 0}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
