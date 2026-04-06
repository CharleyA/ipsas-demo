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
import { Loader2, Save, Search, CheckCircle2, Send, Printer, FileDown } from "lucide-react";

export default function StockTakePage() {
  const { token } = useAuth() as any;
  const [items, setItems] = useState<any[]>([]);
  const [sessions, setSessions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [search, setSearch] = useState("");
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [sessionStatus, setSessionStatus] = useState<string>("DRAFT");
  const [referenceId, setReferenceId] = useState(`STOCKTAKE-${new Date().toISOString().slice(0,10)}`);
  const [movementDate, setMovementDate] = useState(new Date().toISOString().slice(0,10));
  const [sessionNotes, setSessionNotes] = useState("");
  const [physical, setPhysical] = useState<Record<string, string>>({});
  const [notes, setNotes] = useState<Record<string, string>>({});

  async function loadList() {
    const res = await fetch('/api/inventory/stock-take', { headers: { Authorization: `Bearer ${token}` } });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Failed to load stock take');
    setItems(Array.isArray(data.items) ? data.items : []);
    setSessions(Array.isArray(data.sessions) ? data.sessions : []);
  }

  useEffect(() => {
    if (!token) return;
    (async () => {
      setLoading(true);
      try { await loadList(); }
      catch (e: any) { toast.error(e.message || 'Failed to load stock take'); }
      finally { setLoading(false); }
    })();
  }, [token]);

  const filtered = useMemo(() => items.filter((i) => (`${i.code} ${i.name} ${i.category?.name || ''}`).toLowerCase().includes(search.toLowerCase())), [items, search]);
  const rows = filtered.map((i) => {
    const systemQty = Number(i.quantityOnHand || 0);
    const physicalQty = physical[i.id] === undefined || physical[i.id] === '' ? systemQty : Number(physical[i.id]);
    const variance = physicalQty - systemQty;
    return { ...i, systemQty, physicalQty, variance };
  });
  const changedRows = rows.filter((r) => Number.isFinite(r.physicalQty) && r.variance !== 0);

  function exportCSV() {
    const headers = ["Item Code","Item Name","Category","System Qty","Physical Qty","Variance","Notes"];
    const dataRows = rows.map((r) => [
      r.code,
      r.name,
      r.category?.name || '',
      r.systemQty.toFixed(2),
      r.physicalQty.toFixed(2),
      r.variance.toFixed(2),
      (notes[r.id] || '').replace(/,/g, ';')
    ]);
    const csv = [headers, ...dataRows].map((r) => r.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${referenceId || 'stock-take'}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  function printSheet() {
    window.print();
  }

  async function openSession(id: string) {
    setBusy(true);
    try {
      const res = await fetch(`/api/inventory/stock-take?sessionId=${id}`, { headers: { Authorization: `Bearer ${token}` } });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to open session');
      setSessionId(id);
      setSessionStatus(data.session.status);
      setReferenceId(data.session.reference);
      setMovementDate(String(data.session.countDate).slice(0,10));
      setSessionNotes(data.session.notes || '');
      const nextPhysical: Record<string,string> = {};
      const nextNotes: Record<string,string> = {};
      for (const line of data.lines || []) {
        nextPhysical[line.itemId] = String(line.physicalQty);
        nextNotes[line.itemId] = line.notes || '';
      }
      setPhysical(nextPhysical);
      setNotes(nextNotes);
      toast.success('Stock take session loaded');
    } catch (e: any) {
      toast.error(e.message || 'Failed to open session');
    } finally {
      setBusy(false);
    }
  }

  async function saveSession() {
    setBusy(true);
    try {
      const payload = {
        action: 'save',
        sessionId,
        reference: referenceId,
        countDate: movementDate,
        notes: sessionNotes,
        lines: changedRows.map((r) => ({ itemId: r.id, systemQty: r.systemQty, physicalQty: r.physicalQty, variance: r.variance, notes: notes[r.id] || '' })),
      };
      const res = await fetch('/api/inventory/stock-take', {
        method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }, body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to save session');
      setSessionId(data.sessionId);
      setSessionStatus('COUNTED');
      await loadList();
      toast.success('Stock take session saved');
    } catch (e: any) {
      toast.error(e.message || 'Failed to save session');
    } finally {
      setBusy(false);
    }
  }

  async function approveSession() {
    if (!sessionId) return toast.error('Save the stock take first');
    setBusy(true);
    try {
      const res = await fetch('/api/inventory/stock-take', {
        method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }, body: JSON.stringify({ action: 'approve', sessionId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to approve session');
      setSessionStatus('APPROVED');
      await loadList();
      toast.success('Stock take approved');
    } catch (e: any) {
      toast.error(e.message || 'Failed to approve session');
    } finally {
      setBusy(false);
    }
  }

  async function postSession() {
    if (!sessionId) return toast.error('Save the stock take first');
    setBusy(true);
    try {
      const res = await fetch('/api/inventory/stock-take', {
        method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }, body: JSON.stringify({ action: 'post', sessionId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to post session');
      setSessionStatus('POSTED');
      await loadList();
      toast.success(`Posted ${data.posted} stock take adjustment(s)`);
    } catch (e: any) {
      toast.error(e.message || 'Failed to post session');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-6 print:space-y-3 print:p-6">
      <div className="flex items-center justify-between print:block">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Stock Take</h1>
          <p className="text-muted-foreground print:text-black">Save sessions, review variances, add sign-off context, approve, post, print, or export the stock take sheet.</p>
        </div>
        <div className="flex gap-2 print:hidden">
          <Badge variant="secondary">Status: {sessionStatus}</Badge>
          <Button asChild variant="outline"><Link href="/dashboard/inventory/movements">View Movements</Link></Button>
          <Button variant="outline" onClick={exportCSV}><FileDown className="w-4 h-4 mr-2" />Export CSV</Button>
          <Button variant="outline" onClick={printSheet}><Printer className="w-4 h-4 mr-2" />Print</Button>
        </div>
      </div>

      <Card className="print:hidden">
        <CardHeader>
          <CardTitle>Saved Sessions</CardTitle>
          <CardDescription>Reopen recent stock take sessions.</CardDescription>
        </CardHeader>
        <CardContent>
          {sessions.length === 0 ? <p className="text-sm text-muted-foreground">No saved stock take sessions yet.</p> : (
            <div className="space-y-2">
              {sessions.slice(0, 8).map((s) => (
                <div key={s.id} className="flex items-center justify-between rounded border p-3">
                  <div>
                    <div className="font-medium">{s.reference}</div>
                    <div className="text-xs text-muted-foreground">{String(s.countDate).slice(0,10)} · {s.status} · {s.lineCount} lines</div>
                  </div>
                  <Button size="sm" variant="outline" onClick={() => openSession(s.id)} disabled={busy}>Open</Button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Stock Take Header</CardTitle>
          <CardDescription className="print:text-black">Save the count first, then approve and post it.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-4 print:grid-cols-4">
          <div><Label>Reference</Label><Input value={referenceId} onChange={(e) => setReferenceId(e.target.value)} /></div>
          <div><Label>Count Date</Label><Input type="date" value={movementDate} onChange={(e) => setMovementDate(e.target.value)} /></div>
          <div className="print:hidden"><Label>Search Items</Label><div className="relative"><Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" /><Input className="pl-8" value={search} onChange={(e) => setSearch(e.target.value)} /></div></div>
          <div><Label>Session Notes / Sign-off Context</Label><Input value={sessionNotes} onChange={(e) => setSessionNotes(e.target.value)} placeholder="e.g. Counted by Admin Clerk, checked with Stores Officer" /></div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Variance Review</CardTitle>
          <CardDescription className="print:text-black">Variance = Physical − System. Save first, approve second, post last.</CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? <div className="flex justify-center py-10"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div> : (
            <>
              <div className="mb-4 flex items-center gap-3 text-sm print:hidden">
                <Badge variant="secondary">Items: {rows.length}</Badge>
                <Badge variant={changedRows.length ? 'destructive' : 'secondary'}>Variances: {changedRows.length}</Badge>
              </div>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Item</TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead className="text-right">System Qty</TableHead>
                    <TableHead className="text-right">Physical Qty</TableHead>
                    <TableHead className="text-right">Variance</TableHead>
                    <TableHead>Notes</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rows.map((r) => (
                    <TableRow key={r.id}>
                      <TableCell><div className="font-medium">{r.name}</div><div className="text-xs text-muted-foreground">{r.code}</div></TableCell>
                      <TableCell>{r.category?.name || '-'}</TableCell>
                      <TableCell className="text-right font-mono">{r.systemQty.toFixed(2)}</TableCell>
                      <TableCell className="text-right"><Input type="number" step="0.01" value={physical[r.id] ?? r.systemQty} onChange={(e) => setPhysical((p) => ({ ...p, [r.id]: e.target.value }))} className="w-28 ml-auto text-right" disabled={sessionStatus === 'POSTED'} /></TableCell>
                      <TableCell className={`text-right font-mono ${r.variance > 0 ? 'text-green-600' : r.variance < 0 ? 'text-red-600' : 'text-muted-foreground'}`}>{r.variance > 0 ? '+' : ''}{r.variance.toFixed(2)}</TableCell>
                      <TableCell><Input value={notes[r.id] ?? ''} onChange={(e) => setNotes((n) => ({ ...n, [r.id]: e.target.value }))} placeholder="Optional variance note" disabled={sessionStatus === 'POSTED'} /></TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>

              <div className="mt-6 flex justify-end gap-2 print:hidden">
                <Button onClick={saveSession} disabled={busy || changedRows.length === 0 || sessionStatus === 'POSTED'}>
                  {busy ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}Save Session
                </Button>
                <Button onClick={approveSession} variant="outline" disabled={busy || !sessionId || sessionStatus === 'APPROVED' || sessionStatus === 'POSTED'}>
                  <CheckCircle2 className="w-4 h-4 mr-2" />Approve
                </Button>
                <Button onClick={postSession} disabled={busy || !sessionId || sessionStatus !== 'APPROVED'}>
                  <Send className="w-4 h-4 mr-2" />Post Approved Session
                </Button>
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
