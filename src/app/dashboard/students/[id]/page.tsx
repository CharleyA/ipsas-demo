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
  Receipt, 
  Loader2,
  Printer,
  Download
} from "lucide-react";
import Link from "next/link";
import { useAuth } from "@/components/providers/auth-provider";
import { toast } from "sonner";

export default function StudentDetailPage() {
  const { id } = useParams();
  const { token } = useAuth();
  const [student, setStudent] = useState<any>(null);
  const [transactions, setTransactions] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true);
      try {
        // Mock data for student
        setStudent({
          id,
          studentNumber: "2026-001",
          firstName: "John",
          lastName: "Doe",
          grade: "Form 1A",
          balance: 1500.00
        });

        // Mock transactions
        setTransactions([
          {
            id: "t1",
            date: "2026-01-01",
            type: "INVOICE",
            reference: "INV-2026-001",
            description: "Term 1 School Fees",
            amount: 2500.00,
            balance: 1500.00,
            status: "PARTIAL"
          },
          {
            id: "t2",
            date: "2026-01-05",
            type: "RECEIPT",
            reference: "RCT-2026-005",
            description: "Initial Payment",
            amount: -1000.00,
            balance: 1500.00,
            status: "POSTED"
          }
        ]);
      } catch (error) {
        toast.error("Failed to load student statement");
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

  if (!student) return <div>Student not found</div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" asChild>
            <Link href="/dashboard/students">
              <ArrowLeft className="w-4 h-4" />
            </Link>
          </Button>
          <div>
            <h1 className="text-3xl font-bold tracking-tight">
              {student.firstName} {student.lastName}
            </h1>
            <p className="text-muted-foreground">
              {student.studentNumber} • {student.grade}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline">
            <Printer className="w-4 h-4 mr-2" />
            Print Statement
          </Button>
          <Button variant="outline">
            <Download className="w-4 h-4 mr-2" />
            Export CSV
          </Button>
          <Button asChild>
            <Link href={`/dashboard/vouchers/new?type=RECEIPT&studentId=${id}`}>
              <PlusIcon className="w-4 h-4 mr-2" />
              Receive Payment
            </Link>
          </Button>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Invoiced</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">ZWG 2,500.00</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Paid</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">ZWG 1,000.00</div>
          </CardContent>
        </Card>
        <Card className="border-primary/50 bg-primary/5">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-primary">Outstanding Balance</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">ZWG 1,500.00</div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Transaction History</CardTitle>
          <CardDescription>
            All invoices and payments associated with this student.
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
                      {tx.type === "INVOICE" ? (
                        <FileText className="w-4 h-4 text-blue-500" />
                      ) : (
                        <Receipt className="w-4 h-4 text-green-500" />
                      )}
                      <span className="text-xs font-medium">{tx.type}</span>
                    </div>
                  </TableCell>
                  <TableCell className="font-mono text-xs">{tx.reference}</TableCell>
                  <TableCell>{tx.description}</TableCell>
                  <TableCell className={`text-right font-medium ${tx.amount < 0 ? "text-green-600" : ""}`}>
                    {Math.abs(tx.amount).toFixed(2)}
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

function PlusIcon(props: any) {
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
      <path d="M5 12h14" />
      <path d="M12 5v14" />
    </svg>
  );
}
