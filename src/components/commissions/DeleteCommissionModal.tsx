"use client";

import React, { useState } from "react";
import { useStore } from "@/lib/store";
import { CommissionEntry } from "@/lib/mockData";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Trash2Icon, Loader2Icon } from "lucide-react";
import { toast } from "sonner";

interface DeleteCommissionModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  entry: CommissionEntry | null;
}

export function DeleteCommissionModal({ open, onOpenChange, entry }: DeleteCommissionModalProps) {
  const { deleteCommissionEntry } = useStore();
  const [isDeleting, setIsDeleting] = useState(false);

  if (!entry) return null;

  const handleDelete = async () => {
    setIsDeleting(true);
    try {
      await deleteCommissionEntry(entry.id);
      setIsDeleting(false);
      onOpenChange(false);
      toast.success(`Commission record for ${entry.studentName} deleted successfully.`);
    } catch (err) {
      setIsDeleting(false);
      toast.error("Failed to delete commission entry.");
    }
  };

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent className="sm:max-w-[420px] bg-white p-6 rounded-2xl shadow-xl border border-gray-100">
        <AlertDialogHeader>
          <div className="size-11 rounded-full bg-red-50 text-red-600 flex items-center justify-center mb-2 mx-auto sm:mx-0">
            <Trash2Icon className="size-5" />
          </div>
          <AlertDialogTitle className="text-base font-bold text-gray-900">
            Delete Commission Record
          </AlertDialogTitle>
          <AlertDialogDescription className="text-xs text-gray-600">
            Are you sure you want to delete the commission entry for student <strong>{entry.studentName}</strong> (Rs. {entry.amount.toLocaleString()})? This action cannot be undone.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter className="mt-4 flex gap-2">
          <AlertDialogCancel
            disabled={isDeleting}
            className="h-9 border-gray-200 text-xs font-semibold hover:bg-gray-50 text-gray-700 cursor-pointer"
          >
            Cancel
          </AlertDialogCancel>
          <AlertDialogAction
            onClick={(e) => {
              e.preventDefault();
              handleDelete();
            }}
            disabled={isDeleting}
            className="h-9 bg-red-600 hover:bg-red-700 text-white font-semibold text-xs transition-colors cursor-pointer shadow-xs"
          >
            {isDeleting ? (
              <>
                <Loader2Icon className="size-3.5 mr-1.5 animate-spin" />
                Deleting...
              </>
            ) : (
              "Delete Entry"
            )}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
