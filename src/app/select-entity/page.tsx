"use client";

import React, { useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import { useStore } from "@/lib/store";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Building2Icon, ArrowRightIcon, ShoppingBagIcon, LogOutIcon, ArrowLeftIcon, CalendarIcon } from "lucide-react";
import { toast } from "sonner";
import { Entity } from "@/lib/mockData";

const MONTHS_ORDER = [
  'january', 'february', 'march', 'april', 'may', 'june',
  'july', 'august', 'september', 'october', 'november', 'december'
];

export default function SelectEntityPage() {
  const {
    currentUser,
    budgets,
    groceryEntries,
    currentMonth,
    currentYear,
    setCurrentMonth,
    setCurrentYear,
    switchEntity,
    logout,
    getEntityBudgetBreakdown,
  } = useStore();
  const router = useRouter();

  // Access Control: Redirect if not Admin or not logged in
  useEffect(() => {
    if (!currentUser) {
      router.push("/login");
    } else if (currentUser.role !== "ADMIN") {
      // Normal users go straight to dashboard
      router.push("/dashboard");
    }
  }, [currentUser, router]);

  // Helper to dynamically calculate overview stats for the latest allocated budget month
  const getLatestEntityBudgetInfo = (entity: Entity) => {
    const entityBudgets = budgets.filter((b) => b.entity === entity && b.amount > 0);

    let targetMonth = currentMonth;
    let targetYear = currentYear;

    if (entityBudgets.length > 0) {
      // Sort chronologically descending (latest year and month first)
      const sorted = [...entityBudgets].sort((a, b) => {
        if (a.year !== b.year) return b.year - a.year;
        return MONTHS_ORDER.indexOf(b.month.toLowerCase()) - MONTHS_ORDER.indexOf(a.month.toLowerCase());
      });
      targetMonth = sorted[0].month;
      targetYear = sorted[0].year;
    }

    const breakdown = getEntityBudgetBreakdown(entity, targetMonth, targetYear);
    const budget = breakdown.effectiveBudget;
    const spent = breakdown.totalSpent;
    const remaining = breakdown.remainingBalance;
    const pct = budget > 0 ? Math.min(100, Math.round((spent / budget) * 100)) : 0;

    return {
      month: targetMonth,
      year: targetYear,
      budget,
      spent,
      remaining,
      pct,
      hasAllocatedBudget: entityBudgets.length > 0,
    };
  };

  const lahoreInfo = useMemo(
    () => getLatestEntityBudgetInfo("Lahore"),
    [budgets, groceryEntries, currentMonth, currentYear, getEntityBudgetBreakdown]
  );

  const multanInfo = useMemo(
    () => getLatestEntityBudgetInfo("Multan"),
    [budgets, groceryEntries, currentMonth, currentYear, getEntityBudgetBreakdown]
  );

  const isquareInfo = useMemo(
    () => getLatestEntityBudgetInfo("ISquareBPO"),
    [budgets, groceryEntries, currentMonth, currentYear, getEntityBudgetBreakdown]
  );

  const handleSelectEntity = (entity: Entity, targetMonth: string, targetYear: number) => {
    switchEntity(entity);
    if (targetMonth) setCurrentMonth(targetMonth);
    if (targetYear) setCurrentYear(targetYear);
    toast.success(`Active Entity switched to ${entity} (${targetMonth} ${targetYear}).`);
    router.push("/dashboard");
  };

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

  return (
    <div className="min-h-screen bg-[#F8FAFC] flex flex-col justify-between py-12 px-6 sm:px-12">
      {/* Top Bar / Logout */}
      <div className="max-w-5xl w-full mx-auto flex justify-between items-center mb-10">
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => router.push("/select-module")}
            className="h-8 px-2 text-xs font-semibold text-gray-600 hover:text-emerald-700 hover:bg-emerald-50 gap-1 cursor-pointer"
          >
            <ArrowLeftIcon className="size-3.5" />
            <span>Modules</span>
          </Button>
          <div className="h-4 w-px bg-gray-200" />
          <div className="flex items-center gap-2">
            <div className="flex size-8 items-center justify-center rounded-lg bg-emerald-600 text-white shadow-2xs">
              <ShoppingBagIcon className="size-4" />
            </div>
            <span className="text-sm font-bold text-gray-900">Grocery Expense Manager</span>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <div className="text-right hidden sm:block">
            <div className="text-xs font-bold text-gray-900">{currentUser.name}</div>
            <div className="text-[10px] text-gray-500 font-semibold">{currentUser.email}</div>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={logout}
            className="h-8 border-gray-200 text-xs font-semibold text-red-600 hover:bg-red-50 hover:text-red-700 cursor-pointer"
          >
            <LogOutIcon className="size-3.5 mr-1" />
            Log out
          </Button>
        </div>
      </div>

      {/* Main Panel */}
      <div className="max-w-5xl w-full mx-auto space-y-8 flex-1 flex flex-col justify-center">
        <div className="text-center space-y-2">
          <h1 className="text-3xl font-extrabold text-gray-900 tracking-tight">Select an Entity</h1>
          <p className="text-sm text-gray-500 font-medium max-w-md mx-auto">
            Choose an entity to manage its monthly grocery expenses, set allocated budgets, and track balances.
          </p>
        </div>

        {/* Entity Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* LAHORE CARD */}
          <Card className="border border-gray-200 hover:border-emerald-500/50 bg-white shadow-xs hover:shadow-md transition-all duration-200 cursor-pointer flex flex-col justify-between">
            <CardHeader className="pb-4">
              <div className="flex justify-between items-start">
                <div className="size-12 rounded-xl bg-emerald-50 flex items-center justify-center text-emerald-600 shadow-2xs">
                  <Building2Icon className="size-6" />
                </div>
                <div className="flex flex-col items-end gap-1">
                  <Badge className="bg-emerald-50 text-emerald-700 hover:bg-emerald-50 border border-emerald-100 font-semibold text-[11px]">
                    Lahore Office
                  </Badge>
                  <span className="text-[10px] font-bold text-emerald-800 bg-emerald-100/70 px-2 py-0.5 rounded-md flex items-center gap-1">
                    <CalendarIcon className="size-3 text-emerald-600" />
                    {lahoreInfo.month} {lahoreInfo.year}
                  </span>
                </div>
              </div>
              <CardTitle className="text-xl font-bold text-gray-900 mt-4">LAHORE</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Financial metrics */}
              <div className="grid grid-cols-3 gap-2 border-y border-gray-100 py-3 text-center">
                <div>
                  <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">Budget</span>
                  <span className="text-xs sm:text-sm font-bold text-gray-900">Rs. {lahoreInfo.budget.toLocaleString()}</span>
                </div>
                <div>
                  <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">Spending</span>
                  <span className="text-xs sm:text-sm font-bold text-emerald-600">Rs. {lahoreInfo.spent.toLocaleString()}</span>
                </div>
                <div>
                  <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">Remaining</span>
                  <span className={`text-xs sm:text-sm font-bold ${lahoreInfo.remaining < 0 ? 'text-red-600' : 'text-gray-900'}`}>
                    Rs. {lahoreInfo.remaining.toLocaleString()}
                  </span>
                </div>
              </div>

              {/* Progress bar */}
              <div className="space-y-1">
                <div className="flex justify-between text-xs font-semibold text-gray-500">
                  <span>Usage</span>
                  <span>{lahoreInfo.pct}%</span>
                </div>
                <div className="h-2 w-full bg-gray-100 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-emerald-600 rounded-full transition-all duration-300"
                    style={{ width: `${lahoreInfo.pct}%` }}
                  />
                </div>
              </div>
            </CardContent>
            <CardFooter className="pt-2">
              <Button
                onClick={() => handleSelectEntity("Lahore", lahoreInfo.month, lahoreInfo.year)}
                className="w-full h-10 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold transition-colors flex items-center justify-center gap-2 group cursor-pointer"
              >
                Manage Lahore
                <ArrowRightIcon className="size-4 group-hover:translate-x-1 transition-transform" />
              </Button>
            </CardFooter>
          </Card>

          {/* MULTAN CARD */}
          <Card className="border border-gray-200 hover:border-emerald-500/50 bg-white shadow-xs hover:shadow-md transition-all duration-200 cursor-pointer flex flex-col justify-between">
            <CardHeader className="pb-4">
              <div className="flex justify-between items-start">
                <div className="size-12 rounded-xl bg-emerald-50 flex items-center justify-center text-emerald-600 shadow-2xs">
                  <Building2Icon className="size-6" />
                </div>
                <div className="flex flex-col items-end gap-1">
                  <Badge className="bg-emerald-50 text-emerald-700 hover:bg-emerald-50 border border-emerald-100 font-semibold text-[11px]">
                    Multan Office
                  </Badge>
                  <span className="text-[10px] font-bold text-emerald-800 bg-emerald-100/70 px-2 py-0.5 rounded-md flex items-center gap-1">
                    <CalendarIcon className="size-3 text-emerald-600" />
                    {multanInfo.month} {multanInfo.year}
                  </span>
                </div>
              </div>
              <CardTitle className="text-xl font-bold text-gray-900 mt-4">MULTAN</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Financial metrics */}
              <div className="grid grid-cols-3 gap-2 border-y border-gray-100 py-3 text-center">
                <div>
                  <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">Budget</span>
                  <span className="text-xs sm:text-sm font-bold text-gray-900">Rs. {multanInfo.budget.toLocaleString()}</span>
                </div>
                <div>
                  <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">Spending</span>
                  <span className="text-xs sm:text-sm font-bold text-emerald-600">Rs. {multanInfo.spent.toLocaleString()}</span>
                </div>
                <div>
                  <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">Remaining</span>
                  <span className={`text-xs sm:text-sm font-bold ${multanInfo.remaining < 0 ? 'text-red-600' : 'text-gray-900'}`}>
                    Rs. {multanInfo.remaining.toLocaleString()}
                  </span>
                </div>
              </div>

              {/* Progress bar */}
              <div className="space-y-1">
                <div className="flex justify-between text-xs font-semibold text-gray-500">
                  <span>Usage</span>
                  <span>{multanInfo.pct}%</span>
                </div>
                <div className="h-2 w-full bg-gray-100 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-emerald-600 rounded-full transition-all duration-300"
                    style={{ width: `${multanInfo.pct}%` }}
                  />
                </div>
              </div>
            </CardContent>
            <CardFooter className="pt-2">
              <Button
                onClick={() => handleSelectEntity("Multan", multanInfo.month, multanInfo.year)}
                className="w-full h-10 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold transition-colors flex items-center justify-center gap-2 group cursor-pointer"
              >
                Manage Multan
                <ArrowRightIcon className="size-4 group-hover:translate-x-1 transition-transform" />
              </Button>
            </CardFooter>
          </Card>

          {/* ISQUAREBPO CARD */}
          <Card className="border border-gray-200 hover:border-emerald-500/50 bg-white shadow-xs hover:shadow-md transition-all duration-200 cursor-pointer flex flex-col justify-between">
            <CardHeader className="pb-4">
              <div className="flex justify-between items-start">
                <div className="size-12 rounded-xl bg-emerald-50 flex items-center justify-center text-emerald-600 shadow-2xs">
                  <Building2Icon className="size-6" />
                </div>
                <div className="flex flex-col items-end gap-1">
                  <Badge className="bg-emerald-50 text-emerald-700 hover:bg-emerald-50 border border-emerald-100 font-semibold text-[11px]">
                    ISquareBPO Office
                  </Badge>
                  <span className="text-[10px] font-bold text-emerald-800 bg-emerald-100/70 px-2 py-0.5 rounded-md flex items-center gap-1">
                    <CalendarIcon className="size-3 text-emerald-600" />
                    {isquareInfo.month} {isquareInfo.year}
                  </span>
                </div>
              </div>
              <CardTitle className="text-xl font-bold text-gray-900 mt-4">ISQUAREBPO</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Financial metrics */}
              <div className="grid grid-cols-3 gap-2 border-y border-gray-100 py-3 text-center">
                <div>
                  <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">Budget</span>
                  <span className="text-xs sm:text-sm font-bold text-gray-900">Rs. {isquareInfo.budget.toLocaleString()}</span>
                </div>
                <div>
                  <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">Spending</span>
                  <span className="text-xs sm:text-sm font-bold text-emerald-600">Rs. {isquareInfo.spent.toLocaleString()}</span>
                </div>
                <div>
                  <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">Remaining</span>
                  <span className={`text-xs sm:text-sm font-bold ${isquareInfo.remaining < 0 ? 'text-red-600' : 'text-gray-900'}`}>
                    Rs. {isquareInfo.remaining.toLocaleString()}
                  </span>
                </div>
              </div>

              {/* Progress bar */}
              <div className="space-y-1">
                <div className="flex justify-between text-xs font-semibold text-gray-500">
                  <span>Usage</span>
                  <span>{isquareInfo.pct}%</span>
                </div>
                <div className="h-2 w-full bg-gray-100 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-emerald-600 rounded-full transition-all duration-300"
                    style={{ width: `${isquareInfo.pct}%` }}
                  />
                </div>
              </div>
            </CardContent>
            <CardFooter className="pt-2">
              <Button
                onClick={() => handleSelectEntity("ISquareBPO", isquareInfo.month, isquareInfo.year)}
                className="w-full h-10 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold transition-colors flex items-center justify-center gap-2 group cursor-pointer"
              >
                Manage ISquareBPO
                <ArrowRightIcon className="size-4 group-hover:translate-x-1 transition-transform" />
              </Button>
            </CardFooter>
          </Card>
        </div>
      </div>

      <div className="max-w-5xl w-full mx-auto text-center text-xs font-semibold text-gray-400 mt-10">
        Overview displays the latest allocated budget month for each entity. You can view all previous months inside the dashboard.
      </div>
    </div>
  );
}
