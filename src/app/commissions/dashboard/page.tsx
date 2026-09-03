"use client";

import React, { useState, useMemo, useEffect } from "react";
import { useRouter } from "next/navigation";
import { format } from "date-fns";
import { useStore } from "@/lib/store";
import { CommissionsLayout } from "@/components/commissions/CommissionsLayout";
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
import { AddCommissionModal } from "@/components/commissions/AddCommissionModal";
import { EditCommissionModal } from "@/components/commissions/EditCommissionModal";
import { ViewCommissionModal } from "@/components/commissions/ViewCommissionModal";
import { DeleteCommissionModal } from "@/components/commissions/DeleteCommissionModal";
import {
  PlusIcon,
  SearchIcon,
  RotateCcwIcon,
  FileSpreadsheetIcon,
  FileTextIcon,
  EyeIcon,
  PencilIcon,
  Trash2Icon,
  ChevronLeftIcon,
  ChevronRightIcon,
  ChevronsLeftIcon,
  ChevronsRightIcon,
  MoreVerticalIcon,
  CoinsIcon,
  UsersIcon,
  BadgePercentIcon,
  Building2Icon,
  TrendingUpIcon,
  GraduationCapIcon,
} from "lucide-react";
import { toast } from "sonner";
import { CommissionEntry, COMMISSION_SERVICES, SlipStatus } from "@/lib/mockData";
import * as XLSX from "xlsx";
import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";

export default function CommissionsDashboardPage() {
  const {
    currentUser,
    activeEntity,
    switchEntity,
    commissionEntries,
    counselors,
    deleteCommissionEntries,
    currentMonth,
    currentYear,
  } = useStore();
  const router = useRouter();

  const isAdmin = currentUser?.role === "ADMIN";

  // Strict branch isolation for non-admin users
  useEffect(() => {
    if (currentUser?.role === "ISQUAREBPO_USER") {
      toast.error("Commissions Module is not available for ISquareBPO entity.");
      router.push("/dashboard");
    } else if (currentUser?.role === "LAHORE_USER" && activeEntity !== "Lahore") {
      switchEntity("Lahore");
    } else if (currentUser?.role === "MULTAN_USER" && activeEntity !== "Multan") {
      switchEntity("Multan");
    }
  }, [currentUser, activeEntity, switchEntity, router]);

  // Search & Filter State
  const [search, setSearch] = useState("");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [counselorFilter, setCounselorFilter] = useState("all");
  const [serviceFilter, setServiceFilter] = useState("all");
  const [paymentFilter, setPaymentFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");

  // Selection state (for Admin bulk operations)
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  // Modals state
  const [addModalOpen, setAddModalOpen] = useState(false);
  const [viewModalOpen, setViewModalOpen] = useState(false);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [selectedEntry, setSelectedEntry] = useState<CommissionEntry | null>(null);

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);

  // Filter counselors by branch
  const branchCounselors = useMemo(() => {
    return counselors.filter(
      (c) => !c.entity || c.entity === "All" || c.entity === activeEntity
    );
  }, [counselors, activeEntity]);

  // Filter Logic
  const filteredEntries = useMemo(() => {
    return commissionEntries.filter((entry) => {
      // Must match active entity strictly
      if (entry.entity !== activeEntity) return false;

      // Search keyword filter on student name, counselor, service, amount
      if (search.trim()) {
        const query = search.toLowerCase();
        const matchesStudent = entry.studentName.toLowerCase().includes(query);
        const matchesCounselor = entry.counselor.toLowerCase().includes(query);
        const matchesService = entry.service.toLowerCase().includes(query);
        const matchesAmount = entry.amount.toString().includes(query);
        if (!matchesStudent && !matchesCounselor && !matchesService && !matchesAmount) return false;
      }

      // Date range filters
      if (fromDate && entry.date < fromDate) return false;
      if (toDate && entry.date > toDate) return false;

      // Counselor filter
      if (counselorFilter !== "all" && entry.counselor !== counselorFilter) return false;

      // Service filter
      if (serviceFilter !== "all" && entry.service !== serviceFilter) return false;

      // Payment Status (Full Received) filter
      if (paymentFilter === "full" && !entry.fullReceived) return false;
      if (paymentFilter === "partial" && entry.fullReceived) return false;

      // Slip status filter
      if (statusFilter !== "all") {
        if (statusFilter === "uploaded" && entry.status !== "Slip Uploaded") return false;
        if (statusFilter === "missing" && entry.status !== "Slip Missing") return false;
        if (statusFilter === "approved" && entry.status !== "Approved Without Slip") return false;
      }

      return true;
    });
  }, [commissionEntries, activeEntity, search, fromDate, toDate, counselorFilter, serviceFilter, paymentFilter, statusFilter]);

  // Statistics
  const totalAmountCollected = useMemo(() => {
    return filteredEntries.reduce((sum, entry) => sum + entry.amount, 0);
  }, [filteredEntries]);

  const totalCounselorCommission = useMemo(() => {
    return filteredEntries.reduce((sum, entry) => sum + (entry.counselorCommission || 0), 0);
  }, [filteredEntries]);

  const totalBmCommission = useMemo(() => {
    return filteredEntries.reduce((sum, entry) => sum + (entry.bmCommission || 0), 0);
  }, [filteredEntries]);

  const totalFullReceivedCount = useMemo(() => {
    return filteredEntries.filter((entry) => entry.fullReceived).length;
  }, [filteredEntries]);

  // Pagination Logic
  const totalPages = Math.ceil(filteredEntries.length / itemsPerPage) || 1;
  const paginatedEntries = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    return filteredEntries.slice(startIndex, startIndex + itemsPerPage);
  }, [filteredEntries, currentPage, itemsPerPage]);

  // Reset selection on filter change
  useEffect(() => {
    setSelectedIds([]);
  }, [activeEntity, search, fromDate, toDate, counselorFilter, serviceFilter, paymentFilter, statusFilter, currentPage]);

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
    if (confirm(`Are you sure you want to delete ${selectedIds.length} selected commission entries?`)) {
      deleteCommissionEntries(selectedIds);
      setSelectedIds([]);
      toast.success("Selected commission entries deleted successfully.");
    }
  };

  const handleResetFilters = () => {
    setSearch("");
    setFromDate("");
    setToDate("");
    setCounselorFilter("all");
    setServiceFilter("all");
    setPaymentFilter("all");
    setStatusFilter("all");
    setCurrentPage(1);
    toast.success("Filters reset.");
  };

  const handleAction = (entry: CommissionEntry, type: "view" | "edit" | "delete") => {
    setSelectedEntry(entry);
    if (type === "view") setViewModalOpen(true);
    else if (type === "edit") setEditModalOpen(true);
    else if (type === "delete") setDeleteModalOpen(true);
  };

  const getStatusBadge = (status: SlipStatus) => {
    switch (status) {
      case "Slip Uploaded":
        return (
          <Badge className="bg-emerald-50 text-emerald-700 hover:bg-emerald-50 border border-emerald-100/80 font-medium text-[10px] gap-1 rounded-sm">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-600" />
            Uploaded
          </Badge>
        );
      case "Slip Missing":
        return (
          <Badge className="bg-red-50 text-red-700 hover:bg-red-50 border border-red-100 font-medium text-[10px] gap-1 rounded-sm">
            <span className="h-1.5 w-1.5 rounded-full bg-red-600 animate-pulse" />
            Missing
          </Badge>
        );
      case "Approved Without Slip":
        return (
          <Badge className="bg-blue-50 text-blue-700 hover:bg-blue-50 border border-blue-100 font-medium text-[10px] gap-1 rounded-sm">
            <span className="h-1.5 w-1.5 rounded-full bg-blue-600" />
            Approved
          </Badge>
        );
      default:
        return null;
    }
  };

  // Export Excel
  const handleExportExcel = () => {
    toast.loading("Generating Commission Excel spreadsheet...", { id: "export-comm-excel" });
    try {
      const titleText = `${activeEntity.toUpperCase()} EMPLOYEE COMMISSIONS REPORT`;
      const subtitleText = `Exported: ${format(new Date(), "dd MMM yyyy, hh:mm a")}`;

      const summaryCollected = `Total Collected: Rs. ${totalAmountCollected.toLocaleString()}`;
      const summaryCc = `Total Counselor Comm (C.C): Rs. ${totalCounselorCommission.toLocaleString()}`;
      const summaryBm = `Total BM Comm: Rs. ${totalBmCommission.toLocaleString()}`;
      const summaryCount = `Total Records: ${filteredEntries.length}`;

      const aoaData: any[][] = [
        [titleText],
        [subtitleText],
        [],
        [summaryCollected, "", summaryCc, ""],
        [summaryBm, "", summaryCount, ""],
        [],
        ["Date", "Student Name", "Service", "Counselor", "Amount (Rs.)", "Full Received", "C.C (Rs.)", "B.M (Rs.)", "Slip Status"]
      ];

      filteredEntries.forEach((e) => {
        aoaData.push([
          e.date ? format(new Date(e.date), "dd MMM yyyy") : "-",
          e.studentName,
          e.service,
          e.counselor,
          e.amount,
          e.fullReceived ? "Full" : "Partial",
          e.counselorCommission || 0,
          e.bmCommission || 0,
          e.status
        ]);
      });

      const worksheet = XLSX.utils.aoa_to_sheet(aoaData);

      worksheet["!merges"] = [
        { s: { r: 0, c: 0 }, e: { r: 0, c: 8 } },
        { s: { r: 1, c: 0 }, e: { r: 1, c: 8 } },
        { s: { r: 3, c: 0 }, e: { r: 3, c: 1 } },
        { s: { r: 3, c: 2 }, e: { r: 3, c: 3 } },
        { s: { r: 4, c: 0 }, e: { r: 4, c: 1 } },
        { s: { r: 4, c: 2 }, e: { r: 4, c: 3 } },
      ];

      worksheet["!rows"] = [
        { hpt: 35 },
        { hpt: 20 },
        { hpt: 10 },
        { hpt: 20 },
        { hpt: 20 },
        { hpt: 10 },
        { hpt: 22 },
      ];

      worksheet["!cols"] = [
        { wch: 15 },
        { wch: 25 },
        { wch: 20 },
        { wch: 20 },
        { wch: 15 },
        { wch: 15 },
        { wch: 15 },
        { wch: 15 },
        { wch: 18 },
      ];

      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, "Commissions");

      const filename = `commissions_${activeEntity.toLowerCase()}_${format(new Date(), "yyyyMMdd")}.xlsx`;
      XLSX.writeFile(workbook, filename);

      toast.success("Excel sheet downloaded successfully.", { id: "export-comm-excel" });
    } catch (error) {
      console.error(error);
      toast.error("Failed to generate Excel sheet.", { id: "export-comm-excel" });
    }
  };

  // Export PDF
  const handleExportPDF = () => {
    toast.loading("Generating Commission PDF document...", { id: "export-comm-pdf" });
    try {
      const doc = new jsPDF("landscape");

      doc.setFont("helvetica", "bold");
      doc.setFontSize(18);
      doc.setTextColor(5, 150, 105);
      doc.text("Employee Commission Report", 14, 18);

      doc.setFont("helvetica", "normal");
      doc.setFontSize(10);
      doc.setTextColor(100, 116, 139);
      doc.text(`Branch: ${activeEntity} Branch`, 14, 25);
      doc.text(`Report Generated: ${format(new Date(), "dd MMMM yyyy, hh:mm a")}`, 14, 31);

      doc.setDrawColor(226, 232, 240);
      doc.line(14, 35, 282, 35);

      const headers = [["Date", "Student", "Service", "Counselor", "Amount", "Full Rec.", "C.C", "B.M", "Status"]];
      const rows = filteredEntries.map((e) => [
        e.date ? format(new Date(e.date), "dd MMM yyyy") : "-",
        e.studentName,
        e.service,
        e.counselor,
        `Rs. ${e.amount.toLocaleString()}`,
        e.fullReceived ? "Full" : "Partial",
        `Rs. ${(e.counselorCommission || 0).toLocaleString()}`,
        `Rs. ${(e.bmCommission || 0).toLocaleString()}`,
        e.status
      ]);

      autoTable(doc, {
        startY: 40,
        head: headers,
        body: rows,
        headStyles: {
          fillColor: [5, 150, 105],
          textColor: [255, 255, 255],
          fontSize: 9,
          fontStyle: "bold",
        },
        bodyStyles: {
          fontSize: 8,
          textColor: [30, 41, 59],
        },
        alternateRowStyles: {
          fillColor: [248, 250, 252],
        },
        margin: { left: 14, right: 14 },
      });

      const filename = `commissions_${activeEntity.toLowerCase()}_${format(new Date(), "yyyyMMdd")}.pdf`;
      doc.save(filename);

      toast.success("PDF document downloaded successfully.", { id: "export-comm-pdf" });
    } catch (error) {
      console.error(error);
      toast.error("Failed to generate PDF document.", { id: "export-comm-pdf" });
    }
  };

  return (
    <CommissionsLayout>
      <div className="space-y-6">
        {/* Title Block */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <Badge className="bg-emerald-100 text-emerald-800 border-emerald-200 text-xs font-semibold px-2.5 py-0.5">
                {activeEntity} Branch Commissions
              </Badge>
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-gray-900">
              {activeEntity} Employee Commissions
            </h1>
            <p className="text-sm text-gray-500 font-medium mt-0.5">
              Record student services, track counselor commission allocations, and manage payout disbursements.
            </p>
          </div>

          <div className="flex items-center gap-2 w-full md:w-auto">
            <Button
              variant="outline"
              size="sm"
              onClick={handleExportExcel}
              className="flex-1 md:flex-initial h-9 border-gray-200 text-xs font-semibold hover:bg-gray-50 text-gray-700 gap-1.5 cursor-pointer"
            >
              <FileSpreadsheetIcon className="size-4 text-emerald-600" />
              Export Excel
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handleExportPDF}
              className="flex-1 md:flex-initial h-9 border-gray-200 text-xs font-semibold hover:bg-gray-50 text-gray-700 gap-1.5 cursor-pointer"
            >
              <FileTextIcon className="size-4 text-red-500" />
              Export PDF
            </Button>
            <Button
              onClick={() => setAddModalOpen(true)}
              className="flex-1 md:flex-initial bg-emerald-600 hover:bg-emerald-700 text-white font-semibold shadow-xs flex items-center gap-1.5 h-9 text-xs cursor-pointer"
            >
              <PlusIcon className="size-4" />
              Add Commission
            </Button>
          </div>
        </div>

        {/* 4 Summary Stat Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Card 1: Total Amount Collected */}
          <Card className="border border-gray-200 bg-white shadow-3xs">
            <CardContent className="p-5 space-y-3">
              <div className="flex justify-between items-center text-gray-400">
                <span className="text-[10px] font-bold uppercase tracking-wider">Total Received</span>
                <CoinsIcon className="size-4 text-emerald-600" />
              </div>
              <div>
                <div className="text-2xl font-black text-gray-900">
                  Rs. {totalAmountCollected.toLocaleString()}
                </div>
                <div className="text-[10px] text-gray-500 font-semibold mt-1">
                  Student fees collected for {activeEntity}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Card 2: Counselor Commission (C.C) */}
          <Card className="border border-gray-200 bg-white shadow-3xs">
            <CardContent className="p-5 space-y-3">
              <div className="flex justify-between items-center text-gray-400">
                <span className="text-[10px] font-bold uppercase tracking-wider">Counselor Comm (C.C)</span>
                <BadgePercentIcon className="size-4 text-emerald-600" />
              </div>
              <div>
                <div className="text-2xl font-black text-emerald-600">
                  Rs. {totalCounselorCommission.toLocaleString()}
                </div>
                <div className="text-[10px] text-gray-500 font-semibold mt-1">
                  Payable to {activeEntity} counselors
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Card 3: B.M Commission */}
          <Card className="border border-gray-200 bg-white shadow-3xs">
            <CardContent className="p-5 space-y-3">
              <div className="flex justify-between items-center text-gray-400">
                <span className="text-[10px] font-bold uppercase tracking-wider">B.M Commission</span>
                <TrendingUpIcon className="size-4 text-emerald-600" />
              </div>
              <div>
                <div className="text-2xl font-black text-gray-900">
                  Rs. {totalBmCommission.toLocaleString()}
                </div>
                <div className="text-[10px] text-gray-500 font-semibold mt-1">
                  Branch manager commission share
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Card 4: Total Commission Entries */}
          <Card className="border border-gray-200 bg-white shadow-3xs">
            <CardContent className="p-5 space-y-3">
              <div className="flex justify-between items-center text-gray-400">
                <span className="text-[10px] font-bold uppercase tracking-wider">Commission Entries</span>
                <GraduationCapIcon className="size-4 text-emerald-600" />
              </div>
              <div>
                <div className="text-2xl font-black text-gray-900">
                  {filteredEntries.length}
                </div>
                <div className="text-[10px] text-gray-500 font-semibold mt-1">
                  Total commission entries generated for {activeEntity}
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Toolbar: Search and Filter fields with robust widths */}
        <Card className="border border-gray-200 bg-white shadow-2xs">
          <CardContent className="p-4 md:p-5">
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-12 gap-3.5 items-end">
              {/* Search by Student Name */}
              <div className="lg:col-span-4 flex flex-col gap-1.5">
                <Label htmlFor="searchStudent" className="text-xs font-semibold text-gray-700">
                  Search Student Name
                </Label>
                <div className="relative">
                  <SearchIcon className="absolute left-3 top-3 size-4 text-gray-400" />
                  <Input
                    id="searchStudent"
                    placeholder="Search student name..."
                    value={search}
                    onChange={(e) => {
                      setSearch(e.target.value);
                      setCurrentPage(1);
                    }}
                    className="pl-9 h-10 border-gray-200 focus:border-emerald-500 focus:ring-emerald-500 text-xs w-full bg-white font-medium"
                  />
                </div>
              </div>

              {/* Counselor Filter */}
              <div className="lg:col-span-2 flex flex-col gap-1.5">
                <Label className="text-xs font-semibold text-gray-700">Counselor</Label>
                <Select
                  value={counselorFilter}
                  onValueChange={(val) => {
                    setCounselorFilter(val || "all");
                    setCurrentPage(1);
                  }}
                >
                  <SelectTrigger className="h-10 border-gray-200 text-xs font-semibold bg-white w-full">
                    <SelectValue placeholder="All Counselors" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Counselors</SelectItem>
                    {branchCounselors.map((c) => (
                      <SelectItem key={c.id} value={c.name} className="text-xs font-medium cursor-pointer">
                        {c.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Service Filter */}
              <div className="lg:col-span-2 flex flex-col gap-1.5">
                <Label className="text-xs font-semibold text-gray-700">Service</Label>
                <Select
                  value={serviceFilter}
                  onValueChange={(val) => {
                    setServiceFilter(val || "all");
                    setCurrentPage(1);
                  }}
                >
                  <SelectTrigger className="h-10 border-gray-200 text-xs font-semibold bg-white w-full">
                    <SelectValue placeholder="All Services" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Services</SelectItem>
                    {COMMISSION_SERVICES.map((s) => (
                      <SelectItem key={s} value={s} className="text-xs font-medium cursor-pointer">
                        {s}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* From Date */}
              <div className="lg:col-span-2 flex flex-col gap-1.5">
                <Label className="text-xs font-semibold text-gray-700">From Date</Label>
                <Input
                  type="date"
                  value={fromDate}
                  onChange={(e) => {
                    setFromDate(e.target.value);
                    setCurrentPage(1);
                  }}
                  className="h-10 border-gray-200 focus:border-emerald-500 focus:ring-emerald-500 text-xs font-semibold w-full bg-white"
                />
              </div>

              {/* To Date */}
              <div className="lg:col-span-2 flex flex-col gap-1.5">
                <Label className="text-xs font-semibold text-gray-700">To Date</Label>
                <Input
                  type="date"
                  value={toDate}
                  onChange={(e) => {
                    setToDate(e.target.value);
                    setCurrentPage(1);
                  }}
                  className="h-10 border-gray-200 focus:border-emerald-500 focus:ring-emerald-500 text-xs font-semibold w-full bg-white"
                />
              </div>
            </div>

            {/* Quick Status Filters & Reset Row */}
            <div className="flex flex-wrap items-center justify-between gap-3 mt-3.5 pt-3 border-t border-gray-100">
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold text-gray-500">Payment Status:</span>
                <div className="flex gap-1">
                  <Button
                    size="sm"
                    variant={paymentFilter === "all" ? "default" : "outline"}
                    onClick={() => { setPaymentFilter("all"); setCurrentPage(1); }}
                    className={`h-7 px-2.5 text-[11px] font-semibold cursor-pointer rounded-md ${paymentFilter === "all" ? "bg-emerald-600 text-white hover:bg-emerald-700" : "text-gray-600 border-gray-200 hover:bg-gray-50"}`}
                  >
                    All
                  </Button>
                  <Button
                    size="sm"
                    variant={paymentFilter === "full" ? "default" : "outline"}
                    onClick={() => { setPaymentFilter("full"); setCurrentPage(1); }}
                    className={`h-7 px-2.5 text-[11px] font-semibold cursor-pointer rounded-md ${paymentFilter === "full" ? "bg-emerald-600 text-white hover:bg-emerald-700" : "text-gray-600 border-gray-200 hover:bg-gray-50"}`}
                  >
                    Full Received
                  </Button>
                  <Button
                    size="sm"
                    variant={paymentFilter === "partial" ? "default" : "outline"}
                    onClick={() => { setPaymentFilter("partial"); setCurrentPage(1); }}
                    className={`h-7 px-2.5 text-[11px] font-semibold cursor-pointer rounded-md ${paymentFilter === "partial" ? "bg-emerald-600 text-white hover:bg-emerald-700" : "text-gray-600 border-gray-200 hover:bg-gray-50"}`}
                  >
                    Partial
                  </Button>
                </div>
              </div>

              <Button
                onClick={handleResetFilters}
                variant="ghost"
                size="sm"
                className="h-8 text-xs font-semibold text-gray-600 hover:text-emerald-700 hover:bg-emerald-50 gap-1.5 cursor-pointer"
              >
                <RotateCcwIcon className="size-3.5" />
                <span>Reset Filters</span>
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Commission Entries Data Table */}
        <Card className="border border-gray-200 bg-white shadow-2xs">
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader className="bg-slate-50/75">
                  <TableRow className="border-b border-gray-200/80">
                    {isAdmin && (
                      <TableHead className="w-10 text-center">
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
                    <TableHead className="text-xs font-bold text-gray-400">Student</TableHead>
                    <TableHead className="text-xs font-bold text-gray-400">Service</TableHead>
                    <TableHead className="text-xs font-bold text-gray-400">Counselor</TableHead>
                    <TableHead className="text-xs font-bold text-gray-400">Amount</TableHead>
                    <TableHead className="text-xs font-bold text-gray-400">Full Received</TableHead>
                    <TableHead className="text-xs font-bold text-gray-400">C.C</TableHead>
                    <TableHead className="text-xs font-bold text-gray-400">B.M</TableHead>
                    <TableHead className="text-right text-xs font-bold text-gray-400">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {paginatedEntries.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={isAdmin ? 11 : 10} className="h-64 text-center">
                        <div className="flex flex-col items-center justify-center gap-2 p-6 text-gray-400">
                          <GraduationCapIcon className="size-8 text-gray-300" />
                          <span className="text-base font-bold text-gray-700">No Commission Entries Found</span>
                          <span className="text-xs text-gray-400">Click &quot;Add Commission&quot; to record a student service transaction.</span>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setAddModalOpen(true)}
                            className="mt-2 border-gray-200 font-semibold text-xs cursor-pointer"
                          >
                            <PlusIcon className="size-3.5 mr-1" />
                            Add Commission
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
                          {getStatusBadge(entry.status)}
                        </TableCell>
                        <TableCell className="font-semibold text-gray-900 whitespace-nowrap">
                          {entry.date ? (
                            (() => {
                              const d = new Date(entry.date);
                              return isNaN(d.getTime()) ? entry.date : format(d, "dd MMM yyyy");
                            })()
                          ) : (
                            "-"
                          )}
                        </TableCell>
                        <TableCell className="font-bold text-gray-900">
                          {entry.studentName}
                        </TableCell>
                        <TableCell>
                          <Badge className="bg-slate-100 text-slate-800 border-gray-200 font-semibold text-[10px]">
                            {entry.service}
                          </Badge>
                        </TableCell>
                        <TableCell className="font-medium text-gray-700 whitespace-nowrap">
                          {entry.counselor}
                        </TableCell>
                        <TableCell className="font-black text-slate-900 whitespace-nowrap">
                          Rs. {entry.amount.toLocaleString()}
                        </TableCell>
                        {/* Display plain badge/text instead of direct interactive switch in table */}
                        <TableCell className="whitespace-nowrap">
                          {entry.fullReceived ? (
                            <Badge className="bg-emerald-50 text-emerald-700 hover:bg-emerald-50 border border-emerald-200/80 font-bold text-[11px] px-2.5 py-0.5 rounded-md">
                              Full
                            </Badge>
                          ) : (
                            <Badge className="bg-amber-50 text-amber-700 hover:bg-amber-50 border border-amber-200/80 font-bold text-[11px] px-2.5 py-0.5 rounded-md">
                              Partial
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell className="font-bold text-emerald-700 whitespace-nowrap">
                          Rs. {(entry.counselorCommission || 0).toLocaleString()}
                        </TableCell>
                        <TableCell className="font-bold text-blue-700 whitespace-nowrap">
                          Rs. {(entry.bmCommission || 0).toLocaleString()}
                        </TableCell>
                        <TableCell className="text-right">
                          <DropdownMenu>
                            <DropdownMenuTrigger
                              render={
                                <Button
                                  variant="ghost"
                                  size="icon-sm"
                                  className="h-8 w-8 text-gray-500 hover:bg-gray-100 hover:text-gray-900 rounded-lg cursor-pointer"
                                />
                              }
                            >
                              <MoreVerticalIcon className="size-4" />
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="w-40 bg-white border border-gray-100 shadow-md rounded-lg">
                              <DropdownMenuItem onClick={() => handleAction(entry, "view")} className="cursor-pointer text-xs">
                                <EyeIcon className="size-3.5 mr-2 text-gray-400" />
                                View Details
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => handleAction(entry, "edit")} className="cursor-pointer text-xs">
                                <PencilIcon className="size-3.5 mr-2 text-gray-400" />
                                Edit Entry
                              </DropdownMenuItem>
                              {isAdmin && (
                                <>
                                  <DropdownMenuSeparator className="bg-gray-100" />
                                  <DropdownMenuItem onClick={() => handleAction(entry, "delete")} className="text-red-600 focus:text-red-600 cursor-pointer text-xs">
                                    <Trash2Icon className="size-3.5 mr-2 text-red-500" />
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
                        className="bg-red-600 hover:bg-red-700 text-white font-semibold h-8 px-2.5 text-[10px] flex items-center gap-1.5 rounded-md cursor-pointer"
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

                <div className="flex flex-wrap items-center gap-6">
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

                  <div className="flex items-center gap-4">
                    <span className="text-xs font-bold text-gray-700">
                      Page {currentPage} of {totalPages}
                    </span>

                    <div className="flex items-center gap-1">
                      <Button
                        variant="outline"
                        size="sm"
                        disabled={currentPage === 1}
                        onClick={() => setCurrentPage(1)}
                        className="h-8 w-8 p-0 border-gray-200 text-gray-700 cursor-pointer"
                        title="First Page"
                      >
                        <ChevronsLeftIcon className="size-4" />
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        disabled={currentPage === 1}
                        onClick={() => setCurrentPage((p) => Math.max(p - 1, 1))}
                        className="h-8 w-8 p-0 border-gray-200 text-gray-700 cursor-pointer"
                        title="Previous Page"
                      >
                        <ChevronLeftIcon className="size-4" />
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        disabled={currentPage === totalPages}
                        onClick={() => setCurrentPage((p) => Math.min(p + 1, totalPages))}
                        className="h-8 w-8 p-0 border-gray-200 text-gray-700 cursor-pointer"
                        title="Next Page"
                      >
                        <ChevronRightIcon className="size-4" />
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        disabled={currentPage === totalPages}
                        onClick={() => setCurrentPage(totalPages)}
                        className="h-8 w-8 p-0 border-gray-200 text-gray-700 cursor-pointer"
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

      {/* Modals */}
      <AddCommissionModal open={addModalOpen} onOpenChange={setAddModalOpen} />
      <EditCommissionModal open={editModalOpen} onOpenChange={setEditModalOpen} entry={selectedEntry} />
      <ViewCommissionModal open={viewModalOpen} onOpenChange={setViewModalOpen} entry={selectedEntry} />
      <DeleteCommissionModal open={deleteModalOpen} onOpenChange={setDeleteModalOpen} entry={selectedEntry} />
    </CommissionsLayout>
  );
}
