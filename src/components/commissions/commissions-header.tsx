"use client";

import React, { useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { Separator } from "@/components/ui/separator";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { useStore } from "@/lib/store";
import { Role } from "@/lib/mockData";
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
import {
  ShieldCheckIcon,
  UserIcon,
  ArrowLeftRightIcon,
  LayoutGridIcon,
  ShoppingBagIcon,
  CloudUploadIcon,
  Loader2Icon,
} from "lucide-react";
import { toast } from "sonner";

export function CommissionsHeader() {
  const pathname = usePathname();
  const router = useRouter();
  const { currentUser, activeEntity, switchEntity, syncLocalToDatabase } = useStore();
  const [isSyncing, setIsSyncing] = useState(false);

  const handleCloudSync = async () => {
    setIsSyncing(true);
    toast.loading("Connecting & syncing offline records to Cloud Database...", { id: "cloud-sync" });

    try {
      const res = await syncLocalToDatabase();
      if (res.success) {
        const total = res.syncedCommissions + res.syncedCounselors + res.syncedGroceries;
        if (total > 0) {
          toast.success(
            `Cloud Sync Complete! Uploaded ${res.syncedCommissions} commission(s) and ${res.syncedCounselors} counselor(s) to Live MySQL Database.`,
            { id: "cloud-sync" }
          );
        } else {
          toast.success("Cloud Sync Verified! All local records are already 100% up-to-date in Live Database.", { id: "cloud-sync" });
        }
      } else {
        toast.error(res.error || "Unable to reach database server. Please check connection.", { id: "cloud-sync" });
      }
    } catch (err) {
      console.error(err);
      toast.error("Sync failed. Unable to reach live database.", { id: "cloud-sync" });
    } finally {
      setIsSyncing(false);
    }
  };

  const handleRoleChange = async (role: Role) => {
    if (role === "ADMIN") {
      switchEntity("Lahore");
      toast.success("Switched view to Admin (Full Access)");
    } else if (role === "LAHORE_USER") {
      switchEntity("Lahore");
      toast.success("Switched view to Lahore User");
    } else if (role === "MULTAN_USER") {
      switchEntity("Multan");
      toast.success("Switched view to Multan User");
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
              <BreadcrumbLink href="/select-module" className="text-gray-500 hover:text-gray-900 font-medium flex items-center gap-1">
                <LayoutGridIcon className="size-3.5" />
                Modules
              </BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              <BreadcrumbLink href="/commissions/dashboard" className="text-gray-500 hover:text-gray-900 font-medium">
                {activeEntity} Branch
              </BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              <BreadcrumbPage className="text-gray-900 font-semibold">Employee Commissions</BreadcrumbPage>
            </BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>
      </div>

      <div className="flex items-center gap-2.5">
        {/* Sync Cloud Button */}
        <Button
          variant="outline"
          size="sm"
          disabled={isSyncing}
          onClick={handleCloudSync}
          className="h-8 px-3 text-xs font-bold text-emerald-700 bg-emerald-50/80 hover:bg-emerald-100 hover:text-emerald-800 border-emerald-200 gap-1.5 shadow-3xs transition-all cursor-pointer"
          title="Upload all offline/local records from this browser to the Live Cloud Database"
        >
          {isSyncing ? (
            <Loader2Icon className="size-3.5 animate-spin text-emerald-600" />
          ) : (
            <CloudUploadIcon className="size-3.5 text-emerald-600" />
          )}
          <span>{isSyncing ? "Syncing..." : "Sync Cloud"}</span>
        </Button>

        {/* Switch to Grocery Quick Button */}
        <Button
          variant="outline"
          size="sm"
          onClick={() => router.push("/dashboard")}
          className="h-8 px-2.5 text-xs font-semibold text-gray-700 hover:text-emerald-700 hover:bg-emerald-50 border-gray-200 gap-1.5 hidden md:flex cursor-pointer"
        >
          <ShoppingBagIcon className="size-3.5 text-emerald-600" />
          <span>Grocery Module</span>
        </Button>

        {/* Role Quick Switcher for Admin */}
        {currentUser && currentUser.role === "ADMIN" && (
          <DropdownMenu>
            <DropdownMenuTrigger
              render={
                <Button
                  variant="outline"
                  size="sm"
                  className="h-8 px-2.5 gap-1.5 text-xs font-semibold bg-gray-50 border border-gray-200 hover:bg-gray-100 hover:text-gray-900 cursor-pointer"
                />
              }
            >
              <ArrowLeftRightIcon className="size-3.5 text-gray-500" />
              <span className="hidden sm:inline">Role:</span>
              <span className="text-emerald-700 font-bold">{currentUser.role.replace("_", " ")}</span>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              <DropdownMenuLabel>Switch Test Role</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={() => handleRoleChange("ADMIN")}
                className={currentUser.role === "ADMIN" ? "bg-emerald-50 text-emerald-800 font-bold cursor-pointer" : "cursor-pointer"}
              >
                <ShieldCheckIcon className="size-4 mr-2 text-emerald-600" />
                Admin (Full Access)
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => handleRoleChange("LAHORE_USER")}
                className={(currentUser.role as string) === "LAHORE_USER" ? "bg-emerald-50 text-emerald-800 font-bold cursor-pointer" : "cursor-pointer"}
              >
                <UserIcon className="size-4 mr-2 text-blue-600" />
                Lahore User (Limited)
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => handleRoleChange("MULTAN_USER")}
                className={(currentUser.role as string) === "MULTAN_USER" ? "bg-emerald-50 text-emerald-800 font-bold cursor-pointer" : "cursor-pointer"}
              >
                <UserIcon className="size-4 mr-2 text-amber-600" />
                Multan User (Limited)
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </div>
    </header>
  );
}
