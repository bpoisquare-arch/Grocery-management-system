'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { InvestorCommissionEntry, InvestorCommissionInput } from './investorCommissionsTypes';
import { toast } from 'sonner';
import { useStore } from './store';

const CACHE_KEY = 'gem_investor_commissions_cache';

export function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = (err) => reject(err);
    reader.readAsDataURL(file);
  });
}

function loadSafeCache(): InvestorCommissionEntry[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveSafeCache(data: InvestorCommissionEntry[]) {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify(data));
  } catch {}
}

export function useInvestorCommissionsStore() {
  const { currentUser } = useStore();
  const [entries, setEntries] = useState<InvestorCommissionEntry[]>(loadSafeCache);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isSyncing, setIsSyncing] = useState<boolean>(false);
  const entriesRef = useRef<InvestorCommissionEntry[]>(entries);
  entriesRef.current = entries;

  // Fetch entries from DB
  const fetchEntries = useCallback(async (showToast = false) => {
    try {
      setIsSyncing(true);
      const res = await fetch('/api/investor-commissions', {
        cache: 'no-store',
        headers: { 'Cache-Control': 'no-cache' },
      });
      const json = await res.json();
      if (json.success && Array.isArray(json.data)) {
        setEntries(json.data);
        saveSafeCache(json.data);
        if (showToast) {
          toast.success(`Live DB Synced: ${json.data.length} records loaded.`);
        }
      } else {
        throw new Error(json.error || 'Failed to fetch entries');
      }
    } catch (err: any) {
      console.error('Fetch error:', err);
      if (showToast) {
        toast.error(err.message || 'Error syncing with database');
      }
    } finally {
      setIsLoading(false);
      setIsSyncing(false);
    }
  }, []);

  useEffect(() => {
    fetchEntries();
  }, [fetchEntries]);

  // Check if a passport is duplicate
  const checkDuplicatePassport = useCallback(
    (passportNo: string, excludeId?: string): { isDuplicate: boolean; existingEntry?: InvestorCommissionEntry } => {
      const clean = passportNo.trim().toUpperCase();
      if (!clean) return { isDuplicate: false };

      const found = entriesRef.current.find(
        (e) => e.passportNo.trim().toUpperCase() === clean && (!excludeId || e.id !== excludeId)
      );

      if (found) {
        return { isDuplicate: true, existingEntry: found };
      }
      return { isDuplicate: false };
    },
    []
  );

  // Add new student entry
  const addEntry = useCallback(
    async (input: InvestorCommissionInput) => {
      const cleanPassport = input.passportNo.trim().toUpperCase();

      // Client duplicate passport validation
      const dupCheck = checkDuplicatePassport(cleanPassport);
      if (dupCheck.isDuplicate) {
        const msg = `Duplicate entry! Passport No "${cleanPassport}" already exists in records for student "${dupCheck.existingEntry?.studentName}" (S.No: ${dupCheck.existingEntry?.srNo}). Duplicate entries are not allowed.`;
        toast.error(msg);
        throw new Error(msg);
      }

      // Process uploaded files to data URLs if present
      let slipUrls = input.slipUrls || (input.slipUrl ? [input.slipUrl] : []);
      if (input.slipFiles && input.slipFiles.length > 0) {
        const converted = await Promise.all(input.slipFiles.map((file) => fileToDataUrl(file)));
        slipUrls = [...slipUrls, ...converted];
      }

      const primarySlipUrl = slipUrls[0] || null;
      const status = slipUrls.length > 0 ? 'Slip Uploaded' : 'Slip Missing';
      let slipType = input.slipType;
      if (!slipType && primarySlipUrl) {
        slipType = primarySlipUrl.includes('application/pdf') || primarySlipUrl.endsWith('.pdf') ? 'pdf' : 'image';
      }

      const maxSr = entriesRef.current.reduce((max, e) => (e.srNo > max ? e.srNo : max), 0);
      const nextSrNo = maxSr + 1;
      const tempId = `temp_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;

      const numAmount = input.amount || 0;
      const numRate = input.commissionRate !== undefined ? input.commissionRate : 4.0;
      const computedCommission = Math.round((numAmount * (numRate / 100)) * 100) / 100;
      const accountNo = input.accountNo ? input.accountNo.trim() : null;

      const optimisticEntry: InvestorCommissionEntry = {
        id: tempId,
        srNo: nextSrNo,
        studentName: input.studentName.trim(),
        passportNo: cleanPassport,
        date: input.date,
        amount: numAmount,
        commissionRate: numRate,
        investorCommission: computedCommission,
        accountNo,
        reimbursed: input.reimbursed || 'Yes',
        status,
        slipUrl: primarySlipUrl,
        slipUrls: slipUrls.length > 0 ? slipUrls : undefined,
        slipType: slipType as 'image' | 'pdf' | undefined,
        notes: input.notes || null,
        addedBy: currentUser?.name || currentUser?.email || 'Admin',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      // Optimistic update
      setEntries((prev) => {
        const next = [...prev, optimisticEntry];
        saveSafeCache(next);
        return next;
      });

      try {
        const res = await fetch('/api/investor-commissions', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            studentName: optimisticEntry.studentName,
            passportNo: optimisticEntry.passportNo,
            date: input.date,
            amount: optimisticEntry.amount,
            commissionRate: optimisticEntry.commissionRate,
            accountNo: optimisticEntry.accountNo,
            reimbursed: optimisticEntry.reimbursed,
            slipUrl: primarySlipUrl,
            slipUrls: slipUrls.length > 0 ? slipUrls : undefined,
            slipType,
            notes: input.notes,
          }),
        });

        const json = await res.json();
        if (!res.ok || !json.success) {
          throw new Error(json.error || 'Failed to save entry');
        }

        // Replace optimistic entry with server response
        const serverData: InvestorCommissionEntry = json.data;
        setEntries((prev) => {
          const next = prev.map((e) => (e.id === tempId ? serverData : e));
          saveSafeCache(next);
          return next;
        });

        toast.success(`Entry for "${serverData.studentName}" saved successfully (S.No: #${serverData.srNo}).`);
        return serverData;
      } catch (err: any) {
        // Rollback optimistic update
        setEntries((prev) => {
          const rollback = prev.filter((e) => e.id !== tempId);
          saveSafeCache(rollback);
          return rollback;
        });
        toast.error(err.message || 'Failed to save student entry.');
        throw err;
      }
    },
    [checkDuplicatePassport, currentUser]
  );

  // Update student entry
  const updateEntry = useCallback(
    async (id: string, input: Partial<InvestorCommissionInput>) => {
      const existing = entriesRef.current.find((e) => e.id === id);
      if (!existing) {
        toast.error('Entry not found.');
        return;
      }

      if (input.passportNo) {
        const cleanPassport = input.passportNo.trim().toUpperCase();
        const dupCheck = checkDuplicatePassport(cleanPassport, id);
        if (dupCheck.isDuplicate) {
          const msg = `Duplicate entry! Passport No "${cleanPassport}" already exists in records for student "${dupCheck.existingEntry?.studentName}" (S.No: ${dupCheck.existingEntry?.srNo}). Duplicate entries are not allowed.`;
          toast.error(msg);
          throw new Error(msg);
        }
      }

      let slipUrls = input.slipUrls || (input.slipUrl ? [input.slipUrl] : existing.slipUrls || (existing.slipUrl ? [existing.slipUrl] : []));
      if (input.slipFiles && input.slipFiles.length > 0) {
        const converted = await Promise.all(input.slipFiles.map((file) => fileToDataUrl(file)));
        slipUrls = [...slipUrls, ...converted];
      }

      const primarySlipUrl = slipUrls[0] || null;
      const status = slipUrls.length > 0 ? 'Slip Uploaded' : 'Slip Missing';
      let slipType = input.slipType || existing.slipType;
      if (!slipType && primarySlipUrl) {
        slipType = primarySlipUrl.includes('application/pdf') || primarySlipUrl.endsWith('.pdf') ? 'pdf' : 'image';
      }

      const updatedAmount = input.amount !== undefined ? input.amount : existing.amount;
      const updatedRate = input.commissionRate !== undefined ? input.commissionRate : (existing.commissionRate || 4.0);
      const computedCommission = Math.round((updatedAmount * (updatedRate / 100)) * 100) / 100;
      const updatedAccountNo = input.accountNo !== undefined ? (input.accountNo ? input.accountNo.trim() : null) : existing.accountNo;

      // Optimistic update
      setEntries((prev) => {
        const next = prev.map((e) => {
          if (e.id === id) {
            const updated: InvestorCommissionEntry = {
              ...e,
              studentName: input.studentName ? input.studentName.trim() : e.studentName,
              passportNo: input.passportNo ? input.passportNo.trim().toUpperCase() : e.passportNo,
              date: input.date || e.date,
              amount: updatedAmount,
              commissionRate: updatedRate,
              investorCommission: computedCommission,
              accountNo: updatedAccountNo,
              reimbursed: input.reimbursed || e.reimbursed,
              status,
              slipUrl: primarySlipUrl,
              slipUrls: slipUrls.length > 0 ? slipUrls : undefined,
              slipType: slipType as 'image' | 'pdf' | undefined,
              notes: input.notes !== undefined ? input.notes : e.notes,
              updatedAt: new Date().toISOString(),
            };
            return updated;
          }
          return e;
        });
        saveSafeCache(next);
        return next;
      });

      try {
        const res = await fetch('/api/investor-commissions', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            id,
            studentName: input.studentName ? input.studentName.trim() : existing.studentName,
            passportNo: input.passportNo ? input.passportNo.trim().toUpperCase() : existing.passportNo,
            date: input.date || existing.date,
            amount: updatedAmount,
            commissionRate: updatedRate,
            accountNo: updatedAccountNo,
            reimbursed: input.reimbursed || existing.reimbursed,
            slipUrl: primarySlipUrl,
            slipUrls: slipUrls.length > 0 ? slipUrls : undefined,
            slipType,
            notes: input.notes !== undefined ? input.notes : existing.notes,
          }),
        });

        const json = await res.json();
        if (!res.ok || !json.success) {
          throw new Error(json.error || 'Failed to update entry');
        }

        const serverData: InvestorCommissionEntry = json.data;
        setEntries((prev) => {
          const next = prev.map((e) => (e.id === id ? serverData : e));
          saveSafeCache(next);
          return next;
        });

        toast.success(`Entry for "${serverData.studentName}" updated successfully.`);
        return serverData;
      } catch (err: any) {
        // Rollback
        setEntries((prev) => {
          const next = prev.map((e) => (e.id === id ? existing : e));
          saveSafeCache(next);
          return next;
        });
        toast.error(err.message || 'Failed to update entry.');
        throw err;
      }
    },
    [checkDuplicatePassport]
  );

  // Delete single entry
  const deleteEntry = useCallback(async (id: string) => {
    const existing = entriesRef.current.find((e) => e.id === id);
    if (!existing) return;

    setEntries((prev) => {
      const next = prev.filter((e) => e.id !== id);
      saveSafeCache(next);
      return next;
    });

    try {
      const res = await fetch(`/api/investor-commissions?id=${id}`, {
        method: 'DELETE',
      });
      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error || 'Failed to delete');
      }
      toast.success(`Entry for "${existing.studentName}" deleted.`);
    } catch (err: any) {
      // Rollback
      setEntries((prev) => {
        const next = [...prev, existing].sort((a, b) => a.srNo - b.srNo);
        saveSafeCache(next);
        return next;
      });
      toast.error(err.message || 'Failed to delete entry');
      throw err;
    }
  }, []);

  // Bulk delete
  const bulkDelete = useCallback(async (ids: string[]) => {
    if (!ids || ids.length === 0) return;
    const toDelete = entriesRef.current.filter((e) => ids.includes(e.id));

    setEntries((prev) => {
      const next = prev.filter((e) => !ids.includes(e.id));
      saveSafeCache(next);
      return next;
    });

    try {
      const res = await fetch('/api/investor-commissions', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids }),
      });
      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error || 'Failed to delete entries');
      }
      toast.success(`Deleted ${ids.length} student entries.`);
    } catch (err: any) {
      // Rollback
      setEntries((prev) => {
        const next = [...prev, ...toDelete].sort((a, b) => a.srNo - b.srNo);
        saveSafeCache(next);
        return next;
      });
      toast.error(err.message || 'Failed to delete entries');
      throw err;
    }
  }, []);

  // Import batch entries
  const importEntries = useCallback(async (rows: any[]) => {
    try {
      const res = await fetch('/api/investor-commissions/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rows }),
      });
      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error || 'Import failed');
      }

      await fetchEntries();
      return json;
    } catch (err: any) {
      console.error('Import error:', err);
      toast.error(err.message || 'Failed to import records.');
      throw err;
    }
  }, [fetchEntries]);

  return {
    entries,
    isLoading,
    isSyncing,
    fetchEntries,
    checkDuplicatePassport,
    addEntry,
    updateEntry,
    deleteEntry,
    bulkDelete,
    importEntries,
  };
}
