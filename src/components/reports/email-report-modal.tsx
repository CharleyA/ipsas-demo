"use client";

import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Mail, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/components/providers/auth-provider";

interface EmailReportModalProps {
  reportName: string;
  filters: Record<string, any>;
  isOpen?: boolean;
  onClose?: () => void;
}

const ALLOWED_ROLES = ["ADMIN", "HEADMASTER", "AUDITOR", "BURSAR"];

export function EmailReportModal({ reportName, filters, isOpen, onClose }: EmailReportModalProps) {
  const { user, token } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [formData, setFormData] = useState({
    to: "",
    subject: `${reportName} Report`,
    message: "",
    format: "pdf",
  });

  useEffect(() => {
    setFormData(prev => ({ ...prev, subject: `${reportName} Report` }));
  }, [reportName]);

  const canEmail = user?.role && ALLOWED_ROLES.includes(user.role);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.to || !formData.subject) {
      toast.error("Email and subject are required");
      return;
    }

    setIsLoading(true);
    try {
      const response = await fetch("/api/reports/email", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`,
        },
        body: JSON.stringify({
          reportName,
          filters,
          format: formData.format,
          to: formData.to,
          subject: formData.subject,
          message: formData.message,
        }),
      });

      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || "Failed to send email");
      }

      toast.success(data.message || "Report sent successfully!");
      onClose?.();
      setFormData({ ...formData, to: "", message: "" });
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setIsLoading(false);
    }
  };

  if (!canEmail) {
    return null;
  }

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose?.()}>
      <DialogContent className="sm:max-w-[425px]">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>Email Report</DialogTitle>
            <DialogDescription>
              Send the {reportName} report to an email address.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="to">Recipient Email</Label>
              <Input
                id="to"
                type="email"
                placeholder="email@example.com"
                value={formData.to}
                onChange={(e) => setFormData({ ...formData, to: e.target.value })}
                required
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="subject">Subject</Label>
              <Input
                id="subject"
                value={formData.subject}
                onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                required
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="format">Attachment Format</Label>
              <Select
                value={formData.format}
                onValueChange={(value) => setFormData({ ...formData, format: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="pdf">PDF</SelectItem>
                  <SelectItem value="xlsx">Excel (XLSX)</SelectItem>
                  <SelectItem value="csv">CSV</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="message">Message (Optional)</Label>
              <Textarea
                id="message"
                placeholder="Add a personal message..."
                value={formData.message}
                onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Sending...
                </>
              ) : (
                <>
                  <Mail className="w-4 h-4 mr-2" />
                  Send Email
                </>
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
