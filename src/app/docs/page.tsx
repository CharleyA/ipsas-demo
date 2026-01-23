import Link from "next/link";
import { BookOpen, ChevronLeft } from "lucide-react";
import { DocumentationService } from "@/lib/services";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

type ContentBlock =
  | { type: "heading"; level: 2 | 3; text: string }
  | { type: "paragraph"; text: string }
  | { type: "list"; items: string[] };

function parseDocumentation(content: string) {
  const blocks: ContentBlock[] = [];
  const lines = content.split("\n");
  let paragraph: string[] = [];
  let listItems: string[] = [];

  const flushParagraph = () => {
    if (paragraph.length) {
      blocks.push({ type: "paragraph", text: paragraph.join(" ") });
      paragraph = [];
    }
  };

  const flushList = () => {
    if (listItems.length) {
      blocks.push({ type: "list", items: [...listItems] });
      listItems = [];
    }
  };

  lines.forEach((line) => {
    const trimmed = line.trim();

    if (!trimmed) {
      flushParagraph();
      flushList();
      return;
    }

    if (trimmed.startsWith("## ")) {
      flushParagraph();
      flushList();
      blocks.push({ type: "heading", level: 2, text: trimmed.slice(3) });
      return;
    }

    if (trimmed.startsWith("### ")) {
      flushParagraph();
      flushList();
      blocks.push({ type: "heading", level: 3, text: trimmed.slice(4) });
      return;
    }

    if (trimmed.startsWith("- ")) {
      flushParagraph();
      listItems.push(trimmed.slice(2));
      return;
    }

    paragraph.push(trimmed);
  });

  flushParagraph();
  flushList();

  return blocks;
}

export default async function DocumentationPage() {
  const page = await DocumentationService.getBySlug("system");
  const contentBlocks = page?.content ? parseDocumentation(page.content) : [];

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-card/60 backdrop-blur-sm">
        <div className="mx-auto flex w-full max-w-5xl items-center justify-between px-4 py-4">
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-primary/10 p-2">
              <BookOpen className="h-5 w-5 text-primary" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Documentation</p>
              <h1 className="text-lg font-semibold text-foreground">IPSAS Accounting System</h1>
            </div>
          </div>
          <Button variant="ghost" size="sm" asChild>
            <Link href="/">
              <ChevronLeft className="mr-2 h-4 w-4" />
              Back to Home
            </Link>
          </Button>
        </div>
      </header>

      <main className="mx-auto w-full max-w-5xl px-4 py-10">
        {!page || !page.isPublished ? (
          <Card>
            <CardHeader>
              <CardTitle>Documentation in progress</CardTitle>
              <CardDescription>
                The documentation is being prepared by the administrators. Please check back soon.
              </CardDescription>
            </CardHeader>
          </Card>
        ) : (
          <div className="space-y-8">
            <div className="space-y-3">
              <h2 className="text-3xl font-bold tracking-tight">{page.title}</h2>
              {page.summary ? (
                <p className="text-muted-foreground">{page.summary}</p>
              ) : null}
              <p className="text-xs text-muted-foreground">
                Last updated {new Date(page.updatedAt).toLocaleDateString()}
              </p>
            </div>

            <div className="rounded-lg border border-border bg-card/50 p-4">
              <h3 className="text-sm font-semibold text-foreground">Floating Assistant</h3>
              <p className="text-sm text-muted-foreground">
                Use the chat button in the bottom-right corner to ask questions about the documentation.
                The assistant is available on documentation pages and authenticated areas, and stays hidden
                on the public homepage. It provides read-only insights and draft-only guidance.
              </p>
            </div>

            <Card>
              <CardContent className="space-y-5 py-8">
                {contentBlocks.map((block, index) => {
                  if (block.type === "heading") {
                    const HeadingTag = block.level === 2 ? "h3" : "h4";
                    const headingClass =
                      block.level === 2
                        ? "text-xl font-semibold text-foreground"
                        : "text-lg font-semibold text-foreground";
                    return (
                      <HeadingTag key={`${block.text}-${index}`} className={headingClass}>
                        {block.text}
                      </HeadingTag>
                    );
                  }

                  if (block.type === "list") {
                    return (
                      <ul
                        key={`list-${index}`}
                        className="list-disc space-y-2 pl-5 text-sm text-muted-foreground"
                      >
                        {block.items.map((item) => (
                          <li key={item}>{item}</li>
                        ))}
                      </ul>
                    );
                  }

                  return (
                    <p key={`para-${index}`} className="text-sm text-muted-foreground">
                      {block.text}
                    </p>
                  );
                })}
              </CardContent>
            </Card>
          </div>
        )}
      </main>
    </div>
  );
}
