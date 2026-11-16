export interface LawChamberEntry {
  id: string;
  srNo: number;
  studentName: string;
  passportNo: string;
  date: string; // YYYY-MM-DD
  amount: number;
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

export interface LawChamberInput {
  studentName: string;
  passportNo: string;
  date: string;
  amount: number;
  reimbursed?: string;
  status?: string;
  slipUrl?: string;
  slipUrls?: string[];
  slipFiles?: File[];
  slipType?: 'image' | 'pdf';
  notes?: string;
  addedBy?: string;
}
