"use client";

import { useEffect, useState } from "react";
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
import { Plus, Loader2, Eye, ArrowLeft } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/components/providers/auth-provider";

export default function FeeTemplatesPage() {
  const { token } = useAuth();
  const [templates, setTemplates] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchTemplates = async () => {
    setIsLoading(true);
    try {
      const response = await fetch("/api/ar/fee-templates", {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await response.json();
      setTemplates(Array.isArray(data) ? data : []);
    } catch {
      toast.error("Failed to fetch fee templates");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (token) fetchTemplates();
  }, [token]);

  const formatCurrency = (amount: number) =>
    new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
    }).format(amount);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" asChild>
            <Link href="/dashboard/ar/invoices">
              <ArrowLeft className="w-4 h-4" />
            </Link>
          </Button>
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Fee Templates</h1>
            <p className="text-muted-foreground">
              Configure fee structures for bulk invoice generation.
            </p>
          </div>
        </div>
        <Button asChild>
          <Link href="/dashboard/ar/fee-templates/new">
            <Plus className="w-4 h-4 mr-2" />
            New Template
          </Link>
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Templates</CardTitle>
          <CardDescription>
            Define fee items, grades, and due dates for each academic term.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="w-8 h-8 animate-spin text-primary" />
            </div>
          ) : templates.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No fee templates found. Create one to start generating invoices.
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Year</TableHead>
                  <TableHead>Term</TableHead>
                  <TableHead>Grades</TableHead>
                  <TableHead>Items</TableHead>
                  <TableHead className="text-right">Total</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {templates.map((template) => {
                  const total = template.items?.reduce(
                    (sum: number, item: any) => sum + Number(item.amount),
                    0
                  ) || 0;
                  return (
                    <TableRow key={template.id}>
                      <TableCell className="font-medium">
                        {template.name}
                      </TableCell>
                      <TableCell>{template.academicYear}</TableCell>
                      <TableCell>{template.term}</TableCell>
                      <TableCell>
                        {template.grades?.length > 0
                          ? template.grades.join(", ")
                          : "All"}
                      </TableCell>
                      <TableCell>{template.items?.length || 0}</TableCell>
                      <TableCell className="text-right">
                        {formatCurrency(total)}
                      </TableCell>
                      <TableCell>
                        <Badge variant={template.isActive ? "default" : "secondary"}>
                          {template.isActive ? "Active" : "Inactive"}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <Button variant="ghost" size="icon" asChild>
                          <Link href={`/dashboard/ar/fee-templates/${template.id}`}>
                            <Eye className="w-4 h-4" />
                          </Link>
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
