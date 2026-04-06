"use client";

import { useEffect, useState, useRef } from "react";
import Link from "next/link";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Upload, Download, CheckCircle2, XCircle, Loader2, FileSpreadsheet } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/components/providers/auth-provider";

const REQUIRED_COLUMNS = ["categoryId", "description", "acquisitionDate", "acquisitionCost"];
const ALL_COLUMNS = ["categoryId", "description", "acquisitionDate", "acquisitionCost", "serialNumber", "location", "custodian"];

const TEMPLATE_CSV = `categoryId,description,acquisitionDate,acquisitionCost,serialNumber,location,custodian
<category-id-here>,Dell Laptop 15",2024-01-15,1200.00,SN-123456,Admin Office,John Doe
<category-id-here>,Office Chair,2024-02-01,85.00,,Boardroom,`;

function parseCSV(text: string): { headers: string[]; rows: Record<string, string>[] } {
  const lines = text.trim().split("\n").filter(Boolean);
  if (lines.length < 2) return { headers: [], rows: [] };
  const headers = lines[0].split(",").map((h) => h.trim().replace(/^"|"$/g, ""));
  const rows = lines.slice(1).map((line) => {
    const values = line.split(",").map((v) => v.trim().replace(/^"|"$/g, ""));
    const row: Record<string, string> = {};
    headers.forEach((h, i) => { row[h] = values[i] || ""; });
    return row;
  });
  return { headers, rows };
}

export default function AssetImportPage() {
  const { token } = useAuth();
  const fileRef = useRef<HTMLInputElement>(null);
  const [categories, setCategories] = useState<any[]>([]);
  const [parsed, setParsed] = useState<{ headers: string[]; rows: Record<string, string>[] } | null>(null);
  const [fileName, setFileName] = useState("");
  const [importing, setImporting] = useState(false);
  const [results, setResults] = useState<{ succeeded: number; failed: number; results: any[] } | null>(null);
  const [errors, setErrors] = useState<string[]>([]);

  useEffect(() => {
    if (!token) return;
    fetch("/api/assets/categories", { headers: { Authorization: `Bearer ${token}` } })
      .then((r) => r.json())
      .then((d) => setCategories(Array.isArray(d) ? d : []));
  }, [token]);

  function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setFileName(file.name);
    setResults(null);
    setErrors([]);

    const reader = new FileReader();
    reader.onload = (ev) => {
      const text = ev.target?.result as string;
      const { headers, rows } = parseCSV(text);

      // Validate headers
      const missing = REQUIRED_COLUMNS.filter((c) => !headers.includes(c));
      if (missing.length > 0) {
        setErrors([`Missing required columns: ${missing.join(", ")}`]);
        setParsed(null);
        return;
      }

      // Validate rows
      const rowErrors: string[] = [];
      rows.forEach((row, i) => {
        if (!row.categoryId) rowErrors.push(`Row ${i + 2}: categoryId is required`);
        if (!row.description) rowErrors.push(`Row ${i + 2}: description is required`);
        if (!row.acquisitionDate) rowErrors.push(`Row ${i + 2}: acquisitionDate is required`);
        if (!row.acquisitionCost || isNaN(parseFloat(row.acquisitionCost))) rowErrors.push(`Row ${i + 2}: acquisitionCost must be a number`);
      });
      setErrors(rowErrors.slice(0, 10));
      setParsed({ headers, rows });
    };
    reader.readAsText(file);
  }

  async function handleImport() {
    if (!parsed || parsed.rows.length === 0) return;
    setImporting(true);
    try {
      const res = await fetch("/api/assets/import", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ rows: parsed.rows }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Import failed");
      setResults(data);
      setParsed(null);
      if (data.succeeded > 0) toast.success(`${data.succeeded} asset(s) imported successfully`);
      if (data.failed > 0) toast.error(`${data.failed} row(s) failed — see details below`);
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setImporting(false);
    }
  }

  function downloadTemplate() {
    const blob = new Blob([TEMPLATE_CSV], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = "asset_import_template.csv"; a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="space-y-6 p-6 max-w-4xl mx-auto">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" asChild>
          <Link href="/dashboard/assets"><ArrowLeft className="w-4 h-4" /></Link>
        </Button>
        <div>
          <h1 className="text-2xl font-bold">Bulk Asset Import</h1>
          <p className="text-muted-foreground">Import multiple assets from a CSV file.</p>
        </div>
      </div>

      {/* Step 1: Download template */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Step 1 — Download Template</CardTitle>
          <CardDescription>Use the template to ensure your CSV has the correct columns.</CardDescription>
        </CardHeader>
        <CardContent className="flex items-center justify-between">
          <div className="text-sm space-y-1">
            <p><span className="font-medium">Required:</span> {REQUIRED_COLUMNS.join(", ")}</p>
            <p><span className="font-medium">Optional:</span> serialNumber, location, custodian</p>
            <p className="text-muted-foreground text-xs mt-2">
              Use the exact categoryId from your asset categories. Get IDs from the categories page.
            </p>
          </div>
          <Button variant="outline" onClick={downloadTemplate}>
            <Download className="w-4 h-4 mr-2" />Download Template
          </Button>
        </CardContent>
      </Card>

      {/* Categories reference */}
      {categories.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Asset Category IDs</CardTitle>
            <CardDescription>Use these IDs in the categoryId column of your CSV.</CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader><TableRow><TableHead>Category Name</TableHead><TableHead>ID (copy into CSV)</TableHead></TableRow></TableHeader>
              <TableBody>
                {categories.map((c) => (
                  <TableRow key={c.id}>
                    <TableCell className="font-medium">{c.name}</TableCell>
                    <TableCell className="font-mono text-xs text-muted-foreground">{c.id}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {/* Step 2: Upload */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Step 2 — Upload CSV</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div
            className="border-2 border-dashed rounded-lg p-8 text-center cursor-pointer hover:bg-muted/30 transition-colors"
            onClick={() => fileRef.current?.click()}
          >
            <FileSpreadsheet className="w-10 h-10 mx-auto text-muted-foreground mb-3" />
            <p className="font-medium">{fileName || "Click to select CSV file"}</p>
            <p className="text-sm text-muted-foreground mt-1">or drag and drop your .csv file here</p>
            <input ref={fileRef} type="file" accept=".csv" className="hidden" onChange={handleFile} />
          </div>

          {errors.length > 0 && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-3 space-y-1">
              {errors.map((e, i) => <p key={i} className="text-sm text-red-700">{e}</p>)}
            </div>
          )}

          {parsed && parsed.rows.length > 0 && errors.length === 0 && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <p className="text-sm font-medium">{parsed.rows.length} rows ready to import</p>
                <Button onClick={handleImport} disabled={importing}>
                  {importing ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Upload className="w-4 h-4 mr-2" />}
                  Import {parsed.rows.length} Assets
                </Button>
              </div>
              <div className="overflow-x-auto rounded border">
                <Table>
                  <TableHeader>
                    <TableRow>{ALL_COLUMNS.map((c) => <TableHead key={c} className="text-xs">{c}</TableHead>)}</TableRow>
                  </TableHeader>
                  <TableBody>
                    {parsed.rows.slice(0, 5).map((row, i) => (
                      <TableRow key={i}>
                        {ALL_COLUMNS.map((c) => <TableCell key={c} className="text-xs">{row[c] || "-"}</TableCell>)}
                      </TableRow>
                    ))}
                    {parsed.rows.length > 5 && (
                      <TableRow><TableCell colSpan={ALL_COLUMNS.length} className="text-xs text-muted-foreground text-center">... and {parsed.rows.length - 5} more rows</TableCell></TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Results */}
      {results && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Import Results</CardTitle>
            <CardDescription>
              <span className="text-green-600 font-medium">{results.succeeded} succeeded</span>
              {results.failed > 0 && <span className="text-red-600 font-medium ml-3">{results.failed} failed</span>}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader><TableRow><TableHead>Row</TableHead><TableHead>Status</TableHead><TableHead>Asset Number / Error</TableHead></TableRow></TableHeader>
              <TableBody>
                {results.results.map((r: any) => (
                  <TableRow key={r.row}>
                    <TableCell>{r.row}</TableCell>
                    <TableCell>
                      {r.success
                        ? <Badge className="bg-green-100 text-green-800"><CheckCircle2 className="w-3 h-3 mr-1" />Success</Badge>
                        : <Badge className="bg-red-100 text-red-800"><XCircle className="w-3 h-3 mr-1" />Failed</Badge>}
                    </TableCell>
                    <TableCell className={r.success ? "font-medium" : "text-red-600 text-sm"}>
                      {r.success ? r.assetNumber : r.error}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            <div className="mt-4 flex gap-3">
              <Button asChild><Link href="/dashboard/assets/register">View Asset Register</Link></Button>
              <Button variant="outline" onClick={() => { setResults(null); setFileName(""); if (fileRef.current) fileRef.current.value = ""; }}>Import More</Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
