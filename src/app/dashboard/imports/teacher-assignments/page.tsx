"use client";

import { useState } from "react";
import Papa from "papaparse";
import { useAuth } from "@/components/providers/auth-provider";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";

const TEMPLATE = `Teacher Email,EC Number,Grade,Class,Academic Year,Active\nteacher1@school.ac.zw,EC12345,Grade 6,6A,2026,Yes`;

export default function TeacherAssignmentsImportPage() {
  const { token } = useAuth();
  const [file, setFile] = useState<File | null>(null);
  const [processing, setProcessing] = useState(false);

  const downloadTemplate = () => {
    const blob = new Blob([TEMPLATE], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "teacher_class_assignments_template.csv";
    a.click();
    URL.revokeObjectURL(url);
  };

  const runImport = async () => {
    if (!file || !token) return;
    setProcessing(true);

    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: async (results: any) => {
        try {
          const rows = results.data || [];
          if (!rows.length) {
            toast.error("No rows found in CSV");
            setProcessing(false);
            return;
          }

          const usersRes = await fetch("/api/users", { headers: { Authorization: `Bearer ${token}` } });
          const usersPayload = await usersRes.json();
          const users = (usersPayload.data || []) as any[];
          const teacherUsers = users.filter((u) => u.role === "TEACHER");

          let success = 0;
          let failed = 0;

          for (const row of rows) {
            const email = String(row["Teacher Email"] || "").trim().toLowerCase();
            const ec = String(row["EC Number"] || "").trim();
            const className = String(row["Class"] || "").trim();
            const grade = String(row["Grade"] || "").trim();
            const academicYear = String(row["Academic Year"] || "").trim();
            const isActive = String(row["Active"] || "Yes").toLowerCase() !== "no";

            const teacher = teacherUsers.find((u) => String(u.email).toLowerCase() === email);
            if (!teacher || !className || !academicYear) {
              failed++;
              continue;
            }

            if (ec && teacher.ecNumber !== ec) {
              await fetch(`/api/users/${teacher.id}`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
                body: JSON.stringify({ ecNumber: ec }),
              });
            }

            const saveRes = await fetch("/api/teachers/assignments", {
              method: "POST",
              headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
              body: JSON.stringify({
                teacherUserId: teacher.id,
                grade: grade || null,
                className,
                academicYear,
                isActive,
                isPrimary: false,
              }),
            });

            if (saveRes.ok) success++;
            else failed++;
          }

          toast.success(`Import done: ${success} success, ${failed} failed`);
        } catch (e: any) {
          toast.error(e.message || "Import failed");
        } finally {
          setProcessing(false);
        }
      },
    });
  };

  return (
    <div className="space-y-6 max-w-3xl">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Import Teacher Class Assignments</h1>
        <p className="text-muted-foreground">Bulk-load teacher EC numbers and class mappings.</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>1) Download Template</CardTitle>
          <CardDescription>Use this exact column structure.</CardDescription>
        </CardHeader>
        <CardContent>
          <Button onClick={downloadTemplate}>Download CSV Template</Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>2) Upload Filled CSV</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Input type="file" accept=".csv" onChange={(e) => setFile(e.target.files?.[0] || null)} />
          <Button onClick={runImport} disabled={!file || processing}>{processing ? "Importing..." : "Run Import"}</Button>
        </CardContent>
      </Card>
    </div>
  );
}
