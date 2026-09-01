"use client";

import React, { useState } from "react";
import { CheckCircle2Icon, Loader2Icon } from "lucide-react";
import { useStore } from "@/lib/store";
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogCancel,
  AlertDialogMedia,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { GroceryEntry } from "@/lib/mockData";
import { toast } from "sonner";

interface ApproveWithoutSlipModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  entry: GroceryEntry | null;
}

export function ApproveWithoutSlipModal({
  open,
  onOpenChange,
  entry,
}: ApproveWithoutSlipModalProps) {
  const { approveEntryWithoutSlip } = useStore();
  const [isApproving, setIsApproving] = useState(false);

  if (!entry) return null;

  const handleApprove = async () => {
    setIsApproving(true);
    try {
      approveEntryWithoutSlip(entry.id);
      toast.success("Grocery approved without slip.");
      onOpenChange(false);
    } catch (err) {
      toast.error("Something went wrong. Unable to approve entry.");
    } finally {
      setIsApproving(false);
    }
  };

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent className="bg-white p-6 rounded-xl ring-1 ring-black/5 shadow-xl">
        <AlertDialogHeader>
          <AlertDialogMedia className="bg-emerald-50 text-emerald-600">
            <CheckCircle2Icon className="size-5" />
          </AlertDialogMedia>
          <AlertDialogTitle className="text-gray-900 font-bold text-base">
            Approve Without Slip?
          </AlertDialogTitle>
          <AlertDialogDescription className="text-sm text-gray-500 mt-1">
            This grocery entry does not have an uploaded supporting slip. Are you sure you want to approve it?
          </AlertDialogDescription>
        </AlertDialogHeader>

        <div className="my-4 bg-gray-50 p-3 rounded-lg border border-gray-100 text-xs font-semibold text-gray-700 space-y-1.5">
          <div className="flex justify-between">
            <span className="text-gray-400 uppercase tracking-wider text-[10px]">Item</span>
            <span className="text-gray-900 truncate max-w-[200px]">{entry.details}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-400 uppercase tracking-wider text-[10px]">Amount</span>
            <span className="text-gray-900 font-bold">Rs. {entry.amount.toLocaleString()}</span>
          </div>

        </div>

        <AlertDialogFooter>
          <AlertDialogCancel onClick={() => onOpenChange(false)} className="border-gray-200 text-gray-700">
            Cancel
          </AlertDialogCancel>
          <Button
            onClick={handleApprove}
            disabled={isApproving}
            className="bg-emerald-600 hover:bg-emerald-700 text-white font-medium shadow-sm h-10 transition-colors"
          >
            {isApproving ? (
              <>
                <Loader2Icon className="size-4 mr-2 animate-spin" />
                Approving...
              </>
            ) : (
              "Yes, Approve"
            )}
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
