"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { createStudentSchema, type CreateStudentInput } from "@/lib/validations/schemas";
import { useAuth } from "@/components/providers/auth-provider";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, ArrowLeft } from "lucide-react";
import { toast } from "sonner";
import Link from "next/link";

export default function NewStudentPage() {
  const [isLoading, setIsLoading] = useState(false);
  const [fatherGuardian, setFatherGuardian] = useState({
    fullName: "",
    nationalIdNumber: "",
    primaryPhone: "",
    address: "",
    email: "",
  });
  const [motherGuardian, setMotherGuardian] = useState({
    fullName: "",
    nationalIdNumber: "",
    primaryPhone: "",
    address: "",
    email: "",
  });
  const router = useRouter();
  const { token, user } = useAuth();

  const form = useForm<CreateStudentInput>({
    resolver: zodResolver(createStudentSchema),
    defaultValues: {
      organisationId: user?.organisationId || "",
      studentNumber: "",
      firstName: "",
      lastName: "",
      grade: "",
      class: "",
      birthCertificateNumber: "",
      nationalIdNumber: "",
      homeAddress: "",
    },
  });

  async function onSubmit(values: CreateStudentInput) {
    const requiredGuardianFields = [
      { label: "Father full name", value: fatherGuardian.fullName },
      { label: "Father National ID Number", value: fatherGuardian.nationalIdNumber },
      { label: "Father phone number", value: fatherGuardian.primaryPhone },
      { label: "Father home address", value: fatherGuardian.address },
      { label: "Mother/Guardian full name", value: motherGuardian.fullName },
      { label: "Mother/Guardian National ID Number", value: motherGuardian.nationalIdNumber },
      { label: "Mother/Guardian phone number", value: motherGuardian.primaryPhone },
      { label: "Mother/Guardian home address", value: motherGuardian.address },
    ];

    for (const field of requiredGuardianFields) {
      if (!String(field.value || "").trim()) {
        toast.error(`${field.label} is required`);
        return;
      }
    }

    setIsLoading(true);
    try {
      const response = await fetch("/api/students", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify(values),
      });

      const student = await response.json();

      if (!response.ok) {
        throw new Error(student.error || "Failed to create student");
      }

      const guardiansPayload = [
        {
          ...fatherGuardian,
          relationship: "Father",
          studentIds: [student.id],
          isPrimaryContact: true,
          isBillingContact: true,
        },
        {
          ...motherGuardian,
          relationship: "Mother/Guardian",
          studentIds: [student.id],
          isPrimaryContact: false,
          isBillingContact: false,
        },
      ];

      for (const guardian of guardiansPayload) {
        const guardianResponse = await fetch("/api/guardians", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${token}`,
          },
          body: JSON.stringify(guardian),
        });

        const guardianData = await guardianResponse.json();
        if (!guardianResponse.ok) {
          throw new Error(guardianData.error || "Student created, but failed to create guardian records");
        }
      }

      toast.success("Student and guardian records created successfully");
      router.push("/dashboard/students");
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className="space-y-6 max-w-2xl mx-auto">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" asChild>
          <Link href="/dashboard/students">
            <ArrowLeft className="w-4 h-4" />
          </Link>
        </Button>
        <h1 className="text-3xl font-bold tracking-tight">Add New Student</h1>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Student Details</CardTitle>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="studentNumber"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Student Number / ID</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g. 2026-001" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="firstName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>First Name</FormLabel>
                      <FormControl>
                        <Input placeholder="John" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="lastName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Last Name</FormLabel>
                      <FormControl>
                        <Input placeholder="Doe" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="grade"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Grade / Form</FormLabel>
                        <FormControl>
                          <Input placeholder="e.g. Form 1" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="class"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Class</FormLabel>
                        <FormControl>
                          <Input placeholder="e.g. A" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="birthCertificateNumber"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Birth Certificate Number (Form 1–4)</FormLabel>
                        <FormControl>
                          <Input placeholder="Required for Form 1–4" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="nationalIdNumber"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>National ID Number (Form 5–6)</FormLabel>
                        <FormControl>
                          <Input placeholder="Required for Form 5–6" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <FormField
                  control={form.control}
                  name="homeAddress"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Student Home Address</FormLabel>
                      <FormControl>
                        <Input placeholder="Student home address" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="rounded-md border p-4 space-y-4">
                  <h3 className="font-medium">Guardian Details (Required)</h3>

                  <div className="space-y-3">
                    <h4 className="text-sm font-semibold">Father Details</h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      <Input placeholder="Father full name" value={fatherGuardian.fullName} onChange={(e) => setFatherGuardian({ ...fatherGuardian, fullName: e.target.value })} />
                      <Input placeholder="Father National ID Number" value={fatherGuardian.nationalIdNumber} onChange={(e) => setFatherGuardian({ ...fatherGuardian, nationalIdNumber: e.target.value })} />
                      <Input placeholder="Father phone number" value={fatherGuardian.primaryPhone} onChange={(e) => setFatherGuardian({ ...fatherGuardian, primaryPhone: e.target.value })} />
                      <Input placeholder="Father home address" value={fatherGuardian.address} onChange={(e) => setFatherGuardian({ ...fatherGuardian, address: e.target.value })} />
                      <Input placeholder="Father email (optional)" value={fatherGuardian.email} onChange={(e) => setFatherGuardian({ ...fatherGuardian, email: e.target.value })} />
                    </div>
                  </div>

                  <div className="space-y-3">
                    <h4 className="text-sm font-semibold">Mother/Guardian Details</h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      <Input placeholder="Mother/Guardian full name" value={motherGuardian.fullName} onChange={(e) => setMotherGuardian({ ...motherGuardian, fullName: e.target.value })} />
                      <Input placeholder="Mother/Guardian National ID Number" value={motherGuardian.nationalIdNumber} onChange={(e) => setMotherGuardian({ ...motherGuardian, nationalIdNumber: e.target.value })} />
                      <Input placeholder="Mother/Guardian phone number" value={motherGuardian.primaryPhone} onChange={(e) => setMotherGuardian({ ...motherGuardian, primaryPhone: e.target.value })} />
                      <Input placeholder="Mother/Guardian home address" value={motherGuardian.address} onChange={(e) => setMotherGuardian({ ...motherGuardian, address: e.target.value })} />
                      <Input placeholder="Mother/Guardian email (optional)" value={motherGuardian.email} onChange={(e) => setMotherGuardian({ ...motherGuardian, email: e.target.value })} />
                    </div>
                  </div>
                </div>
              <div className="flex justify-end gap-2 pt-4">
                <Button variant="outline" type="button" asChild>
                  <Link href="/dashboard/students">Cancel</Link>
                </Button>
                <Button type="submit" disabled={isLoading}>
                  {isLoading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                  Create Student
                </Button>
              </div>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
}
