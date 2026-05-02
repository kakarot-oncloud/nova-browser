import * as Haptics from "expo-haptics";
import { Ionicons, MaterialIcons } from "@expo/vector-icons";
import React, {
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";
import {
  BackHandler,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  TouchableNativeFeedback,
  TouchableOpacity,
  View,
} from "react-native";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withSequence,
  interpolate,
} from "react-native-reanimated";
import WebView, { WebViewNavigation, WebViewMessageEvent } from "react-native-webview";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import FindInPage from "@/components/FindInPage";
import MenuSheet from "@/components/MenuSheet";
import SpeedDial from "@/components/SpeedDial";
import TabsSheet from "@/components/TabsSheet";
import { useBrowser, Tab } from "@/contexts/BrowserContext";
import { useDownloads } from "@/contexts/DownloadsContext";
import { useExtensions } from "@/contexts/ExtensionsContext";
import { useHistory } from "@/contexts/HistoryContext";
import { useProxy } from "@/contexts/ProxyContext";
import { useSettings } from "@/contexts/SettingsContext";
import { useColors } from "@/hooks/useColors";
import {
  HOME_URL,
  getDisplayUrl,
  getFilenameFromUrl,
  isDownloadable,
  isSecure,
  normalizeUrl,
} from "@/utils/urlUtils";
import {
  buildGeolocationScript,
  buildLanguageScript,
  buildTimezoneScript,
  buildUserAgentScript,
  buildWebRTCLeakPreventScript,
  ADBLOCK_SCRIPT,
} from "@/services/spoofingScripts";
import { categoryIcon, categoryColor, DownloadCategory } from "@/contexts/DownloadsContext";

const DESKTOP_UA =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36";

const DOWNLOAD_INTERCEPT_SCRIPT = `
(function() {
  document.addEventListener('click', function(e) {
    var el = e.target;
    var depth = 0;
    while (el && el.tagName !== 'A' && depth < 5) { el = el.parentElement; depth++; }
    if (el && el.tagName === 'A' && el.hasAttribute('download')) {
      e.preventDefault();
      e.stopPropagation();
      window.ReactNativeWebView.postMessage(JSON.stringify({
        type: 'download',
        url: el.href || el.getAttribute('href') || '',
        filename: el.getAttribute('download') || '',
      }));
    }
  }, true);
})(); true;
`;

function buildInjectionScript(options: {
  adBlock: boolean;
  extensionScript: string;
  proxy: any;
  desktopMode: boolean;
  effectiveUA: string;
}): string {
  const parts: string[] = [DOWNLOAD_INTERCEPT_SCRIPT];
  if (options.adBlock) parts.push(ADBLOCK_SCRIPT);
  if (options.proxy) {
    if (options.proxy.spoofLocation) parts.push(buildGeolocationScript(options.proxy.lat, options.proxy.lng));
    if (options.proxy.autoTimezone && options.proxy.timezone) parts.push(buildTimezoneScript(options.proxy.timezone));
    if (options.proxy.autoLanguage && options.proxy.language) parts.push(buildLanguageScript(options.proxy.language));
    if (options.proxy.blockWebRTC) parts.push(buildWebRTCLeakPreventScript());
  }
  if (options.effectiveUA) parts.push(buildUserAgentScript(options.effectiveUA));
  if (options.extensionScript && options.extensionScript !== "true;") parts.push(options.extensionScript);
  return parts.join("\n") + "\ntrue;";
}

function detectCategoryFromFilename(filename: string): DownloadCategory {
  const ext = filename.split(".").pop()?.toLowerCase() || "";
  if (/mp4|mkv|avi|mov|wmv|flv|webm|m4v|3gp/.test(ext)) return "video";
  if (/mp3|aac|wav|flac|ogg|m4a|opus/.test(ext)) return "audio";
  if (/pdf|doc|docx|xls|xlsx|ppt|pptx|txt|csv|epub/.test(ext)) return "document";
  if (/jpg|jpeg|png|gif|webp|bmp|svg|heic/.test(ext)) return "image";
  if (/zip|rar|7z|tar|gz/.test(ext)) return "archive";
  if (ext === "apk") return "apk";
  return "other";
}

function RippleBtn({ onPress, disabled, style, children }: {
  onPress: () => void;
  disabled?: boolean;
  style?: any;
  children: React.ReactNode;
}) {
  if (Platform.OS === "android") {
    return (
      <View style={[style, { borderRadius: 40, overflow: "hidden" }]}>
        <TouchableNativeFeedback
          onPress={onPress}
          disabled={disabled}
          background={TouchableNativeFeedback.Ripple("rgba(0,0,0,0.12)", true, 22)}
        >
          <View style={style}>{children}</View>
        </TouchableNativeFeedback>
      </View>
    );
  }
  return (
    <TouchableOpacity onPress={onPress} disabled={disabled} style={style} activeOpacity={0.6}>
      {children}
    </TouchableOpacity>
  );
}

interface DownloadDialogProps {
  visible: boolean;
  url: string;
  filename: string;
  referer?: string;
  onConfirm: (filename: string, threads: number) => void;
  onCancel: () => void;
}

function DownloadDialog({ visible, url, filename, referer, onConfirm, onCancel }: DownloadDialogProps) {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const [name, setName] = useState(filename);
  const [threads, setThreads] = useState(4);
  const slideY = useSharedValue(300);

  useEffect(() => {
    setName(filename);
    setThreads(4);
  }, [filename, url]);

  useEffect(() => {
    slideY.value = withTiming(visible ? 0 : 300, { duration: 280 });
  }, [visible]);

  const sheetStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: slideY.value }],
  }));

  const cat = detectCategoryFromFilename(filename);
  const catColor = categoryColor(cat);
  const catIco = categoryIcon(cat);

  const THREAD_OPTIONS = [
    { v: 1, label: "1×" },
    { v: 2, label: "2×" },
    { v: 4, label: "4×", rec: true },
    { v: 8, label: "8×" },
  ];

  if (!visible) return null;

  return (
    <Modal visible={visible} transparent animationType="none" onRequestClose={onCancel} statusBarTranslucent>
      <Pressable style={styles.dlOverlay} onPress={onCancel}>
        <Animated.View
          style={[styles.dlSheet, { backgroundColor: colors.card, paddingBottom: insets.bottom + 16 }, sheetStyle]}
        >
          <Pressable onPress={() => {}}>
            <View style={[styles.dlHandle, { backgroundColor: colors.border }]} />

            {/* File type header */}
            <View style={styles.dlHeaderRow}>
              <View style={[styles.dlFileIcon, { backgroundColor: catColor + "20" }]}>
                <Ionicons name={catIco as any} size={28} color={catColor} />
              </View>
              <View style={styles.dlHeaderText}>
                <Text style={[styles.dlTitle, { color: colors.foreground }]} numberOfLines={1}>
                  {filename || "File Download"}
                </Text>
                <Text style={[styles.dlSubtitle, { color: colors.mutedForeground }]} numberOfLines={1}>
                  {url.length > 50 ? url.substring(0, 50) + "…" : url}
                </Text>
              </View>
            </View>

            {/* Filename input */}
            <View style={styles.dlSection}>
              <Text style={[styles.dlSectionLabel, { color: colors.mutedForeground }]}>FILE NAME</Text>
              <TextInput
                style={[styles.dlInput, { backgroundColor: colors.muted, color: colors.foreground, borderColor: colors.border }]}
                value={name}
                onChangeText={setName}
                autoCapitalize="none"
                autoCorrect={false}
                selectTextOnFocus
                placeholderTextColor={colors.mutedForeground}
              />
            </View>

            {/* Thread selector */}
            <View style={styles.dlSection}>
              <Text style={[styles.dlSectionLabel, { color: colors.mutedForeground }]}>DOWNLOAD THREADS</Text>
              <View style={[styles.dlSegment, { backgroundColor: colors.muted }]}>
                {THREAD_OPTIONS.map((opt) => (
                  <TouchableOpacity
                    key={opt.v}
                    style={[
                      styles.dlSegmentBtn,
                      threads === opt.v && { backgroundColor: colors.primary, shadowColor: colors.primary, shadowOffset: { width: 0, height: 2 }, shadowRadius: 4, shadowOpacity: 0.4, elevation: 3 },
                    ]}
                    onPress={() => { setThreads(opt.v); Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); }}
                    activeOpacity={0.75}
                  >
                    <Text style={[styles.dlSegmentLabel, { color: threads === opt.v ? "#fff" : colors.mutedForeground }]}>
                      {opt.label}
                    </Text>
                    {opt.rec && (
                      <View style={[styles.dlRecBadge, { backgroundColor: threads === opt.v ? "#ffffff30" : colors.primary + "30" }]}>
                        <Text style={[styles.dlRecText, { color: threads === opt.v ? "#fff" : colors.primary }]}>REC</Text>
                      </View>
                    )}
                  </TouchableOpacity>
                ))}
              </View>
              <Text style={[styles.dlThreadHint, { color: colors.mutedForeground }]}>
                More threads = faster download on fast connections
              </Text>
            </View>

            {/* Action buttons */}
            <View style={styles.dlActions}>
              <TouchableOpacity
                style={[styles.dlCancelBtn, { backgroundColor: colors.muted }]}
                onPress={onCancel}
                activeOpacity={0.7}
              >
                <Text style={[styles.dlCancelText, { color: colors.foreground }]}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.dlConfirmBtn, { backgroundColor: colors.primary }]}
                onPress={() => onConfirm(name || filename, threads)}
                activeOpacity={0.8}
              >
                <Ionicons name="arrow-down-circle" size={18} color="#fff" />
                <Text style={styles.dlConfirmText}>Download</Text>
              </TouchableOpacity>
            </View>
          </Pressable>
        </Animated.View>
      </Pressable>
    </Modal>
  );
}

function BrowserWebView({
  tab,
  isActive,
  onDownloadRequest,
}: {
  tab: Tab;
  isActive: boolean;
  onDownloadRequest: (url: string, filename: string, referer: string) => void;
}) {
  const { updateTab, pendingCommand, clearPendingCommand } = useBrowser();
  const { settings } = useSettings();
  const { addHistory } = useHistory();
  const { getInjectionScript } = useExtensions();
  const { activeProxy, isActive: proxyActive, getEffectiveUserAgent } = useProxy();
  const colors = useColors();
  const webViewRef = useRef<WebView>(null);
  const isHome = !tab.url || tab.url === HOME_URL || tab.url === "about:blank";

  useEffect(() => {
    if (!pendingCommand || pendingCommand.tabId !== tab.id || !webViewRef.current) return;
    switch (pendingCommand.command) {
      case "goBack": webViewRef.current.goBack(); break;
      case "goForward": webViewRef.current.goForward(); break;
      case "reload": webViewRef.current.reload(); break;
      case "stopLoading": webViewRef.current.stopLoading(); break;
    }
    clearPendingCommand();
  }, [pendingCommand]);

  const injectedJS = useCallback(() => {
    const extensionScript = isHome ? "true;" : getInjectionScript(tab.url);
    return buildInjectionScript({
      adBlock: settings.adBlockEnabled && !isHome,
      extensionScript,
      proxy: proxyActive ? activeProxy : null,
      desktopMode: settings.desktopMode,
      effectiveUA: proxyActive ? getEffectiveUserAgent() : "",
    });
  }, [tab.url, settings.adBlockEnabled, settings.desktopMode, getInjectionScript, proxyActive, activeProxy, getEffectiveUserAgent, isHome]);

  const userAgent = settings.desktopMode ? DESKTOP_UA : undefined;

  function handleMessage(e: WebViewMessageEvent) {
    try {
      const data = JSON.parse(e.nativeEvent.data);
      if (data.type === "download" && data.url) {
        const dlFilename = (data.filename as string) || getFilenameFromUrl(data.url as string);
        onDownloadRequest(data.url as string, dlFilename, tab.url);
      }
    } catch {}
  }

  if (isHome) {
    return (
      <View
        style={[styles.webviewContainer, { opacity: isActive ? 1 : 0, zIndex: isActive ? 1 : -1 }]}
        pointerEvents={isActive ? "auto" : "none"}
      >
        <SpeedDial onSearch={() => {}} />
      </View>
    );
  }

  return (
    <View
      style={[styles.webviewContainer, { opacity: isActive ? 1 : 0, zIndex: isActive ? 1 : -1 }]}
      pointerEvents={isActive ? "auto" : "none"}
    >
      <WebView
        ref={webViewRef}
        source={{ uri: tab.url }}
        style={styles.webview}
        javaScriptEnabled={settings.javascriptEnabled}
        domStorageEnabled
        thirdPartyCookiesEnabled
        cacheEnabled
        allowFileAccess
        geolocationEnabled
        mixedContentMode="always"
        originWhitelist={["*"]}
        allowsInlineMediaPlayback
        mediaPlaybackRequiresUserAction={false}
        setSupportMultipleWindows={false}
        javaScriptCanOpenWindowsAutomatically
        userAgent={userAgent}
        injectedJavaScript={injectedJS()}
        onMessage={handleMessage}
        onNavigationStateChange={(state: WebViewNavigation) => {
          updateTab(tab.id, {
            url: state.url,
            title: state.title || state.url,
            canGoBack: state.canGoBack,
            canGoForward: state.canGoForward,
            isLoading: state.loading,
          });
          if (state.title && state.url !== HOME_URL && !state.loading && settings.saveHistory) {
            addHistory(state.url, state.title);
          }
        }}
        onLoadStart={() => updateTab(tab.id, { isLoading: true, loadProgress: 0.05 })}
        onLoadProgress={({ nativeEvent }) => updateTab(tab.id, { loadProgress: nativeEvent.progress })}
        onLoadEnd={() => updateTab(tab.id, { isLoading: false, loadProgress: 1 })}
        onShouldStartLoadWithRequest={(request) => {
          if (isDownloadable(request.url)) {
            const filename = getFilenameFromUrl(request.url);
            onDownloadRequest(request.url, filename, tab.url);
            return false;
          }
          return true;
        }}
        renderError={() => (
          <View style={[styles.errorView, { backgroundColor: colors.background }]}>
            <Ionicons name="cloud-offline-outline" size={64} color={colors.mutedForeground} />
            <Text style={[styles.errorTitle, { color: colors.foreground }]}>Can't load page</Text>
            <Text style={[styles.errorBody, { color: colors.mutedForeground }]}>
              Check your connection and try again
            </Text>
          </View>
        )}
      />
    </View>
  );
}

export default function BrowserScreen() {
  const { tabs, activeTabId, activeTab, navigateTo, issueCommand } = useBrowser();
  const { settings, updateSetting } = useSettings();
  const { startDownload } = useDownloads();
  const { isActive: proxyActive } = useProxy();
  const colors = useColors();
  const insets = useSafeAreaInsets();

  const [showTabs, setShowTabs] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
  const [showFind, setShowFind] = useState(false);
  const [editing, setEditing] = useState(false);
  const [inputText, setInputText] = useState("");
  const inputRef = useRef<TextInput>(null);

  const [dlDialog, setDlDialog] = useState<{
    visible: boolean;
    url: string;
    filename: string;
    referer: string;
  }>({ visible: false, url: "", filename: "", referer: "" });

  const progressWidth = useSharedValue(0);
  const progressOpacity = useSharedValue(0);

  const url = activeTab?.url ?? HOME_URL;
  const displayUrl = getDisplayUrl(url);
  const isHome = url === HOME_URL || url === "about:blank" || !url;
  const secure = isSecure(url);
  const isLoading = activeTab?.isLoading ?? false;
  const progress = activeTab?.loadProgress ?? 0;
  const tabCount = tabs.length;
  const isIncognito = activeTab?.isIncognito ?? false;
  const canGoBack = activeTab?.canGoBack ?? false;
  const canGoForward = activeTab?.canGoForward ?? false;
  const isDesktop = settings.desktopMode;

  useEffect(() => {
    if (isLoading) {
      progressOpacity.value = withTiming(1, { duration: 100 });
      progressWidth.value = withTiming(progress, { duration: 200 });
    } else {
      progressWidth.value = withTiming(1, { duration: 200 });
      progressOpacity.value = withTiming(0, { duration: 400 });
    }
  }, [isLoading, progress]);

  const progressBarStyle = useAnimatedStyle(() => ({
    width: `${progressWidth.value * 100}%` as any,
    opacity: progressOpacity.value,
  }));

  useEffect(() => {
    const handler = BackHandler.addEventListener("hardwareBackPress", () => {
      if (editing) { setEditing(false); return true; }
      if (showTabs) { setShowTabs(false); return true; }
      if (showMenu) { setShowMenu(false); return true; }
      if (showFind) { setShowFind(false); return true; }
      if (dlDialog.visible) { setDlDialog((d) => ({ ...d, visible: false })); return true; }
      if (canGoBack) { issueCommand("goBack"); return true; }
      return false;
    });
    return () => handler.remove();
  }, [canGoBack, issueCommand, editing, showTabs, showMenu, showFind, dlDialog.visible]);

  const { getSearchUrl } = useSettings();
  function startEditing() {
    setInputText(isHome ? "" : url);
    setEditing(true);
    setTimeout(() => inputRef.current?.focus(), 50);
  }
  function submitUrl() {
    const searchBase = getSearchUrl("").split("?")[0];
    const resolved = normalizeUrl(inputText.trim(), searchBase);
    setEditing(false);
    setInputText("");
    navigateTo(resolved);
  }

  function handleDownloadRequest(dlUrl: string, dlFilename: string, referer: string) {
    setDlDialog({ visible: true, url: dlUrl, filename: dlFilename, referer });
  }
  function confirmDownload(filename: string, threads: number) {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    startDownload(dlDialog.url, filename, undefined, threads, dlDialog.referer);
    setDlDialog((d) => ({ ...d, visible: false }));
  }

  const barBg = isIncognito ? colors.incognito : colors.toolbar;

  return (
    <View style={[styles.container, { backgroundColor: isIncognito ? colors.incognito : colors.background }]}>
      {/* Status bar spacer */}
      <View style={{ height: insets.top, backgroundColor: barBg }} />

      {/* WebViews */}
      <View style={styles.webviewsContainer}>
        {tabs.map((tab) => (
          <BrowserWebView
            key={tab.id}
            tab={tab}
            isActive={tab.id === activeTabId}
            onDownloadRequest={handleDownloadRequest}
          />
        ))}
      </View>

      <FindInPage visible={showFind} onClose={() => setShowFind(false)} onFind={() => {}} />

      {/* ── Bottom Chrome Bar ── */}
      <View
        style={[
          styles.bottomChrome,
          {
            backgroundColor: barBg,
            borderTopColor: colors.border,
            paddingBottom: Math.max(insets.bottom, 10),
            shadowColor: "#000",
          },
        ]}
      >
        {/* Loading progress bar */}
        <Animated.View
          style={[
            styles.progressBar,
            progressBarStyle,
            { backgroundColor: proxyActive ? "#22C55E" : colors.primary },
          ]}
        />

        {editing ? (
          /* ── URL Edit mode ── */
          <View style={styles.editRow}>
            <Ionicons
              name="search"
              size={16}
              color={colors.mutedForeground}
              style={styles.editSearchIcon}
            />
            <TextInput
              ref={inputRef}
              style={[styles.editInput, { color: colors.foreground }]}
              value={inputText}
              onChangeText={setInputText}
              onSubmitEditing={submitUrl}
              onBlur={() => setEditing(false)}
              autoCapitalize="none"
              autoCorrect={false}
              keyboardType="url"
              returnKeyType="go"
              selectTextOnFocus
              placeholderTextColor={colors.mutedForeground}
              placeholder="Search or enter URL"
            />
            {inputText.length > 0 && (
              <TouchableOpacity onPress={() => setInputText("")} style={styles.editClear}>
                <Ionicons name="close-circle" size={17} color={colors.mutedForeground} />
              </TouchableOpacity>
            )}
            <TouchableOpacity style={[styles.editCancelBtn, { backgroundColor: colors.muted }]} onPress={() => setEditing(false)}>
              <Text style={[styles.editCancelText, { color: colors.foreground }]}>Cancel</Text>
            </TouchableOpacity>
          </View>
        ) : (
          /* ── Normal Toolbar ── */
          <View style={styles.toolbar}>
            {/* Back */}
            <RippleBtn
              style={styles.iconBtn}
              onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); issueCommand("goBack"); }}
              disabled={!canGoBack}
            >
              <Ionicons
                name="chevron-back"
                size={26}
                color={canGoBack ? colors.foreground : colors.mutedForeground + "40"}
              />
            </RippleBtn>

            {/* Forward */}
            <RippleBtn
              style={styles.iconBtn}
              onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); issueCommand("goForward"); }}
              disabled={!canGoForward}
            >
              <Ionicons
                name="chevron-forward"
                size={26}
                color={canGoForward ? colors.foreground : colors.mutedForeground + "40"}
              />
            </RippleBtn>

            {/* URL Pill */}
            <TouchableOpacity
              style={[styles.urlPill, { backgroundColor: isIncognito ? colors.muted : colors.urlBar }]}
              onPress={startEditing}
              onLongPress={() => {
                if (!isHome) {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                  startEditing();
                }
              }}
              activeOpacity={0.75}
            >
              {!isHome && (
                <Ionicons
                  name={secure ? "lock-closed" : "warning-outline"}
                  size={12}
                  color={secure ? "#22C55E" : "#F59E0B"}
                  style={{ marginRight: 5 }}
                />
              )}
              {isIncognito && (
                <Ionicons name="glasses" size={14} color={colors.incognitoForeground} style={{ marginRight: 4 }} />
              )}
              {isDesktop && (
                <Ionicons name="desktop-outline" size={12} color={colors.primary} style={{ marginRight: 4 }} />
              )}
              <Text
                style={[
                  styles.urlText,
                  {
                    color: isHome ? colors.mutedForeground : isIncognito ? colors.incognitoForeground : colors.foreground,
                    fontStyle: isHome ? "italic" : "normal",
                  },
                ]}
                numberOfLines={1}
              >
                {isHome ? "Search or type a URL" : displayUrl}
              </Text>
            </TouchableOpacity>

            {/* Desktop / Mobile toggle */}
            <TouchableOpacity
              style={[
                styles.iconBtn,
                isDesktop && { backgroundColor: colors.primary + "18", borderRadius: 10 },
              ]}
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                updateSetting("desktopMode", !isDesktop);
              }}
              hitSlop={{ top: 8, bottom: 8, left: 4, right: 4 }}
            >
              <Ionicons
                name={isDesktop ? "desktop" : "phone-portrait-outline"}
                size={20}
                color={isDesktop ? colors.primary : colors.mutedForeground}
              />
            </TouchableOpacity>

            {/* Tab count */}
            <TouchableOpacity
              style={[styles.tabCountBtn, { borderColor: isIncognito ? colors.incognitoForeground : colors.foreground }]}
              onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); setShowTabs(true); }}
              hitSlop={{ top: 8, bottom: 8, left: 4, right: 4 }}
            >
              <Text style={[styles.tabCountText, { color: isIncognito ? colors.incognitoForeground : colors.foreground }]}>
                {tabCount > 99 ? "99+" : tabCount}
              </Text>
            </TouchableOpacity>

            {/* Menu */}
            <RippleBtn
              style={styles.iconBtn}
              onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); setShowMenu(true); }}
            >
              <Ionicons name="ellipsis-vertical" size={22} color={colors.foreground} />
            </RippleBtn>
          </View>
        )}
      </View>

      {/* Sheets */}
      <TabsSheet visible={showTabs} onClose={() => setShowTabs(false)} />
      <MenuSheet
        visible={showMenu}
        onClose={() => setShowMenu(false)}
        onFindInPage={() => { setShowMenu(false); setTimeout(() => setShowFind(true), 300); }}
      />

      <DownloadDialog
        visible={dlDialog.visible}
        url={dlDialog.url}
        filename={dlDialog.filename}
        referer={dlDialog.referer}
        onConfirm={confirmDownload}
        onCancel={() => setDlDialog((d) => ({ ...d, visible: false }))}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  webviewsContainer: { flex: 1, position: "relative" },
  webviewContainer: { position: "absolute", inset: 0 },
  webview: { flex: 1, backgroundColor: "#fff" },

  errorView: { flex: 1, alignItems: "center", justifyContent: "center", gap: 12, padding: 40 },
  errorTitle: { fontSize: 20, fontWeight: "700", fontFamily: "Inter_700Bold" },
  errorBody: { fontSize: 14, textAlign: "center", lineHeight: 20 },

  /* Bottom chrome */
  bottomChrome: {
    borderTopWidth: StyleSheet.hairlineWidth,
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 12,
  },
  progressBar: {
    position: "absolute",
    top: 0,
    left: 0,
    height: 2.5,
    borderRadius: 2,
  },
  toolbar: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 4,
    paddingTop: 8,
    paddingBottom: 4,
    gap: 0,
  },
  iconBtn: {
    width: 42,
    height: 44,
    alignItems: "center",
    justifyContent: "center",
  },
  urlPill: {
    flex: 1,
    height: 40,
    borderRadius: 22,
    paddingHorizontal: 14,
    flexDirection: "row",
    alignItems: "center",
    marginHorizontal: 2,
  },
  urlText: {
    fontSize: 14,
    flex: 1,
    fontFamily: "Inter_400Regular",
    letterSpacing: 0.1,
  },
  tabCountBtn: {
    width: 28,
    height: 24,
    borderRadius: 6,
    borderWidth: 2,
    alignItems: "center",
    justifyContent: "center",
    marginHorizontal: 3,
  },
  tabCountText: {
    fontSize: 11,
    fontWeight: "700",
    fontFamily: "Inter_700Bold",
    lineHeight: 13,
  },

  /* URL edit */
  editRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingTop: 8,
    paddingBottom: 4,
    gap: 6,
  },
  editSearchIcon: { marginRight: 2 },
  editInput: {
    flex: 1,
    height: 42,
    fontSize: 15,
    fontFamily: "Inter_400Regular",
    padding: 0,
    margin: 0,
  },
  editClear: { padding: 4 },
  editCancelBtn: {
    paddingHorizontal: 14,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
  },
  editCancelText: {
    fontSize: 14,
    fontWeight: "600",
    fontFamily: "Inter_600SemiBold",
  },

  /* Download dialog */
  dlOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.55)",
    justifyContent: "flex-end",
  },
  dlSheet: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingTop: 12,
    paddingHorizontal: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -6 },
    shadowOpacity: 0.2,
    shadowRadius: 16,
    elevation: 24,
  },
  dlHandle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    alignSelf: "center",
    marginBottom: 16,
  },
  dlHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    marginBottom: 20,
  },
  dlFileIcon: {
    width: 56,
    height: 56,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  dlHeaderText: { flex: 1 },
  dlTitle: {
    fontSize: 17,
    fontWeight: "700",
    fontFamily: "Inter_700Bold",
    marginBottom: 4,
  },
  dlSubtitle: { fontSize: 12 },
  dlSection: { marginBottom: 18 },
  dlSectionLabel: {
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 0.8,
    marginBottom: 8,
  },
  dlInput: {
    height: 46,
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 14,
    fontSize: 14,
    fontFamily: "Inter_400Regular",
  },
  dlSegment: {
    flexDirection: "row",
    borderRadius: 14,
    padding: 4,
    gap: 4,
  },
  dlSegmentBtn: {
    flex: 1,
    height: 52,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    gap: 2,
  },
  dlSegmentLabel: {
    fontSize: 16,
    fontWeight: "800",
    fontFamily: "Inter_700Bold",
  },
  dlRecBadge: {
    paddingHorizontal: 5,
    paddingVertical: 1,
    borderRadius: 4,
  },
  dlRecText: {
    fontSize: 8,
    fontWeight: "800",
    letterSpacing: 0.5,
  },
  dlThreadHint: {
    fontSize: 11,
    marginTop: 8,
    textAlign: "center",
  },
  dlActions: {
    flexDirection: "row",
    gap: 10,
    marginBottom: 4,
  },
  dlCancelBtn: {
    width: 100,
    height: 50,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  dlCancelText: {
    fontSize: 15,
    fontWeight: "600",
    fontFamily: "Inter_600SemiBold",
  },
  dlConfirmBtn: {
    flex: 1,
    height: 50,
    borderRadius: 14,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  dlConfirmText: {
    fontSize: 16,
    fontWeight: "700",
    fontFamily: "Inter_700Bold",
    color: "#fff",
  },
});
