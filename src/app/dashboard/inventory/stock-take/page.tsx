"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useAuth } from "@/components/providers/auth-provider";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import {
  Loader2, Save, Search, CheckCircle2, Send, Printer, FileDown,
  Plus, ClipboardList, ArrowRight, RotateCcw,
} from "lucide-react";

const STATUS_COLORS: Record<string, string> = {
  DRAFT:    "bg-gray-100 text-gray-700",
  COUNTED:  "bg-blue-100 text-blue-800",
  APPROVED: "bg-green-100 text-green-800",
  POSTED:   "bg-purple-100 text-purple-800",
};

const STEPS = [
  { key: "DRAFT",    label: "1. Start", desc: "Enter counts" },
  { key: "COUNTED",  label: "2. Save",  desc: "Review variances" },
  { key: "APPROVED", label: "3. Approve", desc: "Sign off" },
  { key: "POSTED",   label: "4. Post", desc: "Update stock" },
];

export default function StockTakePage() {
  const { token } = useAuth() as any;
  const [items, setItems] = useState<any[]>([]);
  const [sessions, setSessions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [search, setSearch] = useState("");

  // Active session state
  const [activeSession, setActiveSession] = useState(false);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [sessionStatus, setSessionStatus] = useState<string>("DRAFT");
  const [referenceId, setReferenceId] = useState(`STKTAKE-${new Date().toISOString().slice(0, 10)}`);
  const [movementDate, setMovementDate] = useState(new Date().toISOString().slice(0, 10));
  const [sessionNotes, setSessionNotes] = useState("");
  const [physical, setPhysical] = useState<Record<string, string>>({});
  const [notes, setNotes] = useState<Record<string, string>>({});

  async function loadList() {
    const res = await fetch("/api/inventory/stock-take", { headers: { Authorization: `Bearer ${token}` } });
    if (!res.ok) throw new Error("Failed to load stock take");
    const data = await res.json();
    setItems(Array.isArray(data.items) ? data.items : []);
    setSessions(Array.isArray(data.sessions) ? data.sessions : []);
  }

  useEffect(() => {
    if (!token) return;
    (async () => {
      setLoading(true);
      try { await loadList(); }
      catch (e: any) { toast.error(e.message); }
      finally { setLoading(false); }
    })();
  }, [token]);

  function startNew() {
    setSessionId(null);
    setSessionStatus("DRAFT");
    setReferenceId(`STKTAKE-${new Date().toISOString().slice(0, 10)}`);
    setMovementDate(new Date().toISOString().slice(0, 10));
    setSessionNotes("");
    setPhysical({});
    setNotes({});
    setActiveSession(true);
  }

  function cancelSession() {
    setActiveSession(false);
    setSessionId(null);
    setSessionStatus("DRAFT");
    setPhysical({});
    setNotes({});
  }

  async function openSession(id: string) {
    setBusy(true);
    try {
      const res = await fetch(`/api/inventory/stock-take?sessionId=${id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to open session");
      setSessionId(id);
      setSessionStatus(data.session.status);
      setReferenceId(data.session.reference);
      setMovementDate(String(data.session.countDate).slice(0, 10));
      setSessionNotes(data.session.notes || "");
      const nextPhysical: Record<string, string> = {};
      const nextNotes: Record<string, string> = {};
      for (const line of data.lines || []) {
        nextPhysical[line.itemId] = String(line.physicalQty);
        nextNotes[line.itemId] = line.notes || "";
      }
      setPhysical(nextPhysical);
      setNotes(nextNotes);
      setActiveSession(true);
      toast.success("Session loaded");
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setBusy(false);
    }
  }

  const filtered = useMemo(
    () => items.filter((i) =>
      `${i.code} ${i.name} ${i.category?.name || ""}`.toLowerCase().includes(search.toLowerCase())
    ),
    [items, search]
  );

  const rows = filtered.map((i) => {
    const systemQty = Number(i.quantityOnHand || 0);
    const physicalQty =
      physical[i.id] === undefined || physical[i.id] === "" ? systemQty : Number(physical[i.id]);
    const variance = physicalQty - systemQty;
    return { ...i, systemQty, physicalQty, variance };
  });

  const changedRows = rows.filter((r) => Number.isFinite(r.physicalQty) && r.variance !== 0);
  const isPosted = sessionStatus === "POSTED";
  const isApproved = sessionStatus === "APPROVED";

  function exportCSV() {
    const headers = ["Item Code", "Item Name", "Category", "System Qty", "Physical Qty", "Variance", "Notes"];
    const dataRows = rows.map((r) => [
      r.code, r.name, r.category?.name || "", r.systemQty.toFixed(2),
      r.physicalQty.toFixed(2), r.variance.toFixed(2), (notes[r.id] || "").replace(/,/g, ";"),
    ]);
    const csv = [headers, ...dataRows].map((r) => r.join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = `${referenceId || "stock-take"}.csv`; a.click();
    URL.revokeObjectURL(url);
  }

  async function saveSession() {
    if (!referenceId) return toast.error("Enter a reference first");
    setBusy(true);
    try {
      const payload = {
        action: "save", sessionId, reference: referenceId, countDate: movementDate,
        notes: sessionNotes,
        lines: changedRows.map((r) => ({
          itemId: r.id, systemQty: r.systemQty, physicalQty: r.physicalQty,
          variance: r.variance, notes: notes[r.id] || "",
        })),
      };
      const res = await fetch("/api/inventory/stock-take", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to save");
      setSessionId(data.sessionId);
      setSessionStatus("COUNTED");
      await loadList();
      toast.success("Stock take saved — ready to approve");
    } catch (e: any) { toast.error(e.message); }
    finally { setBusy(false); }
  }

  async function approveSession() {
    if (!sessionId) return toast.error("Save the stock take first");
    setBusy(true);
    try {
      const res = await fetch("/api/inventory/stock-take", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ action: "approve", sessionId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to approve");
      setSessionStatus("APPROVED");
      await loadList();
      toast.success("Stock take approved — ready to post");
    } catch (e: any) { toast.error(e.message); }
    finally { setBusy(false); }
  }

  async function postSession() {
    if (!sessionId) return toast.error("Save the stock take first");
    setBusy(true);
    try {
      const res = await fetch("/api/inventory/stock-take", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ action: "post", sessionId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to post");
      setSessionStatus("POSTED");
      await loadList();
      toast.success(`Posted ${data.posted} adjustment(s) — stock balances updated`);
    } catch (e: any) { toast.error(e.message); }
    finally { setBusy(false); }
  }

  // ─── Landing screen (no active session) ───────────────────────────────────
  if (!activeSession) {
    return (
      <div className="space-y-6 p-2">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Stock Take</h1>
            <p className="text-muted-foreground">Count physical stock and post variance adjustments.</p>
          </div>
          <Button onClick={startNew} size="lg">
            <Plus className="w-4 h-4 mr-2" />New Stock Take
          </Button>
        </div>

        {/* Workflow steps */}
        <div className="grid grid-cols-4 gap-3">
          {STEPS.map((s, i) => (
            <Card key={s.key} className="border-dashed">
              <CardContent className="pt-5 pb-4">
                <div className="flex items-center gap-2 mb-1">
                  <div className="w-6 h-6 rounded-full bg-primary text-primary-foreground text-xs flex items-center justify-center font-bold">{i + 1}</div>
                  <span className="font-semibold text-sm">{s.label.replace(/^\d+\. /, "")}</span>
                  {i < STEPS.length - 1 && <ArrowRight className="w-3 h-3 text-muted-foreground ml-auto" />}
                </div>
                <p className="text-xs text-muted-foreground">{s.desc}</p>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Past sessions */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ClipboardList className="w-5 h-5" />Previous Sessions
            </CardTitle>
            <CardDescription>Reopen a saved session to continue or review it.</CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex justify-center py-8"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>
            ) : sessions.length === 0 ? (
              <div className="text-center py-10 text-muted-foreground">
                <ClipboardList className="w-10 h-10 mx-auto mb-3 opacity-30" />
                <p className="text-sm">No stock take sessions yet.</p>
                <Button className="mt-4" onClick={startNew}><Plus className="w-4 h-4 mr-2" />Start First Stock Take</Button>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Reference</TableHead>
                    <TableHead>Count Date</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Lines</TableHead>
                    <TableHead>Created By</TableHead>
                    <TableHead />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {sessions.map((s) => (
                    <TableRow key={s.id}>
                      <TableCell className="font-medium">{s.reference}</TableCell>
                      <TableCell>{String(s.countDate).slice(0, 10)}</TableCell>
                      <TableCell>
                        <Badge variant="secondary" className={STATUS_COLORS[s.status] || ""}>
                          {s.status}
                        </Badge>
                      </TableCell>
                      <TableCell>{s.lineCount}</TableCell>
                      <TableCell>{s.firstName} {s.lastName}</TableCell>
                      <TableCell className="text-right">
                        <Button size="sm" variant="outline" onClick={() => openSession(s.id)} disabled={busy}>
                          Open
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

  // ─── Active session screen ─────────────────────────────────────────────────
  return (
    <div className="space-y-6 print:space-y-3 print:p-6">
      {/* Header */}
      <div className="flex items-center justify-between print:block">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={cancelSession} className="print:hidden">
            <RotateCcw className="w-4 h-4" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Stock Take — {referenceId}</h1>
            <p className="text-muted-foreground text-sm print:text-black">
              {sessionId ? `Session ID: ${sessionId}` : "Unsaved session"}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 print:hidden">
          <Badge variant="secondary" className={STATUS_COLORS[sessionStatus] || ""}>
            {sessionStatus}
          </Badge>
          <Button variant="outline" size="sm" onClick={exportCSV}><FileDown className="w-4 h-4 mr-1" />CSV</Button>
          <Button variant="outline" size="sm" onClick={() => window.print()}><Printer className="w-4 h-4 mr-1" />Print</Button>
        </div>
      </div>

      {/* Progress steps */}
      <div className="flex items-center gap-1 print:hidden">
        {STEPS.map((s, i) => {
          const stepIdx = STEPS.findIndex((x) => x.key === sessionStatus);
          const done = i < stepIdx || isPosted;
          const active = s.key === sessionStatus;
          return (
            <div key={s.key} className="flex items-center gap-1">
              <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium
                ${done ? "bg-green-100 text-green-700" : active ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"}`}>
                {done && <CheckCircle2 className="w-3 h-3" />}
                {s.label}
              </div>
              {i < STEPS.length - 1 && <ArrowRight className="w-3 h-3 text-muted-foreground" />}
            </div>
          );
        })}
      </div>

      {/* Session header */}
      <Card>
        <CardContent className="pt-5 grid gap-4 md:grid-cols-4">
          <div>
            <Label>Reference</Label>
            <Input value={referenceId} onChange={(e) => setReferenceId(e.target.value)} disabled={isPosted} />
          </div>
          <div>
            <Label>Count Date</Label>
            <Input type="date" value={movementDate} onChange={(e) => setMovementDate(e.target.value)} disabled={isPosted} />
          </div>
          <div className="print:hidden">
            <Label>Search Items</Label>
            <div className="relative">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input className="pl-8" placeholder="Filter by code or name…" value={search}
                onChange={(e) => setSearch(e.target.value)} />
            </div>
          </div>
          <div>
            <Label>Notes / Sign-off Context</Label>
            <Input value={sessionNotes} onChange={(e) => setSessionNotes(e.target.value)}
              placeholder="e.g. Counted by Admin Clerk + Stores Officer" disabled={isPosted} />
          </div>
        </CardContent>
      </Card>

      {/* Count table */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Item Count Sheet</CardTitle>
              <CardDescription className="print:text-black">
                Enter the physical count for each item. Leave unchanged if count matches system.
              </CardDescription>
            </div>
            <div className="flex items-center gap-2 text-sm print:hidden">
              <Badge variant="secondary">{rows.length} items</Badge>
              <Badge variant={changedRows.length ? "destructive" : "secondary"}>
                {changedRows.length} variance{changedRows.length !== 1 ? "s" : ""}
              </Badge>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex justify-center py-10"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>
          ) : rows.length === 0 ? (
            <div className="text-center py-10 text-muted-foreground">
              <p>No inventory items found.</p>
              <Button asChild variant="outline" className="mt-3">
                <Link href="/dashboard/inventory/items/new">Add Inventory Items</Link>
              </Button>
            </div>
          ) : (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Code</TableHead>
                    <TableHead>Item</TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead>UoM</TableHead>
                    <TableHead className="text-right">System Qty</TableHead>
                    <TableHead className="text-right">Physical Qty</TableHead>
                    <TableHead className="text-right">Variance</TableHead>
                    <TableHead className="print:hidden">Notes</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rows.map((r) => (
                    <TableRow key={r.id} className={r.variance !== 0 ? "bg-amber-50/60" : ""}>
                      <TableCell className="font-mono text-xs">{r.code}</TableCell>
                      <TableCell className="font-medium">{r.name}</TableCell>
                      <TableCell className="text-muted-foreground text-sm">{r.category?.name || "—"}</TableCell>
                      <TableCell className="text-muted-foreground text-sm">{r.unitOfMeasure}</TableCell>
                      <TableCell className="text-right font-mono">{r.systemQty.toFixed(2)}</TableCell>
                      <TableCell className="text-right">
                        <Input
                          type="number" step="0.01" min="0"
                          value={physical[r.id] ?? r.systemQty}
                          onChange={(e) => setPhysical((p) => ({ ...p, [r.id]: e.target.value }))}
                          className="w-28 ml-auto text-right font-mono"
                          disabled={isPosted}
                        />
                      </TableCell>
                      <TableCell className={`text-right font-mono font-semibold
                        ${r.variance > 0 ? "text-green-600" : r.variance < 0 ? "text-red-600" : "text-muted-foreground"}`}>
                        {r.variance > 0 ? "+" : ""}{r.variance.toFixed(2)}
                      </TableCell>
                      <TableCell className="print:hidden">
                        <Input
                          value={notes[r.id] ?? ""} placeholder="Optional…"
                          onChange={(e) => setNotes((n) => ({ ...n, [r.id]: e.target.value }))}
                          disabled={isPosted}
                        />
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>

              {/* Action bar */}
              <div className="mt-6 flex items-center justify-between print:hidden">
                <Button variant="ghost" onClick={cancelSession} disabled={busy}>
                  ← Back to Sessions
                </Button>
                <div className="flex gap-2">
                  <Button onClick={saveSession}
                    disabled={busy || isPosted || !referenceId}>
                    {busy ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
                    Save Session
                  </Button>
                  <Button variant="outline" onClick={approveSession}
                    disabled={busy || !sessionId || isApproved || isPosted}>
                    <CheckCircle2 className="w-4 h-4 mr-2" />Approve
                  </Button>
                  <Button onClick={postSession}
                    disabled={busy || !sessionId || !isApproved}>
                    <Send className="w-4 h-4 mr-2" />Post to Stock
                  </Button>
                </div>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      <style jsx global>{`
        @media print {
          nav, header, footer, .print\\:hidden { display: none !important; }
          body { background: white !important; }
        }
      `}</style>
    </div>
  );
}
