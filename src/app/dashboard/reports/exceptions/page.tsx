"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { 
  AlertTriangle, 
  Calendar, 
  FileWarning, 
  RotateCcw, 
  Lock, 
  FileText,
  Loader2,
  RefreshCw,
  Eye
} from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";
import { useAuth } from "@/components/providers/auth-provider";
import { format, subDays } from "date-fns";

interface ExceptionSummary {
  backdatedPostings: number;
  reopenedPeriods: number;
  missingAttachments: number;
  manualJournals: number;
  periodOverrides: number;
  reversals: number;
}

export default function ExceptionsReportPage() {
  const { token } = useAuth();
  const [isLoading, setIsLoading] = useState(true);
  const [summary, setSummary] = useState<ExceptionSummary | null>(null);
  const [backdated, setBackdated] = useState<any[]>([]);
  const [reopened, setReopened] = useState<any[]>([]);
  const [attachments, setAttachments] = useState<any[]>([]);
  const [journals, setJournals] = useState<any[]>([]);
  const [overrides, setOverrides] = useState<any[]>([]);
  const [reversals, setReversals] = useState<any[]>([]);
  
  const [startDate, setStartDate] = useState(format(subDays(new Date(), 90), "yyyy-MM-dd"));
  const [endDate, setEndDate] = useState(format(new Date(), "yyyy-MM-dd"));

  const fetchReport = async () => {
    setIsLoading(true);
    try {
      const params = new URLSearchParams();
      if (startDate) params.set("startDate", startDate);
      if (endDate) params.set("endDate", endDate);

      const response = await fetch(`/api/reports/exceptions?${params}`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!response.ok) throw new Error("Failed to fetch report");
      
      const data = await response.json();
      setSummary(data.summary);
      setBackdated(data.backdatedPostings || []);
      setReopened(data.reopenedPeriods || []);
      setAttachments(data.missingAttachments || []);
      setJournals(data.manualJournals || []);
      setOverrides(data.periodOverrides || []);
      setReversals(data.reversals || []);
    } catch (error) {
      toast.error("Failed to load exceptions report");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (token) fetchReport();
  }, [token]);

  const summaryCards = [
    { label: "Backdated Postings", value: summary?.backdatedPostings || 0, icon: Calendar, color: "text-orange-500", bg: "bg-orange-50" },
    { label: "Reopened Periods", value: summary?.reopenedPeriods || 0, icon: RotateCcw, color: "text-red-500", bg: "bg-red-50" },
    { label: "Missing Attachments", value: summary?.missingAttachments || 0, icon: FileWarning, color: "text-yellow-500", bg: "bg-yellow-50" },
    { label: "Manual Journals", value: summary?.manualJournals || 0, icon: FileText, color: "text-blue-500", bg: "bg-blue-50" },
    { label: "Period Overrides", value: summary?.periodOverrides || 0, icon: Lock, color: "text-purple-500", bg: "bg-purple-50" },
    { label: "Reversals", value: summary?.reversals || 0, icon: AlertTriangle, color: "text-gray-500", bg: "bg-gray-50" },
  ];

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Audit Exceptions Report</h1>
          <p className="text-muted-foreground">
            Review accounting anomalies, control overrides, and compliance issues.
          </p>
        </div>
        <Button onClick={fetchReport} variant="outline">
          <RefreshCw className="w-4 h-4 mr-2" />
          Refresh
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Date Range Filter</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-end gap-4">
            <div className="grid gap-2">
              <Label htmlFor="startDate">Start Date</Label>
              <Input
                id="startDate"
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="endDate">End Date</Label>
              <Input
                id="endDate"
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
              />
            </div>
            <Button onClick={fetchReport}>Apply Filter</Button>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-4 md:grid-cols-3 lg:grid-cols-6">
        {summaryCards.map((card) => (
          <Card key={card.label} className={card.bg}>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">{card.label}</CardTitle>
              <card.icon className={`h-4 w-4 ${card.color}`} />
            </CardHeader>
            <CardContent>
              <div className={`text-2xl font-bold ${card.color}`}>{card.value}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Tabs defaultValue="backdated" className="space-y-4">
        <TabsList className="grid w-full grid-cols-6">
          <TabsTrigger value="backdated">Backdated ({backdated.length})</TabsTrigger>
          <TabsTrigger value="reopened">Reopened ({reopened.length})</TabsTrigger>
          <TabsTrigger value="attachments">Attachments ({attachments.length})</TabsTrigger>
          <TabsTrigger value="journals">Journals ({journals.length})</TabsTrigger>
          <TabsTrigger value="overrides">Overrides ({overrides.length})</TabsTrigger>
          <TabsTrigger value="reversals">Reversals ({reversals.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="backdated">
          <Card>
            <CardHeader>
              <CardTitle>Backdated Posting Attempts</CardTitle>
              <CardDescription>Vouchers posted more than 7 days after their transaction date.</CardDescription>
            </CardHeader>
            <CardContent>
              {backdated.length === 0 ? (
                <p className="text-muted-foreground text-center py-8">No backdated postings found.</p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Voucher</TableHead>
                      <TableHead>Voucher Date</TableHead>
                      <TableHead>Post Date</TableHead>
                      <TableHead>Days Diff</TableHead>
                      <TableHead>User</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {backdated.map((item) => (
                      <TableRow key={item.voucherId}>
                        <TableCell className="font-medium">{item.voucherNumber}</TableCell>
                        <TableCell>{format(new Date(item.voucherDate), "dd MMM yyyy")}</TableCell>
                        <TableCell>{format(new Date(item.postDate), "dd MMM yyyy")}</TableCell>
                        <TableCell>
                          <Badge variant="destructive">{item.daysDiff} days</Badge>
                        </TableCell>
                        <TableCell>{item.userName}</TableCell>
                        <TableCell>
                          <Button variant="ghost" size="icon" asChild>
                            <Link href={`/dashboard/vouchers/${item.voucherId}`}>
                              <Eye className="w-4 h-4" />
                            </Link>
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="reopened">
          <Card>
            <CardHeader>
              <CardTitle>Reopened Periods</CardTitle>
              <CardDescription>Fiscal periods that were reopened after being closed or locked.</CardDescription>
            </CardHeader>
            <CardContent>
              {reopened.length === 0 ? (
                <p className="text-muted-foreground text-center py-8">No reopened periods found.</p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Period</TableHead>
                      <TableHead>Reopen Date</TableHead>
                      <TableHead>User</TableHead>
                      <TableHead>Reason</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {reopened.map((item, idx) => (
                      <TableRow key={idx}>
                        <TableCell className="font-medium">{item.periodName}</TableCell>
                        <TableCell>{format(new Date(item.reopenDate), "dd MMM yyyy HH:mm")}</TableCell>
                        <TableCell>{item.userName}</TableCell>
                        <TableCell>{item.reason}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="attachments">
          <Card>
            <CardHeader>
              <CardTitle>Posted Vouchers Without Attachments</CardTitle>
              <CardDescription>Posted vouchers that have no supporting documents attached.</CardDescription>
            </CardHeader>
            <CardContent>
              {attachments.length === 0 ? (
                <p className="text-muted-foreground text-center py-8">All posted vouchers have attachments.</p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Voucher</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Created</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {attachments.map((item) => (
                      <TableRow key={item.voucherId}>
                        <TableCell className="font-medium">{item.voucherNumber}</TableCell>
                        <TableCell>{item.voucherType}</TableCell>
                        <TableCell>
                          <Badge>{item.status}</Badge>
                        </TableCell>
                        <TableCell>{format(new Date(item.createdAt), "dd MMM yyyy")}</TableCell>
                        <TableCell>
                          <Button variant="ghost" size="icon" asChild>
                            <Link href={`/dashboard/vouchers/${item.voucherId}`}>
                              <Eye className="w-4 h-4" />
                            </Link>
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="journals">
          <Card>
            <CardHeader>
              <CardTitle>Manual Journal Entries</CardTitle>
              <CardDescription>Posted manual journal vouchers for auditor review.</CardDescription>
            </CardHeader>
            <CardContent>
              {journals.length === 0 ? (
                <p className="text-muted-foreground text-center py-8">No manual journals found.</p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Voucher</TableHead>
                      <TableHead>Date</TableHead>
                      <TableHead>Description</TableHead>
                      <TableHead className="text-right">Amount (LC)</TableHead>
                      <TableHead>Created By</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {journals.map((item) => (
                      <TableRow key={item.voucherId}>
                        <TableCell className="font-medium">{item.voucherNumber}</TableCell>
                        <TableCell>{format(new Date(item.date), "dd MMM yyyy")}</TableCell>
                        <TableCell className="max-w-xs truncate">{item.description}</TableCell>
                        <TableCell className="text-right">{item.totalAmount.toLocaleString()}</TableCell>
                        <TableCell>{item.createdBy}</TableCell>
                        <TableCell>
                          <Button variant="ghost" size="icon" asChild>
                            <Link href={`/dashboard/vouchers/${item.voucherId}`}>
                              <Eye className="w-4 h-4" />
                            </Link>
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="overrides">
          <Card>
            <CardHeader>
              <CardTitle>Period Lock Overrides</CardTitle>
              <CardDescription>Instances where locked period restrictions were overridden.</CardDescription>
            </CardHeader>
            <CardContent>
              {overrides.length === 0 ? (
                <p className="text-muted-foreground text-center py-8">No period overrides found.</p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Period</TableHead>
                      <TableHead>Override Date</TableHead>
                      <TableHead>User</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {overrides.map((item, idx) => (
                      <TableRow key={idx}>
                        <TableCell className="font-medium">{item.periodName}</TableCell>
                        <TableCell>{format(new Date(item.overrideDate), "dd MMM yyyy HH:mm")}</TableCell>
                        <TableCell>{item.userName}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="reversals">
          <Card>
            <CardHeader>
              <CardTitle>Voucher Reversals</CardTitle>
              <CardDescription>Posted vouchers that were subsequently reversed.</CardDescription>
            </CardHeader>
            <CardContent>
              {reversals.length === 0 ? (
                <p className="text-muted-foreground text-center py-8">No reversals found.</p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Original Voucher</TableHead>
                      <TableHead>Reversal Voucher</TableHead>
                      <TableHead>Reversal Date</TableHead>
                      <TableHead>User</TableHead>
                      <TableHead>Reason</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {reversals.map((item, idx) => (
                      <TableRow key={idx}>
                        <TableCell className="font-medium">{item.originalVoucherNumber}</TableCell>
                        <TableCell>{item.reversalVoucherNumber}</TableCell>
                        <TableCell>{format(new Date(item.reversalDate), "dd MMM yyyy")}</TableCell>
                        <TableCell>{item.userName}</TableCell>
                        <TableCell className="max-w-xs truncate">{item.reason}</TableCell>
                        <TableCell>
                          <Button variant="ghost" size="icon" asChild>
                            <Link href={`/dashboard/vouchers/${item.originalVoucherId}`}>
                              <Eye className="w-4 h-4" />
                            </Link>
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
