"use client";

import React, { useState, useEffect, useRef, useMemo } from "react";
import { format } from "date-fns";
import {
  CalendarIcon,
  UploadIcon,
  AlertTriangleIcon,
  Loader2Icon,
  FileTextIcon,
  ImageIcon,
  EyeIcon,
  Trash2Icon,
  ExternalLinkIcon,
  XIcon,
  PlusIcon,
} from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { SlipStatus } from "@/lib/mockData";

interface AddGroceryModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface SlipItem {
  id: string;
  file: File;
  previewUrl: string;
  name: string;
  size: string;
  isPdf: boolean;
}

const ALL_MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

export function AddGroceryModal({ open, onOpenChange }: AddGroceryModalProps) {
  const {
    activeEntity,
    currentMonth,
    currentYear,
    groceryEntries,
    budgets,
    addGroceryEntry,
    getEntityBudget,
  } = useStore();

  const [date, setDate] = useState<Date | undefined>(new Date());
  const [assignedBudgetMonth, setAssignedBudgetMonth] = useState<string>(currentMonth);
  const [assignedBudgetYear, setAssignedBudgetYear] = useState<number>(currentYear);
  const [details, setDetails] = useState("");
  const [amountStr, setAmountStr] = useState("");
  const [slipItems, setSlipItems] = useState<SlipItem[]>([]);
  const [previewModalItem, setPreviewModalItem] = useState<SlipItem | null>(null);
  const [dragActive, setDragActive] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Clean up blob URLs
  const cleanUpBlobs = (items: SlipItem[]) => {
    items.forEach((item) => {
      if (item.previewUrl && item.previewUrl.startsWith("blob:")) {
        URL.revokeObjectURL(item.previewUrl);
      }
    });
  };

  const currentRealMonth = format(new Date(), "MMMM");
  const currentRealYear = new Date().getFullYear();

  // ONLY Available budget months assigned by admin for activeEntity
  const entityBudgets = useMemo(() => {
    return budgets.filter((b) => b.entity === activeEntity);
  }, [budgets, activeEntity]);

  // Generate budget options ONLY from admin assigned budgets
  const budgetOptions = useMemo(() => {
    return entityBudgets.map((b) => ({
      month: b.month,
      year: b.year,
      key: `${b.month}_${b.year}`,
      label: `${b.month} ${b.year} (Allocated: Rs. ${b.amount.toLocaleString()})`,
      shortLabel: `${b.month} ${b.year}`,
      amount: b.amount,
    }));
  }, [entityBudgets]);

  // Reset form when modal opens/closes
  const resetForm = () => {
    setDate(new Date());
    // By default select the current month if passed by admin, otherwise latest passed budget
    const hasCurrentMonth = entityBudgets.find(
      (b) => b.month.toLowerCase() === currentRealMonth.toLowerCase() && b.year === currentRealYear
    );
    if (hasCurrentMonth) {
      setAssignedBudgetMonth(hasCurrentMonth.month);
      setAssignedBudgetYear(hasCurrentMonth.year);
    } else if (entityBudgets.length > 0) {
      setAssignedBudgetMonth(entityBudgets[0].month);
      setAssignedBudgetYear(entityBudgets[0].year);
    } else {
      setAssignedBudgetMonth(currentRealMonth);
      setAssignedBudgetYear(currentRealYear);
    }
    setDetails("");
    setAmountStr("");
    cleanUpBlobs(slipItems);
    setSlipItems([]);
    setPreviewModalItem(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  useEffect(() => {
    if (open) {
      resetForm();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, activeEntity]);

  // Live Budget calculations for the chosen assignedBudgetMonth & assignedBudgetYear
  const totalBudget = getEntityBudget(activeEntity, assignedBudgetMonth, assignedBudgetYear);

  const totalSpent = groceryEntries
    .filter((entry) => {
      if (entry.entity !== activeEntity) return false;
      let eMonth = entry.budgetMonth;
      let eYear = entry.budgetYear;
      if (!eMonth && entry.date) {
        try {
          const d = new Date(entry.date);
          if (!isNaN(d.getTime())) {
            eMonth = ALL_MONTHS[d.getMonth()];
            eYear = d.getFullYear();
          }
        } catch (e) {}
      }
      return (
        (eMonth || '').toLowerCase() === assignedBudgetMonth.toLowerCase() &&
        (eYear || currentYear) === assignedBudgetYear
      );
    })
    .reduce((sum, entry) => sum + entry.amount, 0);

  const remainingBalance = totalBudget - totalSpent;
  const newAmount = parseFloat(amountStr) || 0;
  const remainingAfterSave = remainingBalance - newAmount;
  const isOverBudget = remainingAfterSave < 0;

  // File Upload Handlers (Up to 10 slips, 30MB for PDF)
  const handleFiles = (incomingFiles: File[]) => {
    if (!incomingFiles || incomingFiles.length === 0) return;

    const availableSlots = 10 - slipItems.length;
    if (availableSlots <= 0) {
      toast.error("Maximum 10 slips limit reached per grocery entry.");
      return;
    }

    if (incomingFiles.length > availableSlots) {
      toast.warning(`Only first ${availableSlots} files added (Maximum 10 slips limit).`);
    }

    const filesToProcess = incomingFiles.slice(0, availableSlots);
    const newItems: SlipItem[] = [];

    for (const file of filesToProcess) {
      const isPdf = file.type === "application/pdf" || file.name.toLowerCase().endsWith(".pdf");
      const isImage = file.type.startsWith("image/");

      if (!isPdf && !isImage) {
        toast.error(`"${file.name}" is unsupported. Please upload JPG, PNG, WEBP, or PDF files.`);
        continue;
      }

      // Max size: 30MB for PDF, 10MB for images
      const maxSize = isPdf ? 30 * 1024 * 1024 : 10 * 1024 * 1024;
      if (file.size > maxSize) {
        toast.error(`"${file.name}" exceeds the ${isPdf ? "30MB" : "10MB"} limit.`);
        continue;
      }

      const previewUrl = URL.createObjectURL(file);
      const sizeStr = (file.size / (1024 * 1024)).toFixed(2) + " MB";

      newItems.push({
        id: `slip-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
        file,
        previewUrl,
        name: file.name,
        size: sizeStr,
        isPdf,
      });
    }

    if (newItems.length > 0) {
      setSlipItems((prev) => [...prev, ...newItems]);
      toast.success(`${newItems.length} slip(s) added.`);
    }

    if (fileInputRef.current) fileInputRef.current.value = "";
  };

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
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFiles(Array.from(e.dataTransfer.files));
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      handleFiles(Array.from(e.target.files));
    }
  };

  const handleRemoveSlip = (id: string) => {
    setSlipItems((prev) => {
      const target = prev.find((item) => item.id === id);
      if (target && target.previewUrl.startsWith("blob:")) {
        URL.revokeObjectURL(target.previewUrl);
      }
      return prev.filter((item) => item.id !== id);
    });
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
      const status: SlipStatus = slipItems.length > 0 ? "Slip Uploaded" : "Slip Missing";

      await addGroceryEntry({
        date: format(date, "yyyy-MM-dd"),
        budgetMonth: assignedBudgetMonth,
        budgetYear: assignedBudgetYear,
        details: details.trim(),
        amount: newAmount,
        status,
        slipFiles: slipItems.map((item) => item.file),
      });

      toast.success(`Grocery expense of Rs. ${newAmount.toLocaleString()} added for ${assignedBudgetMonth} ${assignedBudgetYear} with ${slipItems.length} slip(s).`);
      onOpenChange(false);
      resetForm();
    } catch (err) {
      console.error(err);
      toast.error("Unable to save grocery.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <>
      <Dialog
        open={open}
        onOpenChange={(v) => {
          if (!v) resetForm();
          onOpenChange(v);
        }}
      >
        <DialogContent className="sm:max-w-4xl w-[95vw] bg-white p-5 md:p-7 rounded-2xl ring-1 ring-black/5 shadow-2xl max-h-[92vh] overflow-y-auto">
          <DialogHeader className="pb-3 border-b border-gray-100">
            <DialogTitle className="text-lg md:text-xl font-bold text-gray-900">Add Grocery Expense</DialogTitle>
            <DialogDescription className="text-xs md:text-sm text-gray-500">
              Record a new grocery expense for {activeEntity} Entity with up to 10 supporting receipt slips (PDFs up to 30MB).
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="grid grid-cols-1 lg:grid-cols-12 gap-6 mt-4 items-start">
            {/* Left Inputs Section (7 Columns) */}
            <div className="lg:col-span-7 space-y-4">
              {/* Assign Budget Month Selector */}
              <div className="flex flex-col gap-1.5 p-3 rounded-xl bg-emerald-50/50 border border-emerald-100/80">
                <div className="flex items-center justify-between">
                  <Label htmlFor="assign-budget-month" className="text-xs font-bold text-emerald-900 flex items-center gap-1.5">
                    ASSIGN BUDGET MONTH *
                  </Label>
                  <span className="text-[10px] text-emerald-700 font-medium">
                    Calculated against this budget
                  </span>
                </div>
                <Select
                  value={`${assignedBudgetMonth}_${assignedBudgetYear}`}
                  onValueChange={(val) => {
                    if (val) {
                      const [m, y] = (val as string).split('_');
                      setAssignedBudgetMonth(m);
                      setAssignedBudgetYear(parseInt(y, 10));
                    }
                  }}
                >
                  <SelectTrigger id="assign-budget-month" className="h-10 border-emerald-200 text-xs font-semibold bg-white focus:border-emerald-500 focus:ring-emerald-500">
                    <SelectValue placeholder="Select Budget Month" />
                  </SelectTrigger>
                  <SelectContent className="bg-white border-gray-200">
                    {budgetOptions.length === 0 ? (
                      <SelectItem value="none" disabled className="text-xs text-gray-400">
                        No budget assigned yet by Admin for {activeEntity}
                      </SelectItem>
                    ) : (
                      budgetOptions.map((opt) => (
                        <SelectItem key={opt.key} value={opt.key} className="text-xs font-medium cursor-pointer">
                          {opt.label}
                        </SelectItem>
                      ))
                    )}
                  </SelectContent>
                </Select>
                <p className="text-[10px] text-gray-500 mt-0.5">
                  Admin assigned budgets for {activeEntity}. Expense will be recorded and calculated under the selected month.
                </p>
              </div>

              {/* Date & Amount Row */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Date */}
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="date" className="text-xs font-semibold text-gray-700">TRANSACTION / BILL DATE *</Label>
                  <Popover>
                    <PopoverTrigger
                      render={
                        <Button
                          variant="outline"
                          className={cn(
                            "w-full h-10 px-3 justify-start text-left font-medium text-xs border-gray-200 hover:bg-gray-50",
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

                {/* Amount */}
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="amount" className="text-xs font-semibold text-gray-700">AMOUNT (RS.) *</Label>
                  <div className="relative">
                    <span className="absolute left-3 top-2.5 text-xs text-gray-400 font-semibold">Rs.</span>
                    <Input
                      id="amount"
                      type="number"
                      step="any"
                      value={amountStr}
                      onChange={(e) => setAmountStr(e.target.value)}
                      placeholder="0.00"
                      className="pl-9 h-10 text-xs font-semibold border-gray-200 focus:border-emerald-500 focus:ring-emerald-500"
                      required
                    />
                  </div>
                </div>
              </div>

              {/* Details */}
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="details" className="text-xs font-semibold text-gray-700">GROCERY DETAILS *</Label>
                <Textarea
                  id="details"
                  value={details}
                  onChange={(e) => setDetails(e.target.value)}
                  placeholder="e.g. Cooking oil, rice, sugar, tea, vegetables, dish soap, household supplies"
                  className="min-h-20 text-xs resize-none border-gray-200 focus:border-emerald-500 focus:ring-emerald-500"
                  required
                />
              </div>

              {/* Slip Upload Area (Supports Up to 10 Slips, 30MB PDF limit) */}
              <div className="flex flex-col gap-1.5 pt-1">
                <div className="flex items-center justify-between">
                  <Label className="text-xs font-semibold text-gray-700">
                    SUPPORTING SLIPS / RECEIPTS ({slipItems.length}/10)
                  </Label>
                  <span className="text-[11px] text-gray-400 font-medium">
                    PDF (up to 30MB) • JPG / PNG (up to 10MB)
                  </span>
                </div>

                {slipItems.length < 10 && (
                  <div
                    onDragEnter={handleDrag}
                    onDragOver={handleDrag}
                    onDragLeave={handleDrag}
                    onDrop={handleDrop}
                    className={cn(
                      "border-2 border-dashed rounded-xl p-4 flex flex-col items-center justify-center text-center cursor-pointer transition-all duration-150 bg-slate-50/50 hover:bg-slate-50",
                      dragActive ? "border-emerald-500 bg-emerald-50/50" : "border-gray-200 hover:border-gray-300"
                    )}
                  >
                    <input
                      ref={fileInputRef}
                      type="file"
                      id="grocery-file-upload"
                      multiple
                      onChange={handleFileChange}
                      accept="image/png, image/jpeg, image/webp, application/pdf"
                      className="hidden"
                    />
                    <label htmlFor="grocery-file-upload" className="cursor-pointer flex flex-col items-center gap-1.5 w-full">
                      <div className="size-9 rounded-full bg-emerald-50 flex items-center justify-center text-emerald-600 shadow-2xs">
                        <UploadIcon className="size-4.5" />
                      </div>
                      <span className="text-xs font-bold text-gray-800">
                        Upload Slips (Click or Drag & Drop)
                      </span>
                      <span className="text-[10px] text-gray-500">
                        Attach up to 10 slips • PDFs up to 30MB supported with instant live preview
                      </span>
                    </label>
                  </div>
                )}

                {/* Pre-Save Uploaded Slips Gallery */}
                {slipItems.length > 0 && (
                  <div className="space-y-2 pt-2">
                    <div className="flex items-center justify-between text-[11px] text-gray-500 font-semibold px-0.5">
                      <span>Attached Slips ({slipItems.length})</span>
                      <span className="text-emerald-600">Click &quot;Preview&quot; to inspect before saving</span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-56 overflow-y-auto pr-1">
                      {slipItems.map((item, index) => (
                        <div
                          key={item.id}
                          className="flex items-center gap-2.5 p-2 rounded-lg border border-gray-200 bg-white hover:border-emerald-300 transition-all shadow-2xs group"
                        >
                          {/* Thumbnail / Icon */}
                          <div
                            onClick={() => setPreviewModalItem(item)}
                            className="size-11 rounded-md bg-slate-100 border border-gray-100 flex items-center justify-center overflow-hidden shrink-0 cursor-pointer relative"
                            title="Click to preview"
                          >
                            {item.isPdf ? (
                              <div className="flex flex-col items-center justify-center text-red-500">
                                <FileTextIcon className="size-5" />
                                <span className="text-[8px] font-bold mt-0.5">PDF</span>
                              </div>
                            ) : (
                              // eslint-disable-next-line @next/next/no-img-element
                              <img
                                src={item.previewUrl}
                                alt={item.name}
                                className="w-full h-full object-cover"
                              />
                            )}
                            <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                              <EyeIcon className="size-3.5 text-white" />
                            </div>
                          </div>

                          {/* File Details */}
                          <div className="flex-1 min-w-0">
                            <p className="text-xs font-semibold text-gray-800 truncate" title={item.name}>
                              #{index + 1}. {item.name}
                            </p>
                            <div className="flex items-center gap-1.5 mt-0.5">
                              <Badge className={cn("text-[9px] px-1.5 py-0 h-4 border-none font-bold", item.isPdf ? "bg-red-100 text-red-700" : "bg-emerald-100 text-emerald-700")}>
                                {item.isPdf ? "PDF" : "IMAGE"}
                              </Badge>
                              <span className="text-[10px] text-gray-400 font-medium">{item.size}</span>
                            </div>
                          </div>

                          {/* Action Buttons */}
                          <div className="flex items-center gap-1 shrink-0">
                            <Button
                              type="button"
                              size="icon-xs"
                              variant="ghost"
                              onClick={() => setPreviewModalItem(item)}
                              className="h-7 w-7 text-gray-500 hover:text-emerald-600 hover:bg-emerald-50 rounded-md"
                              title="Preview Slip"
                            >
                              <EyeIcon className="size-3.5" />
                            </Button>
                            <Button
                              type="button"
                              size="icon-xs"
                              variant="ghost"
                              onClick={() => handleRemoveSlip(item.id)}
                              className="h-7 w-7 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-md"
                              title="Remove Slip"
                            >
                              <Trash2Icon className="size-3.5" />
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Right Live Summary Section (5 Columns) */}
            <div className="lg:col-span-5 flex flex-col justify-between space-y-4">
              <Card className="border-gray-200 bg-slate-50/60 shadow-none">
                <CardContent className="p-4 space-y-3.5">
                  <h3 className="text-xs font-bold text-gray-900 uppercase tracking-wider flex items-center justify-between">
                    <span>Live Budget Status</span>
                    <Badge variant="outline" className="bg-emerald-50 border-emerald-200 text-emerald-700 text-[10px] font-bold">
                      {assignedBudgetMonth} {assignedBudgetYear}
                    </Badge>
                  </h3>

                  <div className="space-y-2 text-xs font-medium text-gray-600">
                    <div className="flex justify-between">
                      <span>Monthly Budget ({activeEntity}):</span>
                      <span className="font-semibold text-gray-900">Rs. {totalBudget.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Assigned Month Spent:</span>
                      <span className="font-semibold text-gray-900">Rs. {totalSpent.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between text-emerald-700">
                      <span>Current Remaining Balance:</span>
                      <span className="font-bold">Rs. {remainingBalance.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between text-gray-900 border-t border-gray-200/80 pt-2 font-semibold">
                      <span>New Expense Amount:</span>
                      <span className="text-emerald-600 font-bold">
                        Rs. {newAmount.toLocaleString()}
                      </span>
                    </div>
                  </div>

                  <div className="border-t border-gray-200 pt-2.5 flex justify-between items-center">
                    <span className="text-xs font-bold text-gray-900">BALANCE AFTER SAVE</span>
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
                    <Alert className="bg-red-50 border-red-200 text-red-800 p-2.5 rounded-lg flex items-start gap-2 shadow-2xs">
                      <AlertTriangleIcon className="size-4 shrink-0 mt-0.5 text-red-600" />
                      <AlertDescription className="text-[11px] leading-snug">
                        <strong>Over Budget:</strong> This expense exceeds the allocated budget limit for {activeEntity}.
                      </AlertDescription>
                    </Alert>
                  )}
                </CardContent>
              </Card>

              {/* Form Action Buttons */}
              <div className="flex gap-2.5 pt-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    resetForm();
                    onOpenChange(false);
                  }}
                  className="flex-1 h-10 border-gray-200 hover:bg-gray-50 text-gray-700 text-xs font-semibold"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={isSubmitting}
                  className="flex-1 h-10 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs shadow-sm transition-colors"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2Icon className="size-4 mr-2 animate-spin" />
                      Saving ({slipItems.length} slips)...
                    </>
                  ) : (
                    `Save Grocery (${slipItems.length} slips)`
                  )}
                </Button>
              </div>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Pre-Save Full Instant Preview Modal (Image Lightbox & Embedded PDF Viewer) */}
      {previewModalItem && (
        <Dialog open={!!previewModalItem} onOpenChange={(v) => !v && setPreviewModalItem(null)}>
          <DialogContent className="sm:max-w-3xl w-[95vw] bg-white p-5 rounded-2xl shadow-2xl border border-gray-100 max-h-[92vh] flex flex-col">
            <DialogHeader className="pb-3 border-b border-gray-100 flex flex-row items-center justify-between">
              <div>
                <DialogTitle className="text-sm md:text-base font-bold text-gray-900 flex items-center gap-2">
                  {previewModalItem.isPdf ? (
                    <FileTextIcon className="size-4.5 text-red-500" />
                  ) : (
                    <ImageIcon className="size-4.5 text-emerald-600" />
                  )}
                  {previewModalItem.name}
                </DialogTitle>
                <DialogDescription className="text-xs text-gray-500">
                  Pre-save preview ({previewModalItem.size}) • Ready to save
                </DialogDescription>
              </div>
              <a
                href={previewModalItem.previewUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-xs text-emerald-600 hover:text-emerald-700 font-semibold px-2.5 py-1 rounded-md bg-emerald-50 border border-emerald-100"
              >
                <ExternalLinkIcon className="size-3.5" />
                Open Full Window
              </a>
            </DialogHeader>

            <div className="flex-1 min-h-[400px] max-h-[65vh] overflow-auto bg-slate-900/5 rounded-xl border border-gray-200 p-2 flex items-center justify-center relative my-2">
              {previewModalItem.isPdf ? (
                <iframe
                  src={previewModalItem.previewUrl}
                  title={previewModalItem.name}
                  className="w-full h-[60vh] rounded-lg border-none bg-white shadow-inner"
                />
              ) : (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={previewModalItem.previewUrl}
                  alt={previewModalItem.name}
                  className="max-h-[60vh] w-auto max-w-full object-contain rounded-lg shadow-sm"
                />
              )}
            </div>

            <DialogFooter className="pt-2 border-t border-gray-100 flex justify-between sm:justify-between items-center">
              <span className="text-xs text-gray-500 font-medium">
                {previewModalItem.isPdf ? "Interactive PDF Reader" : "Image Slip Preview"}
              </span>
              <Button
                type="button"
                variant="outline"
                onClick={() => setPreviewModalItem(null)}
                className="h-9 px-4 text-xs font-semibold border-gray-200"
              >
                Close Preview
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </>
  );
}
