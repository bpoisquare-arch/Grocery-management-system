"use client";

import React, { useState, useEffect, useRef } from "react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetFooter,
  SheetClose,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Loader2Icon, PlusCircleIcon, TagIcon, XIcon } from "lucide-react";
import { useStore } from "@/lib/store";
import { toast } from "sonner";

interface AddCategorySheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialName?: string;
  onCategoryCreated?: (categoryName: string) => void;
}

export function AddCategorySheet({
  open,
  onOpenChange,
  initialName = "",
  onCategoryCreated,
}: AddCategorySheetProps) {
  const { addCategory, activeEntity } = useStore();
  const [categoryName, setCategoryName] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open) {
      setCategoryName(initialName || "");
      setError(null);
      setTimeout(() => {
        inputRef.current?.focus();
        inputRef.current?.select();
      }, 100);
    } else {
      setCategoryName("");
      setError(null);
    }
  }, [open, initialName]);

  const handleSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();

    const trimmed = categoryName.trim();
    if (!trimmed) {
      setError("Please enter a category name");
      inputRef.current?.focus();
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      const created = await addCategory(trimmed, activeEntity);
      toast.success(`Category "${created.name}" created successfully!`);
      onOpenChange(false);
      if (onCategoryCreated) {
        onCategoryCreated(created.name);
      }
    } catch (err: any) {
      console.error("Failed to create category:", err);
      toast.error(err.message || "Failed to create category");
      setError(err.message || "Something went wrong");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        className="w-full sm:max-w-md p-0 flex flex-col bg-white border-l border-gray-200 shadow-2xl z-50 overflow-hidden"
      >
        {/* Header matching Attachment 2 */}
        <SheetHeader className="p-6 border-b border-gray-100 bg-slate-50/50">
          <div className="flex items-center gap-2.5">
            <div className="flex items-center justify-center size-9 rounded-lg bg-emerald-100/80 text-emerald-700">
              <TagIcon className="size-4.5 stroke-[2.2]" />
            </div>
            <div>
              <SheetTitle className="text-lg font-bold text-gray-900 tracking-tight">
                Add New Category
              </SheetTitle>
              <SheetDescription className="text-xs text-gray-500 mt-0.5">
                Create a category to classify and manage your expenses.
              </SheetDescription>
            </div>
          </div>
        </SheetHeader>

        {/* Sheet Body with Category Name Form */}
        <form onSubmit={handleSubmit} className="flex-1 flex flex-col justify-between overflow-y-auto p-6 space-y-6">
          <div className="space-y-4">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="category-name-input" className="text-xs font-semibold text-gray-700">
                  Category Name <span className="text-red-500">*</span>
                </Label>
                <Badge variant="outline" className="text-[10px] bg-slate-50 text-slate-600 border-slate-200">
                  Type: Expense
                </Badge>
              </div>
              <Input
                id="category-name-input"
                ref={inputRef}
                placeholder="e.g. Office Supplies, Vehicle Maintenance..."
                value={categoryName}
                onChange={(e) => {
                  setCategoryName(e.target.value);
                  if (error) setError(null);
                }}
                disabled={isSubmitting}
                className="h-10 text-sm border-gray-200 focus:border-emerald-500 focus:ring-emerald-500 rounded-md"
              />
              {error ? (
                <p className="text-xs font-medium text-red-500">{error}</p>
              ) : (
                <p className="text-[11px] text-gray-400">
                  This category will be immediately available in the combobox for all grocery entries.
                </p>
              )}
            </div>
          </div>

          {/* Sheet Footer matching Attachment 2 */}
          <div className="pt-4 border-t border-gray-100 flex items-center justify-end gap-3 mt-auto">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isSubmitting}
              className="h-10 px-5 text-xs font-semibold text-gray-600 border-gray-200 hover:bg-slate-50"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={isSubmitting || !categoryName.trim()}
              className="h-10 px-6 text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs transition-colors cursor-pointer"
            >
              {isSubmitting ? (
                <>
                  <Loader2Icon className="size-3.5 mr-1.5 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <PlusCircleIcon className="size-3.5 mr-1.5" />
                  Save Category
                </>
              )}
            </Button>
          </div>
        </form>
      </SheetContent>
    </Sheet>
  );
}
