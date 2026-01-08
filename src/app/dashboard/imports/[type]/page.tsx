"use client";

import { useState, use } from "react";
import { useRouter } from "next/navigation";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
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
import { 
  Download, 
  Upload, 
  CheckCircle2, 
  AlertCircle, 
  Loader2, 
  ArrowLeft,
  FileSpreadsheet,
  FileText
} from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";
import { useAuth } from "@/components/providers/auth-provider";
import { Badge } from "@/components/ui/badge";

export default function ImportTypePage({ params }: { params: Promise<{ type: string }> }) {
  const { type } = use(params);
  const router = useRouter();
  const { token } = useAuth();
  
  const [file, setFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [isCommitting, setIsCommitting] = useState(false);
  const [previewData, setPreviewData] = useState<any>(null);
  const [result, setResult] = useState<any>(null);

  const importLabel = type.replace("_", " ").toUpperCase();

  const handleDownloadTemplate = (format: 'csv' | 'xlsx') => {
    window.open(`/api/import/templates/${type}?format=${format}`, '_blank');
  };

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file) return;

    setIsUploading(true);
    const formData = new FormData();
    formData.append("file", file);

    try {
      const response = await fetch(`/api/import/${type}`, {
        method: "POST",
        headers: { "Authorization": `Bearer ${token}` },
        body: formData,
      });

      if (!response.ok) throw new Error("Upload failed");
      
      const data = await response.json();
      setPreviewData(data);
      toast.success("File uploaded and validated");
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setIsUploading(false);
    }
  };

  const handleCommit = async () => {
    if (!previewData?.jobId) return;

    setIsCommitting(true);
    try {
      const response = await fetch(`/api/import/commit/${previewData.jobId}`, {
        method: "POST",
        headers: { "Authorization": `Bearer ${token}` },
      });

      if (!response.ok) throw new Error("Commit failed");
      
      const data = await response.json();
      setResult(data);
      toast.success("Import completed");
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setIsCommitting(false);
    }
  };

  const handleDownloadErrors = () => {
    if (!previewData?.jobId) return;
    window.open(`/api/import/jobs/${previewData.jobId}/errors`, '_blank');
  };

  if (result) {
    return (
      <div className="max-w-2xl mx-auto space-y-6">
        <Card className="text-center py-8">
          <CardHeader>
            <div className="mx-auto bg-green-100 p-3 rounded-full w-fit mb-4">
              <CheckCircle2 className="w-12 h-12 text-green-600" />
            </div>
            <CardTitle className="text-2xl">Import Completed</CardTitle>
            <CardDescription>
              We've finished processing your {importLabel} import.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="p-4 bg-muted rounded-lg">
                <div className="text-2xl font-bold text-green-600">{result.processedCount}</div>
                <div className="text-sm text-muted-foreground">Successfully Processed</div>
              </div>
              <div className="p-4 bg-muted rounded-lg">
                <div className="text-2xl font-bold text-red-600">{result.errorCount}</div>
                <div className="text-sm text-muted-foreground">Errors Encountered</div>
              </div>
            </div>
            
            {result.errorCount > 0 && (
              <Button variant="outline" onClick={handleDownloadErrors} className="w-full">
                <Download className="w-4 h-4 mr-2" />
                Download Error Report (CSV)
              </Button>
            )}
          </CardContent>
          <CardFooter className="justify-center">
            <Button asChild>
              <Link href="/dashboard/imports">Return to Imports</Link>
            </Button>
          </CardFooter>
        </Card>
      </div>
    );
  }

  if (previewData) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => setPreviewData(null)}>
            <ArrowLeft className="w-4 h-4" />
          </Button>
          <h1 className="text-3xl font-bold tracking-tight">Preview: {importLabel}</h1>
        </div>

        <div className="grid gap-6 md:grid-cols-3">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Total Rows</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{previewData.rowCount}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Valid Rows</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">
                {previewData.rowCount - previewData.errorCount}
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Errors</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-red-600">{previewData.errorCount}</div>
            </CardContent>
          </Card>
        </div>

        {previewData.errors.length > 0 && (
          <Card className="border-red-200 bg-red-50">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div className="flex items-center text-red-700 font-semibold">
                  <AlertCircle className="w-5 h-5 mr-2" />
                  Validation Errors Found
                </div>
                <Button variant="ghost" size="sm" onClick={handleDownloadErrors} className="text-red-700 hover:bg-red-100">
                  <Download className="w-4 h-4 mr-2" />
                  Download Complete Error List
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow className="hover:bg-transparent">
                    <TableHead className="w-20">Row</TableHead>
                    <TableHead>Error Message</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {previewData.errors.slice(0, 5).map((err: any, idx: number) => (
                    <TableRow key={idx}>
                      <TableCell>Row {err.rowNumber}</TableCell>
                      <TableCell className="text-red-600 font-medium">{err.error}</TableCell>
                    </TableRow>
                  ))}
                  {previewData.errors.length > 5 && (
                    <TableRow>
                      <TableCell colSpan={2} className="text-center text-muted-foreground text-sm italic">
                        Showing first 5 errors. Download the error report for full details.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        )}

        <Card>
          <CardHeader>
            <CardTitle>Data Preview (First 10 Valid Rows)</CardTitle>
          </CardHeader>
          <CardContent>
             <div className="rounded-md border overflow-x-auto">
               <Table>
                 <TableHeader>
                   <TableRow>
                     {previewData.previewRows.length > 0 && Object.keys(previewData.previewRows[0]).map(key => (
                       <TableHead key={key}>{key}</TableHead>
                     ))}
                   </TableRow>
                 </TableHeader>
                 <TableBody>
                   {previewData.previewRows.map((row: any, i: number) => (
                     <TableRow key={i}>
                       {Object.values(row).map((val: any, j: number) => (
                         <TableCell key={j}>{String(val)}</TableCell>
                       ))}
                     </TableRow>
                   ))}
                 </TableBody>
               </Table>
             </div>
          </CardContent>
          <CardFooter className="flex justify-between items-center border-t pt-6">
            <div className="text-sm text-muted-foreground">
              Clicking "Commit Import" will create records for all valid rows.
            </div>
            <div className="flex gap-4">
              <Button variant="outline" onClick={() => setPreviewData(null)}>
                Cancel
              </Button>
              <Button 
                onClick={handleCommit} 
                disabled={isCommitting || previewData.rowCount === previewData.errorCount}
              >
                {isCommitting ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Committing...
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="w-4 h-4 mr-2" />
                    Commit {previewData.rowCount - previewData.errorCount} Records
                  </>
                )}
              </Button>
            </div>
          </CardFooter>
        </Card>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" asChild>
          <Link href="/dashboard/imports">
            <ArrowLeft className="w-4 h-4" />
          </Link>
        </Button>
        <h1 className="text-3xl font-bold tracking-tight">Import {importLabel}</h1>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>1. Download Template</CardTitle>
            <CardDescription>
              Use our official templates to ensure your data is formatted correctly.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-col gap-2">
              <Button variant="outline" className="justify-start h-14" onClick={() => handleDownloadTemplate('xlsx')}>
                <FileSpreadsheet className="w-5 h-5 mr-3 text-green-600" />
                <div className="text-left">
                  <div className="font-semibold">Excel Template</div>
                  <div className="text-xs text-muted-foreground">Recommended for manual entry</div>
                </div>
              </Button>
              <Button variant="outline" className="justify-start h-14" onClick={() => handleDownloadTemplate('csv')}>
                <FileText className="w-5 h-5 mr-3 text-blue-600" />
                <div className="text-left">
                  <div className="font-semibold">CSV Template</div>
                  <div className="text-xs text-muted-foreground">Best for automated exports</div>
                </div>
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>2. Upload File</CardTitle>
            <CardDescription>
              Upload your completed template to preview and validate the data.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleUpload} className="space-y-4">
              <div className="grid w-full items-center gap-1.5">
                <Input
                  type="file"
                  accept=".csv,.xlsx,.xls"
                  onChange={(e) => setFile(e.target.files?.[0] || null)}
                  className="cursor-pointer"
                />
              </div>
              <Button type="submit" className="w-full" disabled={!file || isUploading}>
                {isUploading ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Uploading & Validating...
                  </>
                ) : (
                  <>
                    <Upload className="w-4 h-4 mr-2" />
                    Upload & Preview
                  </>
                )}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Import Guidelines</CardTitle>
        </CardHeader>
        <CardContent className="text-sm space-y-2">
          <p>• Do not change the column headers in the template.</p>
          <p>• Ensure all required fields (marked in preview) are filled.</p>
          <p>• Dates should be in YYYY-MM-DD format.</p>
          <p>• For <strong>Opening Balances</strong>, the import will automatically balance any difference against the <em>Opening Balance Equity</em> account.</p>
          <p>• Bulk Receipts can be automatically allocated to the oldest outstanding invoices if "autoAllocate" is set to TRUE.</p>
        </CardContent>
      </Card>
    </div>
  );
}
