export interface InvestorCommissionEntry {
  id: string;
  srNo: number;
  studentName: string;
  passportNo: string;
  date: string; // YYYY-MM-DD
  amount: number; // Principal Fee Amount (Rs.)
  commissionRate: number; // Percentage, e.g. 4 (%)
  investorCommission: number; // Calculated: amount * (commissionRate / 100)
  accountNo?: string | null; // Optional Account Number
  reimbursed: 'Yes' | 'No' | string;
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
