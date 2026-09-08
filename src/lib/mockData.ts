export type Role = 'ADMIN' | 'LAHORE_USER' | 'MULTAN_USER' | 'ISQUAREBPO_USER';
export type Entity = 'Lahore' | 'Multan' | 'ISquareBPO';
export type SlipStatus = 'Slip Uploaded' | 'Slip Missing' | 'Approved Without Slip';

export type CommissionService =
  | 'Visa Processing'
  | 'PTE'
  | 'Visa Granted'
  | 'IELTS'
  | 'FBR Document'
  | 'Proof of Deposit';

export const COMMISSION_SERVICES: CommissionService[] = [
  'Visa Processing',
  'PTE',
  'Visa Granted',
  'IELTS',
  'FBR Document',
  'Proof of Deposit',
];

export type CommissionCalculationType = 'percentage' | 'fixed';

export interface ServiceCommissionRule {
  type: CommissionCalculationType;
  value: number;
}

export type CounselorServiceCommissions = Partial<Record<CommissionService, ServiceCommissionRule>>;

export const defaultServiceCommissions: Record<CommissionService, ServiceCommissionRule> = {
  'Visa Processing': { type: 'percentage', value: 10 },
  'PTE': { type: 'percentage', value: 10 },
  'Visa Granted': { type: 'percentage', value: 10 },
  'IELTS': { type: 'percentage', value: 10 },
  'FBR Document': { type: 'percentage', value: 10 },
  'Proof of Deposit': { type: 'percentage', value: 10 },
};

export const defaultBmServiceCommissions: Record<CommissionService, ServiceCommissionRule> = {
  'Visa Processing': { type: 'percentage', value: 5 },
  'PTE': { type: 'percentage', value: 5 },
  'Visa Granted': { type: 'percentage', value: 5 },
  'IELTS': { type: 'percentage', value: 5 },
  'FBR Document': { type: 'percentage', value: 5 },
  'Proof of Deposit': { type: 'percentage', value: 5 },
};

export interface Counselor {
  id: string;
  name: string;
  entity?: Entity | 'All';
  email?: string;
  phone?: string;
  serviceCommissions?: CounselorServiceCommissions;
  bmServiceCommissions?: CounselorServiceCommissions;
  createdAt?: string;
}

export const initialCounselors: Counselor[] = [
  {
    id: 'coun-1',
    name: 'Humaira Amin',
    entity: 'All',
    email: 'humaira@isquarebpo.com',
    phone: '+92 300 1122334',
    serviceCommissions: { ...defaultServiceCommissions },
    bmServiceCommissions: { ...defaultBmServiceCommissions },
  },
  {
    id: 'coun-2',
    name: 'Laraib Nadeem',
    entity: 'All',
    email: 'laraib@isquarebpo.com',
    phone: '+92 300 2233445',
    serviceCommissions: { ...defaultServiceCommissions },
    bmServiceCommissions: { ...defaultBmServiceCommissions },
  },
  {
    id: 'coun-3',
    name: 'Laiba Nasir',
    entity: 'All',
    email: 'laiba@isquarebpo.com',
    phone: '+92 300 3344556',
    serviceCommissions: { ...defaultServiceCommissions },
    bmServiceCommissions: { ...defaultBmServiceCommissions },
  },
];

export interface CommissionEntry {
  id: string;
  entity: Entity;
  studentName: string;
  service: CommissionService;
  counselor: string;
  amount: number;
  date: string; // YYYY-MM-DD
  fullReceived: boolean;
  counselorCommission: number; // C.C
  bmCommission: number; // B.M
  status: SlipStatus;
  slipUrl?: string; // Path or base64 data URL
  slipUrls?: string[]; // Array of up to 10 slip URLs
  slipType?: 'image' | 'pdf';
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface User {
  id: string;
  name: string;
  email: string;
  avatar: string;
  role: Role;
  assignedEntity?: Entity;
}

export interface GroceryEntry {
  id: string;
  entity: Entity;
  date: string; // YYYY-MM-DD
  details: string;
  amount: number;
  addedBy: string;
  status: SlipStatus;
  slipUrl?: string; // Path or base64 data URL
  slipUrls?: string[]; // Array of up to 10 slip URLs
  slipType?: 'image' | 'pdf';
  approvedByAdmin?: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Budget {
  entity: Entity;
  month: string; // e.g. "August"
  year: number; // e.g. 2026
  amount: number;
}

export const mockUsers: User[] = [
  {
    id: 'user-admin',
    name: 'Admin',
    email: 'admin@grocerymanager.com',
    avatar: '',
    role: 'ADMIN',
  },
  {
    id: 'user-lahore',
    name: 'Lahore User',
    email: 'lahore@grocerymanager.com',
    avatar: '',
    role: 'LAHORE_USER',
    assignedEntity: 'Lahore',
  },
  {
    id: 'user-multan',
    name: 'Multan User',
    email: 'multan@grocerymanager.com',
    avatar: '',
    role: 'MULTAN_USER',
    assignedEntity: 'Multan',
  },
  {
    id: 'user-isquarebpo',
    name: 'ISquareBPO User',
    email: 'isquarebpo@grocerymanager.com',
    avatar: '',
    role: 'ISQUAREBPO_USER',
    assignedEntity: 'ISquareBPO',
  },
];

// Clean empty fallback arrays for live production database
export const mockBudgets: Budget[] = [];
export const mockCommissionEntries: CommissionEntry[] = [];
export const mockGroceryEntries: GroceryEntry[] = [];
