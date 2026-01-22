"use client";

import { useEffect, useState, useMemo } from "react";
import Link from "next/link";
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
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { 
  Plus, 
  Search, 
  Loader2, 
  BookOpen, 
  ChevronRight, 
  ChevronDown, 
  LayoutGrid, 
  List,
  TrendingUp,
  TrendingDown,
  Wallet,
  ArrowUpRight,
  RefreshCcw,
  FileText
} from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/components/providers/auth-provider";
import { cn } from "@/lib/utils";

type ViewMode = "table" | "tree";

export default function AccountsPage() {
  const { token } = useAuth();
  const [accounts, setAccounts] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [isAddingAccount, setIsAddingAccount] = useState(false);
  const [isSeeding, setIsSeeding] = useState(false);
  const [viewMode, setViewMode] = useState<ViewMode>("table");
  const [expandedNodes, setExpandedNodes] = useState<Set<string>>(new Set());

  const [newAccount, setNewAccount] = useState({
    code: "",
    name: "",
    type: "ASSET",
    parentId: null as string | null,
    description: "",
  });

  const fetchAccounts = async () => {
    setIsLoading(true);
    try {
      const response = await fetch("/api/accounts", {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await response.json();
      setAccounts(Array.isArray(data) ? data : []);
    } catch (error) {
      toast.error("Failed to fetch accounts");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (token) fetchAccounts();
  }, [token]);

  const handleAddAccount = async () => {
    try {
      const res = await fetch("/api/accounts", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(newAccount),
      });

      if (!res.ok) throw new Error("Failed to add account");

      toast.success("Account created successfully");
      setIsAddingAccount(false);
      fetchAccounts();
      setNewAccount({
        code: "",
        name: "",
        type: "ASSET",
        parentId: null as string | null,
        description: "",
      });
    } catch (error) {
      toast.error("Error creating account");
    }
  };

  const handleSeedIPSAS = async () => {
    setIsSeeding(true);
    try {
      const res = await fetch("/api/accounts/seed/ipsas", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!res.ok) throw new Error("Failed to seed IPSAS COA");

      toast.success("IPSAS Chart of Accounts populated successfully");
      fetchAccounts();
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setIsSeeding(false);
    }
  };

  const filteredAccounts = accounts.filter((a) =>
    `${a.code} ${a.name}`.toLowerCase().includes(search.toLowerCase())
  );

  const stats = useMemo(() => {
    const counts = {
      ASSET: 0,
      LIABILITY: 0,
      REVENUE: 0,
      EXPENSE: 0,
      EQUITY: 0
    };
    accounts.forEach(a => {
      const type = a.type as keyof typeof counts;
      if (counts[type] !== undefined) counts[type]++;
      else if (type === 'NET_ASSETS_EQUITY') counts.EQUITY++;
    });
    return counts;
  }, [accounts]);

  const toggleNode = (id: string) => {
    const newExpanded = new Set(expandedNodes);
    if (newExpanded.has(id)) {
      newExpanded.delete(id);
    } else {
      newExpanded.add(id);
    }
    setExpandedNodes(newExpanded);
  };

  const renderAccountRow = (account: any, level: number = 0) => {
    const hasChildren = accounts.some(a => a.parentId === account.id);
    const isExpanded = expandedNodes.has(account.id);
    
    // In tree view, we only show rows that match search or have children that match search
    // But for simplicity, if search is active, we might prefer table view
    
    return (
      <TableRow key={account.id} className="group hover:bg-muted/50 transition-colors">
        <TableCell className="font-mono">
          <div className="flex items-center" style={{ paddingLeft: `${level * 1.5}rem` }}>
            {viewMode === "tree" && (
              <div className="w-6 flex items-center justify-center">
                {hasChildren ? (
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    className="h-6 w-6 p-0 hover:bg-primary/10" 
                    onClick={() => toggleNode(account.id)}
                  >
                    {isExpanded ? (
                      <ChevronDown className="h-4 w-4 text-primary" />
                    ) : (
                      <ChevronRight className="h-4 w-4 text-muted-foreground" />
                    )}
                  </Button>
                ) : (
                  <div className="w-4 h-4" />
                )}
              </div>
            )}
            <Link 
              href={`/dashboard/reports/general-ledger?accountCode=${account.code}`}
              className="font-bold text-primary hover:underline flex items-center gap-1 ml-1"
            >
              {account.code}
              <ArrowUpRight className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity" />
            </Link>
          </div>
        </TableCell>
        <TableCell className="font-medium">{account.name}</TableCell>
        <TableCell>
          <Badge 
            variant="outline" 
            className={cn(
              "capitalize",
              account.type === 'ASSET' && "border-blue-500/50 text-blue-600 bg-blue-50/50",
              account.type === 'LIABILITY' && "border-amber-500/50 text-amber-600 bg-amber-50/50",
              account.type === 'REVENUE' && "border-green-500/50 text-green-600 bg-green-50/50",
              account.type === 'EXPENSE' && "border-rose-500/50 text-rose-600 bg-rose-50/50"
            )}
          >
            {account.type.toLowerCase().replace('_', ' ')}
          </Badge>
        </TableCell>
        {viewMode === "table" && (
          <TableCell className="text-muted-foreground">
            {account.parentId ? accounts.find(a => a.id === account.parentId)?.code : "-"}
          </TableCell>
        )}
        <TableCell>
          <div className="flex items-center gap-2">
            <div className={cn("w-2 h-2 rounded-full", account.isActive ? "bg-green-500" : "bg-muted")} />
            <span className="text-xs font-medium">{account.isActive ? "Active" : "Inactive"}</span>
          </div>
        </TableCell>
      </TableRow>
    );
  };

  const renderTree = (parentId: string | null = null, level: number = 0): React.ReactNode[] => {
    return accounts
      .filter(a => a.parentId === parentId)
      .sort((a, b) => a.code.localeCompare(b.code))
      .map(account => {
        const rows = [renderAccountRow(account, level)];
        if (expandedNodes.has(account.id)) {
          rows.push(...(renderTree(account.id, level + 1) as any));
        }
        return rows;
      })
      .flat();
  };

  return (
    <div className="space-y-8 max-w-7xl mx-auto pb-10">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h1 className="text-4xl font-extrabold tracking-tight text-foreground flex items-center gap-3">
            <div className="p-2 rounded-xl bg-primary/10">
              <BookOpen className="w-8 h-8 text-primary" />
            </div>
            Chart of Accounts
          </h1>
          <p className="text-muted-foreground mt-2 text-lg">
            Complete IPSAS-aligned general ledger for institutional transparency.
          </p>
        </div>
        <div className="flex flex-wrap gap-3">
          <Button 
            variant="outline" 
            onClick={handleSeedIPSAS} 
            disabled={isSeeding}
            className="shadow-sm hover:bg-primary/5 border-primary/20"
          >
            {isSeeding ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <RefreshCcw className="w-4 h-4 mr-2" />}
            Populate IPSAS COA
          </Button>
          <Dialog open={isAddingAccount} onOpenChange={setIsAddingAccount}>
            <DialogTrigger asChild>
              <Button className="shadow-md hover:shadow-lg transition-all">
                <Plus className="w-4 h-4 mr-2" />
                Add Account
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[500px]">
              <DialogHeader>
                <DialogTitle>Create New Account</DialogTitle>
                <DialogDescription>
                  Add a new general ledger account to your chart of accounts.
                </DialogDescription>
              </DialogHeader>
              <div className="grid gap-6 py-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="grid gap-2">
                    <Label htmlFor="code">Account Code</Label>
                    <Input
                      id="code"
                      value={newAccount.code}
                      onChange={(e) => setNewAccount({ ...newAccount, code: e.target.value })}
                      placeholder="e.g. 1000"
                      className="font-mono"
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="type">Account Type</Label>
                    <Select 
                      value={newAccount.type} 
                      onValueChange={(v) => setNewAccount({ ...newAccount, type: v })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="ASSET">Asset</SelectItem>
                        <SelectItem value="LIABILITY">Liability</SelectItem>
                        <SelectItem value="NET_ASSETS_EQUITY">Equity</SelectItem>
                        <SelectItem value="REVENUE">Revenue</SelectItem>
                        <SelectItem value="EXPENSE">Expense</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="name">Account Name</Label>
                  <Input
                    id="name"
                    value={newAccount.name}
                    onChange={(e) => setNewAccount({ ...newAccount, name: e.target.value })}
                    placeholder="e.g. Petty Cash"
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="parent">Parent Account (Optional)</Label>
                  <Select 
                    value={newAccount.parentId || "none"} 
                    onValueChange={(v) => setNewAccount({ ...newAccount, parentId: v === "none" ? null : v })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select parent..." />
                    </SelectTrigger>
                    <SelectContent className="max-h-[300px]">
                      <SelectItem value="none">None (Header Account)</SelectItem>
                      {accounts.map(a => (
                        <SelectItem key={a.id} value={a.id}>{a.code} - {a.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setIsAddingAccount(false)}>Cancel</Button>
                <Button onClick={handleAddAccount}>Create Account</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4">
        <Card className="bg-blue-50/30 border-blue-100 shadow-sm">
          <CardHeader className="pb-2">
            <CardDescription className="text-blue-600 font-medium flex items-center gap-2">
              <TrendingUp className="w-4 h-4" /> Assets
            </CardDescription>
            <CardTitle className="text-2xl">{stats.ASSET}</CardTitle>
          </CardHeader>
        </Card>
        <Card className="bg-amber-50/30 border-amber-100 shadow-sm">
          <CardHeader className="pb-2">
            <CardDescription className="text-amber-600 font-medium flex items-center gap-2">
              <TrendingDown className="w-4 h-4" /> Liabilities
            </CardDescription>
            <CardTitle className="text-2xl">{stats.LIABILITY}</CardTitle>
          </CardHeader>
        </Card>
        <Card className="bg-green-50/30 border-green-100 shadow-sm">
          <CardHeader className="pb-2">
            <CardDescription className="text-green-600 font-medium flex items-center gap-2">
              <ArrowUpRight className="w-4 h-4" /> Revenue
            </CardDescription>
            <CardTitle className="text-2xl">{stats.REVENUE}</CardTitle>
          </CardHeader>
        </Card>
        <Card className="bg-rose-50/30 border-rose-100 shadow-sm">
          <CardHeader className="pb-2">
            <CardDescription className="text-rose-600 font-medium flex items-center gap-2">
              <FileText className="w-4 h-4" /> Expenses
            </CardDescription>
            <CardTitle className="text-2xl">{stats.EXPENSE}</CardTitle>
          </CardHeader>
        </Card>
        <Card className="bg-slate-50/30 border-slate-100 shadow-sm col-span-2 md:col-span-1">
          <CardHeader className="pb-2">
            <CardDescription className="text-slate-600 font-medium flex items-center gap-2">
              <Wallet className="w-4 h-4" /> Equity
            </CardDescription>
            <CardTitle className="text-2xl">{stats.EQUITY}</CardTitle>
          </CardHeader>
        </Card>
      </div>

      <Card className="border-border shadow-md overflow-hidden">
        <CardHeader className="bg-muted/30 border-b">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <CardTitle className="text-xl">General Ledger Structure</CardTitle>
              <CardDescription>View and manage account hierarchy</CardDescription>
            </div>
            <div className="flex items-center gap-3">
              <div className="relative max-w-sm flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Filter by code or name..."
                  className="pl-10 h-10 w-[250px]"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>
              <div className="flex border rounded-lg p-1 bg-background shadow-sm">
                <Button
                  variant={viewMode === "table" ? "secondary" : "ghost"}
                  size="sm"
                  className="h-8 w-10 p-0"
                  onClick={() => setViewMode("table")}
                  title="Table View"
                >
                  <List className="h-4 w-4" />
                </Button>
                <Button
                  variant={viewMode === "tree" ? "secondary" : "ghost"}
                  size="sm"
                  className="h-8 w-10 p-0"
                  onClick={() => setViewMode("tree")}
                  title="Tree View"
                >
                  <LayoutGrid className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="flex flex-col items-center justify-center py-20 gap-4">
              <Loader2 className="animate-spin h-10 w-10 text-primary" />
              <p className="text-muted-foreground animate-pulse">Loading accounts ledger...</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader className="bg-muted/50">
                  <TableRow>
                    <TableHead className="w-[200px]">Code</TableHead>
                    <TableHead>Account Name</TableHead>
                    <TableHead className="w-[150px]">Type</TableHead>
                    {viewMode === "table" && <TableHead className="w-[150px]">Parent</TableHead>}
                    <TableHead className="w-[120px]">Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {viewMode === "table" ? (
                    filteredAccounts.length > 0 ? (
                      filteredAccounts.map(account => renderAccountRow(account))
                    ) : (
                      <TableRow>
                        <TableCell colSpan={5} className="h-32 text-center text-muted-foreground">
                          No accounts found matching "{search}"
                        </TableCell>
                      </TableRow>
                    )
                  ) : (
                    renderTree(null)
                  )}
                  {!isLoading && accounts.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={5} className="h-32 text-center text-muted-foreground">
                        No accounts created yet. Use 'Populate IPSAS COA' to start.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
