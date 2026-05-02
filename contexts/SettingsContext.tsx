import AsyncStorage from "@react-native-async-storage/async-storage";
import React, { createContext, useCallback, useContext, useEffect, useState } from "react";
import { DEFAULT_SEARCH_ENGINE, SEARCH_ENGINES, buildSearchUrl } from "@/constants/searchEngines";

export interface BrowserSettings {
  searchEngineId: string;
  adBlockEnabled: boolean;
  javascriptEnabled: boolean;
  desktopMode: boolean;
  saveHistory: boolean;
  darkMode: "auto" | "light" | "dark";
  fontSize: number;
  homePage: string;
  showImages: boolean;
}

const DEFAULT_SETTINGS: BrowserSettings = {
  searchEngineId: DEFAULT_SEARCH_ENGINE,
  adBlockEnabled: true,
  javascriptEnabled: true,
  desktopMode: false,
  saveHistory: true,
  darkMode: "auto",
  fontSize: 100,
  homePage: "",
  showImages: true,
};

const STORAGE_KEY = "@nova_browser_settings";

interface SettingsContextValue {
  settings: BrowserSettings;
  updateSetting: <K extends keyof BrowserSettings>(key: K, value: BrowserSettings[K]) => void;
  resetSettings: () => void;
  getSearchUrl: (query: string) => string;
  currentSearchEngine: (typeof SEARCH_ENGINES)[0];
}

const SettingsContext = createContext<SettingsContextValue | null>(null);

export function SettingsProvider({ children }: { children: React.ReactNode }) {
  const [settings, setSettings] = useState<BrowserSettings>(DEFAULT_SETTINGS);

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY).then((raw) => {
      if (raw) {
        try {
          const parsed = JSON.parse(raw) as Partial<BrowserSettings>;
          setSettings((prev) => ({ ...prev, ...parsed }));
        } catch {}
      }
    });
  }, []);

  const updateSetting = useCallback(<K extends keyof BrowserSettings>(key: K, value: BrowserSettings[K]) => {
    setSettings((prev) => {
      const next = { ...prev, [key]: value };
      AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      return next;
    });
  }, []);

  const resetSettings = useCallback(() => {
    setSettings(DEFAULT_SETTINGS);
    AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(DEFAULT_SETTINGS));
  }, []);

  const currentSearchEngine = SEARCH_ENGINES.find((e) => e.id === settings.searchEngineId) ?? SEARCH_ENGINES[0];

  const getSearchUrl = useCallback(
    (query: string) => buildSearchUrl(currentSearchEngine, query),
    [currentSearchEngine]
  );

  return (
    <SettingsContext.Provider value={{ settings, updateSetting, resetSettings, getSearchUrl, currentSearchEngine }}>
      {children}
    </SettingsContext.Provider>
  );
}

export function useSettings() {
  const ctx = useContext(SettingsContext);
  if (!ctx) throw new Error("useSettings must be used within SettingsProvider");
  return ctx;
}
