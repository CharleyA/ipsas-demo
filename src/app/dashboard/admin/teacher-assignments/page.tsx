"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/components/providers/auth-provider";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";

export default function TeacherAssignmentsPage() {
  const { token } = useAuth();
  const [teachers, setTeachers] = useState<any[]>([]);
  const [assignments, setAssignments] = useState<any[]>([]);
  const [form, setForm] = useState({ teacherUserId: "", grade: "", className: "", academicYear: String(new Date().getFullYear()), isPrimary: false });

  const load = async () => {
    if (!token) return;

    const [usersRes, assignmentsRes] = await Promise.all([
      fetch("/api/users", { headers: { Authorization: `Bearer ${token}` } }),
      fetch("/api/teachers/assignments", { headers: { Authorization: `Bearer ${token}` } }),
    ]);

    const users = await usersRes.json();
    const assignmentData = await assignmentsRes.json();

    if (users.success) {
      setTeachers((users.data || []).filter((u: any) => u.role === "TEACHER"));
    }

    setAssignments(assignmentData.assignments || []);
  };

  useEffect(() => {
    load();
  }, [token]);

  const createAssignment = async () => {
    if (!form.teacherUserId || !form.className || !form.academicYear) {
      toast.error("Teacher, class and academic year are required");
      return;
    }

    const res = await fetch("/api/teachers/assignments", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(form),
    });

    const result = await res.json();
    if (!res.ok) {
      toast.error(result.error || "Failed to save assignment");
      return;
    }

    toast.success("Assignment saved");
    setForm({ ...form, className: "", grade: "" });
    load();
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Teacher Class Assignments</h1>
        <p className="text-muted-foreground">Map each teacher to class(es) and academic year.</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>New Assignment</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-5">
          <div className="md:col-span-2">
            <Label>Teacher</Label>
            <Select value={form.teacherUserId} onValueChange={(v) => setForm({ ...form, teacherUserId: v })}>
              <SelectTrigger>
                <SelectValue placeholder="Select teacher" />
              </SelectTrigger>
              <SelectContent>
                {teachers.map((t) => (
                  <SelectItem key={t.id} value={t.id}>{t.firstName} {t.lastName} ({t.ecNumber || "No EC"})</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Grade</Label>
            <Input value={form.grade} onChange={(e) => setForm({ ...form, grade: e.target.value })} placeholder="e.g. Grade 6" />
          </div>
          <div>
            <Label>Class</Label>
            <Input value={form.className} onChange={(e) => setForm({ ...form, className: e.target.value })} placeholder="e.g. 6A" />
          </div>
          <div>
            <Label>Academic Year</Label>
            <Input value={form.academicYear} onChange={(e) => setForm({ ...form, academicYear: e.target.value })} />
          </div>
          <div className="md:col-span-5">
            <Button onClick={createAssignment}>Save Assignment</Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Current Assignments</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2 text-sm">
            {assignments.length === 0 ? (
              <p className="text-muted-foreground">No assignments yet.</p>
            ) : assignments.map((a) => (
              <div key={a.id} className="rounded border p-3">
                <strong>{a.teacher?.firstName} {a.teacher?.lastName}</strong> ({a.teacher?.ecNumber || "No EC"}) — {a.grade ? `${a.grade} ` : ""}{a.className} [{a.academicYear}]
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
