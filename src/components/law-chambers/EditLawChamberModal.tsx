"use client";

import React, { useState, useEffect, useRef } from "react";
import { format, parseISO } from "date-fns";
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

interface EditLawChamberModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  entry: LawChamberEntry | null;
  onUpdate: (id: string, data: any) => Promise<any>;
  checkDuplicatePassport: (passportNo: string, excludeId?: string) => { isDuplicate: boolean; existingEntry?: LawChamberEntry };
}

interface SlipItem {
  id: string;
  url?: string;
  file?: File;
  previewUrl: string;
  name: string;
  size: string;
  isPdf: boolean;
  isNew?: boolean;
}

export function EditLawChamberModal({
  open,
  onOpenChange,
  entry,
  onUpdate,
  checkDuplicatePassport,
}: EditLawChamberModalProps) {
  const [studentName, setStudentName] = useState("");
  const [passportNo, setPassportNo] = useState("");
  const [date, setDate] = useState<Date | undefined>(new Date());
  const [amountStr, setAmountStr] = useState("");
  const [reimbursed, setReimbursed] = useState("Yes");
  const [notes, setNotes] = useState("");
  const [slipItems, setSlipItems] = useState<SlipItem[]>([]);
  const [previewModalItem, setPreviewModalItem] = useState<SlipItem | null>(null);
  const [dragActive, setDragActive] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Live duplicate check against other entries
  const duplicateStatus = entry ? checkDuplicatePassport(passportNo, entry.id) : { isDuplicate: false };

  const cleanUpBlobs = (items: SlipItem[]) => {
    items.forEach((item) => {
      if (item.previewUrl && item.previewUrl.startsWith("blob:")) {
        URL.revokeObjectURL(item.previewUrl);
      }
    });
  };

  useEffect(() => {
    if (open && entry) {
      setStudentName(entry.studentName || "");
      setPassportNo(entry.passportNo || "");
      if (entry.date) {
        try {
          const parsed = parseISO(entry.date);
          setDate(isNaN(parsed.getTime()) ? new Date() : parsed);
        } catch {
          setDate(new Date());
        }
      } else {
        setDate(new Date());
      }
      setAmountStr(entry.amount ? String(entry.amount) : "0");
      setReimbursed(entry.reimbursed || "Yes");
      setNotes(entry.notes || "");

      // Populate existing slips
      const existingUrls: string[] = entry.slipUrls && Array.isArray(entry.slipUrls) && entry.slipUrls.length > 0
        ? entry.slipUrls
        : entry.slipUrl ? [entry.slipUrl] : [];

      const initialSlips: SlipItem[] = existingUrls.map((url, idx) => {
        const isPdf = url.includes("application/pdf") || url.endsWith(".pdf");
        return {
          id: `existing-${idx}-${Date.now()}`,
          url,
          previewUrl: url,
          name: `Slip #${idx + 1} (${isPdf ? "PDF" : "Image"})`,
          size: "Uploaded",
          isPdf,
          isNew: false,
        };
      });

      setSlipItems(initialSlips);
    }
  }, [open, entry]);

  // Handle Ctrl+V paste
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
            filesFromPaste.push(new File([file], fileName, { type: file.type }));
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

      const maxSize = 20 * 1024 * 1024;
      if (file.size > maxSize) {
        toast.error(`"${file.name}" exceeds 20MB limit.`);
        continue;
      }

      const previewUrl = URL.createObjectURL(file);
      const sizeStr = (file.size / (1024 * 1024)).toFixed(2) + " MB";

      newItems.push({
        id: `slip-new-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
        file,
        previewUrl,
        name: file.name,
        size: sizeStr,
        isPdf,
        isNew: true,
      });
    }

    if (newItems.length > 0) {
      setSlipItems((prev) => [...prev, ...newItems]);
      toast.success(`${newItems.length} new slip(s) added.`);
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
    if (!entry) return;

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
        `Passport "${trimmedPassport}" already belongs to student "${duplicateStatus.existingEntry.studentName}" (S.No: ${duplicateStatus.existingEntry.srNo}). Duplicate entries are not allowed!`
      );
      return;
    }

    setIsSubmitting(true);
    try {
      // Collect preserved existing slip URLs
      const preservedUrls = slipItems.filter((item) => !item.isNew && item.url).map((item) => item.url as string);
      // Collect new slip files
      const newFiles = slipItems.filter((item) => item.isNew && item.file).map((item) => item.file as File);

      await onUpdate(entry.id, {
        studentName: trimmedName,
        passportNo: trimmedPassport,
        date: format(date, "yyyy-MM-dd"),
        amount: amountNum,
        reimbursed,
        notes: notes.trim() || undefined,
        slipUrls: preservedUrls,
        slipFiles: newFiles,
      });

      toast.success(`Entry for "${trimmedName}" updated successfully.`);
      cleanUpBlobs(slipItems);
      onOpenChange(false);
    } catch (err: any) {
      console.error(err);
      toast.error(err?.message || "Failed to update entry.");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!entry) return null;

  return (
    <>
      <Dialog
        open={open}
        onOpenChange={(v) => {
          if (!v) cleanUpBlobs(slipItems);
          onOpenChange(v);
        }}
      >
        <DialogContent className="sm:max-w-3xl w-[95vw] bg-white p-5 md:p-7 rounded-2xl ring-1 ring-black/5 shadow-2xl max-h-[92vh] overflow-y-auto">
          <DialogHeader className="pb-3 border-b border-gray-100">
            <div className="flex items-center justify-between">
              <div>
                <DialogTitle className="text-lg md:text-xl font-bold text-gray-900">
                  Edit Student Entry (S.No: #{entry.srNo})
                </DialogTitle>
                <DialogDescription className="text-xs text-gray-500 mt-0.5">
                  Update student details, passport number, reimbursement status, and slips.
                </DialogDescription>
              </div>
              <Badge
                variant="outline"
                className={cn(
                  "font-bold text-xs px-2.5 py-1",
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
            {/* Student Name & Passport */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="edit-student-name" className="text-xs font-bold text-gray-700 flex items-center gap-1">
                  <span>STUDENT NAME</span>
                  <span className="text-rose-600 font-extrabold text-sm">*</span>
                </Label>
                <Input
                  id="edit-student-name"
                  value={studentName}
                  onChange={(e) => setStudentName(e.target.value)}
                  className="h-10 text-xs font-medium"
                  required
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <Label htmlFor="edit-passport-no" className="text-xs font-bold text-gray-700 flex items-center justify-between">
                  <div className="flex items-center gap-1">
                    <span>PASSPORT NO.</span>
                    <span className="text-rose-600 font-extrabold text-sm">*</span>
                  </div>
                  {passportNo.trim() && (
                    duplicateStatus.isDuplicate ? (
                      <span className="text-[10px] font-bold text-red-600 flex items-center gap-1">
                        <AlertTriangleIcon className="size-3" />
                        Duplicate passport!
                      </span>
                    ) : (
                      <span className="text-[10px] font-bold text-emerald-600 flex items-center gap-1">
                        <CheckCircle2Icon className="size-3" />
                        Valid Passport
                      </span>
                    )
                  )}
                </Label>
                <Input
                  id="edit-passport-no"
                  value={passportNo}
                  onChange={(e) => setPassportNo(e.target.value.toUpperCase())}
                  className={cn(
                    "h-10 text-xs font-mono font-bold tracking-wider uppercase",
                    duplicateStatus.isDuplicate
                      ? "border-red-500 focus:border-red-600 bg-red-50/40 text-red-900"
                      : "border-emerald-500 bg-emerald-50/20"
                  )}
                  required
                />
              </div>
            </div>

            {/* Duplicate Passport Alert */}
            {duplicateStatus.isDuplicate && duplicateStatus.existingEntry && (
              <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-xs text-red-800 flex items-start gap-2.5">
                <AlertTriangleIcon className="size-4 text-red-600 shrink-0 mt-0.5" />
                <div>
                  <p className="font-bold text-red-900">
                    Cannot use passport &quot;{passportNo.trim().toUpperCase()}&quot;
                  </p>
                  <p className="text-[11px] text-red-700">
                    This passport is already registered to student <span className="font-bold">{duplicateStatus.existingEntry.studentName}</span> (S.No: #{duplicateStatus.existingEntry.srNo}).
                  </p>
                </div>
              </div>
            )}

            {/* Date, Amount & Reimbursed */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
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
                        className="w-full h-10 px-3 justify-start text-left font-medium text-xs border-gray-200 hover:bg-gray-50"
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

              <div className="flex flex-col gap-1.5">
                <Label htmlFor="edit-amount" className="text-xs font-bold text-gray-700 flex items-center gap-1">
                  <span>AMOUNT (RS.)</span>
                  <span className="text-rose-600 font-extrabold text-sm">*</span>
                </Label>
                <Input
                  id="edit-amount"
                  type="number"
                  value={amountStr}
                  onChange={(e) => setAmountStr(e.target.value)}
                  className="h-10 text-xs font-bold"
                  min="0"
                  step="any"
                  required
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <Label htmlFor="edit-reimbursed" className="text-xs font-bold text-gray-700">
                  REIMBURSED TO ME
                </Label>
                <Select
                  value={reimbursed}
                  onValueChange={(val) => {
                    if (val) setReimbursed(val);
                  }}
                >
                  <SelectTrigger id="edit-reimbursed" className="h-10 text-xs font-semibold bg-white">
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

            {/* Slips management */}
            <div className="flex flex-col gap-1.5 pt-1">
              <div className="flex items-center justify-between">
                <Label className="text-xs font-bold text-gray-700">
                  ATTACHED SLIPS ({slipItems.length}/10)
                </Label>
                <span className="text-[11px] text-gray-400">
                  Supports Paste (<kbd className="px-1 py-0.5 rounded bg-gray-100 font-mono text-[10px]">Ctrl+V</kbd>) & Drag-Drop
                </span>
              </div>

              {slipItems.length < 10 && (
                <div
                  onDragEnter={handleDrag}
                  onDragOver={handleDrag}
                  onDragLeave={handleDrag}
                  onDrop={handleDrop}
                  className={cn(
                    "border-2 border-dashed rounded-xl p-3 flex flex-col items-center justify-center text-center cursor-pointer transition-all duration-150 bg-slate-50/60 hover:bg-slate-50",
                    dragActive ? "border-emerald-500 bg-emerald-50/50" : "border-gray-200 hover:border-gray-300"
                  )}
                >
                  <input
                    ref={fileInputRef}
                    type="file"
                    id="law-chamber-edit-slip-upload"
                    multiple
                    onChange={(e) => {
                      if (e.target.files) handleFiles(Array.from(e.target.files));
                    }}
                    accept="image/png, image/jpeg, image/webp, application/pdf"
                    className="hidden"
                  />
                  <label htmlFor="law-chamber-edit-slip-upload" className="cursor-pointer flex flex-col items-center gap-1 w-full">
                    <UploadIcon className="size-4 text-emerald-600" />
                    <span className="text-xs font-bold text-gray-800">
                      Add / Upload more slips (or press Ctrl+V)
                    </span>
                  </label>
                </div>
              )}

              {/* Slips preview list */}
              {slipItems.length > 0 && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-48 overflow-y-auto pr-1 pt-1">
                  {slipItems.map((item, index) => (
                    <div
                      key={item.id}
                      className="flex items-center gap-2.5 p-2 rounded-lg border border-gray-200 bg-white hover:border-emerald-300 shadow-2xs group"
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
                          {item.isNew && (
                            <Badge className="text-[8px] px-1 py-0 h-3.5 bg-blue-100 text-blue-700 border-none font-bold">
                              NEW
                            </Badge>
                          )}
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
              )}
            </div>

            {/* Notes */}
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="edit-notes" className="text-xs font-bold text-gray-700">
                REMARKS / NOTES
              </Label>
              <Textarea
                id="edit-notes"
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
                    Saving Changes...
                  </>
                ) : (
                  "Update Record"
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Slip Preview Dialog */}
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
