import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient({ log: [] });

const ORG_ID = "cmnmcjixt0002ybwo37kdxarf";

async function getOrCreateAccount(code, name, type) {
  let acc = await prisma.account.findFirst({ where: { organisationId: ORG_ID, code } });
  if (!acc) {
    acc = await prisma.account.create({
      data: { organisationId: ORG_ID, code, name, type, isSystemAccount: true },
    });
  }
  return acc;
}

async function main() {
  const assetAcc    = await getOrCreateAccount("1200", "Fixed Assets", "ASSET");
  const depnExpAcc  = await getOrCreateAccount("5900", "Depreciation Expense", "EXPENSE");
  const accumDepAcc = await getOrCreateAccount("1290", "Accumulated Depreciation", "ASSET");
  console.log("GL accounts ready");

  const categoryDefs = [
    { code: "BLDG",  name: "Buildings & Structures",    months: 480, residual: 5  },
    { code: "FURN",  name: "Furniture & Fittings",      months: 120, residual: 10 },
    { code: "COMP",  name: "Computers & ICT Equipment", months: 36,  residual: 5  },
    { code: "VEHI",  name: "Vehicles & Transport",      months: 60,  residual: 15 },
    { code: "EQUIP", name: "Plant & Equipment",         months: 84,  residual: 10 },
  ];

  const catMap = {};
  for (const def of categoryDefs) {
    const existing = await prisma.assetCategory.findFirst({ where: { organisationId: ORG_ID, code: def.code } });
    const cat = existing ?? await prisma.assetCategory.create({
      data: {
        organisationId: ORG_ID,
        code: def.code,
        name: def.name,
        assetAccountId: assetAcc.id,
        depreciationAccountId: depnExpAcc.id,
        accumulatedDepAccountId: accumDepAcc.id,
        depreciationMethod: "STRAIGHT_LINE",
        usefulLifeMonths: def.months,
        residualValuePercent: def.residual,
      },
    });
    catMap[def.code] = cat.id;
    console.log(`Category: ${def.code} - ${existing ? "exists" : "created"}`);
  }

  const assets = [
    { no: "BLDG-001",  desc: "Main Administration Block",        cat: "BLDG",  cost: 450000, nbv: 380000, loc: "Main Campus",      cust: "Headmaster",            serial: null,               date: "2018-01-15" },
    { no: "BLDG-002",  desc: "Science Laboratory Block",         cat: "BLDG",  cost: 220000, nbv: 195000, loc: "Main Campus",      cust: "Headmaster",            serial: null,               date: "2020-03-10" },
    { no: "BLDG-003",  desc: "Library & Resource Centre",        cat: "BLDG",  cost: 180000, nbv: 162000, loc: "Main Campus",      cust: "Librarian",             serial: null,               date: "2019-06-01" },
    { no: "FURN-001",  desc: "Student Desk Set (Classroom A)",   cat: "FURN",  cost: 4500,   nbv: 3200,   loc: "Classroom A",      cust: "Form 1 Teacher",        serial: null,               date: "2021-02-01" },
    { no: "FURN-002",  desc: "Staff Room Furniture Set",         cat: "FURN",  cost: 8200,   nbv: 6100,   loc: "Staff Room",       cust: "Deputy Head",           serial: null,               date: "2020-08-15" },
    { no: "FURN-003",  desc: "Headmaster Office Suite",          cat: "FURN",  cost: 12000,  nbv: 9500,   loc: "Admin Block",      cust: "Headmaster",            serial: null,               date: "2021-01-10" },
    { no: "FURN-004",  desc: "Student Desk Set (Classroom B)",   cat: "FURN",  cost: 4500,   nbv: 2900,   loc: "Classroom B",      cust: "Form 2 Teacher",        serial: null,               date: "2020-02-01" },
    { no: "COMP-001",  desc: "HP Desktop - Administration",      cat: "COMP",  cost: 1200,   nbv: 600,    loc: "Admin Office",     cust: "Bursar",                serial: "HP2021-ADM-001",   date: "2021-07-01" },
    { no: "COMP-002",  desc: "Dell Laptop - Headmaster",         cat: "COMP",  cost: 1800,   nbv: 900,    loc: "Admin Block",      cust: "Headmaster",            serial: "DELL-HM-2022",     date: "2022-01-15" },
    { no: "COMP-003",  desc: "Epson Projector - Hall",           cat: "COMP",  cost: 950,    nbv: 380,    loc: "Assembly Hall",    cust: "Deputy Head",           serial: "EPSON-HALL-01",    date: "2020-11-01" },
    { no: "COMP-004",  desc: "HP Laser Printer - Admin",         cat: "COMP",  cost: 650,    nbv: 220,    loc: "Admin Office",     cust: "Clerk",                 serial: "HPLJ-ADM-2020",    date: "2020-05-01" },
    { no: "COMP-005",  desc: "Computer Lab Set (20 units)",      cat: "COMP",  cost: 22000,  nbv: 11000,  loc: "Computer Lab",     cust: "ICT Teacher",           serial: "COMPLAB-2022",     date: "2022-03-01" },
    { no: "VEHI-001",  desc: "Toyota HiAce - School Bus",        cat: "VEHI",  cost: 28000,  nbv: 16800,  loc: "School Garage",    cust: "Transport Coordinator", serial: "TYT-HIL-2020-001", date: "2020-09-01" },
    { no: "VEHI-002",  desc: "Isuzu D-Max - Staff Vehicle",      cat: "VEHI",  cost: 35000,  nbv: 22750,  loc: "School Garage",    cust: "Headmaster",            serial: "ISZ-DM-2021-002",  date: "2021-05-15" },
    { no: "VEHI-003",  desc: "Toyota HiAce - 2nd School Bus",    cat: "VEHI",  cost: 32000,  nbv: 24000,  loc: "School Garage",    cust: "Transport Coordinator", serial: "TYT-HIL-2023-003", date: "2023-01-10" },
    { no: "EQUIP-001", desc: "Photocopier - Ricoh MP3054",       cat: "EQUIP", cost: 3200,   nbv: 2100,   loc: "Admin Office",     cust: "Secretary",             serial: "RICOH-2021-003",   date: "2021-03-10" },
    { no: "EQUIP-002", desc: "Science Lab Equipment Set",        cat: "EQUIP", cost: 15000,  nbv: 11250,  loc: "Science Lab",      cust: "Science HOD",           serial: null,               date: "2021-09-01" },
    { no: "EQUIP-003", desc: "Generator - 20KVA",                cat: "EQUIP", cost: 9500,   nbv: 7140,   loc: "Generator House",  cust: "Maintenance",           serial: "GEN-20KVA-2022",   date: "2022-01-01" },
    { no: "EQUIP-004", desc: "PA System & Speakers",             cat: "EQUIP", cost: 2800,   nbv: 1680,   loc: "Assembly Hall",    cust: "Deputy Head",           serial: "PA-HALL-2021",     date: "2021-06-01" },
    { no: "EQUIP-005", desc: "Kitchen Equipment Set (Boarding)", cat: "EQUIP", cost: 6500,   nbv: 4875,   loc: "Boarding Kitchen", cust: "Matron",                serial: null,               date: "2022-08-01" },
  ];

  let created = 0;
  for (const a of assets) {
    const existing = await prisma.asset.findFirst({ where: { organisationId: ORG_ID, assetNumber: a.no } });
    if (!existing) {
      await prisma.asset.create({
        data: {
          organisationId: ORG_ID,
          assetNumber: a.no,
          description: a.desc,
          categoryId: catMap[a.cat],
          acquisitionCost: a.cost,
          residualValue: a.cost * 0.05,
          netBookValue: a.nbv,
          location: a.loc,
          custodian: a.cust,
          serialNumber: a.serial,
          acquisitionDate: new Date(a.date),
          status: "ACTIVE",
          source: "PURCHASE",
        },
      });
      created++;
    }
  }
  console.log(`\nAssets seeded: ${created}/${assets.length}`);
}

main().catch(console.error).finally(() => prisma.$disconnect());
