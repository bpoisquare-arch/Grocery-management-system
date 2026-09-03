"use client";

import React, { useEffect } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useStore } from "@/lib/store";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  ShoppingBagIcon,
  BadgePercentIcon,
  ArrowRightIcon,
  LogOutIcon,
  SparklesIcon,
  Building2Icon,
  ReceiptIcon,
  UsersIcon,
  TrendingUpIcon,
} from "lucide-react";
import { toast } from "sonner";

export default function SelectModulePage() {
  const { currentUser, switchEntity, logout, activeEntity } = useStore();
  const router = useRouter();

  useEffect(() => {
    if (!currentUser) {
      router.push("/login");
    }
  }, [currentUser, router]);

  if (!currentUser) {
    return (
      <div className="flex h-screen w-screen flex-col items-center justify-center bg-slate-50 p-6">
        <div className="w-full max-w-md space-y-4">
          <Skeleton className="h-12 w-12 rounded-lg bg-gray-200" />
          <Skeleton className="h-6 w-3/4 bg-gray-200" />
        </div>
      </div>
    );
  }

  const isAdmin = currentUser.role === "ADMIN";

  const handleSelectGrocery = () => {
    if (isAdmin) {
      router.push("/select-entity");
    } else if (currentUser.role === "LAHORE_USER") {
      switchEntity("Lahore");
      toast.success("Opening Lahore Grocery Management");
      router.push("/dashboard");
    } else if (currentUser.role === "MULTAN_USER") {
      switchEntity("Multan");
      toast.success("Opening Multan Grocery Management");
      router.push("/dashboard");
    }
  };

  const handleSelectCommissions = () => {
    if (isAdmin) {
      router.push("/commissions/select-entity");
    } else if (currentUser.role === "LAHORE_USER") {
      switchEntity("Lahore");
      toast.success("Opening Lahore Employee Commissions");
      router.push("/commissions/dashboard");
    } else if (currentUser.role === "MULTAN_USER") {
      switchEntity("Multan");
      toast.success("Opening Multan Employee Commissions");
      router.push("/commissions/dashboard");
    }
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC] flex flex-col justify-between py-10 px-6 sm:px-12">
      {/* Top Bar */}
      <div className="max-w-4xl w-full mx-auto flex justify-between items-center mb-8">
        <div className="flex items-center gap-3.5">
          <div className="flex size-14 items-center justify-center rounded-2xl bg-emerald-700/10 p-1 border border-emerald-600/20 shadow-sm">
            <Image
              src="/isquarebpo.png"
              alt="Logo"
              width={70}
              height={70}
              className="size-full object-contain"
            />
          </div>
          <div>
            <span className="text-base font-bold text-gray-900 block leading-tight">Branch Management System</span>
            <span className="text-xs text-gray-500 font-medium">Business Operations Portal</span>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <div className="text-right hidden sm:block">
            <div className="text-xs font-bold text-gray-900">{currentUser.name}</div>
            <div className="text-[10px] text-gray-500 font-semibold">{currentUser.email}</div>
          </div>
          <Badge
            variant="outline"
            className="bg-emerald-50 text-emerald-800 border-emerald-200 text-xs font-semibold px-2.5 py-1"
          >
            {isAdmin ? "ADMIN" : `${currentUser.role.replace("_USER", "")} USER`}
          </Badge>
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
          <Badge className="bg-emerald-100/80 text-emerald-800 hover:bg-emerald-100 border border-emerald-200/50 text-xs font-bold px-3 py-1 mb-1">
            <SparklesIcon className="size-3 mr-1 text-emerald-600" />
            Operational Workspace
          </Badge>
          <h1 className="text-3xl sm:text-4xl font-extrabold text-gray-900 tracking-tight">Select a Module</h1>
          <p className="text-sm text-gray-500 font-medium max-w-md mx-auto">
            Choose an operational module to manage monthly branch expenses or employee commission allocations.
          </p>
        </div>

        {/* Module Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* 1. GROCERY MODULE CARD */}
          <Card
            onClick={handleSelectGrocery}
            className="group border border-gray-200 hover:border-emerald-500/70 bg-white shadow-xs hover:shadow-lg transition-all duration-200 cursor-pointer flex flex-col justify-between overflow-hidden"
          >
            <CardHeader className="pb-4">
              <div className="flex justify-between items-start">
                <div className="size-13 rounded-2xl bg-emerald-50 flex items-center justify-center text-emerald-600 shadow-2xs group-hover:bg-emerald-600 group-hover:text-white transition-colors duration-200">
                  <ShoppingBagIcon className="size-7" />
                </div>
                <Badge className="bg-emerald-50 text-emerald-700 hover:bg-emerald-50 border border-emerald-100 font-semibold text-[11px]">
                  Expenses & Invoices
                </Badge>
              </div>
              <CardTitle className="text-2xl font-bold text-gray-900 mt-5 group-hover:text-emerald-700 transition-colors">
                Grocery Management
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-gray-600 leading-relaxed font-normal">
                Log daily grocery invoices, upload & verify supporting slips, monitor branch monthly budgets, and export financial PDF/Excel reports.
              </p>

              <div className="grid grid-cols-2 gap-2 pt-2 border-t border-gray-100 text-xs text-gray-600 font-medium">
                <div className="flex items-center gap-1.5">
                  <ReceiptIcon className="size-4 text-emerald-600 shrink-0" />
                  <span>Slips & Invoices</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <Building2Icon className="size-4 text-emerald-600 shrink-0" />
                  <span>{isAdmin ? "Lahore & Multan" : `${activeEntity} Office`}</span>
                </div>
              </div>
            </CardContent>
            <CardFooter className="pt-2">
              <Button
                onClick={(e) => {
                  e.stopPropagation();
                  handleSelectGrocery();
                }}
                className="w-full h-11 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold transition-colors flex items-center justify-center gap-2 group-hover:shadow-md cursor-pointer"
              >
                <span>{isAdmin ? "Open Grocery Entity Selector" : `Open ${activeEntity} Grocery Module`}</span>
                <ArrowRightIcon className="size-4 group-hover:translate-x-1 transition-transform" />
              </Button>
            </CardFooter>
          </Card>

          {/* 2. EMPLOYEE COMMISSIONS MODULE CARD */}
          <Card
            onClick={handleSelectCommissions}
            className="group border border-gray-200 hover:border-emerald-500/70 bg-white shadow-xs hover:shadow-lg transition-all duration-200 cursor-pointer flex flex-col justify-between overflow-hidden"
          >
            <CardHeader className="pb-4">
              <div className="flex justify-between items-start">
                <div className="size-13 rounded-2xl bg-emerald-50 flex items-center justify-center text-emerald-600 shadow-2xs group-hover:bg-emerald-600 group-hover:text-white transition-colors duration-200">
                  <BadgePercentIcon className="size-7" />
                </div>
                <Badge className="bg-emerald-100 text-emerald-800 hover:bg-emerald-100 border border-emerald-200 font-semibold text-[11px]">
                  Commissions & Payroll
                </Badge>
              </div>
              <CardTitle className="text-2xl font-bold text-gray-900 mt-5 group-hover:text-emerald-700 transition-colors">
                Employee Commissions
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-gray-600 leading-relaxed font-normal">
                Manage branch employee commission structures, calculate sales performance payouts, and oversee monthly payout disbursements.
              </p>

              <div className="grid grid-cols-2 gap-2 pt-2 border-t border-gray-100 text-xs text-gray-600 font-medium">
                <div className="flex items-center gap-1.5">
                  <UsersIcon className="size-4 text-emerald-600 shrink-0" />
                  <span>Employee Roster</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <TrendingUpIcon className="size-4 text-emerald-600 shrink-0" />
                  <span>Performance Payouts</span>
                </div>
              </div>
            </CardContent>
            <CardFooter className="pt-2">
              <Button
                onClick={(e) => {
                  e.stopPropagation();
                  handleSelectCommissions();
                }}
                className="w-full h-11 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold transition-colors flex items-center justify-center gap-2 group-hover:shadow-md cursor-pointer"
              >
                <span>{isAdmin ? "Open Commissions Entity Selector" : `Open ${activeEntity} Commissions`}</span>
                <ArrowRightIcon className="size-4 group-hover:translate-x-1 transition-transform" />
              </Button>
            </CardFooter>
          </Card>
        </div>
      </div>

      <div className="max-w-4xl w-full mx-auto text-center text-xs font-semibold text-gray-400 mt-10">
        ISquareBPO Multi-Branch Management System • 2026
      </div>
    </div>
  );
}
