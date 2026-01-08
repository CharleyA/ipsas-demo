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
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { 
  Plus, 
  Search, 
  Eye, 
  Loader2, 
  CheckCircle2, 
  Clock 
} from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";
import { useAuth } from "@/components/providers/auth-provider";
import { format } from "date-fns";

export default function APBillsPage() {
  const { token, user } = useAuth();
  const [bills, setBills] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState("");

  const fetchBills = async () => {
    setIsLoading(true);
    try {
      const response = await fetch(`/api/ap/bills?organisationId=${user?.organisationId}`, {
        headers: { "Authorization": `Bearer ${token}` }
      });
      const data = await response.json();
      setBills(Array.isArray(data) ? data : []);
    } catch (error) {
      toast.error("Failed to fetch bills");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (token && user) fetchBills();
  }, [token, user]);

  const filteredBills = bills.filter(b => 
    `${b.supplier?.name} ${b.voucher?.number}`.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Supplier Bills</h1>
          <p className="text-muted-foreground">
            Manage all incoming bills and vendor invoices.
          </p>
        </div>
        <Button asChild>
          <Link href="/dashboard/ap/bills/new">
            <Plus className="w-4 h-4 mr-2" />
            New Bill
          </Link>
        </Button>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>All Bills</CardTitle>
              <CardDescription>
                A list of all supplier bills and their payment status.
              </CardDescription>
            </div>
            <div className="relative w-64">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search bills..."
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
          ) : filteredBills.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No bills found.
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Number</TableHead>
                  <TableHead>Supplier</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Due Date</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Amount</TableHead>
                  <TableHead className="text-right">Balance</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredBills.map((bill) => (
                  <TableRow key={bill.id}>
                    <TableCell className="font-medium">
                      {bill.voucher?.number}
                    </TableCell>
                    <TableCell>{bill.supplier?.name}</TableCell>
                    <TableCell>{format(new Date(bill.voucher?.date), "dd MMM yyyy")}</TableCell>
                    <TableCell>{format(new Date(bill.dueDate), "dd MMM yyyy")}</TableCell>
                    <TableCell>
                      {bill.voucher?.status === "POSTED" ? (
                        <Badge className="bg-green-500/10 text-green-500 hover:bg-green-500/20 border-green-500/20">
                          <CheckCircle2 className="w-3 h-3 mr-1" /> Posted
                        </Badge>
                      ) : (
                        <Badge variant="secondary">
                          <Clock className="w-3 h-3 mr-1" /> {bill.voucher?.status}
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-right font-medium">
                      {parseFloat(bill.amount).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                    </TableCell>
                    <TableCell className="text-right font-bold">
                      {parseFloat(bill.balance).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button variant="ghost" size="icon" asChild>
                        <Link href={`/dashboard/suppliers/${bill.supplierId}`}>
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
