"use client";

import React, { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { AlertTriangleIcon, Loader2Icon } from "lucide-react";
import { toast } from "sonner";
import { InvestorCommissionEntry } from "@/lib/investorCommissionsTypes";

interface DeleteInvestorCommissionModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  entry?: InvestorCommissionEntry | null;
  entriesToDelete?: InvestorCommissionEntry[];
  onDeleteSingle: (id: string) => Promise<void>;
  onDeleteMultiple: (ids: string[]) => Promise<void>;
}

export function DeleteInvestorCommissionModal({
  open,
  onOpenChange,
  entry,
  entriesToDelete = [],
  onDeleteSingle,
  onDeleteMultiple,
}: DeleteInvestorCommissionModalProps) {
  const [isDeleting, setIsDeleting] = useState(false);

  const isBulk = entriesToDelete.length > 0;
  const count = isBulk ? entriesToDelete.length : 1;

  const handleDelete = async () => {
    setIsDeleting(true);
    try {
      if (isBulk) {
        const ids = entriesToDelete.map((e) => e.id);
        await onDeleteMultiple(ids);
        toast.success(`${count} student record(s) deleted successfully.`);
      } else if (entry) {
        await onDeleteSingle(entry.id);
        toast.success(`Record for "${entry.studentName}" deleted.`);
      }
      onOpenChange(false);
    } catch (err: any) {
      console.error(err);
      toast.error(err?.message || "Failed to delete entry.");
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md w-[95vw] bg-white p-6 rounded-2xl ring-1 ring-black/5 shadow-2xl">
        <DialogHeader className="flex flex-col items-center text-center pb-2">
          <div className="size-12 rounded-full bg-rose-100 flex items-center justify-center text-rose-600 mb-2">
            <AlertTriangleIcon className="size-6" />
          </div>
          <DialogTitle className="text-lg font-bold text-gray-900">
            {isBulk ? `Delete ${count} Student Entries?` : "Delete Student Entry?"}
          </DialogTitle>
          <DialogDescription className="text-xs text-gray-500 mt-1 max-w-sm">
            {isBulk ? (
              <span>
                Are you sure you want to delete <strong className="text-gray-900">{count} selected</strong> student entries? This action cannot be undone.
              </span>
            ) : entry ? (
              <span>
                Are you sure you want to delete the record for student{" "}
                <strong className="text-gray-900">{entry.studentName}</strong> (Passport: {entry.passportNo})?
              </span>
            ) : null}
          </DialogDescription>
        </DialogHeader>

        <DialogFooter className="pt-4 border-t border-gray-100 flex items-center justify-end gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isDeleting}
            className="text-xs font-semibold h-9 border-gray-200 text-gray-700"
          >
            Cancel
          </Button>
          <Button
            type="button"
            onClick={handleDelete}
            disabled={isDeleting}
            className="text-xs font-bold h-9 bg-rose-600 hover:bg-rose-700 text-white shadow-sm"
          >
            {isDeleting ? (
              <>
                <Loader2Icon className="mr-2 size-3.5 animate-spin" />
                <span>Deleting...</span>
              </>
            ) : (
              <span>{isBulk ? `Delete ${count} Entries` : "Delete Entry"}</span>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
