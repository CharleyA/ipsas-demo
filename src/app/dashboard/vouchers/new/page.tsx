"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { createVoucherSchema, type CreateVoucherInput } from "@/lib/validations/schemas";
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
  Calculator,
  AlertCircle
} from "lucide-react";
import { toast } from "sonner";
import Link from "next/link";
import { Separator } from "@/components/ui/separator";

export default function NewVoucherPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { token, user } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [masterData, setMasterData] = useState<{
    accounts: any[];
    funds: any[];
    costCentres: any[];
    currencies: any[];
    periods: any[];
  }>({
    accounts: [],
    funds: [],
    costCentres: [],
    currencies: [],
    periods: [],
  });

  const voucherType = (searchParams.get("type") as any) || "JOURNAL";

  const form = useForm({
    resolver: zodResolver(createVoucherSchema) as any,
    defaultValues: {
      organisationId: user?.organisationId || "",
      type: voucherType,
      date: new Date(),
      description: "",
      reference: "",
      periodId: "",
      lines: [
        { lineNumber: 1, accountId: "", amountFc: 0, fxRate: 1, amountLc: 0, currencyCode: "ZWG", debit: 0, credit: 0 },
        { lineNumber: 2, accountId: "", amountFc: 0, fxRate: 1, amountLc: 0, currencyCode: "ZWG", debit: 0, credit: 0 },
      ],
    },
  });

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "lines",
  });

  useEffect(() => {
    const fetchMasterData = async () => {
      try {
        const [accRes, currRes, periodsRes] = await Promise.all([
          fetch("/api/accounts", { headers: { "Authorization": `Bearer ${token}` } }),
          fetch("/api/currencies", { headers: { "Authorization": `Bearer ${token}` } }),
          fetch(`/api/organisations/${user?.organisationId}/fiscal-periods`, { headers: { "Authorization": `Bearer ${token}` } }),
        ]);

        const [accounts, currencies, periods] = await Promise.all([
          accRes.json(),
          currRes.json(),
          periodsRes.json(),
        ]);

        setMasterData({
          accounts: Array.isArray(accounts) ? accounts : [],
          currencies: Array.isArray(currencies) ? currencies : [],
          periods: Array.isArray(periods.data) ? periods.data : [],
          funds: [], // Mock or fetch if needed
          costCentres: [], // Mock or fetch if needed
        });
      } catch (error) {
        console.error("Failed to fetch master data", error);
      }
    };

    if (token && user?.organisationId) fetchMasterData();
  }, [token, user?.organisationId]);

  async function onSubmit(values: any) {
    // Validate balance
    const totalDebit = values.lines.reduce((sum: number, l: any) => sum + (Number(l.debit) || 0), 0);
    const totalCredit = values.lines.reduce((sum: number, l: any) => sum + (Number(l.credit) || 0), 0);

    if (Math.abs(totalDebit - totalCredit) > 0.01) {
      toast.error(`Out of balance by ${(totalDebit - totalCredit).toFixed(2)}. Debits must equal credits.`);
      return;
    }

    setIsLoading(true);
    try {
      const response = await fetch("/api/vouchers", {
        method: "POST",
        headers: { 
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify(values),
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.error);

      toast.success("Voucher created as DRAFT");
      router.push(`/dashboard/vouchers/${data.id}`);
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setIsLoading(false);
    }
  }

  const totals = form.watch("lines").reduce((acc, line) => {
    acc.debit += Number(line.debit) || 0;
    acc.credit += Number(line.credit) || 0;
    return acc;
  }, { debit: 0, credit: 0 });

  return (
    <div className="space-y-6 pb-20">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" asChild>
          <Link href="/dashboard/vouchers">
            <ArrowLeft className="w-4 h-4" />
          </Link>
        </Button>
        <h1 className="text-3xl font-bold tracking-tight">New {voucherType}</h1>
      </div>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
          <Card>
            <CardHeader>
              <CardTitle>Header Information</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <FormField
                  control={form.control}
                  name="date"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Voucher Date</FormLabel>
                      <FormControl>
                        <Input
                          type="date"
                          {...field}
                          value={field.value instanceof Date ? field.value.toISOString().split('T')[0] : (field.value ? String(field.value) : '')}
                          onChange={(e) => field.onChange(e.target.value)}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="periodId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Accounting Period</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select Period" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {masterData.periods.filter(p => !p.isClosed).map(p => (
                            <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                          ))}
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
                      <FormLabel>Reference (Optional)</FormLabel>
                      <FormControl>
                        <Input placeholder="Invoice # or Cheque #" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              <div className="mt-6">
                <FormField
                  control={form.control}
                  name="description"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Narration / Description</FormLabel>
                      <FormControl>
                        <Input placeholder="General description of this transaction" {...field} />
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
              <CardTitle>Entries</CardTitle>
              <Button 
                type="button" 
                variant="outline" 
                size="sm"
                onClick={() => append({ 
                  lineNumber: fields.length + 1, 
                  accountId: "", 
                  amountFc: 0, 
                  fxRate: 1, 
                  amountLc: 0, 
                  currencyCode: "ZWG", 
                  debit: 0, 
                  credit: 0 
                })}
              >
                <Plus className="w-4 h-4 mr-2" />
                Add Line
              </Button>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {fields.map((field, index) => (
                  <div key={field.id} className="grid grid-cols-12 gap-2 items-start border-b pb-4 last:border-0">
                    <div className="col-span-4">
                      <FormField
                        control={form.control}
                        name={`lines.${index}.accountId`}
                        render={({ field }) => (
                          <FormItem>
                            <Select onValueChange={field.onChange} value={field.value}>
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue placeholder="Account" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                {masterData.accounts.map(acc => (
                                  <SelectItem key={acc.id} value={acc.id}>{acc.code} - {acc.name}</SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </FormItem>
                        )}
                      />
                    </div>
                    <div className="col-span-2">
                      <FormField
                        control={form.control}
                        name={`lines.${index}.debit`}
                        render={({ field }) => (
                          <FormItem>
                            <FormControl>
                              <Input 
                                type="number" 
                                placeholder="Debit" 
                                {...field} 
                                onChange={(e) => {
                                  field.onChange(e);
                                  form.setValue(`lines.${index}.credit`, 0);
                                  form.setValue(`lines.${index}.amountLc`, Number(e.target.value));
                                  form.setValue(`lines.${index}.amountFc`, Number(e.target.value));
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
                        name={`lines.${index}.credit`}
                        render={({ field }) => (
                          <FormItem>
                            <FormControl>
                              <Input 
                                type="number" 
                                placeholder="Credit" 
                                {...field} 
                                onChange={(e) => {
                                  field.onChange(e);
                                  form.setValue(`lines.${index}.debit`, 0);
                                  form.setValue(`lines.${index}.amountLc`, -Number(e.target.value));
                                  form.setValue(`lines.${index}.amountFc`, -Number(e.target.value));
                                }}
                              />
                            </FormControl>
                          </FormItem>
                        )}
                      />
                    </div>
                    <div className="col-span-1">
                       <FormField
                        control={form.control}
                        name={`lines.${index}.currencyCode`}
                        render={({ field }) => (
                          <FormItem>
                            <Select onValueChange={field.onChange} value={field.value}>
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                {masterData.currencies.map(c => (
                                  <SelectItem key={c.code} value={c.code}>{c.code}</SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </FormItem>
                        )}
                      />
                    </div>
                    <div className="col-span-2">
                      <FormField
                        control={form.control}
                        name={`lines.${index}.description` as any}
                        render={({ field }) => (
                          <FormItem>
                            <FormControl>
                              <Input placeholder="Line desc" {...field} />
                            </FormControl>
                          </FormItem>
                        )}
                      />
                    </div>
                    <div className="col-span-1 pt-1">
                      <Button variant="ghost" size="icon" onClick={() => remove(index)} className="text-destructive">
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
            <CardFooter className="bg-muted/30 flex justify-between">
              <div className="flex gap-8">
                <div className="text-sm font-medium">
                  Total Debit: <span className="text-primary font-bold">{totals.debit.toFixed(2)}</span>
                </div>
                <div className="text-sm font-medium">
                  Total Credit: <span className="text-primary font-bold">{totals.credit.toFixed(2)}</span>
                </div>
              </div>
              <div className={`text-sm font-bold flex items-center gap-2 ${Math.abs(totals.debit - totals.credit) < 0.01 ? "text-green-600" : "text-red-600"}`}>
                {Math.abs(totals.debit - totals.credit) < 0.01 ? (
                  <CheckCircle className="w-4 h-4" />
                ) : (
                  <AlertCircle className="w-4 h-4" />
                )}
                Balance: {(totals.debit - totals.credit).toFixed(2)}
              </div>
            </CardFooter>
          </Card>

          <div className="flex justify-end gap-4 fixed bottom-0 left-0 right-0 p-4 bg-background border-t z-50 md:relative md:bg-transparent md:border-0">
             <Button variant="outline" type="button" asChild>
               <Link href="/dashboard/vouchers">Cancel</Link>
             </Button>
             <Button type="submit" size="lg" disabled={isLoading}>
               {isLoading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
               Save as Draft
             </Button>
          </div>
        </form>
      </Form>
    </div>
  );
}

function CheckCircle(props: any) {
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
      <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
      <polyline points="22 4 12 14.01 9 11.01" />
    </svg>
  );
}
