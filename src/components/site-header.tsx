"use client";

import React from "react";
import { usePathname, useRouter } from "next/navigation";
import { Separator } from "@/components/ui/separator";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { useStore } from "@/lib/store";
import { mockUsers, Entity, Role } from "@/lib/mockData";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { ShieldCheckIcon, UserIcon, ArrowLeftRightIcon, Building2Icon, LayersIcon } from "lucide-react";
import { toast } from "sonner";

export function SiteHeader() {
  const pathname = usePathname();
  const router = useRouter();
  const {
    currentUser,
    activeEntity,
    switchEntity,
    currentMonth,
    setCurrentMonth,
    currentYear,
    login,
  } = useStore();

  const getPageTitle = () => {
    switch (pathname) {
      case "/":
      case "/dashboard":
        return "Dashboard Overview";
      case "/grocery":
        return "Grocery Management";
      case "/budget":
        return "Monthly Budget Allocation";
      case "/reports":
        return "Expense Reports";
      case "/settings":
        return "Account Settings";
      default:
        return "Expense Management";
    }
  };

  const handleRoleChange = async (role: Role) => {
    if (role === "ADMIN") {
      switchEntity("Lahore");
      toast.success("Switched view to Admin (Full Access)");
    } else if (role === "LAHORE_USER") {
      switchEntity("Lahore");
      toast.success("Switched view to Lahore User");
      if (pathname === "/budget" || pathname === "/select-entity") {
        router.push("/dashboard");
      }
    } else if (role === "MULTAN_USER") {
      switchEntity("Multan");
      toast.success("Switched view to Multan User");
      if (pathname === "/budget" || pathname === "/select-entity") {
        router.push("/dashboard");
      }
    } else if (role === "ISQUAREBPO_USER") {
      switchEntity("ISquareBPO");
      toast.success("Switched view to ISquareBPO User");
      if (pathname === "/budget" || pathname === "/select-entity") {
        router.push("/dashboard");
      }
    }
  };

  return (
    <header className="flex h-16 shrink-0 items-center justify-between border-b border-border bg-white px-4 md:px-6 sticky top-0 z-30">
      <div className="flex items-center gap-2">
        <SidebarTrigger className="-ml-1 text-gray-500 hover:text-gray-900" />
        <Separator
          orientation="vertical"
          className="mx-2 h-4 border-l border-gray-200"
        />
        
        {/* Breadcrumbs */}
        <Breadcrumb className="hidden sm:block">
          <BreadcrumbList>
            <BreadcrumbItem>
              <BreadcrumbLink href="/dashboard" className="text-gray-500 hover:text-gray-900 font-medium">
                {activeEntity === "Lahore" ? "Main Lahore" : activeEntity === "Miscellaneous" ? "Miscellaneous" : `${activeEntity}`} Entity
              </BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              <BreadcrumbPage className="text-gray-900 font-semibold">{getPageTitle()}</BreadcrumbPage>
            </BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>
      </div>

      <div className="flex items-center gap-3">
        {/* Quick Entity Switcher for Lahore User & Admin */}
        {(currentUser?.role === "LAHORE_USER" || currentUser?.role === "ADMIN") && (
          <DropdownMenu>
            <DropdownMenuTrigger
              render={
                <Button
                  variant="outline"
                  size="sm"
                  className="h-8 px-2.5 gap-1.5 text-xs font-semibold bg-emerald-50/60 border-emerald-200 text-emerald-800 hover:bg-emerald-100/70"
                />
              }
            >
              {activeEntity === "Miscellaneous" ? (
                <LayersIcon className="size-3.5 text-purple-600" />
              ) : (
                <Building2Icon className="size-3.5 text-emerald-600" />
              )}
              <span>{activeEntity === "Lahore" ? "Main Lahore" : activeEntity === "Miscellaneous" ? "Miscellaneous" : `${activeEntity}`}</span>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-52 bg-white border-gray-200">
              <DropdownMenuLabel className="text-xs font-bold text-gray-700">Switch Active Entity</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={() => {
                  switchEntity("Lahore");
                  toast.success("Switched to Main Lahore");
                }}
                className={activeEntity === "Lahore" ? "bg-emerald-50 text-emerald-800 font-bold" : "cursor-pointer text-xs"}
              >
                <Building2Icon className="size-4 mr-2 text-emerald-600" />
                Main Lahore
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => {
                  switchEntity("Miscellaneous");
                  toast.success("Switched to Miscellaneous Entity");
                }}
                className={activeEntity === "Miscellaneous" ? "bg-purple-50 text-purple-800 font-bold" : "cursor-pointer text-xs"}
              >
                <LayersIcon className="size-4 mr-2 text-purple-600" />
                Miscellaneous Entity
              </DropdownMenuItem>
              {currentUser?.role === "ADMIN" && (
                <>
                  <DropdownMenuItem
                    onClick={() => {
                      switchEntity("Multan");
                      toast.success("Switched to Multan");
                    }}
                    className={activeEntity === "Multan" ? "bg-emerald-50 text-emerald-800 font-bold" : "cursor-pointer text-xs"}
                  >
                    <Building2Icon className="size-4 mr-2 text-emerald-600" />
                    Multan Entity
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={() => {
                      switchEntity("ISquareBPO");
                      toast.success("Switched to ISquareBPO");
                    }}
                    className={activeEntity === "ISquareBPO" ? "bg-emerald-50 text-emerald-800 font-bold" : "cursor-pointer text-xs"}
                  >
                    <Building2Icon className="size-4 mr-2 text-emerald-600" />
                    ISquareBPO Entity
                  </DropdownMenuItem>
                </>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        )}

        {/* Role Quick Switcher for testing/demo */}
        {currentUser && currentUser.role === "ADMIN" && (
          <DropdownMenu>
            <DropdownMenuTrigger
              render={
                <Button
                  variant="outline"
                  size="sm"
                  className="h-8 px-2.5 gap-1.5 text-xs font-semibold bg-gray-50 border border-gray-200 hover:bg-gray-100 hover:text-gray-900"
                />
              }
            >
              <ArrowLeftRightIcon className="size-3.5 text-gray-500" />
              <span className="hidden md:inline">Role:</span>
              <span className="text-emerald-700 font-bold">{currentUser.role.replace("_", " ")}</span>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              <DropdownMenuLabel>Switch Test Role</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={() => handleRoleChange("ADMIN")}
                className={currentUser.role === "ADMIN" ? "bg-emerald-50 text-emerald-800 font-bold" : ""}
              >
                <ShieldCheckIcon className="size-4 mr-2 text-emerald-600" />
                Admin (Full Access)
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => handleRoleChange("LAHORE_USER")}
                className={(currentUser.role as string) === "LAHORE_USER" ? "bg-emerald-50 text-emerald-800 font-bold" : ""}
              >
                <UserIcon className="size-4 mr-2 text-blue-600" />
                Lahore User (Limited)
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => handleRoleChange("MULTAN_USER")}
                className={(currentUser.role as string) === "MULTAN_USER" ? "bg-emerald-50 text-emerald-800 font-bold" : ""}
              >
                <UserIcon className="size-4 mr-2 text-amber-600" />
                Multan User (Limited)
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => handleRoleChange("ISQUAREBPO_USER")}
                className={(currentUser.role as string) === "ISQUAREBPO_USER" ? "bg-emerald-50 text-emerald-800 font-bold" : ""}
              >
                <UserIcon className="size-4 mr-2 text-emerald-600" />
                ISquareBPO User (Limited)
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </div>
    </header>
  );
}
