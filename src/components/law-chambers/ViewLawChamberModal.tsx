"use client";

import React, { useState } from "react";
import { format } from "date-fns";
import {
  XIcon,
  DownloadIcon,
  FileTextIcon,
  ExternalLinkIcon,
  PencilIcon,
  UserIcon,
  CreditCardIcon,
  CalendarIcon,
  BanknoteIcon,
  CheckCircle2Icon,
  AlertCircleIcon,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { LawChamberEntry } from "@/lib/lawChambersTypes";

interface ViewLawChamberModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  entry: LawChamberEntry | null;
  onEditClick?: (entry: LawChamberEntry) => void;
}

export function ViewLawChamberModal({
  open,
  onOpenChange,
  entry,
  onEditClick,
}: ViewLawChamberModalProps) {
  const [selectedSlipIndex, setSelectedSlipIndex] = useState(0);

  if (!entry) return null;

  const slips: string[] = entry.slipUrls && Array.isArray(entry.slipUrls) && entry.slipUrls.length > 0
    ? entry.slipUrls
    : entry.slipUrl ? [entry.slipUrl] : [];

  const currentSlip = slips[selectedSlipIndex] || slips[0];
  const isPdf = currentSlip ? (currentSlip.includes("application/pdf") || currentSlip.endsWith(".pdf")) : false;

  const handleDownload = (url: string, index: number) => {
    const link = document.createElement("a");
    link.href = url;
    link.download = `LawChambers_${entry.passportNo}_Slip_${index + 1}.${isPdf ? "pdf" : "png"}`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-4xl w-[95vw] md:w-full bg-white p-4 sm:p-5 rounded-2xl ring-1 ring-black/5 shadow-2xl max-h-[95vh] overflow-y-auto overflow-x-hidden">
        <DialogHeader className="pb-3 border-b border-gray-100 pr-8 sm:pr-10 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-mono font-bold px-2 py-0.5 rounded bg-slate-100 text-slate-700">
                S.No #{entry.srNo}
              </span>
              <DialogTitle className="text-base sm:text-lg md:text-xl font-bold text-gray-900 truncate">
                {entry.studentName}
              </DialogTitle>
            </div>
            <p className="text-xs text-gray-500 mt-0.5">
              Chambers Law Record Details
            </p>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            {onEditClick && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  onOpenChange(false);
                  onEditClick(entry);
                }}
                className="h-8 text-xs font-semibold gap-1.5 border-gray-200 hover:bg-slate-50"
              >
                <PencilIcon className="size-3.5 text-gray-500" />
                Edit
              </Button>
            )}
          </div>
        </DialogHeader>

        {/* Top Details Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-4">
          <div className="p-3 rounded-xl bg-slate-50 border border-slate-100 space-y-1">
            <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block flex items-center gap-1">
              <CreditCardIcon className="size-3" /> Passport No.
            </span>
            <span className="text-sm font-mono font-bold text-emerald-800">
              {entry.passportNo}
            </span>
          </div>

          <div className="p-3 rounded-xl bg-slate-50 border border-slate-100 space-y-1">
            <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block flex items-center gap-1">
              <CalendarIcon className="size-3" /> Date
            </span>
            <span className="text-sm font-bold text-gray-800">
              {entry.date}
            </span>
          </div>

          <div className="p-3 rounded-xl bg-emerald-50/60 border border-emerald-100 space-y-1">
            <span className="text-[10px] font-bold text-emerald-700 uppercase tracking-wider block flex items-center gap-1">
              <BanknoteIcon className="size-3" /> Fee Amount
            </span>
            <span className="text-sm font-extrabold text-emerald-900">
              Rs. {entry.amount.toLocaleString()}
            </span>
          </div>

          <div className="p-3 rounded-xl bg-slate-50 border border-slate-100 space-y-1">
            <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">
              Paid to Chamber
            </span>
            <Badge
              className={cn(
                "text-xs font-bold px-2 py-0.5",
                entry.reimbursed === "Yes"
                  ? "bg-emerald-100 text-emerald-800 border-emerald-200"
                  : "bg-amber-100 text-amber-800 border-amber-200"
              )}
            >
              {entry.reimbursed === "Yes" ? "✓ Yes (Paid)" : "No (Pending)"}
            </Badge>
          </div>
        </div>

        {/* Slips Section */}
        <div className="mt-4 space-y-3">
          <div className="flex items-center justify-between border-b border-gray-100 pb-2">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-gray-800">
                Supporting Slip / Documents
              </span>
              <Badge
                variant="outline"
                className={cn(
                  "text-[10px] font-bold",
                  slips.length > 0
                    ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                    : "bg-rose-50 text-rose-700 border-rose-200"
                )}
              >
                {slips.length > 0 ? `● ${slips.length} Slip(s) Uploaded` : "● Slip Missing"}
              </Badge>
            </div>

            {currentSlip && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleDownload(currentSlip, selectedSlipIndex)}
                className="h-7 text-xs font-semibold gap-1 text-emerald-700 border-emerald-200 hover:bg-emerald-50"
              >
                <DownloadIcon className="size-3" />
                Download Slip
              </Button>
            )}
          </div>

          {slips.length === 0 ? (
            <div className="p-8 text-center rounded-xl bg-amber-50/50 border border-dashed border-amber-200 text-amber-800 space-y-2">
              <AlertCircleIcon className="size-8 mx-auto text-amber-500" />
              <p className="text-xs font-bold">No receipt slip attached to this student record.</p>
              <p className="text-[11px] text-amber-600">
                You can upload a receipt or screenshot by editing this entry.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {/* Slip thumbnails if multiple */}
              {slips.length > 1 && (
                <div className="flex items-center gap-2 overflow-x-auto pb-1">
                  {slips.map((s, idx) => {
                    const isPdfDoc = s.includes("application/pdf") || s.endsWith(".pdf");
                    return (
                      <button
                        key={idx}
                        onClick={() => setSelectedSlipIndex(idx)}
                        className={cn(
                          "size-14 rounded-lg border-2 overflow-hidden shrink-0 flex items-center justify-center bg-slate-100 transition-all",
                          selectedSlipIndex === idx
                            ? "border-emerald-600 shadow-sm"
                            : "border-gray-200 opacity-70 hover:opacity-100"
                        )}
                      >
                        {isPdfDoc ? (
                          <div className="flex flex-col items-center justify-center text-red-500">
                            <FileTextIcon className="size-5" />
                            <span className="text-[7px] font-bold">#{idx + 1}</span>
                          </div>
                        ) : (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={s} alt={`Slip ${idx + 1}`} className="w-full h-full object-cover" />
                        )}
                      </button>
                    );
                  })}
                </div>
              )}

              {/* Main Slip Preview */}
              <div className="rounded-xl border border-gray-200 bg-slate-50/50 p-2 min-h-[350px] flex items-center justify-center">
                {isPdf ? (
                  <iframe
                    src={currentSlip}
                    title="PDF Document"
                    className="w-full h-[520px] rounded-lg border border-gray-200 bg-white"
                  />
                ) : (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={currentSlip}
                    alt="Slip Preview"
                    className="max-h-[520px] max-w-full object-contain rounded-lg shadow-sm"
                  />
                )}
              </div>
            </div>
          )}
        </div>

        {/* Notes if any */}
        {entry.notes && (
          <div className="mt-4 p-3 rounded-xl bg-slate-50 border border-slate-100">
            <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block mb-1">
              Remarks / Notes
            </span>
            <p className="text-xs text-gray-700 whitespace-pre-wrap">{entry.notes}</p>
          </div>
        )}

        {/* Footer Meta */}
        <div className="mt-4 pt-3 border-t border-gray-100 flex items-center justify-between text-[11px] text-gray-400">
          <span>Added by: <strong className="text-gray-600">{entry.addedBy}</strong></span>
          <span>Created on: {entry.createdAt ? format(new Date(entry.createdAt), "dd MMM yyyy, hh:mm a") : "-"}</span>
        </div>
      </DialogContent>
    </Dialog>
  );
}
