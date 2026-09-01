"use client";

import React, { useState, useMemo } from "react";
import { useStore } from "@/lib/store";
import { DashboardLayout } from "@/components/DashboardLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { AddGroceryModal } from "@/components/AddGroceryModal";
import { ViewGroceryModal } from "@/components/ViewGroceryModal";
import { EditGroceryModal } from "@/components/EditGroceryModal";
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
  CoinsIcon,
  ShoppingBagIcon,
  TrendingUpIcon,
  CreditCardIcon,
  PlusIcon,
  AlertTriangleIcon,
  EyeIcon,
  PencilIcon,
  CheckCircle2Icon,
  Trash2Icon,
  FileCheckIcon,
  MoreVerticalIcon,
} from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Alert, AlertDescription } from "@/components/ui/alert";

export default function DashboardPage() {
  const {
    currentUser,
    activeEntity,
    currentMonth,
    currentYear,
    budgets,
    groceryEntries,
    getEntityBudget,
  } = useStore();

  const [addModalOpen, setAddModalOpen] = useState(false);
  const [viewModalOpen, setViewModalOpen] = useState(false);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [approveModalOpen, setApproveModalOpen] = useState(false);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [selectedEntry, setSelectedEntry] = useState<any>(null);
  const [selectedPeriod, setSelectedPeriod] = useState<string>("all");

  const isAdmin = currentUser?.role === "ADMIN";

  // Determine budget based on period
  const totalBudget = useMemo(() => {
    if (selectedPeriod === "all") {
      return getEntityBudget(activeEntity, currentMonth, currentYear);
    }
    const [month, yearStr] = selectedPeriod.split("-");
    return getEntityBudget(activeEntity, month, parseInt(yearStr, 10));
  }, [activeEntity, selectedPeriod, currentMonth, currentYear, budgets, getEntityBudget]);

  // Filter entries for active entity and selected period, sorted by date descending
  const filteredEntries = useMemo(() => {
    return groceryEntries
      .filter((entry) => {
        if (entry.entity !== activeEntity) return false;
        if (selectedPeriod === "all") return true;
        if (!entry.date) return false;

        const parts = entry.date.split("-");
        if (parts.length < 3) return false;
        const year = parseInt(parts[0], 10);
        const monthVal = parseInt(parts[1], 10);
        const months = [
          "January", "February", "March", "April", "May", "June",
          "July", "August", "September", "October", "November", "December"
        ];
        const monthName = months[monthVal - 1];

        const [filterMonth, filterYearStr] = selectedPeriod.split("-");
        return (
          monthName.toLowerCase() === filterMonth.toLowerCase() &&
          year === parseInt(filterYearStr, 10)
        );
      })
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [groceryEntries, activeEntity, selectedPeriod]);

  const recentEntries = useMemo(() => {
    return filteredEntries.slice(0, 5);
  }, [filteredEntries]);

  const totalSpent = useMemo(() => {
    return filteredEntries.reduce((sum, entry) => sum + entry.amount, 0);
  }, [filteredEntries]);

  const remainingBalance = totalBudget - totalSpent;
  const totalEntriesCount = filteredEntries.length;
  const usagePercentage = totalBudget > 0 ? Math.round((totalSpent / totalBudget) * 100) : 0;
  const isOverBudget = remainingBalance < 0;

  const handleAction = (entry: any, type: "view" | "edit" | "approve" | "delete") => {
    setSelectedEntry(entry);
    if (type === "view") setViewModalOpen(true);
    else if (type === "edit") setEditModalOpen(true);
    else if (type === "approve") setApproveModalOpen(true);
    else if (type === "delete") setDeleteModalOpen(true);
  };

  const getStatusBadge = (entry: any) => {
    switch (entry.status) {
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

  const getPeriodLabel = () => {
    if (selectedPeriod === "all") return "All Time";
    const [m, y] = selectedPeriod.split("-");
    return `${m} ${y}`;
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Title Block */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-gray-900">
              {activeEntity} Grocery Dashboard
            </h1>
            <p className="text-sm text-gray-500 font-medium mt-0.5">
              Manage and track monthly grocery expenses.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            {/* Period / Month Selector */}
            <div className="w-40">
              <Select value={selectedPeriod} onValueChange={(val) => setSelectedPeriod(val || "all")}>
                <SelectTrigger className="h-9 border-gray-200 text-xs font-semibold bg-white">
                  <SelectValue placeholder="Select Period" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Records</SelectItem>
                  <SelectItem value="September-2026">September 2026</SelectItem>
                  <SelectItem value="August-2026">August 2026</SelectItem>
                  <SelectItem value="July-2026">July 2026</SelectItem>
                  <SelectItem value="June-2026">June 2026</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <Badge className="bg-emerald-50 text-emerald-800 hover:bg-emerald-50 border border-emerald-100/50 text-xs font-semibold py-1.5 px-3 rounded-md">
              {isAdmin ? "ADMIN" : `${activeEntity.toUpperCase()} USER`}
            </Badge>
            <Button
              onClick={() => setAddModalOpen(true)}
              className="bg-emerald-600 hover:bg-emerald-700 text-white font-semibold shadow-xs flex items-center gap-1.5 h-9 text-xs"
            >
              <PlusIcon className="size-4" />
              Add Grocery
            </Button>
          </div>
        </div>

        {/* Global budget status warning */}
        {isOverBudget && (
          <Alert className="bg-red-50 border-red-100 text-red-800 p-4 rounded-xl flex items-start gap-3 shadow-2xs">
            <AlertTriangleIcon className="size-5 shrink-0 mt-0.5 text-red-600" />
            <AlertDescription className="text-xs leading-normal">
              <strong>⚠ Budget Alert:</strong> Your spending for {getPeriodLabel()} has exceeded the allocated monthly budget by <strong>Rs. {Math.abs(remainingBalance).toLocaleString()}</strong>. Dashboard displays negative remaining balance and over-budget triggers.
            </AlertDescription>
          </Alert>
        )}

        {/* 4 Summary Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Card 1: Budget */}
          <Card className="border border-gray-200 bg-white shadow-3xs">
            <CardContent className="p-5 space-y-3">
              <div className="flex justify-between items-center text-gray-400">
                <span className="text-[10px] font-bold uppercase tracking-wider">Monthly Budget</span>
                <CoinsIcon className="size-4 text-emerald-600" />
              </div>
              <div>
                <div className="text-2xl font-black text-gray-900">
                  Rs. {totalBudget.toLocaleString()}
                </div>
                <div className="text-[10px] text-gray-500 font-semibold mt-1">
                  {selectedPeriod === "all" ? "Allocated Monthly Budget" : `Allocated for ${getPeriodLabel()}`}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Card 2: Spent */}
          <Card className="border border-gray-200 bg-white shadow-3xs">
            <CardContent className="p-5 space-y-3">
              <div className="flex justify-between items-center text-gray-400">
                <span className="text-[10px] font-bold uppercase tracking-wider">Total Spent</span>
                <TrendingUpIcon className="size-4 text-emerald-600" />
              </div>
              <div>
                <div className="text-2xl font-black text-emerald-600">
                  Rs. {totalSpent.toLocaleString()}
                </div>
                <div className="text-[10px] text-gray-500 font-semibold mt-1">
                  {usagePercentage}% of monthly budget used
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Card 3: Remaining */}
          <Card className="border border-gray-200 bg-white shadow-3xs">
            <CardContent className="p-5 space-y-3">
              <div className="flex justify-between items-center text-gray-400">
                <span className="text-[10px] font-bold uppercase tracking-wider">Remaining Balance</span>
                <CreditCardIcon className={cn("size-4", isOverBudget ? "text-red-500" : "text-emerald-600")} />
              </div>
              <div>
                <div className={cn("text-2xl font-black flex items-center gap-1.5", isOverBudget ? "text-red-600" : "text-gray-900")}>
                  {remainingBalance < 0 ? "-" : ""}Rs. {Math.abs(remainingBalance).toLocaleString()}
                  {isOverBudget && (
                    <Badge variant="destructive" className="text-[8px] bg-red-100 text-red-700 font-bold border-none px-1 rounded hover:bg-red-100 uppercase h-fit py-0">
                      Over Budget
                    </Badge>
                  )}
                </div>
                <div className="text-[10px] text-gray-500 font-semibold mt-1">
                  {isOverBudget ? "Allocated budget exceeded" : "Available to spend"}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Card 4: Count */}
          <Card className="border border-gray-200 bg-white shadow-3xs">
            <CardContent className="p-5 space-y-3">
              <div className="flex justify-between items-center text-gray-400">
                <span className="text-[10px] font-bold uppercase tracking-wider">Grocery Entries</span>
                <ShoppingBagIcon className="size-4 text-emerald-600" />
              </div>
              <div>
                <div className="text-2xl font-black text-gray-900">
                  {totalEntriesCount}
                </div>
                <div className="text-[10px] text-gray-500 font-semibold mt-1">
                  {selectedPeriod === "all" ? `Total entries for ${activeEntity}` : `Entries in ${getPeriodLabel()}`}
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Recent entries table */}
        <Card className="border border-gray-200 bg-white shadow-2xs">
          <CardContent className="p-5 space-y-4">
            <div className="flex justify-between items-center">
              <h2 className="text-base font-bold text-gray-900">Recent Grocery Entries</h2>
              <Button
                variant="outline"
                size="sm"
                onClick={() => router.push("/grocery")}
                className="h-8 border-gray-200 text-xs font-semibold hover:bg-gray-50 text-gray-700"
              >
                View All
              </Button>
            </div>

            <div className="border border-gray-100 rounded-lg overflow-hidden">
              <Table>
                <TableHeader className="bg-slate-50/75">
                  <TableRow className="border-b border-gray-100">
                    <TableHead className="w-12 text-center text-xs font-bold text-gray-400">Slip</TableHead>
                    <TableHead className="text-xs font-bold text-gray-400">Date</TableHead>
                    <TableHead className="text-xs font-bold text-gray-400">Grocery Details</TableHead>
                    <TableHead className="text-xs font-bold text-gray-400">Amount</TableHead>
                    <TableHead className="text-xs font-bold text-gray-400">Status</TableHead>
                    <TableHead className="text-right text-xs font-bold text-gray-400">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {recentEntries.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="h-32 text-center text-gray-400 text-sm">
                        No Grocery Entries Yet. Add grocery expenses.
                      </TableCell>
                    </TableRow>
                  ) : (
                    recentEntries.map((entry) => (
                      <TableRow key={entry.id} className="border-b border-gray-100 hover:bg-slate-50/40 text-sm">
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
                        <TableCell className="max-w-[240px] truncate font-medium text-gray-700">
                          {entry.details}
                        </TableCell>
                        <TableCell className="font-bold text-gray-900">
                          Rs. {entry.amount.toLocaleString()}
                        </TableCell>
                        <TableCell>{getStatusBadge(entry)}</TableCell>
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

// Small router stub to avoid typescript compilation error (since we imported useRouter from next/navigation inside SiteHeader)
import { useRouter as useNextRouter } from "next/navigation";
const router = {
  push: (url: string) => {
    if (typeof window !== "undefined") window.location.href = url;
  }
};
