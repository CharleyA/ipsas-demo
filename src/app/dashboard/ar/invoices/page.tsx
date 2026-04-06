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
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Plus,
  Search,
  Eye,
  Loader2,
  FileText,
  Users,
  Zap,
  Filter,
  Play,
  Printer,
} from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/components/providers/auth-provider";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { TablePagination, usePagination } from "@/components/ui/table-pagination";

export default function InvoicesPage() {
  const { token } = useAuth();
  const [invoices, setInvoices] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("ALL");
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [isBulkPosting, setIsBulkPosting] = useState(false);
  const [isBulkPrinting, setIsBulkPrinting] = useState(false);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);

  const fetchInvoices = async () => {
    setIsLoading(true);
    try {
      const response = await fetch("/api/ar/invoices", {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await response.json();
      setInvoices(Array.isArray(data) ? data : []);
    } catch {
      toast.error("Failed to fetch invoices");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (token) fetchInvoices();
  }, [token]);

  const filteredInvoices = invoices.filter((inv) => {
    const matchesSearch = `${inv.voucher?.number} ${inv.student?.firstName} ${inv.student?.lastName} ${inv.student?.studentNumber}`
      .toLowerCase()
      .includes(search.toLowerCase());

    const matchesStatus = statusFilter === "ALL" || inv.voucher?.status === statusFilter;

    return matchesSearch && matchesStatus;
  });
  const pagedInvoices = usePagination(filteredInvoices, pageSize, page);

  const totalOutstanding = invoices.reduce(
    (sum, inv) => sum + Number(inv.balance || 0),
    0
  );

  const formatCurrency = (amount: number) =>
    new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
    }).format(amount);

  const formatDate = (date: string) =>
    new Date(date).toLocaleDateString("en-GB", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });

  const statusColors: Record<string, string> = {
    DRAFT: "bg-gray-100 text-gray-800",
    SUBMITTED: "bg-yellow-100 text-yellow-800",
    APPROVED: "bg-blue-100 text-blue-800",
    POSTED: "bg-green-100 text-green-800",
    CANCELLED: "bg-red-100 text-red-800",
  };

  const allFilteredIds = pagedInvoices.map((inv) => inv.id);
  const allFilteredSelected =
    allFilteredIds.length > 0 && allFilteredIds.every((id) => selectedIds.includes(id));

  const toggleSelected = (id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  const toggleSelectAllFiltered = () => {
    if (allFilteredSelected) {
      setSelectedIds((prev) => prev.filter((id) => !allFilteredIds.includes(id)));
      return;
    }
    setSelectedIds((prev) => Array.from(new Set([...prev, ...allFilteredIds])));
  };

  const handleBulkPost = async () => {
    setIsBulkPosting(true);
    try {
      const response = await fetch("/api/ar/invoices/bulk-post", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          invoiceIds: selectedIds.length > 0 ? selectedIds : undefined,
          status: selectedIds.length === 0 ? statusFilter : undefined,
        }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Bulk post failed");
      toast.success(`Bulk post completed: ${data.postedCount} posted, ${data.failedCount} failed`);
      setSelectedIds([]);
      fetchInvoices();
    } catch (error: any) {
      toast.error(error.message || "Bulk post failed");
    } finally {
      setIsBulkPosting(false);
    }
  };

  const handleBulkPrint = async () => {
    setIsBulkPrinting(true);
    try {
      const response = await fetch("/api/ar/invoices/bulk-pdf", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          invoiceIds: selectedIds.length > 0 ? selectedIds : undefined,
          status: selectedIds.length === 0 ? statusFilter : undefined,
          limit: selectedIds.length === 0 ? 200 : undefined,
        }),
      });
      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(data.error || "Bulk PDF export failed");
      }
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      window.open(url, "_blank");
      setTimeout(() => window.URL.revokeObjectURL(url), 60000);
    } catch (error: any) {
      toast.error(error.message || "Bulk PDF export failed");
    } finally {
      setIsBulkPrinting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">AR Invoices</h1>
          <p className="text-muted-foreground">
            Manage student fee invoices and billing.
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" asChild>
            <Link href="/dashboard/ar/invoices/generate">
              <Zap className="w-4 h-4 mr-2" />
              Bulk Generate
            </Link>
          </Button>
          <Button asChild>
            <Link href="/dashboard/ar/invoices/new">
              <Plus className="w-4 h-4 mr-2" />
              New Invoice
            </Link>
          </Button>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Invoices</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{invoices.length}</div>
            <p className="text-xs text-muted-foreground">All time</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Outstanding</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatCurrency(totalOutstanding)}
            </div>
            <p className="text-xs text-muted-foreground">Unpaid balance</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Quick Actions</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <Button
              variant="outline"
              size="sm"
              className="w-full justify-start"
              asChild
            >
              <Link href="/dashboard/ar/fee-templates">Manage Fee Templates</Link>
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="w-full justify-start"
              onClick={handleBulkPost}
              disabled={isBulkPosting || filteredInvoices.length === 0}
            >
              <Play className="w-4 h-4 mr-2" />
              {isBulkPosting ? "Bulk Posting..." : "Bulk Post Invoices"}
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="w-full justify-start"
              onClick={handleBulkPrint}
              disabled={isBulkPrinting || filteredInvoices.length === 0}
            >
              <Printer className="w-4 h-4 mr-2" />
              {isBulkPrinting ? "Preparing PDF..." : "Bulk Print / PDF"}
            </Button>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Invoice List</CardTitle>
              <CardDescription>
                All student invoices and their payment status. Select rows for batch posting or bulk PDF export.
              </CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <div className="relative w-64">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search invoices..."
                  className="pl-8"
                  value={search}
                  onChange={(e) => { setSearch(e.target.value); setPage(1); }}
                />
              </div>
              <Select value={statusFilter} onValueChange={(v) => { setStatusFilter(v); setPage(1); }}>
                <SelectTrigger className="w-[180px]">
                  <Filter className="w-4 h-4 mr-2" />
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">All Statuses</SelectItem>
                  <SelectItem value="DRAFT">Draft</SelectItem>
                  <SelectItem value="SUBMITTED">Submitted</SelectItem>
                  <SelectItem value="APPROVED">Approved</SelectItem>
                  <SelectItem value="POSTED">Posted</SelectItem>
                  <SelectItem value="CANCELLED">Cancelled</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="w-8 h-8 animate-spin text-primary" />
            </div>
          ) : filteredInvoices.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No invoices found.
            </div>
          ) : (
            <>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-10">
                    <input type="checkbox" checked={allFilteredSelected} onChange={toggleSelectAllFiltered} />
                  </TableHead>
                  <TableHead>Invoice No.</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Student</TableHead>
                  <TableHead>Term</TableHead>
                  <TableHead className="text-right">Amount</TableHead>
                  <TableHead className="text-right">Balance</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {pagedInvoices.map((invoice) => (
                  <TableRow key={invoice.id}>
                    <TableCell>
                      <input
                        type="checkbox"
                        checked={selectedIds.includes(invoice.id)}
                        onChange={() => toggleSelected(invoice.id)}
                      />
                    </TableCell>
                    <TableCell className="font-medium">
                      {invoice.voucher?.number}
                    </TableCell>
                    <TableCell>
                      {formatDate(invoice.voucher?.date)}
                    </TableCell>
                    <TableCell>
                      {invoice.student?.firstName} {invoice.student?.lastName}
                      <div className="text-xs text-muted-foreground">
                        {invoice.student?.studentNumber}
                      </div>
                    </TableCell>
                    <TableCell>{invoice.term || "-"}</TableCell>
                    <TableCell className="text-right">
                      {formatCurrency(Number(invoice.amount))}
                    </TableCell>
                    <TableCell className="text-right">
                      {formatCurrency(Number(invoice.balance))}
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant="secondary"
                        className={statusColors[invoice.voucher?.status] || ""}
                      >
                        {invoice.voucher?.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1">
                        <Button variant="ghost" size="icon" asChild>
                          <a href={`/api/ar/invoices/${invoice.id}/pdf`} target="_blank" rel="noreferrer">
                            <Printer className="w-4 h-4" />
                          </a>
                        </Button>
                        <Button variant="ghost" size="icon" asChild>
                          <Link href={`/dashboard/vouchers/${invoice.voucherId}`}>
                            <Eye className="w-4 h-4" />
                          </Link>
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          <TablePagination total={filteredInvoices.length} page={page} pageSize={pageSize} onPageChange={setPage} onPageSizeChange={setPageSize} />
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
