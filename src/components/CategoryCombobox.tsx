"use client";

import React, { useState, useMemo, useRef, useEffect } from "react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { CheckIcon, ChevronsUpDownIcon, PlusIcon, SearchIcon, TagIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { Category } from "@/lib/mockData";

interface CategoryComboboxProps {
  value?: string;
  categories: Category[];
  onSelect: (categoryName: string) => void;
  onAddNewCategory: (initialName?: string) => void;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
}

export function CategoryCombobox({
  value,
  categories,
  onSelect,
  onAddNewCategory,
  placeholder = "Select category",
  disabled = false,
  className,
}: CategoryComboboxProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  // Focus search input when popover opens
  useEffect(() => {
    if (open) {
      setTimeout(() => {
        inputRef.current?.focus();
      }, 50);
    } else {
      setSearch("");
    }
  }, [open]);

  // Filtered categories
  const filteredCategories = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return categories;
    return categories.filter((cat) => cat.name.toLowerCase().includes(q));
  }, [categories, search]);

  const hasExactMatch = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return false;
    return categories.some((cat) => cat.name.toLowerCase() === q);
  }, [categories, search]);

  const selectedCategoryObj = useMemo(() => {
    if (!value) return null;
    return categories.find((c) => c.name.toLowerCase() === value.toLowerCase());
  }, [categories, value]);

  const handleSelect = (catName: string) => {
    onSelect(catName);
    setOpen(false);
  };

  const handleAddNew = () => {
    const initialName = search.trim();
    setOpen(false);
    onAddNewCategory(initialName);
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger
        disabled={disabled}
        render={
          <button
            type="button"
            className={cn(
              "group inline-flex items-center justify-between gap-1.5 w-full max-w-[210px] min-w-[140px] px-2.5 py-1.5 text-xs rounded-md border border-gray-200/90 bg-white hover:bg-slate-50/80 hover:border-gray-300 text-left transition-all duration-150 shadow-2xs focus:outline-hidden focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500",
              !value && "text-gray-400 font-normal",
              value && "text-gray-800 font-medium",
              disabled && "opacity-60 cursor-not-allowed pointer-events-none",
              className
            )}
          />
        }
      >
        <span className="truncate flex items-center gap-1.5">
          {value ? (
            <>
              <TagIcon className="size-3 text-emerald-600 shrink-0 opacity-80 group-hover:opacity-100" />
              <span className="truncate text-gray-900 font-medium">{value}</span>
            </>
          ) : (
            <span className="text-gray-400 italic font-normal">{placeholder}</span>
          )}
        </span>
        <ChevronsUpDownIcon className="size-3 text-gray-400 group-hover:text-gray-600 shrink-0 ml-1 transition-colors" />
      </PopoverTrigger>

      <PopoverContent
        align="start"
        side="bottom"
        sideOffset={4}
        className="w-[260px] p-1.5 bg-white border border-gray-200 rounded-lg shadow-lg z-50 animate-in fade-in-0 zoom-in-95 duration-150"
      >
        {/* Search Header */}
        <div className="relative px-1 pt-1 pb-1.5">
          <SearchIcon className="absolute left-3 top-3.5 size-3.5 text-gray-400" />
          <Input
            ref={inputRef}
            placeholder="Search category..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="h-8 pl-7.5 pr-2 text-xs border-gray-200 focus:border-emerald-500 focus:ring-emerald-500 rounded-md bg-slate-50/50"
          />
        </div>

        {/* Add New Category Action Button (Attachment 1 design) */}
        <div className="px-1 py-1 border-b border-gray-100 mb-1">
          <button
            type="button"
            onClick={handleAddNew}
            className="w-full flex items-center gap-2 px-2 py-1.5 text-xs font-semibold text-emerald-700 hover:text-emerald-800 hover:bg-emerald-50/80 rounded-md transition-colors cursor-pointer text-left group"
          >
            <span className="flex items-center justify-center size-4 rounded-full bg-emerald-100 text-emerald-700 group-hover:bg-emerald-200 shrink-0">
              <PlusIcon className="size-3 stroke-[2.5]" />
            </span>
            <span className="truncate">
              {search.trim() ? (
                <>
                  Add <span className="font-bold underline text-emerald-800">"{search.trim()}"</span>
                </>
              ) : (
                "+ Add new category"
              )}
            </span>
          </button>
        </div>

        {/* Categories List */}
        <div className="max-h-56 overflow-y-auto px-1 py-0.5 space-y-0.5 scrollbar-thin">
          {filteredCategories.length === 0 ? (
            <div className="py-4 text-center">
              <p className="text-xs text-gray-400 font-medium">No category matches</p>
              <button
                type="button"
                onClick={handleAddNew}
                className="mt-1.5 text-xs font-semibold text-emerald-600 hover:underline cursor-pointer"
              >
                Create "{search.trim()}" now
              </button>
            </div>
          ) : (
            filteredCategories.map((cat) => {
              const isSelected = value?.toLowerCase() === cat.name.toLowerCase();
              return (
                <button
                  key={cat.id || cat.name}
                  type="button"
                  onClick={() => handleSelect(cat.name)}
                  className={cn(
                    "w-full flex items-center justify-between gap-2 px-2.5 py-1.5 rounded-md text-xs transition-colors cursor-pointer text-left",
                    isSelected
                      ? "bg-emerald-50 text-emerald-900 font-semibold"
                      : "hover:bg-slate-100/80 text-gray-700 hover:text-gray-900"
                  )}
                >
                  <span className="flex items-center gap-2 truncate">
                    {isSelected && (
                      <CheckIcon className="size-3.5 text-emerald-600 shrink-0 stroke-[2.5]" />
                    )}
                    <span className={cn("truncate", !isSelected && "pl-0")}>{cat.name}</span>
                  </span>
                  <span className="text-[10px] text-gray-400 italic shrink-0 font-normal">
                    {cat.type || "Expense"}
                  </span>
                </button>
              );
            })
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}
