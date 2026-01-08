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
import { Plus, Import, ArrowRightLeft, Loader2, Wallet } from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";
import { useAuth } from "@/components/providers/auth-provider";

export default function BankAccountsPage() {
  const { token } = useAuth();
  const [accounts, setAccounts] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchAccounts = async () => {
    setIsLoading(true);
    try {
      const response = await fetch("/api/bank/accounts", {
        headers: { "Authorization": `Bearer ${token}` }
      });
      const data = await response.json();
      setAccounts(Array.isArray(data) ? data : []);
    } catch (error) {
      toast.error("Failed to fetch bank accounts");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (token) fetchAccounts();
  }, [token]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Bank Accounts</h1>
          <p className="text-muted-foreground">
            Manage your bank and cash accounts and track their balances.
          </p>
        </div>
        <div className="flex gap-2">
          <Button asChild variant="outline">
            <Link href="/dashboard/bank/reconcile">
              <Import className="w-4 h-4 mr-2" />
              Import Statement
            </Link>
          </Button>
          <Button asChild>
            <Link href="/dashboard/bank/cashbook/new">
              <Plus className="w-4 h-4 mr-2" />
              Cashbook Entry
            </Link>
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Accounts Summary</CardTitle>
          <CardDescription>
            Overview of all registered bank and cash accounts.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="w-8 h-8 animate-spin text-primary" />
            </div>
          ) : accounts.length === 0 ? (
            <div className="text-center py-12">
               <Wallet className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
               <h3 className="text-lg font-medium">No bank accounts found</h3>
               <p className="text-muted-foreground mb-4">Register your bank accounts in the Chart of Accounts first.</p>
               <Button asChild variant="outline">
                  <Link href="/dashboard/accounts">Go to Chart of Accounts</Link>
               </Button>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Bank / Account Name</TableHead>
                  <TableHead>Account Number</TableHead>
                  <TableHead>Currency</TableHead>
                  <TableHead className="text-right">GL Balance</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {accounts.map((acc) => (
                  <TableRow key={acc.id}>
                    <TableCell className="font-medium">
                      <div>{acc.bankName}</div>
                      <div className="text-xs text-muted-foreground">{acc.account.name}</div>
                    </TableCell>
                    <TableCell>{acc.accountNumber}</TableCell>
                    <TableCell>{acc.currencyCode}</TableCell>
                    <TableCell className="text-right font-mono">
                      {new Intl.NumberFormat('en-US', { minimumFractionDigits: 2 }).format(acc._balance || 0)}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button variant="ghost" size="sm" asChild>
                          <Link href={`/dashboard/bank/reconcile?bankAccountId=${acc.id}`}>
                            <ArrowRightLeft className="w-4 h-4 mr-2" />
                            Reconcile
                          </Link>
                        </Button>
                      </div>
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
