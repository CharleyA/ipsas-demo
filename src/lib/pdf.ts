import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";

// Note: jspdf-autotable adds autoTable method to jsPDF
// We need to extend the type for TypeScript
declare module "jspdf" {
  interface jsPDF {
    autoTable: (options: any) => jsPDF;
  }
}

export interface PDFGenerationOptions {
  title: string;
  subtitle?: string;
  organisationName: string;
  generatedAt?: Date;
  orientation?: 'portrait' | 'landscape';
  summaryData?: { label: string; value: string | number }[];
  currency?: string;
}

export async function generatePDF(
  data: any[],
  columns: { header: string; key: string; width?: number; format?: string }[],
  options: PDFGenerationOptions
): Promise<Buffer> {
  const doc = new jsPDF({
    orientation: options.orientation || 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  const pageWidth = doc.internal.pageSize.width;
  let currentY = 15;

  // Institution Name
  doc.setFontSize(18);
  doc.setFont("helvetica", "bold");
  doc.text(options.organisationName, pageWidth / 2, currentY, { align: "center" });
  currentY += 8;

  // Report Title
  doc.setFontSize(14);
  doc.setFont("helvetica", "bold");
  doc.text(options.title, pageWidth / 2, currentY, { align: "center" });
  currentY += 6;

  // Subtitle (Date range etc)
  if (options.subtitle) {
    doc.setFontSize(11);
    doc.setFont("helvetica", "normal");
    doc.text(options.subtitle, pageWidth / 2, currentY, { align: "center" });
    currentY += 6;
  }

  // Generation Date
  doc.setFontSize(9);
  doc.setFont("helvetica", "italic");
  doc.text(`Generated: ${(options.generatedAt || new Date()).toLocaleString()}`, pageWidth / 2, currentY, { align: "center" });
  currentY += 6;

  // Add a professional horizontal line
  doc.setDrawColor(200, 200, 200);
  doc.setLineWidth(0.5);
  doc.line(15, currentY, pageWidth - 15, currentY);
  currentY += 10;

  // Summary Table (if provided)
  if (options.summaryData && options.summaryData.length > 0) {
    autoTable(doc, {
      startY: currentY,
      body: options.summaryData.map(s => [s.label, typeof s.value === 'number' ? s.value.toLocaleString(undefined, { minimumFractionDigits: 2 }) : s.value]),
      theme: 'grid',
      styles: { fontSize: 9, cellPadding: 2 },
      columnStyles: {
        0: { fontStyle: 'bold', fillColor: [240, 240, 240], cellWidth: 40 },
        1: { halign: 'right' }
      },
      margin: { left: pageWidth - 100 }, // Align to the right side
      tableWidth: 85,
    });
    currentY = (doc as any).lastAutoTable.finalY + 10;
  }

  // Table
  const tableRows = data.map(item => columns.map(col => {
    const val = item[col.key];
    if (typeof val === 'number' || (typeof val === 'string' && !isNaN(parseFloat(val)) && ['debit', 'credit', 'balance', 'amount', 'total'].includes(col.key.toLowerCase()))) {
        const num = typeof val === 'string' ? parseFloat(val) : val;
        return num.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    }
    return val ?? '';
  }));

  const tableHeaders = columns.map(col => col.header);

  autoTable(doc, {
    startY: currentY,
    head: [tableHeaders],
    body: tableRows,
    theme: 'striped',
    headStyles: { 
      fillColor: [30, 41, 59], // Slate 800
      textColor: 255, 
      fontSize: 10, 
      fontStyle: 'bold',
      halign: 'center' 
    },
    bodyStyles: { 
      fontSize: 9,
      textColor: 50 
    },
    columnStyles: columns.reduce((acc, col, idx) => {
      if (['debit', 'credit', 'balance', 'amount', 'total'].includes(col.key.toLowerCase())) {
        acc[idx] = { halign: 'right' };
      }
      return acc;
    }, {} as any),
    margin: { top: 15, right: 15, bottom: 15, left: 15 },
    didDrawPage: (data: any) => {
      // Footer
      const pageCount = (doc as any).internal.getNumberOfPages();
      doc.setFontSize(8);
      doc.setFont("helvetica", "italic");
      doc.text(
        `Page ${data.pageNumber} of ${pageCount} - IPSAS Accounting System`,
        pageWidth / 2,
        doc.internal.pageSize.height - 10,
        { align: "center" }
      );
    }
  });

  return Buffer.from(doc.output("arraybuffer"));
}

// Keep this for compatibility but it's likely broken in this environment
// We will transition all reports to the new generatePDF function
export async function generatePDFFromHTML(
  htmlContent: string,
  options: PDFGenerationOptions
): Promise<Buffer> {
    // Return an error or empty buffer since we know puppeteer is failing
    console.warn("Puppeteer PDF generation is failing in this environment. Using fallback.");
    // For now, let's just return a placeholder so it doesn't crash the whole app
    // but we should ideally update the callers to use the new generatePDF
    const doc = new jsPDF();
    doc.text("PDF Generation Fallback (Puppeteer missing dependencies)", 10, 10);
    doc.text("Please contact support to enable browser-based rendering.", 10, 20);
    return Buffer.from(doc.output("arraybuffer"));
}

export function formatCurrency(amount: number | string | null | undefined, decimals = 2): string {
  const num = typeof amount === 'string' ? parseFloat(amount) : (amount || 0);
  return num.toLocaleString('en-US', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
}
