"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { 
  ArrowLeft, 
  CheckCircle, 
  Send, 
  Play, 
  RotateCcw,
  Loader2,
  Printer,
  History,
  FileText
} from "lucide-react";
import Link from "next/link";
import { useAuth } from "@/components/providers/auth-provider";
import { toast } from "sonner";
import { Separator } from "@/components/ui/separator";

export default function VoucherDetailPage() {
  const { id } = useParams();
  const router = useRouter();
  const { token, user } = useAuth();
  const [voucher, setVoucher] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isActing, setIsActing] = useState(false);

  const fetchVoucher = async () => {
    setIsLoading(true);
    try {
      const response = await fetch(`/api/vouchers/${id}`, {
        headers: { "Authorization": `Bearer ${token}` }
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error);
      setVoucher(data);
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (token) fetchVoucher();
  }, [id, token]);

    const handleWorkflowAction = async (action: string) => {
      setIsActing(true);
      try {
        const response = await fetch(`/api/vouchers/${id}/${action}`, {
          method: "POST",
          headers: { "Authorization": `Bearer ${token}` }
        });
        const data = await response.json();
        if (!response.ok) throw new Error(data.error);
        
        if (action === "post" && data.affectedAccountIds?.length > 0) {
          toast.success(`Voucher posted successfully`, {
            description: "You can now view the impact on the affected ledgers.",
            action: {
              label: "View Ledgers",
                onClick: () => {
                  const firstAccountId = data.affectedAccountIds[0];
                  const dateStr = voucher.date ? new Date(voucher.date).toISOString().split('T')[0] : new Date().toISOString().split('T')[0];
                  router.push(`/dashboard/reports/general-ledger?accountId=${firstAccountId}&voucherId=${id}&startDate=${dateStr}&endDate=${dateStr}`);
                }
            }
          });
        } else {
          toast.success(`Voucher ${action}ed successfully`);
        }
        fetchVoucher();
      } catch (error: any) {
        toast.error(error.message);
      } finally {
        setIsActing(false);
      }
    };


  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!voucher) return <div>Voucher not found</div>;

  const canSubmit = voucher.status === "DRAFT" && ["ADMIN", "ACCOUNTANT"].includes(user?.role || "");
  const canApprove = voucher.status === "SUBMITTED" && ["ADMIN", "BURSAR"].includes(user?.role || "");
    const canPost = voucher.status === "APPROVED" && ["ADMIN", "BURSAR"].includes(user?.role || "");
    const canReverse = voucher.status === "POSTED" && user?.role === "ADMIN";
    const isPosted = voucher.status === "POSTED";

    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" asChild>
              <Link href="/dashboard/vouchers">
                <ArrowLeft className="w-4 h-4" />
              </Link>
            </Button>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-2xl font-bold tracking-tight">{voucher.number}</h1>
                <Badge 
                  variant={
                    voucher.status === "POSTED" ? "success" :
                    voucher.status === "DRAFT" ? "outline" :
                    voucher.status === "SUBMITTED" ? "warning" : "default"
                  }
                >
                  {voucher.status}
                </Badge>
              </div>
              <p className="text-sm text-muted-foreground">
                {voucher.type} • Created by {voucher.createdBy?.firstName} on {new Date(voucher.date).toLocaleDateString()}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {isPosted && (
              <Button variant="outline" size="sm" asChild className="border-primary text-primary hover:bg-primary/5">
                <Link href={`/dashboard/reports/general-ledger?accountId=${voucher.lines?.[0]?.accountId || ""}&voucherId=${voucher.id}&startDate=${voucher.date ? new Date(voucher.date).toISOString().split('T')[0] : ""}&endDate=${voucher.date ? new Date(voucher.date).toISOString().split('T')[0] : ""}`}>
                  <FileText className="w-4 h-4 mr-2" />
                  View Ledger
                </Link>
              </Button>
            )}
            <Button variant="outline" size="sm">
              <Printer className="w-4 h-4 mr-2" />
              Print
            </Button>

          {canSubmit && (
            <Button size="sm" onClick={() => handleWorkflowAction("submit")} disabled={isActing}>
              <Send className="w-4 h-4 mr-2" />
              Submit
            </Button>
          )}
          {canApprove && (
            <Button size="sm" onClick={() => handleWorkflowAction("approve")} disabled={isActing} className="bg-green-600 hover:bg-green-700">
              <CheckCircle className="w-4 h-4 mr-2" />
              Approve
            </Button>
          )}
          {canPost && (
            <Button size="sm" onClick={() => handleWorkflowAction("post")} disabled={isActing}>
              <Play className="w-4 h-4 mr-2" />
              Post to GL
            </Button>
          )}
          {canReverse && (
            <Button size="sm" variant="destructive" onClick={() => handleWorkflowAction("reverse")} disabled={isActing}>
              <RotateCcw className="w-4 h-4 mr-2" />
              Reverse
            </Button>
          )}
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle>Voucher Lines</CardTitle>
            <CardDescription>
              Accounting entries and dimension allocations.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Account</TableHead>
                  <TableHead>Dimensions</TableHead>
                  <TableHead className="text-right">Debit</TableHead>
                  <TableHead className="text-right">Credit</TableHead>
                  <TableHead className="text-right text-xs text-muted-foreground">Currency</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {voucher.lines?.map((line: any) => (
                  <TableRow key={line.id}>
                    <TableCell>
                      <div className="font-medium text-sm">{line.account?.name}</div>
                      <div className="text-xs text-muted-foreground">{line.account?.code}</div>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-1">
                        {line.fund && <Badge variant="outline" className="text-[10px] h-4">{line.fund.code}</Badge>}
                        {line.costCentre && <Badge variant="outline" className="text-[10px] h-4">{line.costCentre.code}</Badge>}
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      {line.debit ? parseFloat(line.amountLc).toFixed(2) : ""}
                    </TableCell>
                    <TableCell className="text-right">
                      {line.credit ? parseFloat(line.amountLc).toFixed(2) : ""}
                    </TableCell>
                    <TableCell className="text-right text-xs text-muted-foreground">
                      {line.currencyCode} {parseFloat(line.amountFc).toFixed(2)}
                      <br />
                      @{line.fxRate}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Voucher Summary</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Reference:</span>
                  <span className="font-medium">{voucher.reference || "N/A"}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Fiscal Period:</span>
                  <span className="font-medium">{voucher.period?.name}</span>
                </div>
              </div>
              <Separator />
              <div className="space-y-1">
                <p className="text-xs font-medium text-muted-foreground">Description</p>
                <p className="text-sm">{voucher.description}</p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
              <CardTitle className="text-sm font-medium">Audit Trail</CardTitle>
              <History className="w-4 h-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="relative space-y-4 before:absolute before:inset-0 before:left-2.5 before:w-0.5 before:bg-muted">
                <div className="relative pl-8">
                  <div className="absolute left-0 top-1.5 w-5 h-5 rounded-full bg-primary flex items-center justify-center">
                    <div className="w-2 h-2 rounded-full bg-background" />
                  </div>
                  <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Created</p>
                  <p className="text-sm">Voucher initialized in Draft</p>
                  <p className="text-[10px] text-muted-foreground">{new Date(voucher.createdAt).toLocaleString()}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
