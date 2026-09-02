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
  FileCheck2Icon,
  LockIcon,
} from "lucide-react";
import { toast } from "sonner";

interface EditCommissionModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  entry: CommissionEntry | null;
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

  const [slipFile, setSlipFile] = useState<File | null>(null);
  const [slipPreview, setSlipPreview] = useState<string | null>(null);
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
      setSlipPreview(entry.slipUrl || null);
      setSlipFile(null);

      // Re-run logical calculation to display rule applied note
      recalculateCommission(eCounselor, eService, eAmountStr);
    }
  }, [entry, counselors]);

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

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        toast.error("Receipt file size cannot exceed 5MB.");
        return;
      }
      setSlipFile(file);
      const previewUrl = URL.createObjectURL(file);
      setSlipPreview(previewUrl);
    }
  };

  const handleRemoveFile = () => {
    setSlipFile(null);
    if (slipPreview && slipPreview.startsWith("blob:")) {
      URL.revokeObjectURL(slipPreview);
    }
    setSlipPreview(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
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
      toast.error("Please enter a valid amount.");
      return;
    }

    setIsLoading(true);

    try {
      await updateCommissionEntry(entry.id, {
        studentName: studentName.trim(),
        service,
        counselor,
        amount,
        date,
        fullReceived,
        counselorCommission: parseFloat(counselorCommission) || 0,
        bmCommission: parseFloat(bmCommission) || 0,
        notes: notes.trim() || undefined,
        slipFile,
      });

      setIsLoading(false);
      onOpenChange(false);
      toast.success("Commission entry updated successfully.");
    } catch (err) {
      setIsLoading(false);
      toast.error("Failed to update commission entry.");
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[580px] max-h-[90vh] overflow-y-auto bg-white p-6 rounded-2xl shadow-xl border border-gray-100">
        <DialogHeader className="pb-2 border-b border-gray-100">
          <div className="flex items-center gap-2">
            <div className="size-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <PencilIcon className="size-4" />
            </div>
            <div>
              <DialogTitle className="text-lg font-bold text-gray-900">
                Edit Student Commission
              </DialogTitle>
              <DialogDescription className="text-xs text-gray-500 font-medium">
                Modify transaction details, received amount, or payment status.
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 pt-2">
          {/* Student Name */}
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="editStudentName" className="text-xs font-semibold text-gray-700 flex items-center gap-1.5">
              <GraduationCapIcon className="size-3.5 text-emerald-600" />
              Student Name <span className="text-red-500">*</span>
            </Label>
            <Input
              id="editStudentName"
              placeholder="e.g. Muhammad Hamza"
              value={studentName}
              onChange={(e) => setStudentName(e.target.value)}
              className="h-10 border-gray-200 focus:border-emerald-500 focus:ring-emerald-500 bg-white"
              required
            />
          </div>

          {/* Service & Counselor */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="editService" className="text-xs font-semibold text-gray-700">
                Service Provided <span className="text-red-500">*</span>
              </Label>
              <Select value={service} onValueChange={(val) => handleServiceChange(val as CommissionService)}>
                <SelectTrigger id="editService" className="h-10 border-gray-200 text-xs font-semibold bg-white">
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

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="editCounselor" className="text-xs font-semibold text-gray-700 flex items-center gap-1.5">
                <UserIcon className="size-3.5 text-emerald-600" />
                Counselor <span className="text-red-500">*</span>
              </Label>
              <Select value={counselor} onValueChange={(val) => handleCounselorChange(val || "Humaira Amin")}>
                <SelectTrigger id="editCounselor" className="h-10 border-gray-200 text-xs font-semibold bg-white">
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

          {/* Amount & Date */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="editAmount" className="text-xs font-semibold text-gray-700">
                Amount Paid (Rs.) <span className="text-red-500">*</span>
              </Label>
              <div className="relative">
                <span className="absolute left-3 top-2.5 text-xs text-gray-400 font-bold">Rs.</span>
                <Input
                  id="editAmount"
                  type="number"
                  placeholder="e.g. 150000"
                  value={amountStr}
                  onChange={(e) => handleAmountChange(e.target.value)}
                  className="pl-9 h-10 border-gray-200 focus:border-emerald-500 focus:ring-emerald-500 bg-white font-semibold"
                  required
                />
              </div>
            </div>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="editDate" className="text-xs font-semibold text-gray-700 flex items-center gap-1.5">
                <CalendarIcon className="size-3.5 text-emerald-600" />
                Payment Date <span className="text-red-500">*</span>
              </Label>
              <Input
                id="editDate"
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="h-10 border-gray-200 focus:border-emerald-500 focus:ring-emerald-500 bg-white text-xs font-semibold"
                required
              />
            </div>
          </div>

          {/* Fully Received Switch Button */}
          <div className="flex items-center justify-between p-3 rounded-xl border border-gray-200/80 bg-slate-50/70">
            <div className="space-y-0.5">
              <Label htmlFor="editFullReceived" className="text-xs font-bold text-gray-900 cursor-pointer">
                Full Received
              </Label>
              <p className="text-[11px] text-gray-500 font-medium">
                {fullReceived ? "Full student payment has been received." : "Partial / token payment (pending remaining amount)."}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full ${fullReceived ? "bg-emerald-100 text-emerald-800" : "bg-gray-200 text-gray-600"}`}>
                {fullReceived ? "Full" : "Partial"}
              </span>
              <Switch
                id="editFullReceived"
                checked={fullReceived}
                onCheckedChange={(checked) => setFullReceived(checked)}
              />
            </div>
          </div>

          {/* C.C & B.M in Grid (Locked / Logical Auto Calculation) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="editCc" className="text-xs font-semibold text-gray-700 flex items-center justify-between">
                <span>C.C (Counselor Commission)</span>
                <span className="text-[10px] text-emerald-700 font-bold flex items-center gap-1">
                  <LockIcon className="size-3" />
                  Auto Calculated
                </span>
              </Label>
              <div className="relative">
                <span className="absolute left-3 top-2.5 text-xs text-emerald-700 font-bold">Rs.</span>
                <Input
                  id="editCc"
                  type="text"
                  readOnly
                  disabled
                  placeholder="0"
                  value={counselorCommission ? Number(counselorCommission).toLocaleString() : "0"}
                  className="pl-9 h-10 border-emerald-200 bg-emerald-50/40 text-emerald-900 font-black cursor-not-allowed select-none opacity-100"
                />
              </div>
              {ccCalcNote ? (
                <span className="text-[10px] text-emerald-600 font-bold flex items-center gap-1">
                  ✓ {ccCalcNote}
                </span>
              ) : (
                <span className="text-[10px] text-gray-400 font-medium">
                  Calculated from counselor service rate
                </span>
              )}
            </div>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="editBm" className="text-xs font-semibold text-gray-700 flex items-center justify-between">
                <span>B.M Commission</span>
                <span className="text-[10px] text-blue-700 font-bold flex items-center gap-1">
                  <LockIcon className="size-3" />
                  Auto Calculated
                </span>
              </Label>
              <div className="relative">
                <span className="absolute left-3 top-2.5 text-xs text-blue-700 font-bold">Rs.</span>
                <Input
                  id="editBm"
                  type="text"
                  readOnly
                  disabled
                  placeholder="0"
                  value={bmCommission ? Number(bmCommission).toLocaleString() : "0"}
                  className="pl-9 h-10 border-blue-200 bg-blue-50/40 text-blue-900 font-black cursor-not-allowed select-none opacity-100"
                />
              </div>
              {bmCalcNote ? (
                <span className="text-[10px] text-blue-600 font-bold flex items-center gap-1">
                  ✓ {bmCalcNote}
                </span>
              ) : (
                <span className="text-[10px] text-gray-400 font-medium">
                  Calculated from B.M branch rate
                </span>
              )}
            </div>
          </div>

          {/* Slip / Receipt Upload */}
          <div className="flex flex-col gap-1.5">
            <Label className="text-xs font-semibold text-gray-700 flex items-center justify-between">
              <span>Supporting Slip / Bank Receipt</span>
              <span className="text-[10px] text-gray-400 font-normal">(Optional)</span>
            </Label>

            {slipPreview ? (
              <div className="relative flex items-center justify-between p-3 border border-emerald-200 bg-emerald-50/50 rounded-xl">
                <div className="flex items-center gap-2 text-xs font-semibold text-emerald-900 truncate">
                  <FileCheck2Icon className="size-4 text-emerald-600 shrink-0" />
                  <span className="truncate">{slipFile?.name || "Existing Receipt Attachment"}</span>
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-xs"
                  onClick={handleRemoveFile}
                  className="size-7 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg shrink-0 cursor-pointer"
                >
                  <XIcon className="size-3.5" />
                </Button>
              </div>
            ) : (
              <div
                onClick={() => fileInputRef.current?.click()}
                className="border-2 border-dashed border-gray-200 hover:border-emerald-500/60 rounded-xl p-3 text-center cursor-pointer transition-colors bg-slate-50/40 hover:bg-emerald-50/20"
              >
                <UploadCloudIcon className="size-5 mx-auto text-gray-400 mb-1" />
                <p className="text-xs font-semibold text-gray-700">Click to upload deposit slip / receipt</p>
                <p className="text-[10px] text-gray-400">PNG, JPG, PDF up to 5MB</p>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*,application/pdf"
                  onChange={handleFileChange}
                  className="hidden"
                />
              </div>
            )}
          </div>

          <DialogFooter className="pt-3 border-t border-gray-100 flex gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isLoading}
              className="h-10 border-gray-200 text-xs font-semibold hover:bg-gray-50 text-gray-700 cursor-pointer"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={isLoading}
              className="h-10 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs transition-colors cursor-pointer shadow-xs"
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
  );
}
