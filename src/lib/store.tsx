"use client";

import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import {
  User,
  GroceryEntry,
  Budget,
  Category,
  initialCategories,
  mockBudgets,
  mockGroceryEntries,
  Entity,
  SlipStatus,
  CommissionEntry,
  Counselor,
  CommissionService,
  mockCommissionEntries,
  initialCounselors,
  CounselorServiceCommissions,
  defaultServiceCommissions,
  defaultBmServiceCommissions,
} from './mockData';

export interface BudgetBreakdown {
  baseBudget: number;
  carryoverBalance: number;
  previousPeriodLabel?: string;
  effectiveBudget: number;
  totalSpent: number;
  remainingBalance: number;
  isOverspent: boolean;
}

interface StoreContextType {
  currentUser: User | null;
  activeEntity: Entity;
  groceryEntries: GroceryEntry[];
  categories: Category[];
  budgets: Budget[];
  commissionEntries: CommissionEntry[];
  counselors: Counselor[];
  currentMonth: string;
  currentYear: number;
  isLoading: boolean;
  isGroceryLoading: boolean;
  isCommissionLoading: boolean;
  isSyncing: boolean;
  lastSyncedAt: Date | null;
  isLoaded: boolean;
  loadGroceryData: (force?: boolean) => Promise<void>;
  loadDashboardData: () => Promise<void>;
  loadCommissionData: (force?: boolean) => Promise<void>;
  login: (email: string, password?: string) => Promise<{ success: boolean; error?: string; user?: User }>;
  logout: () => Promise<void>;
  switchEntity: (entity: Entity) => void;
  setCurrentMonth: (month: string) => void;
  setCurrentYear: (year: number) => void;
  refreshData: () => Promise<void>;
  addCategory: (name: string, entity?: Entity | 'All') => Promise<Category>;
  assignCategoryToGrocery: (groceryId: string, categoryName: string) => Promise<void>;
  addGroceryEntry: (entry: {
    date: string;
    budgetMonth?: string;
    budgetYear?: number;
    details: string;
    category?: string;
    amount: number;
    status: SlipStatus;
    slipFile?: File | null;
    slipFiles?: File[];
    slipUrls?: string[];
  }) => Promise<void>;
  updateGroceryEntry: (
    id: string,
    updatedData: {
      date?: string;
      budgetMonth?: string;
      budgetYear?: number;
      details?: string;
      category?: string;
      amount?: number;
      status?: SlipStatus;
      slipFile?: File | null;
      slipFiles?: File[];
      slipUrls?: string[];
    }
  ) => Promise<void>;
  deleteGroceryEntry: (id: string) => Promise<void>;
  deleteGroceryEntries: (ids: string[]) => Promise<void>;
  approveEntryWithoutSlip: (id: string) => Promise<void>;
  setMonthlyBudget: (entity: Entity, month: string, year: number, amount: number) => Promise<void>;
  deleteMonthlyBudget: (entity: Entity, month: string, year: number) => Promise<void>;
  clearAllBudgets: () => Promise<void>;
  getEntityBudget: (entity: Entity, month?: string, year?: number) => number;
  getEntityBudgetBreakdown: (entity: Entity, month?: string, year?: number) => BudgetBreakdown;
  calculateEntityBudgetChain: (entity: Entity) => (BudgetBreakdown & { entity: Entity; month: string; year: number })[];
  // Commission & Counselor Methods
  addCommissionEntry: (entry: {
    studentName: string;
    service: CommissionService;
    counselor: string;
    amount: number;
    date: string;
    fullReceived: boolean;
    counselorCommission?: number;
    bmCommission?: number;
    claimedMonth?: string;
    claimedYear?: number;
    isClaimed?: boolean;
    notes?: string;
    slipFile?: File | null;
    slipFiles?: File[];
    slipUrls?: string[];
  }) => Promise<void>;
  updateCommissionEntry: (
    id: string,
    updatedData: {
      studentName?: string;
      service?: CommissionService;
      counselor?: string;
      amount?: number;
      date?: string;
      fullReceived?: boolean;
      counselorCommission?: number;
      bmCommission?: number;
      claimedMonth?: string;
      claimedYear?: number;
      isClaimed?: boolean;
      status?: SlipStatus;
      notes?: string;
      slipFile?: File | null;
      slipFiles?: File[];
      slipUrls?: string[];
    }
  ) => Promise<void>;
  deleteCommissionEntry: (id: string) => Promise<void>;
  deleteCommissionEntries: (ids: string[]) => Promise<void>;
  addCounselor: (counselor: {
    name: string;
    entity?: Entity | 'All';
    email?: string;
    phone?: string;
    serviceCommissions?: CounselorServiceCommissions;
    bmServiceCommissions?: CounselorServiceCommissions;
  }) => Promise<void>;
  updateCounselor: (
    id: string,
    data: {
      name?: string;
      entity?: Entity | 'All';
      email?: string;
      phone?: string;
      serviceCommissions?: CounselorServiceCommissions;
      bmServiceCommissions?: CounselorServiceCommissions;
    }
  ) => Promise<void>;
  deleteCounselor: (id: string) => Promise<void>;
  syncLocalToDatabase: () => Promise<{
    success: boolean;
    syncedCommissions: number;
    syncedCounselors: number;
    syncedGroceries: number;
    error?: string;
  }>;
}

// Safe Cache Helpers for SWR Local Caching
function getSafeCache<T>(key: string, fallback: T): T {
  if (typeof window === 'undefined') return fallback;
  try {
    const item = localStorage.getItem(key);
    if (!item) return fallback;
    const parsed = JSON.parse(item);
    return parsed ?? fallback;
  } catch {
    return fallback;
  }
}

function saveSafeCache(key: string, data: any) {
  if (typeof window === 'undefined') return;
  try {
    if (key === 'gem_grocery_cache' || key === 'gem_commissions_cache') {
      const lightweight = Array.isArray(data)
        ? data.map((item: any) => {
            const { slipUrl, slipUrls, ...rest } = item;
            // Strip large base64 data to preserve 5MB browser quota
            const safeSlipUrl = slipUrl && slipUrl.startsWith('data:') && slipUrl.length > 500 ? undefined : slipUrl;
            return { ...rest, slipUrl: safeSlipUrl };
          })
        : data;
      localStorage.setItem(key, JSON.stringify(lightweight));
      return;
    }
    localStorage.setItem(key, JSON.stringify(data));
  } catch (err) {
    console.warn(`[Cache] Storage quota warning for key '${key}':`, err);
  }
}

const StoreContext = createContext<StoreContextType | undefined>(undefined);

export function StoreProvider({ children }: { children: React.ReactNode }) {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [activeEntity, setActiveEntity] = useState<Entity>('Lahore');
  const [groceryEntries, setGroceryEntries] = useState<GroceryEntry[]>([]);
  const [categories, setCategories] = useState<Category[]>(initialCategories);
  const [budgets, setBudgets] = useState<Budget[]>([]);
  const [commissionEntries, setCommissionEntries] = useState<CommissionEntry[]>([]);
  const [counselors, setCounselors] = useState<Counselor[]>([]);
  const [currentMonth, setCurrentMonthState] = useState<string>('August');
  const [currentYear, setCurrentYearState] = useState<number>(2026);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isGroceryLoading, setIsGroceryLoading] = useState<boolean>(true);
  const [isCommissionLoading, setIsCommissionLoading] = useState<boolean>(false);
  const [isSyncing, setIsSyncing] = useState<boolean>(false);
  const [lastSyncedAt, setLastSyncedAt] = useState<Date | null>(null);
  const [isLoaded, setIsLoaded] = useState(false);

  const groceryEntriesRef = useRef<GroceryEntry[]>([]);
  const budgetsRef = useRef<Budget[]>([]);
  const commissionEntriesRef = useRef<CommissionEntry[]>([]);
  const counselorsRef = useRef<Counselor[]>([]);

  useEffect(() => {
    groceryEntriesRef.current = groceryEntries;
  }, [groceryEntries]);

  useEffect(() => {
    budgetsRef.current = budgets;
  }, [budgets]);

  useEffect(() => {
    commissionEntriesRef.current = commissionEntries;
  }, [commissionEntries]);

  useEffect(() => {
    counselorsRef.current = counselors;
  }, [counselors]);

  const budgetsInFlightRef = useRef<Promise<void> | null>(null);
  const groceriesInFlightRef = useRef<Promise<void> | null>(null);
  const categoriesInFlightRef = useRef<Promise<void> | null>(null);
  const commissionsInFlightRef = useRef<Promise<void> | null>(null);
  const counselorsInFlightRef = useRef<Promise<void> | null>(null);

  const lastGroceryMutationTimeRef = useRef<number>(0);
  const lastCommissionMutationTimeRef = useRef<number>(0);

  // Modular lazy-fetch: Budgets only
  const fetchBudgets = useCallback(async () => {
    if (budgetsInFlightRef.current) return budgetsInFlightRef.current;
    const promise = (async () => {
      try {
        const ts = Date.now();
        const res = await fetch(`/api/budgets?_t=${ts}`, { cache: 'no-store' });
        const json = await res.json().catch(() => null);
        if (json?.success && Array.isArray(json.data)) {
          setBudgets(json.data);
          budgetsRef.current = json.data;
          saveSafeCache('gem_budgets_cache', json.data);
        }
      } catch (e) {
        console.error('Error fetching budgets:', e);
      } finally {
        budgetsInFlightRef.current = null;
      }
    })();
    budgetsInFlightRef.current = promise;
    return promise;
  }, []);

  // Modular lazy-fetch: Groceries only
  const fetchGroceries = useCallback(async () => {
    if (groceriesInFlightRef.current) return groceriesInFlightRef.current;
    if (groceryEntriesRef.current.length === 0) setIsGroceryLoading(true);
    const promise = (async () => {
      try {
        const ts = Date.now();
        const res = await fetch(`/api/groceries?_t=${ts}`, { cache: 'no-store' });
        const json = await res.json().catch(() => null);
        if (json?.success && Array.isArray(json.data)) {
          if (lastGroceryMutationTimeRef.current <= ts) {
            setGroceryEntries(json.data);
            groceryEntriesRef.current = json.data;
            saveSafeCache('gem_grocery_cache', json.data);
          }
        }
      } catch (e) {
        console.error('Error fetching groceries:', e);
      } finally {
        setIsGroceryLoading(false);
        groceriesInFlightRef.current = null;
      }
    })();
    groceriesInFlightRef.current = promise;
    return promise;
  }, []);

  // Modular lazy-fetch: Categories only
  const fetchCategories = useCallback(async () => {
    if (categoriesInFlightRef.current) return categoriesInFlightRef.current;
    const promise = (async () => {
      try {
        const ts = Date.now();
        const res = await fetch(`/api/categories?_t=${ts}`, { cache: 'no-store' });
        const json = await res.json().catch(() => null);
        if (json?.success && Array.isArray(json.data) && json.data.length > 0) {
          setCategories(json.data);
          saveSafeCache('gem_categories_cache', json.data);
        }
      } catch (e) {
        console.error('Error fetching categories:', e);
      } finally {
        categoriesInFlightRef.current = null;
      }
    })();
    categoriesInFlightRef.current = promise;
    return promise;
  }, []);

  // Modular lazy-fetch: Commissions only
  const fetchCommissions = useCallback(async () => {
    if (commissionsInFlightRef.current) return commissionsInFlightRef.current;
    if (commissionEntriesRef.current.length === 0) setIsCommissionLoading(true);
    const promise = (async () => {
      try {
        const ts = Date.now();
        const res = await fetch(`/api/commissions?_t=${ts}`, { cache: 'no-store' });
        const json = await res.json().catch(() => null);
        if (json?.success && Array.isArray(json.data)) {
          if (lastCommissionMutationTimeRef.current <= ts) {
            setCommissionEntries(json.data);
            commissionEntriesRef.current = json.data;
            saveSafeCache('gem_commissions_cache', json.data);
          }
        }
      } catch (e) {
        console.error('Error fetching commissions:', e);
      } finally {
        setIsCommissionLoading(false);
        commissionsInFlightRef.current = null;
      }
    })();
    commissionsInFlightRef.current = promise;
    return promise;
  }, []);

  // Modular lazy-fetch: Counselors only
  const fetchCounselors = useCallback(async () => {
    if (counselorsInFlightRef.current) return counselorsInFlightRef.current;
    const promise = (async () => {
      try {
        const ts = Date.now();
        const res = await fetch(`/api/counselors?_t=${ts}`, { cache: 'no-store' });
        const json = await res.json().catch(() => null);
        if (json?.success && Array.isArray(json.data)) {
          setCounselors(json.data);
          counselorsRef.current = json.data;
          saveSafeCache('gem_counselors_cache', json.data);
        }
      } catch (e) {
        console.error('Error fetching counselors:', e);
      } finally {
        counselorsInFlightRef.current = null;
      }
    })();
    counselorsInFlightRef.current = promise;
    return promise;
  }, []);

  // Page-specific lazy loaders:
  // 1. Dashboard: Budgets + Groceries only (no categories, no commissions)
  const loadDashboardData = useCallback(async () => {
    await Promise.allSettled([fetchBudgets(), fetchGroceries()]);
    setLastSyncedAt(new Date());
  }, [fetchBudgets, fetchGroceries]);

  // 2. Grocery Management: Groceries + Categories + Budgets (no commissions)
  const loadGroceryData = useCallback(async (force?: boolean) => {
    await Promise.allSettled([fetchGroceries(), fetchCategories(), fetchBudgets()]);
    setLastSyncedAt(new Date());
  }, [fetchGroceries, fetchCategories, fetchBudgets]);

  // 3. Commissions: Commissions + Counselors only (no groceries, no budgets)
  const loadCommissionData = useCallback(async (force?: boolean) => {
    await Promise.allSettled([fetchCommissions(), fetchCounselors()]);
    setLastSyncedAt(new Date());
  }, [fetchCommissions, fetchCounselors]);

  // 4. On-demand page refresh
  const refreshData = useCallback(async () => {
    if (typeof window !== 'undefined') {
      const path = window.location.pathname;
      if (path.startsWith('/commissions')) {
        await loadCommissionData();
      } else {
        await loadGroceryData();
      }
    }
  }, [loadGroceryData, loadCommissionData]);

  // 1. Mount Hydration: Instant SWR Cache Hydration (0ms delay) + Session Verification
  useEffect(() => {
    if (typeof window !== 'undefined') {
      // Hydrate all cached data immediately so UI renders instantaneously without blank screens
      const cachedGroceries = getSafeCache<GroceryEntry[]>('gem_grocery_cache', []);
      const cachedBudgets = getSafeCache<Budget[]>('gem_budgets_cache', []);
      const cachedCategories = getSafeCache<Category[]>('gem_categories_cache', []);
      const cachedCommissions = getSafeCache<CommissionEntry[]>('gem_commissions_cache', []);
      const cachedCounselors = getSafeCache<Counselor[]>('gem_counselors_cache', []);

      if (cachedGroceries.length > 0) {
        setGroceryEntries(cachedGroceries);
        groceryEntriesRef.current = cachedGroceries;
        setIsGroceryLoading(false);
      }
      if (cachedBudgets.length > 0) {
        setBudgets(cachedBudgets);
        budgetsRef.current = cachedBudgets;
      }
      if (cachedCategories.length > 0) {
        setCategories(cachedCategories);
      }
      if (cachedCommissions.length > 0) {
        setCommissionEntries(cachedCommissions);
        commissionEntriesRef.current = cachedCommissions;
        setIsCommissionLoading(false);
      }
      if (cachedCounselors.length > 0) {
        setCounselors(cachedCounselors);
        counselorsRef.current = cachedCounselors;
      }

      const storedEntity = localStorage.getItem('gem_entity');
      const storedMonth = localStorage.getItem('gem_month');
      const storedYear = localStorage.getItem('gem_year');

      if (storedEntity) setActiveEntity(storedEntity as Entity);
      if (storedMonth) setCurrentMonthState(storedMonth);
      if (storedYear) setCurrentYearState(parseInt(storedYear, 10));

      // Restore user if present to prevent login redirect flicker
      const storedUser = localStorage.getItem('gem_user');
      if (storedUser) {
        try {
          const u = JSON.parse(storedUser);
          if (u?.id) setCurrentUser(u);
        } catch {}
      }

      // Immediately render children with available cache (no 5-10s block!)
      setIsLoaded(true);

      // Verify authenticated session in background
      fetch('/api/auth/me')
        .then((res) => (res.ok ? res.json() : null))
        .then((data) => {
          if (data?.authenticated && data.user) {
            setCurrentUser(data.user);
            try {
              localStorage.setItem('gem_user', JSON.stringify(data.user));
            } catch (e) {}

            if (data.user.role === 'LAHORE_USER') {
              const savedEntity = localStorage.getItem('gem_entity') as Entity | null;
              if (savedEntity === 'Miscellaneous' || savedEntity === 'Lahore') {
                setActiveEntity(savedEntity);
              } else {
                setActiveEntity('Lahore');
              }
            } else if (data.user.role === 'MULTAN_USER') {
              setActiveEntity('Multan');
            } else if (data.user.role === 'ISQUAREBPO_USER') {
              setActiveEntity('ISquareBPO');
            }

          }
        });
    }
  }, []);

  // 2. Real-Time Multi-Tab & SSE Live Listener (Zero Polling, Route-Scoped Only)
  useEffect(() => {
    if (typeof window === 'undefined') return;

    // Cross-tab synchronization via localStorage
    const handleStorage = (e: StorageEvent) => {
      if (e.key === 'gem_grocery_cache' && e.newValue) {
        try {
          const parsed = JSON.parse(e.newValue);
          if (Array.isArray(parsed)) {
            setGroceryEntries(parsed);
            groceryEntriesRef.current = parsed;
          }
        } catch {}
      } else if (e.key === 'gem_budgets_cache' && e.newValue) {
        try {
          const parsed = JSON.parse(e.newValue);
          if (Array.isArray(parsed)) {
            setBudgets(parsed);
            budgetsRef.current = parsed;
          }
        } catch {}
      } else if (e.key === 'gem_commissions_cache' && e.newValue) {
        try {
          const parsed = JSON.parse(e.newValue);
          if (Array.isArray(parsed)) {
            setCommissionEntries(parsed);
            commissionEntriesRef.current = parsed;
          }
        } catch {}
      }
    };

    window.addEventListener('storage', handleStorage);

    // Real-Time EventSource (SSE) - Route-scoped: only updates what the user is currently viewing
    let eventSource: EventSource | null = null;
    if ('EventSource' in window) {
      try {
        eventSource = new EventSource('/api/events');
        eventSource.onmessage = (event) => {
          try {
            const data = JSON.parse(event.data);
            if (data?.type === 'connected') return;

            const currentPath = window.location.pathname;

            // Only fetch if currently on the active module page!
            if (data?.module === 'grocery' || data?.module === 'budget' || data?.module === 'category') {
              if (
                !currentPath.startsWith('/commissions') &&
                currentPath !== '/select-module' &&
                currentPath !== '/select-entity' &&
                currentPath !== '/login'
              ) {
                const timeSinceLocalMutation = Date.now() - lastGroceryMutationTimeRef.current;
                if (timeSinceLocalMutation > 2500) {
                  loadGroceryData();
                }
              }
            } else if (data?.module === 'commission' || data?.module === 'counselor') {
              if (currentPath.startsWith('/commissions')) {
                const timeSinceLocalMutation = Date.now() - lastCommissionMutationTimeRef.current;
                if (timeSinceLocalMutation > 2500) {
                  loadCommissionData();
                }
              }
            }
          } catch (e) {
            console.error('Error handling SSE live event:', e);
          }
        };

        eventSource.onerror = () => {
          // Native EventSource auto-reconnects
        };
      } catch (err) {
        console.warn('Could not establish real-time SSE stream:', err);
      }
    }

    return () => {
      window.removeEventListener('storage', handleStorage);
      if (eventSource) {
        eventSource.close();
      }
    };
  }, [loadGroceryData, loadCommissionData]);

  // Sync state changes to localStorage
  const saveUser = (user: User | null) => {
    setCurrentUser(user);
    if (user) {
      localStorage.setItem('gem_user', JSON.stringify(user));
    } else {
      localStorage.removeItem('gem_user');
    }
  };

  const switchEntity = (entity: Entity) => {
    if (
      currentUser?.role === 'ADMIN' ||
      currentUser?.assignedEntity === entity ||
      (currentUser?.role === 'LAHORE_USER' && (entity === 'Lahore' || entity === 'Miscellaneous'))
    ) {
      setActiveEntity(entity);
      localStorage.setItem('gem_entity', entity);
    }
  };

  const setCurrentMonth = (month: string) => {
    setCurrentMonthState(month);
    localStorage.setItem('gem_month', month);
  };

  const setCurrentYear = (year: number) => {
    setCurrentYearState(year);
    localStorage.setItem('gem_year', year.toString());
  };

  // Secure login via backend API
  const login = async (
    email: string,
    password?: string
  ): Promise<{ success: boolean; error?: string; user?: User }> => {
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password: password || '' }),
      });

      const data = await res.json();

      if (res.ok && data.success && data.user) {
        if (typeof window !== 'undefined') {
          const prevUserStr = localStorage.getItem('gem_user');
          if (prevUserStr) {
            try {
              const prevUser = JSON.parse(prevUserStr);
              if (prevUser?.id !== data.user.id) {
                localStorage.removeItem('gem_grocery_cache');
                localStorage.removeItem('gem_budgets_cache');
                localStorage.removeItem('gem_categories_cache');
                localStorage.removeItem('gem_commissions_cache');
                localStorage.removeItem('gem_counselors_cache');
              }
            } catch {}
          }
        }
        saveUser(data.user);
        if (data.user.role === 'LAHORE_USER') {
          const savedEntity = localStorage.getItem('gem_entity') as Entity | null;
          if (savedEntity === 'Miscellaneous' || savedEntity === 'Lahore') {
            setActiveEntity(savedEntity);
          } else {
            setActiveEntity('Lahore');
            safeSetLocalStorage('gem_entity', 'Lahore');
          }
        } else if (data.user.role === 'MULTAN_USER') {
          setActiveEntity('Multan');
          safeSetLocalStorage('gem_entity', 'Multan');
        } else if (data.user.role === 'ISQUAREBPO_USER') {
          setActiveEntity('ISquareBPO');
          safeSetLocalStorage('gem_entity', 'ISquareBPO');
        }
        // Fetch priority data immediately upon login
        loadGroceryData();
        return { success: true, user: data.user };
      }

      return { success: false, error: data.error || 'Authentication failed. Please check your credentials.' };
    } catch (err: any) {
      console.error('Login request error:', err);
      return { success: false, error: 'Network error. Unable to reach authentication server.' };
    }
  };

  // Secure logout via backend API
  const logout = async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
    } catch (err) {
      console.error('Logout error:', err);
    }
    saveUser(null);
    if (typeof window !== 'undefined') {
      try {
        localStorage.removeItem('gem_user');
        localStorage.removeItem('gem_grocery_cache');
        localStorage.removeItem('gem_budgets_cache');
        localStorage.removeItem('gem_categories_cache');
        localStorage.removeItem('gem_commissions_cache');
        localStorage.removeItem('gem_counselors_cache');
      } catch (e) {}
      window.location.href = '/login';
    }
  };

  // Safe localStorage helper to prevent quota exceptions
  const safeSetLocalStorage = (key: string, value: string) => {
    try {
      if (typeof window !== 'undefined') {
        localStorage.setItem(key, value);
      }
    } catch (err) {
      console.warn(`localStorage quota warning for key '${key}':`, err);
      try {
        if (typeof window !== 'undefined') {
          if (key === 'gem_grocery' || key === 'gem_commissions') {
            const parsed = JSON.parse(value);
            if (Array.isArray(parsed)) {
              // Strip heavy base64 slipUrls to stay well under quota limit
              const light = parsed.map((item: any) => {
                const { slipUrl, slipUrls, ...rest } = item;
                return rest;
              });
              localStorage.setItem(key, JSON.stringify(light));
            }
          }
        }
      } catch (e) {
        // Silently ignore if quota is full
      }
    }
  };

  // Convert File to DataUrl (with canvas compression for images to preserve storage quota)
  const fileToDataUrl = (file: File): Promise<string> => {
    return new Promise((resolve) => {
      // If PDF or non-image, read directly
      if (file.type.includes('pdf') || !file.type.startsWith('image/')) {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = () => resolve('');
        reader.readAsDataURL(file);
        return;
      }

      // If image, compress via canvas
      const reader = new FileReader();
      reader.onload = (e) => {
        const dataUrl = e.target?.result as string;
        if (!dataUrl) {
          resolve('');
          return;
        }

        const img = new Image();
        img.onload = () => {
          const maxDim = 1200;
          let { width, height } = img;

          if (width > maxDim || height > maxDim) {
            if (width > height) {
              height = Math.round((height * maxDim) / width);
              width = maxDim;
            } else {
              width = Math.round((width * maxDim) / height);
              height = maxDim;
            }
          }

          const canvas = document.createElement('canvas');
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          if (ctx) {
            ctx.drawImage(img, 0, 0, width, height);
            const compressed = canvas.toDataURL('image/jpeg', 0.72);
            resolve(compressed);
          } else {
            resolve(dataUrl);
          }
        };
        img.onerror = () => resolve(dataUrl);
        img.src = dataUrl;
      };
      reader.onerror = () => resolve('');
      reader.readAsDataURL(file);
    });
  };

  const addCategory = async (name: string, entity?: Entity | 'All'): Promise<Category> => {
    const trimmed = name.trim();
    const existing = categories.find((c) => c.name.toLowerCase() === trimmed.toLowerCase());
    if (existing) return existing;

    const newCat: Category = {
      id: `cat-${Date.now()}`,
      name: trimmed,
      type: 'Expense',
      entity: entity || 'All',
      createdAt: new Date().toISOString(),
    };

    try {
      const res = await fetch('/api/categories', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: trimmed, type: 'Expense', entity: entity || 'All' }),
      });
      if (res.ok) {
        const json = await res.json();
        if (json.success && json.data) {
          const updated = [...categories.filter((c) => c.id !== json.data.id && c.name.toLowerCase() !== trimmed.toLowerCase()), json.data];
          setCategories(updated);
          saveSafeCache('gem_categories_cache', updated);
          return json.data;
        }
      }
    } catch (e) {
      console.error('Failed to post category to API:', e);
    }

    const updated = [...categories, newCat];
    setCategories(updated);
    saveSafeCache('gem_categories_cache', updated);
    return newCat;
  };

  const assignCategoryToGrocery = async (groceryId: string, categoryName: string) => {
    // Optimistic state update
    const updated = groceryEntries.map((entry) => {
      if (entry.id === groceryId) {
        return {
          ...entry,
          category: categoryName,
          updatedAt: new Date().toISOString(),
        };
      }
      return entry;
    });
    setGroceryEntries(updated);
    saveSafeCache('gem_grocery_cache', updated);
    
    try {
      await fetch(`/api/groceries/${groceryId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ category: categoryName }),
      });
    } catch (e) {
      console.error('Failed to assign category via API:', e);
    }
  };

  const addGroceryEntry = async (entry: {
    date: string;
    budgetMonth?: string;
    budgetYear?: number;
    details: string;
    category?: string;
    amount: number;
    status: SlipStatus;
    slipFile?: File | null;
    slipFiles?: File[];
    slipUrls?: string[];
  }) => {
    const finalSlipUrls: string[] = [];

    if (entry.slipUrls && Array.isArray(entry.slipUrls)) {
      finalSlipUrls.push(...entry.slipUrls);
    }

    if (entry.slipFiles && entry.slipFiles.length > 0) {
      for (const file of entry.slipFiles.slice(0, 10 - finalSlipUrls.length)) {
        try {
          const url = await fileToDataUrl(file);
          if (url) finalSlipUrls.push(url);
        } catch (err) {
          console.error('Error reading slip file:', err);
        }
      }
    } else if (entry.slipFile && finalSlipUrls.length < 10) {
      try {
        const url = await fileToDataUrl(entry.slipFile);
        if (url) finalSlipUrls.push(url);
      } catch (err) {
        console.error('Error reading slip file:', err);
      }
    }

    const primarySlipUrl = finalSlipUrls[0] || undefined;
    const slipType: 'image' | 'pdf' | undefined = primarySlipUrl
      ? primarySlipUrl.includes('application/pdf') || primarySlipUrl.endsWith('.pdf')
        ? 'pdf'
        : 'image'
      : undefined;

    const computedStatus: SlipStatus = finalSlipUrls.length > 0
      ? 'Slip Uploaded'
      : entry.status || 'Slip Missing';

    // Derive budget month/year from entry.date if not explicitly provided
    let derivedMonth = 'August';
    let derivedYear = 2026;
    try {
      const d = new Date(entry.date);
      if (!isNaN(d.getTime())) {
        const monthNames = [
          'January', 'February', 'March', 'April', 'May', 'June',
          'July', 'August', 'September', 'October', 'November', 'December'
        ];
        derivedMonth = monthNames[d.getMonth()];
        derivedYear = d.getFullYear();
      }
    } catch (e) {}

    const assignedBudgetMonth = entry.budgetMonth || derivedMonth;
    const assignedBudgetYear = entry.budgetYear || derivedYear;

    const payload = {
      entity: activeEntity,
      date: entry.date,
      budgetMonth: assignedBudgetMonth,
      budgetYear: assignedBudgetYear,
      details: entry.details,
      category: entry.category,
      amount: entry.amount,
      addedBy: currentUser ? currentUser.name : 'Unknown User',
      status: computedStatus,
      slipUrl: primarySlipUrl,
      slipUrls: finalSlipUrls.length > 0 ? finalSlipUrls : undefined,
      slipType,
    };

    const tempId = `temp_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const optimisticEntry: GroceryEntry = {
      id: tempId,
      entity: activeEntity,
      date: entry.date,
      budgetMonth: assignedBudgetMonth,
      budgetYear: assignedBudgetYear,
      details: entry.details,
      category: entry.category,
      amount: entry.amount,
      addedBy: currentUser ? currentUser.name : 'Unknown User',
      status: computedStatus,
      slipUrl: primarySlipUrl,
      slipUrls: finalSlipUrls.length > 0 ? finalSlipUrls : undefined,
      slipType,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    // 0ms Optimistic UI update: Visible immediately without waiting for server network!
    lastGroceryMutationTimeRef.current = Date.now();
    setGroceryEntries((prev) => {
      const next = [optimisticEntry, ...prev];
      groceryEntriesRef.current = next;
      saveSafeCache('gem_grocery_cache', next);
      return next;
    });

    try {
      const res = await fetch('/api/groceries', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const json = await res.json().catch(() => null);

      if (!res.ok || !json?.success || !json?.data) {
        // Rollback optimistic update
        setGroceryEntries((prev) => {
          const rolledBack = prev.filter((e) => e.id !== tempId);
          groceryEntriesRef.current = rolledBack;
          saveSafeCache('gem_grocery_cache', rolledBack);
          return rolledBack;
        });
        const errMsg = json?.error || `Server responded with status ${res.status}: Failed to save grocery to database.`;
        console.error('Failed to post grocery to API:', errMsg);
        throw new Error(errMsg);
      }

      // Reconcile optimistic temporary id with persistent database record
      setGroceryEntries((prev) => {
        const reconciled = prev.map((e) => (e.id === tempId ? json.data : e));
        groceryEntriesRef.current = reconciled;
        saveSafeCache('gem_grocery_cache', reconciled);
        return reconciled;
      });
    } catch (err) {
      setGroceryEntries((prev) => {
        const rolledBack = prev.filter((e) => e.id !== tempId);
        groceryEntriesRef.current = rolledBack;
        saveSafeCache('gem_grocery_cache', rolledBack);
        return rolledBack;
      });
      throw err;
    }
  };

  const updateGroceryEntry = async (
    id: string,
    updatedData: {
      date?: string;
      budgetMonth?: string;
      budgetYear?: number;
      details?: string;
      category?: string;
      amount?: number;
      status?: SlipStatus;
      slipFile?: File | null;
      slipFiles?: File[];
      slipUrls?: string[];
    }
  ) => {
    const existing = groceryEntries.find((e) => e.id === id);
    const finalSlipUrls: string[] = [];

    if (updatedData.slipUrls !== undefined) {
      finalSlipUrls.push(...updatedData.slipUrls);
    } else if (existing?.slipUrls) {
      finalSlipUrls.push(...existing.slipUrls);
    } else if (existing?.slipUrl) {
      finalSlipUrls.push(existing.slipUrl);
    }

    if (updatedData.slipFiles && updatedData.slipFiles.length > 0) {
      for (const file of updatedData.slipFiles.slice(0, 10 - finalSlipUrls.length)) {
        try {
          const url = await fileToDataUrl(file);
          if (url) finalSlipUrls.push(url);
        } catch (err) {
          console.error('Error reading slip file:', err);
        }
      }
    } else if (updatedData.slipFile && finalSlipUrls.length < 10) {
      try {
        const url = await fileToDataUrl(updatedData.slipFile);
        if (url) finalSlipUrls.push(url);
      } catch (err) {
        console.error('Error reading slip file:', err);
      }
    }

    const primarySlipUrl = finalSlipUrls[0] || undefined;
    const slipType: 'image' | 'pdf' | undefined = primarySlipUrl
      ? primarySlipUrl.includes('application/pdf') || primarySlipUrl.endsWith('.pdf')
        ? 'pdf'
        : 'image'
      : undefined;

    const hasSlips = finalSlipUrls.length > 0;
    const newStatus: SlipStatus = hasSlips
      ? 'Slip Uploaded'
      : updatedData.status || (existing?.status === 'Approved Without Slip' ? 'Approved Without Slip' : 'Slip Missing');

    const payload = {
      ...updatedData,
      status: newStatus,
      slipUrl: primarySlipUrl,
      slipUrls: hasSlips ? finalSlipUrls : [],
      slipType,
    };

    const res = await fetch(`/api/groceries/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    const json = await res.json().catch(() => null);

    if (!res.ok || !json?.success || !json?.data) {
      const errMsg = json?.error || `Server responded with status ${res.status}: Failed to update grocery in database.`;
      console.error('Failed to update grocery via API:', errMsg);
      throw new Error(errMsg);
    }

    const updated = groceryEntries.map((entry) => (entry.id === id ? json.data : entry));
    lastGroceryMutationTimeRef.current = Date.now();
    setGroceryEntries(updated);
    saveSafeCache('gem_grocery_cache', updated);
  };

  const deleteGroceryEntry = async (id: string) => {
    if (currentUser?.role !== 'ADMIN') {
      throw new Error('Only administrators can delete grocery expenses.');
    }

    const previousEntries = groceryEntriesRef.current;
    const updated = previousEntries.filter((entry) => entry.id !== id);
    lastGroceryMutationTimeRef.current = Date.now();
    setGroceryEntries(updated);
    groceryEntriesRef.current = updated;
    saveSafeCache('gem_grocery_cache', updated);

    try {
      const res = await fetch(`/api/groceries/${id}`, { method: 'DELETE' });
      const json = await res.json().catch(() => null);

      if (!res.ok || !json?.success) {
        // Rollback
        setGroceryEntries(previousEntries);
        groceryEntriesRef.current = previousEntries;
        saveSafeCache('gem_grocery_cache', previousEntries);
        const errMsg = json?.error || `Server responded with status ${res.status}: Failed to delete grocery entry from database.`;
        console.error('Failed to delete grocery via API:', errMsg);
        throw new Error(errMsg);
      }
    } catch (err) {
      setGroceryEntries(previousEntries);
      groceryEntriesRef.current = previousEntries;
      saveSafeCache('gem_grocery_cache', previousEntries);
      throw err;
    }
  };

  const deleteGroceryEntries = async (ids: string[]) => {
    if (currentUser?.role !== 'ADMIN') {
      throw new Error('Only administrators can delete grocery expenses.');
    }

    const res = await fetch('/api/groceries/bulk-delete', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ids }),
    });

    const json = await res.json().catch(() => null);

    if (!res.ok || !json?.success) {
      const errMsg = json?.error || `Server responded with status ${res.status}: Failed to delete selected expenses from database.`;
      console.error('Failed to bulk delete groceries via API:', errMsg);
      throw new Error(errMsg);
    }

    const updated = groceryEntries.filter((entry) => !ids.includes(entry.id));
    lastGroceryMutationTimeRef.current = Date.now();
    setGroceryEntries(updated);
    saveSafeCache('gem_grocery_cache', updated);
  };

  const approveEntryWithoutSlip = async (id: string) => {
    if (currentUser?.role !== 'ADMIN') {
      throw new Error('Only administrators can approve expenses without slips.');
    }

    const payload = {
      status: 'Approved Without Slip',
      approvedByAdmin: true,
    };

    const res = await fetch(`/api/groceries/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    const json = await res.json().catch(() => null);

    if (!res.ok || !json?.success || !json?.data) {
      const errMsg = json?.error || `Server responded with status ${res.status}: Failed to approve entry in database.`;
      console.error('Failed to approve without slip via API:', errMsg);
      throw new Error(errMsg);
    }

    const updated = groceryEntries.map((entry) => (entry.id === id ? json.data : entry));
    lastGroceryMutationTimeRef.current = Date.now();
    setGroceryEntries(updated);
    saveSafeCache('gem_grocery_cache', updated);
  };

  // Upsert or update monthly budget for entity & month & year
  const setMonthlyBudget = async (entity: Entity, month: string, year: number, amount: number) => {
    if (currentUser?.role !== 'ADMIN') return;

    const payload = { entity, month, year, amount };

    try {
      const res = await fetch('/api/budgets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        const json = await res.json();
        if (json.success && json.data) {
          const existingIndex = budgets.findIndex(
            (b) => b.entity === entity && b.month.toLowerCase() === month.toLowerCase() && b.year === year
          );
          let updatedBudgets = [...budgets];
          if (existingIndex >= 0) {
            updatedBudgets[existingIndex] = json.data;
          } else {
            updatedBudgets.push(json.data);
          }
          setBudgets(updatedBudgets);
          saveSafeCache('gem_budgets_cache', updatedBudgets);
          return;
        }
      }
    } catch (e) {
      console.error('Failed to set budget via API:', e);
    }

    // Local fallback
    const existingBudgetIndex = budgets.findIndex(
      (b) => b.entity === entity && b.month.toLowerCase() === month.toLowerCase() && b.year === year
    );

    let updatedBudgets = [...budgets];
    if (existingBudgetIndex >= 0) {
      updatedBudgets[existingBudgetIndex] = { entity, month, year, amount };
    } else {
      updatedBudgets.push({ entity, month, year, amount });
    }

    setBudgets(updatedBudgets);
    saveSafeCache('gem_budgets_cache', updatedBudgets);
  };

  // Delete a specific monthly budget
  const deleteMonthlyBudget = async (entity: Entity, month: string, year: number) => {
    if (currentUser?.role !== 'ADMIN') return;

    try {
      await fetch(`/api/budgets?entity=${entity}&month=${month}&year=${year}`, {
        method: 'DELETE',
      });
    } catch (e) {
      console.error('Failed to delete budget via API:', e);
    }

    const updatedBudgets = budgets.filter(
      (b) => !(b.entity === entity && b.month.toLowerCase() === month.toLowerCase() && b.year === year)
    );
    setBudgets(updatedBudgets);
    saveSafeCache('gem_budgets_cache', updatedBudgets);
  };

  // Clear all budgets
  const clearAllBudgets = async () => {
    if (currentUser?.role !== 'ADMIN') return;

    try {
      await fetch('/api/budgets?clearAll=true', {
        method: 'DELETE',
      });
    } catch (e) {
      console.error('Failed to clear all budgets via API:', e);
    }

    setBudgets([]);
    saveSafeCache('gem_budgets_cache', []);
  };

  const MONTHS_ORDER = [
    'january', 'february', 'march', 'april', 'may', 'june',
    'july', 'august', 'september', 'october', 'november', 'december'
  ];

  // Helper to calculate sequential rollover budget chain for an entity
  const calculateEntityBudgetChain = (targetEntity: Entity) => {
    // 1. Get all budgets for this entity
    const entityBudgets = budgets.filter((b) => b.entity === targetEntity);

    // 2. Sort chronologically (year asc, monthIndex asc)
    const sorted = [...entityBudgets].sort((a, b) => {
      if (a.year !== b.year) return a.year - b.year;
      return MONTHS_ORDER.indexOf(a.month.toLowerCase()) - MONTHS_ORDER.indexOf(b.month.toLowerCase());
    });

    const chain: (BudgetBreakdown & { entity: Entity; month: string; year: number })[] = [];

    let runningCarryover = 0;
    let prevLabel: string | undefined = undefined;

    for (let i = 0; i < sorted.length; i++) {
      const b = sorted[i];
      const baseBudget = b.amount || 0;
      const carryoverBalance = runningCarryover;
      const previousPeriodLabel = prevLabel;
      const effectiveBudget = baseBudget + carryoverBalance;

      // Calculate total spent assigned to this specific budget period
      const totalSpent = groceryEntries
        .filter((entry) => {
          if (entry.entity !== targetEntity) return false;
          let eMonth = entry.budgetMonth;
          let eYear = entry.budgetYear;
          if (!eMonth && entry.date) {
            try {
              const d = new Date(entry.date);
              if (!isNaN(d.getTime())) {
                const ALL_M = [
                  'January', 'February', 'March', 'April', 'May', 'June',
                  'July', 'August', 'September', 'October', 'November', 'December'
                ];
                eMonth = ALL_M[d.getMonth()];
                eYear = d.getFullYear();
              }
            } catch (err) {}
          }
          return (
            (eMonth || '').toLowerCase() === b.month.toLowerCase() &&
            (eYear ? Number(eYear) : currentYear) === b.year
          );
        })
        .reduce((sum, entry) => sum + (Number(entry.amount) || 0), 0);

      const remainingBalance = effectiveBudget - totalSpent;
      const isOverspent = remainingBalance < 0;

      chain.push({
        entity: targetEntity,
        month: b.month,
        year: b.year,
        baseBudget,
        carryoverBalance,
        previousPeriodLabel,
        effectiveBudget,
        totalSpent,
        remainingBalance,
        isOverspent,
      });

      // Pass remaining balance as carryover to the next month
      runningCarryover = remainingBalance;
      prevLabel = `${b.month} ${b.year}`;
    }

    return chain;
  };

  // Get full budget breakdown for an entity & month & year with automated rollover
  const getEntityBudgetBreakdown = (entity: Entity, month?: string, year?: number): BudgetBreakdown => {
    const chain = calculateEntityBudgetChain(entity);

    if (!month || month === 'all') {
      const totalBase = chain.reduce((sum, c) => sum + c.baseBudget, 0);
      const totalSpent = chain.reduce((sum, c) => sum + c.totalSpent, 0);
      const latestRemaining = chain.length > 0 ? chain[chain.length - 1].remainingBalance : 0;
      return {
        baseBudget: totalBase,
        carryoverBalance: 0,
        effectiveBudget: totalBase,
        totalSpent,
        remainingBalance: latestRemaining,
        isOverspent: latestRemaining < 0,
      };
    }

    const targetYear = year || currentYear;
    const existing = chain.find(
      (c) => c.month.toLowerCase() === month.toLowerCase() && c.year === targetYear
    );

    if (existing) {
      return existing;
    }

    // If month not in chain yet, find the most recent prior budget for carryover
    const targetVal = targetYear * 12 + MONTHS_ORDER.indexOf(month.toLowerCase());
    const priorBudgets = chain.filter(
      (c) => c.year * 12 + MONTHS_ORDER.indexOf(c.month.toLowerCase()) < targetVal
    );

    if (priorBudgets.length > 0) {
      const lastPrior = priorBudgets[priorBudgets.length - 1];
      const carryoverBalance = lastPrior.remainingBalance;
      return {
        baseBudget: 0,
        carryoverBalance,
        previousPeriodLabel: `${lastPrior.month} ${lastPrior.year}`,
        effectiveBudget: carryoverBalance,
        totalSpent: 0,
        remainingBalance: carryoverBalance,
        isOverspent: carryoverBalance < 0,
      };
    }

    return {
      baseBudget: 0,
      carryoverBalance: 0,
      effectiveBudget: 0,
      totalSpent: 0,
      remainingBalance: 0,
      isOverspent: false,
    };
  };

  // Accurate real-time budget calculation for an entity (returns effective budget)
  const getEntityBudget = (entity: Entity, month?: string, year?: number): number => {
    if (!month || month === 'all') {
      const entityBudgets = budgets.filter((b) => b.entity === entity);
      if (entityBudgets.length > 0) {
        return entityBudgets.reduce((sum, b) => sum + b.amount, 0);
      }
      return 0;
    }

    const breakdown = getEntityBudgetBreakdown(entity, month, year);
    return breakdown.effectiveBudget;
  };

  // Commission Operations
  const addCommissionEntry = async (entry: {
    studentName: string;
    service: CommissionService;
    counselor: string;
    amount: number;
    date: string;
    fullReceived: boolean;
    counselorCommission?: number;
    bmCommission?: number;
    claimedMonth?: string;
    claimedYear?: number;
    isClaimed?: boolean;
    notes?: string;
    slipFile?: File | null;
    slipFiles?: File[];
    slipUrls?: string[];
  }) => {
    const finalSlipUrls: string[] = [];

    if (entry.slipUrls && Array.isArray(entry.slipUrls)) {
      finalSlipUrls.push(...entry.slipUrls);
    }

    if (entry.slipFiles && entry.slipFiles.length > 0) {
      for (const file of entry.slipFiles.slice(0, 5 - finalSlipUrls.length)) {
        try {
          const url = await fileToDataUrl(file);
          finalSlipUrls.push(url);
        } catch (err) {
          console.error('Error reading slip file:', err);
        }
      }
    } else if (entry.slipFile && finalSlipUrls.length < 5) {
      try {
        const url = await fileToDataUrl(entry.slipFile);
        finalSlipUrls.push(url);
      } catch (err) {
        console.error('Error reading slip file:', err);
      }
    }

    const primarySlipUrl = finalSlipUrls[0] || undefined;
    const slipType: 'image' | 'pdf' | undefined = primarySlipUrl
      ? primarySlipUrl.includes('application/pdf') || primarySlipUrl.endsWith('.pdf')
        ? 'pdf'
        : 'image'
      : undefined;

    const finalClaimedMonth = entry.claimedMonth || undefined;
    const finalClaimedYear = entry.claimedYear || undefined;
    const finalIsClaimed = typeof entry.isClaimed === 'boolean' ? entry.isClaimed : !!finalClaimedMonth;

    const payload = {
      entity: activeEntity,
      studentName: entry.studentName,
      service: entry.service,
      counselor: entry.counselor,
      amount: entry.amount,
      date: entry.date,
      fullReceived: entry.fullReceived,
      counselorCommission: entry.counselorCommission || 0,
      bmCommission: entry.bmCommission || 0,
      claimedMonth: finalClaimedMonth,
      claimedYear: finalClaimedYear,
      isClaimed: finalIsClaimed,
      notes: entry.notes,
      status: finalSlipUrls.length > 0 ? 'Slip Uploaded' : 'Slip Missing',
      slipUrl: primarySlipUrl,
      slipUrls: finalSlipUrls.length > 0 ? finalSlipUrls : undefined,
      slipType,
    };

    const tempId = `temp_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const optimisticEntry: CommissionEntry = {
      id: tempId,
      entity: activeEntity,
      studentName: entry.studentName,
      service: entry.service,
      counselor: entry.counselor,
      amount: entry.amount,
      date: entry.date,
      fullReceived: entry.fullReceived,
      counselorCommission: entry.counselorCommission || 0,
      bmCommission: entry.bmCommission || 0,
      claimedMonth: finalClaimedMonth,
      claimedYear: finalClaimedYear,
      isClaimed: finalIsClaimed,
      notes: entry.notes,
      status: finalSlipUrls.length > 0 ? 'Slip Uploaded' : 'Slip Missing',
      slipUrl: primarySlipUrl,
      slipUrls: finalSlipUrls.length > 0 ? finalSlipUrls : undefined,
      slipType,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    // 0ms Optimistic UI update: Visible immediately without waiting for server network!
    lastCommissionMutationTimeRef.current = Date.now();
    setCommissionEntries((prev) => {
      const next = [optimisticEntry, ...prev];
      commissionEntriesRef.current = next;
      saveSafeCache('gem_commissions_cache', next);
      return next;
    });

    try {
      const res = await fetch('/api/commissions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const json = await res.json().catch(() => null);

      if (!res.ok || !json?.success || !json?.data) {
        // Rollback optimistic update
        setCommissionEntries((prev) => {
          const rolledBack = prev.filter((e) => e.id !== tempId);
          commissionEntriesRef.current = rolledBack;
          saveSafeCache('gem_commissions_cache', rolledBack);
          return rolledBack;
        });
        const errMsg = json?.error || `Server responded with status ${res.status}: Failed to save commission entry to database.`;
        console.error('Failed to post commission to API:', errMsg);
        throw new Error(errMsg);
      }

      // Reconcile optimistic temporary id with persistent database record
      setCommissionEntries((prev) => {
        const reconciled = prev.map((e) => (e.id === tempId ? json.data : e));
        commissionEntriesRef.current = reconciled;
        saveSafeCache('gem_commissions_cache', reconciled);
        return reconciled;
      });
    } catch (err) {
      setCommissionEntries((prev) => {
        const rolledBack = prev.filter((e) => e.id !== tempId);
        commissionEntriesRef.current = rolledBack;
        saveSafeCache('gem_commissions_cache', rolledBack);
        return rolledBack;
      });
      throw err;
    }
  };

  const updateCommissionEntry = async (
    id: string,
    updatedData: {
      studentName?: string;
      service?: CommissionService;
      counselor?: string;
      amount?: number;
      date?: string;
      fullReceived?: boolean;
      counselorCommission?: number;
      bmCommission?: number;
      claimedMonth?: string;
      claimedYear?: number;
      isClaimed?: boolean;
      status?: SlipStatus;
      notes?: string;
      slipFile?: File | null;
      slipFiles?: File[];
      slipUrls?: string[];
    }
  ) => {
    const existing = commissionEntries.find((e) => e.id === id);
    const finalSlipUrls: string[] = [];

    if (updatedData.slipUrls !== undefined) {
      finalSlipUrls.push(...updatedData.slipUrls);
    } else if (existing?.slipUrls) {
      finalSlipUrls.push(...existing.slipUrls);
    } else if (existing?.slipUrl) {
      finalSlipUrls.push(existing.slipUrl);
    }

    if (updatedData.slipFiles && updatedData.slipFiles.length > 0) {
      for (const file of updatedData.slipFiles.slice(0, 5 - finalSlipUrls.length)) {
        try {
          const url = await fileToDataUrl(file);
          finalSlipUrls.push(url);
        } catch (err) {
          console.error('Error reading slip file:', err);
        }
      }
    } else if (updatedData.slipFile && finalSlipUrls.length < 5) {
      try {
        const url = await fileToDataUrl(updatedData.slipFile);
        finalSlipUrls.push(url);
      } catch (err) {
        console.error('Error reading slip file:', err);
      }
    }

    const primarySlipUrl = finalSlipUrls[0] || undefined;
    const slipType: 'image' | 'pdf' | undefined = primarySlipUrl
      ? primarySlipUrl.includes('application/pdf') || primarySlipUrl.endsWith('.pdf')
        ? 'pdf'
        : 'image'
      : undefined;

    const hasSlips = finalSlipUrls.length > 0;
    const newStatus: SlipStatus = hasSlips
      ? 'Slip Uploaded'
      : updatedData.status || (existing?.status === 'Approved Without Slip' ? 'Approved Without Slip' : 'Slip Missing');

    const payload = {
      ...updatedData,
      status: newStatus,
      slipUrl: primarySlipUrl,
      slipUrls: hasSlips ? finalSlipUrls : [],
      slipType,
    };

    const res = await fetch(`/api/commissions/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    const json = await res.json().catch(() => null);

    if (!res.ok || !json?.success || !json?.data) {
      const errMsg = json?.error || `Server responded with status ${res.status}: Failed to update commission entry in database.`;
      console.error('Failed to update commission via API:', errMsg);
      throw new Error(errMsg);
    }

    const updated = commissionEntries.map((entry) => (entry.id === id ? json.data : entry));
    lastCommissionMutationTimeRef.current = Date.now();
    setCommissionEntries(updated);
    saveSafeCache('gem_commissions_cache', updated);
  };

  const deleteCommissionEntry = async (id: string) => {
    const previousEntries = commissionEntriesRef.current;
    const updated = previousEntries.filter((entry) => entry.id !== id);
    lastCommissionMutationTimeRef.current = Date.now();
    setCommissionEntries(updated);
    commissionEntriesRef.current = updated;
    saveSafeCache('gem_commissions_cache', updated);

    try {
      const res = await fetch(`/api/commissions/${id}`, { method: 'DELETE' });
      const json = await res.json().catch(() => null);

      if (!res.ok || !json?.success) {
        // Rollback
        setCommissionEntries(previousEntries);
        commissionEntriesRef.current = previousEntries;
        saveSafeCache('gem_commissions_cache', previousEntries);
        const errMsg = json?.error || `Server responded with status ${res.status}: Failed to delete commission from database.`;
        console.error('Failed to delete commission via API:', errMsg);
        throw new Error(errMsg);
      }
    } catch (err) {
      setCommissionEntries(previousEntries);
      commissionEntriesRef.current = previousEntries;
      saveSafeCache('gem_commissions_cache', previousEntries);
      throw err;
    }
  };

  const deleteCommissionEntries = async (ids: string[]) => {
    const res = await fetch('/api/commissions/bulk-delete', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ids }),
    });

    const json = await res.json().catch(() => null);

    if (!res.ok || !json?.success) {
      const errMsg = json?.error || `Server responded with status ${res.status}: Failed to bulk delete commissions from database.`;
      console.error('Failed to bulk delete commissions via API:', errMsg);
      throw new Error(errMsg);
    }

    const updated = commissionEntries.filter((entry) => !ids.includes(entry.id));
    lastCommissionMutationTimeRef.current = Date.now();
    setCommissionEntries(updated);
    saveSafeCache('gem_commissions_cache', updated);
  };

  const addCounselor = async (counselor: {
    name: string;
    entity?: Entity | 'All';
    email?: string;
    phone?: string;
    serviceCommissions?: CounselorServiceCommissions;
    bmServiceCommissions?: CounselorServiceCommissions;
  }) => {
    const payload = {
      name: counselor.name,
      entity: counselor.entity || 'All',
      email: counselor.email,
      phone: counselor.phone,
      serviceCommissions: counselor.serviceCommissions || { ...defaultServiceCommissions },
      bmServiceCommissions: counselor.bmServiceCommissions || { ...defaultBmServiceCommissions },
    };

    const res = await fetch('/api/counselors', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    const json = await res.json().catch(() => null);

    if (!res.ok || !json?.success || !json?.data) {
      const errMsg = json?.error || `Server responded with status ${res.status}: Failed to save counselor to database.`;
      console.error('Failed to add counselor via API:', errMsg);
      throw new Error(errMsg);
    }

    const updated = [...counselors, json.data];
    setCounselors(updated);
    saveSafeCache('gem_counselors_cache', updated);
  };

  const updateCounselor = async (
    id: string,
    data: {
      name?: string;
      entity?: Entity | 'All';
      email?: string;
      phone?: string;
      serviceCommissions?: CounselorServiceCommissions;
      bmServiceCommissions?: CounselorServiceCommissions;
    }
  ) => {
    const res = await fetch(`/api/counselors/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });

    const json = await res.json().catch(() => null);

    if (!res.ok || !json?.success || !json?.data) {
      const errMsg = json?.error || `Server responded with status ${res.status}: Failed to update counselor in database.`;
      console.error('Failed to update counselor via API:', errMsg);
      throw new Error(errMsg);
    }

    const updated = counselors.map((c) => (c.id === id ? json.data : c));
    setCounselors(updated);
    saveSafeCache('gem_counselors_cache', updated);
  };

  const deleteCounselor = async (id: string) => {
    const res = await fetch(`/api/counselors/${id}`, { method: 'DELETE' });
    const json = await res.json().catch(() => null);

    if (!res.ok || !json?.success) {
      const errMsg = json?.error || `Server responded with status ${res.status}: Failed to delete counselor from database.`;
      console.error('Failed to delete counselor via API:', errMsg);
      throw new Error(errMsg);
    }

    const updated = counselors.filter((c) => c.id !== id);
    setCounselors(updated);
    saveSafeCache('gem_counselors_cache', updated);
  };

  // Clean Refresh / Sync helper (single source of truth from database)
  const syncLocalToDatabase = async (): Promise<{
    success: boolean;
    syncedCommissions: number;
    syncedCounselors: number;
    syncedGroceries: number;
    error?: string;
  }> => {
    try {
      await refreshData();
      return {
        success: true,
        syncedCommissions: 0,
        syncedCounselors: 0,
        syncedGroceries: 0,
      };
    } catch (err: any) {
      console.error('Sync error:', err);
      return {
        success: false,
        syncedCommissions: 0,
        syncedCounselors: 0,
        syncedGroceries: 0,
        error: err.message || 'Sync failed',
      };
    }
  };

  return (
    <StoreContext.Provider
      value={{
        currentUser,
        activeEntity,
        groceryEntries,
        categories,
        budgets,
        commissionEntries,
        counselors,
        currentMonth,
        currentYear,
        isLoading: isGroceryLoading,
        isGroceryLoading,
        isCommissionLoading,
        isSyncing,
        lastSyncedAt,
        isLoaded,
        loadGroceryData,
        loadDashboardData,
        loadCommissionData,
        login,
        logout,
        switchEntity,
        setCurrentMonth,
        setCurrentYear,
        refreshData,
        addCategory,
        assignCategoryToGrocery,
        addGroceryEntry,
        updateGroceryEntry,
        deleteGroceryEntry,
        deleteGroceryEntries,
        approveEntryWithoutSlip,
        setMonthlyBudget,
        deleteMonthlyBudget,
        clearAllBudgets,
        getEntityBudget,
        getEntityBudgetBreakdown,
        calculateEntityBudgetChain,
        addCommissionEntry,
        updateCommissionEntry,
        deleteCommissionEntry,
        deleteCommissionEntries,
        addCounselor,
        updateCounselor,
        deleteCounselor,
        syncLocalToDatabase,
      }}
    >
      {children}
    </StoreContext.Provider>
  );
}

export function useStore() {
  const context = useContext(StoreContext);
  if (context === undefined) {
    throw new Error('useStore must be used within a StoreProvider');
  }
  return context;
}
