import type { Metadata } from "next";
import "./globals.css";
import { VisualEditsMessenger } from "orchids-visual-edits";
import { Toaster } from "@/components/ui/sonner";
import { AuthProvider } from "@/components/providers/auth-provider";

export const metadata: Metadata = {
  title: "IPSAS Accounting System",
  description: "IPSAS-aligned accounting system for Zimbabwe schools",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased">
        <AuthProvider>
          {children}
          <Toaster />
          <VisualEditsMessenger />
        </AuthProvider>
      </body>
    </html>
  );
}
