"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/components/providers/auth-provider";

export default function BudgetsPage() {
  const { token } = useAuth();
  const [budgets, setBudgets] = useState<any[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!token) return;
    fetch("/api/budgets", {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((r) => r.json())
      .then((data) => setBudgets(Array.isArray(data) ? data : []))
      .catch((e) => setError(e.message));
  }, [token]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Budgets</h1>
        <p className="text-sm text-muted-foreground">Create, review and approve budgets</p>
      </div>

      {error && <div className="text-sm text-red-500">{error}</div>}

      <div className="rounded-md border">
        <table className="w-full text-sm">
          <thead className="bg-muted/50">
            <tr className="text-left">
              <th className="p-3">Fiscal Period</th>
              <th className="p-3">Status</th>
              <th className="p-3">Version</th>
              <th className="p-3">Lines</th>
              <th className="p-3">Created</th>
            </tr>
          </thead>
          <tbody>
            {budgets.map((b) => (
              <tr key={b.id} className="border-t">
                <td className="p-3">{b.fiscalPeriod?.name || b.fiscalPeriodId}</td>
                <td className="p-3">{b.status}</td>
                <td className="p-3">v{b.version}</td>
                <td className="p-3">{b.lines?.length ?? 0}</td>
                <td className="p-3">{new Date(b.createdAt).toLocaleDateString()}</td>
              </tr>
            ))}
            {budgets.length === 0 && (
              <tr>
                <td className="p-3" colSpan={5}>No budgets yet.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
