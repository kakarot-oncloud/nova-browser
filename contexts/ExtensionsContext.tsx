import AsyncStorage from "@react-native-async-storage/async-storage";
import React, { createContext, useCallback, useContext, useEffect, useState } from "react";

export interface UserScript {
  id: string;
  name: string;
  description: string;
  version: string;
  author: string;
  matches: string[];
  excludes: string[];
  code: string;
  enabled: boolean;
  source: string;
  installedAt: number;
  runAt: "document-start" | "document-end";
  isBuiltin: boolean;
  icon?: string;
  grants: string[];
}

function parseMetadata(code: string): Partial<UserScript> {
  const meta: Partial<UserScript> = {};
  const block = code.match(/\/\/\s*==UserScript==([\s\S]*?)\/\/\s*==\/UserScript==/);
  if (!block) return meta;
  const lines = block[1].split("\n");
  const matches: string[] = [];
  const excludes: string[] = [];
  const grants: string[] = [];
  for (const line of lines) {
    const m = line.match(/@(\w+)\s+(.*)/);
    if (!m) continue;
    const [, key, val] = m;
    const v = val.trim();
    if (key === "name") meta.name = v;
    else if (key === "description") meta.description = v;
    else if (key === "version") meta.version = v;
    else if (key === "author") meta.author = v;
    else if (key === "match" || key === "include") matches.push(v);
    else if (key === "exclude") excludes.push(v);
    else if (key === "run-at") meta.runAt = v === "document-start" ? "document-start" : "document-end";
    else if (key === "grant") grants.push(v);
  }
  meta.matches = matches;
  meta.excludes = excludes;
  meta.grants = grants;
  return meta;
}

function patternToRegex(pattern: string): RegExp {
  if (pattern === "<all_urls>" || pattern === "*") return /.*/;
  const escaped = pattern
    .replace(/[.+?^${}()|[\]\\]/g, "\\$&")
    .replace(/\*/g, ".*");
  return new RegExp("^" + escaped + "$");
}

function matchesUrl(script: UserScript, url: string): boolean {
  if (!script.enabled) return false;
  if (script.matches.length === 0) return true;
  const matched = script.matches.some((p) => {
    try { return patternToRegex(p).test(url); } catch { return false; }
  });
  if (!matched) return false;
  if (script.excludes.length > 0) {
    const excluded = script.excludes.some((p) => {
      try { return patternToRegex(p).test(url); } catch { return false; }
    });
    if (excluded) return false;
  }
  return true;
}

const BUILTIN_SCRIPTS: UserScript[] = [
  {
    id: "builtin-dark-mode",
    name: "Dark Mode Everywhere",
    description: "Force dark mode on any website using CSS inversion",
    version: "1.0.0",
    author: "Nova Browser",
    matches: ["*"],
    excludes: [],
    code: `// ==UserScript==
// @name Dark Mode Everywhere
// @match *
// @run-at document-start
// ==/UserScript==
(function() {
  const s = document.createElement('style');
  s.textContent = 'html{filter:invert(0.9) hue-rotate(180deg) !important} img,video,canvas,svg,iframe,picture{filter:invert(1) hue-rotate(180deg) !important}';
  (document.head || document.documentElement).appendChild(s);
})();`,
    enabled: false,
    source: "builtin",
    installedAt: 0,
    runAt: "document-start",
    isBuiltin: true,
    grants: [],
  },
  {
    id: "builtin-cookie-remover",
    name: "Cookie Banner Remover",
    description: "Automatically removes GDPR cookie consent popups",
    version: "1.2.0",
    author: "Nova Browser",
    matches: ["*"],
    excludes: [],
    code: `// ==UserScript==
// @name Cookie Banner Remover
// @match *
// @run-at document-end
// ==/UserScript==
(function() {
  const sel = ['#cookie-banner','.cookie-banner','.cookie-consent','#gdpr-banner','.gdpr-notice','#onetrust-consent-sdk','.cc-window','#cookie-notice','[aria-label*="cookie" i]','[class*="cookie-bar"]','[id*="cookie-bar"]','[class*="CookieBanner"]','[class*="gdpr"]'];
  function clean() { sel.forEach(s => { try { document.querySelectorAll(s).forEach(e => e.remove()); } catch(ex){} }); }
  clean();
  new MutationObserver(clean).observe(document.body || document.documentElement, {childList:true,subtree:true});
})();`,
    enabled: true,
    source: "builtin",
    installedAt: 0,
    runAt: "document-end",
    isBuiltin: true,
    grants: [],
  },
  {
    id: "builtin-youtube-adskip",
    name: "YouTube Ad Skipper",
    description: "Automatically skips and removes YouTube ads",
    version: "2.1.0",
    author: "Nova Browser",
    matches: ["https://www.youtube.com/*", "https://youtube.com/*", "https://m.youtube.com/*"],
    excludes: [],
    code: `// ==UserScript==
// @name YouTube Ad Skipper
// @match https://www.youtube.com/*
// @match https://youtube.com/*
// @run-at document-end
// ==/UserScript==
(function() {
  function skipAd() {
    const skip = document.querySelector('.ytp-skip-ad-button, .ytp-ad-skip-button, [class*="skip-button"]');
    if (skip) { skip.click(); return; }
    const adShowing = document.querySelector('.ad-showing');
    if (adShowing) {
      const video = document.querySelector('video');
      if (video && isFinite(video.duration)) { video.currentTime = video.duration; }
    }
    const adOverlay = document.querySelector('.ytp-ad-overlay-close-button');
    if (adOverlay) adOverlay.click();
    const adBanner = document.querySelector('.ytp-ad-text-overlay');
    if (adBanner) { const parent = adBanner.closest('.ytp-ad-overlay-container'); if (parent) parent.remove(); }
  }
  setInterval(skipAd, 500);
})();`,
    enabled: true,
    source: "builtin",
    installedAt: 0,
    runAt: "document-end",
    isBuiltin: true,
    grants: [],
  },
  {
    id: "builtin-scroll-top",
    name: "Scroll to Top Button",
    description: "Adds a floating scroll-to-top button on long pages",
    version: "1.0.0",
    author: "Nova Browser",
    matches: ["*"],
    excludes: [],
    code: `// ==UserScript==
// @name Scroll to Top Button
// @match *
// @run-at document-end
// ==/UserScript==
(function() {
  const btn = document.createElement('button');
  btn.innerHTML = '&#8679;';
  btn.style.cssText = 'position:fixed;bottom:80px;right:16px;width:40px;height:40px;border-radius:50%;background:#6B5CF6;color:#fff;border:none;font-size:20px;cursor:pointer;z-index:99999;opacity:0;transition:opacity 0.3s;box-shadow:0 2px 8px rgba(0,0,0,0.3);display:flex;align-items:center;justify-content:center;';
  document.body.appendChild(btn);
  window.addEventListener('scroll', () => { btn.style.opacity = window.scrollY > 300 ? '1' : '0'; });
  btn.addEventListener('click', () => window.scrollTo({top:0,behavior:'smooth'}));
})();`,
    enabled: false,
    source: "builtin",
    installedAt: 0,
    runAt: "document-end",
    isBuiltin: true,
    grants: [],
  },
  {
    id: "builtin-reader-mode",
    name: "Reader Mode",
    description: "Simplifies article pages for distraction-free reading",
    version: "1.0.0",
    author: "Nova Browser",
    matches: ["*"],
    excludes: [],
    code: `// ==UserScript==
// @name Reader Mode
// @match *
// @run-at document-end
// ==/UserScript==
(function() {
  const isArticle = document.querySelector('article, [role="article"], .article-content, .post-content, .entry-content, main p');
  if (!isArticle) return;
  const btn = document.createElement('button');
  btn.textContent = '📖 Reader';
  btn.style.cssText = 'position:fixed;top:60px;right:10px;padding:6px 12px;background:#5455D4;color:#fff;border:none;border-radius:20px;font-size:13px;cursor:pointer;z-index:99999;box-shadow:0 2px 8px rgba(0,0,0,0.3);';
  document.body.appendChild(btn);
  let active = false;
  btn.addEventListener('click', () => {
    active = !active;
    if (active) {
      document.body.style.cssText = 'max-width:680px!important;margin:0 auto!important;padding:20px!important;font-family:Georgia,serif!important;font-size:18px!important;line-height:1.8!important;';
      Array.from(document.body.querySelectorAll('aside,nav,header,[class*="sidebar"],[class*="ad"],[class*="banner"],footer')).forEach(e=>e.style.display='none');
    } else {
      document.body.style.cssText = '';
      Array.from(document.body.querySelectorAll('aside,nav,header,[class*="sidebar"],[class*="ad"],[class*="banner"],footer')).forEach(e=>e.style.display='');
    }
    btn.textContent = active ? '✕ Exit Reader' : '📖 Reader';
  });
})();`,
    enabled: false,
    source: "builtin",
    installedAt: 0,
    runAt: "document-end",
    isBuiltin: true,
    grants: [],
  },
  {
    id: "builtin-popup-blocker",
    name: "Popup Blocker",
    description: "Blocks popup windows and new tab redirects",
    version: "1.0.0",
    author: "Nova Browser",
    matches: ["*"],
    excludes: [],
    code: `// ==UserScript==
// @name Popup Blocker
// @match *
// @run-at document-start
// ==/UserScript==
(function() {
  window.open = function() { return null; };
  window.alert = function() {};
  window.confirm = function() { return true; };
  window.prompt = function() { return null; };
})();`,
    enabled: true,
    source: "builtin",
    installedAt: 0,
    runAt: "document-start",
    isBuiltin: true,
    grants: [],
  },
];

const STORAGE_KEY = "@nova_extensions";
const genId = () => Date.now().toString(36) + Math.random().toString(36).substr(2, 6);

interface ExtensionsContextValue {
  scripts: UserScript[];
  enabledCount: number;
  toggleScript: (id: string) => void;
  removeScript: (id: string) => void;
  installFromUrl: (url: string) => Promise<void>;
  installFromCode: (code: string) => Promise<void>;
  getScriptsForUrl: (url: string) => UserScript[];
  getInjectionScript: (url: string) => string;
}

const ExtensionsContext = createContext<ExtensionsContextValue | null>(null);

export function ExtensionsProvider({ children }: { children: React.ReactNode }) {
  const [scripts, setScripts] = useState<UserScript[]>([]);

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY).then((raw) => {
      let userScripts: UserScript[] = [];
      if (raw) {
        try { userScripts = JSON.parse(raw); } catch {}
      }
      const merged = [
        ...BUILTIN_SCRIPTS.map((b) => {
          const saved = userScripts.find((u) => u.id === b.id);
          return saved ? { ...b, enabled: saved.enabled } : b;
        }),
        ...userScripts.filter((u) => !u.isBuiltin),
      ];
      setScripts(merged);
    });
  }, []);

  const persist = useCallback((list: UserScript[]) => {
    AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(list));
  }, []);

  const toggleScript = useCallback((id: string) => {
    setScripts((prev) => {
      const next = prev.map((s) => s.id === id ? { ...s, enabled: !s.enabled } : s);
      persist(next);
      return next;
    });
  }, [persist]);

  const removeScript = useCallback((id: string) => {
    setScripts((prev) => {
      const next = prev.filter((s) => s.id !== id);
      persist(next);
      return next;
    });
  }, [persist]);

  const installFromCode = useCallback(async (code: string): Promise<void> => {
    const meta = parseMetadata(code);
    const script: UserScript = {
      id: genId(),
      name: meta.name || "Unnamed Script",
      description: meta.description || "",
      version: meta.version || "1.0.0",
      author: meta.author || "Unknown",
      matches: meta.matches || ["*"],
      excludes: meta.excludes || [],
      grants: meta.grants || [],
      code,
      enabled: true,
      source: "manual",
      installedAt: Date.now(),
      runAt: meta.runAt || "document-end",
      isBuiltin: false,
    };
    setScripts((prev) => {
      const next = [...prev, script];
      persist(next);
      return next;
    });
  }, [persist]);

  const installFromUrl = useCallback(async (url: string): Promise<void> => {
    const resp = await fetch(url);
    const code = await resp.text();
    const meta = parseMetadata(code);
    const script: UserScript = {
      id: genId(),
      name: meta.name || url.split("/").pop() || "Script",
      description: meta.description || "",
      version: meta.version || "1.0.0",
      author: meta.author || "Unknown",
      matches: meta.matches || ["*"],
      excludes: meta.excludes || [],
      grants: meta.grants || [],
      code,
      enabled: true,
      source: url,
      installedAt: Date.now(),
      runAt: meta.runAt || "document-end",
      isBuiltin: false,
    };
    setScripts((prev) => {
      const next = [...prev, script];
      persist(next);
      return next;
    });
  }, [persist]);

  const getScriptsForUrl = useCallback((url: string) => {
    return scripts.filter((s) => matchesUrl(s, url));
  }, [scripts]);

  const getInjectionScript = useCallback((url: string): string => {
    const matching = scripts.filter((s) => matchesUrl(s, url));
    if (matching.length === 0) return "true;";
    return matching
      .map((s) => `(function(){try{${s.code}}catch(e){console.warn('[Nova:${s.name}]',e.message);}})();`)
      .join("\n") + "\ntrue;";
  }, [scripts]);

  const enabledCount = scripts.filter((s) => s.enabled).length;

  return (
    <ExtensionsContext.Provider value={{ scripts, enabledCount, toggleScript, removeScript, installFromUrl, installFromCode, getScriptsForUrl, getInjectionScript }}>
      {children}
    </ExtensionsContext.Provider>
  );
}

export function useExtensions() {
  const ctx = useContext(ExtensionsContext);
  if (!ctx) throw new Error("useExtensions must be used within ExtensionsProvider");
  return ctx;
}
