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
import { Plus, Search, Loader2, ArrowRightLeft, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/components/providers/auth-provider";

export default function CurrenciesPage() {
  const { token } = useAuth();
  const [currencies, setCurrencies] = useState<any[]>([]);
  const [exchangeRates, setExchangeRates] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [isAddingCurrency, setIsAddingCurrency] = useState(false);
  const [isAddingRate, setIsAddingRate] = useState(false);

  const [newCurrency, setNewCurrency] = useState({
    code: "",
    name: "",
    symbol: "",
    decimals: 2,
  });

  const [newRate, setNewRate] = useState({
    fromCurrencyCode: "",
    toCurrencyCode: "",
    rate: "",
    effectiveDate: new Date().toISOString().split("T")[0],
  });

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const [currRes, rateRes] = await Promise.all([
        fetch("/api/currencies", {
          headers: { Authorization: `Bearer ${token}` },
        }),
        fetch("/api/currencies/exchange-rates", {
          headers: { Authorization: `Bearer ${token}` },
        }),
      ]);

      const currData = await currRes.json();
      const rateData = await rateRes.json();

      setCurrencies(Array.isArray(currData) ? currData : []);
      setExchangeRates(Array.isArray(rateData) ? rateData : []);
    } catch (error) {
      toast.error("Failed to fetch data");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (token) fetchData();
  }, [token]);

  const handleAddCurrency = async () => {
    try {
      const res = await fetch("/api/currencies", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(newCurrency),
      });

      if (!res.ok) {
        const result = await res.json();
        throw new Error(result.error || "Failed to add currency");
      }

      toast.success("Currency added successfully");
      setIsAddingCurrency(false);
      fetchData();
    } catch (error: any) {
      toast.error(error.message || "Error adding currency");
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

      if (!res.ok) {
        const result = await res.json();
        throw new Error(result.error || "Failed to add exchange rate");
      }

      toast.success("Exchange rate added successfully");
      setIsAddingRate(false);
      fetchData();
    } catch (error: any) {
      toast.error(error.message || "Error adding exchange rate");
    }
  };

  const filteredCurrencies = currencies.filter((c) =>
    `${c.code} ${c.name}`.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Currencies & Exchange Rates</h1>
          <p className="text-muted-foreground">
            Manage system currencies and maintain exchange rate history.
          </p>
        </div>
        <div className="flex gap-2">
          <Dialog open={isAddingCurrency} onOpenChange={setIsAddingCurrency}>
            <DialogTrigger asChild>
              <Button variant="outline">
                <Plus className="w-4 h-4 mr-2" />
                Add Currency
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Add New Currency</DialogTitle>
                <DialogDescription>
                  Define a new currency for use in the system.
                </DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="grid gap-2">
                  <Label htmlFor="code">Currency Code (e.g. USD, ZWG)</Label>
                  <Input
                    id="code"
                    value={newCurrency.code}
                    onChange={(e) => setNewCurrency({ ...newCurrency, code: e.target.value.toUpperCase() })}
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="name">Currency Name</Label>
                  <Input
                    id="name"
                    value={newCurrency.name}
                    onChange={(e) => setNewCurrency({ ...newCurrency, name: e.target.value })}
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="symbol">Symbol</Label>
                  <Input
                    id="symbol"
                    value={newCurrency.symbol}
                    onChange={(e) => setNewCurrency({ ...newCurrency, symbol: e.target.value })}
                  />
                </div>
              </div>
              <DialogFooter>
                <Button onClick={handleAddCurrency}>Save Currency</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          <Dialog open={isAddingRate} onOpenChange={setIsAddingRate}>
            <DialogTrigger asChild>
              <Button>
                <ArrowRightLeft className="w-4 h-4 mr-2" />
                New Rate
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
                  <Label>Rate</Label>
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

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="md:col-span-1">
          <CardHeader>
            <CardTitle>Supported Currencies</CardTitle>
            <div className="relative mt-2">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search..."
                className="pl-8"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex justify-center py-4"><Loader2 className="animate-spin" /></div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Code</TableHead>
                    <TableHead>Name</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredCurrencies.map((c) => (
                    <TableRow key={c.code}>
                      <TableCell className="font-bold">{c.code}</TableCell>
                      <TableCell>{c.name}</TableCell>
                      <TableCell>
                        <Badge variant={c.isActive ? "success" : "secondary"}>
                          {c.isActive ? "Active" : "Inactive"}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle>Recent Exchange Rates</CardTitle>
            <CardDescription>Historical exchange rates used for conversions.</CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex justify-center py-4"><Loader2 className="animate-spin" /></div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Pair</TableHead>
                    <TableHead>Rate</TableHead>
                    <TableHead>Effective Date</TableHead>
                    <TableHead>Source</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {exchangeRates.map((r) => (
                    <TableRow key={r.id}>
                      <TableCell>
                        {r.fromCurrencyCode} / {r.toCurrencyCode}
                      </TableCell>
                      <TableCell className="font-mono">{r.rate}</TableCell>
                      <TableCell>{new Date(r.effectiveDate).toLocaleDateString()}</TableCell>
                      <TableCell>
                        <Badge variant="outline">{r.source}</Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                  {exchangeRates.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={4} className="text-center py-4 text-muted-foreground">
                        No exchange rates recorded yet.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
