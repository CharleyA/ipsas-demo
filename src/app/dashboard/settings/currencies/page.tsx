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
  Plus, 
  Search, 
  Loader2, 
  ArrowRightLeft, 
  Check, 
  Star,
  StarOff,
  MoreVertical,
  Settings2,
  RefreshCcw
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { toast } from "sonner";
import { useAuth } from "@/components/providers/auth-provider";

export default function CurrenciesPage() {
  const { token, user } = useAuth();
  const [systemCurrencies, setSystemCurrencies] = useState<any[]>([]);
  const [orgCurrencies, setOrgCurrencies] = useState<any[]>([]);
  const [exchangeRates, setExchangeRates] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [isAddingRate, setIsAddingRate] = useState(false);
  const [isConfiguring, setIsConfiguring] = useState(false);
  const [selectedCurrency, setSelectedCurrency] = useState<any>(null);

  const [newRate, setNewRate] = useState({
    fromCurrencyCode: "",
    toCurrencyCode: "",
    rate: "",
    effectiveDate: new Date().toISOString().split("T")[0],
  });

  const [configData, setConfigData] = useState({
    name: "",
    symbol: "",
    decimals: 2,
  });

  const fetchData = async () => {
    if (!token || !user?.organisationId) return;
    setIsLoading(true);
    try {
      const [sysRes, orgRes, rateRes] = await Promise.all([
        fetch("/api/currencies?activeOnly=false", {
          headers: { Authorization: `Bearer ${token}` },
        }),
        fetch(`/api/organisations/${user.organisationId}/currencies`, {
          headers: { Authorization: `Bearer ${token}` },
        }),
        fetch("/api/currencies/exchange-rates", {
          headers: { Authorization: `Bearer ${token}` },
        }),
      ]);

      const sysData = await sysRes.json();
      const orgData = await orgRes.json();
      const rateData = await rateRes.json();

      setSystemCurrencies(Array.isArray(sysData.data) ? sysData.data : (Array.isArray(sysData) ? sysData : []));
      setOrgCurrencies(Array.isArray(orgData.data) ? orgData.data : (Array.isArray(orgData) ? orgData : []));
      setExchangeRates(Array.isArray(rateData.data) ? rateData.data : (Array.isArray(rateData) ? rateData : []));
    } catch (error) {
      toast.error("Failed to fetch currency data");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (token && user?.organisationId) fetchData();
  }, [token, user?.organisationId]);

  const handleEnableCurrency = async (currencyCode: string) => {
    try {
      const res = await fetch(`/api/organisations/${user?.organisationId}/currencies`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ currencyCode, isBaseCurrency: false }),
      });

      if (!res.ok) throw new Error("Failed to enable currency");
      toast.success(`${currencyCode} enabled for your organisation`);
      fetchData();
    } catch (error: any) {
      toast.error(error.message);
    }
  };

  const handleDisableCurrency = async (currencyCode: string) => {
    try {
      const res = await fetch(`/api/organisations/${user?.organisationId}/currencies/${currencyCode}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ isActive: false }),
      });

      if (!res.ok) throw new Error("Failed to disable currency");
      toast.success(`${currencyCode} disabled for your organisation`);
      fetchData();
    } catch (error: any) {
      toast.error(error.message);
    }
  };

  const handleSetBaseCurrency = async (currencyCode: string) => {
    try {
      const res = await fetch(`/api/organisations/${user?.organisationId}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ baseCurrency: currencyCode }),
      });

      if (!res.ok) throw new Error("Failed to set base currency");
      toast.success(`${currencyCode} is now your base currency`);
      fetchData();
    } catch (error: any) {
      toast.error(error.message);
    }
  };

  const handleUpdateCurrency = async () => {
    if (!selectedCurrency) return;
    try {
      const res = await fetch(`/api/currencies/${selectedCurrency.id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(configData),
      });

      if (!res.ok) throw new Error("Failed to update currency");
      toast.success("Currency updated successfully");
      setIsConfiguring(false);
      fetchData();
    } catch (error: any) {
      toast.error(error.message);
    }
  };

  const handleDeleteCurrency = async (id: string) => {
    if (!confirm("Are you sure you want to delete this currency? This action cannot be undone and will fail if the currency is in use.")) return;
    try {
      const res = await fetch(`/api/currencies/${id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to delete currency");
      }
      toast.success("Currency deleted");
      fetchData();
    } catch (error: any) {
      toast.error(error.message);
    }
  };

  const handleAddRate = async () => {
    try {
      const res = await fetch("/api/currencies/exchange-rates", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          ...newRate,
          rate: parseFloat(newRate.rate),
        }),
      });

      if (!res.ok) throw new Error("Failed to add exchange rate");

      toast.success("Exchange rate added successfully");
      setIsAddingRate(false);
      fetchData();
    } catch (error: any) {
      toast.error(error.message);
    }
  };

  const isEnabled = (code: string) => orgCurrencies.some(oc => oc.currencyCode === code);
  const isBase = (code: string) => orgCurrencies.find(oc => oc.currencyCode === code)?.isBaseCurrency;

  const filteredCurrencies = systemCurrencies.filter((c) =>
    `${c.code} ${c.name}`.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Currencies & Exchange Rates</h1>
          <p className="text-muted-foreground">
            Manage your organisation's currencies and exchange rates.
          </p>
        </div>
        <div className="flex gap-2">
          <Dialog open={isAddingRate} onOpenChange={setIsAddingRate}>
            <DialogTrigger asChild>
              <Button>
                <ArrowRightLeft className="w-4 h-4 mr-2" />
                New Exchange Rate
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Add Exchange Rate</DialogTitle>
                <DialogDescription>
                  Set a new exchange rate between two currencies.
                </DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="grid gap-2">
                    <Label>From Currency</Label>
                    <Input
                      placeholder="e.g. USD"
                      value={newRate.fromCurrencyCode}
                      onChange={(e) => setNewRate({ ...newRate, fromCurrencyCode: e.target.value.toUpperCase() })}
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label>To Currency</Label>
                    <Input
                      placeholder="e.g. ZWG"
                      value={newRate.toCurrencyCode}
                      onChange={(e) => setNewRate({ ...newRate, toCurrencyCode: e.target.value.toUpperCase() })}
                    />
                  </div>
                </div>
                <div className="grid gap-2">
                  <Label>Rate (1 Unit of From = X Units of To)</Label>
                  <Input
                    type="number"
                    step="0.000001"
                    value={newRate.rate}
                    onChange={(e) => setNewRate({ ...newRate, rate: e.target.value })}
                  />
                </div>
                <div className="grid gap-2">
                  <Label>Effective Date</Label>
                  <Input
                    type="date"
                    value={newRate.effectiveDate}
                    onChange={(e) => setNewRate({ ...newRate, effectiveDate: e.target.value })}
                  />
                </div>
              </div>
              <DialogFooter>
                <Button onClick={handleAddRate}>Save Rate</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <Dialog open={isConfiguring} onOpenChange={setIsConfiguring}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Configure Currency: {selectedCurrency?.code}</DialogTitle>
            <DialogDescription>
              Update global currency definitions. These changes affect all organisations.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label>Currency Name</Label>
              <Input
                value={configData.name}
                onChange={(e) => setConfigData({ ...configData, name: e.target.value })}
              />
            </div>
            <div className="grid gap-2">
              <Label>Symbol</Label>
              <Input
                value={configData.symbol}
                onChange={(e) => setConfigData({ ...configData, symbol: e.target.value })}
              />
            </div>
            <div className="grid gap-2">
              <Label>Decimal Places</Label>
              <Input
                type="number"
                value={configData.decimals}
                onChange={(e) => setConfigData({ ...configData, decimals: parseInt(e.target.value) })}
              />
            </div>
          </div>
          <DialogFooter className="flex justify-between sm:justify-between">
            <Button variant="destructive" onClick={() => {
              setIsConfiguring(false);
              handleDeleteCurrency(selectedCurrency.id);
            }}>
              Delete Currency
            </Button>
            <Button onClick={handleUpdateCurrency}>Save Changes</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-2">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Organisation Currencies</CardTitle>
                <CardDescription>Currencies active for your school.</CardDescription>
              </div>
              <div className="relative w-64">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search currencies..."
                  className="pl-8"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex justify-center py-8"><Loader2 className="animate-spin h-8 w-8 text-primary" /></div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Currency</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredCurrencies.map((c) => (
                    <TableRow key={c.code} className={isBase(c.code) ? "bg-muted/30" : ""}>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <span className="font-bold w-12">{c.code}</span>
                          <span className="text-sm text-muted-foreground">{c.name}</span>
                          {isBase(c.code) && (
                            <Badge variant="secondary" className="ml-2 gap-1">
                              <Star className="w-3 h-3 fill-primary text-primary" />
                              Base
                            </Badge>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        {isEnabled(c.code) ? (
                          <Badge variant="success" className="gap-1">
                            <Check className="w-3 h-3" /> Enabled
                          </Badge>
                        ) : (
                          <Badge variant="outline">Disabled</Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon">
                              <MoreVertical className="w-4 h-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuLabel>Actions</DropdownMenuLabel>
                            {!isEnabled(c.code) ? (
                              <DropdownMenuItem onClick={() => handleEnableCurrency(c.code)}>
                                <Check className="w-4 h-4 mr-2" />
                                Enable for Org
                              </DropdownMenuItem>
                            ) : (
                              !isBase(c.code) && (
                                <DropdownMenuItem onClick={() => handleDisableCurrency(c.code)}>
                                  <StarOff className="w-4 h-4 mr-2" />
                                  Disable for Org
                                </DropdownMenuItem>
                              )
                            )}
                            {isEnabled(c.code) && !isBase(c.code) && (
                              <DropdownMenuItem onClick={() => handleSetBaseCurrency(c.code)}>
                                <Star className="w-4 h-4 mr-2" />
                                Set as Base
                              </DropdownMenuItem>
                            )}
                            <DropdownMenuSeparator />
                            <DropdownMenuItem onClick={() => {
                              setSelectedCurrency(c);
                              setConfigData({
                                name: c.name,
                                symbol: c.symbol,
                                decimals: c.decimals,
                              });
                              setIsConfiguring(true);
                            }}>
                              <Settings2 className="w-4 h-4 mr-2" />
                              Configure
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Recent Exchange Rates</CardTitle>
            <CardDescription>Last 10 rates recorded.</CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex justify-center py-4"><Loader2 className="animate-spin" /></div>
            ) : (
              <div className="space-y-4">
                {exchangeRates.slice(0, 10).map((r) => (
                  <div key={r.id} className="flex items-center justify-between p-2 border rounded-lg text-sm">
                    <div className="flex flex-col">
                      <span className="font-medium">{r.fromCurrencyCode} → {r.toCurrencyCode}</span>
                      <span className="text-xs text-muted-foreground">{new Date(r.effectiveDate).toLocaleDateString()}</span>
                    </div>
                    <div className="text-right">
                      <div className="font-mono font-bold">{Number(r.rate).toFixed(4)}</div>
                      <div className="text-[10px] text-muted-foreground uppercase">{r.source || 'Manual'}</div>
                    </div>
                  </div>
                ))}
                {exchangeRates.length === 0 && (
                  <p className="text-center text-sm text-muted-foreground py-4">No exchange rates found.</p>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
