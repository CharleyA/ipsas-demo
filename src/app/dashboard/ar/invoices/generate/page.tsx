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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  ArrowLeft,
  Loader2,
  Users,
  FileText,
  CheckCircle,
  AlertTriangle,
} from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/components/providers/auth-provider";

export default function GenerateInvoicesPage() {
  const router = useRouter();
  const { token } = useAuth();
  const [templates, setTemplates] = useState<any[]>([]);
  const [selectedTemplate, setSelectedTemplate] = useState<string>("");
  const [preview, setPreview] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isPreviewing, setIsPreviewing] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [result, setResult] = useState<any>(null);

  const fetchTemplates = async () => {
    setIsLoading(true);
    try {
      const response = await fetch("/api/ar/fee-templates", {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await response.json();
      setTemplates(Array.isArray(data) ? data.filter((t: any) => t.isActive) : []);
    } catch {
      toast.error("Failed to fetch fee templates");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (token) fetchTemplates();
  }, [token]);

  const handlePreview = async () => {
    if (!selectedTemplate) {
      toast.error("Please select a template");
      return;
    }

    setIsPreviewing(true);
    setPreview(null);
    try {
      const response = await fetch("/api/ar/generate-fees/preview", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ templateId: selectedTemplate }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to preview");
      }

      const data = await response.json();
      setPreview(data);
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setIsPreviewing(false);
    }
  };

  const handleGenerate = async () => {
    setShowConfirm(false);
    setIsGenerating(true);
    try {
      const response = await fetch("/api/ar/generate-fees", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ templateId: selectedTemplate }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to generate invoices");
      }

      const data = await response.json();
      setResult(data);
      toast.success(
        `Generated ${data.results.successful} invoices successfully`
      );
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setIsGenerating(false);
    }
  };

  const formatCurrency = (amount: number) =>
    new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
    }).format(amount);

  if (result) {
    return (
      <div className="space-y-6 max-w-3xl">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" asChild>
            <Link href="/dashboard/ar/invoices">
              <ArrowLeft className="w-4 h-4" />
            </Link>
          </Button>
          <div>
            <h1 className="text-3xl font-bold tracking-tight">
              Generation Complete
            </h1>
            <p className="text-muted-foreground">
              Batch {result.batch.batchNumber}
            </p>
          </div>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CheckCircle className="w-5 h-5 text-green-500" />
              Invoices Generated
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-3 gap-4">
              <div className="p-4 bg-green-50 rounded-lg text-center">
                <div className="text-2xl font-bold text-green-600">
                  {result.results.successful}
                </div>
                <div className="text-sm text-muted-foreground">Successful</div>
              </div>
              <div className="p-4 bg-red-50 rounded-lg text-center">
                <div className="text-2xl font-bold text-red-600">
                  {result.results.failed}
                </div>
                <div className="text-sm text-muted-foreground">Failed</div>
              </div>
              <div className="p-4 bg-blue-50 rounded-lg text-center">
                <div className="text-2xl font-bold text-blue-600">
                  {formatCurrency(Number(result.batch.totalAmount))}
                </div>
                <div className="text-sm text-muted-foreground">Total Value</div>
              </div>
            </div>

            {result.results.errors?.length > 0 && (
              <div className="p-4 border border-red-200 rounded-lg bg-red-50">
                <h4 className="font-medium text-red-800 mb-2">Errors:</h4>
                <ul className="text-sm text-red-700 space-y-1">
                  {result.results.errors.slice(0, 5).map((err: any, i: number) => (
                    <li key={i}>Student {err.studentId}: {err.error}</li>
                  ))}
                  {result.results.errors.length > 5 && (
                    <li>...and {result.results.errors.length - 5} more</li>
                  )}
                </ul>
              </div>
            )}

            <div className="flex gap-2 pt-4">
              <Button asChild>
                <Link href="/dashboard/ar/invoices">View Invoices</Link>
              </Button>
              <Button variant="outline" onClick={() => setResult(null)}>
                Generate More
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" asChild>
          <Link href="/dashboard/ar/invoices">
            <ArrowLeft className="w-4 h-4" />
          </Link>
        </Button>
        <div>
          <h1 className="text-3xl font-bold tracking-tight">
            Generate Term Invoices
          </h1>
          <p className="text-muted-foreground">
            Bulk generate school fee invoices for students.
          </p>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Select Fee Template</CardTitle>
            <CardDescription>
              Choose a template to generate invoices from.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {isLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="w-8 h-8 animate-spin text-primary" />
              </div>
            ) : templates.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-muted-foreground mb-4">
                  No fee templates found.
                </p>
                <Button asChild>
                  <Link href="/dashboard/ar/fee-templates/new">
                    Create Template
                  </Link>
                </Button>
              </div>
            ) : (
              <>
                <Select
                  value={selectedTemplate}
                  onValueChange={(v) => {
                    setSelectedTemplate(v);
                    setPreview(null);
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select a template" />
                  </SelectTrigger>
                  <SelectContent>
                    {templates.map((template) => (
                      <SelectItem key={template.id} value={template.id}>
                        {template.name} - {template.academicYear} {template.term}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <Button
                  onClick={handlePreview}
                  disabled={!selectedTemplate || isPreviewing}
                  className="w-full"
                >
                  {isPreviewing && (
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  )}
                  Preview Generation
                </Button>

                <div className="text-sm text-muted-foreground">
                  <Link
                    href="/dashboard/ar/fee-templates"
                    className="text-primary hover:underline"
                  >
                    Manage Templates →
                  </Link>
                </div>
              </>
            )}
          </CardContent>
        </Card>

        {preview && (
          <Card>
            <CardHeader>
              <CardTitle>Preview Summary</CardTitle>
              <CardDescription>
                Review before generating invoices.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="p-4 bg-muted rounded-lg">
                  <div className="flex items-center gap-2 mb-1">
                    <Users className="w-4 h-4 text-muted-foreground" />
                    <span className="text-sm text-muted-foreground">
                      Students
                    </span>
                  </div>
                  <div className="text-2xl font-bold">
                    {preview.totalStudents}
                  </div>
                </div>
                <div className="p-4 bg-muted rounded-lg">
                  <div className="flex items-center gap-2 mb-1">
                    <FileText className="w-4 h-4 text-muted-foreground" />
                    <span className="text-sm text-muted-foreground">
                      Per Student
                    </span>
                  </div>
                  <div className="text-2xl font-bold">
                    {formatCurrency(preview.totalPerStudent)}
                  </div>
                </div>
              </div>

              <div className="p-4 bg-primary/5 border border-primary/20 rounded-lg">
                <div className="text-sm text-muted-foreground mb-1">
                  Total Value
                </div>
                <div className="text-3xl font-bold text-primary">
                  {formatCurrency(preview.totalAmount)}
                </div>
              </div>

              <div className="space-y-2">
                <h4 className="font-medium">Fee Breakdown:</h4>
                {preview.items?.map((item: any, i: number) => (
                  <div key={i} className="flex justify-between text-sm">
                    <span>{item.description}</span>
                    <span>{formatCurrency(Number(item.amount))}</span>
                  </div>
                ))}
              </div>

              {preview.grades?.length > 0 && (
                <div>
                  <h4 className="font-medium mb-2">Applicable Grades:</h4>
                  <div className="flex flex-wrap gap-1">
                    {preview.grades.map((grade: string) => (
                      <Badge key={grade} variant="secondary">
                        {grade}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}

              <Button
                onClick={() => setShowConfirm(true)}
                disabled={preview.totalStudents === 0 || isGenerating}
                className="w-full"
                size="lg"
              >
                {isGenerating && (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                )}
                Generate {preview.totalStudents} Invoices
              </Button>
            </CardContent>
          </Card>
        )}
      </div>

      {preview && preview.students?.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Students to Invoice ({preview.totalStudents})</CardTitle>
            <CardDescription>
              These students will receive invoices.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Student No.</TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead>Grade</TableHead>
                  <TableHead className="text-right">Amount</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {preview.students.slice(0, 20).map((student: any) => (
                  <TableRow key={student.id}>
                    <TableCell>{student.studentNumber}</TableCell>
                    <TableCell>
                      {student.firstName} {student.lastName}
                    </TableCell>
                    <TableCell>{student.grade || "-"}</TableCell>
                    <TableCell className="text-right">
                      {formatCurrency(preview.totalPerStudent)}
                    </TableCell>
                  </TableRow>
                ))}
                {preview.students.length > 20 && (
                  <TableRow>
                    <TableCell
                      colSpan={4}
                      className="text-center text-muted-foreground"
                    >
                      ...and {preview.students.length - 20} more students
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      <AlertDialog open={showConfirm} onOpenChange={setShowConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-yellow-500" />
              Confirm Invoice Generation
            </AlertDialogTitle>
            <AlertDialogDescription>
              You are about to generate{" "}
              <strong>{preview?.totalStudents} invoices</strong> with a total
              value of <strong>{formatCurrency(preview?.totalAmount || 0)}</strong>.
              <br />
              <br />
              This action cannot be undone. All invoices will be created in DRAFT
              status and will need to be posted separately.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleGenerate}>
              Generate Invoices
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
