import * as ExcelJS from 'exceljs';
import Papa from 'papaparse';
import * as XLSX from 'xlsx';

export interface ImportTemplate {
  filename: string;
  columns: string[];
}

export const IMPORT_TEMPLATES: Record<string, ImportTemplate> = {
  students: {
    filename: 'students_import_template',
    columns: ['studentNumber', 'firstName', 'lastName', 'grade', 'isActive'],
  },
  receipts: {
    filename: 'receipts_import_template',
    columns: ['studentNumber', 'date', 'amount', 'currencyCode', 'description', 'reference', 'postImmediately'],
  },
  accounts: {
    filename: 'accounts_import_template',
    columns: ['code', 'name', 'type', 'parentCode', 'description'],
  },
  suppliers: {
    filename: 'suppliers_import_template',
    columns: ['name', 'email', 'phone', 'address', 'taxNumber', 'isActive'],
  },
};

export function generateCSVTemplate(type: string): string {
  const template = IMPORT_TEMPLATES[type.toLowerCase()];
  if (!template) throw new Error('Invalid template type');
  
  return Papa.unparse([template.columns]);
}

export async function generateXLSXTemplate(type: string): Promise<Buffer> {
  const template = IMPORT_TEMPLATES[type.toLowerCase()];
  if (!template) throw new Error('Invalid template type');

  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet('Template');

  worksheet.addRow(template.columns);
  
  // Make header bold
  worksheet.getRow(1).font = { bold: true };

  return (await workbook.xlsx.writeBuffer()) as Buffer;
}

export async function parseImportFile(file: File): Promise<any[]> {
  const buffer = await file.arrayBuffer();
  const filename = file.name.toLowerCase();

  if (filename.endsWith('.csv')) {
    const text = new TextDecoder().decode(buffer);
    return new Promise((resolve, reject) => {
      Papa.parse(text, {
        header: true,
        skipEmptyLines: true,
        complete: (results) => resolve(results.data),
        error: (error: any) => reject(error),
      });
    });
  } else if (filename.endsWith('.xlsx') || filename.endsWith('.xls')) {
    const workbook = XLSX.read(buffer, { type: 'array' });
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    return XLSX.utils.sheet_to_json(worksheet);
  } else {
    throw new Error('Unsupported file format. Please use CSV or XLSX.');
  }
}
