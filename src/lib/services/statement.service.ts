import prisma from "@/lib/db";
import { ReportType, AccountType } from "@prisma/client";
import { AuditService } from "./audit.service";

export class StatementService {
  static async seedStatementStructure(organisationId: string, actorId: string) {
    const results = {
      linesCreated: 0,
      mapsCreated: 0,
    };

    // 1. Define Financial Position Structure
    const fpStructure = [
      { code: "FP-ASSETS", name: "ASSETS", order: 10, parentCode: null },
      { code: "FP-CURR-ASSETS", name: "Current Assets", order: 20, parentCode: "FP-ASSETS" },
      { code: "FP-CASH", name: "Cash and Cash Equivalents", order: 30, parentCode: "FP-CURR-ASSETS", accountTypes: ["ASSET"], accountCodes: ["1110", "1111", "1112"] },
      { code: "FP-RECEIVABLES", name: "Receivables from Non-Exchange Transactions", order: 40, parentCode: "FP-CURR-ASSETS", accountTypes: ["ASSET"], accountCodes: ["1120", "1121"] },
      { code: "FP-NON-CURR-ASSETS", name: "Non-Current Assets", order: 50, parentCode: "FP-ASSETS" },
      { code: "FP-PPE", name: "Property, Plant and Equipment", order: 60, parentCode: "FP-NON-CURR-ASSETS", accountTypes: ["ASSET"], accountCodes: ["1210", "1211", "1212"] },
      
      { code: "FP-LIABILITIES", name: "LIABILITIES", order: 100, parentCode: null },
      { code: "FP-CURR-LIABILITIES", name: "Current Liabilities", order: 110, parentCode: "FP-LIABILITIES" },
      { code: "FP-PAYABLES", name: "Payables from Exchange Transactions", order: 120, parentCode: "FP-CURR-LIABILITIES", accountTypes: ["LIABILITY"], accountCodes: ["2110", "2111"] },
      
      { code: "FP-NET-ASSETS", name: "NET ASSETS/EQUITY", order: 200, parentCode: null },
      { code: "FP-ACC-SURPLUS", name: "Accumulated Surpluses / (Deficits)", order: 210, parentCode: "FP-NET-ASSETS", accountTypes: ["NET_ASSETS_EQUITY"], accountCodes: ["3100"] },
      { code: "FP-RESERVES", name: "Reserves", order: 220, parentCode: "FP-NET-ASSETS", accountTypes: ["NET_ASSETS_EQUITY"], accountCodes: ["3200"] },
    ];

    // 2. Define Financial Performance Structure
    const perfStructure = [
      { code: "PERF-REVENUE", name: "REVENUE", order: 10, parentCode: null },
      { code: "PERF-NON-EXCH", name: "Revenue from Non-Exchange Transactions", order: 20, parentCode: "PERF-REVENUE", accountTypes: ["REVENUE"], accountCodes: ["4100", "4110", "4120"] },
      { code: "PERF-EXCH", name: "Revenue from Exchange Transactions", order: 30, parentCode: "PERF-REVENUE", accountTypes: ["REVENUE"], accountCodes: ["4200", "4210"] },
      
      { code: "PERF-EXPENSES", name: "EXPENSES", order: 100, parentCode: null },
      { code: "PERF-WAGES", name: "Wages, Salaries and Employee Benefits", order: 110, parentCode: "PERF-EXPENSES", accountTypes: ["EXPENSE"], accountCodes: ["5100"] },
      { code: "PERF-SUPPLIES", name: "Supplies and Consumables Used", order: 120, parentCode: "PERF-EXPENSES", accountTypes: ["EXPENSE"], accountCodes: ["5200"] },
      { code: "PERF-DEP", name: "Depreciation and Amortization", order: 130, parentCode: "PERF-EXPENSES", accountTypes: ["EXPENSE"], accountCodes: ["5300"] },
      { code: "PERF-OTHER", name: "Other Expenses", order: 140, parentCode: "PERF-EXPENSES", accountTypes: ["EXPENSE"], accountCodes: ["5400"] },
    ];

    const structures = [
      { type: ReportType.FINANCIAL_POSITION, lines: fpStructure },
      { type: ReportType.FINANCIAL_PERFORMANCE, lines: perfStructure },
    ];

    for (const struct of structures) {
      const codeToId: Record<string, string> = {};

      // Create lines
      for (const line of struct.lines) {
        let existing = await prisma.statementLine.findUnique({
          where: {
            organisationId_reportType_code: {
              organisationId,
              reportType: struct.type,
              code: line.code,
            },
          },
        });

        if (!existing) {
          existing = await prisma.statementLine.create({
            data: {
              organisationId,
              reportType: struct.type,
              code: line.code,
              name: line.name,
              order: line.order,
            },
          });
          results.linesCreated++;
        }
        codeToId[line.code] = existing.id;
      }

      // Update parentIds
      for (const line of struct.lines) {
        if (line.parentCode) {
          await prisma.statementLine.update({
            where: {
              organisationId_reportType_code: {
                organisationId,
                reportType: struct.type,
                code: line.code,
              },
            },
            data: { parentId: codeToId[line.parentCode] },
          });
        }
      }

      // Map accounts
      for (const line of struct.lines) {
        if (line.accountCodes || line.accountTypes) {
          const accounts = await prisma.account.findMany({
            where: {
              organisationId,
              OR: [
                { code: { in: line.accountCodes || [] } },
                { code: { startsWith: line.accountCodes?.[0] ? `${line.accountCodes[0]}.` : undefined } }, // Map currency sub-accounts
                { type: { in: (line.accountTypes as any[]) || [] } },
              ],
            },
          });

          for (const acc of accounts) {
            // Only map leaf accounts or specific codes to avoid double counting if parents are mapped
            // But here we want to map specific accounts to specific lines.
            
            // For IPSAS, we usually map the most granular accounts.
            // But let's check if already mapped
            const existingMap = await prisma.accountStatementMap.findUnique({
              where: {
                accountId_statementLineId: {
                  accountId: acc.id,
                  statementLineId: codeToId[line.code],
                },
              },
            });

            if (!existingMap) {
              await prisma.accountStatementMap.create({
                data: {
                  accountId: acc.id,
                  statementLineId: codeToId[line.code],
                },
              });
              results.mapsCreated++;
            }
          }
        }
      }
    }

    await AuditService.log({
      userId: actorId,
      organisationId,
      action: "SEED_STATEMENT_STRUCTURE",
      entityType: "StatementLine",
      entityId: "bulk",
      newValues: results,
    });

    return results;
  }
}
