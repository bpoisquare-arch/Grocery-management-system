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
import { LawChamberEntry } from "@/lib/lawChambersTypes";

interface AddLawChamberModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onAdd: (data: any) => Promise<any>;
  checkDuplicatePassport: (passportNo: string) => { isDuplicate: boolean; existingEntry?: LawChamberEntry };
}

interface SlipItem {
  id: string;
  file: File;
  previewUrl: string;
  name: string;
  size: string;
  isPdf: boolean;
}

export function AddLawChamberModal({
  open,
  onOpenChange,
  onAdd,
  checkDuplicatePassport,
}: AddLawChamberModalProps) {
  const [studentName, setStudentName] = useState("");
  const [passportNo, setPassportNo] = useState("");
  const [date, setDate] = useState<Date | undefined>(new Date());
  const [amountStr, setAmountStr] = useState("5000");
  const [reimbursed, setReimbursed] = useState("Yes");
  const [notes, setNotes] = useState("");
  const [slipItems, setSlipItems] = useState<SlipItem[]>([]);
  const [previewModalItem, setPreviewModalItem] = useState<SlipItem | null>(null);
  const [dragActive, setDragActive] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

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
    setAmountStr("5000");
    setReimbursed("Yes");
    setNotes("");
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
  }, [open]);

  // Handle Clipboard Paste (Ctrl+V) for copied image/PDF slips
  useEffect(() => {
    if (!open) return;

    const handlePaste = (e: ClipboardEvent) => {
      const clipboardItems = e.clipboardData?.items;
      if (!clipboardItems || clipboardItems.length === 0) return;

      const filesFromPaste: File[] = [];
      for (let i = 0; i < clipboardItems.length; i++) {
        const item = clipboardItems[i];
        if (item.kind === "file") {
          const file = item.getAsFile();
          if (file) {
            let fileName = file.name;
            if (!fileName || fileName === "image.png") {
              const ext = file.type.split("/")[1] || "png";
              fileName = `Slip_Pasted_${Date.now()}.${ext}`;
            }
            const renamedFile = new File([file], fileName, { type: file.type });
            filesFromPaste.push(renamedFile);
          }
        }
      }

      if (filesFromPaste.length > 0) {
        e.preventDefault();
        handleFiles(filesFromPaste);
      }
    };

    window.addEventListener("paste", handlePaste);
    return () => {
      window.removeEventListener("paste", handlePaste);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, slipItems.length]);

  const handleFiles = (incomingFiles: File[]) => {
    if (!incomingFiles || incomingFiles.length === 0) return;

    const availableSlots = 10 - slipItems.length;
    if (availableSlots <= 0) {
      toast.error("Maximum 10 slips allowed per student entry.");
      return;
    }

    const filesToProcess = incomingFiles.slice(0, availableSlots);
    const newItems: SlipItem[] = [];

    for (const file of filesToProcess) {
      const isPdf = file.type === "application/pdf" || file.name.toLowerCase().endsWith(".pdf");
      const isImage = file.type.startsWith("image/");

      if (!isPdf && !isImage) {
        toast.error(`"${file.name}" is unsupported. Upload JPG, PNG, WEBP, or PDF.`);
        continue;
      }

      const maxSize = 20 * 1024 * 1024; // 20MB
      if (file.size > maxSize) {
        toast.error(`"${file.name}" exceeds the 20MB file limit.`);
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
      toast.success(`${newItems.length} slip(s) attached.`);
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
    const trimmedName = studentName.trim();
    const trimmedPassport = passportNo.trim().toUpperCase();

    if (!trimmedName) {
      toast.error("Please enter the student name.");
      return;
    }
    if (!trimmedPassport) {
      toast.error("Please enter the passport number.");
      return;
    }
    if (!date) {
      toast.error("Please select a date.");
      return;
    }
    const amountNum = parseFloat(amountStr);
    if (isNaN(amountNum) || amountNum < 0) {
      toast.error("Please enter a valid amount.");
      return;
    }

    // MAIN LOGIC: Duplicate passport prevention
    if (duplicateStatus.isDuplicate && duplicateStatus.existingEntry) {
      toast.error(
        `Passport "${trimmedPassport}" already exists in records for student "${duplicateStatus.existingEntry.studentName}" (S.No: ${duplicateStatus.existingEntry.srNo}). Duplicate entries are not allowed!`
      );
      return;
    }

    setIsSubmitting(true);
    try {
      await onAdd({
        studentName: trimmedName,
        passportNo: trimmedPassport,
        date: format(date, "yyyy-MM-dd"),
        amount: amountNum,
        reimbursed,
        notes: notes.trim() || undefined,
        slipFiles: slipItems.map((item) => item.file),
      });

      toast.success(
        `Student "${trimmedName}" recorded successfully with S.No. (Slip: ${
          slipItems.length > 0 ? "Uploaded" : "Missing"
        })`
      );
      onOpenChange(false);
      resetForm();
    } catch (err: any) {
      console.error(err);
      toast.error(err?.message || "Failed to add student entry.");
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
        <DialogContent className="sm:max-w-3xl w-[95vw] md:w-full bg-white p-4 sm:p-5 rounded-2xl ring-1 ring-black/5 shadow-2xl max-h-[95vh] overflow-y-auto overflow-x-hidden">
          <DialogHeader className="pb-3 border-b border-gray-100 pr-8 sm:pr-10">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <DialogTitle className="text-base sm:text-lg md:text-xl font-bold text-gray-900">
                  Add Student Entry
                </DialogTitle>
                <DialogDescription className="text-xs text-gray-500 mt-0.5">
                  Chambers Law student registration & reimbursement record.
                </DialogDescription>
              </div>
              <Badge
                variant="outline"
                className={cn(
                  "font-bold text-xs px-2.5 py-1 w-fit shrink-0",
                  slipItems.length > 0
                    ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                    : "bg-amber-50 text-amber-700 border-amber-200"
                )}
              >
                {slipItems.length > 0 ? "● Slip Uploaded" : "● Slip Missing"}
              </Badge>
            </div>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-4 mt-3">
            {/* Student Name & Passport No */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="student-name" className="text-xs font-bold text-gray-700 flex items-center gap-1">
                  <span>STUDENT NAME</span>
                  <span className="text-rose-600 font-extrabold text-sm">*</span>
                </Label>
                <Input
                  id="student-name"
                  placeholder="e.g. M Mohsin Wakeel"
                  value={studentName}
                  onChange={(e) => setStudentName(e.target.value)}
                  className="h-10 text-xs font-medium"
                  required
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <Label htmlFor="passport-no" className="text-xs font-bold text-gray-700 flex items-center justify-between">
                  <div className="flex items-center gap-1">
                    <span>PASSPORT NO.</span>
                    <span className="text-rose-600 font-extrabold text-sm">*</span>
                  </div>
                  {passportNo.trim() && (
                    duplicateStatus.isDuplicate ? (
                      <span className="text-[10px] font-bold text-red-600 flex items-center gap-1">
                        <AlertTriangleIcon className="size-3" />
                        Already exists!
                      </span>
                    ) : (
                      <span className="text-[10px] font-bold text-emerald-600 flex items-center gap-1">
                        <CheckCircle2Icon className="size-3" />
                        Unique Passport
                      </span>
                    )
                  )}
                </Label>
                <Input
                  id="passport-no"
                  placeholder="e.g. AU6309431"
                  value={passportNo}
                  onChange={(e) => setPassportNo(e.target.value.toUpperCase())}
                  className={cn(
                    "h-10 text-xs font-mono font-bold tracking-wider uppercase",
                    duplicateStatus.isDuplicate
                      ? "border-red-500 focus:border-red-600 focus:ring-red-500 bg-red-50/40 text-red-900"
                      : passportNo.trim()
                      ? "border-emerald-500 bg-emerald-50/20"
                      : ""
                  )}
                  required
                />
              </div>
            </div>

            {/* Duplicate Passport Warning Banner */}
            {duplicateStatus.isDuplicate && duplicateStatus.existingEntry && (
              <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-xs text-red-800 flex items-start gap-2.5 animate-in fade-in duration-200">
                <AlertTriangleIcon className="size-4 text-red-600 shrink-0 mt-0.5" />
                <div className="space-y-0.5">
                  <p className="font-bold text-red-900">
                    Duplicate Passport Warning: Passport No. &quot;{passportNo.trim().toUpperCase()}&quot; is already registered!
                  </p>
                  <p className="text-[11px] text-red-700">
                    Existing entry: Student <span className="font-bold">{duplicateStatus.existingEntry.studentName}</span> (S.No: #{duplicateStatus.existingEntry.srNo}, Date: {duplicateStatus.existingEntry.date}). A student cannot be registered twice with the same passport number.
                  </p>
                </div>
              </div>
            )}

            {/* Date, Amount & Reimbursed Row */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {/* Date */}
              <div className="flex flex-col gap-1.5">
                <Label className="text-xs font-bold text-gray-700 flex items-center gap-1">
                  <span>DATE</span>
                  <span className="text-rose-600 font-extrabold text-sm">*</span>
                </Label>
                <Popover>
                  <PopoverTrigger
                    render={
                      <Button
                        type="button"
                        variant="outline"
                        className={cn(
                          "w-full h-10 px-3 justify-start text-left font-medium text-xs border-gray-200 hover:bg-gray-50",
                          !date && "text-gray-400"
                        )}
                      />
                    }
                  >
                    <CalendarIcon className="mr-2 size-4 text-gray-400" />
                    {date ? format(date, "dd/MM/yyyy") : <span>Select date</span>}
                  </PopoverTrigger>
                  <PopoverContent align="start" className="p-0 bg-white border border-gray-200 shadow-lg">
                    <Calendar mode="single" selected={date} onSelect={setDate} />
                  </PopoverContent>
                </Popover>
              </div>

              {/* Amount */}
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="amount" className="text-xs font-bold text-gray-700 flex items-center gap-1">
                  <span>AMOUNT (RS.)</span>
                  <span className="text-rose-600 font-extrabold text-sm">*</span>
                </Label>
                <Input
                  id="amount"
                  type="number"
                  placeholder="5000"
                  value={amountStr}
                  onChange={(e) => setAmountStr(e.target.value)}
                  className="h-10 text-xs font-bold"
                  min="0"
                  step="any"
                  required
                />
              </div>

              {/* Reimbursed to Me */}
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="reimbursed" className="text-xs font-bold text-gray-700">
                  REIMBURSED TO ME
                </Label>
                <Select
                  value={reimbursed}
                  onValueChange={(val) => {
                    if (val) setReimbursed(val);
                  }}
                >
                  <SelectTrigger id="reimbursed" className="h-10 text-xs font-semibold bg-white">
                    <SelectValue placeholder="Select" />
                  </SelectTrigger>
                  <SelectContent className="bg-white border-gray-200">
                    <SelectItem value="Yes" className="text-xs font-semibold text-emerald-700">
                      Yes (Reimbursed)
                    </SelectItem>
                    <SelectItem value="No" className="text-xs font-semibold text-amber-700">
                      No (Pending)
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Slip Upload Area (Supports Drag&Drop, Click, and Ctrl+V clipboard paste) */}
            <div className="flex flex-col gap-1.5 pt-1">
              <div className="flex items-center justify-between">
                <Label className="text-xs font-bold text-gray-700">
                  SLIP / RECEIPT DOCUMENT ({slipItems.length}/10)
                </Label>
                <span className="text-[11px] text-gray-400 font-medium">
                  Image (JPG/PNG) or PDF • Paste with <kbd className="px-1 py-0.5 rounded bg-gray-100 font-mono text-[10px] text-gray-700">Ctrl + V</kbd>
                </span>
              </div>

              {slipItems.length < 10 && (
                <div
                  onDragEnter={handleDrag}
                  onDragOver={handleDrag}
                  onDragLeave={handleDrag}
                  onDrop={handleDrop}
                  className={cn(
                    "border-2 border-dashed rounded-xl p-4 flex flex-col items-center justify-center text-center cursor-pointer transition-all duration-150 bg-slate-50/60 hover:bg-slate-50",
                    dragActive ? "border-emerald-500 bg-emerald-50/50" : "border-gray-200 hover:border-gray-300"
                  )}
                >
                  <input
                    ref={fileInputRef}
                    type="file"
                    id="law-chamber-slip-upload"
                    multiple
                    onChange={(e) => {
                      if (e.target.files) handleFiles(Array.from(e.target.files));
                    }}
                    accept="image/png, image/jpeg, image/webp, application/pdf"
                    className="hidden"
                  />
                  <label htmlFor="law-chamber-slip-upload" className="cursor-pointer flex flex-col items-center gap-1.5 w-full">
                    <div className="size-9 rounded-full bg-emerald-50 flex items-center justify-center text-emerald-600 shadow-2xs">
                      <UploadIcon className="size-4.5" />
                    </div>
                    <span className="text-xs font-bold text-gray-800">
                      Upload Slip (Click to browse, Drag & Drop, or press Ctrl+V to paste)
                    </span>
                    <span className="text-[10px] text-gray-500">
                      Accepts PDF documents and Images (JPG, PNG, WEBP)
                    </span>
                  </label>
                </div>
              )}

              {/* Slips preview list */}
              {slipItems.length > 0 && (
                <div className="space-y-2 pt-1">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-48 overflow-y-auto pr-1">
                    {slipItems.map((item, index) => (
                      <div
                        key={item.id}
                        className="flex items-center gap-2.5 p-2 rounded-lg border border-gray-200 bg-white hover:border-emerald-300 transition-all shadow-2xs group"
                      >
                        <div
                          onClick={() => setPreviewModalItem(item)}
                          className="size-10 rounded-md bg-slate-100 border border-gray-100 flex items-center justify-center overflow-hidden shrink-0 cursor-pointer relative"
                          title="Click to preview"
                        >
                          {item.isPdf ? (
                            <FileTextIcon className="size-5 text-red-500" />
                          ) : (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img src={item.previewUrl} alt={item.name} className="w-full h-full object-cover" />
                          )}
                          <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                            <EyeIcon className="size-3 text-white" />
                          </div>
                        </div>

                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-semibold text-gray-800 truncate" title={item.name}>
                            #{index + 1}. {item.name}
                          </p>
                          <div className="flex items-center gap-1.5 mt-0.5">
                            <Badge className={cn("text-[8px] px-1 py-0 h-3.5 border-none font-bold", item.isPdf ? "bg-red-100 text-red-700" : "bg-emerald-100 text-emerald-700")}>
                              {item.isPdf ? "PDF" : "IMAGE"}
                            </Badge>
                            <span className="text-[10px] text-gray-400">{item.size}</span>
                          </div>
                        </div>

                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          onClick={() => handleRemoveSlip(item.id)}
                          className="size-7 text-gray-400 hover:text-red-600 hover:bg-red-50"
                        >
                          <Trash2Icon className="size-3.5" />
                        </Button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Optional Notes */}
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="notes" className="text-xs font-bold text-gray-700">
                REMARKS / NOTES (OPTIONAL)
              </Label>
              <Textarea
                id="notes"
                placeholder="Add any additional remarks or notes..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={2}
                className="text-xs resize-none"
              />
            </div>

            <DialogFooter className="pt-3 border-t border-gray-100 flex items-center justify-between sm:justify-between">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                disabled={isSubmitting}
                className="h-9 text-xs font-semibold"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={isSubmitting || (duplicateStatus.isDuplicate && !!duplicateStatus.existingEntry)}
                className="h-9 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs px-5 shadow-sm"
              >
                {isSubmitting ? (
                  <>
                    <Loader2Icon className="size-3.5 mr-1.5 animate-spin" />
                    Saving Record...
                  </>
                ) : (
                  "Save Student Entry"
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Full Preview Modal for attached slip */}
      {previewModalItem && (
        <Dialog open={!!previewModalItem} onOpenChange={() => setPreviewModalItem(null)}>
          <DialogContent className="sm:max-w-3xl w-[95vw] bg-white p-4 rounded-2xl max-h-[90vh] flex flex-col">
            <DialogHeader className="pb-2 border-b border-gray-100 flex flex-row items-center justify-between">
              <DialogTitle className="text-sm font-bold truncate">
                Preview: {previewModalItem.name}
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
            <div className="flex-1 overflow-auto flex items-center justify-center p-2 min-h-[300px]">
              {previewModalItem.isPdf ? (
                <iframe
                  src={previewModalItem.previewUrl}
                  title="PDF Preview"
                  className="w-full h-[550px] rounded-lg border border-gray-200"
                />
              ) : (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={previewModalItem.previewUrl}
                  alt={previewModalItem.name}
                  className="max-h-[550px] max-w-full object-contain rounded-lg shadow-sm"
                />
              )}
            </div>
          </DialogContent>
        </Dialog>
      )}
    </>
  );
}
