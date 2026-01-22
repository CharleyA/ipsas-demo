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
    reportName: string,
    options?: PDFOptions
  ): Promise<Buffer> {
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet(reportName);

    // Add Header Information
    const orgName = options?.organisationName || "Organisation";
    const title = options?.title || reportName;
    const subtitle = options?.subtitle || "";

    worksheet.mergeCells('A1:F1');
    const titleCell = worksheet.getCell('A1');
    titleCell.value = orgName;
    titleCell.font = { bold: true, size: 16 };
    titleCell.alignment = { horizontal: 'center' };

    worksheet.mergeCells('A2:F2');
    const reportTitleCell = worksheet.getCell('A2');
    reportTitleCell.value = title;
    reportTitleCell.font = { bold: true, size: 14 };
    reportTitleCell.alignment = { horizontal: 'center' };

    if (subtitle) {
      worksheet.mergeCells('A3:F3');
      const subtitleCell = worksheet.getCell('A3');
      subtitleCell.value = subtitle;
      subtitleCell.font = { italic: true, size: 12 };
      subtitleCell.alignment = { horizontal: 'center' };
    }

    // Header Row starts at row 5
    const headerRowIndex = 5;
    const headerRow = worksheet.getRow(headerRowIndex);
    
    columns.forEach((col, index) => {
      const cell = headerRow.getCell(index + 1);
      cell.value = col.header;
      cell.font = { bold: true, color: { argb: 'FFFFFFFF' } };
      cell.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FF1E293B' } // Slate-800
      };
      cell.alignment = { horizontal: 'center' };
      worksheet.getColumn(index + 1).width = col.width || 20;
    });

    // Add Data
    data.forEach((item, rowIndex) => {
      const row = worksheet.getRow(headerRowIndex + 1 + rowIndex);
      columns.forEach((col, colIndex) => {
        const value = this.formatValue(item[col.key], col);
        const cell = row.getCell(colIndex + 1);
        
        cell.value = value;

        // Apply currency formatting if column is debit/credit/balance
        if (['debit', 'credit', 'balance', 'amount', 'total'].includes(col.key.toLowerCase())) {
          cell.numFmt = '#,##0.00;[Red]-#,##0.00';
          cell.alignment = { horizontal: 'right' };
        }
      });
    });

    // Freeze header
    worksheet.views = [{ state: 'frozen', xSplit: 0, ySplit: headerRowIndex, activePane: 'bottomLeft', selType: 'row' }];

    return (await workbook.xlsx.writeBuffer()) as Buffer;
  }

  private static async generatePDF(
    data: any[],
    columns: ExportColumn[],
    reportName: string,
    options?: PDFOptions
  ): Promise<Buffer> {
    // Calculate totals for summary if it's Trial Balance
    let summaryHtml = "";
    if (reportName === "Trial Balance") {
      const totalDebit = data.reduce((sum, row) => sum + (parseFloat(row.debit) || 0), 0);
      const totalCredit = data.reduce((sum, row) => sum + (parseFloat(row.credit) || 0), 0);
      const variance = Math.abs(totalDebit - totalCredit);

      summaryHtml = `
        <div class="summary-box">
          <div class="summary-row">
            <span class="font-bold">Total Institutional Debits:</span>
            <span>${this.formatCurrency(totalDebit)}</span>
          </div>
          <div class="summary-row">
            <span class="font-bold">Total Institutional Credits:</span>
            <span>${this.formatCurrency(totalCredit)}</span>
          </div>
          <div class="summary-row" style="margin-top: 8px; border-top: 1px solid #ddd; padding-top: 8px;">
            <span class="font-bold">Trial Balance Variance:</span>
            <span class="${variance < 0.01 ? 'positive' : 'negative'} font-bold">
              ${this.formatCurrency(variance)} ${variance < 0.01 ? '(Balanced)' : '(Out of Balance)'}
            </span>
          </div>
        </div>
      `;
    }

    const tableHtml = `
      ${summaryHtml}
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
                  const isNum = typeof val === "number" || (typeof val === "string" && !isNaN(parseFloat(val)) && ['debit', 'credit', 'balance', 'amount', 'total'].includes(col.key.toLowerCase()));
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
