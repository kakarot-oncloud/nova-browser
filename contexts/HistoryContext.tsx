import AsyncStorage from "@react-native-async-storage/async-storage";
import React, { createContext, useCallback, useContext, useEffect, useState } from "react";

export interface HistoryItem {
  id: string;
  url: string;
  title: string;
  favicon?: string;
  visitedAt: number;
}

interface HistoryContextValue {
  history: HistoryItem[];
  addHistory: (url: string, title: string, favicon?: string) => void;
  removeHistory: (id: string) => void;
  clearHistory: () => void;
  searchHistory: (query: string) => HistoryItem[];
}

const HistoryContext = createContext<HistoryContextValue | null>(null);
const STORAGE_KEY = "@nova_history";
const MAX_HISTORY = 500;
const genId = () => Date.now().toString(36) + Math.random().toString(36).substr(2, 6);

export function HistoryProvider({ children }: { children: React.ReactNode }) {
  const [history, setHistory] = useState<HistoryItem[]>([]);

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY).then((raw) => {
      if (raw) {
        try { setHistory(JSON.parse(raw)); } catch {}
      }
    });
  }, []);

  const persist = useCallback((list: HistoryItem[]) => {
    AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(list));
  }, []);

  const addHistory = useCallback((url: string, title: string, favicon?: string) => {
    if (!url || url === "about:home" || url === "about:blank") return;
    setHistory((prev) => {
      const filtered = prev.filter((h) => h.url !== url);
      const next = [{ id: genId(), url, title, favicon, visitedAt: Date.now() }, ...filtered].slice(0, MAX_HISTORY);
      persist(next);
      return next;
    });
  }, [persist]);

  const removeHistory = useCallback((id: string) => {
    setHistory((prev) => {
      const next = prev.filter((h) => h.id !== id);
      persist(next);
      return next;
    });
  }, [persist]);

  const clearHistory = useCallback(() => {
    setHistory([]);
    AsyncStorage.removeItem(STORAGE_KEY);
  }, []);

  const searchHistory = useCallback((query: string) => {
    if (!query.trim()) return history;
    const q = query.toLowerCase();
    return history.filter((h) => h.url.toLowerCase().includes(q) || h.title.toLowerCase().includes(q));
  }, [history]);

  return (
    <HistoryContext.Provider value={{ history, addHistory, removeHistory, clearHistory, searchHistory }}>
      {children}
    </HistoryContext.Provider>
  );
}

export function useHistory() {
  const ctx = useContext(HistoryContext);
  if (!ctx) throw new Error("useHistory must be used within HistoryProvider");
  return ctx;
}
