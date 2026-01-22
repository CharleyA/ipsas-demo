"use client";

import { useEffect, useState } from "react";
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
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Plus, Search, Eye, Loader2, FilterX } from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";
import { useAuth } from "@/components/providers/auth-provider";

export default function VouchersPage() {
  const { token } = useAuth();
  const [vouchers, setVouchers] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [status, setStatus] = useState<string>("ALL");
  const [type, setType] = useState<string>("ALL");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [search, setSearch] = useState("");

  const fetchVouchers = async () => {
    setIsLoading(true);
    try {
      const params = new URLSearchParams();
      if (status !== "ALL") params.append("status", status);
      if (type !== "ALL") params.append("type", type);
      if (startDate) params.append("startDate", startDate);
      if (endDate) params.append("endDate", endDate);

      const response = await fetch(`/api/vouchers?${params.toString()}`, {
        headers: { "Authorization": `Bearer ${token}` }
      });
      const data = await response.json();
      setVouchers(Array.isArray(data) ? data : []);
    } catch (error) {
      toast.error("Failed to fetch vouchers");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (token) fetchVouchers();
  }, [token, status, type]);

  const filteredVouchers = vouchers.filter(v => 
    `${v.number} ${v.description}`.toLowerCase().includes(search.toLowerCase())
  );

  const resetFilters = () => {
    setStatus("ALL");
    setType("ALL");
    setSearch("");
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Voucher Management</h1>
          <p className="text-muted-foreground">
            View and manage all accounting vouchers and journals.
          </p>
        </div>
        <Button asChild>
          <Link href="/dashboard/vouchers/new">
            <Plus className="w-4 h-4 mr-2" />
            New Voucher
          </Link>
        </Button>
      </div>

      <Card>
        <CardHeader>
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex flex-wrap items-center gap-2">
              <div className="relative w-64">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search voucher # or desc..."
                  className="pl-8"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>
              <Select value={type} onValueChange={setType}>
                <SelectTrigger className="w-[150px]">
                  <SelectValue placeholder="Type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">All Types</SelectItem>
                  <SelectItem value="JOURNAL">Journal</SelectItem>
                  <SelectItem value="RECEIPT">Receipt</SelectItem>
                  <SelectItem value="PAYMENT">Payment</SelectItem>
                  <SelectItem value="INVOICE">Invoice</SelectItem>
                  <SelectItem value="BILL">Bill</SelectItem>
                </SelectContent>
              </Select>
              <Select value={status} onValueChange={setStatus}>
                <SelectTrigger className="w-[150px]">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">All Status</SelectItem>
                  <SelectItem value="DRAFT">Draft</SelectItem>
                  <SelectItem value="SUBMITTED">Submitted</SelectItem>
                  <SelectItem value="APPROVED">Approved</SelectItem>
                  <SelectItem value="POSTED">Posted</SelectItem>
                  <SelectItem value="REVERSED">Reversed</SelectItem>
                </SelectContent>
              </Select>
              {(status !== "ALL" || type !== "ALL" || search !== "") && (
                <Button variant="ghost" size="icon" onClick={resetFilters} title="Reset Filters">
                  <FilterX className="w-4 h-4" />
                </Button>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="w-8 h-8 animate-spin text-primary" />
            </div>
          ) : filteredVouchers.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No vouchers found matching your criteria.
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Voucher No.</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredVouchers.map((voucher) => (
                  <TableRow key={voucher.id}>
                    <TableCell className="font-medium">
                      {voucher.number}
                    </TableCell>
                    <TableCell>
                      <Badge variant="secondary">{voucher.type}</Badge>
                    </TableCell>
                    <TableCell>
                      {new Date(voucher.date).toLocaleDateString()}
                    </TableCell>
                    <TableCell className="max-w-[300px] truncate">
                      {voucher.description}
                    </TableCell>
                    <TableCell>
                      <Badge 
                        variant={
                          voucher.status === "POSTED" ? "success" :
                          voucher.status === "DRAFT" ? "outline" :
                          voucher.status === "SUBMITTED" ? "warning" : "default"
                        }
                      >
                        {voucher.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button variant="ghost" size="icon" asChild>
                        <Link href={`/dashboard/vouchers/${voucher.id}`}>
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
    </div>
  );
}
