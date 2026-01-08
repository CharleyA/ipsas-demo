"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
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
  ArrowLeft, 
  FileText, 
  Wallet, 
  Loader2,
  Printer,
  Download,
  Plus
} from "lucide-react";
import Link from "next/link";
import { useAuth } from "@/components/providers/auth-provider";
import { toast } from "sonner";

export default function SupplierDetailPage() {
  const { id } = useParams();
  const { token } = useAuth();
  const [supplier, setSupplier] = useState<any>(null);
  const [transactions, setTransactions] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true);
      try {
        // Mock data
        setSupplier({
          id,
          code: "SUP-042",
          name: "ZESA Holdings",
          taxNumber: "BP 12345678",
          balance: 2450.00
        });

        setTransactions([
          {
            id: "t1",
            date: "2026-01-02",
            type: "BILL",
            reference: "BILL/2026/102",
            description: "Electricity - Dec 2025",
            amount: 2450.00,
            balance: 2450.00,
            status: "POSTED"
          }
        ]);
      } catch (error) {
        toast.error("Failed to load supplier statement");
      } finally {
        setIsLoading(false);
      }
    };

    if (token) fetchData();
  }, [id, token]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!supplier) return <div>Supplier not found</div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" asChild>
            <Link href="/dashboard/suppliers">
              <ArrowLeft className="w-4 h-4" />
            </Link>
          </Button>
          <div>
            <h1 className="text-3xl font-bold tracking-tight">
              {supplier.name}
            </h1>
            <p className="text-muted-foreground">
              {supplier.code} • {supplier.taxNumber || "No Tax ID"}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline">
            <Printer className="w-4 h-4 mr-2" />
            Print Ledger
          </Button>
          <Button variant="outline">
            <Download className="w-4 h-4 mr-2" />
            Export
          </Button>
          <Button asChild>
            <Link href={`/dashboard/vouchers/new?type=PAYMENT&supplierId=${id}`}>
              <Plus className="w-4 h-4 mr-2" />
              Make Payment
            </Link>
          </Button>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Billed</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">ZWG 2,450.00</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Paid</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">ZWG 0.00</div>
          </CardContent>
        </Card>
        <Card className="border-red-200 bg-red-50/50">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-red-600">Outstanding Balance</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-700">ZWG 2,450.00</div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Vendor Ledger</CardTitle>
          <CardDescription>
            Historical record of bills and payments for this vendor.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Reference</TableHead>
                <TableHead>Description</TableHead>
                <TableHead className="text-right">Amount (ZWG)</TableHead>
                <TableHead className="text-right">Balance (ZWG)</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {transactions.map((tx) => (
                <TableRow key={tx.id}>
                  <TableCell>{new Date(tx.date).toLocaleDateString()}</TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      {tx.type === "BILL" ? (
                        <FileText className="w-4 h-4 text-orange-500" />
                      ) : (
                        <Wallet className="w-4 h-4 text-green-500" />
                      )}
                      <span className="text-xs font-medium">{tx.type}</span>
                    </div>
                  </TableCell>
                  <TableCell className="font-mono text-xs">{tx.reference}</TableCell>
                  <TableCell>{tx.description}</TableCell>
                  <TableCell className={`text-right font-medium ${tx.type === "PAYMENT" ? "text-green-600" : ""}`}>
                    {tx.amount.toFixed(2)}
                  </TableCell>
                  <TableCell className="text-right font-bold">
                    {tx.balance.toFixed(2)}
                  </TableCell>
                  <TableCell>
                    <Badge variant={tx.status === "POSTED" ? "success" : "outline"}>
                      {tx.status}
                    </Badge>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
