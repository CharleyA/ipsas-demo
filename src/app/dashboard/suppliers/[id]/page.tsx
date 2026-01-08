"use client";

import { useEffect, useState } from "react";
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
  Receipt, 
  Loader2, 
  Download,
  CheckCircle2,
  Clock
} from "lucide-react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { toast } from "sonner";
import { useAuth } from "@/components/providers/auth-provider";
import { format } from "date-fns";

export default function SupplierDetailPage() {
  const { id } = useParams();
  const { token } = useAuth();
  const [data, setData] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);

  const fetchStatement = async () => {
    setIsLoading(true);
    try {
      const response = await fetch(`/api/ap/suppliers/${id}/statement`, {
        headers: { "Authorization": `Bearer ${token}` }
      });
      const result = await response.json();
      setData(result);
    } catch (error) {
      toast.error("Failed to fetch supplier statement");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (token && id) fetchStatement();
  }, [token, id]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!data) return <div>Supplier not found</div>;

  const { supplier, transactions, totalBalance } = data;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="outline" size="icon" asChild>
            <Link href="/dashboard/suppliers">
              <ArrowLeft className="w-4 h-4" />
            </Link>
          </Button>
          <div>
            <h1 className="text-3xl font-bold tracking-tight">{supplier.name}</h1>
            <p className="text-muted-foreground">
              Code: {supplier.code} | Tax ID: {supplier.taxNumber || "N/A"}
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" asChild>
            <Link href={`/api/ap/suppliers/${id}/statement?format=pdf`} target="_blank">
              <Download className="w-4 h-4 mr-2" />
              Statement PDF
            </Link>
          </Button>
          <Button asChild>
            <Link href={`/dashboard/ap/bills/new?supplierId=${id}`}>
              <FileText className="w-4 h-4 mr-2" />
              New Bill
            </Link>
          </Button>
          <Button variant="secondary" asChild>
            <Link href={`/dashboard/ap/payments/new?supplierId=${id}`}>
              <Receipt className="w-4 h-4 mr-2" />
              Record Payment
            </Link>
          </Button>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total Outstanding
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              ZWG {parseFloat(totalBalance).toLocaleString(undefined, { minimumFractionDigits: 2 })}
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Transaction History</CardTitle>
          <CardDescription>
            All bills and payments for this supplier.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Reference</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Amount</TableHead>
                <TableHead className="text-right">Balance</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {transactions.map((tx: any) => (
                <TableRow key={tx.id}>
                  <TableCell>{format(new Date(tx.date), "dd MMM yyyy")}</TableCell>
                  <TableCell className="font-medium">{tx.number}</TableCell>
                  <TableCell>
                    <Badge variant="outline">{tx.type}</Badge>
                  </TableCell>
                  <TableCell>
                    {tx.status === "POSTED" ? (
                      <Badge className="bg-green-500/10 text-green-500 hover:bg-green-500/20 border-green-500/20">
                        <CheckCircle2 className="w-3 h-3 mr-1" /> Posted
                      </Badge>
                    ) : (
                      <Badge variant="secondary">
                        <Clock className="w-3 h-3 mr-1" /> {tx.status}
                      </Badge>
                    )}
                  </TableCell>
                  <TableCell className="text-right">
                    {parseFloat(tx.amount).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                  </TableCell>
                  <TableCell className="text-right font-semibold">
                    {tx.balance ? parseFloat(tx.balance).toLocaleString(undefined, { minimumFractionDigits: 2 }) : "-"}
                  </TableCell>
                </TableRow>
              ))}
              {transactions.length === 0 && (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                    No transactions found.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
