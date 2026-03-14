import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import pg from "pg";

const connectionString = process.env.DATABASE_URL;
const pool = new pg.Pool({ connectionString });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter, log: ["error"] });

(async()=>{
  try{
    const u = await prisma.user.findUnique({
      where: { email: "admin@school.ac.zw" },
      include: { organisations: { where: { isActive: true }, include: { organisation: true }, take: 1 } },
    });
    console.log(u);
  }catch(e){
    console.error(e);
  } finally {
    await prisma.$disconnect();
  }
})();
