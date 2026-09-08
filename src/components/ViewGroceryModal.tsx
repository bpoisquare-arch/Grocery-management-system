"use client";

import React, { useState, useEffect } from "react";
import { format, parseISO } from "date-fns";
import {
  FileTextIcon,
  AlertTriangleIcon,
  CheckCircle2Icon,
  ImageIcon,
  Maximize2Icon,
  ExternalLinkIcon,
  DownloadIcon,
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
import { GroceryEntry } from "@/lib/mockData";
import { cn } from "@/lib/utils";

interface ViewGroceryModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  entry: GroceryEntry | null;
}

export function ViewGroceryModal({ open, onOpenChange, entry }: ViewGroceryModalProps) {
  const [selectedSlipIndex, setSelectedSlipIndex] = useState(0);
  const [lightboxUrl, setLightboxUrl] = useState<string | null>(null);

  const allSlips: string[] = React.useMemo(() => {
    if (!entry) return [];
    if (entry.slipUrls && Array.isArray(entry.slipUrls) && entry.slipUrls.length > 0) {
      return entry.slipUrls;
    }
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

  const formatDateString = (isoString: string) => {
    try {
      return format(parseISO(isoString), "PPP p");
    } catch (e) {
      return isoString;
    }
  };

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
        <DialogContent className="sm:max-w-4xl w-[95vw] bg-white p-5 md:p-7 rounded-2xl ring-1 ring-black/5 shadow-2xl max-h-[92vh] overflow-y-auto">
          <DialogHeader className="pb-3 border-b border-gray-100">
            <div className="flex items-center justify-between">
              <div>
                <DialogTitle className="text-lg md:text-xl font-bold text-gray-900">Grocery Expense Details</DialogTitle>
                <DialogDescription className="text-xs md:text-sm text-gray-500">
                  Full audit record and attached receipts for {entry.entity} Entity.
                </DialogDescription>
              </div>
              {getStatusBadge()}
            </div>
          </DialogHeader>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 mt-3 items-start">
            {/* Metadata Section (5 Columns) */}
            <div className="lg:col-span-5 space-y-3.5 text-xs text-gray-600">
              <div className="border-b border-gray-100 pb-2">
                <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">Entity / Branch</span>
                <span className="font-bold text-gray-900 text-sm mt-0.5 block">{entry.entity.toUpperCase()}</span>
              </div>

              <div className="border-b border-gray-100 pb-2">
                <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">Expense Date</span>
                <span className="font-semibold text-gray-900 text-xs mt-0.5 block">
                  {entry.date ? (
                    (() => {
                      const d = new Date(entry.date);
                      return isNaN(d.getTime()) ? entry.date : format(d, "dd MMMM yyyy");
                    })()
                  ) : (
                    "-"
                  )}
                </span>
              </div>

              <div className="border-b border-gray-100 pb-2">
                <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">Expense Amount</span>
                <span className="text-lg font-bold text-emerald-700 block mt-0.5">
                  Rs. {entry.amount.toLocaleString()}
                </span>
              </div>

              <div className="border-b border-gray-100 pb-2">
                <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">Grocery Details</span>
                <p className="font-medium text-gray-900 leading-relaxed mt-1 bg-slate-50 p-2.5 rounded-lg border border-gray-100">
                  {entry.details}
                </p>
              </div>

              <div className="border-b border-gray-100 pb-2">
                <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">Recorded By</span>
                <span className="font-semibold text-gray-800 mt-0.5 block">{entry.addedBy || "Unknown User"}</span>
              </div>

              <div className="border-b border-gray-100 pb-2">
                <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">Audit Timestamps</span>
                <div className="text-[11px] space-y-0.5 font-medium text-gray-500 mt-1">
                  <div>Created: {formatDateString(entry.createdAt)}</div>
                  <div>Last Updated: {formatDateString(entry.updatedAt)}</div>
                </div>
              </div>

              {entry.status === "Approved Without Slip" && (
                <div className="flex items-center gap-2 bg-blue-50 border border-blue-100 p-2.5 rounded-lg text-blue-800 text-xs font-semibold">
                  <CheckCircle2Icon className="size-4 shrink-0 text-blue-600" />
                  <span>Approved by Admin (Original slip not uploaded)</span>
                </div>
              )}
            </div>

            {/* Slip Gallery & Preview Section (7 Columns) */}
            <div className="lg:col-span-7 flex flex-col gap-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <ImageIcon className="size-4 text-emerald-600" />
                  <h4 className="text-xs font-bold text-gray-800">
                    Supporting Slips / Receipts ({allSlips.length})
                  </h4>
                </div>
                {allSlips.length > 0 && (
                  <span className="text-[11px] text-gray-500 font-medium">
                    Viewing slip #{selectedSlipIndex + 1} of {allSlips.length}
                  </span>
                )}
              </div>

              {allSlips.length > 0 ? (
                <div className="border border-gray-200 rounded-xl overflow-hidden bg-slate-50 p-3 space-y-3">
                  {/* Main Active Viewer */}
                  <div className="relative rounded-lg overflow-hidden bg-white border border-gray-200 flex items-center justify-center min-h-[260px] max-h-[300px]">
                    {isCurrentPdf ? (
                      <div className="p-6 text-center space-y-3 flex flex-col items-center">
                        <div className="size-14 rounded-2xl bg-red-50 flex items-center justify-center text-red-600 shadow-2xs">
                          <FileTextIcon className="size-7" />
                        </div>
                        <div>
                          <p className="text-xs font-bold text-gray-800">PDF Document Attachment</p>
                          <p className="text-[10px] text-gray-400 mt-0.5">Slip #{selectedSlipIndex + 1} of {allSlips.length}</p>
                        </div>
                        <div className="flex items-center gap-2 pt-1">
                          <a
                            href={currentSlip!}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1.5 text-xs text-white font-semibold px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 shadow-xs"
                          >
                            <ExternalLinkIcon className="size-3.5" />
                            Open PDF in New Tab
                          </a>
                          <a
                            href={currentSlip!}
                            download={`grocery-slip-${selectedSlipIndex + 1}.pdf`}
                            className="inline-flex items-center gap-1.5 text-xs text-gray-700 font-semibold px-3 py-1.5 rounded-lg bg-white border border-gray-200 hover:bg-gray-50 shadow-3xs"
                          >
                            <DownloadIcon className="size-3.5" />
                            Download
                          </a>
                        </div>
                      </div>
                    ) : (
                      <div className="relative w-full h-full min-h-[260px] flex items-center justify-center group p-2">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={currentSlip!}
                          alt={`Slip ${selectedSlipIndex + 1}`}
                          className="object-contain max-h-[270px] w-full rounded-md"
                        />
                        <button
                          type="button"
                          onClick={() => setLightboxUrl(currentSlip)}
                          className="absolute bottom-3 right-3 bg-black/70 hover:bg-black/90 text-white p-2 rounded-lg text-xs font-medium flex items-center gap-1.5 shadow-lg backdrop-blur-xs transition-transform active:scale-95"
                          title="View fullscreen"
                        >
                          <Maximize2Icon className="size-3.5" />
                          <span>Fullscreen</span>
                        </button>
                      </div>
                    )}
                  </div>

                  {/* Multiple Slips Thumbnails Carousel / Selector (If >1 slip) */}
                  {allSlips.length > 1 && (
                    <div className="space-y-1.5">
                      <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">
                        Select Slip ({allSlips.length} Attached)
                      </span>
                      <div className="flex items-center gap-2 overflow-x-auto pb-1">
                        {allSlips.map((url, idx) => {
                          const isPdf = url.includes("application/pdf") || url.toLowerCase().endsWith(".pdf");
                          const isSelected = idx === selectedSlipIndex;

                          return (
                            <button
                              key={idx}
                              type="button"
                              onClick={() => setSelectedSlipIndex(idx)}
                              className={cn(
                                "size-14 rounded-lg border-2 shrink-0 overflow-hidden flex flex-col items-center justify-center p-0.5 transition-all bg-white relative",
                                isSelected
                                  ? "border-emerald-600 ring-2 ring-emerald-500/20 shadow-xs"
                                  : "border-gray-200 opacity-60 hover:opacity-100"
                              )}
                              title={`View Slip #${idx + 1}`}
                            >
                              {isPdf ? (
                                <div className="flex flex-col items-center justify-center text-red-500">
                                  <FileTextIcon className="size-5" />
                                  <span className="text-[8px] font-bold mt-0.5">PDF #{idx + 1}</span>
                                </div>
                              ) : (
                                // eslint-disable-next-line @next/next/no-img-element
                                <img
                                  src={url}
                                  alt={`Thumbnail ${idx + 1}`}
                                  className="w-full h-full object-cover rounded-sm"
                                />
                              )}
                              {isSelected && (
                                <div className="absolute top-0.5 right-0.5 size-2 rounded-full bg-emerald-600 ring-1 ring-white" />
                              )}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center gap-2 text-center p-8 bg-slate-50 border border-gray-200 rounded-xl min-h-[260px]">
                  <div className="size-12 rounded-full bg-amber-50 flex items-center justify-center text-amber-600">
                    <AlertTriangleIcon className="size-6" />
                  </div>
                  <span className="text-xs font-bold text-gray-800">No Grocery Slips Attached</span>
                  <span className="text-[11px] text-gray-500 max-w-[220px]">
                    No receipts or supporting invoices were uploaded for this transaction.
                  </span>
                </div>
              )}

              <div className="flex justify-end pt-2">
                <Button
                  variant="outline"
                  onClick={() => onOpenChange(false)}
                  className="w-full sm:w-auto h-9 px-5 border-gray-200 text-xs font-semibold text-gray-700"
                >
                  Close View
                </Button>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* High-Resolution Fullscreen Lightbox Modal */}
      {lightboxUrl && (
        <Dialog open={!!lightboxUrl} onOpenChange={(v) => !v && setLightboxUrl(null)}>
          <DialogContent className="max-w-[95vw] sm:max-w-4xl max-h-[94vh] bg-black/95 text-white border-none p-3 sm:p-4 rounded-2xl flex flex-col justify-between">
            <div className="flex items-center justify-between pb-2 border-b border-white/10">
              <span className="text-xs font-semibold text-gray-300">
                Receipt Slip #{selectedSlipIndex + 1} of {allSlips.length} • {entry.details}
              </span>
              <div className="flex items-center gap-2">
                <a
                  href={lightboxUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-xs text-white/90 hover:text-white px-2.5 py-1 rounded bg-white/10 hover:bg-white/20 transition-colors"
                >
                  <ExternalLinkIcon className="size-3" />
                  Open in New Tab
                </a>
                <button
                  type="button"
                  onClick={() => setLightboxUrl(null)}
                  className="p-1 rounded-md text-white/70 hover:text-white hover:bg-white/10"
                >
                  <XIcon className="size-5" />
                </button>
              </div>
            </div>

            <div className="flex-1 flex items-center justify-center p-2 min-h-[60vh] max-h-[78vh] overflow-auto">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={lightboxUrl}
                alt="Full preview"
                className="max-h-[75vh] w-auto max-w-full object-contain rounded-lg shadow-2xl"
              />
            </div>

            <div className="text-center pt-2 text-[11px] text-white/50">
              Use mouse wheel or pinch to zoom • Press ESC or click Close to exit
            </div>
          </DialogContent>
        </Dialog>
      )}
    </>
  );
}
