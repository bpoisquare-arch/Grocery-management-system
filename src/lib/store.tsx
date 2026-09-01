"use client";

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { User, GroceryEntry, Budget, mockBudgets, mockGroceryEntries, Entity, SlipStatus } from './mockData';

interface StoreContextType {
  currentUser: User | null;
  activeEntity: Entity;
  groceryEntries: GroceryEntry[];
  budgets: Budget[];
  currentMonth: string;
  currentYear: number;
  isLoading: boolean;
  login: (email: string, password?: string) => Promise<{ success: boolean; error?: string; user?: User }>;
  logout: () => Promise<void>;
  switchEntity: (entity: Entity) => void;
  setCurrentMonth: (month: string) => void;
  setCurrentYear: (year: number) => void;
  refreshData: () => Promise<void>;
  addGroceryEntry: (entry: {
    date: string;
    details: string;
    amount: number;
    status: SlipStatus;
    slipFile?: File | null;
  }) => Promise<void>;
  updateGroceryEntry: (
    id: string,
    updatedData: {
      date?: string;
      details?: string;
      amount?: number;
      status?: SlipStatus;
      slipFile?: File | null;
    }
  ) => Promise<void>;
  deleteGroceryEntry: (id: string) => Promise<void>;
  deleteGroceryEntries: (ids: string[]) => Promise<void>;
  approveEntryWithoutSlip: (id: string) => Promise<void>;
  setMonthlyBudget: (entity: Entity, month: string, year: number, amount: number) => Promise<void>;
  deleteMonthlyBudget: (entity: Entity, month: string, year: number) => Promise<void>;
  clearAllBudgets: () => Promise<void>;
  getEntityBudget: (entity: Entity, month?: string, year?: number) => number;
}

const StoreContext = createContext<StoreContextType | undefined>(undefined);

export function StoreProvider({ children }: { children: React.ReactNode }) {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [activeEntity, setActiveEntity] = useState<Entity>('Lahore');
  const [groceryEntries, setGroceryEntries] = useState<GroceryEntry[]>([]);
  const [budgets, setBudgets] = useState<Budget[]>([]);
  const [currentMonth, setCurrentMonthState] = useState<string>('August');
  const [currentYear, setCurrentYearState] = useState<number>(2026);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isLoaded, setIsLoaded] = useState(false);

  // Function to load live data from database API routes
  const refreshData = useCallback(async () => {
    try {
      const [groceriesRes, budgetsRes] = await Promise.all([
        fetch('/api/groceries'),
        fetch('/api/budgets'),
      ]);

      if (groceriesRes.ok) {
        const groceriesJson = await groceriesRes.json();
        if (groceriesJson.success && Array.isArray(groceriesJson.data)) {
          setGroceryEntries(groceriesJson.data);
          localStorage.setItem('gem_grocery', JSON.stringify(groceriesJson.data));
        }
      }

      if (budgetsRes.ok) {
        const budgetsJson = await budgetsRes.json();
        if (budgetsJson.success && Array.isArray(budgetsJson.data)) {
          setBudgets(budgetsJson.data);
          localStorage.setItem('gem_budgets', JSON.stringify(budgetsJson.data));
        }
      }
    } catch (error) {
      console.error('Error fetching live data from database:', error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Initialize from LocalStorage and verify session from /api/auth/me
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const storedEntity = localStorage.getItem('gem_entity');
      const storedGrocery = localStorage.getItem('gem_grocery');
      const storedBudgets = localStorage.getItem('gem_budgets');
      const storedMonth = localStorage.getItem('gem_month');
      const storedYear = localStorage.getItem('gem_year');

      if (storedEntity) setActiveEntity(storedEntity as Entity);
      if (storedMonth) setCurrentMonthState(storedMonth);
      if (storedYear) setCurrentYearState(parseInt(storedYear, 10));

      if (storedGrocery) {
        try {
          setGroceryEntries(JSON.parse(storedGrocery));
        } catch (e) {
          setGroceryEntries(mockGroceryEntries);
        }
      } else {
        setGroceryEntries(mockGroceryEntries);
      }

      if (storedBudgets) {
        try {
          setBudgets(JSON.parse(storedBudgets));
        } catch (e) {
          setBudgets(mockBudgets);
        }
      } else {
        setBudgets(mockBudgets);
      }

      // Check current session from /api/auth/me
      fetch('/api/auth/me')
        .then((res) => {
          if (res.ok) return res.json();
          return null;
        })
        .then((data) => {
          if (data?.authenticated && data.user) {
            setCurrentUser(data.user);
            localStorage.setItem('gem_user', JSON.stringify(data.user));
            if (data.user.role === 'LAHORE_USER') {
              setActiveEntity('Lahore');
              localStorage.setItem('gem_entity', 'Lahore');
            } else if (data.user.role === 'MULTAN_USER') {
              setActiveEntity('Multan');
              localStorage.setItem('gem_entity', 'Multan');
            }
          } else {
            const storedUser = localStorage.getItem('gem_user');
            if (storedUser) {
              try {
                setCurrentUser(JSON.parse(storedUser));
              } catch (e) {}
            }
          }
        })
        .catch(() => {
          const storedUser = localStorage.getItem('gem_user');
          if (storedUser) {
            try {
              setCurrentUser(JSON.parse(storedUser));
            } catch (e) {}
          }
        })
        .finally(() => {
          setIsLoaded(true);
        });

      // Fetch live updates from database
      refreshData();
    }
  }, [refreshData]);

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
    if (currentUser?.role === 'ADMIN' || currentUser?.assignedEntity === entity) {
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
        saveUser(data.user);
        if (data.user.role === 'LAHORE_USER') {
          setActiveEntity('Lahore');
          localStorage.setItem('gem_entity', 'Lahore');
        } else if (data.user.role === 'MULTAN_USER') {
          setActiveEntity('Multan');
          localStorage.setItem('gem_entity', 'Multan');
        }
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
      window.location.href = '/login';
    }
  };

  // Convert File to DataUrl (base64) for visual slip previews and storage
  const fileToDataUrl = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = () => reject(reader.error);
      reader.readAsDataURL(file);
    });
  };

  const addGroceryEntry = async (entry: {
    date: string;
    details: string;
    amount: number;
    status: SlipStatus;
    slipFile?: File | null;
  }) => {
    let slipUrl = undefined;
    let slipType: 'image' | 'pdf' | undefined = undefined;

    if (entry.slipFile) {
      try {
        slipUrl = await fileToDataUrl(entry.slipFile);
        slipType = entry.slipFile.type.includes('pdf') ? 'pdf' : 'image';
      } catch (err) {
        console.error('Error reading file:', err);
      }
    }

    const payload = {
      entity: activeEntity,
      date: entry.date,
      details: entry.details,
      amount: entry.amount,
      addedBy: currentUser ? currentUser.name : 'Unknown User',
      status: entry.status,
      slipUrl,
      slipType,
    };

    try {
      const res = await fetch('/api/groceries', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        const json = await res.json();
        if (json.success && json.data) {
          const updated = [json.data, ...groceryEntries];
          setGroceryEntries(updated);
          localStorage.setItem('gem_grocery', JSON.stringify(updated));
          return;
        }
      }
    } catch (e) {
      console.error('Failed to post grocery to API, saving locally:', e);
    }

    // Local fallback
    const newEntry: GroceryEntry = {
      id: `grocery-${Date.now()}`,
      entity: activeEntity,
      date: entry.date,
      details: entry.details,
      amount: entry.amount,
      addedBy: currentUser ? currentUser.name : 'Unknown User',
      status: entry.status,
      slipUrl,
      slipType,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    const updated = [newEntry, ...groceryEntries];
    setGroceryEntries(updated);
    localStorage.setItem('gem_grocery', JSON.stringify(updated));
  };

  const updateGroceryEntry = async (
    id: string,
    updatedData: {
      date?: string;
      details?: string;
      amount?: number;
      status?: SlipStatus;
      slipFile?: File | null;
    }
  ) => {
    let slipUrl = undefined;
    let slipType: 'image' | 'pdf' | undefined = undefined;

    if (updatedData.slipFile) {
      try {
        slipUrl = await fileToDataUrl(updatedData.slipFile);
        slipType = updatedData.slipFile.type.includes('pdf') ? 'pdf' : 'image';
      } catch (err) {
        console.error('Error reading file:', err);
      }
    }

    const payload = {
      ...updatedData,
      ...(slipUrl ? { slipUrl, slipType } : {}),
    };

    try {
      const res = await fetch(`/api/groceries/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        const json = await res.json();
        if (json.success && json.data) {
          const updated = groceryEntries.map((entry) => (entry.id === id ? json.data : entry));
          setGroceryEntries(updated);
          localStorage.setItem('gem_grocery', JSON.stringify(updated));
          return;
        }
      }
    } catch (e) {
      console.error('Failed to update grocery via API:', e);
    }

    // Local fallback
    const updated = groceryEntries.map((entry) => {
      if (entry.id === id) {
        return {
          ...entry,
          ...updatedData,
          ...(slipUrl ? { slipUrl, slipType } : {}),
          updatedAt: new Date().toISOString(),
        };
      }
      return entry;
    });

    setGroceryEntries(updated);
    localStorage.setItem('gem_grocery', JSON.stringify(updated));
  };

  const deleteGroceryEntry = async (id: string) => {
    if (currentUser?.role !== 'ADMIN') return;

    try {
      await fetch(`/api/groceries/${id}`, { method: 'DELETE' });
    } catch (e) {
      console.error('Failed to delete grocery via API:', e);
    }

    const updated = groceryEntries.filter((entry) => entry.id !== id);
    setGroceryEntries(updated);
    localStorage.setItem('gem_grocery', JSON.stringify(updated));
  };

  const deleteGroceryEntries = async (ids: string[]) => {
    if (currentUser?.role !== 'ADMIN') return;

    try {
      await fetch('/api/groceries/bulk-delete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids }),
      });
    } catch (e) {
      console.error('Failed to bulk delete groceries via API:', e);
    }

    const updated = groceryEntries.filter((entry) => !ids.includes(entry.id));
    setGroceryEntries(updated);
    localStorage.setItem('gem_grocery', JSON.stringify(updated));
  };

  const approveEntryWithoutSlip = async (id: string) => {
    if (currentUser?.role !== 'ADMIN') return;

    const payload = {
      status: 'Approved Without Slip',
      approvedByAdmin: true,
    };

    try {
      const res = await fetch(`/api/groceries/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        const json = await res.json();
        if (json.success && json.data) {
          const updated = groceryEntries.map((entry) => (entry.id === id ? json.data : entry));
          setGroceryEntries(updated);
          localStorage.setItem('gem_grocery', JSON.stringify(updated));
          return;
        }
      }
    } catch (e) {
      console.error('Failed to approve without slip via API:', e);
    }

    const updated = groceryEntries.map((entry) => {
      if (entry.id === id) {
        return {
          ...entry,
          status: 'Approved Without Slip' as SlipStatus,
          approvedByAdmin: true,
          updatedAt: new Date().toISOString(),
        };
      }
      return entry;
    });
    setGroceryEntries(updated);
    localStorage.setItem('gem_grocery', JSON.stringify(updated));
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
          localStorage.setItem('gem_budgets', JSON.stringify(updatedBudgets));
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
    localStorage.setItem('gem_budgets', JSON.stringify(updatedBudgets));
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
    localStorage.setItem('gem_budgets', JSON.stringify(updatedBudgets));
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
    localStorage.setItem('gem_budgets', JSON.stringify([]));
  };

  // Accurate real-time budget calculation for an entity
  const getEntityBudget = (entity: Entity, month?: string, year?: number): number => {
    const targetYear = year || currentYear;

    // If month is "all" or omitted, return sum of budgets for this entity or latest budget
    if (!month || month === 'all') {
      const entityBudgets = budgets.filter((b) => b.entity === entity);
      if (entityBudgets.length > 0) {
        // Return sum of all assigned budgets for this entity
        return entityBudgets.reduce((sum, b) => sum + b.amount, 0);
      }
      return 0;
    }

    // Exact match for the specified month and year
    const exact = budgets.find(
      (b) => b.entity === entity && b.month.toLowerCase() === month.toLowerCase() && b.year === targetYear
    );
    if (exact && exact.amount !== undefined) return exact.amount;

    return 0;
  };

  return (
    <StoreContext.Provider
      value={{
        currentUser,
        activeEntity,
        groceryEntries,
        budgets,
        currentMonth,
        currentYear,
        isLoading,
        login,
        logout,
        switchEntity,
        setCurrentMonth,
        setCurrentYear,
        refreshData,
        addGroceryEntry,
        updateGroceryEntry,
        deleteGroceryEntry,
        deleteGroceryEntries,
        approveEntryWithoutSlip,
        setMonthlyBudget,
        deleteMonthlyBudget,
        clearAllBudgets,
        getEntityBudget,
      }}
    >
      {isLoaded && children}
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
