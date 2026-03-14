"use client";

import dynamic from "next/dynamic";
import { Loader2 } from "lucide-react";

export const runtime = "edge";

const NewARInvoiceClient = dynamic(
  () => import("./client"),
  { 
    ssr: false,
    loading: () => (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="w-8 h-8 animate-spin" />
      </div>
    )
  }
);

export default function NewARInvoicePage() {
  return <NewARInvoiceClient />;
}
