"use client";

import React, { useState, useMemo } from "react";
import { format, startOfMonth, endOfMonth } from "date-fns";
import { useStore } from "@/lib/store";
import { DashboardLayout } from "@/components/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
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
import {
  FileSpreadsheetIcon,
  SearchIcon,
  RotateCcwIcon,
  FileTextIcon,
  CoinsIcon,
  TrendingUpIcon,
  CreditCardIcon,
  ShoppingBagIcon,
  CalendarIcon,
  ShieldCheckIcon,
} from "lucide-react";
import { toast } from "sonner";
import { Entity, SlipStatus } from "@/lib/mockData";
import { cn } from "@/lib/utils";

export default function ReportsPage() {
  const { currentUser, activeEntity, budgets, groceryEntries, currentMonth, currentYear, getEntityBudget } = useStore();
  const isAdmin = currentUser?.role === "ADMIN";

  // Filter States (defaults to empty so all expenses for entity are shown initially)
  const [reportEntity, setReportEntity] = useState<Entity>(
    currentUser?.assignedEntity || activeEntity
  );
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");

  // Lock user to their assigned entity if not Admin
  React.useEffect(() => {
    if (currentUser && currentUser.role !== "ADMIN" && currentUser.assignedEntity) {
      setReportEntity(currentUser.assignedEntity);
    }
  }, [currentUser]);

  // Handle Reset
  const handleReset = () => {
    setReportEntity(currentUser?.assignedEntity || activeEntity);
    setFromDate("");
    setToDate("");
    setStatusFilter("all");
    setSearchQuery("");
    toast.success("Report filters reset.");
  };

  // Filtered List calculation
  const filteredEntries = useMemo(() => {
    return groceryEntries.filter((entry) => {
      // Entity match
      if (entry.entity !== reportEntity) return false;

      // Search query
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase();
        const matchesDetails = entry.details.toLowerCase().includes(query);
        const matchesAddedBy = entry.addedBy.toLowerCase().includes(query);
        const matchesAmount = entry.amount.toString().includes(query);
        if (!matchesDetails && !matchesAddedBy && !matchesAmount) return false;
      }

      // Date ranges
      if (fromDate && entry.date < fromDate) return false;
      if (toDate && entry.date > toDate) return false;

      // Status
      if (statusFilter !== "all") {
        if (statusFilter === "uploaded" && entry.status !== "Slip Uploaded") return false;
        if (statusFilter === "missing" && entry.status !== "Slip Missing") return false;
        if (statusFilter === "approved" && entry.status !== "Approved Without Slip") return false;
      }

      return true;
    });
  }, [groceryEntries, reportEntity, fromDate, toDate, statusFilter, searchQuery]);

  // Budget for selected entity in the active period
  const totalBudget = getEntityBudget(reportEntity, currentMonth, currentYear);

  // Calculate Summary metrics
  const totalSpent = filteredEntries.reduce((sum, entry) => sum + entry.amount, 0);
  const remainingBalance = totalBudget - totalSpent;
  const totalEntriesCount = filteredEntries.length;
  const isOverBudget = remainingBalance < 0;

  const formatDateRange = () => {
    if (!fromDate && !toDate) return "All Time";
    const fromStr = fromDate ? format(new Date(fromDate), "dd MMMM yyyy") : "Beginning";
    const toStr = toDate ? format(new Date(toDate), "dd MMMM yyyy") : "Present";
    return `${fromStr} — ${toStr}`;
  };

  // Export spreadsheet triggered
  const triggerExcelExport = () => {
    toast.loading("Exporting Excel report...", { id: "excel-loader" });
    setTimeout(() => {
      toast.success("Excel report exported successfully.", { id: "excel-loader" });
    }, 1000);
  };

  // Export PDF triggered
  const triggerPDFExport = () => {
    toast.loading("Exporting PDF document...", { id: "pdf-loader" });
    setTimeout(() => {
      toast.success("PDF report exported successfully.", { id: "pdf-loader" });
    }, 1000);
  };

  const getApprovalLabel = (entry: any) => {
    if (entry.status === "Slip Uploaded") {
      return (
        <Badge className="bg-emerald-50 text-emerald-700 hover:bg-emerald-50 border border-emerald-100 font-semibold text-[9px] rounded-sm">
          Verified
        </Badge>
      );
    }
    if (entry.status === "Approved Without Slip") {
      return (
        <Badge className="bg-blue-50 text-blue-700 hover:bg-blue-50 border border-blue-100 font-semibold text-[9px] rounded-sm">
          Approved by Admin
        </Badge>
      );
    }
    return (
      <Badge className="bg-amber-50 text-amber-700 hover:bg-amber-50 border border-amber-100 font-semibold text-[9px] rounded-sm">
        Pending
      </Badge>
    );
  };

  const getStatusBullet = (status: SlipStatus) => {
    if (status === "Slip Uploaded") return <span className="text-emerald-600 font-bold leading-none">🟢</span>;
    if (status === "Slip Missing") return <span className="text-red-500 font-bold leading-none">🔴</span>;
    return <span className="text-blue-500 text-sm font-bold leading-none">✓</span>;
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Title Block */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-gray-900">Grocery Reports</h1>
            <p className="text-sm text-gray-500 font-medium mt-0.5">
              Generate and download grocery expense reports.
            </p>
          </div>

          <div className="flex items-center gap-2 w-full md:w-auto">
            <Button
              onClick={triggerExcelExport}
              className="flex-1 md:flex-initial bg-emerald-600 hover:bg-emerald-700 text-white font-semibold shadow-xs flex items-center justify-center gap-1.5 h-9 text-xs"
            >
              <FileSpreadsheetIcon className="size-4" />
              Export Excel
            </Button>
            <Button
              variant="outline"
              onClick={triggerPDFExport}
              className="flex-1 md:flex-initial h-9 border-gray-200 text-xs font-semibold hover:bg-gray-50 text-gray-700 gap-1.5"
            >
              <FileTextIcon className="size-4 text-red-500" />
              Export PDF
            </Button>
          </div>
        </div>

        {/* Filter Panel */}
        <Card className="border border-gray-200 bg-white shadow-2xs">
          <CardContent className="p-4 md:p-5">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-12 gap-4 items-end">
              {/* Entity Selector (Locked for users) */}
              <div className="lg:col-span-3 flex flex-col gap-1.5">
                <Label htmlFor="reportEntity" className="text-xs font-semibold text-gray-700">Entity</Label>
                <Select
                  value={reportEntity}
                  onValueChange={(val) => setReportEntity((val as Entity) || "Lahore")}
                  disabled={!isAdmin}
                >
                  <SelectTrigger id="reportEntity" className="h-10 border-gray-200 text-sm font-semibold disabled:bg-gray-50 disabled:text-gray-400">
                    <SelectValue placeholder="Select Entity" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Lahore">Lahore Entity</SelectItem>
                    <SelectItem value="Multan">Multan Entity</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* From Date */}
              <div className="lg:col-span-2 flex flex-col gap-1.5">
                <Label htmlFor="fromDate" className="text-xs font-semibold text-gray-700">From Date</Label>
                <Input
                  id="fromDate"
                  type="date"
                  value={fromDate}
                  onChange={(e) => setFromDate(e.target.value)}
                  className="h-10 border-gray-200 text-sm font-semibold"
                />
              </div>

              {/* To Date */}
              <div className="lg:col-span-2 flex flex-col gap-1.5">
                <Label htmlFor="toDate" className="text-xs font-semibold text-gray-700">To Date</Label>
                <Input
                  id="toDate"
                  type="date"
                  value={toDate}
                  onChange={(e) => setToDate(e.target.value)}
                  className="h-10 border-gray-200 text-sm font-semibold"
                />
              </div>

              {/* Slip Status Filter */}
              <div className="lg:col-span-2 flex flex-col gap-1.5">
                <Label htmlFor="status" className="text-xs font-semibold text-gray-700">Slip Status</Label>
                <Select value={statusFilter} onValueChange={(val) => setStatusFilter(val || "all")}>
                  <SelectTrigger id="status" className="h-10 border-gray-200 text-sm font-semibold">
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

              {/* Keyword search */}
              <div className="lg:col-span-2 flex flex-col gap-1.5">
                <Label htmlFor="keyword" className="text-xs font-semibold text-gray-700">Keyword</Label>
                <Input
                  id="keyword"
                  placeholder="e.g. Rice"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="h-10 border-gray-200 text-sm"
                />
              </div>

              {/* Reset button */}
              <div className="lg:col-span-1">
                <Button
                  onClick={handleReset}
                  variant="outline"
                  className="w-full h-10 border-gray-200 text-xs font-semibold text-gray-600 hover:bg-gray-50 flex items-center justify-center gap-1"
                >
                  <RotateCcwIcon className="size-4" />
                  Reset
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Report Preview Document */}
        <Card className="border border-gray-200 bg-white shadow-sm rounded-xl">
          <CardContent className="p-6 md:p-8 space-y-6">
            {/* Report Header Visual */}
            <div className="border-b border-gray-100 pb-6 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
              <div>
                <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block">Audit Sheet Preview</span>
                <h2 className="text-lg font-bold text-gray-900 mt-0.5">GROCERY EXPENSE REPORT</h2>
                <div className="flex items-center gap-2 mt-1.5 text-xs text-gray-500 font-semibold">
                  <CalendarIcon className="size-3.5 text-gray-400" />
                  <span>Report Period:</span>
                  <span className="text-gray-950 font-bold">{formatDateRange()}</span>
                </div>
              </div>

              <div className="text-left sm:text-right font-medium text-xs text-gray-500">
                <div>Entity Context: <strong className="text-emerald-700 uppercase">{reportEntity}</strong></div>
                <div className="mt-1">Generated On: <strong>{format(new Date(), "dd MMMM yyyy")}</strong></div>
              </div>
            </div>

            {/* Dynamic Summary metrics */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 bg-slate-50/50 p-4 rounded-xl border border-gray-100/50">
              <div className="space-y-1">
                <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">Total Monthly Budget</span>
                <div className="text-base font-bold text-gray-900">Rs. {totalBudget.toLocaleString()}</div>
              </div>
              <div className="space-y-1">
                <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">Total Spent</span>
                <div className="text-base font-bold text-emerald-600">Rs. {totalSpent.toLocaleString()}</div>
              </div>
              <div className="space-y-1">
                <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">Remaining Balance</span>
                <div className={cn("text-base font-bold flex items-center gap-1.5", isOverBudget ? "text-red-600" : "text-gray-900")}>
                  {remainingBalance < 0 ? "-" : ""}Rs. {Math.abs(remainingBalance).toLocaleString()}
                  {isOverBudget && (
                    <Badge variant="destructive" className="text-[8px] bg-red-100 text-red-700 font-bold border-none px-1 rounded hover:bg-red-100 uppercase h-fit py-0">
                      Over Budget
                    </Badge>
                  )}
                </div>
              </div>
              <div className="space-y-1">
                <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">Total Grocery Entries</span>
                <div className="text-base font-bold text-gray-900">{totalEntriesCount}</div>
              </div>
            </div>

            {/* Table preview */}
            <div className="border border-gray-100 rounded-lg overflow-hidden">
              <Table>
                <TableHeader className="bg-slate-50/75">
                  <TableRow className="border-b border-gray-100">
                    <TableHead className="w-12 text-center text-xs font-bold text-gray-400">Slip</TableHead>
                    <TableHead className="text-xs font-bold text-gray-400">Date</TableHead>
                    <TableHead className="text-xs font-bold text-gray-400">Grocery Details</TableHead>
                    <TableHead className="text-xs font-bold text-gray-400">Amount</TableHead>
                    <TableHead className="text-right text-xs font-bold text-gray-400">Approval Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredEntries.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={5} className="h-48 text-center text-gray-400 text-sm">
                        No transactions found in this date range matching the search parameters.
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredEntries.map((entry) => (
                      <TableRow key={entry.id} className="border-b border-gray-100 hover:bg-slate-50/20 text-sm">
                        <TableCell className="text-center font-medium">
                          {getStatusBullet(entry.status)}
                        </TableCell>
                        <TableCell className="font-semibold text-gray-900">
                          {format(new Date(entry.date), "dd MMM yyyy")}
                        </TableCell>
                        <TableCell className="font-medium text-gray-700 max-w-[280px] truncate" title={entry.details}>
                          {entry.details}
                        </TableCell>
                        <TableCell className="font-bold text-gray-900">
                          Rs. {entry.amount.toLocaleString()}
                        </TableCell>
                        <TableCell className="text-right">{getApprovalLabel(entry)}</TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>

            {/* Generated On Footer */}
            <div className="pt-4 border-t border-gray-100 flex justify-between items-center text-[10px] font-bold text-gray-400 uppercase tracking-wider">
              <span>Security level: internal business only</span>
              <span>Generated On: {format(new Date(), "dd August yyyy")}</span>
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
