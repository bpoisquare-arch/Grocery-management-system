"use client";

import React, { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useStore } from "@/lib/store";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { EyeIcon, EyeOffIcon, Loader2Icon, LockIcon } from "lucide-react";
import { toast } from "sonner";

export function LoginForm({
  className,
  ...props
}: React.ComponentProps<"div">) {
  const { login } = useStore();
  const router = useRouter();
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get("callbackUrl");

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) {
      toast.error("Please enter your email or username.");
      return;
    }
    if (!password) {
      toast.error("Please enter your password.");
      return;
    }

    setIsLoading(true);

    try {
      const result = await login(email.trim(), password);
      setIsLoading(false);

      if (result.success && result.user) {
        toast.success(`Welcome back, ${result.user.name}!`);

        if (callbackUrl) {
          router.push(callbackUrl);
        } else {
          router.push("/select-module");
        }
      } else {
        toast.error(result.error || "Invalid email or password. Please try again.");
      }
    } catch (err) {
      setIsLoading(false);
      toast.error("An unexpected error occurred. Please try again.");
    }
  };

  return (
    <div className={cn("space-y-6", className)} {...props}>
      {/* Title Header */}
      <div className="flex flex-col gap-2 text-center lg:text-left">
        <h1 className="text-2xl font-bold tracking-tight text-gray-900">Sign In</h1>
        <p className="text-sm text-gray-500 font-medium leading-relaxed">
          Manage monthly grocery expenses, budgets, slips, and reports.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Email Field */}
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="email" className="text-xs font-semibold text-gray-700">
            Email or Username
          </Label>
          <Input
            id="email"
            type="email"
            placeholder="name@grocerymanager.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="h-10 border-gray-200 focus:border-emerald-500 focus:ring-emerald-500 bg-white"
            required
            autoComplete="email"
            disabled={isLoading}
          />
        </div>

        {/* Password Field */}
        <div className="flex flex-col gap-1.5">
          <div className="flex justify-between items-center">
            <Label htmlFor="password" className="text-xs font-semibold text-gray-700">
              Password
            </Label>
            <a
              href="#"
              onClick={(e) => {
                e.preventDefault();
                toast.info("For security, password resets must be requested through system administration.");
              }}
              className="text-xs text-emerald-600 hover:text-emerald-700 font-semibold"
            >
              Forgot password?
            </a>
          </div>
          <div className="relative">
            <Input
              id="password"
              type={showPassword ? "text" : "password"}
              placeholder="Enter your password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="h-10 pr-10 border-gray-200 focus:border-emerald-500 focus:ring-emerald-500 bg-white"
              required
              autoComplete="current-password"
              disabled={isLoading}
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-3 text-gray-400 hover:text-gray-600 focus:outline-none"
              disabled={isLoading}
              aria-label={showPassword ? "Hide password" : "Show password"}
            >
              {showPassword ? <EyeOffIcon className="size-4" /> : <EyeIcon className="size-4" />}
            </button>
          </div>
        </div>

        {/* Remember Me */}
        <div className="flex items-center gap-2">
          <Checkbox
            id="remember"
            checked={rememberMe}
            onCheckedChange={(checked) => setRememberMe(checked === true)}
            disabled={isLoading}
          />
          <Label htmlFor="remember" className="text-xs font-medium text-gray-600 cursor-pointer select-none">
            Remember my entity session
          </Label>
        </div>

        {/* Sign In Button */}
        <Button
          type="submit"
          className="w-full h-11 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold rounded-lg shadow-sm transition-colors cursor-pointer"
          disabled={isLoading}
        >
          {isLoading ? (
            <>
              <Loader2Icon className="size-4 mr-2 animate-spin" />
              Authenticating...
            </>
          ) : (
            <div className="flex items-center justify-center gap-2">
              <LockIcon className="size-4" />
              <span>Sign In</span>
            </div>
          )}
        </Button>
      </form>
    </div>
  );
}
