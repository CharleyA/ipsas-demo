import { Suspense } from "react";
import { Shell } from "@/components/layout/shell";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <Shell>
      <Suspense fallback={<div className="p-6">Loading...</div>}>
        {children}
      </Suspense>
    </Shell>
  );
}
