"use client";

import { useEffect, useState } from "react";
import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
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
import { CalendarIcon, Loader2, Save, Plus, Trash2 } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { useAuth } from "@/components/providers/auth-provider";

const purchaseOrderLineSchema = z.object({
  description: z.string().min(1, "Description is required"),
  itemType: z.enum(["CAPITAL_ITEM", "INVENTORY", "DIRECT_EXPENSE"]),
  inventoryItemId: z.string().optional(),
  assetCategoryId: z.string().optional(),
  accountId: z.string().min(1, "Account is required"),
  quantity: z.number().positive("Quantity must be positive"),
  unitPrice: z.number().nonnegative("Price cannot be negative"),
});

const createPOSchema = z.object({
  supplierId: z.string().min(1, "Supplier is required"),
  procurementRef: z.string().optional(),
  quotationRef: z.string().optional(),
  orderDate: z.date(),
  expectedDate: z.date().optional(),
  currencyCode: z.string().length(3),
  fxRate: z.number().positive().default(1),
  notes: z.string().optional(),
  lines: z.array(purchaseOrderLineSchema).min(1, "At least one line is required"),
});

type CreatePOInput = z.infer<typeof createPOSchema>;

export default function NewPurchaseOrderPage() {
  const router = useRouter();
  const { user, token } = useAuth();
  const [suppliers, setSuppliers] = useState<any[]>([]);
  const [accounts, setAccounts] = useState<any[]>([]);
  const [inventoryItems, setInventoryItems] = useState<any[]>([]);
  const [assetCategories, setAssetCategories] = useState<any[]>([]);
  const [currencies, setCurrencies] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const form = useForm<CreatePOInput>({
    resolver: zodResolver(createPOSchema),
    defaultValues: {
      orderDate: new Date(),
      currencyCode: "USD",
      fxRate: 1,
      lines: [
        {
          description: "",
          itemType: "DIRECT_EXPENSE",
          quantity: 1,
          unitPrice: 0,
          accountId: "",
        },
      ],
    },
  });

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "lines",
  });

  useEffect(() => {
    if (!token || !user?.organisationId) return;

    const fetchData = async () => {
      try {
        const [suppliersRes, accountsRes, itemsRes, categoriesRes, currenciesRes] = await Promise.all([
          fetch("/api/suppliers", { headers: { Authorization: `Bearer ${token}` } }),
          fetch("/api/accounts", { headers: { Authorization: `Bearer ${token}` } }),
          fetch("/api/inventory/items", { headers: { Authorization: `Bearer ${token}` } }),
          fetch("/api/assets/categories", { headers: { Authorization: `Bearer ${token}` } }),
          fetch(`/api/organisations/${user.organisationId}/currencies`, { headers: { Authorization: `Bearer ${token}` } }),
        ]);

        setSuppliers(await suppliersRes.json());
        setAccounts(await accountsRes.json());
        setInventoryItems(await itemsRes.json());
        setAssetCategories(await categoriesRes.json());
        setCurrencies(await currenciesRes.json());
      } catch (error) {
        toast.error("Failed to load form data");
      }
    };

    fetchData();
  }, [token, user?.organisationId]);

  const onSubmit = async (data: CreatePOInput) => {
    setIsLoading(true);
    try {
      const response = await fetch("/api/procurement/purchase-orders", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to create purchase order");
      }

      toast.success("Purchase order created successfully");
      router.push("/dashboard/procurement");
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setIsLoading(false);
    }
  };

  const totalAmount = form.watch("lines").reduce(
    (sum, line) => sum + (line.quantity || 0) * (line.unitPrice || 0),
    0
  );

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">New Purchase Order</h1>
          <p className="text-muted-foreground">Create a new request for goods or services.</p>
        </div>
      </div>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Header Details</CardTitle>
              <CardDescription>Basic information for the purchase order.</CardDescription>
            </CardHeader>
            <CardContent className="grid gap-6 md:grid-cols-2">
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
                        {suppliers.map((s) => (
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

              <FormField
                control={form.control}
                name="currencyCode"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Currency</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select currency" />
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
                            <SelectItem value="USD">USD</SelectItem>
                            <SelectItem value="ZWG">ZWG</SelectItem>
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
                  name="fxRate"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>FX Rate (to Base)</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          step="0.0001"
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
                  name="orderDate"
                render={({ field }) => (
                  <FormItem className="flex flex-col">
                    <FormLabel>Order Date</FormLabel>
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
                            {field.value ? format(field.value, "PPP") : <span>Pick a date</span>}
                            <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                          </Button>
                        </FormControl>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                          mode="single"
                          selected={field.value}
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
                name="procurementRef"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Procurement Ref (e.g. Requisition #)</FormLabel>
                    <FormControl>
                      <Input placeholder="REQ-001" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>Order Lines</CardTitle>
                <CardDescription>Items or services to be ordered.</CardDescription>
              </div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() =>
                  append({
                    description: "",
                    itemType: "DIRECT_EXPENSE",
                    quantity: 1,
                    unitPrice: 0,
                    accountId: "",
                  })
                }
              >
                <Plus className="w-4 h-4 mr-2" />
                Add Line
              </Button>
            </CardHeader>
            <CardContent className="space-y-4">
              {fields.map((field, index) => (
                <div
                  key={field.id}
                  className="grid gap-4 md:grid-cols-12 items-start border-b pb-4 last:border-0"
                >
                  <div className="md:col-span-3">
                    <FormField
                      control={form.control}
                      name={`lines.${index}.description`}
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className={cn(index > 0 && "sr-only")}>Description</FormLabel>
                          <FormControl>
                            <Input placeholder="Item description" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <div className="md:col-span-2">
                    <FormField
                      control={form.control}
                      name={`lines.${index}.itemType`}
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className={cn(index > 0 && "sr-only")}>Type</FormLabel>
                          <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="DIRECT_EXPENSE">Expense</SelectItem>
                              <SelectItem value="INVENTORY">Inventory</SelectItem>
                              <SelectItem value="CAPITAL_ITEM">Asset</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <div className="md:col-span-3">
                    <FormField
                      control={form.control}
                      name={`lines.${index}.accountId`}
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className={cn(index > 0 && "sr-only")}>GL Account</FormLabel>
                          <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Account" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {accounts.map((acc) => (
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
                  </div>

                  <div className="md:col-span-1">
                    <FormField
                      control={form.control}
                      name={`lines.${index}.quantity`}
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className={cn(index > 0 && "sr-only")}>Qty</FormLabel>
                          <FormControl>
                            <Input
                              type="number"
                              min="1"
                              {...field}
                              onChange={(e) => field.onChange(parseFloat(e.target.value))}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <div className="md:col-span-2">
                    <FormField
                      control={form.control}
                      name={`lines.${index}.unitPrice`}
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className={cn(index > 0 && "sr-only")}>Unit Price</FormLabel>
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
                  </div>

                  <div className="md:col-span-1 pt-2">
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="text-destructive"
                      onClick={() => remove(index)}
                      disabled={fields.length === 1}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              ))}

              <div className="flex justify-end pt-4 border-t">
                <div className="text-right">
                  <p className="text-sm text-muted-foreground">Total Amount</p>
                  <p className="text-2xl font-bold">
                    {form.watch("currencyCode")} {totalAmount.toFixed(2)}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Additional Info</CardTitle>
            </CardHeader>
            <CardContent>
              <FormField
                control={form.control}
                name="notes"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Internal Notes / Remarks</FormLabel>
                    <FormControl>
                      <Textarea placeholder="Additional details for this order..." {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </CardContent>
          </Card>

          <div className="flex justify-end gap-4">
            <Button
              type="button"
              variant="ghost"
              onClick={() => router.push("/dashboard/procurement")}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              <Save className="w-4 h-4 mr-2" />
              Create Purchase Order
            </Button>
          </div>
        </form>
      </Form>
    </div>
  );
}
