import AsyncStorage from "@react-native-async-storage/async-storage";
import * as FileSystem from "expo-file-system";
import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import { Alert } from "react-native";

export type DownloadStatus = "pending" | "downloading" | "paused" | "completed" | "failed" | "cancelled";
export type DownloadCategory = "video" | "audio" | "document" | "image" | "archive" | "apk" | "other";

export interface Download {
  id: string;
  url: string;
  filename: string;
  category: DownloadCategory;
  size?: number;
  downloadedBytes: number;
  progress: number;
  status: DownloadStatus;
  localPath?: string;
  startedAt: number;
  completedAt?: number;
  mimeType?: string;
  error?: string;
  speedBps: number;
  etaSeconds: number;
  threads: number;
}

function detectCategory(filename: string, mimeType?: string): DownloadCategory {
  const ext = filename.split(".").pop()?.toLowerCase() || "";
  if (/mp4|mkv|avi|mov|wmv|flv|webm|m4v|3gp|ts|mpg|mpeg/.test(ext)) return "video";
  if (/mp3|aac|wav|flac|ogg|m4a|opus|wma|aiff/.test(ext)) return "audio";
  if (/pdf|doc|docx|xls|xlsx|ppt|pptx|txt|csv|rtf|odt|epub/.test(ext)) return "document";
  if (/jpg|jpeg|png|gif|webp|bmp|svg|tiff|heic|avif/.test(ext)) return "image";
  if (/zip|rar|7z|tar|gz|bz2|xz|iso/.test(ext)) return "archive";
  if (ext === "apk") return "apk";
  if (mimeType) {
    if (mimeType.startsWith("video/")) return "video";
    if (mimeType.startsWith("audio/")) return "audio";
    if (mimeType.startsWith("image/")) return "image";
    if (mimeType.includes("pdf") || mimeType.includes("document")) return "document";
    if (mimeType.includes("zip") || mimeType.includes("compressed")) return "archive";
  }
  return "other";
}

export function categoryIcon(cat: DownloadCategory): string {
  switch (cat) {
    case "video": return "film-outline";
    case "audio": return "musical-notes-outline";
    case "document": return "document-text-outline";
    case "image": return "image-outline";
    case "archive": return "archive-outline";
    case "apk": return "logo-android";
    default: return "cloud-download-outline";
  }
}

export function categoryColor(cat: DownloadCategory): string {
  switch (cat) {
    case "video": return "#FF6B6B";
    case "audio": return "#A78BFA";
    case "document": return "#3B82F6";
    case "image": return "#22C55E";
    case "archive": return "#F59E0B";
    case "apk": return "#84CC16";
    default: return "#6B7280";
  }
}

export function formatBytes(bytes: number): string {
  if (bytes <= 0) return "0 B";
  if (bytes < 1024) return bytes + " B";
  if (bytes < 1048576) return (bytes / 1024).toFixed(1) + " KB";
  if (bytes < 1073741824) return (bytes / 1048576).toFixed(1) + " MB";
  return (bytes / 1073741824).toFixed(2) + " GB";
}

export function formatSpeed(bps: number): string {
  if (bps <= 0) return "0 B/s";
  if (bps < 1024) return bps.toFixed(0) + " B/s";
  if (bps < 1048576) return (bps / 1024).toFixed(1) + " KB/s";
  return (bps / 1048576).toFixed(1) + " MB/s";
}

export function formatEta(seconds: number): string {
  if (seconds <= 0 || !isFinite(seconds)) return "—";
  if (seconds < 60) return seconds.toFixed(0) + "s";
  if (seconds < 3600) return Math.floor(seconds / 60) + "m " + (seconds % 60).toFixed(0) + "s";
  return Math.floor(seconds / 3600) + "h " + Math.floor((seconds % 3600) / 60) + "m";
}

const CHROME_UA = "Mozilla/5.0 (Linux; Android 13; Pixel 7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.6099.230 Mobile Safari/537.36";

interface DownloadsContextValue {
  downloads: Download[];
  activeCount: number;
  startDownload: (url: string, filename: string, mimeType?: string, threads?: number, referer?: string) => Promise<void>;
  pauseDownload: (id: string) => void;
  resumeDownload: (id: string) => Promise<void>;
  cancelDownload: (id: string) => void;
  removeDownload: (id: string) => void;
  clearCompleted: () => void;
  openDownload: (download: Download) => void;
}

const DownloadsContext = createContext<DownloadsContextValue | null>(null);
const STORAGE_KEY = "@nova_downloads_v3";
const genId = () => Date.now().toString(36) + Math.random().toString(36).substr(2, 6);

const downloadTasks = new Map<string, any>();
const speedTrackers = new Map<string, { lastBytes: number; lastTime: number }>();

export function DownloadsProvider({ children }: { children: React.ReactNode }) {
  const [downloads, setDownloads] = useState<Download[]>([]);

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY).then((raw) => {
      if (raw) {
        try {
          const parsed: Download[] = JSON.parse(raw);
          const cleaned = parsed.map((d) =>
            d.status === "downloading" || d.status === "pending"
              ? { ...d, status: "paused" as DownloadStatus, speedBps: 0, etaSeconds: 0 }
              : d
          );
          setDownloads(cleaned);
        } catch {}
      }
    });
  }, []);

  const persist = useCallback((list: Download[]) => {
    AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(list));
  }, []);

  const updateDownload = useCallback((id: string, updates: Partial<Download>) => {
    setDownloads((prev) => {
      const next = prev.map((d) => d.id === id ? { ...d, ...updates } : d);
      persist(next);
      return next;
    });
  }, [persist]);

  const startDownload = useCallback(async (
    url: string,
    filename: string,
    mimeType?: string,
    threads = 4,
    referer?: string
  ): Promise<void> => {
    const id = genId();
    const dir = FileSystem.documentDirectory + "nova_downloads/";
    try {
      const info = await FileSystem.getInfoAsync(dir);
      if (!info.exists) await FileSystem.makeDirectoryAsync(dir, { intermediates: true });
    } catch {}

    const safeFilename = filename.replace(/[^a-zA-Z0-9._\-]/g, "_") || "download_" + Date.now();
    const localPath = dir + safeFilename;
    const category = detectCategory(safeFilename, mimeType);

    const newDownload: Download = {
      id, url, filename: safeFilename, category,
      downloadedBytes: 0, progress: 0,
      status: "downloading", localPath,
      startedAt: Date.now(),
      speedBps: 0, etaSeconds: 0,
      threads,
      mimeType,
    };

    setDownloads((prev) => {
      const next = [newDownload, ...prev];
      persist(next);
      return next;
    });

    speedTrackers.set(id, { lastBytes: 0, lastTime: Date.now() });

    const headers: Record<string, string> = {
      "User-Agent": CHROME_UA,
      "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8",
      "Accept-Language": "en-US,en;q=0.9",
    };
    if (referer) {
      headers["Referer"] = referer;
    }

    try {
      const task = FileSystem.createDownloadResumable(
        url,
        localPath,
        { headers },
        (prog) => {
          const downloaded = prog.totalBytesWritten;
          const total = prog.totalBytesExpectedToWrite;
          const progress = total > 0 ? downloaded / total : 0;

          const tracker = speedTrackers.get(id);
          let speedBps = 0;
          let etaSeconds = 0;
          if (tracker) {
            const now = Date.now();
            const dt = (now - tracker.lastTime) / 1000;
            if (dt >= 0.5) {
              const db = downloaded - tracker.lastBytes;
              speedBps = db / dt;
              const remaining = total - downloaded;
              etaSeconds = speedBps > 0 ? remaining / speedBps : 0;
              speedTrackers.set(id, { lastBytes: downloaded, lastTime: now });
            }
          }

          setDownloads((prev) => {
            return prev.map((d) => d.id === id ? {
              ...d,
              downloadedBytes: downloaded,
              size: total > 0 ? total : d.size,
              progress,
              status: "downloading" as DownloadStatus,
              speedBps: speedBps > 0 ? speedBps : d.speedBps,
              etaSeconds: etaSeconds > 0 ? etaSeconds : d.etaSeconds,
            } : d);
          });
        }
      );
      downloadTasks.set(id, task);
      const result = await task.downloadAsync();
      speedTrackers.delete(id);
      if (result) {
        updateDownload(id, {
          status: "completed",
          progress: 1,
          completedAt: Date.now(),
          localPath: result.uri,
          speedBps: 0,
          etaSeconds: 0,
        });
      } else {
        updateDownload(id, { status: "failed", error: "Download returned no result", speedBps: 0, etaSeconds: 0 });
      }
    } catch (err: any) {
      speedTrackers.delete(id);
      const msg: string = err?.message ?? "Download failed";
      if (msg.includes("cancelled") || msg.includes("cancel")) {
        updateDownload(id, { status: "cancelled", speedBps: 0, etaSeconds: 0 });
      } else {
        updateDownload(id, { status: "failed", error: msg, speedBps: 0, etaSeconds: 0 });
      }
    } finally {
      downloadTasks.delete(id);
    }
  }, [updateDownload, persist]);

  const pauseDownload = useCallback((id: string) => {
    const task = downloadTasks.get(id);
    if (task) { task.pauseAsync(); downloadTasks.delete(id); }
    speedTrackers.delete(id);
    updateDownload(id, { status: "paused", speedBps: 0, etaSeconds: 0 });
  }, [updateDownload]);

  const resumeDownload = useCallback(async (id: string) => {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    const all: Download[] = raw ? JSON.parse(raw) : [];
    const dl = all.find((d) => d.id === id);
    if (!dl || !dl.localPath) return;
    updateDownload(id, { status: "downloading" });
    speedTrackers.set(id, { lastBytes: dl.downloadedBytes || 0, lastTime: Date.now() });

    const headers: Record<string, string> = { "User-Agent": CHROME_UA };

    try {
      const task = FileSystem.createDownloadResumable(dl.url, dl.localPath, { headers }, (prog) => {
        const downloaded = prog.totalBytesWritten;
        const total = prog.totalBytesExpectedToWrite;
        const progress = total > 0 ? downloaded / total : 0;
        const tracker = speedTrackers.get(id);
        let speedBps = 0;
        let etaSeconds = 0;
        if (tracker) {
          const now = Date.now();
          const dt = (now - tracker.lastTime) / 1000;
          if (dt >= 0.5) {
            speedBps = (downloaded - tracker.lastBytes) / dt;
            etaSeconds = speedBps > 0 ? (total - downloaded) / speedBps : 0;
            speedTrackers.set(id, { lastBytes: downloaded, lastTime: now });
          }
        }
        setDownloads((prev) => prev.map((d) => d.id === id ? {
          ...d, downloadedBytes: downloaded,
          size: total > 0 ? total : d.size, progress,
          speedBps: speedBps || d.speedBps, etaSeconds: etaSeconds || d.etaSeconds,
        } : d));
      });
      downloadTasks.set(id, task);
      const result = await task.downloadAsync();
      speedTrackers.delete(id);
      if (result) {
        updateDownload(id, { status: "completed", progress: 1, completedAt: Date.now(), speedBps: 0, etaSeconds: 0 });
      }
    } catch (err: any) {
      speedTrackers.delete(id);
      updateDownload(id, { status: "failed", error: err?.message, speedBps: 0, etaSeconds: 0 });
    } finally {
      downloadTasks.delete(id);
    }
  }, [updateDownload]);

  const cancelDownload = useCallback((id: string) => {
    const task = downloadTasks.get(id);
    if (task) { task.cancelAsync(); downloadTasks.delete(id); }
    speedTrackers.delete(id);
    updateDownload(id, { status: "cancelled", speedBps: 0, etaSeconds: 0 });
  }, [updateDownload]);

  const removeDownload = useCallback((id: string) => {
    cancelDownload(id);
    setDownloads((prev) => {
      const next = prev.filter((d) => d.id !== id);
      persist(next);
      return next;
    });
  }, [cancelDownload, persist]);

  const clearCompleted = useCallback(() => {
    setDownloads((prev) => {
      const next = prev.filter((d) => d.status !== "completed" && d.status !== "failed" && d.status !== "cancelled");
      persist(next);
      return next;
    });
  }, [persist]);

  const openDownload = useCallback((download: Download) => {
    if (download.status !== "completed") {
      Alert.alert("Not Ready", "Download is not complete yet.");
      return;
    }
    Alert.alert(
      "File Ready",
      `${download.filename}\n${formatBytes(download.size || 0)}\nSaved to Downloads folder`,
      [{ text: "OK" }]
    );
  }, []);

  const activeCount = downloads.filter((d) => d.status === "downloading" || d.status === "paused").length;

  return (
    <DownloadsContext.Provider value={{
      downloads, activeCount, startDownload,
      pauseDownload, resumeDownload, cancelDownload,
      removeDownload, clearCompleted, openDownload,
    }}>
      {children}
    </DownloadsContext.Provider>
  );
}

export function useDownloads() {
  const ctx = useContext(DownloadsContext);
  if (!ctx) throw new Error("useDownloads must be used within DownloadsProvider");
  return ctx;
}
