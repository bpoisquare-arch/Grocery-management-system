export type Role = 'ADMIN' | 'LAHORE_USER' | 'MULTAN_USER';
export type Entity = 'Lahore' | 'Multan';
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
    name: 'ISquareBPO',
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
];

// Initial Budgets for Lahore and Multan (Clean by default, configured via Budget page)
export const mockBudgets: Budget[] = [];

// Sample Commission Entries for Lahore & Multan
export const mockCommissionEntries: CommissionEntry[] = [
  {
    id: 'comm-lah-1',
    entity: 'Lahore',
    studentName: 'Muhammad Hamza',
    service: 'Visa Processing',
    counselor: 'Humaira Amin',
    amount: 150000,
    date: '2026-08-28',
    fullReceived: true,
    counselorCommission: 15000,
    bmCommission: 7500,
    status: 'Slip Uploaded',
    slipUrl: 'https://images.unsplash.com/photo-1554415707-6e8cfc93fe23?q=80&w=600&auto=format&fit=crop',
    slipType: 'image',
    createdAt: '2026-08-28T10:00:00Z',
    updatedAt: '2026-08-28T10:00:00Z',
  },
  {
    id: 'comm-lah-2',
    entity: 'Lahore',
    studentName: 'Ayesha Siddiqui',
    service: 'IELTS',
    counselor: 'Laraib Nadeem',
    amount: 45000,
    date: '2026-08-27',
    fullReceived: true,
    counselorCommission: 4500,
    bmCommission: 2250,
    status: 'Slip Uploaded',
    slipUrl: 'https://images.unsplash.com/photo-1589301760014-d929f3979dbc?q=80&w=600&auto=format&fit=crop',
    slipType: 'image',
    createdAt: '2026-08-27T12:00:00Z',
    updatedAt: '2026-08-27T12:00:00Z',
  },
  {
    id: 'comm-lah-3',
    entity: 'Lahore',
    studentName: 'Zain Ul Abideen',
    service: 'PTE',
    counselor: 'Laiba Nasir',
    amount: 35000,
    date: '2026-08-25',
    fullReceived: false,
    counselorCommission: 0,
    bmCommission: 0,
    status: 'Slip Missing',
    createdAt: '2026-08-25T14:30:00Z',
    updatedAt: '2026-08-25T14:30:00Z',
  },
  {
    id: 'comm-lah-4',
    entity: 'Lahore',
    studentName: 'Fatima Noor',
    service: 'Visa Granted',
    counselor: 'Humaira Amin',
    amount: 200000,
    date: '2026-08-22',
    fullReceived: true,
    counselorCommission: 20000,
    bmCommission: 10000,
    status: 'Slip Uploaded',
    slipUrl: 'https://images.unsplash.com/photo-1554415707-6e8cfc93fe23?q=80&w=600&auto=format&fit=crop',
    slipType: 'image',
    createdAt: '2026-08-22T09:15:00Z',
    updatedAt: '2026-08-22T09:15:00Z',
  },
  {
    id: 'comm-lah-5',
    entity: 'Lahore',
    studentName: 'Bilal Ahmed',
    service: 'Proof of Deposit',
    counselor: 'Laraib Nadeem',
    amount: 80000,
    date: '2026-08-20',
    fullReceived: true,
    counselorCommission: 8000,
    bmCommission: 4000,
    status: 'Approved Without Slip',
    createdAt: '2026-08-20T11:00:00Z',
    updatedAt: '2026-08-20T11:00:00Z',
  },
  // --- MULTAN ENTITY ---
  {
    id: 'comm-mul-1',
    entity: 'Multan',
    studentName: 'Usman Tariq',
    service: 'Visa Processing',
    counselor: 'Humaira Amin',
    amount: 140000,
    date: '2026-08-28',
    fullReceived: true,
    counselorCommission: 14000,
    bmCommission: 7000,
    status: 'Slip Uploaded',
    slipUrl: 'https://images.unsplash.com/photo-1554415707-6e8cfc93fe23?q=80&w=600&auto=format&fit=crop',
    slipType: 'image',
    createdAt: '2026-08-28T11:00:00Z',
    updatedAt: '2026-08-28T11:00:00Z',
  },
  {
    id: 'comm-mul-2',
    entity: 'Multan',
    studentName: 'Maryam Bibi',
    service: 'FBR Document',
    counselor: 'Laiba Nasir',
    amount: 60000,
    date: '2026-08-26',
    fullReceived: false,
    counselorCommission: 0,
    bmCommission: 0,
    status: 'Slip Missing',
    createdAt: '2026-08-26T15:00:00Z',
    updatedAt: '2026-08-26T15:00:00Z',
  },
  {
    id: 'comm-mul-3',
    entity: 'Multan',
    studentName: 'Saad Rafique',
    service: 'IELTS',
    counselor: 'Laraib Nadeem',
    amount: 45000,
    date: '2026-08-24',
    fullReceived: true,
    counselorCommission: 4500,
    bmCommission: 2250,
    status: 'Slip Uploaded',
    slipUrl: 'https://images.unsplash.com/photo-1589301760014-d929f3979dbc?q=80&w=600&auto=format&fit=crop',
    slipType: 'image',
    createdAt: '2026-08-24T10:30:00Z',
    updatedAt: '2026-08-24T10:30:00Z',
  },
];

// 24 entries for Lahore in August 2026 (Total: Rs. 65,000)
// 10 entries for Multan in August 2026 (Total: Rs. 45,000)
export const mockGroceryEntries: GroceryEntry[] = [
  // --- LAHORE ENTITY ---
  {
    id: 'lah-1',
    entity: 'Lahore',
    date: '2026-08-28',
    details: 'Rice, Oil & Vegetables (Basmati Rice 10kg, Dalda Oil 5L, Fresh Onion & Potatoes)',
    amount: 5000,
    addedBy: 'Lahore User',
    status: 'Slip Uploaded',
    slipUrl: 'https://images.unsplash.com/photo-1554415707-6e8cfc93fe23?q=80&w=600&auto=format&fit=crop',
    slipType: 'image',
    createdAt: '2026-08-28T10:00:00Z',
    updatedAt: '2026-08-28T10:00:00Z',
  },
  {
    id: 'lah-2',
    entity: 'Lahore',
    date: '2026-08-27',
    details: 'Vegetables and Fruits (Apples, Bananas, Mangoes, Tomatoes, Ginger & Garlic)',
    amount: 2000,
    addedBy: 'Lahore User',
    status: 'Slip Missing',
    createdAt: '2026-08-27T11:30:00Z',
    updatedAt: '2026-08-27T11:30:00Z',
  },
  {
    id: 'lah-3',
    entity: 'Lahore',
    date: '2026-08-25',
    details: 'Monthly Grocery (Sugar, Tea, Spices, Flour 20kg, Milk pack cartons)',
    amount: 10000,
    addedBy: 'Lahore User',
    status: 'Approved Without Slip',
    approvedByAdmin: true,
    createdAt: '2026-08-25T09:00:00Z',
    updatedAt: '2026-08-25T14:22:00Z',
  },
  {
    id: 'lah-4',
    entity: 'Lahore',
    date: '2026-08-24',
    details: 'Dishwashing soaps, detergents, surface cleaner & toilet papers',
    amount: 4500,
    addedBy: 'Lahore User',
    status: 'Slip Uploaded',
    slipUrl: 'https://images.unsplash.com/photo-1563986768609-322da13575f3?q=80&w=600&auto=format&fit=crop',
    slipType: 'image',
    createdAt: '2026-08-24T15:00:00Z',
    updatedAt: '2026-08-24T15:00:00Z',
  },
  {
    id: 'lah-5',
    entity: 'Lahore',
    date: '2026-08-22',
    details: 'Chicken breast 5kg, Beef mince 3kg, Fresh fish',
    amount: 8500,
    addedBy: 'Lahore User',
    status: 'Slip Uploaded',
    slipUrl: 'https://images.unsplash.com/photo-1540340561282-411149a2b908?q=80&w=600&auto=format&fit=crop',
    slipType: 'image',
    createdAt: '2026-08-22T08:45:00Z',
    updatedAt: '2026-08-22T08:45:00Z',
  },
  {
    id: 'lah-6',
    entity: 'Lahore',
    date: '2026-08-20',
    details: 'Nestle Drinking Water bottles (5 cases of 1.5L)',
    amount: 1200,
    addedBy: 'Lahore User',
    status: 'Slip Uploaded',
    slipUrl: 'https://images.unsplash.com/photo-1523362628745-0c100150b504?q=80&w=600&auto=format&fit=crop',
    slipType: 'image',
    createdAt: '2026-08-20T12:00:00Z',
    updatedAt: '2026-08-20T12:00:00Z',
  },
  {
    id: 'lah-7',
    entity: 'Lahore',
    date: '2026-08-19',
    details: 'Eggs (5 crates), Bread (8 family size packs), Butter',
    amount: 2800,
    addedBy: 'Lahore User',
    status: 'Slip Missing',
    createdAt: '2026-08-19T07:15:00Z',
    updatedAt: '2026-08-19T07:15:00Z',
  },
  {
    id: 'lah-8',
    entity: 'Lahore',
    date: '2026-08-18',
    details: 'Snacks & biscuits for official client meetings',
    amount: 3200,
    addedBy: 'Lahore User',
    status: 'Slip Uploaded',
    slipUrl: 'https://images.unsplash.com/photo-1554415707-6e8cfc93fe23?q=80&w=600&auto=format&fit=crop',
    slipType: 'image',
    createdAt: '2026-08-18T14:30:00Z',
    updatedAt: '2026-08-18T14:30:00Z',
  },
  {
    id: 'lah-9',
    entity: 'Lahore',
    date: '2026-08-16',
    details: 'Green Tea, Lemon, Honey, Mint leaves',
    amount: 1500,
    addedBy: 'Lahore User',
    status: 'Approved Without Slip',
    approvedByAdmin: true,
    createdAt: '2026-08-16T10:00:00Z',
    updatedAt: '2026-08-29T09:12:00Z',
  },
  {
    id: 'lah-10',
    entity: 'Lahore',
    date: '2026-08-15',
    details: 'Cooking Spices (Red chili, Turmeric, Cumin, Coriander, Garam Masala)',
    amount: 1800,
    addedBy: 'Lahore User',
    status: 'Slip Uploaded',
    slipUrl: 'https://images.unsplash.com/photo-1596040033229-a9821ebd058d?q=80&w=600&auto=format&fit=crop',
    slipType: 'image',
    createdAt: '2026-08-15T11:00:00Z',
    updatedAt: '2026-08-15T11:00:00Z',
  },
  {
    id: 'lah-11',
    entity: 'Lahore',
    date: '2026-08-14',
    details: 'Lahori Chana, Halwa Puri ingredients for Independence Day breakfast',
    amount: 2500,
    addedBy: 'Lahore User',
    status: 'Slip Uploaded',
    slipUrl: 'https://images.unsplash.com/photo-1589301760014-d929f3979dbc?q=80&w=600&auto=format&fit=crop',
    slipType: 'image',
    createdAt: '2026-08-14T06:00:00Z',
    updatedAt: '2026-08-14T06:00:00Z',
  },
  {
    id: 'lah-12',
    entity: 'Lahore',
    date: '2026-08-12',
    details: 'Tissues, Paper towels, Napkins, Hand sanitizer',
    amount: 1600,
    addedBy: 'Lahore User',
    status: 'Slip Uploaded',
    slipUrl: 'https://images.unsplash.com/photo-1584515979956-d9f6e5d09982?q=80&w=600&auto=format&fit=crop',
    slipType: 'image',
    createdAt: '2026-08-12T09:30:00Z',
    updatedAt: '2026-08-12T09:30:00Z',
  },
  {
    id: 'lah-13',
    entity: 'Lahore',
    date: '2026-08-10',
    details: 'Instant noodles (4 boxes), Frozen Kebab, Frozen Paratha',
    amount: 4200,
    addedBy: 'Lahore User',
    status: 'Slip Missing',
    createdAt: '2026-08-10T16:45:00Z',
    updatedAt: '2026-08-10T16:45:00Z',
  },
  {
    id: 'lah-14',
    entity: 'Lahore',
    date: '2026-08-09',
    details: 'Cooking Salt, Pink Salt, Black Pepper, Vinegar, Soy Sauce',
    amount: 900,
    addedBy: 'Lahore User',
    status: 'Slip Uploaded',
    slipUrl: 'https://images.unsplash.com/photo-1554415707-6e8cfc93fe23?q=80&w=600&auto=format&fit=crop',
    slipType: 'image',
    createdAt: '2026-08-09T11:00:00Z',
    updatedAt: '2026-08-09T11:00:00Z',
  },
  {
    id: 'lah-15',
    entity: 'Lahore',
    date: '2026-08-08',
    details: 'Cheese slices (3 packs), Mayonnaise, Tomato Ketchup (2 large bottles)',
    amount: 2100,
    addedBy: 'Lahore User',
    status: 'Slip Uploaded',
    slipUrl: 'https://images.unsplash.com/photo-1554415707-6e8cfc93fe23?q=80&w=600&auto=format&fit=crop',
    slipType: 'image',
    createdAt: '2026-08-08T12:00:00Z',
    updatedAt: '2026-08-08T12:00:00Z',
  },
  {
    id: 'lah-16',
    entity: 'Lahore',
    date: '2026-08-07',
    details: 'Cleaning chemicals (Bleach, Harpic, Dettol floor cleaner)',
    amount: 1900,
    addedBy: 'Lahore User',
    status: 'Approved Without Slip',
    approvedByAdmin: true,
    createdAt: '2026-08-07T14:00:00Z',
    updatedAt: '2026-08-07T16:10:00Z',
  },
  {
    id: 'lah-17',
    entity: 'Lahore',
    date: '2026-08-06',
    details: 'Desi Ghee (2kg tin pack)',
    amount: 3800,
    addedBy: 'Lahore User',
    status: 'Slip Uploaded',
    slipUrl: 'https://images.unsplash.com/photo-1589301760014-d929f3979dbc?q=80&w=600&auto=format&fit=crop',
    slipType: 'image',
    createdAt: '2026-08-06T10:15:00Z',
    updatedAt: '2026-08-06T10:15:00Z',
  },
  {
    id: 'lah-18',
    entity: 'Lahore',
    date: '2026-08-05',
    details: 'Fresh yogurt (10kg for daily kitchen requirements)',
    amount: 2200,
    addedBy: 'Lahore User',
    status: 'Slip Missing',
    createdAt: '2026-08-05T08:00:00Z',
    updatedAt: '2026-08-05T08:00:00Z',
  },
  {
    id: 'lah-19',
    entity: 'Lahore',
    date: '2026-08-04',
    details: 'Garbage bags, kitchen sponge, scourers, micro-fiber cloths',
    amount: 1100,
    addedBy: 'Lahore User',
    status: 'Slip Uploaded',
    slipUrl: 'https://images.unsplash.com/photo-1554415707-6e8cfc93fe23?q=80&w=600&auto=format&fit=crop',
    slipType: 'image',
    createdAt: '2026-08-04T15:30:00Z',
    updatedAt: '2026-08-04T15:30:00Z',
  },
  {
    id: 'lah-20',
    entity: 'Lahore',
    date: '2026-08-03',
    details: 'Dry fruits (Almonds, Walnuts, Pistachios for office reception area)',
    amount: 4800,
    addedBy: 'Lahore User',
    status: 'Slip Uploaded',
    slipUrl: 'https://images.unsplash.com/photo-1554415707-6e8cfc93fe23?q=80&w=600&auto=format&fit=crop',
    slipType: 'image',
    createdAt: '2026-08-03T11:45:00Z',
    updatedAt: '2026-08-03T11:45:00Z',
  },
  {
    id: 'lah-21',
    entity: 'Lahore',
    date: '2026-08-02',
    details: 'Lemons, Cucumber, Salad leaves, Carrots, Cabbage',
    amount: 950,
    addedBy: 'Lahore User',
    status: 'Slip Uploaded',
    slipUrl: 'https://images.unsplash.com/photo-1554415707-6e8cfc93fe23?q=80&w=600&auto=format&fit=crop',
    slipType: 'image',
    createdAt: '2026-08-02T09:00:00Z',
    updatedAt: '2026-08-02T09:00:00Z',
  },
  {
    id: 'lah-22',
    entity: 'Lahore',
    date: '2026-08-02',
    details: 'Milk pack cartons (2 cases of 1L x 12)',
    amount: 3200,
    addedBy: 'Lahore User',
    status: 'Slip Uploaded',
    slipUrl: 'https://images.unsplash.com/photo-1554415707-6e8cfc93fe23?q=80&w=600&auto=format&fit=crop',
    slipType: 'image',
    createdAt: '2026-08-02T16:00:00Z',
    updatedAt: '2026-08-02T16:00:00Z',
  },
  {
    id: 'lah-23',
    entity: 'Lahore',
    date: '2026-08-01',
    details: 'Coffee powder jars (2 large Nescafe gold)',
    amount: 2400,
    addedBy: 'Lahore User',
    status: 'Slip Missing',
    createdAt: '2026-08-01T10:00:00Z',
    updatedAt: '2026-08-01T10:00:00Z',
  },
  {
    id: 'lah-24',
    entity: 'Lahore',
    date: '2026-08-01',
    details: 'Whole wheat Flour (Aata) 20kg, White Sugar 5kg',
    amount: 3000,
    addedBy: 'Lahore User',
    status: 'Slip Uploaded',
    slipUrl: 'https://images.unsplash.com/photo-1554415707-6e8cfc93fe23?q=80&w=600&auto=format&fit=crop',
    slipType: 'image',
    createdAt: '2026-08-01T14:00:00Z',
    updatedAt: '2026-08-01T14:00:00Z',
  },

  // --- MULTAN ENTITY ---
  // 10 entries for Multan in August 2026 (Total: Rs. 45,000)
  {
    id: 'mul-1',
    entity: 'Multan',
    date: '2026-08-28',
    details: 'Flour, Sugar & Tea (Aata 20kg, Sugar 10kg, Tapal Danedar Tea 1kg)',
    amount: 4000,
    addedBy: 'Multan User',
    status: 'Slip Uploaded',
    slipUrl: 'https://images.unsplash.com/photo-1554415707-6e8cfc93fe23?q=80&w=600&auto=format&fit=crop',
    slipType: 'image',
    createdAt: '2026-08-28T09:15:00Z',
    updatedAt: '2026-08-28T09:15:00Z',
  },
  {
    id: 'mul-2',
    entity: 'Multan',
    date: '2026-08-26',
    details: 'Office Snacks (Biscuits, Chips, Cakes, Juice boxes for reception)',
    amount: 1500,
    addedBy: 'Multan User',
    status: 'Slip Missing',
    createdAt: '2026-08-26T14:00:00Z',
    updatedAt: '2026-08-26T14:00:00Z',
  },
  {
    id: 'mul-3',
    entity: 'Multan',
    date: '2026-08-25',
    details: 'Monthly kitchen supplies (Cooking oil 15L, Spices, Pulses/Daal)',
    amount: 12000,
    addedBy: 'Multan User',
    status: 'Slip Uploaded',
    slipUrl: 'https://images.unsplash.com/photo-1554415707-6e8cfc93fe23?q=80&w=600&auto=format&fit=crop',
    slipType: 'image',
    createdAt: '2026-08-25T11:00:00Z',
    updatedAt: '2026-08-25T11:00:00Z',
  },
  {
    id: 'mul-4',
    entity: 'Multan',
    date: '2026-08-22',
    details: 'Mangoes (4 crates of Multani Chaunsa for office distribution)',
    amount: 8000,
    addedBy: 'Multan User',
    status: 'Slip Uploaded',
    slipUrl: 'https://images.unsplash.com/photo-1553279768-865429fa0078?q=80&w=600&auto=format&fit=crop',
    slipType: 'image',
    createdAt: '2026-08-22T10:00:00Z',
    updatedAt: '2026-08-22T10:00:00Z',
  },
  {
    id: 'mul-5',
    entity: 'Multan',
    date: '2026-08-20',
    details: 'Milk pack cartons (3 cases of 1L x 12)',
    amount: 4800,
    addedBy: 'Multan User',
    status: 'Slip Uploaded',
    slipUrl: 'https://images.unsplash.com/photo-1554415707-6e8cfc93fe23?q=80&w=600&auto=format&fit=crop',
    slipType: 'image',
    createdAt: '2026-08-20T16:30:00Z',
    updatedAt: '2026-08-20T16:30:00Z',
  },
  {
    id: 'mul-6',
    entity: 'Multan',
    date: '2026-08-17',
    details: 'Vegetables (Onion, Garlic, Potatoes, Ginger, Green Chilies)',
    amount: 1800,
    addedBy: 'Multan User',
    status: 'Approved Without Slip',
    approvedByAdmin: true,
    createdAt: '2026-08-17T09:00:00Z',
    updatedAt: '2026-08-29T11:40:00Z',
  },
  {
    id: 'mul-7',
    entity: 'Multan',
    date: '2026-08-15',
    details: 'Drinking water bottles (4 cases of large 19L refill bottles)',
    amount: 1600,
    addedBy: 'Multan User',
    status: 'Slip Uploaded',
    slipUrl: 'https://images.unsplash.com/photo-1523362628745-0c100150b504?q=80&w=600&auto=format&fit=crop',
    slipType: 'image',
    createdAt: '2026-08-15T12:00:00Z',
    updatedAt: '2026-08-15T12:00:00Z',
  },
  {
    id: 'mul-8',
    entity: 'Multan',
    date: '2026-08-10',
    details: 'Toiletries & Cleansers (Vim, Max bar, Dettol liquid soap)',
    amount: 2500,
    addedBy: 'Multan User',
    status: 'Slip Missing',
    createdAt: '2026-08-10T14:15:00Z',
    updatedAt: '2026-08-10T14:15:00Z',
  },
  {
    id: 'mul-9',
    entity: 'Multan',
    date: '2026-08-05',
    details: 'Guest refreshments (Samosas, Bakery items, tea ingredients)',
    amount: 3000,
    addedBy: 'Multan User',
    status: 'Slip Uploaded',
    slipUrl: 'https://images.unsplash.com/photo-1554415707-6e8cfc93fe23?q=80&w=600&auto=format&fit=crop',
    slipType: 'image',
    createdAt: '2026-08-05T15:00:00Z',
    updatedAt: '2026-08-05T15:00:00Z',
  },
  {
    id: 'mul-10',
    entity: 'Multan',
    date: '2026-08-01',
    details: 'Dry rations (Basmati Rice 10kg, Pulses, Sugar 5kg)',
    amount: 5800,
    addedBy: 'Multan User',
    status: 'Slip Uploaded',
    slipUrl: 'https://images.unsplash.com/photo-1554415707-6e8cfc93fe23?q=80&w=600&auto=format&fit=crop',
    slipType: 'image',
    createdAt: '2026-08-01T10:00:00Z',
    updatedAt: '2026-08-01T10:00:00Z',
  },
];
