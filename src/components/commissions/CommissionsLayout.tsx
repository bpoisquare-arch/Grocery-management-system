"use client";

import React, { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useStore } from "@/lib/store";
import { SidebarProvider, SidebarInset } from "@/components/ui/sidebar";
import { CommissionsSidebar } from "@/components/commissions/commissions-sidebar";
import { CommissionsHeader } from "@/components/commissions/commissions-header";
import { Skeleton } from "@/components/ui/skeleton";

export function CommissionsLayout({ children }: { children: React.ReactNode }) {
  const { currentUser } = useStore();
  const router = useRouter();

  useEffect(() => {
    // If not logged in, redirect to login
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
          <Skeleton className="h-4 w-full bg-gray-200" />
          <Skeleton className="h-4 w-5/6 bg-gray-200" />
        </div>
      </div>
    );
  }

  return (
    <SidebarProvider
      style={
        {
          "--sidebar-width": "18rem",
          "--header-height": "4rem",
        } as React.CSSProperties
      }
    >
      <CommissionsSidebar variant="inset" />
      <SidebarInset className="bg-slate-50 flex flex-col min-h-screen">
        <CommissionsHeader />
        <main className="flex flex-1 flex-col p-4 md:p-6 lg:p-8 w-full">
          {children}
        </main>
      </SidebarInset>
    </SidebarProvider>
  );
}
