export const HOME_URL = "about:home";

export function normalizeUrl(input: string, searchUrl: string): string {
  const trimmed = input.trim();
  if (!trimmed) return HOME_URL;
  if (trimmed === HOME_URL || trimmed === "about:blank") return trimmed;
  if (trimmed.startsWith("http://") || trimmed.startsWith("https://")) return trimmed;
  if (trimmed.startsWith("ftp://")) return trimmed;

  const urlLike = /^([a-zA-Z0-9]([a-zA-Z0-9\-]{0,61}[a-zA-Z0-9])?\.)+[a-zA-Z]{2,}(\/.*)?$/;
  if (urlLike.test(trimmed) && !trimmed.includes(" ")) {
    return "https://" + trimmed;
  }

  const params = new URLSearchParams({ q: trimmed });
  return searchUrl + "?" + params.toString();
}

export function getDisplayUrl(url: string): string {
  if (!url || url === HOME_URL || url === "about:blank") return "";
  try {
    const parsed = new URL(url);
    return parsed.hostname.replace(/^www\./, "") + (parsed.pathname !== "/" ? parsed.pathname : "");
  } catch {
    return url;
  }
}

export function isSecure(url: string): boolean {
  return url.startsWith("https://");
}

export function getHostname(url: string): string {
  try {
    return new URL(url).hostname;
  } catch {
    return url;
  }
}

export function isDownloadable(url: string): boolean {
  const downloadExtensions = [
    ".pdf", ".zip", ".rar", ".tar", ".gz", ".7z",
    ".mp4", ".mp3", ".avi", ".mov", ".mkv", ".wav", ".flac",
    ".apk", ".exe", ".dmg", ".pkg",
    ".doc", ".docx", ".xls", ".xlsx", ".ppt", ".pptx",
    ".csv", ".txt", ".json", ".xml",
    ".jpg", ".jpeg", ".png", ".gif", ".webp", ".svg",
  ];
  const lower = url.toLowerCase().split("?")[0];
  return downloadExtensions.some((ext) => lower.endsWith(ext));
}

export function getFilenameFromUrl(url: string): string {
  try {
    const pathname = new URL(url).pathname;
    const parts = pathname.split("/").filter(Boolean);
    if (parts.length > 0) {
      const last = parts[parts.length - 1];
      if (last.includes(".")) return decodeURIComponent(last);
    }
  } catch {}
  return "download_" + Date.now();
}
