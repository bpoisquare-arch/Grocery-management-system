"use client";

import React, { useState, useEffect, useRef } from "react";
import { useStore } from "@/lib/store";
import { CommissionEntry, CommissionService, COMMISSION_SERVICES } from "@/lib/mockData";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  UploadCloudIcon,
  XIcon,
  Loader2Icon,
  UserIcon,
  GraduationCapIcon,
  PencilIcon,
  CalendarIcon,
  FileTextIcon,
  EyeIcon,
  LockIcon,
  ImageIcon,
} from "lucide-react";
import { toast } from "sonner";

interface EditCommissionModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  entry: CommissionEntry | null;
}

interface ExistingSlip {
  id: string;
  url: string;
  isPdf: boolean;
}

interface NewSlip {
  id: string;
  file: File;
  previewUrl: string;
  name: string;
  isPdf: boolean;
}

export function EditCommissionModal({ open, onOpenChange, entry }: EditCommissionModalProps) {
  const { activeEntity, counselors, updateCommissionEntry } = useStore();

  const branchCounselors = React.useMemo(() => {
    return counselors.filter(
      (c) => !c.entity || c.entity === "All" || c.entity === (entry?.entity || activeEntity)
    );
  }, [counselors, activeEntity, entry]);

  const [studentName, setStudentName] = useState("");
  const [service, setService] = useState<CommissionService>("Visa Processing");
  const [counselor, setCounselor] = useState("Humaira Amin");
  const [amountStr, setAmountStr] = useState("");
  const [date, setDate] = useState("");
  const [fullReceived, setFullReceived] = useState(false);
  const [counselorCommission, setCounselorCommission] = useState("");
  const [bmCommission, setBmCommission] = useState("");
  const [ccCalcNote, setCcCalcNote] = useState("");
  const [bmCalcNote, setBmCalcNote] = useState("");
  const [notes, setNotes] = useState("");

  const [existingSlips, setExistingSlips] = useState<ExistingSlip[]>([]);
  const [newSlips, setNewSlips] = useState<NewSlip[]>([]);
  const [previewModalUrl, setPreviewModalUrl] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (entry) {
      const eService = entry.service || "Visa Processing";
      const eCounselor = entry.counselor || counselors[0]?.name || "Humaira Amin";
      const eAmountStr = entry.amount ? entry.amount.toString() : "";

      setStudentName(entry.studentName || "");
      setService(eService);
      setCounselor(eCounselor);
      setAmountStr(eAmountStr);
      setDate(entry.date || "");
      setFullReceived(!!entry.fullReceived);
      setCounselorCommission(entry.counselorCommission !== undefined ? entry.counselorCommission.toString() : "");
      setBmCommission(entry.bmCommission !== undefined ? entry.bmCommission.toString() : "");
      setNotes(entry.notes || "");

      // Load existing slips
      const loadedSlips: ExistingSlip[] = [];
      const urls = entry.slipUrls && entry.slipUrls.length > 0 ? entry.slipUrls : entry.slipUrl ? [entry.slipUrl] : [];
      urls.forEach((url, idx) => {
        loadedSlips.push({
          id: `existing-${idx}-${Date.now()}`,
          url,
          isPdf: url.includes("application/pdf") || url.toLowerCase().endsWith(".pdf"),
        });
      });
      setExistingSlips(loadedSlips);
      setNewSlips([]);

      recalculateCommission(eCounselor, eService, eAmountStr);
    }
  }, [entry, counselors]);

  const totalSlipsCount = existingSlips.length + newSlips.length;

  const recalculateCommission = (
    cName: string,
    sName: CommissionService,
    amtStr: string
  ) => {
    const num = parseFloat(amtStr);
    if (isNaN(num) || num <= 0) {
      setCounselorCommission("");
      setBmCommission("");
      setCcCalcNote("");
      setBmCalcNote("");
      return;
    }

    const selectedC = counselors.find((c) => c.name === cName);

    // 1. Counselor Commission Calculation
    const ccRule = selectedC?.serviceCommissions?.[sName] || { type: "percentage", value: 10 };
    let cc = 0;
    if (ccRule.type === "percentage") {
      cc = Math.round((num * ccRule.value) / 100);
      setCcCalcNote(`${ccRule.value}% of Rs. ${num.toLocaleString()}`);
    } else {
      cc = ccRule.value;
      setCcCalcNote(`Fixed Rs. ${ccRule.value.toLocaleString()}`);
    }

    // 2. Branch Manager (B.M) Commission Calculation
    const bmRule = selectedC?.bmServiceCommissions?.[sName] || { type: "percentage", value: 5 };
    let bm = 0;
    if (bmRule.type === "percentage") {
      bm = Math.round((num * bmRule.value) / 100);
      setBmCalcNote(`${bmRule.value}% of Rs. ${num.toLocaleString()}`);
    } else {
      bm = bmRule.value;
      setBmCalcNote(`Fixed Rs. ${bmRule.value.toLocaleString()}`);
    }

    setCounselorCommission(cc.toString());
    setBmCommission(bm.toString());
  };

  const handleAmountChange = (val: string) => {
    setAmountStr(val);
    recalculateCommission(counselor, service, val);
  };

  const handleServiceChange = (val: CommissionService) => {
    setService(val);
    recalculateCommission(counselor, val, amountStr);
  };

  const handleCounselorChange = (val: string) => {
    setCounselor(val);
    recalculateCommission(val, service, amountStr);
  };

  const handleFilesChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;

    const availableSlots = 5 - totalSlipsCount;
    if (availableSlots <= 0) {
      toast.error("Maximum 5 slips limit reached.");
      return;
    }

    if (files.length > availableSlots) {
      toast.warning(`Only first ${availableSlots} files added (max 5 slips limit).`);
    }

    const filesToAdd = files.slice(0, availableSlots);
    const added: NewSlip[] = [];

    for (const file of filesToAdd) {
      if (file.size > 5 * 1024 * 1024) {
        toast.error(`${file.name} exceeds 5MB limit.`);
        continue;
      }

      const previewUrl = URL.createObjectURL(file);
      const isPdf = file.type.includes("pdf") || file.name.toLowerCase().endsWith(".pdf");

      added.push({
        id: `new-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
        file,
        previewUrl,
        name: file.name,
        isPdf,
      });
    }

    setNewSlips((prev) => [...prev, ...added]);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleRemoveExistingSlip = (id: string) => {
    setExistingSlips((prev) => prev.filter((s) => s.id !== id));
  };

  const handleRemoveNewSlip = (id: string) => {
    setNewSlips((prev) => {
      const target = prev.find((s) => s.id === id);
      if (target && target.previewUrl.startsWith("blob:")) {
        URL.revokeObjectURL(target.previewUrl);
      }
      return prev.filter((s) => s.id !== id);
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!entry) return;

    if (!studentName.trim()) {
      toast.error("Please enter the student's name.");
      return;
    }

    const amount = parseFloat(amountStr);
    if (isNaN(amount) || amount <= 0) {
      toast.error("Please enter a valid received amount.");
      return;
    }

    if (!date) {
      toast.error("Please select a date.");
      return;
    }

    setIsLoading(true);

    try {
      await updateCommissionEntry(entry.id, {
        studentName: studentName.trim(),
        service,
        counselor: counselor || counselors[0]?.name || "Humaira Amin",
        amount,
        date,
        fullReceived,
        counselorCommission: parseFloat(counselorCommission) || 0,
        bmCommission: parseFloat(bmCommission) || 0,
        notes: notes.trim() || undefined,
        slipUrls: existingSlips.map((s) => s.url),
        slipFiles: newSlips.map((s) => s.file),
      });

      setIsLoading(false);
      onOpenChange(false);
      toast.success(`Commission entry for ${studentName} updated successfully.`);
    } catch (err) {
      setIsLoading(false);
      toast.error("Failed to update commission entry. Please try again.");
    }
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-[880px] w-[95vw] max-h-[92vh] overflow-y-auto bg-white p-5 sm:p-6 rounded-2xl shadow-2xl border border-gray-100">
          {/* Header */}
          <DialogHeader className="pb-3 border-b border-gray-100">
            <div className="flex items-center gap-2.5">
              <div className="size-9 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center shadow-2xs">
                <PencilIcon className="size-4" />
              </div>
              <div>
                <DialogTitle className="text-base sm:text-lg font-bold text-gray-900 leading-snug">
                  Edit Commission Record
                </DialogTitle>
                <DialogDescription className="text-xs text-gray-500 font-medium">
                  {entry?.entity} Branch • Modify student commission details and deposit slips.
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="pt-3">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
              {/* LEFT COLUMN: Input Details (7 Cols) */}
              <div className="lg:col-span-7 space-y-3">
                {/* 1. Student Name */}
                <div className="flex flex-col gap-1">
                  <Label htmlFor="edit-studentName" className="text-xs font-semibold text-gray-700 flex items-center gap-1.5">
                    <GraduationCapIcon className="size-3.5 text-emerald-600" />
                    Student Name <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="edit-studentName"
                    placeholder="e.g. Muhammad Hamza"
                    value={studentName}
                    onChange={(e) => setStudentName(e.target.value)}
                    className="h-9 border-gray-200 focus:border-emerald-500 focus:ring-emerald-500 bg-white text-xs font-medium"
                    required
                  />
                </div>

                {/* 2. Service & Counselor Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {/* Service Dropdown */}
                  <div className="flex flex-col gap-1">
                    <Label htmlFor="edit-service" className="text-xs font-semibold text-gray-700">
                      Service Provided <span className="text-red-500">*</span>
                    </Label>
                    <Select value={service} onValueChange={(val) => handleServiceChange(val as CommissionService)}>
                      <SelectTrigger id="edit-service" className="h-9 border-gray-200 text-xs font-semibold bg-white">
                        <SelectValue placeholder="Select Service" />
                      </SelectTrigger>
                      <SelectContent>
                        {COMMISSION_SERVICES.map((s) => (
                          <SelectItem key={s} value={s} className="text-xs font-medium cursor-pointer">
                            {s}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Counselor Dropdown */}
                  <div className="flex flex-col gap-1">
                    <Label htmlFor="edit-counselor" className="text-xs font-semibold text-gray-700 flex items-center gap-1.5">
                      <UserIcon className="size-3.5 text-emerald-600" />
                      Counselor <span className="text-red-500">*</span>
                    </Label>
                    <Select value={counselor} onValueChange={(val) => handleCounselorChange(val || "Humaira Amin")}>
                      <SelectTrigger id="edit-counselor" className="h-9 border-gray-200 text-xs font-semibold bg-white">
                        <SelectValue placeholder="Select Counselor" />
                      </SelectTrigger>
                      <SelectContent>
                        {branchCounselors.map((c) => (
                          <SelectItem key={c.id} value={c.name} className="text-xs font-medium cursor-pointer">
                            {c.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {/* 3. Amount & Date Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {/* Amount */}
                  <div className="flex flex-col gap-1">
                    <Label htmlFor="edit-amount" className="text-xs font-semibold text-gray-700">
                      Amount Paid (Rs.) <span className="text-red-500">*</span>
                    </Label>
                    <div className="relative">
                      <span className="absolute left-2.5 top-2 text-xs text-gray-400 font-bold">Rs.</span>
                      <Input
                        id="edit-amount"
                        type="number"
                        placeholder="e.g. 150000"
                        value={amountStr}
                        onChange={(e) => handleAmountChange(e.target.value)}
                        className="pl-8 h-9 border-gray-200 focus:border-emerald-500 focus:ring-emerald-500 bg-white font-semibold text-xs"
                        required
                      />
                    </div>
                  </div>

                  {/* Date */}
                  <div className="flex flex-col gap-1">
                    <Label htmlFor="edit-date" className="text-xs font-semibold text-gray-700 flex items-center gap-1.5">
                      <CalendarIcon className="size-3.5 text-emerald-600" />
                      Payment Date <span className="text-red-500">*</span>
                    </Label>
                    <Input
                      id="edit-date"
                      type="date"
                      value={date}
                      onChange={(e) => setDate(e.target.value)}
                      className="h-9 border-gray-200 focus:border-emerald-500 focus:ring-emerald-500 bg-white text-xs font-semibold"
                      required
                    />
                  </div>
                </div>

                {/* 4. Full Received Switch */}
                <div className="flex items-center justify-between p-2.5 rounded-xl border border-gray-200/80 bg-slate-50/60">
                  <div className="space-y-0.5">
                    <Label htmlFor="edit-fullReceived" className="text-xs font-bold text-gray-900 cursor-pointer block">
                      Payment Received Status
                    </Label>
                    <p className="text-[10px] text-gray-500 font-medium">
                      {fullReceived ? "Full fee payment received" : "Partial / token advance payment"}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span
                      className={`text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full ${
                        fullReceived ? "bg-emerald-100 text-emerald-800" : "bg-gray-200 text-gray-600"
                      }`}
                    >
                      {fullReceived ? "Full" : "Partial"}
                    </span>
                    <Switch
                      id="edit-fullReceived"
                      checked={fullReceived}
                      onCheckedChange={(checked) => setFullReceived(checked)}
                    />
                  </div>
                </div>

                {/* 5. Notes */}
                <div className="flex flex-col gap-1">
                  <Label htmlFor="edit-notes" className="text-xs font-semibold text-gray-700">
                    Notes / Remarks <span className="text-[10px] text-gray-400 font-normal">(Optional)</span>
                  </Label>
                  <Input
                    id="edit-notes"
                    placeholder="e.g. Received via cheque"
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    className="h-8 border-gray-200 text-xs bg-white"
                  />
                </div>
              </div>

              {/* RIGHT COLUMN: Commissions & Slip Upload (5 Cols) */}
              <div className="lg:col-span-5 space-y-3 flex flex-col">
                {/* Auto Calculated Commission Badges */}
                <div className="grid grid-cols-2 gap-2.5">
                  <div className="p-2.5 rounded-xl border border-emerald-200 bg-emerald-50/50 flex flex-col justify-between">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-bold text-emerald-800">C.C (Counselor)</span>
                      <LockIcon className="size-3 text-emerald-600" />
                    </div>
                    <div className="text-sm font-black text-emerald-900 mt-1">
                      Rs. {counselorCommission ? Number(counselorCommission).toLocaleString() : "0"}
                    </div>
                    <div className="text-[9px] text-emerald-700 font-semibold truncate mt-0.5">
                      {ccCalcNote || "Auto rate"}
                    </div>
                  </div>

                  <div className="p-2.5 rounded-xl border border-blue-200 bg-blue-50/50 flex flex-col justify-between">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-bold text-blue-800">B.M Commission</span>
                      <LockIcon className="size-3 text-blue-600" />
                    </div>
                    <div className="text-sm font-black text-blue-900 mt-1">
                      Rs. {bmCommission ? Number(bmCommission).toLocaleString() : "0"}
                    </div>
                    <div className="text-[9px] text-blue-700 font-semibold truncate mt-0.5">
                      {bmCalcNote || "Auto rate"}
                    </div>
                  </div>
                </div>

                {/* Supporting Slips Upload & Gallery (Up to 5 images) */}
                <div className="p-3 rounded-xl border border-gray-200 bg-slate-50/70 space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5">
                      <ImageIcon className="size-3.5 text-emerald-600" />
                      <Label className="text-xs font-bold text-gray-800">Deposit Slips / Receipts</Label>
                    </div>
                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                        totalSlipsCount >= 5
                          ? "bg-amber-100 text-amber-800"
                          : totalSlipsCount > 0
                          ? "bg-emerald-100 text-emerald-800"
                          : "bg-gray-200 text-gray-600"
                      }`}
                    >
                      {totalSlipsCount}/5 Slips
                    </span>
                  </div>

                  {/* Dropzone Upload Button */}
                  {totalSlipsCount < 5 && (
                    <div
                      onClick={() => fileInputRef.current?.click()}
                      className="border-2 border-dashed border-emerald-300 hover:border-emerald-500 rounded-lg p-2.5 text-center cursor-pointer transition-colors bg-white hover:bg-emerald-50/40"
                    >
                      <UploadCloudIcon className="size-4 mx-auto text-emerald-600 mb-0.5" />
                      <p className="text-[11px] font-bold text-gray-800">Upload More Slips / Receipts</p>
                      <p className="text-[9px] text-gray-400">Add up to {5 - totalSlipsCount} more (Max 5MB each)</p>
                      <input
                        ref={fileInputRef}
                        type="file"
                        multiple
                        accept="image/*,application/pdf"
                        onChange={handleFilesChange}
                        className="hidden"
                      />
                    </div>
                  )}

                  {/* Thumbnails Gallery with Image Previews */}
                  {totalSlipsCount > 0 ? (
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 pt-1 max-h-40 overflow-y-auto pr-1">
                      {/* Existing Slips */}
                      {existingSlips.map((item, index) => (
                        <div
                          key={item.id}
                          className="group relative rounded-lg border border-emerald-300 bg-white overflow-hidden shadow-2xs hover:border-emerald-500 transition-all flex flex-col"
                        >
                          <div
                            onClick={() => setPreviewModalUrl(item.url)}
                            className="relative h-16 w-full bg-slate-100 flex items-center justify-center cursor-pointer overflow-hidden"
                          >
                            {item.isPdf ? (
                              <div className="flex flex-col items-center gap-1 text-red-500">
                                <FileTextIcon className="size-6" />
                                <span className="text-[8px] font-bold uppercase">PDF</span>
                              </div>
                            ) : (
                              // eslint-disable-next-line @next/next/no-img-element
                              <img
                                src={item.url}
                                alt={`Existing Slip ${index + 1}`}
                                className="h-full w-full object-cover group-hover:scale-105 transition-transform"
                              />
                            )}

                            <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                              <EyeIcon className="size-4 text-white drop-shadow" />
                            </div>

                            <span className="absolute top-1 left-1 bg-emerald-700/80 text-white text-[8px] font-bold px-1 rounded">
                              Saved #{index + 1}
                            </span>
                          </div>

                          <div className="p-1 flex items-center justify-between text-[9px] bg-white">
                            <span className="truncate max-w-[70px] text-emerald-800 font-semibold">
                              Saved Slip
                            </span>
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleRemoveExistingSlip(item.id);
                              }}
                              className="size-4 rounded text-gray-400 hover:text-red-600 hover:bg-red-50 flex items-center justify-center transition-colors"
                              title="Delete this slip"
                            >
                              <XIcon className="size-3" />
                            </button>
                          </div>
                        </div>
                      ))}

                      {/* New Uploaded Slips */}
                      {newSlips.map((item, index) => (
                        <div
                          key={item.id}
                          className="group relative rounded-lg border border-blue-300 bg-white overflow-hidden shadow-2xs hover:border-blue-500 transition-all flex flex-col"
                        >
                          <div
                            onClick={() => setPreviewModalUrl(item.previewUrl)}
                            className="relative h-16 w-full bg-slate-100 flex items-center justify-center cursor-pointer overflow-hidden"
                          >
                            {item.isPdf ? (
                              <div className="flex flex-col items-center gap-1 text-red-500">
                                <FileTextIcon className="size-6" />
                                <span className="text-[8px] font-bold uppercase">PDF</span>
                              </div>
                            ) : (
                              // eslint-disable-next-line @next/next/no-img-element
                              <img
                                src={item.previewUrl}
                                alt={`New Slip ${index + 1}`}
                                className="h-full w-full object-cover group-hover:scale-105 transition-transform"
                              />
                            )}

                            <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                              <EyeIcon className="size-4 text-white drop-shadow" />
                            </div>

                            <span className="absolute top-1 left-1 bg-blue-600/80 text-white text-[8px] font-bold px-1 rounded">
                              New #{index + 1}
                            </span>
                          </div>

                          <div className="p-1 flex items-center justify-between text-[9px] bg-white">
                            <span className="truncate max-w-[70px] text-blue-800 font-semibold" title={item.name}>
                              {item.name}
                            </span>
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleRemoveNewSlip(item.id);
                              }}
                              className="size-4 rounded text-gray-400 hover:text-red-600 hover:bg-red-50 flex items-center justify-center transition-colors"
                              title="Remove new slip"
                            >
                              <XIcon className="size-3" />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-2 text-[10px] text-gray-400 italic">
                      No slips attached (Slip status will be marked as Missing)
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Footer */}
            <DialogFooter className="pt-3 mt-3 border-t border-gray-100 flex gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                disabled={isLoading}
                className="h-9 border-gray-200 text-xs font-semibold hover:bg-gray-50 text-gray-700 cursor-pointer"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={isLoading}
                className="h-9 px-5 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs transition-colors cursor-pointer shadow-xs"
              >
                {isLoading ? (
                  <>
                    <Loader2Icon className="size-3.5 mr-1.5 animate-spin" />
                    Updating...
                  </>
                ) : (
                  "Update Commission"
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Image Preview Lightbox Modal */}
      {previewModalUrl && (
        <Dialog open={!!previewModalUrl} onOpenChange={() => setPreviewModalUrl(null)}>
          <DialogContent className="sm:max-w-[700px] max-h-[90vh] bg-black/95 text-white p-4 rounded-2xl border-none">
            <div className="flex justify-between items-center pb-2 border-b border-white/10">
              <span className="text-xs font-bold text-gray-200">Slip Full Preview</span>
              <Button
                size="icon-xs"
                variant="ghost"
                onClick={() => setPreviewModalUrl(null)}
                className="text-gray-300 hover:text-white"
              >
                <XIcon className="size-4" />
              </Button>
            </div>
            <div className="flex items-center justify-center max-h-[70vh] overflow-auto py-2">
              {previewModalUrl.includes("application/pdf") || previewModalUrl.endsWith(".pdf") ? (
                <div className="p-8 text-center space-y-3">
                  <FileTextIcon className="size-16 text-red-400 mx-auto" />
                  <p className="text-sm font-semibold">PDF Document Preview</p>
                  <a
                    href={previewModalUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-block px-4 py-2 bg-emerald-600 hover:bg-emerald-700 rounded-lg text-xs font-bold"
                  >
                    Open PDF in New Tab
                  </a>
                </div>
              ) : (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={previewModalUrl}
                  alt="Full Slip Preview"
                  className="max-h-[68vh] w-auto max-w-full object-contain rounded-lg shadow-lg"
                />
              )}
            </div>
          </DialogContent>
        </Dialog>
      )}
    </>
  );
}
