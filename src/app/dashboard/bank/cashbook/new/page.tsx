"use client";

import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
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
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { CalendarIcon, Loader2, Save } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { createCashbookEntrySchema, type CreateCashbookEntryInput } from "@/lib/validations/schemas";
import { useAuth } from "@/components/providers/auth-provider";

export default function CashbookEntryPage() {
  const router = useRouter();
  const { user, token } = useAuth();
  const [bankAccounts, setBankAccounts] = useState<any[]>([]);
  const [accounts, setAccounts] = useState<any[]>([]);
  const [students, setStudents] = useState<any[]>([]);
  const [suppliers, setSuppliers] = useState<any[]>([]);
  const [costCentres, setCostCentres] = useState<any[]>([]);
  const [funds, setFunds] = useState<any[]>([]);
  const [currencies, setCurrencies] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [counterpartyType, setCounterpartyType] = useState("OTHER");

  const form = useForm<CreateCashbookEntryInput>({
    resolver: zodResolver(createCashbookEntrySchema),
    defaultValues: {
      organisationId: user?.organisationId,
      type: "RECEIPT",
      currencyCode: "ZWG",
      fxRate: 1,
    },
  });

  // Handle hydration for date
  useEffect(() => {
    form.setValue("date", new Date());
  }, [form]);

  const isBursar = user?.role === "BURSAR";

  // Fetch exchange rate when currency changes
  const selectedCurrency = form.watch("currencyCode");
  const [rateSource, setRateSource] = useState<string>("");

  useEffect(() => {
    if (selectedCurrency === "USD") {
      form.setValue("fxRate", 1);
      setRateSource("Base Currency");
      return;
    }

    const fetchRate = async () => {
      try {
        const res = await fetch(`/api/currencies/exchange-rates?from=${selectedCurrency}&to=USD&limit=1`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        const rates = await res.json();
        if (rates && rates.length > 0) {
          form.setValue("fxRate", parseFloat(rates[0].rate));
          setRateSource(rates[0].source || "System Rate");
        } else {
          setRateSource("Manual Entry Required");
        }
      } catch (error) {
        console.error("Failed to fetch exchange rate", error);
        setRateSource("Error fetching rate");
      }
    };

    fetchRate();
  }, [selectedCurrency, token, form]);

  useEffect(() => {
    if (!token || !user?.organisationId) return;

    const fetchData = async () => {
      try {
        const [banksRes, accsRes, studentsRes, suppliersRes, ccRes, fundsRes, currRes] = await Promise.all([
          fetch("/api/bank/accounts", { headers: { "Authorization": `Bearer ${token}` } }),
          fetch("/api/accounts", { headers: { "Authorization": `Bearer ${token}` } }),
          fetch("/api/students", { headers: { "Authorization": `Bearer ${token}` } }),
          fetch("/api/suppliers", { headers: { "Authorization": `Bearer ${token}` } }),
          fetch("/api/organisations/current/cost-centres", { headers: { "Authorization": `Bearer ${token}` } }),
          fetch("/api/organisations/current/funds", { headers: { "Authorization": `Bearer ${token}` } }),
          fetch(`/api/organisations/${user.organisationId}/currencies`, { headers: { "Authorization": `Bearer ${token}` } }),
        ]);

        setBankAccounts(await banksRes.json());
        setAccounts(await accsRes.json());
        setStudents(await studentsRes.json());
        setSuppliers(await suppliersRes.json());
        setCostCentres(await ccRes.json());
        setFunds(await fundsRes.json());
        setCurrencies(await currRes.json());
      } catch (error) {
        toast.error("Failed to load form data");
      }
    };

    fetchData();
  }, [token, user?.organisationId]);

  const onSubmit = async (data: CreateCashbookEntryInput) => {
    setIsLoading(true);
    try {
      const response = await fetch("/api/bank/cashbook", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`,
        },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to create entry");
      }

      toast.success("Cashbook entry created as draft");
      router.push("/dashboard/vouchers");
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Failed to create entry";
      toast.error(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">New Cashbook Entry</h1>
        <p className="text-muted-foreground">Record a manual bank receipt or payment.</p>
      </div>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Transaction Details</CardTitle>
              <CardDescription>Enter the basic information for this transaction.</CardDescription>
            </CardHeader>
            <CardContent className="grid gap-6 md:grid-cols-2">
              <FormField
                control={form.control}
                name="type"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Entry Type</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select type" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="RECEIPT">Receipt (Inflow)</SelectItem>
                        <SelectItem value="PAYMENT">Payment (Outflow)</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="bankAccountId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Bank / Cash Account</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select account" />
                        </SelectTrigger>
                      </FormControl>
                        <SelectContent>
                          {Array.isArray(bankAccounts) && bankAccounts.map((acc) => (
                            <SelectItem key={acc.id} value={acc.id}>
                              {acc.bankName} - {acc.accountNumber} ({acc.currencyCode})
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
                  name="date"
                  render={({ field }) => (
                    <FormItem className="flex flex-col">
                      <FormLabel>Date</FormLabel>
                      <Popover>
                        <PopoverTrigger asChild>
                          <FormControl>
                            <Button
                              variant={"outline"}
                              className={cn(
                                "pl-3 text-left font-normal",
                                !field.value && "text-muted-foreground"
                              )}
                            >
                              {field.value instanceof Date && !isNaN(field.value.getTime()) ? format(field.value, "PPP") : <span>Pick a date</span>}
                              <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                            </Button>
                          </FormControl>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="start">
                          <Calendar
                            mode="single"
                            selected={field.value as any}
                            onSelect={field.onChange}
                            disabled={(date) =>
                              date > new Date() || date < new Date("1900-01-01")
                            }
                            initialFocus
                          />
                        </PopoverContent>
                      </Popover>
                      <FormMessage />
                    </FormItem>
                  )}
                />

              <FormField
                control={form.control}
                name="reference"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Reference</FormLabel>
                    <FormControl>
                      <Input placeholder="Ref #, Check #, etc." {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Counterparty & Account</CardTitle>
              <CardDescription>Select who the transaction is with and the offsetting GL account.</CardDescription>
            </CardHeader>
            <CardContent className="grid gap-6 md:grid-cols-2">
              <FormItem>
                <FormLabel>Counterparty Type</FormLabel>
                <Select onValueChange={setCounterpartyType} defaultValue={counterpartyType}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="STUDENT">Student</SelectItem>
                    <SelectItem value="SUPPLIER">Supplier</SelectItem>
                    <SelectItem value="OTHER">Other</SelectItem>
                  </SelectContent>
                </Select>
              </FormItem>

              {counterpartyType === "STUDENT" && (
                <FormField
                  control={form.control}
                  name="studentId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Student</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select student" />
                          </SelectTrigger>
                        </FormControl>
                          <SelectContent>
                            {Array.isArray(students) && students.map((s) => (
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
                )}

                {counterpartyType === "SUPPLIER" && (
                  <FormField
                    control={form.control}
                    name="supplierId"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Supplier</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select supplier" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {Array.isArray(suppliers) && suppliers.map((s) => (
                              <SelectItem key={s.id} value={s.id}>
                                {s.name} ({s.code})
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                )}

                <FormField
                  control={form.control}
                  name="accountId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Offset Account (GL)</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select account" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {Array.isArray(accounts) && accounts.map((acc) => (
                            <SelectItem key={acc.id} value={acc.id}>
                              {acc.code} - {acc.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Amount & Dimensions</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-6 md:grid-cols-2">
              <div className="grid grid-cols-2 gap-2">
                <FormField
                  control={form.control}
                  name="amount"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Amount</FormLabel>
                      <FormControl>
                        <Input 
                            type="number" 
                            step="0.01" 
                            {...field} 
                            onChange={(e) => field.onChange(parseFloat(e.target.value))} 
                        />
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
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                        </FormControl>
                          <SelectContent>
                            {currencies.map((c) => (
                              <SelectItem key={c.code} value={c.code}>
                                {c.code} - {c.name}
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
                  name="fxRate"
                  render={({ field }) => (
                    <FormItem>
                      <div className="flex items-center justify-between">
                        <FormLabel>FX Rate (to Base)</FormLabel>
                        {rateSource && (
                          <span className="text-[10px] bg-primary/10 text-primary px-1.5 py-0.5 rounded uppercase font-bold tracking-wider">
                            Source: {rateSource}
                          </span>
                        )}
                      </div>
                      <FormControl>
                        <Input 
                          type="number" 
                          step="0.0001" 
                          {...field} 
                          readOnly={isBursar && selectedCurrency !== "USD"}
                          className={cn(isBursar && selectedCurrency !== "USD" && "bg-muted cursor-not-allowed")}
                          onChange={(e) => field.onChange(parseFloat(e.target.value))} 
                        />
                      </FormControl>
                      {isBursar && selectedCurrency !== "USD" && (
                        <p className="text-[11px] text-muted-foreground">
                          Exchange rates are locked to RBZ official mid-rates.
                        </p>
                      )}
                      <FormMessage />
                    </FormItem>
                  )}
                />

              <FormField
                control={form.control}
                name="fundId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Fund</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="General Fund" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {funds.map((f) => (
                          <SelectItem key={f.id} value={f.id}>{f.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="costCentreId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Cost Centre</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select cost centre" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {costCentres.map((cc) => (
                          <SelectItem key={cc.id} value={cc.id}>{cc.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="md:col-span-2">
                <FormField
                  control={form.control}
                  name="description"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Description</FormLabel>
                      <FormControl>
                        <Textarea placeholder="Details of the transaction..." {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </CardContent>
          </Card>

          <div className="flex justify-end gap-4">
            <Button type="button" variant="ghost" onClick={() => router.back()}>
              Cancel
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              <Save className="w-4 h-4 mr-2" />
              Create Draft Entry
            </Button>
          </div>
        </form>
      </Form>
    </div>
  );
}
