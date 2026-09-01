"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useStore } from "@/lib/store";
import { DashboardLayout } from "@/components/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { toast } from "sonner";
import { Entity } from "@/lib/mockData";
import { cn } from "@/lib/utils";
import { CoinsIcon, HistoryIcon, SettingsIcon, AlertTriangleIcon } from "lucide-react";

export default function BudgetPage() {
  const { currentUser, budgets, groceryEntries, setMonthlyBudget } = useStore();
  const router = useRouter();

  // Form States
  const [formEntity, setFormEntity] = useState<Entity>("Lahore");
  const [formMonth, setFormMonth] = useState("August");
  const [formYear, setFormYear] = useState("2026");
  const [amountStr, setAmountStr] = useState("");

  // Role Access Check
  useEffect(() => {
    if (currentUser && currentUser.role !== "ADMIN") {
      toast.error("Access denied. Admin permissions required.");
      router.push("/dashboard");
    }
  }, [currentUser, router]);

  // Load existing budget value in form if entity/month/year changes
  useEffect(() => {
    const existing = budgets.find(
      (b) => b.entity === formEntity && b.month === formMonth && b.year === parseInt(formYear)
    );
    if (existing) {
      setAmountStr(existing.amount.toString());
    } else {
      setAmountStr("");
    }
  }, [formEntity, formMonth, formYear, budgets]);

  if (!currentUser || currentUser.role !== "ADMIN") {
    return (
      <div className="flex h-screen w-screen flex-col items-center justify-center bg-slate-50 p-6">
        <div className="w-full max-w-md space-y-4">
          <Skeleton className="h-12 w-12 rounded-lg bg-gray-200" />
          <Skeleton className="h-6 w-3/4 bg-gray-200" />
        </div>
      </div>
    );
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const amount = parseFloat(amountStr);
    const year = parseInt(formYear);

    if (isNaN(amount) || amount <= 0) {
      toast.error("Please enter a valid positive budget amount.");
      return;
    }
    if (isNaN(year) || year < 2000 || year > 2100) {
      toast.error("Please enter a valid year (2000 - 2100).");
      return;
    }

    setMonthlyBudget(formEntity, formMonth, year, amount);
    toast.success(`Budget for ${formEntity} (${formMonth} ${year}) set to Rs. ${amount.toLocaleString()} successfully.`);
  };

  // Compile history items
  const budgetHistoryItems = budgets.map((b) => {
    // Calculate total spent for this budget scope (entity + month + year)
    const spent = groceryEntries
      .filter((entry) => {
        if (!entry.date) return false;
        const parts = entry.date.split("-");
        if (parts.length < 3) return false;
        const year = parseInt(parts[0], 10);
        const monthVal = parseInt(parts[1], 10);
        const months = [
          "January", "February", "March", "April", "May", "June",
          "July", "August", "September", "October", "November", "December"
        ];
        const monthName = months[monthVal - 1];
        
        const matchesMonth = monthName === b.month && year === b.year;
        return entry.entity === b.entity && matchesMonth;
      })
      .reduce((sum, entry) => sum + entry.amount, 0);

    const remaining = b.amount - spent;
    const isOverspent = remaining < 0;

    return {
      entity: b.entity,
      month: b.month,
      year: b.year,
      budget: b.amount,
      spent,
      remaining,
      isOverspent,
    };
  });

  // Sort history items: year desc, month desc, entity desc
  const sortedHistory = [...budgetHistoryItems].sort((x, y) => {
    if (x.year !== y.year) return y.year - x.year;
    // Simple month ordering
    const months = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
    const monthDiff = months.indexOf(y.month) - months.indexOf(x.month);
    if (monthDiff !== 0) return monthDiff;
    return x.entity.localeCompare(y.entity);
  });

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header Title */}
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-gray-900">Monthly Budget Management</h1>
          <p className="text-sm text-gray-500 font-medium mt-0.5">
            Set and manage monthly allocated grocery budgets for Lahore and Multan entities.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Budget Setting Form */}
          <Card className="border border-gray-200 bg-white shadow-2xs lg:col-span-4">
            <CardHeader>
              <CardTitle className="text-base font-bold text-gray-900 flex items-center gap-1.5">
                <CoinsIcon className="size-4 text-emerald-600" />
                Set Monthly Budget
              </CardTitle>
              <CardDescription className="text-xs text-gray-500 font-medium">
                Allocate a budget limit for a specific entity and month.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-4">
                {/* Entity */}
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="entity" className="text-xs font-semibold text-gray-700">Entity</Label>
                  <Select
                    value={formEntity}
                    onValueChange={(val) => setFormEntity((val as Entity) || "Lahore")}
                  >
                    <SelectTrigger id="entity" className="h-10 border-gray-200 text-sm font-semibold">
                      <SelectValue placeholder="Select Entity" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Lahore">Lahore Entity</SelectItem>
                      <SelectItem value="Multan">Multan Entity</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Month */}
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="month" className="text-xs font-semibold text-gray-700">Month</Label>
                  <Select value={formMonth} onValueChange={(val) => setFormMonth(val || "August")}>
                    <SelectTrigger id="month" className="h-10 border-gray-200 text-sm font-semibold">
                      <SelectValue placeholder="Select Month" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="January">January</SelectItem>
                      <SelectItem value="February">February</SelectItem>
                      <SelectItem value="March">March</SelectItem>
                      <SelectItem value="April">April</SelectItem>
                      <SelectItem value="May">May</SelectItem>
                      <SelectItem value="June">June</SelectItem>
                      <SelectItem value="July">July</SelectItem>
                      <SelectItem value="August">August</SelectItem>
                      <SelectItem value="September">September</SelectItem>
                      <SelectItem value="October">October</SelectItem>
                      <SelectItem value="November">November</SelectItem>
                      <SelectItem value="December">December</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Year */}
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="year" className="text-xs font-semibold text-gray-700">Year</Label>
                  <Input
                    id="year"
                    type="number"
                    value={formYear}
                    onChange={(e) => setFormYear(e.target.value)}
                    placeholder="2026"
                    className="h-10 border-gray-200 focus:border-emerald-500 focus:ring-emerald-500"
                    required
                  />
                </div>

                {/* Amount */}
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="budgetAmount" className="text-xs font-semibold text-gray-700">Monthly Budget Amount</Label>
                  <div className="relative">
                    <span className="absolute left-3 top-2.5 text-sm text-gray-400 font-semibold">Rs.</span>
                    <Input
                      id="budgetAmount"
                      type="number"
                      value={amountStr}
                      onChange={(e) => setAmountStr(e.target.value)}
                      placeholder="0.00"
                      className="pl-10 h-10 border-gray-200 focus:border-emerald-500 focus:ring-emerald-500"
                      required
                    />
                  </div>
                </div>

                {/* Submit button */}
                <Button
                  type="submit"
                  className="w-full h-10 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold shadow-xs transition-colors"
                >
                  Set Monthly Budget
                </Button>
              </form>
            </CardContent>
          </Card>

          {/* Budget History Table */}
          <Card className="border border-gray-200 bg-white shadow-2xs lg:col-span-8">
            <CardHeader>
              <CardTitle className="text-base font-bold text-gray-900 flex items-center gap-1.5">
                <HistoryIcon className="size-4 text-emerald-600" />
                Budget History & Tracking
              </CardTitle>
              <CardDescription className="text-xs text-gray-500 font-medium">
                Recalculated summary of allocated limits, actual expenses, and balances.
              </CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader className="bg-slate-50/75">
                    <TableRow className="border-b border-gray-200">
                      <TableHead className="text-xs font-bold text-gray-400">Entity</TableHead>
                      <TableHead className="text-xs font-bold text-gray-400">Month</TableHead>
                      <TableHead className="text-xs font-bold text-gray-400">Budget</TableHead>
                      <TableHead className="text-xs font-bold text-gray-400">Total Spent</TableHead>
                      <TableHead className="text-xs font-bold text-gray-400">Remaining</TableHead>
                      <TableHead className="text-right text-xs font-bold text-gray-400">Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {sortedHistory.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={6} className="h-32 text-center text-gray-400 text-sm">
                          No budgets set yet.
                        </TableCell>
                      </TableRow>
                    ) : (
                      sortedHistory.map((item, idx) => (
                        <TableRow key={idx} className="border-b border-gray-100 hover:bg-slate-50/20 text-sm">
                          <TableCell className="font-semibold text-gray-900">{item.entity}</TableCell>
                          <TableCell className="font-medium text-gray-700">
                            {item.month} {item.year}
                          </TableCell>
                          <TableCell className="font-bold text-gray-900">
                            Rs. {item.budget.toLocaleString()}
                          </TableCell>
                          <TableCell className="font-semibold text-emerald-600">
                            Rs. {item.spent.toLocaleString()}
                          </TableCell>
                          <TableCell className={cn("font-bold", item.isOverspent ? "text-red-600" : "text-gray-900")}>
                            {item.isOverspent ? "-" : ""}Rs. {Math.abs(item.remaining).toLocaleString()}
                          </TableCell>
                          <TableCell className="text-right">
                            {item.isOverspent ? (
                              <Badge className="bg-red-50 text-red-700 hover:bg-red-50 border border-red-100 font-bold text-[9px] rounded-sm uppercase">
                                Over Budget
                              </Badge>
                            ) : (
                              <Badge className="bg-emerald-50 text-emerald-700 hover:bg-emerald-50 border border-emerald-100 font-bold text-[9px] rounded-sm uppercase">
                                Active
                              </Badge>
                            )}
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </DashboardLayout>
  );
}
