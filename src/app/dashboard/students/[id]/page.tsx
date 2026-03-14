"use client";

import { useEffect, useState, use } from "react";
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
  Download,
  AlertTriangle
} from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";
import { useAuth } from "@/components/providers/auth-provider";
import { format } from "date-fns";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export default function StudentDetailPage(props: { params: Promise<{ id: string }> }) {
  const params = use(props.params);
  const { token } = useAuth();
  const [data, setData] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [guardians, setGuardians] = useState<any[]>([]);
  const [studentGuardians, setStudentGuardians] = useState<any[]>([]);
  const [selectedGuardianId, setSelectedGuardianId] = useState<string>("");

  const fetchStatement = async () => {
    setIsLoading(true);
    try {
      const response = await fetch(`/api/ar/students/${params.id}/statement`, {
        headers: { "Authorization": `Bearer ${token}` }
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error);
      setData(result);
    } catch (error: any) {
      toast.error(error.message || "Failed to fetch statement");
    } finally {
      setIsLoading(false);
    }
  };

  const fetchGuardians = async () => {
    const [allRes, linkedRes] = await Promise.all([
      fetch(`/api/guardians`, { headers: { "Authorization": `Bearer ${token}` } }),
      fetch(`/api/students/${params.id}/guardians`, { headers: { "Authorization": `Bearer ${token}` } }),
    ]);
    const [allData, linkedData] = await Promise.all([allRes.json(), linkedRes.json()]);
    setGuardians(Array.isArray(allData) ? allData : []);
    setStudentGuardians(Array.isArray(linkedData) ? linkedData : []);
  };

  const linkGuardian = async () => {
    if (!selectedGuardianId) return;
    const res = await fetch(`/api/students/${params.id}/guardians`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${token}`,
      },
      body: JSON.stringify({ guardianId: selectedGuardianId }),
    });
    const payload = await res.json();
    if (!res.ok) {
      toast.error(payload.error || "Failed to link guardian");
      return;
    }
    toast.success("Guardian linked");
    setSelectedGuardianId("");
    await fetchGuardians();
  };

  useEffect(() => {
    if (token) {
      fetchStatement();
      fetchGuardians();
    }
  }, [token]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!data) {
    return (
      <div className="text-center py-12">
        <AlertTriangle className="w-12 h-12 mx-auto text-yellow-500 mb-4" />
        <h2 className="text-xl font-bold">Student Not Found</h2>
        <Button variant="link" asChild>
          <Link href="/dashboard/students">Back to List</Link>
        </Button>
      </div>
    );
  }

  const { student, transactions, totalBalance } = data;

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
                Student No: {student.studentNumber} | Grade: {student.grade || "N/A"} | Class: {student.class || "N/A"}
              </p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => window.print()}>
            <Printer className="w-4 h-4 mr-2" />
            Print Statement
          </Button>
          <Button asChild>
            <Link href={`/dashboard/ar/invoices/new?studentId=${student.id}`}>
              <FileText className="w-4 h-4 mr-2" />
              New Invoice
            </Link>
          </Button>
          <Button variant="secondary" asChild>
            <Link href={`/dashboard/ar/receipts/new?studentId=${student.id}`}>
              <Receipt className="w-4 h-4 mr-2" />
              Receive Payment
            </Link>
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Outstanding Balance</CardDescription>
            <CardTitle className={`text-2xl ${Number(totalBalance) > 0 ? "text-red-600" : "text-green-600"}`}>
              {student.organisation?.baseCurrency || "ZWG"} {Number(totalBalance).toLocaleString(undefined, { minimumFractionDigits: 2 })}
            </CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Status</CardDescription>
            <CardTitle className="text-2xl">
              <Badge variant={student.isActive ? "default" : "secondary"}>
                {student.isActive ? "Active" : "Inactive"}
              </Badge>
            </CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Enrollment Date</CardDescription>
            <CardTitle className="text-2xl">
              {student.enrollmentDate ? format(new Date(student.enrollmentDate), "dd MMM yyyy") : "N/A"}
            </CardTitle>
          </CardHeader>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Guardians</CardTitle>
          <CardDescription>Linked guardians for this student.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-2">
            <Select value={selectedGuardianId} onValueChange={setSelectedGuardianId}>
              <SelectTrigger className="w-[320px]">
                <SelectValue placeholder="Select guardian to link" />
              </SelectTrigger>
              <SelectContent>
                {guardians
                  .filter((g) => !studentGuardians.some((sg) => sg.guardianId === g.id))
                  .map((g) => (
                    <SelectItem key={g.id} value={g.id}>{g.fullName} ({g.relationship})</SelectItem>
                  ))}
              </SelectContent>
            </Select>
            <Button onClick={linkGuardian} disabled={!selectedGuardianId}>Link Guardian</Button>
          </div>

          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Relationship</TableHead>
                <TableHead>Primary Phone</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Primary Contact</TableHead>
                <TableHead>Billing Contact</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {studentGuardians.length === 0 ? (
                <TableRow><TableCell colSpan={6} className="text-center">No guardians linked yet.</TableCell></TableRow>
              ) : studentGuardians.map((sg) => (
                <TableRow key={sg.id}>
                  <TableCell>{sg.guardian?.fullName}</TableCell>
                  <TableCell>{sg.guardian?.relationship}</TableCell>
                  <TableCell>{sg.guardian?.primaryPhone}</TableCell>
                  <TableCell>{sg.guardian?.email || "-"}</TableCell>
                  <TableCell>{sg.isPrimaryContact ? "Yes" : "No"}</TableCell>
                  <TableCell>{sg.isBillingContact ? "Yes" : "No"}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Transaction History (Statement)</CardTitle>
          <CardDescription>
            All invoices and receipts for this student.
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
                <TableHead className="text-right">Amount</TableHead>
                <TableHead className="text-right">Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {transactions.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                    No transactions found.
                  </TableCell>
                </TableRow>
              ) : (
                transactions.map((tx: any) => (
                  <TableRow key={tx.id}>
                    <TableCell>{format(new Date(tx.date), "dd MMM yyyy")}</TableCell>
                    <TableCell>
                      <Badge variant={tx.type === "INVOICE" ? "outline" : "secondary"}>
                        {tx.type}
                      </Badge>
                    </TableCell>
                    <TableCell className="font-medium">{tx.number}</TableCell>
                    <TableCell>{tx.description}</TableCell>
                    <TableCell className={`text-right font-bold ${Number(tx.amount) > 0 ? "text-red-600" : "text-green-600"}`}>
                      {Number(tx.amount).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                    </TableCell>
                    <TableCell className="text-right">
                      <Badge variant={tx.status === "POSTED" ? "default" : "secondary"}>
                        {tx.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                       <Button variant="ghost" size="sm" asChild>
                          <Link href={`/dashboard/vouchers/${tx.voucherId || tx.id}`}>
                            View
                          </Link>
                       </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
