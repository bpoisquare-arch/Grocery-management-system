"use client";

import React, { useState, useRef } from "react";
import * as XLSX from "xlsx";
import {
  UploadIcon,
  FileSpreadsheetIcon,
  AlertTriangleIcon,
  CheckCircle2Icon,
  Loader2Icon,
  XIcon,
  DownloadIcon,
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
import { LawChamberEntry } from "@/lib/lawChambersTypes";

interface ImportLawChamberModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  existingEntries: LawChamberEntry[];
  onImportSuccess: (rows: any[]) => Promise<any>;
}

interface ParsedRow {
  index: number;
  studentName: string;
  passportNo: string;
  date: string;
  amount: number;
  reimbursed: string;
  isDuplicate: boolean;
  duplicateReason?: string;
}

export function ImportLawChamberModal({
  open,
  onOpenChange,
  existingEntries,
  onImportSuccess,
}: ImportLawChamberModalProps) {
  const [parsedRows, setParsedRows] = useState<ParsedRow[]>([]);
  const [fileName, setFileName] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const existingPassportSet = new Set(
    existingEntries.map((e) => e.passportNo.trim().toUpperCase())
  );

  const handleFileUpload = (file: File) => {
    if (!file) return;
    setFileName(file.name);
    setIsLoading(true);

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: "array" });
        const firstSheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[firstSheetName];

        // Parse sheet to array of arrays
        const rawJson: any[][] = XLSX.utils.sheet_to_json(worksheet, { header: 1 });

        if (!rawJson || rawJson.length === 0) {
          toast.error("The uploaded file is empty.");
          setIsLoading(false);
          return;
        }

        // Find header row: look for row containing 'Student Name' or 'Passport'
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
        const reimbursedIdx = headers.findIndex((h) => h.includes("reimburs"));

        const rows: ParsedRow[] = [];
        const seenInFile = new Set<string>();

        for (let r = headerRowIndex + 1; r < rawJson.length; r++) {
          const row = rawJson[r];
          if (!row || row.length === 0) continue;

          const rawName = studentNameIdx !== -1 ? row[studentNameIdx] : row[1];
          const rawPassport = passportIdx !== -1 ? row[passportIdx] : row[2];
          const rawDate = dateIdx !== -1 ? row[dateIdx] : row[3];
          const rawAmount = amountIdx !== -1 ? row[amountIdx] : row[4];
          const rawReimbursed = reimbursedIdx !== -1 ? row[reimbursedIdx] : row[5];

          const studentName = String(rawName || "").trim();
          const passportNo = String(rawPassport || "").trim().toUpperCase();

          // Skip completely empty rows
          if (!studentName && !passportNo) continue;

          // Parse date
          let dateStr = "";
          if (typeof rawDate === "number") {
            // Excel serial date
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

          const amount = parseFloat(rawAmount) || 5000;
          const reimbursed = String(rawReimbursed || "Yes").toLowerCase().startsWith("y") ? "Yes" : "No";

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
            studentName: studentName || "Unknown",
            passportNo: passportNo || "N/A",
            date: dateStr,
            amount,
            reimbursed,
            isDuplicate,
            duplicateReason,
          });
        }

        setParsedRows(rows);
      } catch (err: any) {
        console.error("Excel parse error:", err);
        toast.error("Failed to parse Excel file: " + err.message);
      } finally {
        setIsLoading(false);
      }
    };
    reader.readAsArrayBuffer(file);
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFileUpload(e.dataTransfer.files[0]);
    }
  };

  const validRows = parsedRows.filter((r) => !r.isDuplicate);
  const duplicateCount = parsedRows.length - validRows.length;

  const handleConfirmImport = async () => {
    if (validRows.length === 0) {
      toast.error("No valid entries to import. All rows are either duplicates or invalid.");
      return;
    }

    setIsLoading(true);
    try {
      const payload = validRows.map((r) => ({
        studentName: r.studentName,
        passportNo: r.passportNo,
        date: r.date,
        amount: r.amount,
        reimbursed: r.reimbursed,
      }));

      const res = await onImportSuccess(payload);
      toast.success(
        `Import complete: ${res.insertedCount || validRows.length} students added. ${
          duplicateCount > 0 ? `${duplicateCount} duplicate(s) safely skipped.` : ""
        }`
      );
      onOpenChange(false);
      setParsedRows([]);
      setFileName("");
    } catch (err: any) {
      console.error(err);
      toast.error(err?.message || "Failed to import records.");
    } finally {
      setIsLoading(false);
    }
  };

  const downloadSampleTemplate = () => {
    const sample = [
      ["Chaudhary Law Chambers"],
      ["S.No.", "Student Name", "Passport No.", "Date", "Amount", "Reimbursed to Me"],
      [1, "M Mohsin Wakeel", "AU6309431", "23/06/2026", 5000, "Yes"],
      [2, "Mudassar Ijaz khokar", "WV4166251", "24/06/2026", 5000, "Yes"],
      [3, "M Absaar Aqeel", "AQ1305932", "27/07/2026", 5000, "Yes"],
    ];
    const ws = XLSX.utils.aoa_to_sheet(sample);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Students");
    XLSX.writeFile(wb, "Chaudhary_Law_Chambers_Template.xlsx");
    toast.success("Sample template downloaded.");
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-4xl w-[95vw] bg-white p-5 md:p-7 rounded-2xl ring-1 ring-black/5 shadow-2xl max-h-[92vh] flex flex-col">
        <DialogHeader className="pb-3 border-b border-gray-100 flex flex-row items-center justify-between">
          <div>
            <DialogTitle className="text-lg md:text-xl font-bold text-gray-900 flex items-center gap-2">
              <FileSpreadsheetIcon className="size-5 text-emerald-600" />
              Import Records from Excel
            </DialogTitle>
            <DialogDescription className="text-xs text-gray-500 mt-0.5">
              Bulk import student records from .xlsx, .xls, or .csv sheets with automatic duplicate passport prevention.
            </DialogDescription>
          </div>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={downloadSampleTemplate}
            className="h-8 text-xs font-semibold gap-1 text-emerald-700 border-emerald-200 hover:bg-emerald-50"
          >
            <DownloadIcon className="size-3" />
            Download Template
          </Button>
        </DialogHeader>

        {parsedRows.length === 0 ? (
          <div className="py-8 space-y-4">
            <div
              onDragEnter={handleDrag}
              onDragOver={handleDrag}
              onDragLeave={handleDrag}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              className="border-2 border-dashed border-gray-300 hover:border-emerald-500 rounded-2xl p-8 flex flex-col items-center justify-center text-center cursor-pointer transition-all bg-slate-50/50 hover:bg-slate-50"
            >
              <input
                ref={fileInputRef}
                type="file"
                accept=".xlsx, .xls, .csv"
                onChange={(e) => {
                  if (e.target.files && e.target.files[0]) {
                    handleFileUpload(e.target.files[0]);
                  }
                }}
                className="hidden"
              />
              <div className="size-14 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center mb-3 shadow-2xs">
                <UploadIcon className="size-7" />
              </div>
              <h4 className="text-sm font-bold text-gray-800">
                Click to browse or Drag & Drop Excel File
              </h4>
              <p className="text-xs text-gray-400 mt-1">
                Supports .xlsx, .xls, and .csv files (matches Chaudhary Law Chambers format)
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
                    <span className="text-red-700 font-bold">
                      ⚠ Duplicates Detected: {duplicateCount} (will be skipped)
                    </span>
                  </>
                )}
              </div>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => {
                  setParsedRows([]);
                  setFileName("");
                }}
                className="h-7 text-xs text-gray-500 hover:text-red-600"
              >
                Choose another file
              </Button>
            </div>

            {/* Preview Table */}
            <div className="flex-1 overflow-auto border border-gray-200 rounded-xl max-h-[380px]">
              <Table>
                <TableHeader className="bg-slate-50 sticky top-0 z-10">
                  <TableRow>
                    <TableHead className="w-12 text-xs font-bold">#</TableHead>
                    <TableHead className="text-xs font-bold">Student Name</TableHead>
                    <TableHead className="text-xs font-bold">Passport No.</TableHead>
                    <TableHead className="text-xs font-bold">Date</TableHead>
                    <TableHead className="text-xs font-bold">Amount</TableHead>
                    <TableHead className="text-xs font-bold">Reimbursed</TableHead>
                    <TableHead className="text-xs font-bold">Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {parsedRows.map((row) => (
                    <TableRow
                      key={row.index}
                      className={row.isDuplicate ? "bg-red-50/40 text-red-900" : ""}
                    >
                      <TableCell className="text-xs font-mono">{row.index}</TableCell>
                      <TableCell className="text-xs font-bold">{row.studentName}</TableCell>
                      <TableCell className="text-xs font-mono font-bold">{row.passportNo}</TableCell>
                      <TableCell className="text-xs">{row.date}</TableCell>
                      <TableCell className="text-xs font-semibold">Rs. {row.amount.toLocaleString()}</TableCell>
                      <TableCell className="text-xs">{row.reimbursed}</TableCell>
                      <TableCell>
                        {row.isDuplicate ? (
                          <Badge className="bg-red-100 text-red-700 border-red-200 text-[10px] font-bold gap-1">
                            <AlertTriangleIcon className="size-3" />
                            {row.duplicateReason || "Duplicate"}
                          </Badge>
                        ) : (
                          <Badge className="bg-emerald-100 text-emerald-700 border-emerald-200 text-[10px] font-bold gap-1">
                            <CheckCircle2Icon className="size-3" />
                            Ready to Import
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

        <DialogFooter className="pt-3 border-t border-gray-100 flex items-center justify-between sm:justify-between">
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isLoading}
            className="h-9 text-xs font-semibold"
          >
            Cancel
          </Button>

          {parsedRows.length > 0 && (
            <Button
              type="button"
              onClick={handleConfirmImport}
              disabled={isLoading || validRows.length === 0}
              className="h-9 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs px-5 shadow-sm"
            >
              {isLoading ? (
                <>
                  <Loader2Icon className="size-3.5 mr-1.5 animate-spin" />
                  Importing Records...
                </>
              ) : (
                `Confirm & Import (${validRows.length} Entries)`
              )}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
