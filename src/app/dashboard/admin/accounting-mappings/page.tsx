"use client";

import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Settings, Save, Loader2, ArrowLeft, Wallet, CreditCard } from "lucide-react";
import { toast } from "sonner";
import Link from "next/link";

import { Button } from "@/components/ui/button";
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
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { updateOrganisationSchema, UpdateOrganisationInput } from "@/lib/validations/schemas";
import { useAuth } from "@/components/providers/auth-provider";
import { AccountSelect } from "@/components/dashboard/account-select";

export default function AccountingMappingsPage() {
  const { token, user } = useAuth();
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [accounts, setAccounts] = useState<any[]>([]);
  const [bankAccounts, setBankAccounts] = useState<any[]>([]);
  const [baseCurrency, setBaseCurrency] = useState<string>("");

  const getAccountsByType = (type: string, options?: { cashOnly?: boolean }) => {
    const filtered = accounts.filter((account) => account.type === type);
    if (options?.cashOnly) {
      const cashAccounts = filtered.filter((account) => account.isCashAccount);
      return cashAccounts.length > 0 ? cashAccounts : filtered;
    }
    return filtered;
  };

  const getFxGainLossAccounts = () => {
    const fxAccounts = accounts.filter((account) => account.isFxGainLoss);
    if (fxAccounts.length > 0) return fxAccounts;
    return accounts.filter((account) => ["EXPENSE", "REVENUE"].includes(account.type));
  };

  const getForeignCurrencyBankAccounts = () => {
    if (!bankAccounts.length) return [];
    const foreign = bankAccounts.filter((account) => account.currencyCode !== baseCurrency);
    return foreign.length > 0 ? foreign : bankAccounts;
  };

  const foreignBankAccountOptions = getForeignCurrencyBankAccounts().map((account) => ({
    id: account.accountId,
    code: account.account?.code || account.accountId,
    name: `${account.bankName} (${account.accountNumber}) [${account.currencyCode}]`,
  }));

  const form = useForm<UpdateOrganisationInput>({
    resolver: zodResolver(updateOrganisationSchema),
    defaultValues: {
      arReceivableAccountId: "",
      arRevenueAccountId: "",
      arBankAccountId: "",
      apPayableAccountId: "",
      apExpenseAccountId: "",
      apBankAccountId: "",
      cashInHandAccountId: "",
      fxBankAccountId: "",
      fxGainLossAccountId: "",
    },
  });

  useEffect(() => {
    async function fetchData() {
      if (!user?.organisationId || !token) return;

      try {
        const [orgRes, accRes] = await Promise.all([
          fetch(`/api/organisations/${user.organisationId}`, {
            headers: { Authorization: `Bearer ${token}` },
          }),
          fetch(`/api/accounts`, {
            headers: { Authorization: `Bearer ${token}` },
          }),
        ]);

        const orgResult = await orgRes.json();
        const accResult = await accRes.json();

        if (orgResult.success) {
          form.reset({
            arReceivableAccountId: orgResult.data.arReceivableAccountId || "",
            arRevenueAccountId: orgResult.data.arRevenueAccountId || "",
            arBankAccountId: orgResult.data.arBankAccountId || "",
            apPayableAccountId: orgResult.data.apPayableAccountId || "",
            apExpenseAccountId: orgResult.data.apExpenseAccountId || "",
            apBankAccountId: orgResult.data.apBankAccountId || "",
            cashInHandAccountId: orgResult.data.cashInHandAccountId || "",
          });
        }

        const accountsData = Array.isArray(accResult) ? accResult : accResult.data || [];
        setAccounts(accountsData);
      } catch (error) {
        toast.error("An error occurred while fetching data");
      } finally {
        setIsLoading(false);
      }
    }

    fetchData();
  }, [user?.organisationId, form, token]);

  async function onSubmit(data: UpdateOrganisationInput) {
    if (!user?.organisationId || !token) return;

    setIsSaving(true);
    try {
      const response = await fetch(`/api/organisations/${user.organisationId}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(data),
      });

      const result = await response.json();

      if (result.success) {
        toast.success("Accounting mappings updated successfully");
      } else {
        toast.error(result.error || "Failed to update accounting mappings");
      }
    } catch (error) {
      toast.error("An error occurred while saving accounting mappings");
    } finally {
      setIsSaving(false);
    }
  }

  if (isLoading) {
    return (
      <div className="flex h-[400px] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" asChild>
          <Link href="/dashboard/admin">
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Accounting Mappings</h1>
          <p className="text-muted-foreground">
            Configure default GL accounts for system-generated transactions.
          </p>
        </div>
      </div>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
          <div className="grid gap-6 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Wallet className="h-5 w-5 text-blue-500" />
                  Accounts Receivable (AR)
                </CardTitle>
                <CardDescription>
                  Default accounts for student invoicing and receipts.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <FormField
                  control={form.control}
                  name="arReceivableAccountId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Default Receivable Account</FormLabel>
                      <FormControl>
                        <AccountSelect
                          accounts={getAccountsByType("ASSET")}
                          value={field.value || ""}
                          onValueChange={field.onChange}
                          placeholder="Select receivable account..."
                        />
                      </FormControl>
                      <FormDescription>Typically an Asset (Debtors) account.</FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="arRevenueAccountId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Default Revenue Account</FormLabel>
                      <FormControl>
                        <AccountSelect
                          accounts={getAccountsByType("REVENUE")}
                          value={field.value || ""}
                          onValueChange={field.onChange}
                          placeholder="Select revenue account..."
                        />
                      </FormControl>
                      <FormDescription>Typically an Income account (Fees).</FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="arBankAccountId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Default AR Bank Account</FormLabel>
                      <FormControl>
                        <AccountSelect
                          accounts={getAccountsByType("ASSET", { cashOnly: true })}
                          value={field.value || ""}
                          onValueChange={field.onChange}
                          placeholder="Select bank account..."
                        />
                      </FormControl>
                      <FormDescription>Primary bank account for receiving student fees.</FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <CreditCard className="h-5 w-5 text-orange-500" />
                  Accounts Payable (AP)
                </CardTitle>
                <CardDescription>
                  Default accounts for supplier bills and payments.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <FormField
                  control={form.control}
                  name="apPayableAccountId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Default Payable Account</FormLabel>
                      <FormControl>
                        <AccountSelect
                          accounts={getAccountsByType("LIABILITY")}
                          value={field.value || ""}
                          onValueChange={field.onChange}
                          placeholder="Select payable account..."
                        />
                      </FormControl>
                      <FormDescription>Typically a Liability (Creditors) account.</FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="apExpenseAccountId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Default Expense Account</FormLabel>
                      <FormControl>
                        <AccountSelect
                          accounts={getAccountsByType("EXPENSE")}
                          value={field.value || ""}
                          onValueChange={field.onChange}
                          placeholder="Select expense account..."
                        />
                      </FormControl>
                      <FormDescription>Used as a fallback for miscellaneous bills.</FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="apBankAccountId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Default AP Bank Account</FormLabel>
                      <FormControl>
                        <AccountSelect
                          accounts={getAccountsByType("ASSET", { cashOnly: true })}
                          value={field.value || ""}
                          onValueChange={field.onChange}
                          placeholder="Select bank account..."
                        />
                      </FormControl>
                      <FormDescription>Primary bank account for paying suppliers.</FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </CardContent>
            </Card>

            <Card className="md:col-span-2">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Settings className="h-5 w-5 text-purple-500" />
                  Other Defaults
                </CardTitle>
                <CardDescription>General system-wide account mappings.</CardDescription>
              </CardHeader>
              <CardContent>
                <FormField
                  control={form.control}
                  name="cashInHandAccountId"
                  render={({ field }) => (
                    <FormItem className="max-w-md">
                      <FormLabel>Cash-in-Hand Account</FormLabel>
                      <FormControl>
                        <AccountSelect
                          accounts={getAccountsByType("ASSET", { cashOnly: true })}
                          value={field.value || ""}
                          onValueChange={field.onChange}
                          placeholder="Select cash account..."
                        />
                      </FormControl>
                      <FormDescription>Default account for petty cash transactions.</FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </CardContent>
            </Card>
          </div>

          <div className="flex justify-end">
            <Button type="submit" disabled={isSaving}>
              {isSaving ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Save className="mr-2 h-4 w-4" />
                  Save Mappings
                </>
              )}
            </Button>
          </div>
        </form>
      </Form>
    </div>
  );
}
