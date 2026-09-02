"use client";

import React, { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useStore } from "@/lib/store";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Building2Icon,
  ArrowRightIcon,
  BadgePercentIcon,
  LogOutIcon,
  ArrowLeftIcon,
  UsersIcon,
  TrendingUpIcon,
  ShieldCheckIcon,
} from "lucide-react";
import { toast } from "sonner";
import { Entity } from "@/lib/mockData";

export default function CommissionSelectEntityPage() {
  const { currentUser, switchEntity, logout, currentMonth, currentYear } = useStore();
  const router = useRouter();

  // Access Control: Redirect if not Admin or not logged in
  useEffect(() => {
    if (!currentUser) {
      router.push("/login");
    } else if (currentUser.role !== "ADMIN") {
      // Normal users go straight to commission dashboard
      router.push("/commissions/dashboard");
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

  const handleSelectCommissionEntity = (entity: Entity) => {
    switchEntity(entity);
    toast.success(`Active Commission Entity switched to ${entity}.`);
    router.push("/commissions/dashboard");
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC] flex flex-col justify-between py-12 px-6 sm:px-12">
      {/* Top Bar / Navigation */}
      <div className="max-w-4xl w-full mx-auto flex justify-between items-center mb-10">
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
              <BadgePercentIcon className="size-4" />
            </div>
            <span className="text-sm font-bold text-gray-900">Employee Commission Manager</span>
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
      <div className="max-w-4xl w-full mx-auto space-y-8 flex-1 flex flex-col justify-center">
        <div className="text-center space-y-2">
          <h1 className="text-3xl font-extrabold text-gray-900 tracking-tight">Select Commission Entity</h1>
          <p className="text-sm text-gray-500 font-medium max-w-md mx-auto">
            Choose an entity to manage employee commissions, set branch sales targets, and track payout disbursements.
          </p>
        </div>

        {/* Entity Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* 1. LAHORE COMMISSION CARD */}
          <Card className="border border-gray-200 hover:border-emerald-500/60 bg-white shadow-xs hover:shadow-md transition-all duration-200 cursor-pointer flex flex-col justify-between">
            <CardHeader className="pb-4">
              <div className="flex justify-between items-start">
                <div className="size-12 rounded-xl bg-emerald-50 flex items-center justify-center text-emerald-600 shadow-2xs">
                  <Building2Icon className="size-6" />
                </div>
                <Badge className="bg-emerald-50 text-emerald-700 hover:bg-emerald-50 border border-emerald-100 font-semibold">
                  Lahore Branch
                </Badge>
              </div>
              <CardTitle className="text-xl font-bold text-gray-900 mt-4">LAHORE COMMISSION</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-2 border-y border-gray-100 py-3 text-center">
                <div>
                  <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">Branch Status</span>
                  <span className="text-sm font-bold text-emerald-600">Active</span>
                </div>
                <div>
                  <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">Commission System</span>
                  <span className="text-sm font-bold text-gray-900">Configurable</span>
                </div>
              </div>

              <div className="space-y-2 text-xs text-gray-600 font-medium pt-1">
                <div className="flex items-center gap-2">
                  <UsersIcon className="size-4 text-emerald-600 shrink-0" />
                  <span>Lahore Employee Roster & Payout Rules</span>
                </div>
                <div className="flex items-center gap-2">
                  <TrendingUpIcon className="size-4 text-emerald-600 shrink-0" />
                  <span>Target Benchmark & Tier Calculations</span>
                </div>
              </div>
            </CardContent>
            <CardFooter className="pt-2">
              <Button
                onClick={() => handleSelectCommissionEntity("Lahore")}
                className="w-full h-10 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold transition-colors flex items-center justify-center gap-2 group cursor-pointer"
              >
                Manage Lahore Commission
                <ArrowRightIcon className="size-4 group-hover:translate-x-1 transition-transform" />
              </Button>
            </CardFooter>
          </Card>

          {/* 2. MULTAN COMMISSION CARD */}
          <Card className="border border-gray-200 hover:border-emerald-500/60 bg-white shadow-xs hover:shadow-md transition-all duration-200 cursor-pointer flex flex-col justify-between">
            <CardHeader className="pb-4">
              <div className="flex justify-between items-start">
                <div className="size-12 rounded-xl bg-emerald-50 flex items-center justify-center text-emerald-600 shadow-2xs">
                  <Building2Icon className="size-6" />
                </div>
                <Badge className="bg-emerald-50 text-emerald-700 hover:bg-emerald-50 border border-emerald-100 font-semibold">
                  Multan Branch
                </Badge>
              </div>
              <CardTitle className="text-xl font-bold text-gray-900 mt-4">MULTAN COMMISSION</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-2 border-y border-gray-100 py-3 text-center">
                <div>
                  <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">Branch Status</span>
                  <span className="text-sm font-bold text-emerald-600">Active</span>
                </div>
                <div>
                  <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">Commission System</span>
                  <span className="text-sm font-bold text-gray-900">Configurable</span>
                </div>
              </div>

              <div className="space-y-2 text-xs text-gray-600 font-medium pt-1">
                <div className="flex items-center gap-2">
                  <UsersIcon className="size-4 text-emerald-600 shrink-0" />
                  <span>Multan Employee Roster & Payout Rules</span>
                </div>
                <div className="flex items-center gap-2">
                  <TrendingUpIcon className="size-4 text-emerald-600 shrink-0" />
                  <span>Target Benchmark & Tier Calculations</span>
                </div>
              </div>
            </CardContent>
            <CardFooter className="pt-2">
              <Button
                onClick={() => handleSelectCommissionEntity("Multan")}
                className="w-full h-10 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold transition-colors flex items-center justify-center gap-2 group cursor-pointer"
              >
                Manage Multan Commission
                <ArrowRightIcon className="size-4 group-hover:translate-x-1 transition-transform" />
              </Button>
            </CardFooter>
          </Card>
        </div>
      </div>

      <div className="max-w-4xl w-full mx-auto text-center text-xs font-semibold text-gray-400 mt-10">
        Commission Period: {currentMonth} {currentYear} • Switch Active month using the Header in the Commission dashboard.
      </div>
    </div>
  );
}
