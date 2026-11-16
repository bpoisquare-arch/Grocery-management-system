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
import { LawChamberEntry } from "@/lib/lawChambersTypes";

interface DeleteLawChamberModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  entry?: LawChamberEntry | null;
  entriesToDelete?: LawChamberEntry[];
  onDeleteSingle: (id: string) => Promise<void>;
  onDeleteMultiple: (ids: string[]) => Promise<void>;
}

export function DeleteLawChamberModal({
  open,
  onOpenChange,
  entry,
  entriesToDelete = [],
  onDeleteSingle,
  onDeleteMultiple,
}: DeleteLawChamberModalProps) {
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
          <div className="size-12 rounded-full bg-red-100 text-red-600 flex items-center justify-center mb-3">
            <AlertTriangleIcon className="size-6" />
          </div>
          <DialogTitle className="text-lg font-bold text-gray-900">
            {isBulk ? `Delete ${count} Student Records?` : "Delete Student Record?"}
          </DialogTitle>
          <DialogDescription className="text-xs text-gray-500 mt-1">
            {isBulk ? (
              <span>
                Are you sure you want to permanently delete <strong>{count}</strong> selected records? This action cannot be undone.
              </span>
            ) : (
              <span>
                Are you sure you want to delete student record for{" "}
                <strong className="text-gray-800">{entry?.studentName}</strong> (Passport: {entry?.passportNo})?
              </span>
            )}
          </DialogDescription>
        </DialogHeader>

        <DialogFooter className="mt-4 flex gap-2 sm:justify-end">
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isDeleting}
            className="h-9 text-xs font-semibold"
          >
            Cancel
          </Button>
          <Button
            type="button"
            variant="destructive"
            onClick={handleDelete}
            disabled={isDeleting}
            className="h-9 bg-red-600 hover:bg-red-700 text-white text-xs font-semibold px-4"
          >
            {isDeleting ? (
              <>
                <Loader2Icon className="size-3.5 mr-1.5 animate-spin" />
                Deleting...
              </>
            ) : (
              "Yes, Delete Record"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
