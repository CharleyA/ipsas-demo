const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// This script simulates the POST request to /api/admin/seed-demo
// but runs it directly via services to bypass HTTP/Auth middleware

async function main() {
  const organisationId = "org-demo";
  const actorId = "cmk6337cb002obkven0vwnu1k";

  console.log(`Starting seed for org: ${organisationId} with actor: ${actorId}`);

  // We need to import the services. Since this is a JS script in a TS project,
  // we'll use the compiled versions if they exist or use dynamic import with ts-node if needed.
  // Actually, it's easier to just use the SQL tool to check the results AFTER the user runs it in the UI,
  // OR I can try to run it via a temporary API route that doesn't have auth.

  // Let's check if we can just use the SQL tool to verify current state first.
  const stats = await prisma.$queryRaw`
    SELECT 
      (SELECT COUNT(*) FROM students WHERE "organisationId" = ${organisationId}) as students,
      (SELECT COUNT(*) FROM vouchers WHERE "organisationId" = ${organisationId}) as vouchers,
      (SELECT COUNT(*) FROM gl_headers WHERE "organisationId" = ${organisationId}) as gl_headers,
      (SELECT COUNT(*) FROM gl_entries WHERE "glHeaderId" IN (SELECT id FROM gl_headers WHERE "organisationId" = ${organisationId})) as gl_entries
  `;
  console.log('Current Stats:', stats);
}

main().catch(console.error);
