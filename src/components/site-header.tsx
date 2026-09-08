"use client";

import React, { useState } from "react";
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
import { ShieldCheckIcon, UserIcon, ArrowLeftRightIcon, CloudUploadIcon, Loader2Icon } from "lucide-react";
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
    syncLocalToDatabase,
  } = useStore();
  const [isSyncing, setIsSyncing] = useState(false);

  const handleCloudSync = async () => {
    setIsSyncing(true);
    toast.loading("Connecting & syncing offline records to Cloud Database...", { id: "site-cloud-sync" });

    try {
      const res = await syncLocalToDatabase();
      if (res.success) {
        const total = res.syncedCommissions + res.syncedCounselors + res.syncedGroceries;
        if (total > 0) {
          toast.success(
            `Cloud Sync Complete! Uploaded ${res.syncedGroceries} grocery entries, ${res.syncedCommissions} commissions, and ${res.syncedCounselors} counselors to Live Database.`,
            { id: "site-cloud-sync" }
          );
        } else {
          toast.success("Cloud Sync Verified! All local records are already in sync with Live Database.", { id: "site-cloud-sync" });
        }
      } else {
        toast.error(res.error || "Unable to reach database server. Please check connection.", { id: "site-cloud-sync" });
      }
    } catch (err) {
      console.error(err);
      toast.error("Sync failed. Unable to reach live database.", { id: "site-cloud-sync" });
    } finally {
      setIsSyncing(false);
    }
  };

  const getPageTitle = () => {
    switch (pathname) {
      case "/dashboard":
        return "Entity Dashboard";
      case "/grocery":
        return "Grocery Management";
      case "/budget":
        return "Monthly Budget Management";
      default:
        return "Grocery Expense Manager";
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
                {activeEntity} User
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
        {/* Sync Cloud Button */}
        <Button
          variant="outline"
          size="sm"
          disabled={isSyncing}
          onClick={handleCloudSync}
          className="h-8 px-2.5 sm:px-3 text-xs font-bold text-emerald-700 bg-emerald-50/80 hover:bg-emerald-100 hover:text-emerald-800 border-emerald-200 gap-1.5 shadow-3xs transition-all cursor-pointer"
          title="Upload all offline/local records from this browser to the Live Cloud Database"
        >
          {isSyncing ? (
            <Loader2Icon className="size-3.5 animate-spin text-emerald-600" />
          ) : (
            <CloudUploadIcon className="size-3.5 text-emerald-600" />
          )}
          <span>{isSyncing ? "Syncing..." : "Sync Cloud"}</span>
        </Button>

        {/* Role Quick Switcher for testing/demo */}
        {currentUser && currentUser.role === "ADMIN" && (
          <DropdownMenu>
            <DropdownMenuTrigger
              render={
                <Button
                  variant="outline"
                  size="sm"
                  className="h-9 px-3 gap-1.5 text-xs font-semibold bg-gray-50 border border-gray-200 hover:bg-gray-100 hover:text-gray-900"
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
