import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import pg from "pg";

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter: new PrismaPg(pool) });

(async()=>{
  try{
    const rows = await prisma.$queryRaw`select count(*)::int as c from documentation_pages`;
    console.log(rows);
    const u = await prisma.user.findUnique({ where: { email: "admin@school.ac.zw" } });
    console.log(u?.email);
  } catch (e) {
    console.error(e);
  } finally {
    await prisma.$disconnect();
  }
})();
