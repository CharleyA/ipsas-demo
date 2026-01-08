import { NextResponse } from "next/server";
import * as ExcelJS from "exceljs";
import Papa from "papaparse";
import { generatePDFFromHTML, type PDFGenerationOptions } from "./pdf";
import { Prisma } from "@prisma/client";

export type ExportFormat = "json" | "csv" | "xlsx" | "pdf";

export interface ExportColumn {
  header: string;
  key: string;
  width?: number;
  format?: "number" | "date" | "currency";
}

export interface PDFOptions extends PDFGenerationOptions {
  orientation?: 'portrait' | 'landscape';
}

export class ReportExporter {
  static async export(
    format: ExportFormat,
    data: any[],
    columns: ExportColumn[],
    reportName: string,
    pdfOptions?: PDFOptions
  ): Promise<Buffer | string | any> {
    switch (format) {
      case "csv":
        return this.generateCSV(data, columns);
      case "xlsx":
        return this.generateExcel(data, columns, reportName);
      case "pdf":
        return this.generatePDF(data, columns, reportName, pdfOptions);
      default:
        return data;
    }
  }

  private static formatValue(value: any, column: ExportColumn) {
    if (value instanceof Prisma.Decimal) return value.toNumber();
    if (value instanceof Date) {
      return value.toLocaleDateString();
    }
    return value;
  }

  static formatCurrency(amount: number | string | null | undefined, decimals = 2): string {
    const num = typeof amount === 'string' ? parseFloat(amount) : (amount || 0);
    return num.toLocaleString('en-US', {
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals,
    });
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
    reportName: string,
    options?: PDFOptions
  ): Promise<Buffer> {
    const tableHtml = `
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
                  const displayVal = isNum ? this.formatCurrency(val) : (val ?? '');
                  return `<td class="${isNum ? "text-right" : ""}">${displayVal}</td>`;
                })
                .join("")}
            </tr>
          `
            )
            .join("")}
        </tbody>
      </table>
    `;

    return generatePDFFromHTML(tableHtml, {
      title: reportName,
      subtitle: options?.subtitle,
      organisationName: options?.organisationName || 'Organisation',
      orientation: options?.orientation || 'portrait',
    });
  }

  static async generateCustomPDF(
    htmlContent: string,
    options: PDFOptions
  ): Promise<Buffer> {
    return generatePDFFromHTML(htmlContent, options);
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
