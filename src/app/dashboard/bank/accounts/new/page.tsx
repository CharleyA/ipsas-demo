"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardHeader, 
  CardTitle 
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ChevronLeft, Loader2, Building2 } from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";
import { useAuth } from "@/components/providers/auth-provider";

export default function NewBankAccountPage() {
  const router = useRouter();
  const { token, user } = useAuth();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [currencies, setCurrencies] = useState<any[]>([]);
  const [isLoadingCurrencies, setIsLoadingCurrencies] = useState(true);

  const [formData, setFormData] = useState({
    bankName: "",
    accountNumber: "",
    currencyCode: "",
    glAccountCode: "",
    glAccountName: "",
  });

  useEffect(() => {
    if (!token) return;

      const fetchCurrencies = async () => {
        try {
          const res = await fetch("/api/currencies", {
            headers: { "Authorization": `Bearer ${token}` }
          });
          const data = await res.json();
          const currencyList = data.data || (Array.isArray(data) ? data : []);
          setCurrencies(currencyList);
          
          // Auto-select base currency if possible
          if (currencyList.length > 0) {
            setFormData(prev => ({ ...prev, currencyCode: currencyList[0].code }));
          }
        } catch (error) {
          toast.error("Failed to fetch currencies");
        } finally {
          setIsLoadingCurrencies(false);
        }
      };

    fetchCurrencies();
  }, [token]);

    const handleSubmit = async (e: React.FormEvent) => {
      e.preventDefault();
      if (!formData.bankName || !formData.accountNumber) {
        toast.error("Please fill in all required fields");
        return;
      }


    setIsSubmitting(true);
    try {
      const response = await fetch("/api/bank/accounts", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`,
        },
        body: JSON.stringify(formData),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to create bank account");
      }

      toast.success("Bank account created successfully");
      router.push("/dashboard/bank/accounts");
      router.refresh();
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" asChild>
          <Link href="/dashboard/bank/accounts">
            <ChevronLeft className="w-5 h-5" />
          </Link>
        </Button>
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Register Bank Account</h1>
          <p className="text-muted-foreground">Add a new bank or cash account to the system.</p>
        </div>
      </div>

      <form onSubmit={handleSubmit}>
        <Card>
          <CardHeader>
            <CardTitle>Bank Details</CardTitle>
            <CardDescription>
              Basic information about the bank account.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-2">
              <Label htmlFor="bankName">Bank Name *</Label>
              <Input
                id="bankName"
                placeholder="e.g. CBZ Bank, EcoCash, Petty Cash"
                value={formData.bankName}
                onChange={(e) => setFormData({ ...formData, bankName: e.target.value })}
                required
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="accountNumber">Account Number / ID *</Label>
              <Input
                id="accountNumber"
                placeholder="Enter account number or unique identifier"
                value={formData.accountNumber}
                onChange={(e) => setFormData({ ...formData, accountNumber: e.target.value })}
                required
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="currency">Currency *</Label>
              <Select 
                value={formData.currencyCode} 
                onValueChange={(val) => setFormData({ ...formData, currencyCode: val })}
              >
                <SelectTrigger id="currency">
                  <SelectValue placeholder="Select currency" />
                </SelectTrigger>
                <SelectContent>
                  {isLoadingCurrencies ? (
                    <div className="flex items-center justify-center p-2">
                      <Loader2 className="w-4 h-4 animate-spin" />
                    </div>
                  ) : (
                    currencies.map((curr) => (
                      <SelectItem key={curr.code} value={curr.code}>
                        {curr.code} - {curr.name}
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
            </div>

            <div className="pt-4 border-t space-y-4">
              <div className="space-y-1">
                <h3 className="text-sm font-medium">Ledger Integration</h3>
                <p className="text-xs text-muted-foreground">
                  Specify the General Ledger account for this bank. If left blank, a new one will be created automatically.
                </p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="glAccountCode">GL Code (Optional)</Label>
                  <Input
                    id="glAccountCode"
                    placeholder="e.g. 1001-001"
                    value={formData.glAccountCode}
                    onChange={(e) => setFormData({ ...formData, glAccountCode: e.target.value })}
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="glAccountName">GL Name (Optional)</Label>
                  <Input
                    id="glAccountName"
                    placeholder="e.g. Main Operations A/C"
                    value={formData.glAccountName}
                    onChange={(e) => setFormData({ ...formData, glAccountName: e.target.value })}
                  />
                </div>
              </div>
            </div>
          </CardContent>
          <div className="flex items-center justify-end gap-3 p-6 border-t bg-muted/50">
            <Button variant="outline" asChild disabled={isSubmitting}>
              <Link href="/dashboard/bank/accounts">Cancel</Link>
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Register Bank Account
            </Button>
          </div>
        </Card>
      </form>
    </div>
  );
}
