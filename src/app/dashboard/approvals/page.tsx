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

  const fetchTasks = async () => {
    setIsLoading(true);
    try {
      // In a real app, fetch from /api/vouchers with status=SUBMITTED
      // For now, we'll mock it
      setTasks([
        {
          id: "1",
          voucher: {
            id: "v1",
            number: "JV-2026-001",
            type: "JOURNAL",
            date: "2026-01-08",
            description: "Correcting term 1 fees allocation",
            organisationId: user?.organisationId,
          },
          status: "PENDING",
        },
        {
          id: "2",
          voucher: {
            id: "v2",
            number: "PV-2026-042",
            type: "PAYMENT",
            date: "2026-01-07",
            description: "Electricity bill - December",
            organisationId: user?.organisationId,
          },
          status: "PENDING",
        }
      ]);
    } catch (error) {
      toast.error("Failed to fetch approval tasks");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchTasks();
  }, []);

  const handleAction = async (id: string, action: "approve" | "reject") => {
    toast.info(`Voucher ${action}d (Mock action)`);
    setTasks(tasks.filter(t => t.id !== id));
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
                        {user?.role !== "VIEWER" && (
                          <>
                            <Button 
                              variant="ghost" 
                              size="icon" 
                              className="text-green-600"
                              onClick={() => handleAction(task.id, "approve")}
                            >
                              <CheckCircle className="w-4 h-4" />
                            </Button>
                            <Button 
                              variant="ghost" 
                              size="icon" 
                              className="text-red-600"
                              onClick={() => handleAction(task.id, "reject")}
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
