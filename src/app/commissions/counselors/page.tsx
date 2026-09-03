"use client";

import React, { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { useStore } from "@/lib/store";
import { CommissionsLayout } from "@/components/commissions/CommissionsLayout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  UserPlusIcon,
  UsersIcon,
  Trash2Icon,
  Building2Icon,
  CheckCircle2Icon,
  Loader2Icon,
  BadgePercentIcon,
  PencilIcon,
  EyeIcon,
  MoreVerticalIcon,
  UserCheckIcon,
  BriefcaseIcon,
} from "lucide-react";
import {
  Entity,
  Counselor,
  COMMISSION_SERVICES,
  CommissionService,
  CounselorServiceCommissions,
  defaultServiceCommissions,
  defaultBmServiceCommissions,
} from "@/lib/mockData";

export default function CounselorsPage() {
  const { counselors, addCounselor, updateCounselor, deleteCounselor, activeEntity, switchEntity, currentUser } = useStore();
  const router = useRouter();
  const isAdmin = currentUser?.role === "ADMIN";

  // Strict branch isolation for non-admin users
  React.useEffect(() => {
    if (currentUser?.role === "ISQUAREBPO_USER") {
      toast.error("Commissions Module is not available for ISquareBPO entity.");
      router.push("/dashboard");
    } else if (currentUser?.role === "LAHORE_USER" && activeEntity !== "Lahore") {
      switchEntity("Lahore");
    } else if (currentUser?.role === "MULTAN_USER" && activeEntity !== "Multan") {
      switchEntity("Multan");
    }
  }, [currentUser, activeEntity, switchEntity, router]);

  // Modals state
  const [addModalOpen, setAddModalOpen] = useState(false);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [viewModalOpen, setViewModalOpen] = useState(false);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [selectedCounselor, setSelectedCounselor] = useState<Counselor | null>(null);

  // Active Tab in Modals ("counselor" | "bm")
  const [addActiveTab, setAddActiveTab] = useState<"counselor" | "bm">("counselor");
  const [editActiveTab, setEditActiveTab] = useState<"counselor" | "bm">("counselor");
  const [viewActiveTab, setViewActiveTab] = useState<"counselor" | "bm">("counselor");

  // Add Form State
  const [addName, setAddName] = useState("");
  const [addEntity, setAddEntity] = useState<Entity | "All">(isAdmin ? "All" : activeEntity);
  const [addServiceCommissions, setAddServiceCommissions] = useState<CounselorServiceCommissions>({
    ...defaultServiceCommissions,
  });
  const [addBmServiceCommissions, setAddBmServiceCommissions] = useState<CounselorServiceCommissions>({
    ...defaultBmServiceCommissions,
  });

  // Edit Form State
  const [editName, setEditName] = useState("");
  const [editEntity, setEditEntity] = useState<Entity | "All">("All");
  const [editServiceCommissions, setEditServiceCommissions] = useState<CounselorServiceCommissions>({});
  const [editBmServiceCommissions, setEditBmServiceCommissions] = useState<CounselorServiceCommissions>({});

  const [isSubmitting, setIsSubmitting] = useState(false);

  // Filter counselors visible to current user
  const visibleCounselors = useMemo(() => {
    if (currentUser?.role === "LAHORE_USER") {
      return counselors.filter((c) => c.entity === "Lahore" || c.entity === "All");
    }
    if (currentUser?.role === "MULTAN_USER") {
      return counselors.filter((c) => c.entity === "Multan" || c.entity === "All");
    }
    // Admin sees counselors for current activeEntity (or all)
    return counselors.filter(
      (c) => !c.entity || c.entity === "All" || c.entity === activeEntity
    );
  }, [counselors, currentUser, activeEntity]);

  // Handle service commission type toggle in Add Modal (Counselor)
  const handleAddCounselorTypeToggle = (service: CommissionService, type: "percentage" | "fixed") => {
    setAddServiceCommissions((prev) => ({
      ...prev,
      [service]: {
        type,
        value: prev[service]?.value ?? (type === "percentage" ? 10 : 5000),
      },
    }));
  };

  const handleAddCounselorValueChange = (service: CommissionService, val: number) => {
    setAddServiceCommissions((prev) => ({
      ...prev,
      [service]: {
        type: prev[service]?.type || "percentage",
        value: val,
      },
    }));
  };

  // Handle service commission type toggle in Add Modal (B.M)
  const handleAddBmTypeToggle = (service: CommissionService, type: "percentage" | "fixed") => {
    setAddBmServiceCommissions((prev) => ({
      ...prev,
      [service]: {
        type,
        value: prev[service]?.value ?? (type === "percentage" ? 5 : 2500),
      },
    }));
  };

  const handleAddBmValueChange = (service: CommissionService, val: number) => {
    setAddBmServiceCommissions((prev) => ({
      ...prev,
      [service]: {
        type: prev[service]?.type || "percentage",
        value: val,
      },
    }));
  };

  // Handle service commission type toggle in Edit Modal (Counselor)
  const handleEditCounselorTypeToggle = (service: CommissionService, type: "percentage" | "fixed") => {
    setEditServiceCommissions((prev) => ({
      ...prev,
      [service]: {
        type,
        value: prev[service]?.value ?? (type === "percentage" ? 10 : 5000),
      },
    }));
  };

  const handleEditCounselorValueChange = (service: CommissionService, val: number) => {
    setEditServiceCommissions((prev) => ({
      ...prev,
      [service]: {
        type: prev[service]?.type || "percentage",
        value: val,
      },
    }));
  };

  // Handle service commission type toggle in Edit Modal (B.M)
  const handleEditBmTypeToggle = (service: CommissionService, type: "percentage" | "fixed") => {
    setEditBmServiceCommissions((prev) => ({
      ...prev,
      [service]: {
        type,
        value: prev[service]?.value ?? (type === "percentage" ? 5 : 2500),
      },
    }));
  };

  const handleEditBmValueChange = (service: CommissionService, val: number) => {
    setEditBmServiceCommissions((prev) => ({
      ...prev,
      [service]: {
        type: prev[service]?.type || "percentage",
        value: val,
      },
    }));
  };

  // Submit Add Counselor
  const handleAddCounselor = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!addName.trim()) {
      toast.error("Please enter counselor full name.");
      return;
    }

    setIsSubmitting(true);
    try {
      await addCounselor({
        name: addName.trim(),
        entity: isAdmin ? addEntity : activeEntity,
        serviceCommissions: addServiceCommissions,
        bmServiceCommissions: addBmServiceCommissions,
      });

      setIsSubmitting(false);
      setAddModalOpen(false);
      setAddName("");
      setAddActiveTab("counselor");
      setAddServiceCommissions({ ...defaultServiceCommissions });
      setAddBmServiceCommissions({ ...defaultBmServiceCommissions });
      toast.success(`Counselor "${addName.trim()}" added with Counselor & B.M commission rates.`);
    } catch (err) {
      setIsSubmitting(false);
      toast.error("Failed to add counselor.");
    }
  };

  // Open Edit Counselor Modal
  const handleOpenEdit = (counselor: Counselor) => {
    setSelectedCounselor(counselor);
    setEditName(counselor.name);
    setEditEntity(counselor.entity || "All");
    setEditActiveTab("counselor");
    setEditServiceCommissions(counselor.serviceCommissions || { ...defaultServiceCommissions });
    setEditBmServiceCommissions(counselor.bmServiceCommissions || { ...defaultBmServiceCommissions });
    setEditModalOpen(true);
  };

  // Submit Edit Counselor
  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCounselor) return;
    if (!editName.trim()) {
      toast.error("Please enter counselor full name.");
      return;
    }

    setIsSubmitting(true);
    try {
      await updateCounselor(selectedCounselor.id, {
        name: editName.trim(),
        entity: isAdmin ? editEntity : activeEntity,
        serviceCommissions: editServiceCommissions,
        bmServiceCommissions: editBmServiceCommissions,
      });

      setIsSubmitting(false);
      setEditModalOpen(false);
      toast.success(`Counselor "${editName.trim()}" rates updated successfully.`);
    } catch (err) {
      setIsSubmitting(false);
      toast.error("Failed to update counselor.");
    }
  };

  // Open View Details Modal
  const handleOpenView = (counselor: Counselor) => {
    setSelectedCounselor(counselor);
    setViewActiveTab("counselor");
    setViewModalOpen(true);
  };

  // Open Delete Modal
  const handleOpenDelete = (counselor: Counselor) => {
    setSelectedCounselor(counselor);
    setDeleteModalOpen(true);
  };

  // Submit Delete Counselor
  const handleConfirmDelete = async () => {
    if (!selectedCounselor) return;
    setIsSubmitting(true);
    try {
      await deleteCounselor(selectedCounselor.id);
      setIsSubmitting(false);
      setDeleteModalOpen(false);
      toast.success(`Counselor "${selectedCounselor.name}" removed.`);
    } catch (err) {
      setIsSubmitting(false);
      toast.error("Failed to remove counselor.");
    }
  };

  return (
    <CommissionsLayout>
      <div className="space-y-6">
        {/* Header Block */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <Badge className="bg-emerald-100 text-emerald-800 border-emerald-200 text-xs font-semibold px-2.5 py-0.5">
                {activeEntity} Branch • Counselors
              </Badge>
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-gray-900">
              Branch Counselors & Commission Rates
            </h1>
            <p className="text-sm text-gray-500 font-medium mt-0.5">
              Manage counselors and configure both Counselor & Branch Manager (B.M) commission rules (% or Fixed Rs.).
            </p>
          </div>

          {isAdmin && (
            <Button
              onClick={() => setAddModalOpen(true)}
              className="bg-emerald-600 hover:bg-emerald-700 text-white font-semibold shadow-xs flex items-center gap-1.5 h-9 text-xs cursor-pointer"
            >
              <UserPlusIcon className="size-4" />
              Add New Counselor
            </Button>
          )}
        </div>

        {/* Quick Stats Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Card className="border border-gray-200 bg-white shadow-3xs">
            <CardContent className="p-5 flex items-center justify-between">
              <div>
                <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">Total Counselors</span>
                <span className="text-2xl font-black text-gray-900 block mt-1">{visibleCounselors.length}</span>
              </div>
              <div className="size-11 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
                <UsersIcon className="size-5" />
              </div>
            </CardContent>
          </Card>

          <Card className="border border-gray-200 bg-white shadow-3xs">
            <CardContent className="p-5 flex items-center justify-between">
              <div>
                <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">Active Branch</span>
                <span className="text-2xl font-black text-emerald-600 block mt-1 uppercase">{activeEntity}</span>
              </div>
              <div className="size-11 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
                <Building2Icon className="size-5" />
              </div>
            </CardContent>
          </Card>

          <Card className="border border-gray-200 bg-white shadow-3xs">
            <CardContent className="p-5 flex items-center justify-between">
              <div>
                <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">Commission Dual Setup</span>
                <span className="text-sm font-bold text-gray-900 flex items-center gap-1.5 mt-2">
                  <CheckCircle2Icon className="size-4 text-emerald-600" />
                  Counselor & B.M Configured
                </span>
              </div>
              <div className="size-11 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
                <BadgePercentIcon className="size-5" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Counselors Table with Services Rate List Directly Visible and 3-Dot Actions */}
        <Card className="border border-gray-200 bg-white shadow-2xs">
          <CardHeader className="pb-3 border-b border-gray-100">
            <CardTitle className="text-base font-bold text-gray-900 flex items-center gap-2">
              <UsersIcon className="size-4 text-emerald-600" />
              Registered Counselors Roster
            </CardTitle>
            <CardDescription className="text-xs text-gray-500 font-medium">
              List of counselors with configured Counselor Commission (C.C) and Branch Manager (B.M) rates.
            </CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader className="bg-slate-50/75">
                  <TableRow className="border-b border-gray-100">
                    <TableHead className="text-xs font-bold text-gray-400 whitespace-nowrap">Counselor Name</TableHead>
                    <TableHead className="text-xs font-bold text-gray-400 whitespace-nowrap">Assigned Branch</TableHead>
                    <TableHead className="text-xs font-bold text-gray-400 min-w-[320px]">Counselor Commission (C.C)</TableHead>
                    <TableHead className="text-xs font-bold text-gray-400 min-w-[320px]">Branch Manager (B.M)</TableHead>
                    <TableHead className="text-xs font-bold text-gray-400 whitespace-nowrap">Status</TableHead>
                    <TableHead className="text-right text-xs font-bold text-gray-400 whitespace-nowrap">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {visibleCounselors.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="h-40 text-center text-gray-400 text-xs">
                        No counselors found for {activeEntity} branch.
                      </TableCell>
                    </TableRow>
                  ) : (
                    visibleCounselors.map((c) => (
                      <TableRow key={c.id} className="border-b border-gray-100 hover:bg-slate-50/40 text-sm">
                        <TableCell className="font-bold text-gray-900 whitespace-nowrap">
                          {c.name}
                        </TableCell>
                        <TableCell className="whitespace-nowrap">
                          <Badge className="bg-emerald-50 text-emerald-700 border-emerald-100 text-[10px] font-semibold">
                            {c.entity || "All Branches"}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {/* Counselor Rates */}
                          <div className="flex flex-wrap gap-1.5 py-1">
                            {COMMISSION_SERVICES.map((srv) => {
                              const rule = c.serviceCommissions?.[srv] || { type: "percentage", value: 10 };
                              const isPct = rule.type === "percentage";
                              return (
                                <span
                                  key={srv}
                                  className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-medium bg-emerald-50/70 text-emerald-900 border border-emerald-200/60"
                                >
                                  <span className="text-gray-500 font-normal">{srv}:</span>
                                  <span className={`font-bold ${isPct ? "text-emerald-700" : "text-emerald-800"}`}>
                                    {isPct ? `${rule.value}%` : `Rs. ${rule.value.toLocaleString()}`}
                                  </span>
                                </span>
                              );
                            })}
                          </div>
                        </TableCell>
                        <TableCell>
                          {/* Branch Manager Rates */}
                          <div className="flex flex-wrap gap-1.5 py-1">
                            {COMMISSION_SERVICES.map((srv) => {
                              const rule = c.bmServiceCommissions?.[srv] || { type: "percentage", value: 5 };
                              const isPct = rule.type === "percentage";
                              return (
                                <span
                                  key={srv}
                                  className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-medium bg-blue-50/70 text-blue-900 border border-blue-200/60"
                                >
                                  <span className="text-gray-500 font-normal">{srv}:</span>
                                  <span className={`font-bold ${isPct ? "text-blue-700" : "text-blue-800"}`}>
                                    {isPct ? `${rule.value}%` : `Rs. ${rule.value.toLocaleString()}`}
                                  </span>
                                </span>
                              );
                            })}
                          </div>
                        </TableCell>
                        <TableCell className="whitespace-nowrap">
                          <Badge className="bg-emerald-100 text-emerald-800 border-none text-[10px] font-bold">
                            Active
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right whitespace-nowrap">
                          {/* 3-Dot Action Dropdown Menu */}
                          <DropdownMenu>
                            <DropdownMenuTrigger
                              render={
                                <Button
                                  variant="ghost"
                                  size="icon-sm"
                                  className="h-8 w-8 text-gray-500 hover:bg-gray-100 hover:text-gray-900 rounded-lg cursor-pointer"
                                />
                              }
                            >
                              <MoreVerticalIcon className="size-4" />
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="w-40 bg-white border border-gray-100 shadow-md rounded-lg">
                              <DropdownMenuItem onClick={() => handleOpenView(c)} className="cursor-pointer text-xs">
                                <EyeIcon className="size-3.5 mr-2 text-gray-400" />
                                View Details
                              </DropdownMenuItem>
                              {isAdmin && (
                                <>
                                  <DropdownMenuItem onClick={() => handleOpenEdit(c)} className="cursor-pointer text-xs">
                                    <PencilIcon className="size-3.5 mr-2 text-gray-400" />
                                    Edit Counselor
                                  </DropdownMenuItem>
                                  <DropdownMenuSeparator className="bg-gray-100" />
                                  <DropdownMenuItem onClick={() => handleOpenDelete(c)} className="text-red-600 focus:text-red-600 cursor-pointer text-xs">
                                    <Trash2Icon className="size-3.5 mr-2 text-red-500" />
                                    Delete
                                  </DropdownMenuItem>
                                </>
                              )}
                            </DropdownMenuContent>
                          </DropdownMenu>
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

      {/* 1. Add Counselor Modal with 2 Tabs (Counselor Commission & Branch Manager Commission) */}
      <Dialog open={addModalOpen} onOpenChange={setAddModalOpen}>
        <DialogContent className="sm:max-w-[580px] max-h-[92vh] overflow-y-auto bg-white p-6 rounded-2xl shadow-xl border border-gray-100">
          <DialogHeader className="pb-2 border-b border-gray-100">
            <div className="flex items-center gap-2">
              <div className="size-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
                <UserPlusIcon className="size-4" />
              </div>
              <div>
                <DialogTitle className="text-lg font-bold text-gray-900">
                  Add New Counselor
                </DialogTitle>
                <DialogDescription className="text-xs text-gray-500 font-medium">
                  Register counselor details and configure Counselor & B.M commission rates.
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>

          <form onSubmit={handleAddCounselor} className="space-y-4 pt-2">
            {/* Counselor Full Name */}
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="addCounselorName" className="text-xs font-semibold text-gray-700">
                Counselor Full Name <span className="text-red-500">*</span>
              </Label>
              <Input
                id="addCounselorName"
                placeholder="e.g. Sana Javed"
                value={addName}
                onChange={(e) => setAddName(e.target.value)}
                className="h-10 border-gray-200 focus:border-emerald-500 focus:ring-emerald-500 bg-white text-sm font-medium"
                required
              />
            </div>

            {/* Assigned Branch */}
            {isAdmin ? (
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="addCounselorBranch" className="text-xs font-semibold text-gray-700">
                  Assigned Branch
                </Label>
                <Select value={addEntity} onValueChange={(val) => setAddEntity(val as Entity | "All")}>
                  <SelectTrigger id="addCounselorBranch" className="h-10 border-gray-200 text-xs font-semibold bg-white">
                    <SelectValue placeholder="Select Branch" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="All">All Branches (Lahore & Multan)</SelectItem>
                    <SelectItem value="Lahore">Lahore Branch Only</SelectItem>
                    <SelectItem value="Multan">Multan Branch Only</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            ) : (
              <div className="flex flex-col gap-1.5">
                <Label className="text-xs font-semibold text-gray-700">Branch</Label>
                <div className="h-10 px-3 bg-slate-50 border border-gray-200 rounded-lg flex items-center text-xs font-bold text-emerald-800">
                  {activeEntity} Branch (Current User Branch)
                </div>
              </div>
            )}

            {/* Commission Tabs Switcher */}
            <div className="pt-2 border-t border-gray-100 space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-xs font-bold text-gray-900 flex items-center gap-1.5">
                    <BadgePercentIcon className="size-3.5 text-emerald-600" />
                    Commission Setup
                  </h3>
                  <p className="text-[11px] text-gray-500 font-medium">
                    Configure service rules for Counselor and Branch Manager.
                  </p>
                </div>
              </div>

              {/* Segmented Pill Tabs */}
              <div className="inline-flex w-full rounded-xl bg-slate-100 p-1 border border-gray-200">
                <button
                  type="button"
                  onClick={() => setAddActiveTab("counselor")}
                  className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                    addActiveTab === "counselor"
                      ? "bg-white text-emerald-800 shadow-sm border border-gray-200/60"
                      : "text-gray-500 hover:text-gray-900"
                  }`}
                >
                  <UserCheckIcon className="size-3.5" />
                  Counselor Commission
                </button>
                <button
                  type="button"
                  onClick={() => setAddActiveTab("bm")}
                  className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                    addActiveTab === "bm"
                      ? "bg-white text-blue-800 shadow-sm border border-gray-200/60"
                      : "text-gray-500 hover:text-gray-900"
                  }`}
                >
                  <BriefcaseIcon className="size-3.5" />
                  Branch Manager Commission
                </button>
              </div>

              {/* Tab 1: Counselor Commission */}
              {addActiveTab === "counselor" && (
                <div className="space-y-2.5 max-h-[280px] overflow-y-auto pr-1">
                  {COMMISSION_SERVICES.map((srv) => {
                    const rule = addServiceCommissions[srv] || { type: "percentage", value: 10 };
                    const isPercentage = rule.type === "percentage";

                    return (
                      <div
                        key={srv}
                        className="p-3 bg-slate-50/80 border border-gray-200/80 rounded-xl space-y-2 hover:border-emerald-200 transition-colors"
                      >
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                          <span className="text-xs font-bold text-gray-800">{srv}</span>

                          {/* 2 Options: By Percentage or By Fixed Amount */}
                          <div className="inline-flex rounded-lg p-0.5 bg-gray-200/80 shrink-0">
                            <button
                              type="button"
                              onClick={() => handleAddCounselorTypeToggle(srv, "percentage")}
                              className={`px-2.5 py-1 text-[10px] font-bold rounded-md transition-all cursor-pointer ${
                                isPercentage
                                  ? "bg-emerald-600 text-white shadow-xs"
                                  : "text-gray-600 hover:text-gray-900"
                              }`}
                            >
                              By Percentage
                            </button>
                            <button
                              type="button"
                              onClick={() => handleAddCounselorTypeToggle(srv, "fixed")}
                              className={`px-2.5 py-1 text-[10px] font-bold rounded-md transition-all cursor-pointer ${
                                !isPercentage
                                  ? "bg-emerald-600 text-white shadow-xs"
                                  : "text-gray-600 hover:text-gray-900"
                              }`}
                            >
                              By Fixed Amount
                            </button>
                          </div>
                        </div>

                        {/* Input with Fixed Mark */}
                        <div className="relative">
                          {isPercentage ? (
                            <>
                              <Input
                                type="number"
                                placeholder="e.g. 10"
                                value={rule.value || ""}
                                onChange={(e) => handleAddCounselorValueChange(srv, parseFloat(e.target.value) || 0)}
                                className="pr-9 h-8 border-gray-200 focus:border-emerald-500 focus:ring-emerald-500 bg-white text-xs font-bold text-emerald-800"
                              />
                              <span className="absolute right-3 top-2 text-xs font-black text-gray-500 select-none pointer-events-none">
                                %
                              </span>
                            </>
                          ) : (
                            <>
                              <span className="absolute left-3 top-2 text-xs font-bold text-gray-500 select-none pointer-events-none">
                                Rs.
                              </span>
                              <Input
                                type="number"
                                placeholder="e.g. 5000"
                                value={rule.value || ""}
                                onChange={(e) => handleAddCounselorValueChange(srv, parseFloat(e.target.value) || 0)}
                                className="pl-9 h-8 border-gray-200 focus:border-emerald-500 focus:ring-emerald-500 bg-white text-xs font-bold text-gray-900"
                              />
                            </>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Tab 2: Branch Manager Commission */}
              {addActiveTab === "bm" && (
                <div className="space-y-2.5 max-h-[280px] overflow-y-auto pr-1">
                  {COMMISSION_SERVICES.map((srv) => {
                    const rule = addBmServiceCommissions[srv] || { type: "percentage", value: 5 };
                    const isPercentage = rule.type === "percentage";

                    return (
                      <div
                        key={srv}
                        className="p-3 bg-blue-50/40 border border-blue-200/60 rounded-xl space-y-2 hover:border-blue-300 transition-colors"
                      >
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                          <span className="text-xs font-bold text-gray-800">{srv}</span>

                          {/* 2 Options: By Percentage or By Fixed Amount */}
                          <div className="inline-flex rounded-lg p-0.5 bg-gray-200/80 shrink-0">
                            <button
                              type="button"
                              onClick={() => handleAddBmTypeToggle(srv, "percentage")}
                              className={`px-2.5 py-1 text-[10px] font-bold rounded-md transition-all cursor-pointer ${
                                isPercentage
                                  ? "bg-blue-600 text-white shadow-xs"
                                  : "text-gray-600 hover:text-gray-900"
                              }`}
                            >
                              By Percentage
                            </button>
                            <button
                              type="button"
                              onClick={() => handleAddBmTypeToggle(srv, "fixed")}
                              className={`px-2.5 py-1 text-[10px] font-bold rounded-md transition-all cursor-pointer ${
                                !isPercentage
                                  ? "bg-blue-600 text-white shadow-xs"
                                  : "text-gray-600 hover:text-gray-900"
                              }`}
                            >
                              By Fixed Amount
                            </button>
                          </div>
                        </div>

                        {/* Input with Fixed Mark */}
                        <div className="relative">
                          {isPercentage ? (
                            <>
                              <Input
                                type="number"
                                placeholder="e.g. 5"
                                value={rule.value || ""}
                                onChange={(e) => handleAddBmValueChange(srv, parseFloat(e.target.value) || 0)}
                                className="pr-9 h-8 border-gray-200 focus:border-blue-500 focus:ring-blue-500 bg-white text-xs font-bold text-blue-800"
                              />
                              <span className="absolute right-3 top-2 text-xs font-black text-gray-500 select-none pointer-events-none">
                                %
                              </span>
                            </>
                          ) : (
                            <>
                              <span className="absolute left-3 top-2 text-xs font-bold text-gray-500 select-none pointer-events-none">
                                Rs.
                              </span>
                              <Input
                                type="number"
                                placeholder="e.g. 2500"
                                value={rule.value || ""}
                                onChange={(e) => handleAddBmValueChange(srv, parseFloat(e.target.value) || 0)}
                                className="pl-9 h-8 border-gray-200 focus:border-blue-500 focus:ring-blue-500 bg-white text-xs font-bold text-gray-900"
                              />
                            </>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            <DialogFooter className="pt-3 border-t border-gray-100 flex gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setAddModalOpen(false)}
                disabled={isSubmitting}
                className="h-10 border-gray-200 text-xs font-semibold hover:bg-gray-50 text-gray-700 cursor-pointer"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={isSubmitting}
                className="h-10 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs transition-colors cursor-pointer shadow-xs"
              >
                {isSubmitting ? (
                  <>
                    <Loader2Icon className="size-3.5 mr-1.5 animate-spin" />
                    Adding...
                  </>
                ) : (
                  "Add Counselor"
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* 2. Edit Counselor Modal with 2 Tabs */}
      <Dialog open={editModalOpen} onOpenChange={setEditModalOpen}>
        <DialogContent className="sm:max-w-[580px] max-h-[92vh] overflow-y-auto bg-white p-6 rounded-2xl shadow-xl border border-gray-100">
          <DialogHeader className="pb-2 border-b border-gray-100">
            <div className="flex items-center gap-2">
              <div className="size-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
                <PencilIcon className="size-4" />
              </div>
              <div>
                <DialogTitle className="text-lg font-bold text-gray-900">
                  Edit Counselor & Commission Rates
                </DialogTitle>
                <DialogDescription className="text-xs text-gray-500 font-medium">
                  Update counselor name, assigned branch, and Counselor & B.M commission rates.
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>

          <form onSubmit={handleSaveEdit} className="space-y-4 pt-2">
            {/* Counselor Full Name */}
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="editCounselorName" className="text-xs font-semibold text-gray-700">
                Counselor Full Name <span className="text-red-500">*</span>
              </Label>
              <Input
                id="editCounselorName"
                placeholder="e.g. Sana Javed"
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                className="h-10 border-gray-200 focus:border-emerald-500 focus:ring-emerald-500 bg-white text-sm font-medium"
                required
              />
            </div>

            {/* Assigned Branch */}
            {isAdmin ? (
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="editCounselorBranch" className="text-xs font-semibold text-gray-700">
                  Assigned Branch
                </Label>
                <Select value={editEntity} onValueChange={(val) => setEditEntity(val as Entity | "All")}>
                  <SelectTrigger id="editCounselorBranch" className="h-10 border-gray-200 text-xs font-semibold bg-white">
                    <SelectValue placeholder="Select Branch" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="All">All Branches (Lahore & Multan)</SelectItem>
                    <SelectItem value="Lahore">Lahore Branch Only</SelectItem>
                    <SelectItem value="Multan">Multan Branch Only</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            ) : (
              <div className="flex flex-col gap-1.5">
                <Label className="text-xs font-semibold text-gray-700">Branch</Label>
                <div className="h-10 px-3 bg-slate-50 border border-gray-200 rounded-lg flex items-center text-xs font-bold text-emerald-800">
                  {activeEntity} Branch (Current User Branch)
                </div>
              </div>
            )}

            {/* Commission Tabs Switcher */}
            <div className="pt-2 border-t border-gray-100 space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-xs font-bold text-gray-900 flex items-center gap-1.5">
                    <BadgePercentIcon className="size-3.5 text-emerald-600" />
                    Commission Setup
                  </h3>
                  <p className="text-[11px] text-gray-500 font-medium">
                    Modify calculation rules for Counselor and Branch Manager.
                  </p>
                </div>
              </div>

              {/* Segmented Pill Tabs */}
              <div className="inline-flex w-full rounded-xl bg-slate-100 p-1 border border-gray-200">
                <button
                  type="button"
                  onClick={() => setEditActiveTab("counselor")}
                  className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                    editActiveTab === "counselor"
                      ? "bg-white text-emerald-800 shadow-sm border border-gray-200/60"
                      : "text-gray-500 hover:text-gray-900"
                  }`}
                >
                  <UserCheckIcon className="size-3.5" />
                  Counselor Commission
                </button>
                <button
                  type="button"
                  onClick={() => setEditActiveTab("bm")}
                  className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                    editActiveTab === "bm"
                      ? "bg-white text-blue-800 shadow-sm border border-gray-200/60"
                      : "text-gray-500 hover:text-gray-900"
                  }`}
                >
                  <BriefcaseIcon className="size-3.5" />
                  Branch Manager Commission
                </button>
              </div>

              {/* Tab 1: Counselor Commission */}
              {editActiveTab === "counselor" && (
                <div className="space-y-2.5 max-h-[280px] overflow-y-auto pr-1">
                  {COMMISSION_SERVICES.map((srv) => {
                    const rule = editServiceCommissions[srv] || { type: "percentage", value: 10 };
                    const isPercentage = rule.type === "percentage";

                    return (
                      <div
                        key={srv}
                        className="p-3 bg-slate-50/80 border border-gray-200/80 rounded-xl space-y-2"
                      >
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                          <span className="text-xs font-bold text-gray-800">{srv}</span>

                          <div className="inline-flex rounded-lg p-0.5 bg-gray-200/80 shrink-0">
                            <button
                              type="button"
                              onClick={() => handleEditCounselorTypeToggle(srv, "percentage")}
                              className={`px-2.5 py-1 text-[10px] font-bold rounded-md transition-all cursor-pointer ${
                                isPercentage
                                  ? "bg-emerald-600 text-white shadow-xs"
                                  : "text-gray-600 hover:text-gray-900"
                              }`}
                            >
                              By Percentage
                            </button>
                            <button
                              type="button"
                              onClick={() => handleEditCounselorTypeToggle(srv, "fixed")}
                              className={`px-2.5 py-1 text-[10px] font-bold rounded-md transition-all cursor-pointer ${
                                !isPercentage
                                  ? "bg-emerald-600 text-white shadow-xs"
                                  : "text-gray-600 hover:text-gray-900"
                              }`}
                            >
                              By Fixed Amount
                            </button>
                          </div>
                        </div>

                        <div className="relative">
                          {isPercentage ? (
                            <>
                              <Input
                                type="number"
                                placeholder="e.g. 10"
                                value={rule.value || ""}
                                onChange={(e) => handleEditCounselorValueChange(srv, parseFloat(e.target.value) || 0)}
                                className="pr-9 h-8 border-gray-200 focus:border-emerald-500 focus:ring-emerald-500 bg-white text-xs font-bold text-emerald-800"
                              />
                              <span className="absolute right-3 top-2 text-xs font-black text-gray-500 select-none pointer-events-none">
                                %
                              </span>
                            </>
                          ) : (
                            <>
                              <span className="absolute left-3 top-2 text-xs font-bold text-gray-500 select-none pointer-events-none">
                                Rs.
                              </span>
                              <Input
                                type="number"
                                placeholder="e.g. 5000"
                                value={rule.value || ""}
                                onChange={(e) => handleEditCounselorValueChange(srv, parseFloat(e.target.value) || 0)}
                                className="pl-9 h-8 border-gray-200 focus:border-emerald-500 focus:ring-emerald-500 bg-white text-xs font-bold text-gray-900"
                              />
                            </>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Tab 2: Branch Manager Commission */}
              {editActiveTab === "bm" && (
                <div className="space-y-2.5 max-h-[280px] overflow-y-auto pr-1">
                  {COMMISSION_SERVICES.map((srv) => {
                    const rule = editBmServiceCommissions[srv] || { type: "percentage", value: 5 };
                    const isPercentage = rule.type === "percentage";

                    return (
                      <div
                        key={srv}
                        className="p-3 bg-blue-50/40 border border-blue-200/60 rounded-xl space-y-2"
                      >
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                          <span className="text-xs font-bold text-gray-800">{srv}</span>

                          <div className="inline-flex rounded-lg p-0.5 bg-gray-200/80 shrink-0">
                            <button
                              type="button"
                              onClick={() => handleEditBmTypeToggle(srv, "percentage")}
                              className={`px-2.5 py-1 text-[10px] font-bold rounded-md transition-all cursor-pointer ${
                                isPercentage
                                  ? "bg-blue-600 text-white shadow-xs"
                                  : "text-gray-600 hover:text-gray-900"
                              }`}
                            >
                              By Percentage
                            </button>
                            <button
                              type="button"
                              onClick={() => handleEditBmTypeToggle(srv, "fixed")}
                              className={`px-2.5 py-1 text-[10px] font-bold rounded-md transition-all cursor-pointer ${
                                !isPercentage
                                  ? "bg-blue-600 text-white shadow-xs"
                                  : "text-gray-600 hover:text-gray-900"
                              }`}
                            >
                              By Fixed Amount
                            </button>
                          </div>
                        </div>

                        <div className="relative">
                          {isPercentage ? (
                            <>
                              <Input
                                type="number"
                                placeholder="e.g. 5"
                                value={rule.value || ""}
                                onChange={(e) => handleEditBmValueChange(srv, parseFloat(e.target.value) || 0)}
                                className="pr-9 h-8 border-gray-200 focus:border-blue-500 focus:ring-blue-500 bg-white text-xs font-bold text-blue-800"
                              />
                              <span className="absolute right-3 top-2 text-xs font-black text-gray-500 select-none pointer-events-none">
                                %
                              </span>
                            </>
                          ) : (
                            <>
                              <span className="absolute left-3 top-2 text-xs font-bold text-gray-500 select-none pointer-events-none">
                                Rs.
                              </span>
                              <Input
                                type="number"
                                placeholder="e.g. 2500"
                                value={rule.value || ""}
                                onChange={(e) => handleEditBmValueChange(srv, parseFloat(e.target.value) || 0)}
                                className="pl-9 h-8 border-gray-200 focus:border-blue-500 focus:ring-blue-500 bg-white text-xs font-bold text-gray-900"
                              />
                            </>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            <DialogFooter className="pt-3 border-t border-gray-100 flex gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setEditModalOpen(false)}
                disabled={isSubmitting}
                className="h-10 border-gray-200 text-xs font-semibold hover:bg-gray-50 text-gray-700 cursor-pointer"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={isSubmitting}
                className="h-10 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs transition-colors cursor-pointer shadow-xs"
              >
                {isSubmitting ? (
                  <>
                    <Loader2Icon className="size-3.5 mr-1.5 animate-spin" />
                    Saving...
                  </>
                ) : (
                  "Save Changes"
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* 3. View Counselor Details Modal with 2 Tabs */}
      <Dialog open={viewModalOpen} onOpenChange={setViewModalOpen}>
        <DialogContent className="sm:max-w-[540px] max-h-[90vh] overflow-y-auto bg-white p-6 rounded-2xl shadow-xl border border-gray-100">
          <DialogHeader className="pb-3 border-b border-gray-100">
            <div className="flex items-center gap-2">
              <div className="size-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
                <UserCheckIcon className="size-4" />
              </div>
              <div>
                <DialogTitle className="text-lg font-bold text-gray-900">
                  {selectedCounselor?.name}
                </DialogTitle>
                <DialogDescription className="text-xs text-gray-500 font-medium">
                  {selectedCounselor?.entity || "All"} Branch • Counselor Profile & Rates
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>

          <div className="space-y-4 pt-2 text-xs">
            <div className="flex justify-between py-1.5 border-b border-gray-100">
              <span className="text-gray-500 font-medium">Assigned Branch:</span>
              <Badge className="bg-emerald-50 text-emerald-700 border-emerald-100 font-bold">
                {selectedCounselor?.entity || "All Branches"}
              </Badge>
            </div>

            {/* View Tabs Switcher */}
            <div className="inline-flex w-full rounded-xl bg-slate-100 p-1 border border-gray-200">
              <button
                type="button"
                onClick={() => setViewActiveTab("counselor")}
                className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                  viewActiveTab === "counselor"
                    ? "bg-white text-emerald-800 shadow-sm border border-gray-200/60"
                    : "text-gray-500 hover:text-gray-900"
                }`}
              >
                <UserCheckIcon className="size-3.5" />
                Counselor Commission
              </button>
              <button
                type="button"
                onClick={() => setViewActiveTab("bm")}
                className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                  viewActiveTab === "bm"
                    ? "bg-white text-blue-800 shadow-sm border border-gray-200/60"
                    : "text-gray-500 hover:text-gray-900"
                }`}
              >
                <BriefcaseIcon className="size-3.5" />
                Branch Manager Commission
              </button>
            </div>

            {viewActiveTab === "counselor" ? (
              <div className="space-y-2">
                <h4 className="font-bold text-gray-800 flex items-center gap-1.5">
                  <UserCheckIcon className="size-3.5 text-emerald-600" />
                  Counselor Service Commission Matrix:
                </h4>
                <div className="grid grid-cols-1 gap-2 bg-emerald-50/40 p-3 rounded-xl border border-emerald-100">
                  {COMMISSION_SERVICES.map((srv) => {
                    const rule = selectedCounselor?.serviceCommissions?.[srv] || { type: "percentage", value: 10 };
                    const isPct = rule.type === "percentage";
                    return (
                      <div key={srv} className="flex items-center justify-between text-xs py-1 border-b border-emerald-100 last:border-0">
                        <span className="font-medium text-gray-700">{srv}</span>
                        <span className={`font-black ${isPct ? "text-emerald-700" : "text-emerald-800"}`}>
                          {isPct ? `${rule.value}% (Percentage)` : `Rs. ${rule.value.toLocaleString()} (Fixed Amount)`}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            ) : (
              <div className="space-y-2">
                <h4 className="font-bold text-gray-800 flex items-center gap-1.5">
                  <BriefcaseIcon className="size-3.5 text-blue-600" />
                  Branch Manager (B.M) Commission Matrix:
                </h4>
                <div className="grid grid-cols-1 gap-2 bg-blue-50/40 p-3 rounded-xl border border-blue-100">
                  {COMMISSION_SERVICES.map((srv) => {
                    const rule = selectedCounselor?.bmServiceCommissions?.[srv] || { type: "percentage", value: 5 };
                    const isPct = rule.type === "percentage";
                    return (
                      <div key={srv} className="flex items-center justify-between text-xs py-1 border-b border-blue-100 last:border-0">
                        <span className="font-medium text-gray-700">{srv}</span>
                        <span className={`font-black ${isPct ? "text-blue-700" : "text-blue-800"}`}>
                          {isPct ? `${rule.value}% (Percentage)` : `Rs. ${rule.value.toLocaleString()} (Fixed Amount)`}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          <DialogFooter className="pt-3 border-t border-gray-100 flex justify-end">
            <Button
              type="button"
              onClick={() => setViewModalOpen(false)}
              className="h-9 px-4 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold rounded-lg cursor-pointer"
            >
              Close Details
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 4. Delete Counselor Confirmation Dialog */}
      <AlertDialog open={deleteModalOpen} onOpenChange={setDeleteModalOpen}>
        <AlertDialogContent className="sm:max-w-[420px] bg-white p-6 rounded-2xl shadow-xl border border-gray-100">
          <AlertDialogHeader>
            <div className="size-11 rounded-full bg-red-50 text-red-600 flex items-center justify-center mb-2 mx-auto sm:mx-0">
              <Trash2Icon className="size-5" />
            </div>
            <AlertDialogTitle className="text-base font-bold text-gray-900">
              Remove Counselor
            </AlertDialogTitle>
            <AlertDialogDescription className="text-xs text-gray-600">
              Are you sure you want to remove counselor <strong>{selectedCounselor?.name}</strong>? They will no longer appear in commission selection dropdowns.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="mt-4 flex gap-2">
            <AlertDialogCancel
              disabled={isSubmitting}
              className="h-9 border-gray-200 text-xs font-semibold hover:bg-gray-50 text-gray-700 cursor-pointer"
            >
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault();
                handleConfirmDelete();
              }}
              disabled={isSubmitting}
              className="h-9 bg-red-600 hover:bg-red-700 text-white font-semibold text-xs transition-colors cursor-pointer shadow-xs"
            >
              {isSubmitting ? (
                <>
                  <Loader2Icon className="size-3.5 mr-1.5 animate-spin" />
                  Removing...
                </>
              ) : (
                "Remove Counselor"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </CommissionsLayout>
  );
}
