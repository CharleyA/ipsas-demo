"use client";

import { useEffect, useState } from "react";
import { 
  ShieldCheck, 
  Loader2, 
  ArrowLeft, 
  Check, 
  X,
  UserCheck,
  ShieldAlert,
  Save,
  Search,
  Filter
} from "lucide-react";

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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/components/providers/auth-provider";

export default function ApprovalWorkflowPage() {
  const { token, user: currentUser } = useAuth();
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState<string | null>(null);
  const [users, setUsers] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [roleFilter, setRoleFilter] = useState<string>("ALL");

  const filteredUsers = users.filter((user) => {
    const matchesSearch = 
      user.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      `${user.firstName} ${user.lastName}`.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesRole = roleFilter === "ALL" || user.role === roleFilter;

    return matchesSearch && matchesRole;
  });

  useEffect(() => {
    async function fetchUsers() {
      if (!token || !currentUser) return;

      try {
        const response = await fetch("/api/users", {
          headers: { 
            Authorization: `Bearer ${token}`,
            "x-organisation-id": currentUser.organisationId,
            "x-user-id": currentUser.id
          },
        });
        const result = await response.json();
        if (result.success) {
          setUsers(result.data);
        }
      } catch (error) {
        toast.error("Failed to fetch users");
      } finally {
        setIsLoading(false);
      }
    }

    fetchUsers();
  }, [token, currentUser]);

  async function updateUserStatus(userId: string, data: { isApprover?: boolean; role?: string }) {
    if (!token || !currentUser) return;

    setIsSaving(userId);
    try {
      const response = await fetch(`/api/users/organisation/${userId}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
          "x-organisation-id": currentUser.organisationId,
          "x-user-id": currentUser.id
        },
        body: JSON.stringify(data),
      });

      const result = await response.json();

      if (result.success) {
        setUsers(users.map(u => u.id === userId ? { ...u, ...data } : u));
        toast.success("User workflow settings updated");
      } else {
        toast.error(result.error || "Failed to update user");
      }
    } catch (error) {
      toast.error("An error occurred while saving");
    } finally {
      setIsSaving(null);
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
          <h1 className="text-3xl font-bold tracking-tight">Approval Workflows</h1>
          <p className="text-muted-foreground">
            Designate users who are authorised to approve vouchers and transactions.
          </p>
        </div>
      </div>

      <div className="grid gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <UserCheck className="h-5 w-5 text-indigo-500" />
              Authorised Approvers
            </CardTitle>
            <CardDescription>
              Users marked as "Approver" will receive approval tasks for vouchers.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col md:flex-row gap-4 mb-6">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input 
                  placeholder="Search by name or email..." 
                  className="pl-9"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
              <div className="flex items-center gap-2">
                <Filter className="h-4 w-4 text-muted-foreground" />
                <Select value={roleFilter} onValueChange={setRoleFilter}>
                  <SelectTrigger className="w-[180px]">
                    <SelectValue placeholder="Filter by Role" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ALL">All Roles</SelectItem>
                    <SelectItem value="ACCOUNTANT">Accountant</SelectItem>
                    <SelectItem value="ADMIN">Admin</SelectItem>
                    <SelectItem value="BURSAR">Bursar</SelectItem>
                    <SelectItem value="HEADMASTER">Headmaster</SelectItem>
                    <SelectItem value="CLERK">Clerk</SelectItem>
                    <SelectItem value="AUDITOR">Auditor</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>User</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>System Role</TableHead>
                  <TableHead className="text-center">Authorised Approver</TableHead>
                  <TableHead className="text-right">Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredUsers.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="h-24 text-center text-muted-foreground">
                      No users found matching your criteria.
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredUsers.map((user) => (
                    <TableRow key={user.id}>
                      <TableCell className="font-medium">
                        {user.firstName} {user.lastName}
                      </TableCell>
                      <TableCell className="text-muted-foreground">{user.email}</TableCell>
                      <TableCell>
                        <Select
                          defaultValue={user.role}
                          onValueChange={(value) => updateUserStatus(user.id, { role: value })}
                          disabled={isSaving === user.id}
                        >
                          <SelectTrigger className="w-[140px] h-8 text-xs">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="ADMIN">Admin</SelectItem>
                            <SelectItem value="ACCOUNTANT">Accountant</SelectItem>
                            <SelectItem value="BURSAR">Bursar</SelectItem>
                            <SelectItem value="HEADMASTER">Headmaster</SelectItem>
                            <SelectItem value="CLERK">Clerk</SelectItem>
                            <SelectItem value="AUDITOR">Auditor</SelectItem>
                          </SelectContent>
                        </Select>
                      </TableCell>
                      <TableCell className="text-center">
                        <div className="flex justify-center">
                          <Switch
                            checked={user.isApprover}
                            onCheckedChange={(checked) => updateUserStatus(user.id, { isApprover: checked })}
                            disabled={isSaving === user.id}
                          />
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        {user.isApprover ? (
                          <Badge className="bg-green-500/10 text-green-500 hover:bg-green-500/20 border-green-500/20">
                            <Check className="mr-1 h-3 w-3" /> Approver
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="text-muted-foreground">
                            No Approval Auth
                          </Badge>
                        )}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        <Card className="border-amber-500/20 bg-amber-500/5">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-amber-600">
              <ShieldAlert className="h-5 w-5" />
              Workflow Rules
            </CardTitle>
            <CardDescription>
              Current system configuration for approval logic.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4 text-sm">
            <div className="flex items-start gap-3">
              <div className="mt-0.5 h-2 w-2 rounded-full bg-amber-500" />
              <p>
                <strong>Implicit Approvers:</strong> By default, users with <strong>Bursar</strong>, 
                <strong>Headmaster</strong>, <strong>Accountant</strong>, and <strong>Admin</strong> roles are usually required for final posting, 
                but specific "Approver" status allows any user to be part of the review chain.
              </p>
            </div>
            <div className="flex items-start gap-3">
              <div className="mt-0.5 h-2 w-2 rounded-full bg-amber-500" />
              <p>
                <strong>Audit Trail:</strong> Every approval action is logged in the system audit log with a timestamp and user ID.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
