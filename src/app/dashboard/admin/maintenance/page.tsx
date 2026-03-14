"use client";

import { useState } from "react";
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardFooter, 
  CardHeader, 
  CardTitle 
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { AlertCircle, Trash2, ShieldAlert } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/components/providers/auth-provider";

const CONFIRM_STRING = "I_UNDERSTAND_THIS_DELETES_DATA";

export default function MaintenancePage() {
  const { user } = useAuth();
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);
  const [options, setOptions] = useState({
    purgeStudents: false,
    purgeSuppliers: false,
    purgeMasterData: false,
  });

  if (user?.role !== "ADMIN") {
    return (
      <div className="flex flex-col items-center justify-center h-[60vh] gap-4">
        <ShieldAlert className="w-12 h-12 text-destructive" />
        <h1 className="text-2xl font-bold">Access Denied</h1>
        <p className="text-muted-foreground">Only administrators can access this page.</p>
      </div>
    );
  }

  const handlePurge = async () => {
    if (confirm !== CONFIRM_STRING) {
      toast.error("Please type the confirmation string exactly.");
      return;
    }

    setLoading(true);
    try {
      const response = await fetch("/api/admin/purge-demo", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${localStorage.getItem("token")}`, // Assuming token is in localStorage
        },
        body: JSON.stringify({
          confirm,
          ...options
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to purge data");
      }

      toast.success("Data purged successfully!");
      setConfirm("");
      
      // Show summary
      const summary = Object.entries(data.counts)
        .filter(([_, count]) => (count as number) > 0)
        .map(([key, count]) => `${key}: ${count}`)
        .join(", ");
      
      if (summary) {
        toast.info(`Deleted: ${summary}`);
      } else {
        toast.info("No data was found to purge.");
      }

    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">System Maintenance</h1>
        <p className="text-muted-foreground">
          Tools for managing the system state and performing administrative tasks.
        </p>
      </div>

      <Card className="border-destructive/50">
        <CardHeader className="bg-destructive/5">
          <div className="flex items-center gap-2 text-destructive">
            <Trash2 className="w-5 h-5" />
            <CardTitle>Purge Demo Transactions</CardTitle>
          </div>
          <CardDescription>
            This action will PERMANENTLY delete all transaction data (vouchers, GL entries, invoices, etc.) for your organisation.
            Users and Chart of Accounts will be preserved.
          </CardDescription>
        </CardHeader>
        <CardContent className="pt-6 space-y-6">
          <div className="p-4 rounded-lg bg-yellow-500/10 border border-yellow-500/20 flex gap-3 text-sm text-yellow-600 dark:text-yellow-500">
            <AlertCircle className="w-5 h-5 shrink-0" />
            <p>
              Warning: This operation cannot be undone. It is intended for clearing demo data before 
              going live. Ensure you have backups if necessary.
            </p>
          </div>

          <div className="space-y-4">
            <h3 className="text-sm font-semibold">Optional Purges</h3>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="flex items-center space-x-2">
                <Checkbox 
                  id="students" 
                  checked={options.purgeStudents}
                  onCheckedChange={(checked) => setOptions(prev => ({ ...prev, purgeStudents: !!checked }))}
                />
                <Label htmlFor="students">Purge Students</Label>
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox 
                  id="suppliers" 
                  checked={options.purgeSuppliers}
                  onCheckedChange={(checked) => setOptions(prev => ({ ...prev, purgeSuppliers: !!checked }))}
                />
                <Label htmlFor="suppliers">Purge Suppliers</Label>
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox 
                  id="masterData" 
                  checked={options.purgeMasterData}
                  onCheckedChange={(checked) => setOptions(prev => ({ ...prev, purgeMasterData: !!checked }))}
                />
                <Label htmlFor="masterData">Purge All Master Data</Label>
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="confirm">
              Type <span className="font-mono font-bold select-all">{CONFIRM_STRING}</span> to confirm
            </Label>
            <Input 
              id="confirm"
              placeholder="Confirmation string..."
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              className="border-destructive/30 focus-visible:ring-destructive"
            />
          </div>
        </CardContent>
        <CardFooter className="bg-destructive/5 border-t border-destructive/10 py-4">
          <Button 
            variant="destructive" 
            className="w-full sm:w-auto"
            disabled={confirm !== CONFIRM_STRING || loading}
            onClick={handlePurge}
          >
            {loading ? "Purging Data..." : "Permanently Purge Data"}
          </Button>
        </CardFooter>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>System Information</CardTitle>
          <CardDescription>Current environment details</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <p className="text-muted-foreground">Environment</p>
              <p className="font-medium capitalize">{process.env.NODE_ENV || "development"}</p>
            </div>
            <div>
              <p className="text-muted-foreground">Organisation ID</p>
              <p className="font-mono text-xs">{user?.organisationId || "Not detected"}</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
