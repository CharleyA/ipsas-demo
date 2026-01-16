"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
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
import { ArrowLeft, Loader2, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/components/providers/auth-provider";

const GRADES = [
  "Grade 1", "Grade 2", "Grade 3", "Grade 4", "Grade 5", "Grade 6", "Grade 7",
  "Form 1", "Form 2", "Form 3", "Form 4", "Form 5", "Form 6",
  "ECD A", "ECD B"
];

const TERMS = ["Term 1", "Term 2", "Term 3"];

export default function NewFeeTemplatePage() {
  const router = useRouter();
  const { token } = useAuth();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [formData, setFormData] = useState({
    name: "",
    description: "",
    academicYear: new Date().getFullYear(),
    term: "Term 1",
    grades: [] as string[],
    currencyCode: "USD",
    dueAfterDays: 30,
    items: [{ description: "", amount: 0 }],
  });

  const addItem = () => {
    setFormData({
      ...formData,
      items: [...formData.items, { description: "", amount: 0 }],
    });
  };

  const removeItem = (index: number) => {
    if (formData.items.length > 1) {
      setFormData({
        ...formData,
        items: formData.items.filter((_, i) => i !== index),
      });
    }
  };

  const updateItem = (index: number, field: string, value: string | number) => {
    const newItems = [...formData.items];
    newItems[index] = { ...newItems[index], [field]: value };
    setFormData({ ...formData, items: newItems });
  };

  const toggleGrade = (grade: string) => {
    if (formData.grades.includes(grade)) {
      setFormData({
        ...formData,
        grades: formData.grades.filter((g) => g !== grade),
      });
    } else {
      setFormData({
        ...formData,
        grades: [...formData.grades, grade],
      });
    }
  };

  const handleSubmit = async () => {
    if (!formData.name || formData.items.some((i) => !i.description || !i.amount)) {
      toast.error("Please fill in all required fields");
      return;
    }

    setIsSubmitting(true);
    try {
      const response = await fetch("/api/ar/fee-templates", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(formData),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to create template");
      }

      toast.success("Fee template created successfully");
      router.push("/dashboard/ar/fee-templates");
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const total = formData.items.reduce((sum, item) => sum + (Number(item.amount) || 0), 0);

  return (
    <div className="space-y-6 max-w-3xl">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" asChild>
          <Link href="/dashboard/ar/fee-templates">
            <ArrowLeft className="w-4 h-4" />
          </Link>
        </Button>
        <div>
          <h1 className="text-3xl font-bold tracking-tight">New Fee Template</h1>
          <p className="text-muted-foreground">
            Define a fee structure for bulk invoice generation.
          </p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Template Details</CardTitle>
          <CardDescription>
            Basic information about this fee template.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="name">Template Name *</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) =>
                  setFormData({ ...formData, name: e.target.value })
                }
                placeholder="e.g., Standard Fees 2026"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="year">Academic Year</Label>
              <Input
                id="year"
                type="number"
                value={formData.academicYear}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    academicYear: parseInt(e.target.value) || 2026,
                  })
                }
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Term</Label>
              <Select
                value={formData.term}
                onValueChange={(v) => setFormData({ ...formData, term: v })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {TERMS.map((term) => (
                    <SelectItem key={term} value={term}>
                      {term}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Due After (days)</Label>
              <Input
                type="number"
                value={formData.dueAfterDays}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    dueAfterDays: parseInt(e.target.value) || 30,
                  })
                }
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) =>
                setFormData({ ...formData, description: e.target.value })
              }
              placeholder="Optional description for this template"
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Applicable Grades</CardTitle>
          <CardDescription>
            Select which grades this template applies to. Leave empty for all grades.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2">
            {GRADES.map((grade) => (
              <Button
                key={grade}
                type="button"
                variant={formData.grades.includes(grade) ? "default" : "outline"}
                size="sm"
                onClick={() => toggleGrade(grade)}
              >
                {grade}
              </Button>
            ))}
          </div>
          {formData.grades.length > 0 && (
            <p className="text-sm text-muted-foreground mt-2">
              Selected: {formData.grades.join(", ")}
            </p>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Fee Items</CardTitle>
          <CardDescription>
            Define the individual fee components.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {formData.items.map((item, index) => (
            <div key={index} className="flex gap-4 items-end">
              <div className="flex-1 space-y-2">
                <Label>Description *</Label>
                <Input
                  value={item.description}
                  onChange={(e) => updateItem(index, "description", e.target.value)}
                  placeholder="e.g., Tuition Fee"
                />
              </div>
              <div className="w-32 space-y-2">
                <Label>Amount *</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={item.amount}
                  onChange={(e) =>
                    updateItem(index, "amount", parseFloat(e.target.value) || 0)
                  }
                />
              </div>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={() => removeItem(index)}
                disabled={formData.items.length === 1}
              >
                <Trash2 className="w-4 h-4" />
              </Button>
            </div>
          ))}

          <Button type="button" variant="outline" onClick={addItem}>
            <Plus className="w-4 h-4 mr-2" />
            Add Item
          </Button>

          <div className="pt-4 border-t">
            <div className="flex justify-between text-lg font-semibold">
              <span>Total per Student:</span>
              <span>${total.toFixed(2)}</span>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-end gap-2">
        <Button variant="outline" asChild>
          <Link href="/dashboard/ar/fee-templates">Cancel</Link>
        </Button>
        <Button onClick={handleSubmit} disabled={isSubmitting}>
          {isSubmitting && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
          Create Template
        </Button>
      </div>
    </div>
  );
}
