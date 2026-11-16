'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { LawChamberEntry, LawChamberInput } from './lawChambersTypes';
import { toast } from 'sonner';
import { useStore } from './store';

const CACHE_KEY = 'gem_law_chambers_cache';

export function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = (err) => reject(err);
    reader.readAsDataURL(file);
  });
}

function loadSafeCache(): LawChamberEntry[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveSafeCache(data: LawChamberEntry[]) {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify(data));
  } catch {}
}

export function useLawChambersStore() {
  const { currentUser } = useStore();
  const [entries, setEntries] = useState<LawChamberEntry[]>(loadSafeCache);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isSyncing, setIsSyncing] = useState<boolean>(false);
  const entriesRef = useRef<LawChamberEntry[]>(entries);
  entriesRef.current = entries;

  // Fetch entries from DB
  const fetchEntries = useCallback(async (showToast = false) => {
    try {
      setIsSyncing(true);
      const res = await fetch('/api/law-chambers', {
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
    (passportNo: string, excludeId?: string): { isDuplicate: boolean; existingEntry?: LawChamberEntry } => {
      const clean = passportNo.trim().toUpperCase();
      if (!clean) return { isDuplicate: false };
      const found = entriesRef.current.find(
        (e) => e.passportNo.trim().toUpperCase() === clean && e.id !== excludeId
      );
      return {
        isDuplicate: !!found,
        existingEntry: found,
      };
    },
    []
  );

  // Add a new student entry
  const addEntry = useCallback(
    async (input: LawChamberInput): Promise<LawChamberEntry> => {
      const cleanPassport = input.passportNo.trim().toUpperCase();
      const dup = checkDuplicatePassport(cleanPassport);
      if (dup.isDuplicate && dup.existingEntry) {
        throw new Error(
          `Passport "${cleanPassport}" is already registered for "${dup.existingEntry.studentName}" (S.No: ${dup.existingEntry.srNo}). Duplicate entries are not allowed!`
        );
      }

      // Convert slip files to Data URLs if present
      const finalSlipUrls: string[] = [];
      if (input.slipUrls && Array.isArray(input.slipUrls)) {
        finalSlipUrls.push(...input.slipUrls);
      }
      if (input.slipFiles && input.slipFiles.length > 0) {
        for (const file of input.slipFiles) {
          try {
            const dataUrl = await fileToDataUrl(file);
            finalSlipUrls.push(dataUrl);
          } catch (e) {
            console.error('Error converting file to Data URL:', e);
          }
        }
      }

      const primarySlipUrl = finalSlipUrls[0] || input.slipUrl || null;
      const status = finalSlipUrls.length > 0 || input.slipUrl ? 'Slip Uploaded' : 'Slip Missing';
      const slipType: 'image' | 'pdf' | undefined = primarySlipUrl
        ? primarySlipUrl.includes('application/pdf') || primarySlipUrl.endsWith('.pdf')
          ? 'pdf'
          : 'image'
        : undefined;

      // Optimistic Entry
      const currentMaxSr = entriesRef.current.reduce((max, e) => Math.max(max, e.srNo || 0), 0);
      const nextSrNo = currentMaxSr + 1;
      const tempId = `temp_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;

      const optimisticEntry: LawChamberEntry = {
        id: tempId,
        srNo: nextSrNo,
        studentName: input.studentName.trim(),
        passportNo: cleanPassport,
        date: input.date,
        amount: Number(input.amount),
        reimbursed: input.reimbursed || 'Yes',
        status,
        slipUrl: primarySlipUrl,
        slipUrls: finalSlipUrls.length > 0 ? finalSlipUrls : undefined,
        slipType,
        notes: input.notes || null,
        addedBy: currentUser?.name || 'Admin',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      // Apply optimistic update instantly
      setEntries((prev) => {
        const next = [...prev, optimisticEntry];
        saveSafeCache(next);
        return next;
      });

      try {
        const res = await fetch('/api/law-chambers', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            studentName: input.studentName.trim(),
            passportNo: cleanPassport,
            date: input.date,
            amount: Number(input.amount),
            reimbursed: input.reimbursed || 'Yes',
            slipUrl: primarySlipUrl,
            slipUrls: finalSlipUrls,
            slipType,
            notes: input.notes,
          }),
        });

        const json = await res.json();
        if (!json.success) {
          // Rollback on failure
          setEntries((prev) => {
            const rolledBack = prev.filter((e) => e.id !== tempId);
            saveSafeCache(rolledBack);
            return rolledBack;
          });
          throw new Error(json.error || 'Server error while saving');
        }

        const realEntry = json.data;
        setEntries((prev) => {
          const replaced = prev.map((e) => (e.id === tempId ? realEntry : e));
          saveSafeCache(replaced);
          return replaced;
        });

        return realEntry;
      } catch (err: any) {
        // Rollback
        setEntries((prev) => {
          const rolledBack = prev.filter((e) => e.id !== tempId);
          saveSafeCache(rolledBack);
          return rolledBack;
        });
        throw err;
      }
    },
    [checkDuplicatePassport, currentUser]
  );

  // Update student entry
  const updateEntry = useCallback(
    async (id: string, input: Partial<LawChamberInput>): Promise<LawChamberEntry> => {
      if (input.passportNo) {
        const cleanPassport = input.passportNo.trim().toUpperCase();
        const dup = checkDuplicatePassport(cleanPassport, id);
        if (dup.isDuplicate && dup.existingEntry) {
          throw new Error(
            `Passport "${cleanPassport}" is already registered for "${dup.existingEntry.studentName}" (S.No: ${dup.existingEntry.srNo}). Duplicate entries are not allowed!`
          );
        }
      }

      // Convert slip files to Data URLs if present
      const finalSlipUrls: string[] = [];
      if (input.slipUrls && Array.isArray(input.slipUrls)) {
        finalSlipUrls.push(...input.slipUrls);
      }
      if (input.slipFiles && input.slipFiles.length > 0) {
        for (const file of input.slipFiles) {
          try {
            const dataUrl = await fileToDataUrl(file);
            finalSlipUrls.push(dataUrl);
          } catch (e) {
            console.error('Error converting file to Data URL:', e);
          }
        }
      }

      const primarySlipUrl = finalSlipUrls[0] || input.slipUrl || null;
      const status = finalSlipUrls.length > 0 || input.slipUrl ? 'Slip Uploaded' : 'Slip Missing';
      const slipType: 'image' | 'pdf' | undefined = primarySlipUrl
        ? primarySlipUrl.includes('application/pdf') || primarySlipUrl.endsWith('.pdf')
          ? 'pdf'
          : 'image'
        : undefined;

      // Optimistic update
      const previousEntries = [...entriesRef.current];
      setEntries((prev) => {
        const next: LawChamberEntry[] = prev.map((e) => {
          if (e.id === id) {
            const updated: LawChamberEntry = {
              ...e,
              studentName: input.studentName ? input.studentName.trim() : e.studentName,
              passportNo: input.passportNo ? input.passportNo.trim().toUpperCase() : e.passportNo,
              date: input.date || e.date,
              amount: input.amount !== undefined ? Number(input.amount) : e.amount,
              reimbursed: input.reimbursed !== undefined ? input.reimbursed : e.reimbursed,
              status,
              slipUrl: primarySlipUrl,
              slipUrls: finalSlipUrls.length > 0 ? finalSlipUrls : undefined,
              slipType,
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
        const res = await fetch('/api/law-chambers', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            id,
            studentName: input.studentName?.trim(),
            passportNo: input.passportNo?.trim().toUpperCase(),
            date: input.date,
            amount: input.amount,
            reimbursed: input.reimbursed,
            slipUrl: primarySlipUrl,
            slipUrls: finalSlipUrls,
            slipType,
            notes: input.notes,
          }),
        });

        const json = await res.json();
        if (!json.success) {
          setEntries(previousEntries);
          saveSafeCache(previousEntries);
          throw new Error(json.error || 'Server error while updating');
        }

        const realEntry = json.data;
        setEntries((prev) => {
          const replaced = prev.map((e) => (e.id === id ? realEntry : e));
          saveSafeCache(replaced);
          return replaced;
        });

        return realEntry;
      } catch (err: any) {
        setEntries(previousEntries);
        saveSafeCache(previousEntries);
        throw err;
      }
    },
    [checkDuplicatePassport]
  );

  // Delete single entry
  const deleteEntry = useCallback(async (id: string): Promise<void> => {
    const previousEntries = [...entriesRef.current];
    setEntries((prev) => {
      const filtered = prev.filter((e) => e.id !== id);
      saveSafeCache(filtered);
      return filtered;
    });

    try {
      const res = await fetch(`/api/law-chambers?id=${id}`, {
        method: 'DELETE',
      });
      const json = await res.json();
      if (!json.success) {
        setEntries(previousEntries);
        saveSafeCache(previousEntries);
        throw new Error(json.error || 'Failed to delete');
      }
    } catch (err: any) {
      setEntries(previousEntries);
      saveSafeCache(previousEntries);
      throw err;
    }
  }, []);

  // Delete multiple entries
  const deleteMultipleEntries = useCallback(async (ids: string[]): Promise<void> => {
    if (!ids || ids.length === 0) return;
    const previousEntries = [...entriesRef.current];
    setEntries((prev) => {
      const filtered = prev.filter((e) => !ids.includes(e.id));
      saveSafeCache(filtered);
      return filtered;
    });

    try {
      const res = await fetch('/api/law-chambers', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids }),
      });
      const json = await res.json();
      if (!json.success) {
        setEntries(previousEntries);
        saveSafeCache(previousEntries);
        throw new Error(json.error || 'Failed to delete entries');
      }
    } catch (err: any) {
      setEntries(previousEntries);
      saveSafeCache(previousEntries);
      throw err;
    }
  }, []);

  // Import batch
  const importEntries = useCallback(
    async (rows: any[]) => {
      setIsSyncing(true);
      try {
        const res = await fetch('/api/law-chambers/import', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ rows }),
        });
        const json = await res.json();
        if (!json.success) {
          throw new Error(json.error || 'Import failed');
        }
        await fetchEntries(false);
        return json;
      } finally {
        setIsSyncing(false);
      }
    },
    [fetchEntries]
  );

  return {
    entries,
    isLoading,
    isSyncing,
    fetchEntries,
    checkDuplicatePassport,
    addEntry,
    updateEntry,
    deleteEntry,
    deleteMultipleEntries,
    importEntries,
  };
}
