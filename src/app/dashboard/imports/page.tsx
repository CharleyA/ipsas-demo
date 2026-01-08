"use client";

import React, { useState } from 'react';
import { 
  FileSpreadsheet, 
  Upload, 
  CheckCircle2, 
  AlertCircle, 
  Download,
  Loader2,
  Table as TableIcon,
  XCircle,
  Users,
  Wallet,
  BookOpen,
  Truck
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { useAuth } from "@/components/providers/auth-provider";

interface ImportJob {
  jobId: string;
  rowCount: number;
  errorCount: number;
  previewRows: any[];
  errors: any[];
}

export default function ImportsPage() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState("students");
  const [file, setFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [isCommitting, setIsCommitting] = useState(false);
  const [importJob, setImportJob] = useState<ImportJob | null>(null);
  const [importResult, setImportResult] = useState<{ processedCount: number; errorCount: number } | null>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
      setImportJob(null);
      setImportResult(null);
    }
  };

  const handleUpload = async () => {
    if (!file) return;

    setIsUploading(true);
    const formData = new FormData();
    formData.append('file', file);

    try {
      const response = await fetch(`/api/import/${activeTab}`, {
        method: 'POST',
        body: formData,
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
        },
      });

      if (!response.ok) throw new Error('Upload failed');

      const data = await response.json();
      setImportJob(data);
      toast.success("File uploaded and validated. Please review the preview.");
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setIsUploading(false);
    }
  };

  const handleCommit = async () => {
    if (!importJob) return;

    setIsCommitting(true);
    try {
      const response = await fetch(`/api/import/commit/${importJob.jobId}`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) throw new Error('Commit failed');

      const data = await response.json();
      setImportResult(data);
      setImportJob(null);
      setFile(null);
      toast.success("Import completed successfully!");
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setIsCommitting(false);
    }
  };

  const downloadTemplate = (format: 'csv' | 'xlsx') => {
    window.open(`/api/import/templates/${activeTab}?format=${format}`, '_blank');
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Data Import</h1>
          <p className="text-muted-foreground"> Bulk import records into the system using CSV or Excel.</p>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={(v) => {
        setActiveTab(v);
        setImportJob(null);
        setImportResult(null);
        setFile(null);
      }} className="space-y-4">
          <TabsList>
            <TabsTrigger value="students" className="gap-2">
              <Users className="w-4 h-4" />
              Students
            </TabsTrigger>
            <TabsTrigger value="suppliers" className="gap-2">
              <Truck className="w-4 h-4" />
              Suppliers
            </TabsTrigger>
            <TabsTrigger value="receipts" className="gap-2">
              <Wallet className="w-4 h-4" />
              Receipts
            </TabsTrigger>
            <TabsTrigger value="accounts" className="gap-2">
              <BookOpen className="w-4 h-4" />
              Chart of Accounts
            </TabsTrigger>
          </TabsList>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Download className="w-5 h-5" />
              1. Download Template
            </CardTitle>
            <CardDescription>
              Download the template for {activeTab} to ensure your data is formatted correctly.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex gap-4">
            <Button variant="outline" onClick={() => downloadTemplate('csv')} className="gap-2">
              <FileSpreadsheet className="w-4 h-4" />
              CSV Template
            </Button>
            <Button variant="outline" onClick={() => downloadTemplate('xlsx')} className="gap-2">
              <TableIcon className="w-4 h-4" />
              Excel (XLSX) Template
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Upload className="w-5 h-5" />
              2. Upload & Preview
            </CardTitle>
            <CardDescription>
              Upload your completed template to validate and preview the data.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-4">
              <input 
                type="file" 
                id="file-upload" 
                className="hidden" 
                accept=".csv,.xlsx,.xls"
                onChange={handleFileChange}
              />
              <Button 
                variant="secondary" 
                onClick={() => document.getElementById('file-upload')?.click()}
                className="gap-2"
              >
                <FileSpreadsheet className="w-4 h-4" />
                {file ? file.name : "Select File"}
              </Button>
              <Button 
                onClick={handleUpload} 
                disabled={!file || isUploading}
                className="gap-2"
              >
                {isUploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
                Upload & Validate
              </Button>
            </div>

            {importJob && (
              <div className="space-y-4 mt-6">
                <div className="flex items-center gap-6">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-5 h-5 text-green-500" />
                    <span className="font-medium">{importJob.rowCount - importJob.errorCount} Valid Rows</span>
                  </div>
                  {importJob.errorCount > 0 && (
                    <div className="flex items-center gap-2">
                      <AlertCircle className="w-5 h-5 text-destructive" />
                      <span className="font-medium text-destructive">{importJob.errorCount} Rows with Errors</span>
                    </div>
                  )}
                </div>

                <div className="border rounded-md overflow-hidden">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-muted/50">
                        {importJob.previewRows.length > 0 && Object.keys(importJob.previewRows[0]).map(key => (
                          <TableHead key={key}>{key}</TableHead>
                        ))}
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {importJob.previewRows.map((row, i) => (
                        <TableRow key={i}>
                          {Object.values(row).map((val: any, j) => (
                            <TableCell key={j}>{String(val)}</TableCell>
                          ))}
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                  <div className="p-2 text-xs text-center text-muted-foreground border-t">
                    Showing first 10 valid rows
                  </div>
                </div>

                {importJob.errors.length > 0 && (
                  <div className="space-y-2">
                    <h3 className="font-semibold text-destructive flex items-center gap-2">
                      <XCircle className="w-4 h-4" />
                      Row Validation Errors
                    </h3>
                    <div className="max-h-48 overflow-y-auto border border-destructive/20 rounded-md p-2 bg-destructive/5 text-sm space-y-1">
                      {importJob.errors.map((error, i) => (
                        <div key={i} className="flex gap-2 text-destructive">
                          <span className="font-bold whitespace-nowrap">Row {error.rowNumber}:</span>
                          <span>{error.error}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <div className="flex justify-end pt-4">
                  <Button 
                    size="lg" 
                    onClick={handleCommit} 
                    disabled={isCommitting || importJob.rowCount === importJob.errorCount}
                    className="gap-2"
                  >
                    {isCommitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
                    Commit Valid Rows
                  </Button>
                </div>
              </div>
            )}

            {importResult && (
              <Card className="bg-primary/5 border-primary/20">
                <CardContent className="pt-6">
                  <div className="flex flex-col items-center text-center space-y-2">
                    <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mb-2">
                      <CheckCircle2 className="w-8 h-8 text-primary" />
                    </div>
                    <h3 className="text-xl font-bold">Import Completed</h3>
                    <div className="flex gap-4 mt-2">
                      <Badge variant="secondary" className="text-lg py-1 px-4">
                        {importResult.processedCount} Successfully Imported
                      </Badge>
                      {importResult.errorCount > 0 && (
                        <Badge variant="destructive" className="text-lg py-1 px-4">
                          {importResult.errorCount} Failed
                        </Badge>
                      )}
                    </div>
                    <p className="text-muted-foreground mt-4">
                      The valid records have been added to the system. 
                      {activeTab === 'receipts' && " Vouchers have been created as DRAFT."}
                    </p>
                    <Button variant="outline" className="mt-4" onClick={() => setImportResult(null)}>
                      Done
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}
          </CardContent>
        </Card>
      </Tabs>
    </div>
  );
}

// Icons for the tabs
function Users(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg
      {...props}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
      <path d="M16 3.13a4 4 0 0 1 0 7.75" />
    </svg>
  );
}

function Wallet(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg
      {...props}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M21 12V7H5a2 2 0 0 1 0-4h14v4" />
      <path d="M3 5v14a2 2 0 0 0 2 2h16v-5" />
      <path d="M18 12a2 2 0 0 0 0 4h4v-4Z" />
    </svg>
  );
}

function BookOpen(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg
      {...props}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z" />
      <path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z" />
    </svg>
  );
}
