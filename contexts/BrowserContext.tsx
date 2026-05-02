import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import { HOME_URL } from "@/utils/urlUtils";

export type NavCommand = "goBack" | "goForward" | "reload" | "stopLoading";

export interface Tab {
  id: string;
  url: string;
  title: string;
  favicon?: string;
  isIncognito: boolean;
  isLoading: boolean;
  loadProgress: number;
  canGoBack: boolean;
  canGoForward: boolean;
}

interface PendingCommand {
  tabId: string;
  command: NavCommand;
  timestamp: number;
}

interface BrowserContextValue {
  tabs: Tab[];
  activeTabId: string;
  activeTab: Tab | null;
  addTab: (url?: string, incognito?: boolean) => string;
  closeTab: (id: string) => void;
  switchTab: (id: string) => void;
  updateTab: (id: string, updates: Partial<Tab>) => void;
  navigateTo: (url: string) => void;
  closeAllTabs: () => void;
  pendingCommand: PendingCommand | null;
  clearPendingCommand: () => void;
  issueCommand: (command: NavCommand) => void;
}

const BrowserContext = createContext<BrowserContextValue | null>(null);

const genId = () =>
  Date.now().toString(36) + Math.random().toString(36).substr(2, 6);

const makeTab = (url = HOME_URL, incognito = false): Tab => ({
  id: genId(),
  url,
  title: "New Tab",
  isIncognito: incognito,
  isLoading: false,
  loadProgress: 0,
  canGoBack: false,
  canGoForward: false,
});

export function BrowserProvider({ children }: { children: React.ReactNode }) {
  const initialTab = makeTab();
  const [tabs, setTabs] = useState<Tab[]>([initialTab]);
  const [activeTabId, setActiveTabId] = useState<string>(initialTab.id);
  const [pendingCommand, setPendingCommand] = useState<PendingCommand | null>(null);

  const activeTab = tabs.find((t) => t.id === activeTabId) ?? null;

  const addTab = useCallback((url = HOME_URL, incognito = false): string => {
    const tab = makeTab(url, incognito);
    setTabs((prev) => [...prev, tab]);
    setActiveTabId(tab.id);
    return tab.id;
  }, []);

  const closeTab = useCallback(
    (id: string) => {
      setTabs((prev) => {
        const remaining = prev.filter((t) => t.id !== id);
        if (remaining.length === 0) {
          const fresh = makeTab();
          setActiveTabId(fresh.id);
          return [fresh];
        }
        if (id === activeTabId) {
          const closedIdx = prev.findIndex((t) => t.id === id);
          const next = remaining[Math.max(0, Math.min(closedIdx, remaining.length - 1))];
          setActiveTabId(next.id);
        }
        return remaining;
      });
    },
    [activeTabId]
  );

  const switchTab = useCallback((id: string) => {
    setActiveTabId(id);
  }, []);

  const updateTab = useCallback((id: string, updates: Partial<Tab>) => {
    setTabs((prev) =>
      prev.map((t) => (t.id === id ? { ...t, ...updates } : t))
    );
  }, []);

  const navigateTo = useCallback(
    (url: string) => {
      updateTab(activeTabId, { url, isLoading: true, loadProgress: 0 });
    },
    [activeTabId, updateTab]
  );

  const closeAllTabs = useCallback(() => {
    const fresh = makeTab();
    setTabs([fresh]);
    setActiveTabId(fresh.id);
  }, []);

  const issueCommand = useCallback(
    (command: NavCommand) => {
      setPendingCommand({ tabId: activeTabId, command, timestamp: Date.now() });
    },
    [activeTabId]
  );

  const clearPendingCommand = useCallback(() => {
    setPendingCommand(null);
  }, []);

  return (
    <BrowserContext.Provider
      value={{
        tabs,
        activeTabId,
        activeTab,
        addTab,
        closeTab,
        switchTab,
        updateTab,
        navigateTo,
        closeAllTabs,
        pendingCommand,
        clearPendingCommand,
        issueCommand,
      }}
    >
      {children}
    </BrowserContext.Provider>
  );
}

export function useBrowser() {
  const ctx = useContext(BrowserContext);
  if (!ctx) throw new Error("useBrowser must be used within BrowserProvider");
  return ctx;
}
