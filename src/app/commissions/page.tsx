"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useStore } from "@/lib/store";
import { Skeleton } from "@/components/ui/skeleton";

export default function CommissionsRootPage() {
  const { currentUser } = useStore();
  const router = useRouter();

  useEffect(() => {
    if (!currentUser) {
      router.push("/login");
    } else if (currentUser.role === "ADMIN") {
      router.push("/commissions/select-entity");
    } else {
      router.push("/commissions/dashboard");
    }
  }, [currentUser, router]);

  return (
    <div className="flex h-screen w-screen flex-col items-center justify-center bg-slate-50 p-6">
      <div className="w-full max-w-md space-y-4">
        <Skeleton className="h-12 w-12 rounded-lg bg-gray-200" />
        <Skeleton className="h-6 w-3/4 bg-gray-200" />
        <Skeleton className="h-4 w-full bg-gray-200" />
      </div>
    </div>
  );
}
