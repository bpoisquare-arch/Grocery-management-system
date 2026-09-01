"use client";

import React, { useState, useEffect } from "react";
import { format, parseISO } from "date-fns";
import { CalendarIcon, UploadIcon, AlertTriangleIcon, Loader2Icon } from "lucide-react";
import { useStore } from "@/lib/store";
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
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Card, CardContent } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { GroceryEntry, SlipStatus } from "@/lib/mockData";

interface EditGroceryModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  entry: GroceryEntry | null;
}

export function EditGroceryModal({ open, onOpenChange, entry }: EditGroceryModalProps) {
  const {
    activeEntity,
    currentMonth,
    currentYear,
    budgets,
    groceryEntries,
    updateGroceryEntry,
    getEntityBudget,
  } = useStore();

  const [date, setDate] = useState<Date | undefined>(undefined);
  const [details, setDetails] = useState("");
  const [amountStr, setAmountStr] = useState("");
  const [slipFile, setSlipFile] = useState<File | null>(null);
  const [dragActive, setDragActive] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Initialize fields with entry data
  useEffect(() => {
    if (open && entry) {
      // Parse entry date "YYYY-MM-DD" safely
      try {
        const parsedDate = new Date(entry.date);
        setDate(isNaN(parsedDate.getTime()) ? new Date() : parsedDate);
      } catch (e) {
        setDate(new Date());
      }
      setDetails(entry.details);
      setAmountStr(entry.amount.toString());
      setSlipFile(null);
    }
  }, [open, entry]);

  if (!entry) return null;

  // Find budget limit
  const selectedDateMonth = date ? format(date, "MMMM") : currentMonth;
  const selectedDateYear = date ? parseInt(format(date, "yyyy"), 10) : currentYear;
  const totalBudget = getEntityBudget(activeEntity, selectedDateMonth, selectedDateYear);

  // Calculate spent for active entity
  const totalSpent = groceryEntries
    .filter((item) => item.entity === activeEntity)
    .reduce((sum, item) => sum + item.amount, 0);

  const remainingBalance = totalBudget - totalSpent;
  const originalAmount = entry.amount;
  const newAmount = parseFloat(amountStr) || 0;

  // Math for editing: subtract original amount from spent, then add new amount
  const remainingAfterSave = remainingBalance + originalAmount - newAmount;
  const isOverBudget = remainingAfterSave < 0;

  // File drag handlers
  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const file = e.dataTransfer.files[0];
      const validTypes = ["image/jpeg", "image/png", "application/pdf"];
      if (validTypes.includes(file.type)) {
        setSlipFile(file);
        toast.success(`Slip file "${file.name}" ready to replace.`);
      } else {
        toast.error("Unsupported file type. Please upload JPG, PNG or PDF.");
      }
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setSlipFile(file);
      toast.success(`Slip file "${file.name}" ready to replace.`);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!date) {
      toast.error("Please select a date.");
      return;
    }
    if (!details.trim()) {
      toast.error("Please enter grocery details.");
      return;
    }
    if (newAmount <= 0) {
      toast.error("Please enter a valid amount.");
      return;
    }

    setIsSubmitting(true);
    try {
      // Determine status
      let status = entry.status;
      if (slipFile) {
        status = "Slip Uploaded";
      } else if (entry.status === "Slip Missing") {
        // remains missing unless file uploaded
      }

      await updateGroceryEntry(entry.id, {
        date: format(date, "yyyy-MM-dd"),
        details,
        amount: newAmount,
        status,
        slipFile,
      });

      toast.success("Grocery updated successfully.");
      onOpenChange(false);
    } catch (err) {
      console.error(err);
      toast.error("Unable to update grocery.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-3xl w-full bg-white p-6 md:p-8 rounded-xl ring-1 ring-black/5 shadow-xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold text-gray-900">Edit Grocery</DialogTitle>
          <DialogDescription className="text-sm text-gray-500">
            Edit grocery expense details for {activeEntity} User.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-12 gap-6 mt-4">
          {/* Inputs Section */}
          <div className="md:col-span-7 space-y-4">
            {/* Date */}
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="date" className="text-xs font-semibold text-gray-700">DATE</Label>
              <Popover>
                <PopoverTrigger
                  render={
                    <Button
                      variant="outline"
                      className={cn(
                        "w-full h-10 px-3 justify-start text-left font-normal text-sm border-gray-200 hover:bg-gray-50",
                        !date && "text-gray-400"
                      )}
                    />
                  }
                >
                  <CalendarIcon className="mr-2 size-4 text-gray-400" />
                  {date ? format(date, "PPP") : <span>Pick a date</span>}
                </PopoverTrigger>
                <PopoverContent align="start" className="p-0 bg-white border border-gray-200 shadow-lg">
                  <Calendar
                    mode="single"
                    selected={date}
                    onSelect={setDate}
                  />
                </PopoverContent>
              </Popover>
            </div>

            {/* Details */}
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="details" className="text-xs font-semibold text-gray-700">GROCERY DETAILS</Label>
              <Textarea
                id="details"
                value={details}
                onChange={(e) => setDetails(e.target.value)}
                placeholder="e.g. Rice, vegetables, cooking oil..."
                className="min-h-24 resize-none border-gray-200 focus:border-emerald-500 focus:ring-emerald-500"
                required
              />
            </div>

            {/* Amount */}
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="amount" className="text-xs font-semibold text-gray-700">AMOUNT</Label>
              <div className="relative">
                <span className="absolute left-3 top-2.5 text-sm text-gray-400 font-semibold">Rs.</span>
                <Input
                  id="amount"
                  type="number"
                  value={amountStr}
                  onChange={(e) => setAmountStr(e.target.value)}
                  placeholder="0.00"
                  className="pl-10 border-gray-200 focus:border-emerald-500 focus:ring-emerald-500"
                  required
                />
              </div>
            </div>

            {/* Slip Upload Area */}
            <div className="flex flex-col gap-1.5">
              <Label className="text-xs font-semibold text-gray-700">SLIP UPLOAD / REPLACE</Label>
              <div
                onDragEnter={handleDrag}
                onDragOver={handleDrag}
                onDragLeave={handleDrag}
                onDrop={handleDrop}
                className={cn(
                  "border-2 border-dashed rounded-lg p-5 flex flex-col items-center justify-center text-center cursor-pointer transition-all duration-150",
                  dragActive ? "border-emerald-500 bg-emerald-50/50" : "border-gray-200 hover:border-gray-300",
                  slipFile || entry.slipUrl ? "border-emerald-500/50 bg-emerald-50/10" : ""
                )}
              >
                <input
                  type="file"
                  id="edit-file-upload"
                  onChange={handleFileChange}
                  accept="image/png, image/jpeg, application/pdf"
                  className="hidden"
                />
                <label htmlFor="edit-file-upload" className="cursor-pointer flex flex-col items-center gap-1.5">
                  <div className="size-8 rounded-full bg-emerald-50 flex items-center justify-center text-emerald-600">
                    <UploadIcon className="size-4" />
                  </div>
                  <span className="text-xs font-semibold text-gray-900">
                    {slipFile ? slipFile.name : entry.slipUrl ? "Current Slip Uploaded" : "Upload Grocery Slip"}
                  </span>
                  <span className="text-[10px] text-gray-500">
                    {slipFile ? "Click or drag to replace" : entry.slipUrl ? "Click to replace existing slip" : "Drag and drop or browse files (JPG, PNG, PDF)"}
                  </span>
                </label>
              </div>
            </div>
          </div>

          {/* Live Summary Section */}
          <div className="md:col-span-5 flex flex-col justify-between">
            <Card className="border-gray-200 bg-slate-50/50 shadow-none">
              <CardContent className="p-4 space-y-4">
                <h3 className="text-xs font-bold text-gray-900 uppercase tracking-wider">
                  Live Expense Summary
                </h3>
                
                <div className="space-y-2 text-xs font-medium text-gray-600">
                  <div className="flex justify-between">
                    <span>Monthly Budget</span>
                    <span>Rs. {totalBudget.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Current Total Spent</span>
                    <span>Rs. {totalSpent.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between text-gray-500">
                    <span>Original Item cost</span>
                    <span>- Rs. {originalAmount.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between text-emerald-700">
                    <span>New Item Cost</span>
                    <span>+ Rs. {newAmount.toLocaleString()}</span>
                  </div>
                </div>

                <div className="border-t border-gray-200 pt-2 flex justify-between items-center">
                  <span className="text-xs font-semibold text-gray-900">REMAINING AFTER SAVE</span>
                  <span
                    className={cn(
                      "text-sm font-bold",
                      isOverBudget ? "text-red-600" : "text-emerald-700"
                    )}
                  >
                    Rs. {remainingAfterSave.toLocaleString()}
                  </span>
                </div>

                {isOverBudget && (
                  <Alert className="bg-red-50 border-red-100 text-red-800 p-2.5 rounded-lg flex items-start gap-2 shadow-2xs">
                    <AlertTriangleIcon className="size-4 shrink-0 mt-0.5 text-red-600" />
                    <AlertDescription className="text-[11px] leading-snug">
                      <strong>⚠ Over Budget:</strong> Saving these edits will push the budget remaining to a negative state.
                    </AlertDescription>
                  </Alert>
                )}
              </CardContent>
            </Card>

            <DialogFooter className="mt-6 md:mt-0 flex gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                className="flex-1 h-10 border-gray-200 hover:bg-gray-50 text-gray-700"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={isSubmitting}
                className="flex-1 h-10 bg-emerald-600 hover:bg-emerald-700 text-white font-medium shadow-sm transition-colors"
              >
                {isSubmitting ? (
                  <>
                    <Loader2Icon className="size-4 mr-2 animate-spin" />
                    Saving...
                  </>
                ) : (
                  "Save Changes"
                )}
              </Button>
            </DialogFooter>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
