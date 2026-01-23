import prisma from "@/lib/db";

export type DocumentationPageRecord = {
  id: string;
  slug: string;
  title: string;
  summary: string | null;
  content: string;
  isPublished: boolean;
  createdAt: Date;
  updatedAt: Date;
  updatedById: string | null;
};

export class DocumentationService {
  static async getBySlug(slug: string) {
    const records = await prisma.$queryRaw<DocumentationPageRecord[]>`
      select
        id,
        slug,
        title,
        summary,
        content,
        is_published as "isPublished",
        created_at as "createdAt",
        updated_at as "updatedAt",
        updated_by_id as "updatedById"
      from documentation_pages
      where slug = ${slug}
      limit 1
    `;

    return records[0] ?? null;
  }

  static async listPublished() {
    return prisma.$queryRaw<DocumentationPageRecord[]>`
      select
        id,
        slug,
        title,
        summary,
        content,
        is_published as "isPublished",
        created_at as "createdAt",
        updated_at as "updatedAt",
        updated_by_id as "updatedById"
      from documentation_pages
      where is_published = true
      order by updated_at desc
    `;
  }

  static async upsert(
    slug: string,
    data: {
      title: string;
      summary?: string | null;
      content: string;
      isPublished?: boolean;
    },
    actorId?: string | null
  ) {
    const isPublished = data.isPublished ?? true;

    await prisma.$executeRaw`
      insert into documentation_pages (
        id,
        slug,
        title,
        summary,
        content,
        is_published,
        created_at,
        updated_at,
        updated_by_id
      ) values (
        md5(random()::text || clock_timestamp()::text),
        ${slug},
        ${data.title},
        ${data.summary ?? null},
        ${data.content},
        ${isPublished},
        now(),
        now(),
        ${actorId ?? null}
      )
      on conflict (slug) do update set
        title = excluded.title,
        summary = excluded.summary,
        content = excluded.content,
        is_published = excluded.is_published,
        updated_at = now(),
        updated_by_id = ${actorId ?? null}
    `;

    return DocumentationService.getBySlug(slug);
  }
}
