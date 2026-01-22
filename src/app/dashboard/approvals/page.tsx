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
import { useAuth } from "@/components/providers/auth-provider";
import { Eye, CheckCircle, XCircle, Loader2 } from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";

export default function ApprovalsPage() {
  const { user, token } = useAuth();
  const [tasks, setTasks] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchTasks = async (silent = false) => {
    if (!silent) setIsLoading(true);
    try {
      const response = await fetch("/api/approvals", {
        headers: token ? { "Authorization": `Bearer ${token}` } : {},
      });
      if (!response.ok) throw new Error("Failed to fetch");
      const data = await response.json();
      setTasks(data);
    } catch (error) {
      if (!silent) toast.error("Failed to fetch approval tasks");
    } finally {
      if (!silent) setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchTasks();
    const interval = setInterval(() => fetchTasks(true), 10000); // Poll every 10 seconds
    return () => clearInterval(interval);
  }, []);

  const handleAction = async (voucherId: string, action: "approve" | "reject") => {
    try {
      const response = await fetch(`/api/vouchers/${voucherId}/${action}`, {
        method: "POST",
        headers: { 
          "Content-Type": "application/json",
          ...(token ? { "Authorization": `Bearer ${token}` } : {})
        },
        body: JSON.stringify({ notes: `Voucher ${action}d via approvals inbox` }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || `Failed to ${action} voucher`);
      }

      toast.success(`Voucher ${action}d successfully`);
      setTasks(tasks.filter(t => t.voucherId !== voucherId));
    } catch (error: any) {
      toast.error(error.message);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Approvals Inbox</h1>
          <p className="text-muted-foreground">
            Review and take action on pending vouchers.
          </p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Pending Approvals</CardTitle>
          <CardDescription>
            Vouchers awaiting your review and authorization.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="w-8 h-8 animate-spin text-primary" />
            </div>
          ) : tasks.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No pending approvals found.
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Voucher No.</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {tasks.map((task) => (
                  <TableRow key={task.id}>
                    <TableCell className="font-medium">
                      {task.voucher.number}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">{task.voucher.type}</Badge>
                    </TableCell>
                    <TableCell>
                      {new Date(task.voucher.date).toLocaleDateString()}
                    </TableCell>
                    <TableCell className="max-w-[300px] truncate">
                      {task.voucher.description}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button variant="ghost" size="icon" asChild>
                          <Link href={`/dashboard/vouchers/${task.voucher.id}`}>
                            <Eye className="w-4 h-4" />
                          </Link>
                        </Button>
                          {["ADMIN", "BURSAR", "HEADMASTER"].includes(user?.role) && (
                            <>
                              <Button 
                                variant="ghost" 
                                size="icon" 
                                className="text-green-600"
                                onClick={() => handleAction(task.voucherId, "approve")}
                              >
                                <CheckCircle className="w-4 h-4" />
                              </Button>
                              <Button 
                                variant="ghost" 
                                size="icon" 
                                className="text-red-600"
                                onClick={() => handleAction(task.voucherId, "reject")}
                              >
                                <XCircle className="w-4 h-4" />
                              </Button>

                          </>
                        )}
                      </div>
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
