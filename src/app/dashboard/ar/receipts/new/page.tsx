"use client";

import { useEffect, useState, use } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { createARReceiptSchema, type CreateARReceiptInput } from "@/lib/validations/schemas";
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
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { 
  Loader2, 
  ArrowLeft, 
} from "lucide-react";
import { toast } from "sonner";
import Link from "next/link";

export default function NewARReceiptPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { token, user } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [students, setStudents] = useState<any[]>([]);
  const [accounts, setAccounts] = useState<any[]>([]);
  const [currencies, setCurrencies] = useState<any[]>([]);

  const studentId = searchParams.get("studentId") || "";

  const form = useForm<CreateARReceiptInput>({
    resolver: zodResolver(createARReceiptSchema),
    defaultValues: {
      organisationId: user?.organisationId || "",
      studentId: studentId,
      currencyCode: "ZWG",
      amount: 0,
      paymentMethod: "Cash",
      reference: "",
      date: new Date().toISOString().split("T")[0],
      bankAccountId: "",
    },
  });

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [stuRes, accRes] = await Promise.all([
          fetch("/api/students", { headers: { "Authorization": `Bearer ${token}` } }),
          fetch("/api/accounts", { headers: { "Authorization": `Bearer ${token}` } }),
        ]);
        
        const [stuData, accData] = await Promise.all([stuRes.json(), accRes.json()]);
        
        setStudents(Array.isArray(stuData) ? stuData : []);
        setAccounts(Array.isArray(accData) ? accData : []);
      } catch (error) {
        console.error("Failed to fetch data", error);
      }
    };
    if (token) fetchData();
  }, [token]);

  async function onSubmit(values: CreateARReceiptInput) {
    setIsLoading(true);
    try {
      const response = await fetch("/api/ar/receipts", {
        method: "POST",
        headers: { 
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify(values),
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.error);

      toast.success("Payment received (Draft Receipt)");
      router.push(`/dashboard/students/${values.studentId}`);
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" asChild>
          <Link href="/dashboard/students">
            <ArrowLeft className="w-4 h-4" />
          </Link>
        </Button>
        <h1 className="text-3xl font-bold tracking-tight">Receive Fee Payment</h1>
      </div>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8 max-w-2xl">
          <Card>
            <CardHeader>
              <CardTitle>Receipt Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
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
                
                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="amount"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Amount Received</FormLabel>
                          <FormControl>
                            <Input type="number" step="0.01" {...field} onChange={e => field.onChange(Number(e.target.value))} />
                          </FormControl>
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
                                <SelectValue placeholder="Currency" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {currencies.map(c => (
                                <SelectItem key={c.currencyCode} value={c.currencyCode}>
                                  {c.currencyCode}
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
                  </div>


                <FormField
                  control={form.control}
                  name="bankAccountId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Deposit To (Bank/Cash Account)</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select Bank Account" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {accounts.filter(a => a.type === "ASSET").map(a => (
                            <SelectItem key={a.id} value={a.id}>{a.code} - {a.name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="paymentMethod"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Payment Method</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Method" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="Cash">Cash</SelectItem>
                            <SelectItem value="Bank Transfer">Bank Transfer</SelectItem>
                            <SelectItem value="Ecocash">Ecocash</SelectItem>
                            <SelectItem value="Cheque">Cheque</SelectItem>
                            <SelectItem value="Swipe">Swipe (POS)</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="reference"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Reference / Receipt #</FormLabel>
                        <FormControl>
                          <Input placeholder="Ref number" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
            </CardContent>
          </Card>

          <div className="flex justify-end gap-4">
             <Button variant="outline" type="button" onClick={() => router.back()}>
               Cancel
             </Button>
             <Button type="submit" disabled={isLoading}>
               {isLoading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
               Receive Payment
             </Button>
          </div>
        </form>
      </Form>
    </div>
  );
}
