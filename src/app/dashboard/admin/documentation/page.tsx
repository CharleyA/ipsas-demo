"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { BookOpen, ExternalLink, Loader2, ShieldAlert } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { useAuth } from "@/components/providers/auth-provider";

export default function DocumentationAdminPage() {
  const { user, token } = useAuth();
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<string | null>(null);
  const [form, setForm] = useState({
    title: "",
    summary: "",
    content: "",
    isPublished: true,
  });

  if (user?.role !== "ADMIN") {
    return (
      <div className="flex flex-col items-center justify-center gap-4 py-16">
        <ShieldAlert className="h-12 w-12 text-destructive" />
        <h1 className="text-2xl font-bold">Access Denied</h1>
        <p className="text-muted-foreground">Only administrators can edit documentation.</p>
      </div>
    );
  }

  useEffect(() => {
    async function fetchDocumentation() {
      if (!token) return;
      setIsLoading(true);
      try {
        const response = await fetch("/api/docs/system", {
          headers: { Authorization: `Bearer ${token}` },
        });
        const result = await response.json();

        if (result.success) {
          setForm({
            title: result.data.title ?? "",
            summary: result.data.summary ?? "",
            content: result.data.content ?? "",
            isPublished: result.data.isPublished ?? true,
          });
          setLastUpdated(result.data.updatedAt ?? null);
        } else {
          toast.error(result.error || "Failed to load documentation");
        }
      } catch (error) {
        toast.error("Failed to load documentation");
      } finally {
        setIsLoading(false);
      }
    }

    fetchDocumentation();
  }, [token]);

  const handleSave = async () => {
    if (!token) return;

    setIsSaving(true);
    try {
      const response = await fetch("/api/docs/system", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          title: form.title,
          summary: form.summary || null,
          content: form.content,
          isPublished: form.isPublished,
        }),
      });

      const result = await response.json();

      if (result.success) {
        setLastUpdated(result.data.updatedAt ?? null);
        toast.success("Documentation updated");
      } else {
        toast.error(result.error || "Failed to save documentation");
      }
    } catch (error) {
      toast.error("Failed to save documentation");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="mx-auto w-full max-w-5xl space-y-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Documentation</h1>
          <p className="text-muted-foreground">
            Maintain the public documentation shown on the landing page.
          </p>
        </div>
        <Button variant="outline" asChild>
          <Link href="/docs" target="_blank" rel="noreferrer">
            <ExternalLink className="mr-2 h-4 w-4" />
            View Documentation
          </Link>
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BookOpen className="h-5 w-5 text-primary" />
            Documentation Content
          </CardTitle>
          <CardDescription>
            Update the title, summary, and body content. Use "##" headings and "-" bullets to
            structure the page.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : (
            <div className="space-y-5">
              <div className="grid gap-2">
                <Label htmlFor="doc-title">Title</Label>
                <Input
                  id="doc-title"
                  value={form.title}
                  onChange={(event) => setForm((prev) => ({ ...prev, title: event.target.value }))}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="doc-summary">Summary</Label>
                <Input
                  id="doc-summary"
                  value={form.summary}
                  onChange={(event) =>
                    setForm((prev) => ({ ...prev, summary: event.target.value }))
                  }
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="doc-content">Documentation Body</Label>
                <Textarea
                  id="doc-content"
                  rows={24}
                  value={form.content}
                  onChange={(event) =>
                    setForm((prev) => ({ ...prev, content: event.target.value }))
                  }
                />
              </div>
              <div className="flex flex-col gap-3 rounded-lg border border-border/60 bg-muted/20 p-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="text-sm font-medium">Published</p>
                  <p className="text-xs text-muted-foreground">
                    Toggle to show or hide the documentation page.
                  </p>
                </div>
                <Switch
                  checked={form.isPublished}
                  onCheckedChange={(checked) =>
                    setForm((prev) => ({ ...prev, isPublished: checked }))
                  }
                />
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <div className="flex flex-col items-start justify-between gap-4 md:flex-row md:items-center">
        <div className="text-xs text-muted-foreground">
          {lastUpdated ? `Last updated ${new Date(lastUpdated).toLocaleString()}` : ""}
        </div>
        <Button onClick={handleSave} disabled={isSaving || isLoading}>
          {isSaving ? "Saving..." : "Save Documentation"}
        </Button>
      </div>
    </div>
  );
}
