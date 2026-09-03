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

  // Build main navigation items
  const navItems = [
    {
      title: "Dashboard",
      url: "/dashboard",
      icon: LayoutDashboardIcon,
      visible: true,
    },
    {
      title: "Grocery Management",
      url: "/grocery",
      icon: ShoppingBagIcon,
      visible: true,
    },
    {
      title: "Monthly Budget",
      url: "/budget",
      icon: CoinsIcon,
      visible: isAdmin, // Admin only
    },
  ];

  return (
    <Sidebar collapsible="offcanvas" {...props} className="border-r border-border bg-white">
      <SidebarHeader className="border-b border-border py-4 px-4 bg-white">
        <div className="flex flex-col gap-2">
          {/* Logo */}
          <div className="flex items-center gap-2">
            <div className="flex size-9 items-center justify-center rounded-lg bg-emerald-600 text-white">
              <ShoppingBagIcon className="size-5" />
            </div>
            <div className="flex flex-col">
              <span className="text-sm font-semibold leading-none text-gray-900">Grocery Expense</span>
              <span className="text-xs text-gray-500 font-medium">Manager</span>
            </div>
          </div>

          {/* Active Entity Badge */}
          <div className="mt-2">
            <Badge
              variant="outline"
              className={cn(
                "w-full py-1.5 justify-start gap-2 border-emerald-100/80 font-medium text-xs rounded-md shadow-xs bg-emerald-50/50 text-emerald-800"
              )}
            >
              <span className="h-2 w-2 rounded-full bg-emerald-600 animate-pulse" />
              {isAdmin ? "ADMIN" : `${activeEntity.toUpperCase()} USER`}
            </Badge>
          </div>
        </div>
      </SidebarHeader>

      <SidebarContent className="py-4 px-3 bg-white">
        <SidebarMenu className="gap-1">
          {navItems
            .filter((item) => item.visible)
            .map((item) => {
              const isActive = pathname === item.url;
              return (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton
                    render={<Link href={item.url} />}
                    tooltip={item.title}
                    className={cn(
                      "w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-all duration-150",
                      isActive
                        ? "bg-emerald-50 text-emerald-700 font-medium"
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

          {/* Admin Entity Switcher Link */}
          {isAdmin && (
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
                  <span className="text-[10px] text-gray-400 font-mono bg-gray-100 px-1 rounded">Admin</span>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start" className="w-52">
                  <DropdownMenuLabel>Select Active Entity</DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    onClick={() => switchEntity("Lahore")}
                    className={cn(activeEntity === "Lahore" && "bg-emerald-50 text-emerald-700 font-semibold")}
                  >
                    <Building2Icon className="size-4 mr-2" />
                    Lahore Entity
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={() => switchEntity("Multan")}
                    className={cn(activeEntity === "Multan" && "bg-emerald-50 text-emerald-700 font-semibold")}
                  >
                    <Building2Icon className="size-4 mr-2" />
                    Multan Entity
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={() => switchEntity("ISquareBPO")}
                    className={cn(activeEntity === "ISquareBPO" && "bg-emerald-50 text-emerald-700 font-semibold")}
                  >
                    <Building2Icon className="size-4 mr-2" />
                    ISquareBPO Entity
                  </DropdownMenuItem>
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
