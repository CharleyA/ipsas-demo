"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useAuth } from "@/components/providers/auth-provider";
import { Loader2 } from "lucide-react";

export default function TeachersPortalPage() {
  const { token } = useAuth();
  const [classes, setClasses] = useState<string[]>([]);
  const [selectedClass, setSelectedClass] = useState<string>("all");
  const [summary, setSummary] = useState<any>(null);
  const [students, setStudents] = useState<any[]>([]);
  const [recentPayments, setRecentPayments] = useState<any[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  const fetchData = async (classFilter: string) => {
    setLoading(true);
    try {
      const res = await fetch(`/api/teachers/overview?class=${encodeURIComponent(classFilter)}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      setClasses(Array.isArray(data.classes) ? data.classes : []);
      setSummary(data.summary || null);
      setStudents(Array.isArray(data.students) ? data.students : []);
      setRecentPayments(Array.isArray(data.recentPayments) ? data.recentPayments : []);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (token) fetchData(selectedClass);
  }, [token, selectedClass]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Teachers Portal</h1>
          <p className="text-muted-foreground">Read-only class list and fee payment trends.</p>
        </div>
        <Select value={selectedClass} onValueChange={setSelectedClass}>
          <SelectTrigger className="w-[200px]">
            <SelectValue placeholder="Select Class" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Classes</SelectItem>
            {classes.map((c) => (
              <SelectItem key={c} value={c}>{c}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-6 h-6 animate-spin" />
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card>
              <CardHeader><CardTitle className="text-sm">Paid</CardTitle></CardHeader>
              <CardContent className="text-2xl font-bold">{summary?.paid || 0}</CardContent>
            </Card>
            <Card>
              <CardHeader><CardTitle className="text-sm">Partial Paid</CardTitle></CardHeader>
              <CardContent className="text-2xl font-bold">{summary?.partial || 0}</CardContent>
            </Card>
            <Card>
              <CardHeader><CardTitle className="text-sm">Unpaid</CardTitle></CardHeader>
              <CardContent className="text-2xl font-bold">{summary?.unpaid || 0}</CardContent>
            </Card>
            <Card>
              <CardHeader><CardTitle className="text-sm">Total Outstanding</CardTitle></CardHeader>
              <CardContent className="text-2xl font-bold">{Number(summary?.totalOutstanding || 0).toFixed(2)}</CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Students</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Student #</TableHead>
                    <TableHead>Name</TableHead>
                    <TableHead>Class</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Outstanding</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {students.length === 0 ? (
                    <TableRow><TableCell colSpan={5} className="text-center">No students found.</TableCell></TableRow>
                  ) : students.map((s) => (
                    <TableRow key={s.id}>
                      <TableCell>{s.studentNumber}</TableCell>
                      <TableCell>{s.firstName} {s.lastName}</TableCell>
                      <TableCell>{s.class || "-"}</TableCell>
                      <TableCell>{s.status}</TableCell>
                      <TableCell className="text-right">{Number(s.totalBalance || 0).toFixed(2)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Recent Payments</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Student</TableHead>
                    <TableHead>Student #</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Method</TableHead>
                    <TableHead>Reference</TableHead>
                    <TableHead className="text-right">Amount</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {recentPayments.length === 0 ? (
                    <TableRow><TableCell colSpan={6} className="text-center">No payments found.</TableCell></TableRow>
                  ) : recentPayments.map((p) => (
                    <TableRow key={p.id}>
                      <TableCell>{p.studentName}</TableCell>
                      <TableCell>{p.studentNumber}</TableCell>
                      <TableCell>{new Date(p.createdAt).toLocaleDateString()}</TableCell>
                      <TableCell>{p.paymentMethod || "-"}</TableCell>
                      <TableCell>{p.reference || "-"}</TableCell>
                      <TableCell className="text-right">{Number(p.amount || 0).toFixed(2)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
