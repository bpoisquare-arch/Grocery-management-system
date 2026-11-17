"use client";

import React, { useState, useMemo } from "react";
import { format } from "date-fns";
import { useStore } from "@/lib/store";
import { useLawChambersStore } from "@/lib/useLawChambersStore";
import { DashboardLayout } from "@/components/DashboardLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  PlusIcon,
  SearchIcon,
  RotateCcwIcon,
  RefreshCwIcon,
  FileSpreadsheetIcon,
  FileTextIcon,
  UploadIcon,
  EyeIcon,
  PencilIcon,
  Trash2Icon,
  ChevronLeftIcon,
  ChevronRightIcon,
  ChevronsLeftIcon,
  ChevronsRightIcon,
  MoreVerticalIcon,
  CheckCircle2Icon,
  AlertCircleIcon,
  Building2Icon,
  UsersIcon,
  FileCheck2Icon,
  ScaleIcon,
  CreditCardIcon,
  PaperclipIcon,
} from "lucide-react";
import { toast } from "sonner";
import * as XLSX from "xlsx";
import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import { cn } from "@/lib/utils";
import { LawChamberEntry } from "@/lib/lawChambersTypes";

// Modals
import { AddLawChamberModal } from "@/components/law-chambers/AddLawChamberModal";
import { EditLawChamberModal } from "@/components/law-chambers/EditLawChamberModal";
import { ViewLawChamberModal } from "@/components/law-chambers/ViewLawChamberModal";
import { DeleteLawChamberModal } from "@/components/law-chambers/DeleteLawChamberModal";
import { ImportLawChamberModal } from "@/components/law-chambers/ImportLawChamberModal";

export default function LawChambersPage() {
  const { currentUser } = useStore();
  const {
    entries,
    isLoading,
    isSyncing,
    fetchEntries,
    checkDuplicatePassport,
    addEntry,
    updateEntry,
    deleteEntry,
    deleteMultipleEntries,
    importEntries,
  } = useLawChambersStore();

  const isAuditor = currentUser?.role === "AUDITOR";

  // Filter States
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedMonth, setSelectedMonth] = useState<string>("all");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [slipStatusFilter, setSlipStatusFilter] = useState("all");
  const [reimbursedFilter, setReimbursedFilter] = useState("all");

  // Month Options generated from recorded dates and current year
  const monthOptions = useMemo(() => {
    const monthNames = [
      "January", "February", "March", "April", "May", "June",
      "July", "August", "September", "October", "November", "December"
    ];

    const set = new Set<string>();

    // Extract unique year-months from existing entries
    entries.forEach((e) => {
      if (e.date && e.date.length >= 7) {
        set.add(e.date.substring(0, 7)); // 'YYYY-MM'
      }
    });

    // Also include months of current year
    const thisYear = new Date().getFullYear();
    for (let m = 0; m < 12; m++) {
      set.add(`${thisYear}-${String(m + 1).padStart(2, "0")}`);
    }

    const sorted = Array.from(set).sort().reverse();

    return sorted.map((ym) => {
      const [y, mStr] = ym.split("-");
      const mIdx = parseInt(mStr, 10) - 1;
      const monthName = monthNames[mIdx] || mStr;
      return {
        value: ym,
        label: `${monthName} ${y}`,
      };
    });
  }, [entries]);

  const selectedMonthLabel = useMemo(() => {
    if (selectedMonth === "all") return "All Time";
    const found = monthOptions.find((m) => m.value === selectedMonth);
    return found ? found.label : selectedMonth;
  }, [selectedMonth, monthOptions]);

  // Selection & Pagination
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);

  // Modal States
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isViewOpen, setIsViewOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [isImportOpen, setIsImportOpen] = useState(false);
  const [activeEntry, setActiveEntry] = useState<LawChamberEntry | null>(null);
  const [bulkDeleteEntries, setBulkDeleteEntries] = useState<LawChamberEntry[]>([]);

  // Reset Filters
  const handleResetFilters = () => {
    setSearchQuery("");
    setSelectedMonth("all");
    setDateFrom("");
    setDateTo("");
    setSlipStatusFilter("all");
    setReimbursedFilter("all");
    setCurrentPage(1);
    toast.info("Filters reset to default.");
  };

  // Filtered & Memoized entries
  const filteredEntries = useMemo(() => {
    return entries.filter((entry) => {
      // Search
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchesName = entry.studentName.toLowerCase().includes(q);
        const matchesPassport = entry.passportNo.toLowerCase().includes(q);
        const matchesSr = String(entry.srNo).includes(q);
        const matchesNotes = entry.notes?.toLowerCase().includes(q) || false;
        if (!matchesName && !matchesPassport && !matchesSr && !matchesNotes) {
          return false;
        }
      }

      // Month Filter (YYYY-MM)
      if (selectedMonth !== "all") {
        if (!entry.date || !entry.date.startsWith(selectedMonth)) return false;
      }

      // Date Range
      if (dateFrom && entry.date < dateFrom) return false;
      if (dateTo && entry.date > dateTo) return false;

      // Slip Status
      if (slipStatusFilter !== "all") {
        if (entry.status !== slipStatusFilter) return false;
      }

      // Reimbursed Status
      if (reimbursedFilter !== "all") {
        if (entry.reimbursed !== reimbursedFilter) return false;
      }

      return true;
    });
  }, [entries, searchQuery, selectedMonth, dateFrom, dateTo, slipStatusFilter, reimbursedFilter]);

  // Pagination
  const totalPages = Math.max(1, Math.ceil(filteredEntries.length / pageSize));
  const paginatedEntries = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredEntries.slice(start, start + pageSize);
  }, [filteredEntries, currentPage, pageSize]);

  // Statistics Calculations (Matching Grocery Top Cards)
  const stats = useMemo(() => {
    const targetList = selectedMonth !== "all"
      ? entries.filter((e) => e.date && e.date.startsWith(selectedMonth))
      : entries;

    const totalAmount = targetList.reduce((sum, e) => sum + (e.amount || 0), 0);
    const totalCount = targetList.length;

    const reimbursedEntries = targetList.filter((e) => e.reimbursed === "Yes");
    const totalReimbursedAmount = reimbursedEntries.reduce((sum, e) => sum + (e.amount || 0), 0);
    const reimbursedPercentage = totalCount > 0 ? Math.round((reimbursedEntries.length / totalCount) * 100) : 100;

    const uploadedCount = targetList.filter((e) => e.status === "Slip Uploaded").length;
    const missingCount = targetList.filter((e) => e.status === "Slip Missing").length;

    return {
      totalAmount,
      totalCount,
      totalReimbursedAmount,
      reimbursedCount: reimbursedEntries.length,
      reimbursedPercentage,
      uploadedCount,
      missingCount,
    };
  }, [entries, selectedMonth]);

  // Selection handlers
  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedIds(paginatedEntries.map((e) => e.id));
    } else {
      setSelectedIds([]);
    }
  };

  const handleSelectOne = (id: string, checked: boolean) => {
    if (checked) {
      setSelectedIds((prev) => [...prev, id]);
    } else {
      setSelectedIds((prev) => prev.filter((i) => i !== id));
    }
  };

  // Bulk Delete
  const handleTriggerBulkDelete = () => {
    const toDelete = entries.filter((e) => selectedIds.includes(e.id));
    setBulkDeleteEntries(toDelete);
    setActiveEntry(null);
    setIsDeleteOpen(true);
  };

  // Export to Excel
  const handleExportExcel = () => {
    if (filteredEntries.length === 0) {
      toast.error("No student records available to export.");
      return;
    }

    try {
      const dataToExport = filteredEntries.map((entry) => ({
        "S.No.": entry.srNo,
        "Student Name": entry.studentName,
        "Passport No.": entry.passportNo,
        "Date": entry.date,
        "Amount (Rs.)": entry.amount,
        "Reimbursed to Me": entry.reimbursed,
        "Slip Status": entry.status,
        "Remarks": entry.notes || "",
        "Added By": entry.addedBy,
      }));

      // Calculate total
      const totalAmt = filteredEntries.reduce((sum, e) => sum + e.amount, 0);
      dataToExport.push({
        "S.No.": "TOTAL" as any,
        "Student Name": `Total Students: ${filteredEntries.length}`,
        "Passport No.": "",
        "Date": "",
        "Amount (Rs.)": totalAmt,
        "Reimbursed to Me": "",
        "Slip Status": "",
        "Remarks": "",
        "Added By": "",
      });

      const worksheet = XLSX.utils.json_to_sheet(dataToExport);

      // Auto-fit column widths
      const colWidths = [
        { wch: 8 },  // S.No
        { wch: 28 }, // Student Name
        { wch: 16 }, // Passport No
        { wch: 14 }, // Date
        { wch: 14 }, // Amount
        { wch: 18 }, // Reimbursed
        { wch: 16 }, // Slip Status
        { wch: 24 }, // Remarks
        { wch: 16 }, // Added By
      ];
      worksheet["!cols"] = colWidths;

      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, "Chambers Law");

      const fileName = `Chambers_Law_${format(new Date(), "yyyy-MM-dd")}.xlsx`;
      XLSX.writeFile(workbook, fileName);
      toast.success(`Exported ${filteredEntries.length} records to Excel.`);
    } catch (err: any) {
      console.error(err);
      toast.error("Failed to export Excel file: " + err.message);
    }
  };

  // Export to PDF
  const handleExportPDF = () => {
    if (filteredEntries.length === 0) {
      toast.error("No student records available to export.");
      return;
    }

    try {
      const doc = new jsPDF({ orientation: "portrait", unit: "pt", format: "a4" });

      // Title & Header
      doc.setFontSize(18);
      doc.setTextColor(22, 101, 52); // Emerald 800
      doc.text("Chambers Law", 40, 45);

      doc.setFontSize(10);
      doc.setTextColor(100);
      doc.text("Student Registration, Passport Verification & Fee Reimbursement Records", 40, 62);
      doc.text(`Generated on: ${format(new Date(), "dd MMMM yyyy, hh:mm a")}`, 40, 76);

      // Table data
      const tableData = filteredEntries.map((e) => [
        e.srNo,
        e.studentName,
        e.passportNo,
        e.date,
        `Rs. ${e.amount.toLocaleString()}`,
        e.reimbursed,
        e.status,
      ]);

      const totalAmt = filteredEntries.reduce((sum, e) => sum + e.amount, 0);

      autoTable(doc, {
        head: [["S.No", "Student Name", "Passport No.", "Date", "Amount", "Reimbursed", "Slip Status"]],
        body: tableData,
        foot: [["", `Total: ${filteredEntries.length} Students`, "", "", `Rs. ${totalAmt.toLocaleString()}`, "", ""]],
        startY: 95,
        theme: "striped",
        headStyles: {
          fillColor: [5, 150, 105], // Emerald 600
          textColor: 255,
          fontSize: 9,
          fontStyle: "bold",
        },
        bodyStyles: {
          fontSize: 8.5,
          textColor: 40,
        },
        footStyles: {
          fillColor: [240, 253, 244],
          textColor: [22, 101, 52],
          fontStyle: "bold",
          fontSize: 9,
        },
        margin: { left: 40, right: 40 },
      });

      doc.save(`Chambers_Law_${format(new Date(), "yyyy-MM-dd")}.pdf`);
      toast.success(`Exported ${filteredEntries.length} records to PDF.`);
    } catch (err: any) {
      console.error(err);
      toast.error("Failed to export PDF: " + err.message);
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-6 max-w-[1600px] mx-auto w-full">
        {/* Top Header Bar (Matching Grocery UI) */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl sm:text-3xl font-extrabold text-gray-900 tracking-tight">
                Chambers Law
              </h1>
              <Badge
                variant="outline"
                className="bg-emerald-50 text-emerald-800 border-emerald-200 text-xs font-bold px-2 py-0.5"
              >
                Chambers Law
              </Badge>
            </div>
            <p className="text-xs sm:text-sm text-gray-500 font-medium mt-1">
              View, search, filter, and manage student registrations, passports, reimbursements, and verification slips.
            </p>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto justify-start sm:justify-end">
            {/* Sync Live DB */}
            <Button
              variant="outline"
              size="sm"
              onClick={() => fetchEntries(true)}
              disabled={isSyncing}
              className="h-9 border-emerald-200 text-emerald-700 bg-white hover:bg-emerald-50 font-semibold text-xs gap-1.5 shadow-2xs"
            >
              <RefreshCwIcon className={cn("size-3.5", isSyncing && "animate-spin")} />
              <span>Sync Live DB</span>
            </Button>

            {/* Import Excel */}
            {!isAuditor && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsImportOpen(true)}
                className="h-9 border-gray-200 text-gray-700 bg-white hover:bg-gray-50 font-semibold text-xs gap-1.5 shadow-2xs"
              >
                <UploadIcon className="size-3.5 text-emerald-600" />
                <span>Import Excel</span>
              </Button>
            )}

            {/* Export Excel */}
            <Button
              variant="outline"
              size="sm"
              onClick={handleExportExcel}
              className="h-9 border-gray-200 text-gray-700 bg-white hover:bg-gray-50 font-semibold text-xs gap-1.5 shadow-2xs"
            >
              <FileSpreadsheetIcon className="size-3.5 text-emerald-600" />
              <span>Export Excel</span>
            </Button>

            {/* Export PDF */}
            <Button
              variant="outline"
              size="sm"
              onClick={handleExportPDF}
              className="h-9 border-gray-200 text-gray-700 bg-white hover:bg-gray-50 font-semibold text-xs gap-1.5 shadow-2xs"
            >
              <FileTextIcon className="size-3.5 text-rose-600" />
              <span>Export PDF</span>
            </Button>

            {/* Add Entry Button */}
            {!isAuditor && (
              <Button
                size="sm"
                onClick={() => setIsAddOpen(true)}
                className="h-9 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs gap-1.5 shadow-sm px-4"
              >
                <PlusIcon className="size-4" />
                <span>+ Add Entry</span>
              </Button>
            )}
          </div>
        </div>

        {/* 4 Metric Summary Cards (Matching Grocery UI - Attachment 3) */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Card 1: Total Amount */}
          <Card className="border border-gray-200/80 bg-white shadow-2xs hover:shadow-xs transition-shadow">
            <CardContent className="p-5">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">
                  TOTAL AMOUNT
                </span>
                <Badge variant="outline" className="text-[10px] font-semibold text-emerald-700 bg-emerald-50 border-emerald-200">
                  {selectedMonth === "all" ? "All Records" : selectedMonthLabel}
                </Badge>
              </div>
              <div className="mt-2 flex items-baseline gap-2">
                <span className="text-2xl sm:text-3xl font-extrabold text-gray-900 truncate">
                  Rs. {stats.totalAmount.toLocaleString()}
                </span>
              </div>
              <p className="text-[11px] text-gray-500 mt-1 font-medium truncate">
                {selectedMonth === "all" ? "Accumulated student fee registration total" : `Total for ${selectedMonthLabel}`}
              </p>
            </CardContent>
          </Card>

          {/* Card 2: Total Entries */}
          <Card className="border border-gray-200/80 bg-white shadow-2xs hover:shadow-xs transition-shadow">
            <CardContent className="p-5">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">
                  TOTAL ENTRIES
                </span>
                <Badge className="bg-emerald-50 text-emerald-700 hover:bg-emerald-50 border border-emerald-200 text-[10px] font-bold">
                  Active
                </Badge>
              </div>
              <div className="mt-2 flex items-baseline gap-2">
                <span className="text-2xl sm:text-3xl font-extrabold text-gray-900 truncate">
                  {stats.totalCount}
                </span>
              </div>
              <p className="text-[11px] text-gray-500 mt-1 font-medium truncate">
                {selectedMonth === "all" ? "Recorded unique student registrations" : `Recorded in ${selectedMonthLabel}`}
              </p>
            </CardContent>
          </Card>

          {/* Card 3: Reimbursed to Me */}
          <Card className="border border-gray-200/80 bg-white shadow-2xs hover:shadow-xs transition-shadow">
            <CardContent className="p-5">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">
                  REIMBURSED TO ME
                </span>
                <Badge className="bg-emerald-100 text-emerald-800 hover:bg-emerald-100 border border-emerald-200 text-[10px] font-bold">
                  {stats.reimbursedPercentage}% Reimbursed
                </Badge>
              </div>
              <div className="mt-2 flex items-baseline gap-2">
                <span className="text-2xl sm:text-3xl font-extrabold text-emerald-700 truncate">
                  Rs. {stats.totalReimbursedAmount.toLocaleString()}
                </span>
              </div>
              <p className="text-[11px] text-gray-500 mt-1 font-medium truncate">
                {stats.reimbursedCount} of {stats.totalCount} students cleared
              </p>
            </CardContent>
          </Card>

          {/* Card 4: Slip Status */}
          <Card className="border border-gray-200/80 bg-white shadow-2xs hover:shadow-xs transition-shadow">
            <CardContent className="p-5">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">
                  SLIP VERIFICATION
                </span>
                <Badge
                  variant="outline"
                  className={cn(
                    "text-[10px] font-bold",
                    stats.missingCount > 0
                      ? "bg-amber-50 text-amber-800 border-amber-200"
                      : "bg-emerald-50 text-emerald-800 border-emerald-200"
                  )}
                >
                  {stats.missingCount > 0 ? `${stats.missingCount} Missing` : "100% Uploaded"}
                </Badge>
              </div>
              <div className="mt-2 flex items-baseline gap-2">
                <span className="text-2xl sm:text-3xl font-extrabold text-gray-900 truncate">
                  {stats.uploadedCount}
                </span>
                <span className="text-xs font-semibold text-emerald-600">Uploaded</span>
              </div>
              <p className="text-[11px] text-gray-500 mt-1 font-medium truncate">
                {stats.missingCount} student(s) currently missing slip
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Search & Filter Bar (Fully Responsive Toolbar with Month Filter) */}
        <Card className="border border-gray-200 bg-white shadow-2xs">
          <CardContent className="p-4 sm:p-5">
            <div className="flex flex-wrap items-end gap-3.5">
              {/* Search details / Student name / Passport */}
              <div className="flex-1 min-w-[200px] space-y-1.5">
                <Label className="text-xs font-bold text-gray-700">
                  Search details
                </Label>
                <div className="relative">
                  <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-gray-400" />
                  <Input
                    placeholder="Search student name / passport / S.No..."
                    value={searchQuery}
                    onChange={(e) => {
                      setSearchQuery(e.target.value);
                      setCurrentPage(1);
                    }}
                    className="pl-9 h-10 text-xs font-medium bg-slate-50/50 border-gray-200 focus:bg-white"
                  />
                </div>
              </div>

              {/* Month Filter */}
              <div className="w-full sm:w-[160px] space-y-1.5">
                <Label className="text-xs font-bold text-gray-700">
                  Month
                </Label>
                <Select
                  value={selectedMonth}
                  onValueChange={(val) => {
                    if (val) {
                      setSelectedMonth(val);
                      setCurrentPage(1);
                    }
                  }}
                >
                  <SelectTrigger className="h-10 text-xs font-medium bg-white border-gray-200 w-full truncate">
                    <SelectValue placeholder="All Months" />
                  </SelectTrigger>
                  <SelectContent className="bg-white border-gray-200 max-h-60">
                    <SelectItem value="all" className="text-xs font-semibold">All Months</SelectItem>
                    {monthOptions.map((opt) => (
                      <SelectItem key={opt.value} value={opt.value} className="text-xs font-medium cursor-pointer">
                        {opt.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* From Date */}
              <div className="w-full sm:w-[145px] space-y-1.5">
                <Label className="text-xs font-bold text-gray-700">
                  From Date
                </Label>
                <Input
                  type="date"
                  value={dateFrom}
                  onChange={(e) => {
                    setDateFrom(e.target.value);
                    setCurrentPage(1);
                  }}
                  className="h-10 text-xs font-medium border-gray-200 bg-white"
                />
              </div>

              {/* To Date */}
              <div className="w-full sm:w-[145px] space-y-1.5">
                <Label className="text-xs font-bold text-gray-700">
                  To Date
                </Label>
                <Input
                  type="date"
                  value={dateTo}
                  onChange={(e) => {
                    setDateTo(e.target.value);
                    setCurrentPage(1);
                  }}
                  className="h-10 text-xs font-medium border-gray-200 bg-white"
                />
              </div>

              {/* Slip Status */}
              <div className="w-full sm:w-[145px] space-y-1.5">
                <Label className="text-xs font-bold text-gray-700">
                  Slip Status
                </Label>
                <Select
                  value={slipStatusFilter}
                  onValueChange={(val) => {
                    if (val) {
                      setSlipStatusFilter(val);
                      setCurrentPage(1);
                    }
                  }}
                >
                  <SelectTrigger className="h-10 text-xs font-medium bg-white border-gray-200 w-full truncate">
                    <SelectValue placeholder="All" />
                  </SelectTrigger>
                  <SelectContent className="bg-white border-gray-200">
                    <SelectItem value="all" className="text-xs">All Statuses</SelectItem>
                    <SelectItem value="Slip Uploaded" className="text-xs text-emerald-700 font-semibold">
                      Slip Uploaded
                    </SelectItem>
                    <SelectItem value="Slip Missing" className="text-xs text-rose-700 font-semibold">
                      Slip Missing
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Reimbursed Status */}
              <div className="w-full sm:w-[130px] space-y-1.5">
                <Label className="text-xs font-bold text-gray-700">
                  Reimbursed
                </Label>
                <Select
                  value={reimbursedFilter}
                  onValueChange={(val) => {
                    if (val) {
                      setReimbursedFilter(val);
                      setCurrentPage(1);
                    }
                  }}
                >
                  <SelectTrigger className="h-10 text-xs font-medium bg-white border-gray-200 w-full truncate">
                    <SelectValue placeholder="All" />
                  </SelectTrigger>
                  <SelectContent className="bg-white border-gray-200">
                    <SelectItem value="all" className="text-xs">All</SelectItem>
                    <SelectItem value="Yes" className="text-xs text-emerald-700 font-semibold">Yes</SelectItem>
                    <SelectItem value="No" className="text-xs text-amber-700 font-semibold">No</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Reset Button */}
              <div className="space-y-1.5 shrink-0">
                <Label className="text-xs font-bold text-transparent select-none hidden sm:block">
                  Reset
                </Label>
                <Button
                  variant="outline"
                  onClick={handleResetFilters}
                  title="Reset all filters"
                  className="size-10 border-gray-200 text-gray-500 hover:text-gray-900 hover:bg-slate-50 flex items-center justify-center p-0"
                >
                  <RotateCcwIcon className="size-4" />
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Bulk Action Bar (when rows selected) */}
        {selectedIds.length > 0 && !isAuditor && (
          <div className="flex items-center justify-between p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-xs font-medium animate-in fade-in duration-150">
            <span className="text-emerald-900 font-bold">
              {selectedIds.length} student record(s) selected
            </span>
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setSelectedIds([])}
                className="h-8 text-xs text-emerald-700 hover:bg-emerald-100"
              >
                Deselect all
              </Button>
              <Button
                variant="destructive"
                size="sm"
                onClick={handleTriggerBulkDelete}
                className="h-8 text-xs font-bold bg-red-600 hover:bg-red-700 text-white gap-1.5"
              >
                <Trash2Icon className="size-3.5" />
                Delete Selected ({selectedIds.length})
              </Button>
            </div>
          </div>
        )}

        {/* Data Table (Matching Grocery UI Table - Attachment 3) */}
        <Card className="border border-gray-200 bg-white shadow-2xs overflow-hidden">
          <div className="overflow-x-auto">
            <Table className="min-w-[920px]">
              <TableHeader className="bg-slate-50/80 border-b border-gray-200">
                <TableRow>
                  <TableHead className="w-10">
                    <Checkbox
                      checked={
                        paginatedEntries.length > 0 &&
                        paginatedEntries.every((e) => selectedIds.includes(e.id))
                      }
                      onCheckedChange={handleSelectAll}
                    />
                  </TableHead>
                  <TableHead className="w-12 text-center text-xs font-bold text-gray-700">
                    Slip
                  </TableHead>
                  <TableHead className="w-20 text-xs font-bold text-gray-700">
                    S.No.
                  </TableHead>
                  <TableHead className="w-36 text-xs font-bold text-gray-700">
                    Date
                  </TableHead>
                  <TableHead className="text-xs font-bold text-gray-700">
                    Student Name
                  </TableHead>
                  <TableHead className="w-44 text-xs font-bold text-gray-700">
                    Passport No.
                  </TableHead>
                  <TableHead className="w-32 text-xs font-bold text-gray-700">
                    Amount
                  </TableHead>
                  <TableHead className="w-28 text-xs font-bold text-gray-700">
                    Reimbursed
                  </TableHead>
                  <TableHead className="w-40 text-xs font-bold text-gray-700">
                    Status
                  </TableHead>
                  <TableHead className="w-16 text-right text-xs font-bold text-gray-700 pr-4">
                    Actions
                  </TableHead>
                </TableRow>
              </TableHeader>

              <TableBody>
                {isLoading && entries.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={10} className="h-48 text-center text-xs text-gray-400">
                      <div className="flex flex-col items-center justify-center gap-2">
                        <RefreshCwIcon className="size-5 animate-spin text-emerald-600" />
                        <span>Loading student records from database...</span>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : paginatedEntries.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={10} className="h-48 text-center text-xs text-gray-400">
                      <div className="flex flex-col items-center justify-center gap-2">
                        <UsersIcon className="size-8 text-gray-300" />
                        <span className="font-semibold text-gray-600">No student records found</span>
                        <span className="text-[11px] text-gray-400">
                          {searchQuery || slipStatusFilter !== "all" || reimbursedFilter !== "all"
                            ? "Try adjusting your filters or search query."
                            : "Click '+ Add Entry' to record your first student."}
                        </span>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : (
                  paginatedEntries.map((entry) => {
                    const isSelected = selectedIds.includes(entry.id);
                    const hasSlip = entry.status === "Slip Uploaded";

                    return (
                      <TableRow
                        key={entry.id}
                        className={cn(
                          "hover:bg-slate-50/70 transition-colors border-b border-gray-100",
                          isSelected && "bg-emerald-50/30"
                        )}
                      >
                        {/* Checkbox */}
                        <TableCell>
                          <Checkbox
                            checked={isSelected}
                            onCheckedChange={(checked) => handleSelectOne(entry.id, !!checked)}
                          />
                        </TableCell>

                        {/* Slip Status Dot (Clickable) */}
                        <TableCell className="text-center">
                          <button
                            type="button"
                            onClick={() => {
                              setActiveEntry(entry);
                              setIsViewOpen(true);
                            }}
                            title={hasSlip ? "View attached slip" : "Slip Missing - Click to inspect"}
                            className="inline-flex items-center justify-center cursor-pointer p-1 rounded-full hover:bg-slate-100 transition-colors"
                          >
                            <span
                              className={cn(
                                "size-3 rounded-full inline-block transition-transform hover:scale-125",
                                hasSlip ? "bg-emerald-500 shadow-2xs" : "bg-rose-500"
                              )}
                            />
                          </button>
                        </TableCell>

                        {/* S.No */}
                        <TableCell className="text-sm font-mono font-bold text-gray-700 whitespace-nowrap">
                          #{entry.srNo}
                        </TableCell>

                        {/* Date */}
                        <TableCell className="text-sm font-semibold text-gray-800 whitespace-nowrap">
                          {(() => {
                            if (!entry.date) return "-";
                            const d = new Date(entry.date);
                            return isNaN(d.getTime()) ? entry.date : format(d, "dd MMM yyyy");
                          })()}
                        </TableCell>

                        {/* Student Name (Enlarged prominent font) */}
                        <TableCell className="text-[15px] font-bold text-gray-950">
                          <button
                            type="button"
                            onClick={() => {
                              setActiveEntry(entry);
                              setIsViewOpen(true);
                            }}
                            className="text-left hover:text-emerald-700 transition-colors cursor-pointer font-bold tracking-tight"
                          >
                            {entry.studentName}
                          </button>
                        </TableCell>

                        {/* Passport No (Highlighted Badge) */}
                        <TableCell>
                          <span className="inline-flex items-center px-3 py-1 rounded-md font-mono text-[13px] font-black tracking-wider uppercase bg-amber-100 text-amber-950 border border-amber-300 shadow-2xs">
                            {entry.passportNo}
                          </span>
                        </TableCell>

                        {/* Amount */}
                        <TableCell className="text-sm font-extrabold text-gray-950 whitespace-nowrap">
                          Rs. {entry.amount.toLocaleString()}
                        </TableCell>

                        {/* Reimbursed to Me */}
                        <TableCell>
                          <Badge
                            className={cn(
                              "text-xs font-bold px-2.5 py-0.5",
                              entry.reimbursed === "Yes"
                                ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                                : "bg-amber-50 text-amber-700 border-amber-200"
                            )}
                          >
                            {entry.reimbursed === "Yes" ? "Yes" : "No"}
                          </Badge>
                        </TableCell>

                        {/* Status (Slip Uploaded / Slip Missing) */}
                        <TableCell>
                          <Badge
                            className={cn(
                              "text-xs font-bold px-3 py-1 gap-1.5 flex items-center w-fit",
                              hasSlip
                                ? "bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-50"
                                : "bg-rose-50 text-rose-700 border-rose-200 hover:bg-rose-50"
                            )}
                          >
                            <span
                              className={cn(
                                "size-2 rounded-full shrink-0",
                                hasSlip ? "bg-emerald-500" : "bg-rose-500"
                              )}
                            />
                            <span>{hasSlip ? "Slip Uploaded" : "Slip Missing"}</span>
                          </Badge>
                        </TableCell>

                        {/* Actions (3 Dots Menu - Black & Highly Visible) */}
                        <TableCell className="text-right pr-4">
                          <DropdownMenu>
                            <DropdownMenuTrigger
                              render={
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="size-8 text-black hover:text-black hover:bg-slate-200 rounded-lg transition-colors cursor-pointer"
                                  title="Actions"
                                />
                              }
                            >
                              <MoreVerticalIcon className="size-5 text-black stroke-[2.5]" />
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="w-44 bg-white border-gray-200">
                              <DropdownMenuItem
                                onClick={() => {
                                  setActiveEntry(entry);
                                  setIsViewOpen(true);
                                }}
                                className="text-xs font-medium cursor-pointer gap-2"
                              >
                                <EyeIcon className="size-3.5 text-gray-500" />
                                View Details & Slip
                              </DropdownMenuItem>

                              {!isAuditor && (
                                <>
                                  <DropdownMenuItem
                                    onClick={() => {
                                      setActiveEntry(entry);
                                      setIsEditOpen(true);
                                    }}
                                    className="text-xs font-medium cursor-pointer gap-2"
                                  >
                                    <PencilIcon className="size-3.5 text-emerald-600" />
                                    Edit Entry
                                  </DropdownMenuItem>

                                  <DropdownMenuSeparator />

                                  <DropdownMenuItem
                                    onClick={() => {
                                      setActiveEntry(entry);
                                      setBulkDeleteEntries([]);
                                      setIsDeleteOpen(true);
                                    }}
                                    className="text-xs font-semibold text-red-600 cursor-pointer gap-2 hover:bg-red-50 hover:text-red-700"
                                  >
                                    <Trash2Icon className="size-3.5" />
                                    Delete Entry
                                  </DropdownMenuItem>
                                </>
                              )}
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </div>

          {/* Pagination Footer */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 p-4 border-t border-gray-100 bg-slate-50/50 text-xs">
            <div className="text-gray-500 font-medium">
              Showing{" "}
              <strong>
                {filteredEntries.length === 0 ? 0 : (currentPage - 1) * pageSize + 1}
              </strong>{" "}
              to{" "}
              <strong>
                {Math.min(currentPage * pageSize, filteredEntries.length)}
              </strong>{" "}
              of <strong>{filteredEntries.length}</strong> records
            </div>

            <div className="flex items-center gap-3">
              <div className="flex items-center gap-1.5">
                <span className="text-gray-500 font-medium">Rows:</span>
                <Select
                  value={String(pageSize)}
                  onValueChange={(val) => {
                    if (val) {
                      setPageSize(Number(val));
                      setCurrentPage(1);
                    }
                  }}
                >
                  <SelectTrigger className="h-8 w-18 text-xs bg-white border-gray-200">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-white border-gray-200">
                    <SelectItem value="15" className="text-xs">15</SelectItem>
                    <SelectItem value="25" className="text-xs">25</SelectItem>
                    <SelectItem value="50" className="text-xs">50</SelectItem>
                    <SelectItem value="100" className="text-xs">100</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="flex items-center gap-1">
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => setCurrentPage(1)}
                  disabled={currentPage <= 1}
                  className="size-8 border-gray-200 text-gray-600 disabled:opacity-40"
                >
                  <ChevronsLeftIcon className="size-4" />
                </Button>
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  disabled={currentPage <= 1}
                  className="size-8 border-gray-200 text-gray-600 disabled:opacity-40"
                >
                  <ChevronLeftIcon className="size-4" />
                </Button>

                <span className="px-2 text-xs font-semibold text-gray-700">
                  {currentPage} of {totalPages}
                </span>

                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                  disabled={currentPage >= totalPages}
                  className="size-8 border-gray-200 text-gray-600 disabled:opacity-40"
                >
                  <ChevronRightIcon className="size-4" />
                </Button>
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => setCurrentPage(totalPages)}
                  disabled={currentPage >= totalPages}
                  className="size-8 border-gray-200 text-gray-600 disabled:opacity-40"
                >
                  <ChevronsRightIcon className="size-4" />
                </Button>
              </div>
            </div>
          </div>
        </Card>
      </div>

      {/* Modals */}
      <AddLawChamberModal
        open={isAddOpen}
        onOpenChange={setIsAddOpen}
        onAdd={addEntry}
        checkDuplicatePassport={checkDuplicatePassport}
      />

      <EditLawChamberModal
        open={isEditOpen}
        onOpenChange={setIsEditOpen}
        entry={activeEntry}
        onUpdate={updateEntry}
        checkDuplicatePassport={checkDuplicatePassport}
      />

      <ViewLawChamberModal
        open={isViewOpen}
        onOpenChange={setIsViewOpen}
        entry={activeEntry}
        onEditClick={!isAuditor ? (e) => {
          setActiveEntry(e);
          setIsEditOpen(true);
        } : undefined}
      />

      <DeleteLawChamberModal
        open={isDeleteOpen}
        onOpenChange={setIsDeleteOpen}
        entry={activeEntry}
        entriesToDelete={bulkDeleteEntries}
        onDeleteSingle={deleteEntry}
        onDeleteMultiple={async (ids) => {
          await deleteMultipleEntries(ids);
          setSelectedIds([]);
        }}
      />

      <ImportLawChamberModal
        open={isImportOpen}
        onOpenChange={setIsImportOpen}
        existingEntries={entries}
        onImportSuccess={importEntries}
      />
    </DashboardLayout>
  );
}
