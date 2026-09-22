"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useStore } from "@/lib/store";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar";
import { cn } from "@/lib/utils";
import {
  LayoutDashboardIcon,
  ShoppingBagIcon,
  FileBarChart2Icon,
  Settings2Icon,
  HelpCircleIcon,
  LogOutIcon,
  Building2Icon,
  GitCompareIcon,
  CoinsIcon,
  BadgePercentIcon,
  LayoutGridIcon,
  LayersIcon,
  ClockIcon,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  const pathname = usePathname();
  const router = useRouter();
  const { currentUser, activeEntity, switchEntity, logout } = useStore();
  const { isMobile } = useSidebar();

  const isAdmin = currentUser?.role === "ADMIN";
  const isLahoreUser = currentUser?.role === "LAHORE_USER";

  // Build main navigation items
  const navigationItems = [
    {
      title: "Dashboard",
      url: "/dashboard",
      icon: LayoutDashboardIcon,
      adminOnly: false,
    },
    {
      title: "Grocery Management",
      url: "/grocery",
      icon: ShoppingBagIcon,
      adminOnly: false,
    },
    {
      title: "Monthly Budget",
      url: "/budget",
      icon: CoinsIcon,
      adminOnly: true,
    },
  ];

  return (
    <Sidebar collapsible="icon" className="border-r border-gray-200 bg-white" {...props}>
      <SidebarHeader className="border-b border-gray-100 p-4">
        <div className="flex items-center gap-3">
          <div className="flex size-9 items-center justify-center rounded-lg bg-emerald-600 text-white shadow-2xs">
            <ShoppingBagIcon className="size-5" />
          </div>
          <div className="flex flex-col overflow-hidden">
            <span className="text-sm font-bold tracking-tight text-gray-900 truncate">Grocery Manager</span>
            <span className="text-[11px] font-medium text-emerald-700 truncate">
              {activeEntity === "Lahore" ? "Main Lahore" : `${activeEntity} Entity`}
            </span>
          </div>
        </div>
      </SidebarHeader>

      <SidebarContent className="px-2 py-4 space-y-6">
        {/* Main Navigation Menu */}
        <SidebarMenu>
          {navigationItems
            .filter((item) => !item.adminOnly || isAdmin)
            .map((item) => {
              const isActive = pathname === item.url;
              return (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton
                    render={<Link href={item.url} />}
                    isActive={isActive}
                    tooltip={item.title}
                    className={cn(
                      "w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors",
                      isActive
                        ? "bg-emerald-50 text-emerald-800 font-bold"
                        : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
                    )}
                  >
                    <item.icon
                      className={cn(
                        "size-5",
                        isActive ? "text-emerald-600" : "text-gray-400 group-hover:text-gray-900"
                      )}
                    />
                    <span>{item.title}</span>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              );
            })}

          {/* Entity Switcher for Admin & Lahore User */}
          {(isAdmin || isLahoreUser) && (
            <SidebarMenuItem>
              <DropdownMenu>
                <DropdownMenuTrigger
                  render={
                    <SidebarMenuButton
                      tooltip="Switch Entity"
                      className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-gray-600 hover:bg-gray-50 hover:text-gray-900"
                    />
                  }
                >
                  <GitCompareIcon className="size-5 text-gray-400" />
                  <span className="flex-1 text-left">Switch Entity</span>
                  <span className="text-[10px] text-gray-500 font-mono bg-gray-100 px-1.5 py-0.5 rounded">
                    {activeEntity === "Lahore" ? "Lahore" : activeEntity === "Miscellaneous" ? "Misc" : activeEntity}
                  </span>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start" className="w-56 bg-white border-gray-200">
                  <DropdownMenuLabel className="text-xs font-bold text-gray-700">Select Active Entity</DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  
                  {/* Lahore (Main) */}
                  <DropdownMenuItem
                    onClick={() => switchEntity("Lahore")}
                    className={cn(
                      "cursor-pointer text-xs font-semibold",
                      activeEntity === "Lahore" && "bg-emerald-50 text-emerald-700 font-bold"
                    )}
                  >
                    <Building2Icon className="size-4 mr-2 text-emerald-600" />
                    Main Lahore
                  </DropdownMenuItem>

                  {/* Miscellaneous */}
                  <DropdownMenuItem
                    onClick={() => switchEntity("Miscellaneous")}
                    className={cn(
                      "cursor-pointer text-xs font-semibold",
                      activeEntity === "Miscellaneous" && "bg-purple-50 text-purple-700 font-bold"
                    )}
                  >
                    <LayersIcon className="size-4 mr-2 text-purple-600" />
                    Miscellaneous Entity
                  </DropdownMenuItem>

                  {/* Multan & ISquareBPO (Admin Only) */}
                  {isAdmin && (
                    <>
                      <DropdownMenuItem
                        onClick={() => switchEntity("Multan")}
                        className={cn(
                          "cursor-pointer text-xs font-semibold",
                          activeEntity === "Multan" && "bg-emerald-50 text-emerald-700 font-bold"
                        )}
                      >
                        <Building2Icon className="size-4 mr-2 text-emerald-600" />
                        Multan Entity
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={() => switchEntity("ISquareBPO")}
                        className={cn(
                          "cursor-pointer text-xs font-semibold",
                          activeEntity === "ISquareBPO" && "bg-emerald-50 text-emerald-700 font-bold"
                        )}
                      >
                        <Building2Icon className="size-4 mr-2 text-emerald-600" />
                        ISquareBPO Entity
                      </DropdownMenuItem>
                    </>
                  )}
                </DropdownMenuContent>
              </DropdownMenu>
            </SidebarMenuItem>
          )}

          {/* Cross-Module Navigation */}
          <SidebarMenuItem className="mt-4 pt-3 border-t border-gray-100">
            <SidebarMenuButton
              render={<Link href="/select-module" />}
              tooltip="All Modules"
              className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-gray-600 hover:bg-slate-100 hover:text-gray-900"
            >
              <LayoutGridIcon className="size-5 text-gray-400" />
              <span>Switch Module</span>
            </SidebarMenuButton>
          </SidebarMenuItem>

          {currentUser?.role !== "ISQUAREBPO_USER" && (
            <SidebarMenuItem>
              <SidebarMenuButton
                render={<Link href="/commissions/dashboard" />}
                tooltip="Employee Commissions"
                className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-gray-600 hover:bg-emerald-50 hover:text-emerald-700"
              >
                <BadgePercentIcon className="size-5 text-emerald-600" />
                <span>Commissions Module</span>
              </SidebarMenuButton>
            </SidebarMenuItem>
          )}

          {/* Attendance Records Module */}
          <SidebarMenuItem>
            <SidebarMenuButton
              render={
                <Link
                  href={
                    currentUser?.role === "LAHORE_USER"
                      ? "/attendance/records?branch=Lahore"
                      : currentUser?.role === "MULTAN_USER"
                      ? "/attendance/records?branch=Multan"
                      : "/attendance/records"
                  }
                />
              }
              tooltip="Attendance Records"
              className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-gray-600 hover:bg-teal-50 hover:text-teal-700"
            >
              <ClockIcon className="size-5 text-teal-600" />
              <span>Attendance Records</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarContent>

      <SidebarFooter className="border-t border-border p-3 bg-white">
        <SidebarMenu>

          {/* User Profile Area */}
          {currentUser && (
            <SidebarMenuItem className="mt-2 border-t border-gray-100 pt-2">
              <div className="flex items-center justify-between gap-1 w-full">
                <div className="flex items-center gap-2 flex-1 min-w-0 px-2 py-1.5">
                  <Avatar className="size-9 rounded-lg shrink-0">
                    <AvatarFallback className="rounded-lg bg-emerald-100 text-emerald-700 text-sm font-bold flex items-center justify-center">
                      {currentUser.role === "ADMIN"
                        ? "A"
                        : currentUser.role === "LAHORE_USER"
                        ? "L"
                        : currentUser.role === "MULTAN_USER"
                        ? "M"
                        : "I"}
                    </AvatarFallback>
                  </Avatar>
                  <div className="grid flex-1 text-left text-sm leading-tight min-w-0">
                    <span className="truncate font-semibold text-gray-900">{currentUser.name}</span>
                    <span className="truncate text-xs text-gray-500 font-medium">{currentUser.role.replace("_", " ")}</span>
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={logout}
                  title="Log out"
                  className="size-8 text-gray-500 hover:text-red-600 hover:bg-red-50 shrink-0 rounded-lg"
                >
                  <LogOutIcon className="size-4" />
                </Button>
              </div>
            </SidebarMenuItem>
          )}
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  );
}
