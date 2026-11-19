export interface InvestorCommissionEntry {
  id: string;
  srNo: number;
  studentName: string;
  passportNo: string;
  date: string; // YYYY-MM-DD
  amount: number; // Principal Fee Amount (Rs.)
  commissionRate: number; // Receivable Rate % (kept for backward compat)
  investorCommission: number; // Receivable Amount (kept for backward compat)
  receivableCommissionRate: number; // Receivable Commission %
  receivableAmount: number; // Auto-calculated: amount * (receivableCommissionRate / 100)
  payableCommissionRate: number; // Payable Commission %
  payableAmount: number; // Auto-calculated: amount * (payableCommissionRate / 100)
  edlinkCommission: number; // Auto-calculated: receivableAmount - payableAmount
  statementDays?: number | null; // Statement Days
  accountNo?: string | null; // Optional Account Number
  reimbursed: 'Yes' | 'No' | string; // Paid to Investor ("No" = Pending, "Yes" = Paid)
  status: 'Slip Uploaded' | 'Slip Missing' | string;
  slipUrl?: string | null;
  slipUrls?: string[] | null;
  slipType?: 'image' | 'pdf' | null;
  notes?: string | null;
  addedBy: string;
  createdAt: string;
  updatedAt: string;
}

export interface InvestorCommissionInput {
  studentName: string;
  passportNo: string;
  date: string;
  amount: number;
  commissionRate?: number;
  investorCommission?: number;
  receivableCommissionRate?: number;
  receivableAmount?: number;
  payableCommissionRate?: number;
  payableAmount?: number;
  edlinkCommission?: number;
  statementDays?: number | string | null;
  accountNo?: string;
  reimbursed?: string;
  status?: string;
  slipUrl?: string;
  slipUrls?: string[];
  slipFiles?: File[];
  slipType?: 'image' | 'pdf';
  notes?: string;
  addedBy?: string;
}
