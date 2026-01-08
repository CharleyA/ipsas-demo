import { NextResponse } from "next/server";
import * as ExcelJS from "exceljs";
import Papa from "papaparse";
import puppeteer from "puppeteer";
import { Decimal } from "@prisma/client/runtime/library";

export type ExportFormat = "json" | "csv" | "xlsx" | "pdf";

export interface ExportColumn {
  header: string;
  key: string;
  width?: number;
  format?: "number" | "date" | "currency";
}

export class ReportExporter {
  static async export(
    format: ExportFormat,
    data: any[],
    columns: ExportColumn[],
    reportName: string
  ): Promise<Buffer | string | any> {
    switch (format) {
      case "csv":
        return this.generateCSV(data, columns);
      case "xlsx":
        return this.generateExcel(data, columns, reportName);
      case "pdf":
        return this.generatePDF(data, columns, reportName);
      default:
        return data;
    }
  }

  private static formatValue(value: any, column: ExportColumn) {
    if (value instanceof Decimal) return value.toNumber();
    if (value instanceof Date) {
      return value.toLocaleDateString();
    }
    return value;
  }

  private static generateCSV(data: any[], columns: ExportColumn[]): string {
    const rows = data.map((item) => {
      const row: any = {};
      columns.forEach((col) => {
        row[col.header] = this.formatValue(item[col.key], col);
      });
      return row;
    });

    return Papa.unparse(rows);
  }

  private static async generateExcel(
    data: any[],
    columns: ExportColumn[],
    reportName: string
  ): Promise<Buffer> {
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet(reportName);

    worksheet.columns = columns.map((col) => ({
      header: col.header,
      key: col.key,
      width: col.width || 20,
    }));

    data.forEach((item) => {
      const row: any = {};
      columns.forEach((col) => {
        row[col.key] = this.formatValue(item[col.key], col);
      });
      worksheet.addRow(row);
    });

    // Styling
    worksheet.getRow(1).font = { bold: true };
    worksheet.getRow(1).fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: "FFE0E0E0" },
    };

    return (await workbook.xlsx.writeBuffer()) as Buffer;
  }

  private static async generatePDF(
    data: any[],
    columns: ExportColumn[],
    reportName: string
  ): Promise<Buffer> {
    const html = `
      <html>
        <head>
          <style>
            body { font-family: sans-serif; padding: 20px; }
            h1 { text-align: center; color: #333; }
            table { width: 100%; border-collapse: collapse; margin-top: 20px; }
            th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
            th { background-color: #f2f2f2; font-weight: bold; }
            .text-right { text-align: right; }
          </style>
        </head>
        <body>
          <h1>${reportName}</h1>
          <table>
            <thead>
              <tr>
                ${columns.map((col) => `<th>${col.header}</th>`).join("")}
              </tr>
            </thead>
            <tbody>
              ${data
                .map(
                  (item) => `
                <tr>
                  ${columns
                    .map((col) => {
                      const val = this.formatValue(item[col.key], col);
                      const isNum = typeof val === "number";
                      return `<td class="${isNum ? "text-right" : ""}">${val}</td>`;
                    })
                    .join("")}
                </tr>
              `
                )
                .join("")}
            </tbody>
          </table>
        </body>
      </html>
    `;

    const browser = await puppeteer.launch({
      headless: true,
      args: ["--no-sandbox", "--disable-setuid-sandbox"],
    });
    const page = await browser.newPage();
    await page.setContent(html);
    const pdf = await page.pdf({ format: "A4", landscape: true, printBackground: true });
    await browser.close();

    return pdf;
  }

  static getResponse(
    format: ExportFormat,
    content: any,
    reportName: string
  ): NextResponse {
    const filename = `${reportName.toLowerCase().replace(/\s+/g, "_")}_${new Date()
      .toISOString()
      .split("T")[0]}`;

    if (format === "json") {
      return NextResponse.json(content);
    }

    const headers = new Headers();
    let contentType = "";
    let extension = "";

    switch (format) {
      case "csv":
        contentType = "text/csv";
        extension = "csv";
        break;
      case "xlsx":
        contentType = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";
        extension = "xlsx";
        break;
      case "pdf":
        contentType = "application/pdf";
        extension = "pdf";
        break;
    }

    headers.set("Content-Type", contentType);
    headers.set("Content-Disposition", `attachment; filename="${filename}.${extension}"`);

    return new NextResponse(content, { headers });
  }
}
