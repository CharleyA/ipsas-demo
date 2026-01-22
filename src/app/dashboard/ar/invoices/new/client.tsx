"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { createARInvoiceSchema, type CreateARInvoiceInput } from "@/lib/validations/schemas";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { 
  Loader2, 
  ArrowLeft, 
  Plus, 
  Trash2, 
} from "lucide-react";
import { toast } from "sonner";
import Link from "next/link";

export default function NewARInvoiceForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { token, user } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [students, setStudents] = useState<any[]>([]);
  const [currencies, setCurrencies] = useState<any[]>([]);

  const studentId = searchParams.get("studentId") || "";

  const form = useForm<CreateARInvoiceInput>({
    resolver: zodResolver(createARInvoiceSchema),
    defaultValues: {
      organisationId: user?.organisationId || "",
      studentId: studentId,
      currencyCode: "ZWG",
      term: "Term 1 2026",
      dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
      lines: [
        { description: "Tuition Fees", quantity: 1, unitPrice: 0, amount: 0 },
      ],
      description: "",
    },
  });

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "lines",
  });

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [stuRes, curRes] = await Promise.all([
          fetch("/api/students", {
            headers: { "Authorization": `Bearer ${token}` }
          }),
          fetch(`/api/organisations/${user?.organisationId}/currencies`, {
            headers: { "Authorization": `Bearer ${token}` }
          })
        ]);
        const stuData = await stuRes.json();
        const curData = await curRes.json();
        setStudents(Array.isArray(stuData) ? stuData : []);
        setCurrencies(Array.isArray(curData) ? curData : []);
      } catch (error) {
        console.error("Failed to fetch data", error);
      }
    };
    if (token && user?.organisationId) fetchData();
  }, [token, user?.organisationId]);

  async function onSubmit(values: CreateARInvoiceInput) {
    setIsLoading(true);
    try {
      const response = await fetch("/api/ar/invoices", {
        method: "POST",
        headers: { 
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify(values),
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.error);

      toast.success("AR Invoice created");
      router.push(`/dashboard/students/${values.studentId}`);
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setIsLoading(false);
    }
  }

  const totalAmount = form.watch("lines").reduce((sum, line) => sum + (Number(line.amount) || 0), 0);

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" asChild>
          <Link href="/dashboard/students">
            <ArrowLeft className="w-4 h-4" />
          </Link>
        </Button>
        <h1 className="text-3xl font-bold tracking-tight">Raise AR Invoice</h1>
      </div>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
          <Card>
            <CardHeader>
              <CardTitle>Invoice Details</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <FormField
                    control={form.control}
                    name="studentId"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Student</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select Student" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {students.map(s => (
                              <SelectItem key={s.id} value={s.id}>
                                {s.firstName} {s.lastName} ({s.studentNumber})
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="currencyCode"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Currency</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select Currency" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {currencies.map(c => (
                              <SelectItem key={c.currencyCode} value={c.currencyCode}>
                                {c.currencyCode} {c.isBaseCurrency ? "(Base)" : ""}
                              </SelectItem>
                            ))}
                            {currencies.length === 0 && (
                              <>
                                <SelectItem value="ZWG">ZWG</SelectItem>
                                <SelectItem value="USD">USD</SelectItem>
                              </>
                            )}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                <FormField
                  control={form.control}
                  name="term"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Term / Period</FormLabel>
                      <FormControl>
                        <Input placeholder="e.g. Term 1 2026" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                  <FormField
                    control={form.control}
                    name="dueDate"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Due Date</FormLabel>
                        <FormControl>
                          <Input 
                            type="date" 
                            {...field} 
                            value={field.value instanceof Date 
                              ? field.value.toISOString().split('T')[0] 
                              : (typeof field.value === 'string' ? field.value.split('T')[0] : '')
                            } 
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                <FormField
                  control={form.control}
                  name="description"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Narration</FormLabel>
                      <FormControl>
                        <Input placeholder="Invoice description" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Fee Items</CardTitle>
              <Button 
                type="button" 
                variant="outline" 
                size="sm"
                onClick={() => append({ description: "", quantity: 1, unitPrice: 0, amount: 0 })}
              >
                <Plus className="w-4 h-4 mr-2" />
                Add Item
              </Button>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {fields.map((field, index) => (
                  <div key={field.id} className="grid grid-cols-12 gap-2 items-start border-b pb-4 last:border-0">
                    <div className="col-span-6">
                      <FormField
                        control={form.control}
                        name={`lines.${index}.description`}
                        render={({ field }) => (
                          <FormItem>
                            <FormControl>
                              <Input placeholder="Description" {...field} />
                            </FormControl>
                          </FormItem>
                        )}
                      />
                    </div>
                    <div className="col-span-2">
                      <FormField
                        control={form.control}
                        name={`lines.${index}.quantity`}
                        render={({ field }) => (
                          <FormItem>
                            <FormControl>
                              <Input 
                                type="number" 
                                placeholder="Qty" 
                                {...field} 
                                onChange={(e) => {
                                  const qty = Number(e.target.value);
                                  field.onChange(qty);
                                  const price = form.getValues(`lines.${index}.unitPrice`);
                                  form.setValue(`lines.${index}.amount`, qty * price);
                                }}
                              />
                            </FormControl>
                          </FormItem>
                        )}
                      />
                    </div>
                    <div className="col-span-2">
                      <FormField
                        control={form.control}
                        name={`lines.${index}.unitPrice`}
                        render={({ field }) => (
                          <FormItem>
                            <FormControl>
                              <Input 
                                type="number" 
                                placeholder="Price" 
                                {...field} 
                                onChange={(e) => {
                                  const price = Number(e.target.value);
                                  field.onChange(price);
                                  const qty = form.getValues(`lines.${index}.quantity`);
                                  form.setValue(`lines.${index}.amount`, qty * price);
                                }}
                              />
                            </FormControl>
                          </FormItem>
                        )}
                      />
                    </div>
                    <div className="col-span-1">
                      <div className="py-2 text-right font-medium">
                        {form.watch(`lines.${index}.amount`).toFixed(2)}
                      </div>
                    </div>
                    <div className="col-span-1 pt-1 text-right">
                      <Button variant="ghost" size="icon" onClick={() => remove(index)} className="text-destructive">
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
            <CardFooter className="bg-muted/30 flex justify-end">
              <div className="text-xl font-bold">
                Total: {form.watch("currencyCode")} {totalAmount.toLocaleString(undefined, { minimumFractionDigits: 2 })}
              </div>
            </CardFooter>
          </Card>

          <div className="flex justify-end gap-4">
             <Button variant="outline" type="button" onClick={() => router.back()}>
               Cancel
             </Button>
             <Button type="submit" disabled={isLoading}>
               {isLoading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
               Create Invoice
             </Button>
          </div>
        </form>
      </Form>
    </div>
  );
}
