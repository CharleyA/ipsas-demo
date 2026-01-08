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
import { Plus, Search, Eye, FileText, Receipt, Loader2 } from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";
import { useAuth } from "@/components/providers/auth-provider";

export default function StudentsPage() {
  const { token } = useAuth();
  const [students, setStudents] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState("");

  const fetchStudents = async () => {
    setIsLoading(true);
    try {
      const response = await fetch("/api/students", {
        headers: { "Authorization": `Bearer ${token}` }
      });
      const data = await response.json();
      setStudents(Array.isArray(data) ? data : []);
    } catch (error) {
      toast.error("Failed to fetch students");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (token) fetchStudents();
  }, [token]);

  const filteredStudents = students.filter(s => 
    `${s.firstName} ${s.lastName} ${s.studentNumber}`.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Students (AR)</h1>
          <p className="text-muted-foreground">
            Manage student accounts, invoices, and fee payments.
          </p>
        </div>
        <Button asChild>
          <Link href="/dashboard/students/new">
            <Plus className="w-4 h-4 mr-2" />
            Add Student
          </Link>
        </Button>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Student Directory</CardTitle>
              <CardDescription>
                A list of all students registered in the system.
              </CardDescription>
            </div>
            <div className="relative w-64">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search students..."
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
          ) : filteredStudents.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No students found.
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Student No.</TableHead>
                  <TableHead>Full Name</TableHead>
                  <TableHead>Grade</TableHead>
                  <TableHead>Balance (ZWG)</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredStudents.map((student) => (
                  <TableRow key={student.id}>
                    <TableCell className="font-medium">
                      {student.studentNumber}
                    </TableCell>
                    <TableCell>
                      {student.firstName} {student.lastName}
                    </TableCell>
                    <TableCell>{student.grade || "N/A"}</TableCell>
                    <TableCell>
                      {/* Balance would normally come from a summary API */}
                      0.00
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button variant="ghost" size="icon" title="View Statement" asChild>
                          <Link href={`/dashboard/students/${student.id}`}>
                            <Eye className="w-4 h-4" />
                          </Link>
                        </Button>
                        <Button variant="ghost" size="icon" title="Raise Invoice" asChild>
                          <Link href={`/dashboard/vouchers/new?type=INVOICE&studentId=${student.id}`}>
                            <FileText className="w-4 h-4" />
                          </Link>
                        </Button>
                        <Button variant="ghost" size="icon" title="Receive Payment" asChild>
                          <Link href={`/dashboard/vouchers/new?type=RECEIPT&studentId=${student.id}`}>
                            <Receipt className="w-4 h-4" />
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
