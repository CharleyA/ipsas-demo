"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { 
  FileDown, 
  FileSpreadsheet, 
  FileText, 
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
  const { user } = useAuth();
  const [isEmailModalOpen, setIsEmailModalOpen] = useState(false);

  const handleDownload = (format: string) => {
    const params = new URLSearchParams(filters);
    params.set("format", format);
    window.location.href = `${endpoint}?${params.toString()}`;
  };

  const canEmail = ["ADMIN", "AUDITOR", "HEADMASTER"].includes(user?.role || "");

  return (
    <div className="flex items-center gap-2">
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" size="sm">
            <FileDown className="mr-2 h-4 w-4" />
            Export
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onClick={() => handleDownload("pdf")}>
            <FileText className="mr-2 h-4 w-4" />
            Download PDF
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => handleDownload("xlsx")}>
            <FileSpreadsheet className="mr-2 h-4 w-4" />
            Download Excel
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => handleDownload("csv")}>
            <MoreHorizontal className="mr-2 h-4 w-4" />
            Download CSV
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      {canEmail && (
        <Button variant="outline" size="sm" onClick={() => setIsEmailModalOpen(true)}>
          <Mail className="mr-2 h-4 w-4" />
          Email Report
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
