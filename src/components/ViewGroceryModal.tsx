"use client";

import React from "react";
import { format, parseISO } from "date-fns";
import { FileIcon, FileTextIcon, AlertTriangleIcon, CheckCircle2Icon } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button, buttonVariants } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { GroceryEntry } from "@/lib/mockData";
import { cn } from "@/lib/utils";

interface ViewGroceryModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  entry: GroceryEntry | null;
}

export function ViewGroceryModal({ open, onOpenChange, entry }: ViewGroceryModalProps) {
  if (!entry) return null;

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
      <DialogContent className="sm:max-w-3xl w-full bg-white p-6 md:p-8 rounded-xl ring-1 ring-black/5 shadow-xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold text-gray-900">Grocery Expense Details</DialogTitle>
          <DialogDescription className="text-sm text-gray-500">
            Full audit details for this grocery transaction.
          </DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-4">
          {/* Metadata Section */}
          <div className="space-y-4 text-sm text-gray-600">
            <div className="border-b border-gray-100 pb-2">
              <span className="text-xs font-bold text-gray-400 uppercase tracking-wider block">Entity</span>
              <span className="font-semibold text-gray-900">{entry.entity.toUpperCase()}</span>
            </div>

            <div className="border-b border-gray-100 pb-2">
              <span className="text-xs font-bold text-gray-400 uppercase tracking-wider block">Grocery Date</span>
              <span className="font-semibold text-gray-900">
                {entry.date ? (
                  (() => {
                    const d = new Date(entry.date);
                    return isNaN(d.getTime()) ? entry.date : format(d, "PPP");
                  })()
                ) : (
                  "-"
                )}
              </span>
            </div>

            <div className="border-b border-gray-100 pb-2">
              <span className="text-xs font-bold text-gray-400 uppercase tracking-wider block">Amount</span>
              <span className="text-lg font-bold text-emerald-700">
                Rs. {entry.amount.toLocaleString()}
              </span>
            </div>

            <div className="border-b border-gray-100 pb-2">
              <span className="text-xs font-bold text-gray-400 uppercase tracking-wider block">Grocery Details</span>
              <p className="font-medium text-gray-900 leading-relaxed mt-0.5">{entry.details}</p>
            </div>

            <div className="border-b border-gray-100 pb-2">
              <span className="text-xs font-bold text-gray-400 uppercase tracking-wider block">Audit Timestamps</span>
              <div className="text-xs space-y-1 font-medium text-gray-500 mt-1">
                <div>Created: {formatDateString(entry.createdAt)}</div>
                <div>Last Updated: {formatDateString(entry.updatedAt)}</div>
              </div>
            </div>

            <div>
              <span className="text-xs font-bold text-gray-400 uppercase tracking-wider block mb-1">Slip Status</span>
              {getStatusBadge()}
            </div>

            {entry.status === "Approved Without Slip" && (
              <div className="flex items-center gap-2 bg-emerald-50/50 border border-emerald-100 p-2.5 rounded-lg text-emerald-800 text-xs font-semibold">
                <CheckCircle2Icon className="size-4 shrink-0 text-emerald-600" />
                <span>Approved by Admin (Original slip was not uploaded)</span>
              </div>
            )}
          </div>

          {/* Slip Preview Section */}
          <div className="flex flex-col gap-2">
            <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">
              Supporting Slip Preview
            </span>

            <div className="flex-1 min-h-64 border border-gray-200 rounded-lg bg-gray-50 p-3 flex flex-col items-center justify-center relative overflow-hidden">
              {entry.slipUrl ? (
                entry.slipType === "pdf" ? (
                  <div className="flex flex-col items-center gap-3 p-4 text-center">
                    <div className="size-16 rounded-xl bg-red-50 flex items-center justify-center text-red-600 shadow-2xs">
                      <FileTextIcon className="size-8" />
                    </div>
                    <div className="flex flex-col">
                      <span className="text-xs font-semibold text-gray-900">Document_Slip.pdf</span>
                      <span className="text-[10px] text-gray-400 mt-0.5">Portable Document Format</span>
                    </div>
                    <a
                      href={entry.slipUrl}
                      download="grocery-slip.pdf"
                      target="_blank"
                      rel="noreferrer"
                      className={cn(buttonVariants({ variant: "outline", size: "sm" }), "h-8 border-gray-200 shadow-3xs text-xs font-semibold")}
                    >
                      Download Document
                    </a>
                  </div>
                ) : (
                  // Image preview
                  <div className="relative w-full h-full min-h-60 flex items-center justify-center">
                    <img
                      src={entry.slipUrl}
                      alt="Grocery receipt slip"
                      className="max-w-full max-h-64 object-contain rounded-md shadow-sm border border-gray-200/50"
                    />
                  </div>
                )
              ) : (
                // No slip state
                <div className="flex flex-col items-center gap-2 text-center p-4">
                  <div className="size-10 rounded-full bg-red-50 flex items-center justify-center text-red-600">
                    <AlertTriangleIcon className="size-5" />
                  </div>
                  <span className="text-xs font-semibold text-gray-900">No Grocery Slip Uploaded</span>
                  <span className="text-[10px] text-gray-500 max-w-[200px]">
                    No supporting document or invoice was uploaded for this transaction.
                  </span>
                </div>
              )}
            </div>

            <div className="flex justify-end mt-4">
              <Button
                variant="outline"
                onClick={() => onOpenChange(false)}
                className="w-full sm:w-auto border-gray-200 hover:bg-gray-50 text-gray-700"
              >
                Close View
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
