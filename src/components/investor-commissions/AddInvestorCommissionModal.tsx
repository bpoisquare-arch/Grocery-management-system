"use client";

import React, { useState, useEffect, useRef } from "react";
import { format } from "date-fns";
import {
  CalendarIcon,
  UploadIcon,
  AlertTriangleIcon,
  Loader2Icon,
  FileTextIcon,
  EyeIcon,
  Trash2Icon,
  XIcon,
  CheckCircle2Icon,
  CalculatorIcon,
} from "lucide-react";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { InvestorCommissionEntry } from "@/lib/investorCommissionsTypes";

interface AddInvestorCommissionModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onAdd: (data: any) => Promise<any>;
  checkDuplicatePassport: (passportNo: string) => { isDuplicate: boolean; existingEntry?: InvestorCommissionEntry };
}

interface SlipItem {
  id: string;
  file: File;
  previewUrl: string;
  name: string;
  size: string;
  isPdf: boolean;
}

export function AddInvestorCommissionModal({
  open,
  onOpenChange,
  onAdd,
  checkDuplicatePassport,
}: AddInvestorCommissionModalProps) {
  const [studentName, setStudentName] = useState("");
  const [passportNo, setPassportNo] = useState("");
  const [date, setDate] = useState<Date | undefined>(new Date());
  const [amountStr, setAmountStr] = useState("100000");
  const [receivableRateStr, setReceivableRateStr] = useState("4");
  const [payableRateStr, setPayableRateStr] = useState("0");
  const [statementDaysStr, setStatementDaysStr] = useState("");
  const [accountNo, setAccountNo] = useState("");
  const [reimbursed, setReimbursed] = useState("No");
  const [notes, setNotes] = useState("");
  const [slipItems, setSlipItems] = useState<SlipItem[]>([]);
  const [previewModalItem, setPreviewModalItem] = useState<SlipItem | null>(null);
  const [dragActive, setDragActive] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Auto-calculated Receivable, Payable & EdLink Commission Amounts
  const parsedAmount = parseFloat(amountStr) || 0;
  const parsedRecRate = parseFloat(receivableRateStr) >= 0 ? parseFloat(receivableRateStr) : 0;
  const calculatedReceivableAmount = Math.round((parsedAmount * (parsedRecRate / 100)) * 100) / 100;

  const parsedPayRate = parseFloat(payableRateStr) >= 0 ? parseFloat(payableRateStr) : 0;
  const calculatedPayableAmount = Math.round((parsedAmount * (parsedPayRate / 100)) * 100) / 100;

  const calculatedEdlinkCommission = Math.round((calculatedReceivableAmount - calculatedPayableAmount) * 100) / 100;

  // Real-time duplicate check
  const duplicateStatus = checkDuplicatePassport(passportNo);

  const cleanUpBlobs = (items: SlipItem[]) => {
    items.forEach((item) => {
      if (item.previewUrl && item.previewUrl.startsWith("blob:")) {
        URL.revokeObjectURL(item.previewUrl);
      }
    });
  };

  const resetForm = () => {
    setStudentName("");
    setPassportNo("");
    setDate(new Date());
    setAmountStr("100000");
    setReceivableRateStr("4");
    setPayableRateStr("0");
    setStatementDaysStr("");
    setAccountNo("");
    setReimbursed("No");
    setNotes("");
    cleanUpBlobs(slipItems);
    setSlipItems([]);
    setPreviewModalItem(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  useEffect(() => {
    if (!open) {
      resetForm();
    }
  }, [open]);

  // Global Ctrl + V Paste Listener when modal is open
  useEffect(() => {
    if (!open) return;

    const handlePaste = (e: ClipboardEvent) => {
      // Don't intercept if user is typing text in input/textarea
      const target = e.target as HTMLElement;
      if (
        target &&
        (target.tagName === "INPUT" || target.tagName === "TEXTAREA") &&
        e.clipboardData?.getData("text")
      ) {
        return;
      }

      const items = e.clipboardData?.items;
      if (!items) return;

      const filesToAdd: File[] = [];
      for (let i = 0; i < items.length; i++) {
        const item = items[i];
        if (item.type.indexOf("image") !== -1 || item.type === "application/pdf") {
          const file = item.getAsFile();
          if (file) {
            let fileName = file.name;
            if (!fileName || fileName === "image.png") {
              const ext = file.type === "application/pdf" ? "pdf" : "png";
              fileName = `Investor_Slip_Pasted_${Date.now()}.${ext}`;
            }
            const renamedFile = new File([file], fileName, { type: file.type });
            filesToAdd.push(renamedFile);
          }
        }
      }

      if (filesToAdd.length > 0) {
        e.preventDefault();
        addFiles(filesToAdd);
        toast.success(`Attached ${filesToAdd.length} item(s) from clipboard (Ctrl+V).`);
      }
    };

    window.addEventListener("paste", handlePaste);
    return () => window.removeEventListener("paste", handlePaste);
  }, [open, slipItems.length]);

  const addFiles = (files: File[]) => {
    if (slipItems.length + files.length > 10) {
      toast.error("You can attach up to 10 slips maximum.");
      return;
    }

    const newItems: SlipItem[] = [];
    for (const file of files) {
      const isPdf = file.type === "application/pdf" || file.name.endsWith(".pdf");
      const isImage = file.type.startsWith("image/");

      if (!isPdf && !isImage) {
        toast.error(`"${file.name}" is not supported. Please upload JPG, PNG, WEBP, or PDF.`);
        continue;
      }

      if (file.size > 20 * 1024 * 1024) {
        toast.error(`"${file.name}" exceeds 20MB limit.`);
        continue;
      }

      const previewUrl = URL.createObjectURL(file);
      const sizeMb = (file.size / (1024 * 1024)).toFixed(2);
      const sizeStr = parseFloat(sizeMb) < 0.1 ? `${Math.round(file.size / 1024)} KB` : `${sizeMb} MB`;

      newItems.push({
        id: `slip-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
        file,
        previewUrl,
        name: file.name,
        size: sizeStr,
        isPdf,
      });
    }

    setSlipItems((prev) => [...prev, ...newItems]);
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      addFiles(Array.from(e.target.files));
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const handleRemoveItem = (id: string, e?: React.MouseEvent) => {
    e?.stopPropagation();
    setSlipItems((prev) => {
      const target = prev.find((i) => i.id === id);
      if (target && target.previewUrl.startsWith("blob:")) {
        URL.revokeObjectURL(target.previewUrl);
      }
      return prev.filter((i) => i.id !== id);
    });
  };

  // Drag and Drop
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
      addFiles(Array.from(e.dataTransfer.files));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmedName = studentName.trim();
    const trimmedPassport = passportNo.trim().toUpperCase();

    if (!trimmedName) {
      toast.error("Please enter student name.");
      return;
    }
    if (!trimmedPassport) {
      toast.error("Please enter passport number.");
      return;
    }

    if (duplicateStatus.isDuplicate) {
      toast.error(
        `Passport "${trimmedPassport}" already exists in records for ${duplicateStatus.existingEntry?.studentName}.`
      );
      return;
    }

    if (!date) {
      toast.error("Please select a date.");
      return;
    }

    if (isNaN(parsedAmount) || parsedAmount < 0) {
      toast.error("Please enter a valid amount.");
      return;
    }

    setIsSubmitting(true);
    try {
      const files = slipItems.map((item) => item.file);

      await onAdd({
        studentName: trimmedName,
        passportNo: trimmedPassport,
        date: format(date, "yyyy-MM-dd"),
        amount: parsedAmount,
        commissionRate: parsedRecRate,
        investorCommission: calculatedReceivableAmount,
        receivableCommissionRate: parsedRecRate,
        receivableAmount: calculatedReceivableAmount,
        payableCommissionRate: parsedPayRate,
        payableAmount: calculatedPayableAmount,
        edlinkCommission: calculatedEdlinkCommission,
        statementDays: statementDaysStr ? parseInt(statementDaysStr, 10) : undefined,
        accountNo: accountNo.trim() || undefined,
        reimbursed,
        slipFiles: files,
        notes: notes.trim() || undefined,
      });

      onOpenChange(false);
    } catch (err: any) {
      // Error handled by store
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-4xl lg:max-w-[960px] w-[96vw] bg-white p-4 sm:p-5 rounded-2xl ring-1 ring-black/5 shadow-2xl max-h-[96vh] flex flex-col overflow-hidden">
          <DialogHeader className="pb-2 border-b border-gray-100 pr-8 sm:pr-10 shrink-0">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1.5">
              <div>
                <DialogTitle className="text-base sm:text-lg md:text-xl font-bold text-gray-900">
                  Add Investor Commission Entry
                </DialogTitle>
                <DialogDescription className="text-xs text-gray-500 mt-0.5">
                  Record student fee and auto-calculate investor commission percentage.
                </DialogDescription>
              </div>
              <Badge
                variant="outline"
                className={cn(
                  "font-bold text-xs px-2.5 py-0.5 w-fit shrink-0",
                  slipItems.length > 0
                    ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                    : "bg-rose-50 text-rose-700 border-rose-200"
                )}
              >
                ● {slipItems.length > 0 ? "Slip Attached" : "Slip Missing"}
              </Badge>
            </div>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto overflow-x-hidden space-y-2.5 sm:space-y-3 py-1.5 pr-0.5">
            {/* Row 1: Student Name, Passport No. & Date */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 sm:gap-3">
              {/* Student Name */}
              <div className="space-y-1">
                <Label className="text-[11px] sm:text-xs font-bold text-gray-700 flex items-center gap-1">
                  <span>STUDENT NAME</span>
                  <span className="text-rose-500">*</span>
                </Label>
                <Input
                  required
                  placeholder="e.g. M Mohsin Wakeel"
                  value={studentName}
                  onChange={(e) => setStudentName(e.target.value)}
                  className="h-9 text-xs font-medium border-gray-200 focus:border-emerald-500"
                />
              </div>

              {/* Passport No. with Real-time Duplicate Warning */}
              <div className="space-y-1">
                <Label className="text-[11px] sm:text-xs font-bold text-gray-700 flex items-center gap-1">
                  <span>PASSPORT NO.</span>
                  <span className="text-rose-500">*</span>
                </Label>
                <div className="relative">
                  <Input
                    required
                    placeholder="E.G.  AU6309431"
                    value={passportNo}
                    onChange={(e) => setPassportNo(e.target.value.toUpperCase())}
                    className={cn(
                      "h-9 font-mono text-xs font-bold uppercase tracking-wider border-gray-200",
                      duplicateStatus.isDuplicate
                        ? "border-rose-500 bg-rose-50/40 text-rose-900 focus:border-rose-600 focus:ring-rose-500"
                        : passportNo.trim()
                        ? "border-emerald-500/70 bg-emerald-50/20 text-emerald-950"
                        : ""
                    )}
                  />
                  {duplicateStatus.isDuplicate ? (
                    <AlertTriangleIcon className="absolute right-3 top-1/2 -translate-y-1/2 size-4 text-rose-600" />
                  ) : passportNo.trim() ? (
                    <CheckCircle2Icon className="absolute right-3 top-1/2 -translate-y-1/2 size-4 text-emerald-600" />
                  ) : null}
                </div>

                {/* Duplicate passport alert notice */}
                {duplicateStatus.isDuplicate && duplicateStatus.existingEntry && (
                  <div className="p-2 rounded-lg bg-rose-50 border border-rose-200 text-rose-800 text-[11px] flex items-start gap-2 animate-in fade-in duration-200">
                    <AlertTriangleIcon className="size-3.5 shrink-0 text-rose-600 mt-0.5" />
                    <div>
                      <span className="font-bold">Duplicate Detected! </span>
                      Existing: <span className="font-bold">{duplicateStatus.existingEntry.studentName}</span> (S.No: #{duplicateStatus.existingEntry.srNo}, Date: {duplicateStatus.existingEntry.date}).
                    </div>
                  </div>
                )}
              </div>

              {/* Date */}
              <div className="space-y-1">
                <Label className="text-[11px] sm:text-xs font-bold text-gray-700 flex items-center gap-1">
                  <span>DATE</span>
                  <span className="text-rose-500">*</span>
                </Label>
                <Popover>
                  <PopoverTrigger
                    render={
                      <Button
                        type="button"
                        variant="outline"
                        className={cn(
                          "w-full h-9 justify-start text-left font-medium text-xs border-gray-200 bg-white truncate px-2.5 sm:px-3",
                          !date && "text-gray-400"
                        )}
                      >
                        <CalendarIcon className="mr-1.5 size-3.5 text-gray-500 shrink-0" />
                        <span className="truncate">{date ? format(date, "dd/MM/yyyy") : "Select date"}</span>
                      </Button>
                    }
                  />
                  <PopoverContent className="w-auto p-0 bg-white border-gray-200" align="start">
                    <Calendar mode="single" selected={date} onSelect={setDate} />
                  </PopoverContent>
                </Popover>
              </div>
            </div>

            {/* Row 2: Amount, Receivable Comm. % & Receivable Amount */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 sm:gap-3">
              {/* Amount (Rs.) */}
              <div className="space-y-1">
                <Label className="text-[11px] sm:text-xs font-bold text-gray-700 flex items-center gap-1">
                  <span>AMOUNT (RS.)</span>
                  <span className="text-rose-500">*</span>
                </Label>
                <Input
                  required
                  type="number"
                  min="0"
                  step="any"
                  placeholder="100000"
                  value={amountStr}
                  onChange={(e) => setAmountStr(e.target.value)}
                  className="h-9 text-xs font-extrabold text-gray-900 border-gray-200"
                />
              </div>

              {/* Receivable Commission % */}
              <div className="space-y-1">
                <Label className="text-[11px] sm:text-xs font-bold text-gray-700 flex items-center gap-1">
                  <span className="truncate">RECEIVABLE COMM. %</span>
                  <span className="text-rose-500">*</span>
                </Label>
                <div className="relative">
                  <Input
                    required
                    type="number"
                    min="0"
                    max="100"
                    step="any"
                    placeholder="4"
                    value={receivableRateStr}
                    onChange={(e) => setReceivableRateStr(e.target.value)}
                    className="h-9 text-xs font-extrabold text-emerald-800 border-gray-200 pr-7"
                  />
                  <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-xs font-bold text-gray-400">
                    %
                  </span>
                </div>
              </div>

              {/* Receivable Amount (Auto-Calculated - Non-Editable) */}
              <div className="space-y-1">
                <Label className="text-[11px] sm:text-xs font-bold text-emerald-800 flex items-center gap-1 truncate">
                  <CalculatorIcon className="size-3 text-emerald-600 shrink-0" />
                  <span className="truncate">RECEIVABLE AMOUNT</span>
                </Label>
                <div className="h-9 px-2.5 sm:px-3 flex items-center bg-emerald-50/80 border border-emerald-300 rounded-md text-xs font-extrabold text-emerald-950 select-none shadow-2xs">
                  <span className="truncate">Rs. {calculatedReceivableAmount.toLocaleString()}</span>
                </div>
              </div>
            </div>

            {/* Row 3: Payable Comm. %, Payable Amount & EdLink Comm */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 sm:gap-3">
              {/* Payable Commission % */}
              <div className="space-y-1">
                <Label className="text-[11px] sm:text-xs font-bold text-gray-700 flex items-center gap-1">
                  <span className="truncate">PAYABLE COMM. %</span>
                </Label>
                <div className="relative">
                  <Input
                    type="number"
                    min="0"
                    max="100"
                    step="any"
                    placeholder="0"
                    value={payableRateStr}
                    onChange={(e) => setPayableRateStr(e.target.value)}
                    className="h-9 text-xs font-extrabold text-blue-800 border-gray-200 pr-7"
                  />
                  <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-xs font-bold text-gray-400">
                    %
                  </span>
                </div>
              </div>

              {/* Payable Amount (Auto-Calculated - Non-Editable) */}
              <div className="space-y-1">
                <Label className="text-[11px] sm:text-xs font-bold text-blue-800 flex items-center gap-1 truncate">
                  <CalculatorIcon className="size-3 text-blue-600 shrink-0" />
                  <span className="truncate">PAYABLE AMOUNT</span>
                </Label>
                <div className="h-9 px-2.5 sm:px-3 flex items-center bg-blue-50/80 border border-blue-200 rounded-md text-xs font-extrabold text-blue-950 select-none shadow-2xs">
                  <span className="truncate">Rs. {calculatedPayableAmount.toLocaleString()}</span>
                </div>
              </div>

              {/* EdLink Comm (Auto-Calculated Difference - Non-Editable) */}
              <div className="space-y-1">
                <Label className="text-[11px] sm:text-xs font-bold text-purple-900 flex items-center gap-1 truncate">
                  <CalculatorIcon className="size-3 text-purple-600 shrink-0" />
                  <span className="truncate">EDLINK COMM</span>
                </Label>
                <div className="h-9 px-2.5 sm:px-3 flex items-center bg-purple-50/80 border border-purple-200 rounded-md text-xs font-extrabold text-purple-950 select-none shadow-2xs">
                  <span className="truncate">Rs. {calculatedEdlinkCommission.toLocaleString()}</span>
                </div>
              </div>
            </div>

            {/* Row 4: Statement Days, Account Number & Paid to Investor */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 sm:gap-3">
              {/* Statement Days */}
              <div className="space-y-1">
                <Label className="text-[11px] sm:text-xs font-bold text-gray-700 flex items-center gap-1">
                  <span>STATEMENT DAYS</span>
                </Label>
                <Input
                  type="number"
                  min="0"
                  placeholder="e.g. 30"
                  value={statementDaysStr}
                  onChange={(e) => setStatementDaysStr(e.target.value)}
                  className="h-9 text-xs font-medium border-gray-200"
                />
              </div>

              {/* Account Number (Optional) */}
              <div className="space-y-1">
                <Label className="text-[11px] sm:text-xs font-bold text-gray-700 flex items-center justify-between">
                  <span>ACCOUNT NUMBER</span>
                  <span className="text-[10px] font-normal text-gray-400">Optional</span>
                </Label>
                <Input
                  placeholder="e.g. 012345678901 (Bank / Account Title)"
                  value={accountNo}
                  onChange={(e) => setAccountNo(e.target.value)}
                  className="h-9 font-mono text-xs font-medium border-gray-200"
                />
              </div>

              {/* Paid to Investor */}
              <div className="space-y-1">
                <Label className="text-[11px] sm:text-xs font-bold text-gray-700">
                  PAID TO INVESTOR
                </Label>
                <Select value={reimbursed} onValueChange={(val) => { if (val) setReimbursed(val); }}>
                  <SelectTrigger className="h-9 text-xs font-semibold bg-white border-gray-200 w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-white border-gray-200">
                    <SelectItem value="No" className="text-xs font-semibold text-amber-700">No (Pending)</SelectItem>
                    <SelectItem value="Yes" className="text-xs font-semibold text-emerald-700">Yes (Paid)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Row 5: Slip Upload Area (Height increased as requested) */}
            <div className="space-y-1.5 pt-0.5">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                <Label className="text-[11px] sm:text-xs font-bold text-gray-700">
                  SLIP / RECEIPT DOCUMENT ({slipItems.length}/10)
                </Label>
                <span className="text-[10px] text-gray-400">
                  Image (JPG/PNG) or PDF • Paste with <kbd className="px-1 py-0.5 bg-slate-100 border border-gray-300 rounded text-[9px] font-bold text-gray-700">Ctrl + V</kbd>
                </span>
              </div>

              <input
                ref={fileInputRef}
                type="file"
                multiple
                accept="image/*,application/pdf"
                className="hidden"
                onChange={handleFileInputChange}
              />

              <div
                onDragEnter={handleDrag}
                onDragOver={handleDrag}
                onDragLeave={handleDrag}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
                className={cn(
                  "border-2 border-dashed rounded-xl py-4 sm:py-5 px-4 text-center cursor-pointer transition-all min-h-[85px] flex flex-col items-center justify-center",
                  dragActive
                    ? "border-emerald-500 bg-emerald-50/50 scale-[1.01]"
                    : "border-gray-200 hover:border-emerald-400 hover:bg-slate-50/50 bg-white"
                )}
              >
                <div className="flex items-center justify-center gap-2.5 text-gray-500">
                  <div className="p-2 rounded-lg bg-emerald-50 text-emerald-600 shrink-0">
                    <UploadIcon className="size-5" />
                  </div>
                  <div className="text-left">
                    <span className="text-xs font-bold text-gray-800 block leading-tight">
                      Upload Slip (Click to browse, Drag & Drop, or press Ctrl+V to paste)
                    </span>
                    <span className="text-[10px] text-gray-400 block mt-0.5">
                      Accepts PDF documents and Images (JPG, PNG, WEBP)
                    </span>
                  </div>
                </div>
              </div>

              {/* Attached Slips Previews */}
              {slipItems.length > 0 && (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2 mt-1.5">
                  {slipItems.map((item) => (
                    <div
                      key={item.id}
                      className="group relative border border-gray-200 rounded-lg p-1.5 bg-slate-50/70 hover:bg-white hover:border-emerald-300 transition-all flex flex-col justify-between"
                    >
                      <div className="flex items-center gap-2">
                        {item.isPdf ? (
                          <div className="size-8 rounded-md bg-rose-50 border border-rose-200 flex items-center justify-center text-rose-600 shrink-0">
                            <FileTextIcon className="size-4" />
                          </div>
                        ) : (
                          <img
                            src={item.previewUrl}
                            alt="preview"
                            className="size-8 rounded-md object-cover border border-gray-200 shrink-0"
                          />
                        )}
                        <div className="min-w-0 flex-1">
                          <p className="text-[10px] font-semibold text-gray-800 truncate" title={item.name}>
                            {item.name}
                          </p>
                          <p className="text-[9px] text-gray-400">{item.size}</p>
                        </div>
                      </div>

                      <div className="flex items-center justify-end gap-1 mt-1 pt-1 border-t border-gray-100">
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          onClick={(e) => {
                            e.stopPropagation();
                            setPreviewModalItem(item);
                          }}
                          className="size-5 text-gray-500 hover:text-emerald-700 hover:bg-emerald-50"
                          title="Preview"
                        >
                          <EyeIcon className="size-3" />
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          onClick={(e) => handleRemoveItem(item.id, e)}
                          className="size-5 text-gray-400 hover:text-rose-600 hover:bg-rose-50"
                          title="Remove"
                        >
                          <Trash2Icon className="size-3" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Remarks / Notes (Optional - Compact) */}
            <div className="space-y-1">
              <Label className="text-[11px] sm:text-xs font-bold text-gray-700">
                REMARKS / NOTES (OPTIONAL)
              </Label>
              <Textarea
                placeholder="Add any additional remarks or notes..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="text-xs font-medium border-gray-200 resize-none h-11 py-1.5"
              />
            </div>

            <DialogFooter className="pt-2.5 border-t border-gray-100 flex flex-row items-center justify-between gap-2 sm:gap-3">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                className="text-xs font-semibold h-9 border-gray-200 text-gray-700 px-4 w-auto"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={isSubmitting || duplicateStatus.isDuplicate}
                className={cn(
                  "text-xs font-bold h-9 px-5 sm:px-6 text-white shadow-sm transition-all w-auto",
                  duplicateStatus.isDuplicate
                    ? "bg-gray-400 cursor-not-allowed"
                    : "bg-emerald-600 hover:bg-emerald-700"
                )}
              >
                {isSubmitting ? (
                  <>
                    <Loader2Icon className="mr-2 size-3.5 animate-spin" />
                    <span>Saving...</span>
                  </>
                ) : (
                  <span>Save Investor Entry</span>
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Embedded Slip Preview Modal */}
      {previewModalItem && (
        <Dialog open={!!previewModalItem} onOpenChange={() => setPreviewModalItem(null)}>
          <DialogContent className="max-w-4xl w-[90vw] p-4 bg-white rounded-2xl flex flex-col max-h-[90vh]">
            <DialogHeader className="flex flex-row items-center justify-between pb-2 border-b border-gray-100">
              <DialogTitle className="text-sm font-bold truncate">
                {previewModalItem.name}
              </DialogTitle>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setPreviewModalItem(null)}
                className="size-7"
              >
                <XIcon className="size-4" />
              </Button>
            </DialogHeader>
            <div className="flex-1 overflow-auto flex items-center justify-center p-2 bg-slate-50 rounded-lg">
              {previewModalItem.isPdf ? (
                <iframe
                  src={previewModalItem.previewUrl}
                  title={previewModalItem.name}
                  className="w-full h-[65vh] rounded border border-gray-200"
                />
              ) : (
                <img
                  src={previewModalItem.previewUrl}
                  alt={previewModalItem.name}
                  className="max-h-[65vh] w-auto object-contain rounded"
                />
              )}
            </div>
          </DialogContent>
        </Dialog>
      )}
    </>
  );
}
