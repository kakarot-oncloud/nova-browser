import AsyncStorage from "@react-native-async-storage/async-storage";
import React, { createContext, useCallback, useContext, useEffect, useState } from "react";

export interface Bookmark {
  id: string;
  url: string;
  title: string;
  favicon?: string;
  createdAt: number;
  folder?: string;
}

interface BookmarksContextValue {
  bookmarks: Bookmark[];
  addBookmark: (url: string, title: string, favicon?: string) => void;
  removeBookmark: (id: string) => void;
  removeBookmarkByUrl: (url: string) => void;
  isBookmarked: (url: string) => boolean;
  clearBookmarks: () => void;
}

const BookmarksContext = createContext<BookmarksContextValue | null>(null);
const STORAGE_KEY = "@nova_bookmarks";
const genId = () => Date.now().toString(36) + Math.random().toString(36).substr(2, 6);

export function BookmarksProvider({ children }: { children: React.ReactNode }) {
  const [bookmarks, setBookmarks] = useState<Bookmark[]>([]);

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY).then((raw) => {
      if (raw) {
        try { setBookmarks(JSON.parse(raw)); } catch {}
      }
    });
  }, []);

  const persist = useCallback((list: Bookmark[]) => {
    AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(list));
  }, []);

  const addBookmark = useCallback((url: string, title: string, favicon?: string) => {
    setBookmarks((prev) => {
      if (prev.some((b) => b.url === url)) return prev;
      const next = [{ id: genId(), url, title, favicon, createdAt: Date.now() }, ...prev];
      persist(next);
      return next;
    });
  }, [persist]);

  const removeBookmark = useCallback((id: string) => {
    setBookmarks((prev) => {
      const next = prev.filter((b) => b.id !== id);
      persist(next);
      return next;
    });
  }, [persist]);

  const removeBookmarkByUrl = useCallback((url: string) => {
    setBookmarks((prev) => {
      const next = prev.filter((b) => b.url !== url);
      persist(next);
      return next;
    });
  }, [persist]);

  const isBookmarked = useCallback((url: string) => bookmarks.some((b) => b.url === url), [bookmarks]);

  const clearBookmarks = useCallback(() => {
    setBookmarks([]);
    AsyncStorage.removeItem(STORAGE_KEY);
  }, []);

  return (
    <BookmarksContext.Provider value={{ bookmarks, addBookmark, removeBookmark, removeBookmarkByUrl, isBookmarked, clearBookmarks }}>
      {children}
    </BookmarksContext.Provider>
  );
}

export function useBookmarks() {
  const ctx = useContext(BookmarksContext);
  if (!ctx) throw new Error("useBookmarks must be used within BookmarksProvider");
  return ctx;
}
