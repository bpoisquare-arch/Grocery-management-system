"use client";

import React, { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useStore } from "@/lib/store";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Building2Icon, ArrowRightIcon, CoinsIcon, ShoppingBagIcon, LogOutIcon } from "lucide-react";
import { toast } from "sonner";
import { Entity } from "@/lib/mockData";

export default function SelectEntityPage() {
  const { currentUser, budgets, groceryEntries, currentMonth, currentYear, switchEntity, logout, getEntityBudget } = useStore();
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

  // Calculate stats for Lahore
  const lahoreBudget = getEntityBudget("Lahore", currentMonth, currentYear);
  const lahoreSpent = groceryEntries
    .filter((e) => e.entity === "Lahore")
    .reduce((sum, e) => sum + e.amount, 0);
  const lahoreRemaining = lahoreBudget - lahoreSpent;
  const lahorePct = lahoreBudget > 0 ? Math.round((lahoreSpent / lahoreBudget) * 100) : 0;

  // Calculate stats for Multan
  const multanBudget = getEntityBudget("Multan", currentMonth, currentYear);
  const multanSpent = groceryEntries
    .filter((e) => e.entity === "Multan")
    .reduce((sum, e) => sum + e.amount, 0);
  const multanRemaining = multanBudget - multanSpent;
  const multanPct = multanBudget > 0 ? Math.round((multanSpent / multanBudget) * 100) : 0;

  const handleSelectEntity = (entity: Entity) => {
    switchEntity(entity);
    toast.success(`Active Entity switched to ${entity}.`);
    router.push("/dashboard");
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC] flex flex-col justify-between py-12 px-6 sm:px-12">
      {/* Top Bar / Logout */}
      <div className="max-w-4xl w-full mx-auto flex justify-between items-center mb-10">
        <div className="flex items-center gap-2">
          <div className="flex size-8 items-center justify-center rounded-lg bg-emerald-600 text-white">
            <ShoppingBagIcon className="size-5" />
          </div>
          <span className="text-sm font-bold text-gray-900">Grocery Expense Manager</span>
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
            className="h-8 border-gray-200 text-xs font-semibold text-red-600 hover:bg-red-50 hover:text-red-700"
          >
            <LogOutIcon className="size-3.5 mr-1" />
            Log out
          </Button>
        </div>
      </div>

      {/* Main Panel */}
      <div className="max-w-4xl w-full mx-auto space-y-8 flex-1 flex flex-col justify-center">
        <div className="text-center space-y-2">
          <h1 className="text-3xl font-extrabold text-gray-900 tracking-tight">Select an Entity</h1>
          <p className="text-sm text-gray-500 font-medium max-w-md mx-auto">
            Choose an entity to manage its monthly grocery expenses, set allocated budgets, and track balances.
          </p>
        </div>

        {/* Entity Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* LAHORE CARD */}
          <Card className="border border-gray-200 hover:border-emerald-500/50 bg-white shadow-xs hover:shadow-md transition-all duration-200 cursor-pointer flex flex-col justify-between">
            <CardHeader className="pb-4">
              <div className="flex justify-between items-start">
                <div className="size-12 rounded-xl bg-emerald-50 flex items-center justify-center text-emerald-600 shadow-2xs">
                  <Building2Icon className="size-6" />
                </div>
                <Badge className="bg-emerald-50 text-emerald-700 hover:bg-emerald-50 border border-emerald-100 font-semibold">
                  Lahore Office
                </Badge>
              </div>
              <CardTitle className="text-xl font-bold text-gray-900 mt-4">LAHORE</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Financial metrics */}
              <div className="grid grid-cols-3 gap-2 border-y border-gray-100 py-3 text-center">
                <div>
                  <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">Budget</span>
                  <span className="text-sm font-bold text-gray-900">Rs. {lahoreBudget.toLocaleString()}</span>
                </div>
                <div>
                  <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">Spending</span>
                  <span className="text-sm font-bold text-emerald-600">Rs. {lahoreSpent.toLocaleString()}</span>
                </div>
                <div>
                  <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">Remaining</span>
                  <span className={`text-sm font-bold ${lahoreRemaining < 0 ? 'text-red-600' : 'text-gray-900'}`}>
                    Rs. {lahoreRemaining.toLocaleString()}
                  </span>
                </div>
              </div>

              {/* Progress bar */}
              <div className="space-y-1">
                <div className="flex justify-between text-xs font-semibold text-gray-500">
                  <span>Usage</span>
                  <span>{lahorePct}%</span>
                </div>
                <div className="h-2 w-full bg-gray-100 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-emerald-600 rounded-full transition-all duration-300"
                    style={{ width: `${lahorePct}%` }}
                  />
                </div>
              </div>
            </CardContent>
            <CardFooter className="pt-2">
              <Button
                onClick={() => handleSelectEntity("Lahore")}
                className="w-full h-10 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold transition-colors flex items-center justify-center gap-2 group"
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
                <Badge className="bg-emerald-50 text-emerald-700 hover:bg-emerald-50 border border-emerald-100 font-semibold">
                  Multan Office
                </Badge>
              </div>
              <CardTitle className="text-xl font-bold text-gray-900 mt-4">MULTAN</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Financial metrics */}
              <div className="grid grid-cols-3 gap-2 border-y border-gray-100 py-3 text-center">
                <div>
                  <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">Budget</span>
                  <span className="text-sm font-bold text-gray-900">Rs. {multanBudget.toLocaleString()}</span>
                </div>
                <div>
                  <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">Spending</span>
                  <span className="text-sm font-bold text-emerald-600">Rs. {multanSpent.toLocaleString()}</span>
                </div>
                <div>
                  <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">Remaining</span>
                  <span className={`text-sm font-bold ${multanRemaining < 0 ? 'text-red-600' : 'text-gray-900'}`}>
                    Rs. {multanRemaining.toLocaleString()}
                  </span>
                </div>
              </div>

              {/* Progress bar */}
              <div className="space-y-1">
                <div className="flex justify-between text-xs font-semibold text-gray-500">
                  <span>Usage</span>
                  <span>{multanPct}%</span>
                </div>
                <div className="h-2 w-full bg-gray-100 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-emerald-600 rounded-full transition-all duration-300"
                    style={{ width: `${multanPct}%` }}
                  />
                </div>
              </div>
            </CardContent>
            <CardFooter className="pt-2">
              <Button
                onClick={() => handleSelectEntity("Multan")}
                className="w-full h-10 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold transition-colors flex items-center justify-center gap-2 group"
              >
                Manage Multan
                <ArrowRightIcon className="size-4 group-hover:translate-x-1 transition-transform" />
              </Button>
            </CardFooter>
          </Card>
        </div>
      </div>

      <div className="max-w-4xl w-full mx-auto text-center text-xs font-semibold text-gray-400 mt-10">
        Active Testing Month: {currentMonth} {currentYear} • Switch Active month using the Header in the main dashboard.
      </div>
    </div>
  );
}
