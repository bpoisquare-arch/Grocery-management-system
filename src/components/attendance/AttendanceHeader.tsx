"use client";

import React from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { useStore } from "@/lib/store";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  LogOutIcon,
  LayoutGridIcon,
  ShoppingBagIcon,
  BadgePercentIcon,
  Building2Icon,
  ClockIcon,
  LockIcon,
} from "lucide-react";

export function AttendanceHeader({ activeBranch }: { activeBranch: string }) {
  const router = useRouter();
  const { currentUser, logout } = useStore();

  const isAdmin = currentUser?.role === "ADMIN";

  return (
    <header className="flex h-16 shrink-0 items-center justify-between border-b border-gray-200 bg-white px-4 md:px-8 sticky top-0 z-30 shadow-xs">
      <div className="flex items-center gap-4">
        <div className="flex size-10 items-center justify-center rounded-xl bg-emerald-600/10 p-1 border border-emerald-600/20">
          <Image
            src="/isquarebpo.png"
            alt="Logo"
            width={36}
            height={36}
            className="size-full object-contain"
          />
        </div>
        <div>
          <div className="flex items-center gap-2">
            <span className="text-sm font-bold text-gray-900 leading-tight">
              Attendance Records
            </span>
            <Badge
              variant="outline"
              className="bg-emerald-50 text-emerald-700 border-emerald-200 text-[11px] font-bold px-2 py-0.5"
            >
              <ClockIcon className="size-3 mr-1 text-emerald-600" />
              Timesheet & Logs
            </Badge>
            <Badge
              variant="outline"
              className="bg-slate-100 text-slate-700 border-slate-200 text-[11px] font-semibold px-2 py-0.5 flex items-center gap-1"
            >
              <LockIcon className="size-3 text-slate-500" />
              Read-Only
            </Badge>
          </div>
          <div className="flex items-center gap-1 text-xs text-gray-500 font-medium">
            <Building2Icon className="size-3 text-emerald-600" />
            <span>Active Branch:</span>
            <strong className="text-gray-900 font-bold capitalize">
              {activeBranch}
            </strong>
          </div>
        </div>
      </div>

      <div className="flex items-center gap-2 sm:gap-3">
        {/* Quick Navigation to other modules */}
        <Button
          variant="outline"
          size="sm"
          onClick={() => router.push("/select-module")}
          className="h-8 text-xs font-semibold text-gray-700 border-gray-200 hover:bg-gray-50 flex items-center gap-1.5"
        >
          <LayoutGridIcon className="size-3.5 text-gray-500" />
          <span className="hidden sm:inline">Modules</span>
        </Button>

        <Button
          variant="outline"
          size="sm"
          onClick={() => router.push("/dashboard")}
          className="h-8 text-xs font-semibold text-gray-700 border-gray-200 hover:bg-emerald-50 hover:text-emerald-700 flex items-center gap-1.5"
        >
          <ShoppingBagIcon className="size-3.5 text-emerald-600" />
          <span className="hidden md:inline">Grocery</span>
        </Button>

        <Button
          variant="outline"
          size="sm"
          onClick={() => router.push("/commissions/dashboard")}
          className="h-8 text-xs font-semibold text-gray-700 border-gray-200 hover:bg-emerald-50 hover:text-emerald-700 flex items-center gap-1.5"
        >
          <BadgePercentIcon className="size-3.5 text-emerald-600" />
          <span className="hidden md:inline">Commissions</span>
        </Button>

        <div className="h-4 w-px bg-gray-200 mx-1 hidden sm:block" />

        <div className="text-right hidden lg:block">
          <div className="text-xs font-bold text-gray-900">{currentUser?.name}</div>
          <div className="text-[10px] text-gray-500 font-semibold">{currentUser?.email}</div>
        </div>

        <Badge
          variant="outline"
          className="bg-emerald-50 text-emerald-800 border-emerald-200 text-xs font-semibold px-2.5 py-1 hidden sm:inline-flex"
        >
          {isAdmin ? "ADMIN" : `${currentUser?.role.replace("_USER", "")} USER`}
        </Badge>

        <Button
          variant="outline"
          size="sm"
          onClick={logout}
          className="h-8 border-gray-200 text-xs font-semibold text-red-600 hover:bg-red-50 hover:text-red-700"
        >
          <LogOutIcon className="size-3.5 mr-1" />
          <span className="hidden sm:inline">Log out</span>
        </Button>
      </div>
    </header>
  );
}
