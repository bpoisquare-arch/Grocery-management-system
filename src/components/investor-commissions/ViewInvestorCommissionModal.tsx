"use client";

import React, { useState } from "react";
import { format } from "date-fns";
import {
  FileTextIcon,
  DownloadIcon,
  ExternalLinkIcon,
  PencilIcon,
  CalendarIcon,
  UserIcon,
  CheckCircle2Icon,
  XCircleIcon,
  CalculatorIcon,
  CreditCardIcon,
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
import { InvestorCommissionEntry } from "@/lib/investorCommissionsTypes";

interface ViewInvestorCommissionModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  entry: InvestorCommissionEntry | null;
  onEditClick?: () => void;
  isAuditor?: boolean;
}

export function ViewInvestorCommissionModal({
  open,
  onOpenChange,
  entry,
  onEditClick,
  isAuditor,
}: ViewInvestorCommissionModalProps) {
  const [selectedSlipIndex, setSelectedSlipIndex] = useState(0);

  if (!entry) return null;

  const slips: string[] = entry.slipUrls && entry.slipUrls.length > 0
    ? entry.slipUrls
    : entry.slipUrl
    ? [entry.slipUrl]
    : [];

  const recAmt = entry.receivableAmount ?? entry.investorCommission;
  const payAmt = entry.payableAmount ?? 0;
  const edlinkAmt = entry.edlinkCommission !== undefined ? entry.edlinkCommission : (recAmt - payAmt);

  const activeSlip = slips[selectedSlipIndex] || null;
  const isPdf = activeSlip ? (activeSlip.includes("application/pdf") || activeSlip.endsWith(".pdf")) : false;

  const handleDownload = (url: string, index: number) => {
    const a = document.createElement("a");
    a.href = url;
    a.download = isPdf
      ? `Investor_Slip_${entry.studentName}_${index + 1}.pdf`
      : `Investor_Slip_${entry.studentName}_${index + 1}.png`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-4xl w-[95vw] md:w-full bg-white p-4 sm:p-5 rounded-2xl ring-1 ring-black/5 shadow-2xl max-h-[95vh] flex flex-col overflow-hidden">
        <DialogHeader className="pb-3 border-b border-gray-100 pr-8 sm:pr-10 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <div className="flex items-center gap-2">
              <span className="font-mono text-xs font-bold text-gray-500 bg-slate-100 px-2 py-0.5 rounded">
                #{entry.srNo}
              </span>
              <DialogTitle className="text-base sm:text-lg md:text-xl font-bold text-gray-900 truncate">
                {entry.studentName}
              </DialogTitle>
            </div>
            <p className="text-xs text-gray-500 mt-0.5">
              Investors Commissions Record Details
            </p>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            {onEditClick && !isAuditor && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  onOpenChange(false);
                  onEditClick();
                }}
                className="h-8 text-xs font-semibold gap-1.5 border-emerald-300 text-emerald-700 bg-emerald-50/50 hover:bg-emerald-100"
              >
                <PencilIcon className="size-3.5" />
                <span>Edit Record</span>
              </Button>
            )}
          </div>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto space-y-5 py-3 pr-1">
          {/* Top Summary Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5 sm:gap-3">
            {/* Passport No (Highlighted) */}
            <div className="p-2.5 sm:p-3 rounded-xl bg-slate-50 border border-gray-200">
              <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">
                PASSPORT NO.
              </span>
              <div className="mt-1">
                <span className="inline-flex items-center px-2 py-0.5 rounded-md font-mono text-xs font-black tracking-wider uppercase bg-amber-100 text-amber-950 border border-amber-300">
                  {entry.passportNo}
                </span>
              </div>
            </div>

            {/* Principal Amount */}
            <div className="p-2.5 sm:p-3 rounded-xl bg-slate-50 border border-gray-200">
              <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">
                PRINCIPAL AMOUNT
              </span>
              <p className="text-sm sm:text-base font-extrabold text-gray-900 mt-1 truncate">
                Rs. {entry.amount.toLocaleString()}
              </p>
            </div>

            {/* Receivable Commission % & Receivable Amount */}
            <div className="p-2.5 sm:p-3 rounded-xl bg-emerald-50/60 border border-emerald-200">
              <span className="text-[10px] font-bold text-emerald-800 uppercase tracking-wider block flex items-center gap-1 truncate">
                <CalculatorIcon className="size-3 text-emerald-600 shrink-0" />
                <span className="truncate">REC. ({entry.receivableCommissionRate ?? entry.commissionRate}%)</span>
              </span>
              <p className="text-sm sm:text-base font-extrabold text-emerald-700 mt-1 truncate">
                Rs. {recAmt.toLocaleString()}
              </p>
            </div>

            {/* Payable Commission % & Payable Amount */}
            <div className="p-2.5 sm:p-3 rounded-xl bg-blue-50/60 border border-blue-200">
              <span className="text-[10px] font-bold text-blue-800 uppercase tracking-wider block flex items-center gap-1 truncate">
                <CalculatorIcon className="size-3 text-blue-600 shrink-0" />
                <span className="truncate">PAY. ({entry.payableCommissionRate ?? 0}%)</span>
              </span>
              <p className="text-sm sm:text-base font-extrabold text-blue-700 mt-1 truncate">
                Rs. {payAmt.toLocaleString()}
              </p>
            </div>

            {/* EdLink Commission (Auto-Calculated Difference) */}
            <div className="p-2.5 sm:p-3 rounded-xl bg-purple-50/60 border border-purple-200">
              <span className="text-[10px] font-bold text-purple-900 uppercase tracking-wider block flex items-center gap-1 truncate">
                <CalculatorIcon className="size-3 text-purple-600 shrink-0" />
                <span className="truncate">EDLINK COMM</span>
              </span>
              <p className="text-sm sm:text-base font-extrabold text-purple-800 mt-1 truncate">
                Rs. {edlinkAmt.toLocaleString()}
              </p>
            </div>

            {/* Slip Status */}
            <div className="p-2.5 sm:p-3 rounded-xl bg-slate-50 border border-gray-200">
              <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">
                SLIP STATUS
              </span>
              <div className="mt-1 flex items-center gap-1.5">
                {entry.status === "Slip Uploaded" ? (
                  <Badge className="bg-emerald-50 text-emerald-700 border-emerald-200 font-bold text-xs gap-1">
                    <CheckCircle2Icon className="size-3 text-emerald-600" />
                    <span>Uploaded ({slips.length})</span>
                  </Badge>
                ) : (
                  <Badge className="bg-rose-50 text-rose-700 border-rose-200 font-bold text-xs gap-1">
                    <XCircleIcon className="size-3 text-rose-600" />
                    <span>Slip Missing</span>
                  </Badge>
                )}
              </div>
            </div>
          </div>


          {/* Secondary Details: Statement Days, Account Number, Paid to Investor & Date */}
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 p-3.5 rounded-xl bg-slate-50/50 border border-gray-200/80 text-xs">
            <div>
              <span className="font-bold text-gray-500 uppercase tracking-wider text-[10px] block">
                STATEMENT DAYS
              </span>
              <p className="mt-1 font-bold text-gray-900">
                {entry.statementDays ? `${entry.statementDays} Days` : <span className="font-sans text-gray-400 font-normal">N/A</span>}
              </p>
            </div>

            <div>
              <span className="font-bold text-gray-500 uppercase tracking-wider text-[10px] flex items-center gap-1">
                <CreditCardIcon className="size-3 text-gray-400" /> ACCOUNT NUMBER
              </span>
              <p className="mt-1 font-mono font-bold text-gray-900">
                {entry.accountNo || <span className="font-sans text-gray-400 font-normal">Not Provided</span>}
              </p>
            </div>

            <div>
              <span className="font-bold text-gray-500 uppercase tracking-wider text-[10px] block">
                PAID TO INVESTOR
              </span>
              <div className="mt-1">
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

            <div>
              <span className="font-bold text-gray-500 uppercase tracking-wider text-[10px] flex items-center gap-1">
                <CalendarIcon className="size-3 text-gray-400" /> REGISTRATION DATE
              </span>
              <p className="mt-1 font-semibold text-gray-800">
                {entry.date ? format(new Date(entry.date), "dd MMMM yyyy") : "-"}
              </p>
            </div>
          </div>

          {/* Remarks / Notes */}
          {entry.notes && (
            <div className="p-3.5 rounded-xl bg-white border border-gray-200 space-y-1">
              <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">
                REMARKS / NOTES
              </span>
              <p className="text-xs text-gray-700 whitespace-pre-wrap">{entry.notes}</p>
            </div>
          )}

          {/* Slips Viewer Section */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <h4 className="text-xs font-bold text-gray-800 uppercase tracking-wider">
                  ATTACHED VERIFICATION SLIPS ({slips.length})
                </h4>
                {slips.length > 0 && (
                  <Badge variant="outline" className="text-[10px] font-semibold">
                    Viewing {selectedSlipIndex + 1} of {slips.length}
                  </Badge>
                )}
              </div>

              {activeSlip && (
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleDownload(activeSlip, selectedSlipIndex)}
                    className="h-8 text-xs font-semibold gap-1.5"
                  >
                    <DownloadIcon className="size-3.5" />
                    <span>Download</span>
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => window.open(activeSlip, "_blank")}
                    className="h-8 text-xs font-semibold gap-1.5"
                  >
                    <ExternalLinkIcon className="size-3.5" />
                    <span>Open in New Tab</span>
                  </Button>
                </div>
              )}
            </div>

            {/* Slips tabs if multiple */}
            {slips.length > 1 && (
              <div className="flex items-center gap-2 overflow-x-auto pb-1">
                {slips.map((s, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => setSelectedSlipIndex(idx)}
                    className={cn(
                      "px-3 py-1.5 rounded-lg text-xs font-bold transition-all border cursor-pointer shrink-0 flex items-center gap-1.5",
                      selectedSlipIndex === idx
                        ? "bg-emerald-600 text-white border-emerald-600 shadow-2xs"
                        : "bg-slate-50 text-gray-600 border-gray-200 hover:bg-slate-100"
                    )}
                  >
                    <span>Slip #{idx + 1}</span>
                    {s.includes("application/pdf") || s.endsWith(".pdf") ? (
                      <span className="text-[10px] opacity-80">(PDF)</span>
                    ) : (
                      <span className="text-[10px] opacity-80">(IMG)</span>
                    )}
                  </button>
                ))}
              </div>
            )}

            {/* Main Slip Preview Display */}
            {activeSlip ? (
              <div className="border border-gray-200 rounded-xl p-3 bg-slate-50 min-h-[350px] flex items-center justify-center">
                {isPdf ? (
                  <iframe
                    src={activeSlip}
                    title="Slip PDF Viewer"
                    className="w-full h-[450px] rounded-lg border border-gray-200 bg-white"
                  />
                ) : (
                  <img
                    src={activeSlip}
                    alt="Slip Verification"
                    className="max-h-[450px] w-auto object-contain rounded-lg shadow-2xs"
                  />
                )}
              </div>
            ) : (
              <div className="border-2 border-dashed border-rose-200 rounded-xl p-8 text-center bg-rose-50/30">
                <div className="flex flex-col items-center justify-center gap-2">
                  <div className="p-3 rounded-full bg-rose-100 text-rose-600">
                    <FileTextIcon className="size-6" />
                  </div>
                  <span className="text-xs font-bold text-rose-900">No Slip Document Attached</span>
                  <span className="text-[11px] text-gray-500 max-w-sm">
                    This student record was created without an attached receipt slip. You can edit this entry anytime to upload the supporting slip.
                  </span>
                </div>
              </div>
            )}
          </div>

          {/* Audit Meta */}
          <div className="pt-2 border-t border-gray-100 flex flex-wrap items-center justify-between gap-2 text-[11px] text-gray-400">
            <span>Added by: <strong className="text-gray-600">{entry.addedBy || "Admin"}</strong></span>
            <span>Created on: {entry.createdAt ? format(new Date(entry.createdAt), "dd MMM yyyy, hh:mm a") : "-"}</span>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
