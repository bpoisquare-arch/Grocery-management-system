"use client";

import React, { useState, useMemo, useEffect } from "react";
import { format } from "date-fns";
import { useStore } from "@/lib/store";
import { Checkbox } from "@/components/ui/checkbox";
import { DashboardLayout } from "@/components/DashboardLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
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
import { AddGroceryModal } from "@/components/AddGroceryModal";
import { EditGroceryModal } from "@/components/EditGroceryModal";
import { ViewGroceryModal } from "@/components/ViewGroceryModal";
import { ApproveWithoutSlipModal } from "@/components/ApproveWithoutSlipModal";
import { DeleteGroceryModal } from "@/components/DeleteGroceryModal";
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
  FilterIcon,
  RotateCcwIcon,
  FileSpreadsheetIcon,
  FileTextIcon,
  EyeIcon,
  PencilIcon,
  FileCheckIcon,
  Trash2Icon,
  ChevronLeftIcon,
  ChevronRightIcon,
  ChevronsLeftIcon,
  ChevronsRightIcon,
  MoreVerticalIcon,
} from "lucide-react";
import { toast } from "sonner";
import { SlipStatus } from "@/lib/mockData";
import * as XLSX from "xlsx";
import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";

export default function GroceryPage() {
  const { currentUser, activeEntity, groceryEntries, deleteGroceryEntries, currentMonth, currentYear, budgets, getEntityBudget } = useStore();
  const isAdmin = currentUser?.role === "ADMIN";

  // Search & Filter State
  const [search, setSearch] = useState("");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  // Selection state
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  // Modal State
  const [addModalOpen, setAddModalOpen] = useState(false);
  const [viewModalOpen, setViewModalOpen] = useState(false);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [approveModalOpen, setApproveModalOpen] = useState(false);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [selectedEntry, setSelectedEntry] = useState<any>(null);

  // Pagination State
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);

  // Filter Logic
  const filteredEntries = useMemo(() => {
    return groceryEntries.filter((entry) => {
      // Must match active entity
      if (entry.entity !== activeEntity) return false;

      // Search keyword filter
      if (search.trim()) {
        const query = search.toLowerCase();
        const matchesDetails = entry.details.toLowerCase().includes(query);
        const matchesAddedBy = entry.addedBy.toLowerCase().includes(query);
        const matchesAmount = entry.amount.toString().includes(query);
        if (!matchesDetails && !matchesAddedBy && !matchesAmount) return false;
      }

      // Date filters
      if (fromDate) {
        if (entry.date < fromDate) return false;
      }
      if (toDate) {
        if (entry.date > toDate) return false;
      }

      // Slip status filter
      if (statusFilter !== "all") {
        if (statusFilter === "uploaded" && entry.status !== "Slip Uploaded") return false;
        if (statusFilter === "missing" && entry.status !== "Slip Missing") return false;
        if (statusFilter === "approved" && entry.status !== "Approved Without Slip") return false;
      }

      return true;
    });
  }, [groceryEntries, activeEntity, search, fromDate, toDate, statusFilter]);

  // Calculate dashboard totals for active entity (used in exports)
  const totalBudget = getEntityBudget(activeEntity, currentMonth, currentYear);

  const totalSpent = useMemo(() => {
    return filteredEntries.reduce((sum, entry) => sum + entry.amount, 0);
  }, [filteredEntries]);

  const remainingBalance = totalBudget - totalSpent;
  const totalEntriesCount = filteredEntries.length;



  // Pagination Logic
  const totalPages = Math.ceil(filteredEntries.length / itemsPerPage) || 1;
  const paginatedEntries = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    return filteredEntries.slice(startIndex, startIndex + itemsPerPage);
  }, [filteredEntries, currentPage]);

  // Reset selection when entity, page or filters change
  useEffect(() => {
    setSelectedIds([]);
  }, [activeEntity, search, fromDate, toDate, statusFilter, currentPage]);

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      const visibleIds = paginatedEntries.map((entry) => entry.id);
      setSelectedIds(visibleIds);
    } else {
      setSelectedIds([]);
    }
  };

  const handleSelectRow = (id: string, checked: boolean) => {
    if (checked) {
      setSelectedIds((prev) => [...prev, id]);
    } else {
      setSelectedIds((prev) => prev.filter((item) => item !== id));
    }
  };

  const handleBulkDelete = () => {
    if (confirm(`Are you sure you want to delete ${selectedIds.length} selected expenses?`)) {
      deleteGroceryEntries(selectedIds);
      setSelectedIds([]);
      toast.success("Selected expenses deleted successfully.");
    }
  };

  const handleResetFilters = () => {
    setSearch("");
    setFromDate("");
    setToDate("");
    setStatusFilter("all");
    setCurrentPage(1);
    toast.success("Filters reset successfully.");
  };

  const handleAction = (entry: any, type: "view" | "edit" | "approve" | "delete") => {
    setSelectedEntry(entry);
    if (type === "view") setViewModalOpen(true);
    else if (type === "edit") setEditModalOpen(true);
    else if (type === "approve") setApproveModalOpen(true);
    else if (type === "delete") setDeleteModalOpen(true);
  };

  const getStatusBadge = (status: SlipStatus) => {
    switch (status) {
      case "Slip Uploaded":
        return (
          <Badge className="bg-emerald-50 text-emerald-700 hover:bg-emerald-50 border border-emerald-100/80 font-medium text-[10px] gap-1 rounded-sm">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-600" />
            Slip Uploaded
          </Badge>
        );
      case "Slip Missing":
        return (
          <Badge className="bg-red-50 text-red-700 hover:bg-red-50 border border-red-100 font-medium text-[10px] gap-1 rounded-sm">
            <span className="h-1.5 w-1.5 rounded-full bg-red-600 animate-pulse" />
            Slip Missing
          </Badge>
        );
      case "Approved Without Slip":
        return (
          <Badge className="bg-blue-50 text-blue-700 hover:bg-blue-50 border border-blue-100 font-medium text-[10px] gap-1 rounded-sm">
            <span className="h-1.5 w-1.5 rounded-full bg-blue-600" />
            Approved Without Slip
          </Badge>
        );
      default:
        return null;
    }
  };

  // Export functions (fully functional)
  const handleExportExcel = () => {
    toast.loading("Generating Excel spreadsheet...", { id: "export-excel" });
    try {
      // Prepare array of arrays (AOA) data with a prominent header at the top
      const titleText = `${activeEntity.toUpperCase()} GROCERY EXPENSES REPORT`;
      const subtitleText = `Period: ${currentMonth} ${currentYear} | Exported: ${format(new Date(), "dd MMM yyyy, hh:mm a")}`;
      
      const summaryBudget = `Monthly Budget: Rs. ${totalBudget.toLocaleString()}`;
      const summarySpent = `Total Spent: Rs. ${totalSpent.toLocaleString()}`;
      const summaryRemaining = `Remaining Balance: Rs. ${remainingBalance.toLocaleString()}`;
      const summaryCount = `Total Grocery Entries: ${totalEntriesCount}`;

      const aoaData: any[][] = [
        [titleText],
        [subtitleText],
        [], // Spacing row
        [summaryBudget, "", summarySpent, ""],
        [summaryRemaining, "", summaryCount, ""],
        [], // Spacing row
        ["Date", "Details", "Amount (Rs.)", "Status"] // Headers
      ];

      filteredEntries.forEach((e) => {
        aoaData.push([
          e.date ? format(new Date(e.date), "dd MMM yyyy") : "-",
          e.details,
          e.amount,
          e.status
        ]);
      });

      // Create sheet from array of arrays
      const worksheet = XLSX.utils.aoa_to_sheet(aoaData);

      // Merge first two rows across the columns (A to D) and summary cards
      worksheet["!merges"] = [
        { s: { r: 0, c: 0 }, e: { r: 0, c: 3 } }, // Merge A1:D1 for Title
        { s: { r: 1, c: 0 }, e: { r: 1, c: 3 } }, // Merge A2:D2 for Subtitle
        { s: { r: 3, c: 0 }, e: { r: 3, c: 1 } }, // Merge A4:B4 (Budget)
        { s: { r: 3, c: 2 }, e: { r: 3, c: 3 } }, // Merge C4:D4 (Spent)
        { s: { r: 4, c: 0 }, e: { r: 4, c: 1 } }, // Merge A5:B5 (Remaining)
        { s: { r: 4, c: 2 }, e: { r: 4, c: 3 } }  // Merge C5:D5 (Count)
      ];

      // Set taller row heights for the header rows to make them stand out
      worksheet["!rows"] = [
        { hpt: 35 }, // Heading row
        { hpt: 20 }, // Subtitle row
        { hpt: 10 }, // Spacer row
        { hpt: 20 }, // Summary row 1
        { hpt: 20 }, // Summary row 2
        { hpt: 10 }, // Spacer row
        { hpt: 22 }  // Table Headers row
      ];

      // Auto-fit column widths so details and other fields aren't squished
      worksheet["!cols"] = [
        { wch: 15 }, // Date
        { wch: 45 }, // Details
        { wch: 15 }, // Amount
        { wch: 20 }  // Status
      ];

      // Create a workbook and append the worksheet
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, "Expenses");

      // Generate file and trigger download
      const filename = `grocery_expenses_${activeEntity.toLowerCase()}_${currentMonth.toLowerCase()}_${currentYear}.xlsx`;
      XLSX.writeFile(workbook, filename);

      toast.success("Excel sheet downloaded successfully.", { id: "export-excel" });
    } catch (error) {
      console.error(error);
      toast.error("Failed to generate Excel sheet.", { id: "export-excel" });
    }
  };

  const handleExportPDF = () => {
    toast.loading("Generating PDF document...", { id: "export-pdf" });
    try {
      const doc = new jsPDF();
      
      // Title Section
      doc.setFont("helvetica", "bold");
      doc.setFontSize(18);
      doc.setTextColor(5, 150, 105); // Emerald-600 green
      doc.text("Grocery Expense Report", 14, 20);

      // Subtitle Meta Information
      doc.setFont("helvetica", "normal");
      doc.setFontSize(10);
      doc.setTextColor(100, 116, 139); // Slate-500
      doc.text(`Entity: ${activeEntity} User`, 14, 28);
      doc.text(`Period: ${currentMonth} ${currentYear}`, 14, 34);
      doc.text(`Report Generated: ${format(new Date(), "dd MMMM yyyy, hh:mm a")}`, 14, 40);

      // Divider line
      doc.setDrawColor(226, 232, 240); // Slate-200
      doc.line(14, 45, 196, 45);

      // Shaded panel for summary dashboard statistics
      doc.setFillColor(248, 250, 252);
      doc.rect(14, 48, 182, 22, "F");
      
      doc.setFont("helvetica", "bold");
      doc.setFontSize(7.5);
      doc.setTextColor(100, 116, 139);
      doc.text("MONTHLY BUDGET", 18, 54);
      doc.text("TOTAL SPENT", 64, 54);
      doc.text("REMAINING BALANCE", 110, 54);
      doc.text("TOTAL ENTRIES", 158, 54);

      doc.setFont("helvetica", "bold");
      doc.setFontSize(10);
      doc.setTextColor(30, 41, 59);
      doc.text(`Rs. ${totalBudget.toLocaleString()}`, 18, 62);
      doc.setTextColor(5, 150, 105);
      doc.text(`Rs. ${totalSpent.toLocaleString()}`, 64, 62);
      doc.setTextColor(remainingBalance < 0 ? 220 : 30, remainingBalance < 0 ? 38 : 41, remainingBalance < 0 ? 38 : 59);
      doc.text(`${remainingBalance < 0 ? "-" : ""}Rs. ${Math.abs(remainingBalance).toLocaleString()}`, 110, 62);
      doc.setTextColor(30, 41, 59);
      doc.text(`${totalEntriesCount}`, 158, 62);

      // Table Header and Rows
      const headers = [["Date", "Details", "Amount", "Status"]];
      const rows = filteredEntries.map((e) => [
        e.date ? format(new Date(e.date), "dd MMM yyyy") : "-",
        e.details,
        `Rs. ${e.amount.toLocaleString()}`,
        e.status
      ]);

      // Call autoTable
      autoTable(doc, {
        startY: 76,
        head: headers,
        body: rows,
        headStyles: {
          fillColor: [5, 150, 105], // Emerald green
          textColor: [255, 255, 255],
          fontSize: 10,
          fontStyle: "bold"
        },
        bodyStyles: {
          fontSize: 9,
          textColor: [30, 41, 59] // Dark slate
        },
        alternateRowStyles: {
          fillColor: [248, 250, 252] // Slate-50
        },
        margin: { left: 14, right: 14 }
      });

      const filename = `grocery_expenses_${activeEntity.toLowerCase()}_${currentMonth.toLowerCase()}_${currentYear}.pdf`;
      doc.save(filename);

      toast.success("PDF document downloaded successfully.", { id: "export-pdf" });
    } catch (error) {
      console.error(error);
      toast.error("Failed to generate PDF document.", { id: "export-pdf" });
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Title block */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-gray-900">Grocery Management</h1>
            <p className="text-sm text-gray-500 font-medium mt-0.5">
              View, search, filter, and manage grocery expenses for {activeEntity} Entity.
            </p>
          </div>

          <div className="flex items-center gap-2 w-full md:w-auto">
            <Button
              variant="outline"
              size="sm"
              onClick={handleExportExcel}
              className="flex-1 md:flex-initial h-9 border-gray-200 text-xs font-semibold hover:bg-gray-50 text-gray-700 gap-1.5"
            >
              <FileSpreadsheetIcon className="size-4 text-emerald-600" />
              Export Excel
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handleExportPDF}
              className="flex-1 md:flex-initial h-9 border-gray-200 text-xs font-semibold hover:bg-gray-50 text-gray-700 gap-1.5"
            >
              <FileTextIcon className="size-4 text-red-500" />
              Export PDF
            </Button>
            <Button
              onClick={() => setAddModalOpen(true)}
              className="flex-1 md:flex-initial bg-emerald-600 hover:bg-emerald-700 text-white font-semibold shadow-xs flex items-center gap-1.5 h-9 text-xs"
            >
              <PlusIcon className="size-4" />
              Add Grocery
            </Button>
          </div>
        </div>

        {/* Toolbar: Search and Filter fields */}
        <Card className="border border-gray-200 bg-white shadow-2xs">
          <CardContent className="p-4 md:p-5">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-12 gap-4 items-end">
              {/* Search Bar */}
              <div className="lg:col-span-4 flex flex-col gap-1.5">
                <Label htmlFor="search" className="text-xs font-semibold text-gray-700">Search details</Label>
                <div className="relative">
                  <SearchIcon className="absolute left-3 top-3 size-4 text-gray-400" />
                  <Input
                    id="search"
                    placeholder="Search grocery details..."
                    value={search}
                    onChange={(e) => {
                      setSearch(e.target.value);
                      setCurrentPage(1);
                    }}
                    className="pl-9 h-10 border-gray-200 focus:border-emerald-500 focus:ring-emerald-500"
                  />
                </div>
              </div>

              {/* From Date */}
              <div className="lg:col-span-2 flex flex-col gap-1.5">
                <Label htmlFor="fromDate" className="text-xs font-semibold text-gray-700">From Date</Label>
                <Input
                  id="fromDate"
                  type="date"
                  value={fromDate}
                  onChange={(e) => {
                    setFromDate(e.target.value);
                    setCurrentPage(1);
                  }}
                  className="h-10 border-gray-200 focus:border-emerald-500 focus:ring-emerald-500 text-sm font-semibold"
                />
              </div>

              {/* To Date */}
              <div className="lg:col-span-2 flex flex-col gap-1.5">
                <Label htmlFor="toDate" className="text-xs font-semibold text-gray-700">To Date</Label>
                <Input
                  id="toDate"
                  type="date"
                  value={toDate}
                  onChange={(e) => {
                    setToDate(e.target.value);
                    setCurrentPage(1);
                  }}
                  className="h-10 border-gray-200 focus:border-emerald-500 focus:ring-emerald-500 text-sm font-semibold"
                />
              </div>

              {/* Slip Status Filter */}
              <div className="lg:col-span-2 flex flex-col gap-1.5">
                <Label htmlFor="status" className="text-xs font-semibold text-gray-700">Slip Status</Label>
                <Select
                  value={statusFilter}
                  onValueChange={(val) => {
                    setStatusFilter(val || "all");
                    setCurrentPage(1);
                  }}
                >
                  <SelectTrigger id="status" className="w-full h-10 border-gray-200 text-sm font-semibold">
                    <SelectValue placeholder="Select Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All</SelectItem>
                    <SelectItem value="uploaded">Slip Uploaded</SelectItem>
                    <SelectItem value="missing">Slip Missing</SelectItem>
                    <SelectItem value="approved">Approved Without Slip</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Reset button */}
              <div className="lg:col-span-2 flex gap-2">
                <Button
                  onClick={handleResetFilters}
                  variant="outline"
                  className="w-full h-10 border-gray-200 text-xs font-semibold text-gray-600 hover:bg-gray-50 flex items-center justify-center gap-1.5"
                >
                  <RotateCcwIcon className="size-4" />
                  Reset
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Data Table */}
        <Card className="border border-gray-200 bg-white shadow-2xs">
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader className="bg-slate-50/75">
                  <TableRow className="border-b border-gray-200/80">
                    {isAdmin && (
                      <TableHead className="w-12 text-center">
                        <Checkbox
                          checked={
                            paginatedEntries.length > 0 &&
                            paginatedEntries.every((entry) => selectedIds.includes(entry.id))
                          }
                          onCheckedChange={(checked) => handleSelectAll(!!checked)}
                        />
                      </TableHead>
                    )}
                    <TableHead className="w-12 text-center text-xs font-bold text-gray-400">Slip</TableHead>
                    <TableHead className="text-xs font-bold text-gray-400">Date</TableHead>
                    <TableHead className="text-xs font-bold text-gray-400">Grocery Details</TableHead>
                    <TableHead className="text-xs font-bold text-gray-400">Amount</TableHead>
                    <TableHead className="text-xs font-bold text-gray-400">Status</TableHead>
                    <TableHead className="text-right text-xs font-bold text-gray-400">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {paginatedEntries.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={isAdmin ? 7 : 6} className="h-64 text-center">
                        <div className="flex flex-col items-center justify-center gap-2 p-6 text-gray-400">
                          <span className="text-lg font-bold">No Matching Grocery Found</span>
                          <span className="text-sm">Try adjusting your search query, date ranges, or filters.</span>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={handleResetFilters}
                            className="mt-2 border-gray-200 font-semibold"
                          >
                            Reset Filters
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ) : (
                    paginatedEntries.map((entry) => (
                      <TableRow key={entry.id} className="border-b border-gray-100 hover:bg-slate-50/30 text-sm">
                        {isAdmin && (
                          <TableCell className="text-center">
                            <Checkbox
                              checked={selectedIds.includes(entry.id)}
                              onCheckedChange={(checked) => handleSelectRow(entry.id, !!checked)}
                            />
                          </TableCell>
                        )}
                        <TableCell className="text-center font-medium">
                          {entry.status === "Slip Uploaded" && (
                            <div className="flex justify-center">
                              <span className="flex h-5 w-5 items-center justify-center rounded-full bg-emerald-50 border border-emerald-100/80 text-emerald-800" title="Slip Uploaded">
                                <span className="h-1.5 w-1.5 rounded-full bg-emerald-600" />
                              </span>
                            </div>
                          )}
                          {entry.status === "Slip Missing" && (
                            <div className="flex justify-center">
                              <span className="flex h-5 w-5 items-center justify-center rounded-full bg-rose-50 border border-rose-100 text-rose-800" title="Slip Missing">
                                <span className="h-1.5 w-1.5 rounded-full bg-rose-600 animate-pulse" />
                              </span>
                            </div>
                          )}
                          {entry.status === "Approved Without Slip" && (
                            <div className="flex justify-center">
                              <span className="flex h-5 w-5 items-center justify-center rounded-full bg-blue-50 border border-blue-100 text-blue-800" title="Approved Without Slip">
                                <span className="h-1.5 w-1.5 rounded-full bg-blue-600" />
                              </span>
                            </div>
                          )}
                        </TableCell>
                        <TableCell className="font-semibold text-gray-900">
                          {entry.date ? (
                            (() => {
                              const d = new Date(entry.date);
                              return isNaN(d.getTime()) ? entry.date : format(d, "dd MMM yyyy");
                            })()
                          ) : (
                            "-"
                          )}
                        </TableCell>
                        <TableCell className="font-medium text-gray-700 max-w-[280px] truncate" title={entry.details}>
                          {entry.details}
                        </TableCell>
                        <TableCell className="font-bold text-gray-900">
                          Rs. {entry.amount.toLocaleString()}
                        </TableCell>
                        <TableCell>{getStatusBadge(entry.status)}</TableCell>
                        <TableCell className="text-right">
                          <DropdownMenu>
                            <DropdownMenuTrigger
                              render={
                                <Button
                                  variant="ghost"
                                  size="icon-sm"
                                  className="h-8 w-8 text-gray-500 hover:bg-gray-100 hover:text-gray-900 rounded-lg"
                                />
                              }
                            >
                              <MoreVerticalIcon className="size-4" />
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="w-40 bg-white border border-gray-100 shadow-md rounded-lg">
                              <DropdownMenuItem onClick={() => handleAction(entry, "view")} className="cursor-pointer">
                                <EyeIcon className="size-4 mr-2 text-gray-400" />
                                View Details
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => handleAction(entry, "edit")} className="cursor-pointer">
                                <PencilIcon className="size-4 mr-2 text-gray-400" />
                                Edit
                              </DropdownMenuItem>
                              {isAdmin && entry.status === "Slip Missing" && (
                                <DropdownMenuItem onClick={() => handleAction(entry, "approve")} className="cursor-pointer text-blue-600 focus:text-blue-600">
                                  <FileCheckIcon className="size-4 mr-2 text-blue-500" />
                                  Approve Slip
                                </DropdownMenuItem>
                              )}
                              {isAdmin && (
                                <>
                                  <DropdownMenuSeparator className="bg-gray-100" />
                                  <DropdownMenuItem onClick={() => handleAction(entry, "delete")} className="text-red-600 focus:text-red-600 cursor-pointer">
                                    <Trash2Icon className="size-4 mr-2 text-red-500" />
                                    Delete
                                  </DropdownMenuItem>
                                </>
                              )}
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>

            {/* Pagination Controls */}
            {filteredEntries.length > 0 && (
              <div className="flex flex-col sm:flex-row justify-between items-center px-6 py-4 border-t border-gray-100 gap-4">
                {/* Left: Row Selection / Stats */}
                <div className="text-xs font-semibold text-gray-500">
                  {isAdmin && selectedIds.length > 0 ? (
                    <div className="flex items-center gap-3">
                      <span className="text-gray-700">
                        {selectedIds.length} of {filteredEntries.length} row(s) selected
                      </span>
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={handleBulkDelete}
                        className="bg-red-600 hover:bg-red-700 text-white font-semibold h-8 px-2.5 text-[10px] flex items-center gap-1.5 rounded-md"
                      >
                        <Trash2Icon className="size-3.5" />
                        Delete Selected
                      </Button>
                    </div>
                  ) : (
                    <div>
                      Showing <span className="text-gray-800">{(currentPage - 1) * itemsPerPage + 1}</span> to{" "}
                      <span className="text-gray-800">
                        {Math.min(currentPage * itemsPerPage, filteredEntries.length)}
                      </span>{" "}
                      of <span className="text-gray-800">{filteredEntries.length}</span> entries
                    </div>
                  )}
                </div>

                {/* Right: Rows per page + Page controls */}
                <div className="flex flex-wrap items-center gap-6">
                  {/* Rows per page select */}
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-semibold text-gray-500">Rows per page</span>
                    <Select
                      value={itemsPerPage.toString()}
                      onValueChange={(val) => {
                        if (val) {
                          setItemsPerPage(parseInt(val));
                          setCurrentPage(1);
                        }
                      }}
                    >
                      <SelectTrigger className="h-8 w-16 text-xs font-semibold border-gray-200 bg-white">
                        <SelectValue placeholder="10" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="5">5</SelectItem>
                        <SelectItem value="10">10</SelectItem>
                        <SelectItem value="20">20</SelectItem>
                        <SelectItem value="50">50</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Page index & controls */}
                  <div className="flex items-center gap-4">
                    <span className="text-xs font-bold text-gray-700">
                      Page {currentPage} of {totalPages}
                    </span>

                    <div className="flex items-center gap-1">
                      {/* First Page */}
                      <Button
                        variant="outline"
                        size="sm"
                        disabled={currentPage === 1}
                        onClick={() => setCurrentPage(1)}
                        className="h-8 w-8 p-0 border-gray-200 text-gray-700"
                        title="First Page"
                      >
                        <ChevronsLeftIcon className="size-4" />
                      </Button>

                      {/* Prev Page */}
                      <Button
                        variant="outline"
                        size="sm"
                        disabled={currentPage === 1}
                        onClick={() => setCurrentPage((p) => Math.max(p - 1, 1))}
                        className="h-8 w-8 p-0 border-gray-200 text-gray-700"
                        title="Previous Page"
                      >
                        <ChevronLeftIcon className="size-4" />
                      </Button>

                      {/* Next Page */}
                      <Button
                        variant="outline"
                        size="sm"
                        disabled={currentPage === totalPages}
                        onClick={() => setCurrentPage((p) => Math.min(p + 1, totalPages))}
                        className="h-8 w-8 p-0 border-gray-200 text-gray-700"
                        title="Next Page"
                      >
                        <ChevronRightIcon className="size-4" />
                      </Button>

                      {/* Last Page */}
                      <Button
                        variant="outline"
                        size="sm"
                        disabled={currentPage === totalPages}
                        onClick={() => setCurrentPage(totalPages)}
                        className="h-8 w-8 p-0 border-gray-200 text-gray-700"
                        title="Last Page"
                      >
                        <ChevronsRightIcon className="size-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Modals Container */}
      <AddGroceryModal open={addModalOpen} onOpenChange={setAddModalOpen} />
      <ViewGroceryModal open={viewModalOpen} onOpenChange={setViewModalOpen} entry={selectedEntry} />
      <EditGroceryModal open={editModalOpen} onOpenChange={setEditModalOpen} entry={selectedEntry} />
      <ApproveWithoutSlipModal open={approveModalOpen} onOpenChange={setApproveModalOpen} entry={selectedEntry} />
      <DeleteGroceryModal open={deleteModalOpen} onOpenChange={setDeleteModalOpen} entry={selectedEntry} />
    </DashboardLayout>
  );
}
