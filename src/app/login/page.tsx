import React, { Suspense } from "react";
import Image from "next/image";
import { LoginForm } from "@/components/login-form";

export default function LoginPage() {
  return (
    <div className="grid min-h-screen lg:grid-cols-12 bg-white">
      {/* Left side: Premium Visual Content */}
      <div className="relative hidden lg:flex lg:col-span-7 bg-emerald-900 flex-col justify-between p-12 text-white">
        <div className="absolute inset-0 bg-cover bg-center opacity-40 mix-blend-overlay"
          style={{
            backgroundImage: "url('/mainmage.jpg')",
          }}
        />

        {/* Logo */}
        <div className="relative z-10 flex items-center gap-3.5">
          <div className="flex size-16 items-center justify-center rounded-2xl bg-white/20 p-2 backdrop-blur-md shadow-lg border border-white/25">
            <Image
              src="/isquarebpo.png"
              alt="Logo"
              width={100}
              height={100}
              className="size-full object-contain"
              priority
            />
          </div>
          <span className="text-2xl font-bold tracking-tight text-white">Branch Management System</span>
        </div>

        {/* Caption */}
        <div className="relative z-10 space-y-4 max-w-lg">
          <h2 className="text-4xl font-extrabold leading-tight tracking-tight">
            Financial precision for business operations.
          </h2>
          <p className="text-base text-emerald-100 font-medium">
            Keep track of monthly budgets, log invoices, upload supporting slips, and generate PDF/Excel financial reports with zero friction.
          </p>
        </div>

        {/* Footer info */}
        <div className="relative z-10 text-xs font-semibold text-emerald-200/80">
          © 2026 Branch Management System. All rights reserved.
        </div>
      </div>

      {/* Right side: Login Form */}
      <div className="flex flex-col lg:col-span-5 justify-center items-center p-6 sm:p-12 md:p-20 bg-slate-50/50">
        <div className="w-full max-w-sm">
          {/* Mobile Logo display */}
          <div className="flex lg:hidden items-center gap-3 mb-8 justify-center">
            <div className="flex size-12 items-center justify-center rounded-xl bg-emerald-700/10 p-1.5 border border-emerald-600/20 shadow-sm">
              <Image
                src="/isquarebpo.png"
                alt="Logo"
                width={60}
                height={60}
                className="size-full object-contain"
              />
            </div>
            <span className="text-lg font-bold text-gray-900">Branch Management System</span>
          </div>

          <Suspense fallback={<div className="h-64 flex items-center justify-center text-sm text-gray-400">Loading sign in form...</div>}>
            <LoginForm />
          </Suspense>
        </div>
      </div>
    </div>
  );
}
