"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { 
  FileDown, 
  FileSpreadsheet, 
  FileText as LucideFileText, 
  Mail, 
  MoreHorizontal 
} from "lucide-react";
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuTrigger 
} from "@/components/ui/dropdown-menu";
import { EmailReportModal } from "./email-report-modal";
import { useAuth } from "@/components/providers/auth-provider";

interface ReportToolbarProps {
  reportName: string;
  endpoint: string;
  filters: any;
}

export function ReportToolbar({ reportName, endpoint, filters }: ReportToolbarProps) {
  const { user, token } = useAuth();
  const [isEmailModalOpen, setIsEmailModalOpen] = useState(false);

  const handleDownload = (format: string) => {
    const params = new URLSearchParams();
    Object.entries(filters).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        params.set(key, String(value));
      }
    });
    params.set("format", format);
    
    const url = `${endpoint}?${params.toString()}`;
    const link = document.createElement('a');
    link.href = url;
    link.target = '_blank';
    
    fetch(url, {
      headers: { "Authorization": `Bearer ${token}` }
    }).then(res => res.blob())
      .then(blob => {
        const blobUrl = URL.createObjectURL(blob);
        link.href = blobUrl;
        link.download = `${reportName.toLowerCase().replace(/\s+/g, '_')}.${format}`;
        link.click();
        URL.revokeObjectURL(blobUrl);
      });
  };

  const canEmail = ["ADMIN", "AUDITOR", "HEADMASTER", "BURSAR"].includes(user?.role || "");

  return (
    <div className="flex items-center gap-2">
      <Button variant="outline" size="sm" onClick={() => handleDownload("pdf")} className="hidden md:flex">
        <FileText className="mr-2 h-4 w-4" />
        PDF
      </Button>
      <Button variant="outline" size="sm" onClick={() => handleDownload("xlsx")} className="hidden md:flex">
        <FileSpreadsheet className="mr-2 h-4 w-4" />
        Excel
      </Button>
      
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" size="sm">
            <MoreHorizontal className="mr-2 h-4 w-4" />
            More
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onClick={() => handleDownload("pdf")} className="md:hidden">
            <FileText className="mr-2 h-4 w-4" />
            Download PDF
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => handleDownload("xlsx")} className="md:hidden">
            <FileSpreadsheet className="mr-2 h-4 w-4" />
            Download Excel
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => handleDownload("csv")}>
            <FileDown className="mr-2 h-4 w-4" />
            Download CSV
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      {canEmail && (
        <Button variant="outline" size="sm" onClick={() => setIsEmailModalOpen(true)}>
          <Mail className="mr-2 h-4 w-4" />
          Email
        </Button>
      )}

      <EmailReportModal
        isOpen={isEmailModalOpen}
        onClose={() => setIsEmailModalOpen(false)}
        reportName={reportName}
        filters={filters}
      />
    </div>
  );
}
