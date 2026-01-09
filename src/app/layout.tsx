import type { Metadata } from "next";
import "./globals.css";
import { VisualEditsMessenger } from "orchids-visual-edits";
import { Toaster } from "@/components/ui/sonner";
import { AuthProvider } from "@/components/providers/auth-provider";
import { ThemeProvider } from "@/components/providers/theme-provider";
import Script from "next/script";

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
    <html lang="en" suppressHydrationWarning>
      <body className="antialiased">
        <Script
          id="orchids-browser-logs"
          src="https://slelguoygbfzlpylpxfs.supabase.co/storage/v1/object/public/scripts/orchids-browser-logs.js"
          strategy="afterInteractive"
          data-orchids-project-id="8aa79617-250f-4209-9bb8-c63253726aa0"
        />
        <ThemeProvider>
          <AuthProvider>
            {children}
            <Toaster />
            <VisualEditsMessenger />
          </AuthProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
