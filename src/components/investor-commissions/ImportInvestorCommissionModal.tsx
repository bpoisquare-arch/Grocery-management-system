"use client";

import React, { useState, useRef } from "react";
import * as XLSX from "xlsx";
import {
  UploadIcon,
  FileSpreadsheetIcon,
  CheckCircle2Icon,
  AlertTriangleIcon,
  DownloadIcon,
  Loader2Icon,
  XIcon,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { toast } from "sonner";
import { InvestorCommissionEntry } from "@/lib/investorCommissionsTypes";

interface ImportInvestorCommissionModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  existingEntries: InvestorCommissionEntry[];
  onImport: (rows: any[]) => Promise<any>;
}

interface ParsedRow {
  index: number;
  studentName: string;
  passportNo: string;
  date: string;
  amount: number;
  commissionRate: number;
  investorCommission: number;
  receivableCommissionRate: number;
  receivableAmount: number;
  payableCommissionRate: number;
  payableAmount: number;
  statementDays?: number | null;
  accountNo: string;
  reimbursed: string;
  isDuplicate: boolean;
  duplicateReason?: string;
}

export function ImportInvestorCommissionModal({
  open,
  onOpenChange,
  existingEntries,
  onImport,
}: ImportInvestorCommissionModalProps) {
  const [fileName, setFileName] = useState("");
  const [parsedRows, setParsedRows] = useState<ParsedRow[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const existingPassportSet = new Set(
    existingEntries.map((e) => e.passportNo.trim().toUpperCase())
  );

  const resetState = () => {
    setFileName("");
    setParsedRows([]);
    setIsProcessing(false);
    setIsImporting(false);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setFileName(file.name);
    setIsProcessing(true);

    try {
      const buffer = await file.arrayBuffer();
      const workbook = XLSX.read(buffer, { type: "array" });
      const firstSheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[firstSheetName];

      const rawJson: any[][] = XLSX.utils.sheet_to_json(worksheet, {
        header: 1,
        defval: "",
      });

      if (!rawJson || rawJson.length === 0) {
        toast.error("The selected file is empty.");
        setIsProcessing(false);
        return;
      }

      // Find header row containing Student Name or Passport
      let headerRowIndex = 0;
      for (let r = 0; r < Math.min(rawJson.length, 5); r++) {
        const row = rawJson[r];
        if (
          row &&
          row.some((cell) => {
            const str = String(cell || "").toLowerCase();
            return str.includes("student") || str.includes("passport");
          })
        ) {
          headerRowIndex = r;
          break;
        }
      }

      const headers = rawJson[headerRowIndex].map((h) => String(h || "").trim().toLowerCase());
      const studentNameIdx = headers.findIndex((h) => h.includes("student") || h.includes("name"));
      const passportIdx = headers.findIndex((h) => h.includes("passport"));
      const dateIdx = headers.findIndex((h) => h.includes("date"));
      const amountIdx = headers.findIndex((h) => h.includes("amount") || h.includes("fee"));
      const recRateIdx = headers.findIndex((h) => h.includes("receivable") || h.includes("percent") || h.includes("rate") || h.includes("commission %"));
      const payRateIdx = headers.findIndex((h) => h.includes("payable"));
      const daysIdx = headers.findIndex((h) => h.includes("day") || h.includes("statement"));
      const accountIdx = headers.findIndex((h) => h.includes("account"));
      const reimbursedIdx = headers.findIndex((h) => h.includes("paid") || h.includes("investor") || h.includes("reimburs"));

      const rows: ParsedRow[] = [];
      const seenInFile = new Set<string>();

      for (let r = headerRowIndex + 1; r < rawJson.length; r++) {
        const row = rawJson[r];
        if (!row || row.length === 0) continue;

        const rawName = studentNameIdx !== -1 ? row[studentNameIdx] : row[1];
        const rawPassport = passportIdx !== -1 ? row[passportIdx] : row[2];
        const rawDate = dateIdx !== -1 ? row[dateIdx] : row[3];
        const rawAmount = amountIdx !== -1 ? row[amountIdx] : row[4];
        const rawRecRate = recRateIdx !== -1 ? row[recRateIdx] : row[5];
        const rawPayRate = payRateIdx !== -1 ? row[payRateIdx] : 0;
        const rawDays = daysIdx !== -1 ? row[daysIdx] : null;
        const rawAccount = accountIdx !== -1 ? row[accountIdx] : "";
        const rawReimbursed = reimbursedIdx !== -1 ? row[reimbursedIdx] : row[7];

        const studentName = String(rawName || "").trim();
        const passportNo = String(rawPassport || "").trim().toUpperCase();

        if (!studentName && !passportNo) continue;

        // Parse date
        let dateStr = "";
        if (typeof rawDate === "number") {
          const dateObj = XLSX.SSF.parse_date_code(rawDate);
          if (dateObj) {
            dateStr = `${dateObj.y}-${String(dateObj.m).padStart(2, "0")}-${String(dateObj.d).padStart(2, "0")}`;
          }
        } else {
          const rawStr = String(rawDate || "").trim();
          if (/^\d{1,2}\/\d{1,2}\/\d{4}$/.test(rawStr)) {
            const [d, m, y] = rawStr.split("/");
            dateStr = `${y}-${m.padStart(2, "0")}-${d.padStart(2, "0")}`;
          } else if (/^\d{4}-\d{2}-\d{2}$/.test(rawStr)) {
            dateStr = rawStr;
          } else {
            dateStr = new Date().toISOString().split("T")[0];
          }
        }

        const amount = parseFloat(rawAmount) || 0;
        const receivableCommissionRate = (rawRecRate !== undefined && rawRecRate !== null && rawRecRate !== "") ? parseFloat(rawRecRate) : 4.0;
        const receivableAmount = Math.round((amount * (receivableCommissionRate / 100)) * 100) / 100;
        const payableCommissionRate = (rawPayRate !== undefined && rawPayRate !== null && rawPayRate !== "") ? parseFloat(rawPayRate) : 0.0;
        const payableAmount = Math.round((amount * (payableCommissionRate / 100)) * 100) / 100;
        const statementDays = rawDays !== null && rawDays !== undefined && rawDays !== "" ? parseInt(String(rawDays), 10) || null : null;
        const accountNo = String(rawAccount || "").trim();
        const reimbursed = String(rawReimbursed || "No").toLowerCase().startsWith("y") ? "Yes" : "No";

        let isDuplicate = false;
        let duplicateReason = "";

        if (existingPassportSet.has(passportNo)) {
          isDuplicate = true;
          duplicateReason = "Passport already exists in system records";
        } else if (seenInFile.has(passportNo)) {
          isDuplicate = true;
          duplicateReason = "Passport appears multiple times in file";
        } else {
          seenInFile.add(passportNo);
        }

        rows.push({
          index: rows.length + 1,
          studentName,
          passportNo,
          date: dateStr,
          amount,
          commissionRate: receivableCommissionRate,
          investorCommission: receivableAmount,
          receivableCommissionRate,
          receivableAmount,
          payableCommissionRate,
          payableAmount,
          statementDays,
          accountNo,
          reimbursed,
          isDuplicate,
          duplicateReason,
        });
      }

      setParsedRows(rows);
      if (rows.length === 0) {
        toast.warning("No student records recognized in file.");
      } else {
        toast.success(`Parsed ${rows.length} records from Excel.`);
      }
    } catch (err: any) {
      console.error(err);
      toast.error("Failed to parse file: " + err.message);
    } finally {
      setIsProcessing(false);
    }
  };

  const validRows = parsedRows.filter((r) => !r.isDuplicate && r.studentName && r.passportNo);
  const duplicateCount = parsedRows.filter((r) => r.isDuplicate).length;

  const handleConfirmImport = async () => {
    if (validRows.length === 0) {
      toast.error("No valid non-duplicate records to import.");
      return;
    }

    setIsImporting(true);
    try {
      const payload = validRows.map((r) => ({
        studentName: r.studentName,
        passportNo: r.passportNo,
        date: r.date,
        amount: r.amount,
        commissionRate: r.receivableCommissionRate,
        investorCommission: r.receivableAmount,
        receivableCommissionRate: r.receivableCommissionRate,
        receivableAmount: r.receivableAmount,
        payableCommissionRate: r.payableCommissionRate,
        payableAmount: r.payableAmount,
        statementDays: r.statementDays,
        accountNo: r.accountNo,
        reimbursed: r.reimbursed,
      }));

      await onImport(payload);
      toast.success(`Successfully imported ${validRows.length} student records.`);
      onOpenChange(false);
      resetState();
    } catch (err: any) {
      toast.error("Import failed: " + err.message);
    } finally {
      setIsImporting(false);
    }
  };

  const downloadSampleTemplate = () => {
    const sample = [
      ["Investors Commissions"],
      ["S.No.", "Student Name", "Passport No.", "Date", "Amount", "Receivable Commission %", "Payable Commission %", "Statement Days", "Account No", "Paid to Investor"],
      [1, "M Mohsin Wakeel", "AU6309431", "23/06/2026", 100000, 4.0, 0.0, 30, "0123456789", "No"],
      [2, "Mudassar Ijaz khokar", "WV4166251", "24/06/2026", 150000, 4.0, 0.0, 60, "9876543210", "No"],
      [3, "M Absaar Aqeel", "AQ1305932", "27/07/2026", 80000, 4.0, 0.0, null, "", "No"],
    ];
    const ws = XLSX.utils.aoa_to_sheet(sample);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Students");
    XLSX.writeFile(wb, "Investors_Commissions_Template.xlsx");
    toast.success("Sample template downloaded.");
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-4xl w-[95vw] bg-white p-5 md:p-7 rounded-2xl ring-1 ring-black/5 shadow-2xl max-h-[92vh] flex flex-col">
        <DialogHeader className="pb-3 border-b border-gray-100 flex flex-row items-center justify-between">
          <div>
            <DialogTitle className="text-lg md:text-xl font-bold text-gray-900">
              Import Investors Commissions (Excel / CSV)
            </DialogTitle>
            <DialogDescription className="text-xs text-gray-500 mt-0.5">
              Bulk import student entries with commission rates, account numbers, and duplicate passport detection.
            </DialogDescription>
          </div>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={downloadSampleTemplate}
            className="h-8 text-xs font-semibold gap-1.5 border-emerald-300 text-emerald-700 bg-emerald-50/50 hover:bg-emerald-100"
          >
            <DownloadIcon className="size-3.5" />
            <span>Sample Template</span>
          </Button>
        </DialogHeader>

        {parsedRows.length === 0 ? (
          <div className="py-10 flex flex-col items-center justify-center">
            <input
              ref={fileInputRef}
              type="file"
              accept=".xlsx,.xls,.csv"
              className="hidden"
              onChange={handleFileChange}
            />
            <div
              onClick={() => fileInputRef.current?.click()}
              className="border-2 border-dashed border-gray-300 hover:border-emerald-500 hover:bg-slate-50/60 rounded-2xl p-10 text-center cursor-pointer transition-all max-w-lg w-full flex flex-col items-center justify-center gap-3"
            >
              <div className="p-4 rounded-full bg-emerald-50 text-emerald-600">
                <FileSpreadsheetIcon className="size-8" />
              </div>
              <h4 className="text-sm font-bold text-gray-800">
                Click to browse or Drag & Drop Excel File
              </h4>
              <p className="text-xs text-gray-400 mt-1">
                Supports .xlsx, .xls, and .csv files
              </p>
            </div>
          </div>
        ) : (
          <div className="flex-1 flex flex-col min-h-0 space-y-3 py-2">
            {/* Summary Banner */}
            <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50 border border-gray-200 text-xs">
              <div className="flex items-center gap-3">
                <span className="font-semibold text-gray-700">File: <strong>{fileName}</strong></span>
                <span className="text-gray-300">|</span>
                <span>Total Found: <strong>{parsedRows.length}</strong></span>
                <span className="text-gray-300">|</span>
                <span className="text-emerald-700 font-bold">
                  ✓ Valid to Import: {validRows.length}
                </span>
                {duplicateCount > 0 && (
                  <>
                    <span className="text-gray-300">|</span>
                    <span className="text-rose-600 font-bold">
                      ⚠ Duplicates to Skip: {duplicateCount}
                    </span>
                  </>
                )}
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={resetState}
                className="h-7 text-xs text-gray-500 hover:text-gray-900"
              >
                Choose another file
              </Button>
            </div>

            {/* Preview Table */}
            <div className="flex-1 overflow-auto border border-gray-200 rounded-xl">
              <Table>
                <TableHeader className="bg-slate-50/80 sticky top-0 z-10">
                  <TableRow>
                    <TableHead className="w-12 text-xs font-bold">#</TableHead>
                    <TableHead className="text-xs font-bold">Student Name</TableHead>
                    <TableHead className="w-32 text-xs font-bold">Passport No.</TableHead>
                    <TableHead className="w-24 text-xs font-bold">Date</TableHead>
                    <TableHead className="w-24 text-xs font-bold">Amount</TableHead>
                    <TableHead className="w-20 text-xs font-bold">Rate</TableHead>
                    <TableHead className="w-28 text-xs font-bold">Commission</TableHead>
                    <TableHead className="w-28 text-xs font-bold">Account</TableHead>
                    <TableHead className="w-28 text-xs font-bold">Paid to Investor</TableHead>
                    <TableHead className="w-36 text-xs font-bold">Validation</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {parsedRows.map((row) => (
                    <TableRow
                      key={row.index}
                      className={row.isDuplicate ? "bg-rose-50/30" : ""}
                    >
                      <TableCell className="text-xs font-mono">{row.index}</TableCell>
                      <TableCell className="text-xs font-bold text-gray-900">
                        {row.studentName}
                      </TableCell>
                      <TableCell>
                        <span className="font-mono text-xs font-bold px-2 py-0.5 rounded bg-slate-100 text-gray-800">
                          {row.passportNo}
                        </span>
                      </TableCell>
                      <TableCell className="text-xs">{row.date}</TableCell>
                      <TableCell className="text-xs font-extrabold text-gray-900">
                        Rs. {row.amount.toLocaleString()}
                      </TableCell>
                      <TableCell className="text-xs font-bold text-emerald-800">
                        {row.commissionRate}%
                      </TableCell>
                      <TableCell className="text-xs font-bold text-emerald-700">
                        Rs. {row.investorCommission.toLocaleString()}
                      </TableCell>
                      <TableCell className="text-xs font-mono text-gray-600">
                        {row.accountNo || "-"}
                      </TableCell>
                      <TableCell className="text-xs">{row.reimbursed}</TableCell>
                      <TableCell>
                        {row.isDuplicate ? (
                          <Badge className="bg-rose-50 text-rose-700 border-rose-200 text-[10px] font-bold gap-1">
                            <AlertTriangleIcon className="size-3 text-rose-500" />
                            <span>Duplicate (Skip)</span>
                          </Badge>
                        ) : (
                          <Badge className="bg-emerald-50 text-emerald-700 border-emerald-200 text-[10px] font-bold gap-1">
                            <CheckCircle2Icon className="size-3 text-emerald-500" />
                            <span>Valid</span>
                          </Badge>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </div>
        )}

        <DialogFooter className="pt-3 border-t border-gray-100 flex items-center justify-between">
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            className="text-xs font-semibold h-9 border-gray-200 text-gray-700"
          >
            Cancel
          </Button>

          {parsedRows.length > 0 && (
            <Button
              type="button"
              disabled={isImporting || validRows.length === 0}
              onClick={handleConfirmImport}
              className="text-xs font-bold h-9 bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm px-5"
            >
              {isImporting ? (
                <>
                  <Loader2Icon className="mr-2 size-3.5 animate-spin" />
                  <span>Importing...</span>
                </>
              ) : (
                <span>Import {validRows.length} Valid Records</span>
              )}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
