"use client";

import React from "react";
import { format } from "date-fns";
import { FileIcon, FileTextIcon, AlertTriangleIcon, CheckCircle2Icon, GraduationCapIcon, UserIcon, CalendarIcon, CoinsIcon, BadgePercentIcon } from "lucide-react";
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
  if (!entry) return null;

  const getStatusBadge = () => {
    switch (entry.status) {
      case "Slip Uploaded":
        return (
          <Badge className="bg-emerald-50 text-emerald-700 hover:bg-emerald-50 border border-emerald-100 flex items-center gap-1 w-fit">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-600" />
            Slip Uploaded
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
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[620px] max-h-[90vh] overflow-y-auto bg-white p-6 rounded-2xl shadow-xl border border-gray-100">
        <DialogHeader className="pb-3 border-b border-gray-100">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="size-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
                <BadgePercentIcon className="size-4" />
              </div>
              <div>
                <DialogTitle className="text-lg font-bold text-gray-900">
                  Commission Details
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
          {/* Main highlights */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-slate-50/70 p-3.5 rounded-xl border border-gray-100">
            <div>
              <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">Student</span>
              <span className="text-xs font-bold text-gray-900 truncate block mt-0.5">{entry.studentName}</span>
            </div>
            <div>
              <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">Total Amount</span>
              <span className="text-xs font-bold text-emerald-700 block mt-0.5">Rs. {entry.amount.toLocaleString()}</span>
            </div>
            <div>
              <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">Counselor</span>
              <span className="text-xs font-semibold text-gray-900 block mt-0.5">{entry.counselor}</span>
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

          {/* Details list */}
          <div className="space-y-2.5 text-xs">
            <div className="flex justify-between py-1.5 border-b border-gray-100">
              <span className="text-gray-500 font-medium">Service Type:</span>
              <Badge className="bg-slate-100 text-slate-800 border-gray-200 font-semibold text-[11px]">
                {entry.service}
              </Badge>
            </div>
            <div className="flex justify-between py-1.5 border-b border-gray-100">
              <span className="text-gray-500 font-medium">Date:</span>
              <span className="font-semibold text-gray-800">
                {entry.date ? format(new Date(entry.date), "dd MMMM yyyy") : "-"}
              </span>
            </div>
            <div className="flex justify-between py-1.5 border-b border-gray-100">
              <span className="text-gray-500 font-medium">Counselor Commission (C.C):</span>
              <span className="font-bold text-emerald-700">Rs. {entry.counselorCommission.toLocaleString()}</span>
            </div>
            <div className="flex justify-between py-1.5 border-b border-gray-100">
              <span className="text-gray-500 font-medium">Branch Manager Commission (B.M):</span>
              <span className="font-bold text-gray-900">Rs. {entry.bmCommission.toLocaleString()}</span>
            </div>
            {entry.notes && (
              <div className="py-1.5 border-b border-gray-100">
                <span className="text-gray-500 font-medium block mb-1">Notes:</span>
                <p className="text-gray-700 bg-slate-50 p-2 rounded-lg font-medium">{entry.notes}</p>
              </div>
            )}
          </div>

          {/* Slip Attachment Viewer */}
          <div className="pt-2">
            <h4 className="text-xs font-bold text-gray-800 mb-2">Supporting Slip / Bank Receipt</h4>
            {entry.slipUrl ? (
              <div className="border border-gray-200 rounded-xl overflow-hidden bg-slate-50">
                {entry.slipType === "pdf" ? (
                  <div className="p-6 text-center space-y-2">
                    <FileTextIcon className="size-10 text-red-500 mx-auto" />
                    <p className="text-xs font-semibold text-gray-800">PDF Document Attachment</p>
                    <a
                      href={entry.slipUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-block text-xs text-emerald-600 font-semibold underline mt-2"
                    >
                      Open PDF in new tab
                    </a>
                  </div>
                ) : (
                  <div className="relative max-h-72 overflow-hidden flex items-center justify-center bg-black/5">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={entry.slipUrl}
                      alt="Receipt Slip"
                      className="object-contain max-h-72 w-full"
                    />
                  </div>
                )}
              </div>
            ) : (
              <div className="p-4 rounded-xl border border-dashed border-red-200 bg-red-50/40 text-center text-xs text-red-600 font-medium flex items-center justify-center gap-2">
                <AlertTriangleIcon className="size-4" />
                <span>No receipt slip attached. Status is marked as Slip Missing.</span>
              </div>
            )}
          </div>
        </div>

        <div className="pt-4 border-t border-gray-100 flex justify-end">
          <Button
            onClick={() => onOpenChange(false)}
            className="h-9 px-4 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold rounded-lg cursor-pointer"
          >
            Close Details
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
