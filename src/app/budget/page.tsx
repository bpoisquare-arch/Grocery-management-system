"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useStore } from "@/lib/store";
import { DashboardLayout } from "@/components/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
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
import { toast } from "sonner";
import { Entity } from "@/lib/mockData";
import { cn } from "@/lib/utils";
import { CoinsIcon, HistoryIcon, PencilIcon, Trash2Icon, RefreshCwIcon, PlusCircleIcon, CheckCircle2Icon, TrendingDownIcon, TrendingUpIcon } from "lucide-react";

export default function BudgetPage() {
  const {
    currentUser,
    budgets,
    groceryEntries,
    setMonthlyBudget,
    deleteMonthlyBudget,
    clearAllBudgets,
    calculateEntityBudgetChain,
    getEntityBudgetBreakdown,
  } = useStore();
  const router = useRouter();

  // Form States
  const [formEntity, setFormEntity] = useState<Entity>("Lahore");
  const [formMonth, setFormMonth] = useState("August");
  const [formYear, setFormYear] = useState("2026");
  const [amountStr, setAmountStr] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Role Access Check
  useEffect(() => {
    if (currentUser && currentUser.role !== "ADMIN") {
      toast.error("Access denied. Admin permissions required.");
      router.push("/dashboard");
    }
  }, [currentUser, router]);

  // Check if budget already exists for selected entity + month + year
  const existingBudget = budgets.find(
    (b) => b.entity === formEntity && b.month.toLowerCase() === formMonth.toLowerCase() && b.year === parseInt(formYear, 10)
  );

  // Load existing budget value in form whenever entity/month/year changes
  useEffect(() => {
    if (existingBudget) {
      setAmountStr(existingBudget.amount.toString());
    } else {
      setAmountStr("");
    }
  }, [formEntity, formMonth, formYear, existingBudget]);

  if (!currentUser || currentUser.role !== "ADMIN") {
    return (
      <div className="flex h-screen w-screen flex-col items-center justify-center bg-slate-50 p-6">
        <div className="w-full max-w-md space-y-4">
          <Skeleton className="h-12 w-12 rounded-lg bg-gray-200" />
          <Skeleton className="h-6 w-3/4 bg-gray-200" />
        </div>
      </div>
    );
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const amount = parseFloat(amountStr);
    const year = parseInt(formYear, 10);

    if (isNaN(amount) || amount <= 0) {
      toast.error("Please enter a valid positive budget amount.");
      return;
    }
    if (isNaN(year) || year < 2000 || year > 2100) {
      toast.error("Please enter a valid year (2000 - 2100).");
      return;
    }

    setIsSubmitting(true);
    try {
      await setMonthlyBudget(formEntity, formMonth, year, amount);
      const actionText = existingBudget ? "updated to" : "set to";
      toast.success(`Budget for ${formEntity} (${formMonth} ${year}) ${actionText} Rs. ${amount.toLocaleString()} successfully.`);
    } catch (err) {
      toast.error("Failed to save budget.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleQuickEdit = (entity: Entity, month: string, year: number, baseAmount: number) => {
    setFormEntity(entity);
    setFormMonth(month);
    setFormYear(year.toString());
    setAmountStr(baseAmount.toString());
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleDeleteBudget = async (entity: Entity, month: string, year: number) => {
    if (confirm(`Are you sure you want to remove the budget for ${entity} (${month} ${year})?`)) {
      await deleteMonthlyBudget(entity, month, year);
      toast.success(`Budget for ${entity} (${month} ${year}) removed.`);
      if (formEntity === entity && formMonth === month && formYear === year.toString()) {
        setAmountStr("");
      }
    }
  };

  const handleClearAll = async () => {
    if (confirm("Are you sure you want to clear all budget history across all entities? This will start with a fresh budget list.")) {
      await clearAllBudgets();
      setAmountStr("");
      toast.success("All budget history has been cleared.");
    }
  };

  // Compile history items across all entities with full sequential rollover calculations
  const allEntities: Entity[] = ["Lahore", "Multan", "ISquareBPO"];
  const allChains = allEntities.flatMap((ent) => calculateEntityBudgetChain(ent));

  // Sort history items: year desc, month desc, entity
  const sortedHistory = [...allChains].sort((x, y) => {
    if (x.year !== y.year) return y.year - x.year;
    const months = [
      "January", "February", "March", "April", "May", "June",
      "July", "August", "September", "October", "November", "December"
    ];
    const monthDiff = months.indexOf(y.month) - months.indexOf(x.month);
    if (monthDiff !== 0) return monthDiff;
    return x.entity.localeCompare(y.entity);
  });

  // Live Rollover Preview for Form
  const parsedFormYear = parseInt(formYear, 10) || 2026;
  const formBreakdown = getEntityBudgetBreakdown(formEntity, formMonth, parsedFormYear);
  const inputBaseAmount = parseFloat(amountStr) || 0;
  const liveEffectiveBudget = inputBaseAmount + formBreakdown.carryoverBalance;

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header Title */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-gray-900">Monthly Budget Management</h1>
            <p className="text-sm text-gray-500 font-medium">
              Set, update, and track monthly grocery budgets with automated deficit / surplus balance rollover across months.
            </p>
          </div>

          {budgets.length > 0 && (
            <Button
              variant="outline"
              size="sm"
              onClick={handleClearAll}
              className="text-xs text-red-600 border-red-200 hover:bg-red-50 hover:text-red-700 h-9 shrink-0 cursor-pointer"
            >
              <Trash2Icon className="size-3.5 mr-1.5" />
              Clear Budget History
            </Button>
          )}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Budget Setting / Update Form */}
          <Card className="border border-gray-200 bg-white shadow-2xs lg:col-span-4">
            <CardHeader>
              <CardTitle className="text-base font-bold text-gray-900 flex items-center gap-1.5">
                <CoinsIcon className="size-4 text-emerald-600" />
                {existingBudget ? "Update Monthly Budget" : "Set Monthly Budget"}
              </CardTitle>
              <CardDescription className="text-xs text-gray-500 font-medium">
                {existingBudget
                  ? `Modify the existing allocated budget for ${formEntity} (${formMonth} ${formYear}).`
                  : `Allocate a new budget limit for ${formEntity} (${formMonth} ${formYear}).`}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-4">
                {/* Existing budget banner if found */}
                {existingBudget && (
                  <div className="flex items-center gap-2 p-2.5 bg-emerald-50 border border-emerald-200/70 rounded-lg text-xs text-emerald-800">
                    <CheckCircle2Icon className="size-4 text-emerald-600 shrink-0" />
                    <span>
                      Current Base Budget: <strong>Rs. {existingBudget.amount.toLocaleString()}</strong>.
                    </span>
                  </div>
                )}

                {/* Entity */}
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="entity" className="text-xs font-semibold text-gray-700">Entity</Label>
                  <Select
                    value={formEntity}
                    onValueChange={(val) => setFormEntity((val as Entity) || "Lahore")}
                  >
                    <SelectTrigger id="entity" className="h-10 border-gray-200 text-sm font-semibold bg-white">
                      <SelectValue placeholder="Select Entity" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Lahore">Lahore Entity</SelectItem>
                      <SelectItem value="Multan">Multan Entity</SelectItem>
                      <SelectItem value="ISquareBPO">ISquareBPO Entity</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Month */}
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="month" className="text-xs font-semibold text-gray-700">Month</Label>
                  <Select value={formMonth} onValueChange={(val) => setFormMonth(val || "August")}>
                    <SelectTrigger id="month" className="h-10 border-gray-200 text-sm font-semibold bg-white">
                      <SelectValue placeholder="Select Month" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="January">January</SelectItem>
                      <SelectItem value="February">February</SelectItem>
                      <SelectItem value="March">March</SelectItem>
                      <SelectItem value="April">April</SelectItem>
                      <SelectItem value="May">May</SelectItem>
                      <SelectItem value="June">June</SelectItem>
                      <SelectItem value="July">July</SelectItem>
                      <SelectItem value="August">August</SelectItem>
                      <SelectItem value="September">September</SelectItem>
                      <SelectItem value="October">October</SelectItem>
                      <SelectItem value="November">November</SelectItem>
                      <SelectItem value="December">December</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Year */}
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="year" className="text-xs font-semibold text-gray-700">Year</Label>
                  <Input
                    id="year"
                    type="number"
                    value={formYear}
                    onChange={(e) => setFormYear(e.target.value)}
                    placeholder="2026"
                    className="h-10 border-gray-200 focus:border-emerald-500 focus:ring-emerald-500 bg-white"
                    required
                  />
                </div>

                {/* Amount */}
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="budgetAmount" className="text-xs font-semibold text-gray-700">
                    {existingBudget ? "Base Monthly Budget Amount (Admin Assigned)" : "Base Monthly Budget Amount"}
                  </Label>
                  <div className="relative">
                    <span className="absolute left-3 top-2.5 text-sm text-gray-400 font-semibold">Rs.</span>
                    <Input
                      id="budgetAmount"
                      type="number"
                      value={amountStr}
                      onChange={(e) => setAmountStr(e.target.value)}
                      placeholder="e.g. 50000"
                      className="pl-10 h-10 border-gray-200 focus:border-emerald-500 focus:ring-emerald-500 bg-white font-semibold"
                      required
                    />
                  </div>
                </div>

                {/* Live Rollover Breakdown Card */}
                {formBreakdown.carryoverBalance !== 0 && (
                  <div
                    className={cn(
                      "p-3 rounded-xl border text-xs space-y-2",
                      formBreakdown.carryoverBalance < 0
                        ? "bg-red-50/70 border-red-200 text-red-900"
                        : "bg-emerald-50/70 border-emerald-200 text-emerald-900"
                    )}
                  >
                    <div className="flex items-center justify-between font-bold">
                      <span className="flex items-center gap-1.5">
                        {formBreakdown.carryoverBalance < 0 ? (
                          <TrendingDownIcon className="size-4 text-red-600" />
                        ) : (
                          <TrendingUpIcon className="size-4 text-emerald-600" />
                        )}
                        {formBreakdown.carryoverBalance < 0 ? "Previous Month Deficit" : "Previous Month Savings"}
                      </span>
                      <span className={formBreakdown.carryoverBalance < 0 ? "text-red-600 font-extrabold" : "text-emerald-700 font-extrabold"}>
                        {formBreakdown.carryoverBalance < 0 ? "-Rs. " : "+Rs. "}
                        {Math.abs(formBreakdown.carryoverBalance).toLocaleString()}
                      </span>
                    </div>

                    <div className="text-[11px] text-gray-600 leading-snug">
                      Carried forward from <strong>{formBreakdown.previousPeriodLabel}</strong>.
                      {formBreakdown.carryoverBalance < 0
                        ? " This deficit will be deducted from the new budget."
                        : " This surplus will be added to the new budget."}
                    </div>

                    <div className="pt-2 border-t border-gray-200 flex items-center justify-between font-extrabold text-xs">
                      <span>Actual Spendable Budget:</span>
                      <span className={cn(liveEffectiveBudget < 0 ? "text-red-700" : "text-emerald-700", "text-sm")}>
                        {liveEffectiveBudget < 0 ? "-Rs. " : "Rs. "}
                        {Math.abs(liveEffectiveBudget).toLocaleString()}
                      </span>
                    </div>
                  </div>
                )}

                {/* Submit button */}
                <Button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full h-10 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold shadow-xs transition-colors cursor-pointer"
                >
                  {isSubmitting ? (
                    "Saving..."
                  ) : existingBudget ? (
                    <div className="flex items-center justify-center gap-2">
                      <RefreshCwIcon className="size-4" />
                      <span>Update Monthly Budget</span>
                    </div>
                  ) : (
                    <div className="flex items-center justify-center gap-2">
                      <PlusCircleIcon className="size-4" />
                      <span>Set Monthly Budget</span>
                    </div>
                  )}
                </Button>
              </form>
            </CardContent>
          </Card>

          {/* Budget History Table */}
          <Card className="border border-gray-200 bg-white shadow-2xs lg:col-span-8">
            <CardHeader className="pb-3 border-b border-gray-100">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-base font-bold text-gray-900 flex items-center gap-1.5">
                    <HistoryIcon className="size-4 text-emerald-600" />
                    Budget History & Tracking
                  </CardTitle>
                  <CardDescription className="text-xs text-gray-500 font-medium mt-0.5">
                    Live summary of allocated budgets, rollover adjustments, expenses, and net remaining.
                  </CardDescription>
                </div>
                {sortedHistory.length > 0 && (
                  <Badge variant="outline" className="bg-slate-50 text-slate-600 border-slate-200 text-[10px] font-semibold">
                    {sortedHistory.length} {sortedHistory.length === 1 ? "Period" : "Periods"}
                  </Badge>
                )}
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <div className="w-full">
                <Table>
                  <TableHeader className="bg-slate-50/75">
                    <TableRow className="border-b border-gray-200">
                      <TableHead className="text-[11px] font-bold text-gray-500 py-3 px-3">Branch & Month</TableHead>
                      <TableHead className="text-[11px] font-bold text-gray-500 py-3 px-3">Allocated Budget</TableHead>
                      <TableHead className="text-[11px] font-bold text-gray-500 py-3 px-3">Total Spent</TableHead>
                      <TableHead className="text-[11px] font-bold text-gray-500 py-3 px-3">Net Remaining</TableHead>
                      <TableHead className="text-right text-[11px] font-bold text-gray-500 py-3 px-3">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {sortedHistory.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={5} className="h-32 text-center text-gray-400 text-sm">
                          <div className="flex flex-col items-center justify-center gap-1.5">
                            <CoinsIcon className="size-6 text-gray-300" />
                            <span>No budgets assigned yet.</span>
                            <span className="text-xs text-gray-400">Use the form on the left to allocate a monthly budget.</span>
                          </div>
                        </TableCell>
                      </TableRow>
                    ) : (
                      sortedHistory.map((item, idx) => (
                        <TableRow key={idx} className="border-b border-gray-100 hover:bg-slate-50/50">
                          {/* Branch & Month */}
                          <TableCell className="py-3 px-3 align-top">
                            <span className="font-bold text-gray-900 block text-xs">
                              {item.entity}
                            </span>
                            <span className="text-[11px] text-gray-500 font-medium">
                              {item.month} {item.year}
                            </span>
                          </TableCell>

                          {/* Allocated & Rollover Details */}
                          <TableCell className="py-3 px-3 align-top">
                            <span className="font-extrabold text-gray-900 text-xs block">
                              Rs. {item.effectiveBudget.toLocaleString()}
                            </span>
                            {item.carryoverBalance !== 0 ? (
                              <div className="text-[10px] mt-0.5 leading-tight">
                                <span className="text-gray-400">Base: Rs. {item.baseBudget.toLocaleString()}</span>
                                <span className={cn("block font-bold mt-0.5", item.carryoverBalance < 0 ? "text-red-600" : "text-emerald-600")}>
                                  {item.carryoverBalance < 0 ? "-Rs. " : "+Rs. "}{Math.abs(item.carryoverBalance).toLocaleString()} ({item.carryoverBalance < 0 ? "Deficit" : "Surplus"})
                                </span>
                              </div>
                            ) : (
                              <span className="text-[10px] text-gray-400 block mt-0.5">
                                Base: Rs. {item.baseBudget.toLocaleString()}
                              </span>
                            )}
                          </TableCell>

                          {/* Total Spent */}
                          <TableCell className="py-3 px-3 align-top">
                            <span className="font-bold text-emerald-700 text-xs block">
                              Rs. {item.totalSpent.toLocaleString()}
                            </span>
                            <span className="text-[10px] text-gray-400 font-medium block mt-0.5">
                              {item.effectiveBudget > 0 ? `${Math.round((item.totalSpent / item.effectiveBudget) * 100)}% used` : "0% used"}
                            </span>
                          </TableCell>

                          {/* Net Remaining & Status */}
                          <TableCell className="py-3 px-3 align-top">
                            <span className={cn("font-black text-xs block", item.isOverspent ? "text-red-600" : "text-emerald-800")}>
                              {item.isOverspent ? "-" : ""}Rs. {Math.abs(item.remainingBalance).toLocaleString()}
                            </span>
                            <div className="mt-1">
                              {item.isOverspent ? (
                                <Badge className="bg-red-50 text-red-700 hover:bg-red-50 border border-red-100 font-bold text-[9px] px-1.5 py-0 h-4 uppercase">
                                  Over Budget
                                </Badge>
                              ) : item.carryoverBalance < 0 ? (
                                <Badge className="bg-amber-50 text-amber-700 hover:bg-amber-50 border border-amber-200 font-bold text-[9px] px-1.5 py-0 h-4 uppercase">
                                  Adjusted
                                </Badge>
                              ) : (
                                <Badge className="bg-emerald-50 text-emerald-700 hover:bg-emerald-50 border border-emerald-100 font-bold text-[9px] px-1.5 py-0 h-4 uppercase">
                                  Healthy
                                </Badge>
                              )}
                            </div>
                          </TableCell>

                          {/* Actions */}
                          <TableCell className="py-3 px-3 text-right align-top">
                            <div className="flex items-center justify-end gap-1">
                              <Button
                                variant="ghost"
                                size="icon-xs"
                                onClick={() => handleQuickEdit(item.entity, item.month, item.year, item.baseBudget)}
                                className="h-7 w-7 text-emerald-700 hover:bg-emerald-50 rounded"
                                title="Edit / Update base budget"
                              >
                                <PencilIcon className="size-3.5" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon-xs"
                                onClick={() => handleDeleteBudget(item.entity, item.month, item.year)}
                                className="h-7 w-7 text-red-600 hover:bg-red-50 rounded"
                                title="Delete this budget"
                              >
                                <Trash2Icon className="size-3.5" />
                              </Button>
                            </div>
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
      </div>
    </DashboardLayout>
  );
}
