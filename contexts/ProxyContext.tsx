import AsyncStorage from "@react-native-async-storage/async-storage";
import React, { createContext, useCallback, useContext, useEffect, useState } from "react";

export type ProxyType = "HTTP" | "HTTPS" | "SOCKS5";

export interface ProxyConfig {
  id: string;
  name: string;
  type: ProxyType;
  host: string;
  port: number;
  username?: string;
  password?: string;
  autoTimezone: boolean;
  timezone: string;
  autoLanguage: boolean;
  language: string;
  spoofLocation: boolean;
  lat: number;
  lng: number;
  spoofHardware: boolean;
  blockWebRTC: boolean;
  userAgentPreset: string;
}

const DEFAULT_UA_PRESETS: Record<string, string> = {
  default: "",
  chrome_windows: "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
  chrome_mac: "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
  firefox_windows: "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:109.0) Gecko/20100101 Firefox/121.0",
  safari_mac: "Mozilla/5.0 (Macintosh; Intel Mac OS X 14_2_1) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.2 Safari/605.1.15",
  edge: "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36 Edg/120.0.0.0",
  ios: "Mozilla/5.0 (iPhone; CPU iPhone OS 17_2 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.2 Mobile/15E148 Safari/604.1",
  googlebot: "Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)",
};

export { DEFAULT_UA_PRESETS };

export interface ProxySpoofingSettings {
  activeProxyId: string | null;
  globalEnabled: boolean;
  customUserAgent: string;
  useUserAgentPreset: string;
}

const STORAGE_KEY = "@nova_proxy_configs";
const SPOOFING_KEY = "@nova_spoofing";
const genId = () => Date.now().toString(36) + Math.random().toString(36).substr(2, 6);

const DEFAULT_SPOOFING: ProxySpoofingSettings = {
  activeProxyId: null,
  globalEnabled: false,
  customUserAgent: "",
  useUserAgentPreset: "default",
};

interface ProxyContextValue {
  proxies: ProxyConfig[];
  spoofing: ProxySpoofingSettings;
  activeProxy: ProxyConfig | null;
  addProxy: (config: Omit<ProxyConfig, "id">) => void;
  updateProxy: (id: string, updates: Partial<ProxyConfig>) => void;
  removeProxy: (id: string) => void;
  setActiveProxy: (id: string | null) => void;
  setSpoofing: <K extends keyof ProxySpoofingSettings>(key: K, value: ProxySpoofingSettings[K]) => void;
  getEffectiveUserAgent: () => string;
  isActive: boolean;
}

const ProxyContext = createContext<ProxyContextValue | null>(null);

export function ProxyProvider({ children }: { children: React.ReactNode }) {
  const [proxies, setProxies] = useState<ProxyConfig[]>([]);
  const [spoofing, setSpoofingState] = useState<ProxySpoofingSettings>(DEFAULT_SPOOFING);

  useEffect(() => {
    Promise.all([
      AsyncStorage.getItem(STORAGE_KEY),
      AsyncStorage.getItem(SPOOFING_KEY),
    ]).then(([raw, rawSpoofing]) => {
      if (raw) { try { setProxies(JSON.parse(raw)); } catch {} }
      if (rawSpoofing) { try { setSpoofingState({ ...DEFAULT_SPOOFING, ...JSON.parse(rawSpoofing) }); } catch {} }
    });
  }, []);

  const persistProxies = useCallback((list: ProxyConfig[]) => {
    AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(list));
  }, []);

  const persistSpoofing = useCallback((s: ProxySpoofingSettings) => {
    AsyncStorage.setItem(SPOOFING_KEY, JSON.stringify(s));
  }, []);

  const addProxy = useCallback((config: Omit<ProxyConfig, "id">) => {
    const newProxy: ProxyConfig = { ...config, id: genId() };
    setProxies((prev) => {
      const next = [...prev, newProxy];
      persistProxies(next);
      return next;
    });
  }, [persistProxies]);

  const updateProxy = useCallback((id: string, updates: Partial<ProxyConfig>) => {
    setProxies((prev) => {
      const next = prev.map((p) => p.id === id ? { ...p, ...updates } : p);
      persistProxies(next);
      return next;
    });
  }, [persistProxies]);

  const removeProxy = useCallback((id: string) => {
    setProxies((prev) => {
      const next = prev.filter((p) => p.id !== id);
      persistProxies(next);
      return next;
    });
    setSpoofingState((prev) => {
      if (prev.activeProxyId === id) {
        const updated = { ...prev, activeProxyId: null, globalEnabled: false };
        persistSpoofing(updated);
        return updated;
      }
      return prev;
    });
  }, [persistProxies, persistSpoofing]);

  const setActiveProxy = useCallback((id: string | null) => {
    setSpoofingState((prev) => {
      const updated = { ...prev, activeProxyId: id, globalEnabled: id !== null };
      persistSpoofing(updated);
      return updated;
    });
  }, [persistSpoofing]);

  const setSpoofing = useCallback(<K extends keyof ProxySpoofingSettings>(key: K, value: ProxySpoofingSettings[K]) => {
    setSpoofingState((prev) => {
      const updated = { ...prev, [key]: value };
      persistSpoofing(updated);
      return updated;
    });
  }, [persistSpoofing]);

  const getEffectiveUserAgent = useCallback((): string => {
    if (spoofing.customUserAgent) return spoofing.customUserAgent;
    if (spoofing.useUserAgentPreset && spoofing.useUserAgentPreset !== "default") {
      return DEFAULT_UA_PRESETS[spoofing.useUserAgentPreset] || "";
    }
    return "";
  }, [spoofing]);

  const activeProxy = proxies.find((p) => p.id === spoofing.activeProxyId) ?? null;
  const isActive = spoofing.globalEnabled && activeProxy !== null;

  return (
    <ProxyContext.Provider value={{ proxies, spoofing, activeProxy, addProxy, updateProxy, removeProxy, setActiveProxy, setSpoofing, getEffectiveUserAgent, isActive }}>
      {children}
    </ProxyContext.Provider>
  );
}

export function useProxy() {
  const ctx = useContext(ProxyContext);
  if (!ctx) throw new Error("useProxy must be used within ProxyProvider");
  return ctx;
}
