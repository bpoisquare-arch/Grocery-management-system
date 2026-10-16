"use client";

import React, { useState } from "react";
import { Trash2Icon, Loader2Icon } from "lucide-react";
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

interface DeleteGroceryModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  entry: GroceryEntry | null;
}

export function DeleteGroceryModal({ open, onOpenChange, entry }: DeleteGroceryModalProps) {
  const { deleteGroceryEntry } = useStore();
  const [isDeleting, setIsDeleting] = useState(false);

  if (!entry) return null;

  const handleDelete = async () => {
    setIsDeleting(true);
    try {
      deleteGroceryEntry(entry.id);
      toast.success(`Grocery entry deleted successfully.`);
      onOpenChange(false);
    } catch (err) {
      toast.error("Something went wrong. Unable to delete entry.");
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent size="default" className="bg-white p-6 rounded-xl ring-1 ring-black/5 shadow-xl">
        <AlertDialogHeader>
          <AlertDialogMedia className="bg-red-50 text-red-600">
            <Trash2Icon className="size-5" />
          </AlertDialogMedia>
          <AlertDialogTitle className="text-gray-900 font-bold text-base">
            Delete Grocery Entry?
          </AlertDialogTitle>
          <AlertDialogDescription className="text-sm text-gray-500 mt-1">
            This action will permanently remove this grocery entry. This cannot be undone.
          </AlertDialogDescription>
        </AlertDialogHeader>

        <div className="my-4 bg-gray-50 p-3 rounded-lg border border-gray-100 text-xs font-semibold text-gray-700 space-y-1.5">
          <div className="flex justify-between">
            <span className="text-gray-400 uppercase tracking-wider text-[10px]">Item</span>
            <span className="text-gray-900 truncate max-w-[200px]">{entry.details}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-400 uppercase tracking-wider text-[10px]">Amount</span>
            <span className="text-red-600 font-bold">Rs. {entry.amount.toLocaleString()}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-400 uppercase tracking-wider text-[10px]">Entity</span>
            <span className="text-gray-900">{entry.entity}</span>
          </div>
        </div>

        <AlertDialogFooter>
          <AlertDialogCancel onClick={() => onOpenChange(false)} className="border-gray-200 text-gray-700">
            Cancel
          </AlertDialogCancel>
          <Button
            onClick={handleDelete}
            disabled={isDeleting}
            className="bg-red-600 hover:bg-red-700 text-white font-medium shadow-sm h-10 transition-colors"
          >
            {isDeleting ? (
              <>
                <Loader2Icon className="size-4 mr-2 animate-spin" />
                Deleting...
              </>
            ) : (
              "Delete Grocery"
            )}
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
