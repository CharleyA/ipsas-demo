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
  CreditCard,
  DollarSign,
  Filter,
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

export default function ReceiptsPage() {
  const { token } = useAuth();
  const [receipts, setReceipts] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("ALL");
  const [methodFilter, setMethodFilter] = useState<string>("ALL");

  const fetchReceipts = async () => {
    setIsLoading(true);
    try {
      const response = await fetch("/api/ar/receipts", {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await response.json();
      setReceipts(Array.isArray(data) ? data : []);
    } catch {
      toast.error("Failed to fetch receipts");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (token) fetchReceipts();
  }, [token]);

  const filteredReceipts = receipts.filter((rec) => {
    const matchesSearch = `${rec.voucher?.number} ${rec.student?.firstName} ${rec.student?.lastName} ${rec.student?.studentNumber}`
      .toLowerCase()
      .includes(search.toLowerCase());
    
    const matchesStatus = statusFilter === "ALL" || rec.voucher?.status === statusFilter;
    const matchesMethod = methodFilter === "ALL" || rec.paymentMethod === methodFilter;
    
    return matchesSearch && matchesStatus && matchesMethod;
  });

  const totalReceived = receipts.reduce(
    (sum, rec) => sum + Number(rec.amount || 0),
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

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">AR Receipts</h1>
          <p className="text-muted-foreground">
            Record and manage fee payments from students.
          </p>
        </div>
        <Button asChild>
          <Link href="/dashboard/ar/receipts/new">
            <Plus className="w-4 h-4 mr-2" />
            New Receipt
          </Link>
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Receipts</CardTitle>
            <CreditCard className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{receipts.length}</div>
            <p className="text-xs text-muted-foreground">Payments recorded</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Received</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatCurrency(totalReceived)}
            </div>
            <p className="text-xs text-muted-foreground">Fee collections</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Receipt List</CardTitle>
              <CardDescription>
                All student fee payments and their allocation status.
              </CardDescription>
            </div>
            <div className="relative w-64">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search receipts..."
                className="pl-8"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="w-8 h-8 animate-spin text-primary" />
            </div>
          ) : filteredReceipts.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No receipts found.
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Receipt No.</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Student</TableHead>
                  <TableHead>Method</TableHead>
                  <TableHead className="text-right">Amount</TableHead>
                  <TableHead className="text-right">Unallocated</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredReceipts.map((receipt) => (
                  <TableRow key={receipt.id}>
                    <TableCell className="font-medium">
                      {receipt.voucher?.number}
                    </TableCell>
                    <TableCell>
                      {formatDate(receipt.voucher?.date)}
                    </TableCell>
                    <TableCell>
                      {receipt.student?.firstName} {receipt.student?.lastName}
                      <div className="text-xs text-muted-foreground">
                        {receipt.student?.studentNumber}
                      </div>
                    </TableCell>
                    <TableCell>{receipt.paymentMethod || "Cash"}</TableCell>
                    <TableCell className="text-right">
                      {formatCurrency(Number(receipt.amount))}
                    </TableCell>
                    <TableCell className="text-right">
                      {formatCurrency(Number(receipt.unallocated))}
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant="secondary"
                        className={statusColors[receipt.voucher?.status] || ""}
                      >
                        {receipt.voucher?.status}
                      </Badge>
                    </TableCell>
                      <TableCell className="text-right">
                        <Button variant="ghost" size="icon" asChild>
                          <Link href={`/dashboard/vouchers/${receipt.voucherId}`}>
                            <Eye className="w-4 h-4" />
                          </Link>
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
