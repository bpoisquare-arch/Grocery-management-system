"use client";

import React, { useState, useEffect } from "react";
import { format } from "date-fns";
import {
  FileTextIcon,
  AlertTriangleIcon,
  GraduationCapIcon,
  UserIcon,
  CalendarIcon,
  BadgePercentIcon,
  EyeIcon,
  ImageIcon,
  Maximize2Icon,
  ExternalLinkIcon,
  XIcon,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { CommissionEntry } from "@/lib/mockData";

interface ViewCommissionModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  entry: CommissionEntry | null;
}

export function ViewCommissionModal({ open, onOpenChange, entry }: ViewCommissionModalProps) {
  const [selectedSlipIndex, setSelectedSlipIndex] = useState(0);
  const [lightboxUrl, setLightboxUrl] = useState<string | null>(null);

  const allSlips: string[] = React.useMemo(() => {
    if (!entry) return [];
    if (entry.slipUrls && entry.slipUrls.length > 0) return entry.slipUrls;
    if (entry.slipUrl) return [entry.slipUrl];
    return [];
  }, [entry]);

  useEffect(() => {
    setSelectedSlipIndex(0);
    setLightboxUrl(null);
  }, [entry, open]);

  if (!entry) return null;

  const currentSlip = allSlips[selectedSlipIndex] || null;
  const isCurrentPdf = currentSlip
    ? currentSlip.includes("application/pdf") || currentSlip.toLowerCase().endsWith(".pdf")
    : false;

  const getStatusBadge = () => {
    switch (entry.status) {
      case "Slip Uploaded":
        return (
          <Badge className="bg-emerald-50 text-emerald-700 hover:bg-emerald-50 border border-emerald-100 flex items-center gap-1 w-fit">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-600" />
            {allSlips.length > 1 ? `${allSlips.length} Slips Uploaded` : "Slip Uploaded"}
          </Badge>
        );
      case "Slip Missing":
        return (
          <Badge className="bg-red-50 text-red-700 hover:bg-red-50 border border-red-100 flex items-center gap-1 w-fit">
            <span className="h-1.5 w-1.5 rounded-full bg-red-600 animate-pulse" />
            Slip Missing
          </Badge>
        );
      case "Approved Without Slip":
        return (
          <Badge className="bg-blue-50 text-blue-700 hover:bg-blue-50 border border-blue-100 flex items-center gap-1 w-fit">
            <span className="h-1.5 w-1.5 rounded-full bg-blue-600" />
            Approved Without Slip
          </Badge>
        );
      default:
        return null;
    }
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-[780px] w-[95vw] max-h-[92vh] overflow-y-auto bg-white p-5 sm:p-6 rounded-2xl shadow-2xl border border-gray-100">
          <DialogHeader className="pb-3 border-b border-gray-100">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="size-9 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center shadow-2xs">
                  <BadgePercentIcon className="size-5" />
                </div>
                <div>
                  <DialogTitle className="text-base sm:text-lg font-bold text-gray-900 leading-snug">
                    Commission Details & Deposit Slips
                  </DialogTitle>
                  <DialogDescription className="text-xs text-gray-500 font-medium">
                    {entry.entity} Branch • Transaction ID: {entry.id}
                  </DialogDescription>
                </div>
              </div>
              {getStatusBadge()}
            </div>
          </DialogHeader>

          <div className="space-y-4 pt-2">
            {/* Top Stat Highlights */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-slate-50/70 p-3 rounded-xl border border-gray-100">
              <div>
                <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">Student</span>
                <span className="text-xs font-bold text-gray-900 truncate block mt-0.5">{entry.studentName}</span>
              </div>
              <div>
                <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">Total Amount</span>
                <span className="text-xs font-bold text-emerald-700 block mt-0.5">
                  Rs. {entry.amount.toLocaleString()}
                </span>
              </div>
              <div>
                <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">Counselor</span>
                <span className="text-xs font-semibold text-gray-900 block mt-0.5 truncate">{entry.counselor}</span>
              </div>
              <div>
                <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">Payment Status</span>
                <span className="mt-0.5 inline-block">
                  {entry.fullReceived ? (
                    <Badge className="bg-emerald-100 text-emerald-800 border-none text-[10px] font-bold py-0">
                      Full Received
                    </Badge>
                  ) : (
                    <Badge className="bg-amber-100 text-amber-800 border-none text-[10px] font-bold py-0">
                      Partial
                    </Badge>
                  )}
                </span>
              </div>
            </div>

            {/* Middle Grid: Breakdown & Slips Viewer */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-start">
              {/* Left Column: Transaction Details (5 Cols) */}
              <div className="lg:col-span-5 space-y-2 text-xs">
                <div className="flex justify-between py-1.5 border-b border-gray-100">
                  <span className="text-gray-500 font-medium">Service Type:</span>
                  <Badge className="bg-slate-100 text-slate-800 border-gray-200 font-semibold text-[11px]">
                    {entry.service}
                  </Badge>
                </div>
                <div className="flex justify-between py-1.5 border-b border-gray-100">
                  <span className="text-gray-500 font-medium">Payment Date:</span>
                  <span className="font-semibold text-gray-800">
                    {entry.date ? format(new Date(entry.date), "dd MMMM yyyy") : "-"}
                  </span>
                </div>
                <div className="flex justify-between py-1.5 border-b border-gray-100">
                  <span className="text-gray-500 font-medium">Counselor Commission (C.C):</span>
                  <span className="font-bold text-emerald-700">Rs. {entry.counselorCommission.toLocaleString()}</span>
                </div>
                <div className="flex justify-between py-1.5 border-b border-gray-100">
                  <span className="text-gray-500 font-medium">B.M Commission:</span>
                  <span className="font-bold text-blue-700">Rs. {entry.bmCommission.toLocaleString()}</span>
                </div>
                {entry.notes && (
                  <div className="py-1.5 border-b border-gray-100">
                    <span className="text-gray-500 font-medium block mb-1">Notes / Remarks:</span>
                    <p className="text-gray-700 bg-slate-50 p-2 rounded-lg font-medium text-[11px]">{entry.notes}</p>
                  </div>
                )}
                <div className="text-[10px] text-gray-400 font-medium pt-1">
                  Created: {format(new Date(entry.createdAt), "dd MMM yyyy, hh:mm a")}
                </div>
              </div>

              {/* Right Column: Multi-Slip Gallery & Preview (7 Cols) */}
              <div className="lg:col-span-7 space-y-2.5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <ImageIcon className="size-3.5 text-emerald-600" />
                    <h4 className="text-xs font-bold text-gray-800">
                      Supporting Slips / Receipts ({allSlips.length})
                    </h4>
                  </div>
                  {allSlips.length > 0 && (
                    <span className="text-[10px] text-gray-500 font-medium">
                      Viewing slip #{selectedSlipIndex + 1} of {allSlips.length}
                    </span>
                  )}
                </div>

                {allSlips.length > 0 ? (
                  <div className="border border-gray-200 rounded-xl overflow-hidden bg-slate-50 p-2 space-y-2">
                    {/* Active Main Preview */}
                    <div className="relative rounded-lg overflow-hidden bg-black/5 flex items-center justify-center min-h-[190px] max-h-[220px]">
                      {isCurrentPdf ? (
                        <div className="p-6 text-center space-y-2">
                          <FileTextIcon className="size-10 text-red-500 mx-auto" />
                          <p className="text-xs font-semibold text-gray-800">PDF Document Attachment</p>
                          <a
                            href={currentSlip!}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 text-xs text-emerald-600 font-semibold underline mt-1"
                          >
                            <ExternalLinkIcon className="size-3" />
                            Open PDF in new tab
                          </a>
                        </div>
                      ) : (
                        <div className="relative w-full h-full flex items-center justify-center group">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src={currentSlip!}
                            alt={`Slip ${selectedSlipIndex + 1}`}
                            className="object-contain max-h-[210px] w-full"
                          />
                          <button
                            type="button"
                            onClick={() => setLightboxUrl(currentSlip)}
                            className="absolute top-2 right-2 size-7 rounded-lg bg-black/60 hover:bg-black/80 text-white flex items-center justify-center shadow-md transition-colors"
                            title="Expand full image"
                          >
                            <Maximize2Icon className="size-3.5" />
                          </button>
                        </div>
                      )}
                    </div>

                    {/* Thumbnail Selector Gallery (if > 1 slips) */}
                    {allSlips.length > 1 && (
                      <div className="flex gap-2 overflow-x-auto pb-1 pt-0.5">
                        {allSlips.map((url, idx) => {
                          const isPdf = url.includes("application/pdf") || url.toLowerCase().endsWith(".pdf");
                          const isSelected = idx === selectedSlipIndex;

                          return (
                            <button
                              key={idx}
                              type="button"
                              onClick={() => setSelectedSlipIndex(idx)}
                              className={`relative shrink-0 size-13 rounded-lg overflow-hidden border-2 transition-all cursor-pointer ${
                                isSelected
                                  ? "border-emerald-600 ring-2 ring-emerald-500/30 shadow-xs"
                                  : "border-gray-200 opacity-70 hover:opacity-100"
                              }`}
                            >
                              {isPdf ? (
                                <div className="h-full w-full bg-red-50 flex flex-col items-center justify-center text-red-600">
                                  <FileTextIcon className="size-5" />
                                  <span className="text-[7px] font-black">PDF</span>
                                </div>
                              ) : (
                                // eslint-disable-next-line @next/next/no-img-element
                                <img
                                  src={url}
                                  alt={`Thumbnail ${idx + 1}`}
                                  className="h-full w-full object-cover"
                                />
                              )}
                              <span className="absolute bottom-0 right-0 bg-black/70 text-white text-[8px] font-bold px-1 rounded-tl">
                                #{idx + 1}
                              </span>
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="p-6 rounded-xl border border-dashed border-red-200 bg-red-50/40 text-center text-xs text-red-600 font-medium flex flex-col items-center justify-center gap-1.5">
                    <AlertTriangleIcon className="size-5 text-red-500" />
                    <span className="font-semibold">No supporting receipt slips attached.</span>
                    <span className="text-[11px] text-gray-500">
                      Transaction is currently classified as Slip Missing.
                    </span>
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="pt-3 border-t border-gray-100 flex justify-end">
            <Button
              onClick={() => onOpenChange(false)}
              className="h-9 px-5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold rounded-xl cursor-pointer"
            >
              Close Details
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Lightbox Modal */}
      {lightboxUrl && (
        <Dialog open={!!lightboxUrl} onOpenChange={() => setLightboxUrl(null)}>
          <DialogContent className="sm:max-w-[760px] max-h-[90vh] bg-black/95 text-white p-4 rounded-2xl border-none">
            <div className="flex justify-between items-center pb-2 border-b border-white/10">
              <span className="text-xs font-bold text-gray-200">
                Deposit Slip Full View #{selectedSlipIndex + 1}
              </span>
              <Button
                size="icon-xs"
                variant="ghost"
                onClick={() => setLightboxUrl(null)}
                className="text-gray-300 hover:text-white"
              >
                <XIcon className="size-4" />
              </Button>
            </div>
            <div className="flex items-center justify-center max-h-[72vh] overflow-auto py-2">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={lightboxUrl}
                alt="Full Slip Preview"
                className="max-h-[70vh] w-auto max-w-full object-contain rounded-lg shadow-lg"
              />
            </div>
          </DialogContent>
        </Dialog>
      )}
    </>
  );
}
