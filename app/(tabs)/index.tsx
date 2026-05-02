import * as Haptics from "expo-haptics";
import { Ionicons } from "@expo/vector-icons";
import React, {
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";
import {
  Alert,
  BackHandler,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import WebView, { WebViewNavigation, WebViewMessageEvent } from "react-native-webview";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import FindInPage from "@/components/FindInPage";
import MenuSheet from "@/components/MenuSheet";
import SpeedDial from "@/components/SpeedDial";
import TabsSheet from "@/components/TabsSheet";
import { useBrowser, Tab } from "@/contexts/BrowserContext";
import { useBookmarks } from "@/contexts/BookmarksContext";
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

const MOBILE_CHROME_UA =
  "Mozilla/5.0 (Linux; Android 13; Pixel 7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.6099.230 Mobile Safari/537.36";

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
    if (options.proxy.spoofLocation) {
      parts.push(buildGeolocationScript(options.proxy.lat, options.proxy.lng));
    }
    if (options.proxy.autoTimezone && options.proxy.timezone) {
      parts.push(buildTimezoneScript(options.proxy.timezone));
    }
    if (options.proxy.autoLanguage && options.proxy.language) {
      parts.push(buildLanguageScript(options.proxy.language));
    }
    if (options.proxy.blockWebRTC) {
      parts.push(buildWebRTCLeakPreventScript());
    }
  }

  if (options.effectiveUA) {
    parts.push(buildUserAgentScript(options.effectiveUA));
  }

  if (options.extensionScript && options.extensionScript !== "true;") {
    parts.push(options.extensionScript);
  }

  return parts.join("\n") + "\ntrue;";
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
  const [name, setName] = useState(filename);
  const [threads, setThreads] = useState(4);

  useEffect(() => {
    setName(filename);
    setThreads(4);
  }, [filename, url]);

  const THREAD_OPTIONS = [1, 2, 4, 8];

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onCancel}>
      <Pressable style={styles.dlOverlay} onPress={onCancel}>
        <Pressable style={[styles.dlSheet, { backgroundColor: colors.card }]} onPress={() => {}}>
          {/* Handle */}
          <View style={[styles.dlHandle, { backgroundColor: colors.muted }]} />

          <View style={styles.dlHeader}>
            <Ionicons name="cloud-download-outline" size={24} color={colors.primary} />
            <Text style={[styles.dlTitle, { color: colors.foreground }]}>Download File</Text>
          </View>

          {/* URL preview */}
          <Text style={[styles.dlUrl, { color: colors.mutedForeground }]} numberOfLines={1}>
            {url}
          </Text>

          {/* Filename */}
          <Text style={[styles.dlLabel, { color: colors.mutedForeground }]}>File name</Text>
          <TextInput
            style={[styles.dlInput, { backgroundColor: colors.muted, color: colors.foreground, borderColor: colors.border }]}
            value={name}
            onChangeText={setName}
            autoCapitalize="none"
            autoCorrect={false}
            selectTextOnFocus
          />

          {/* Thread selector */}
          <Text style={[styles.dlLabel, { color: colors.mutedForeground }]}>Download threads</Text>
          <View style={styles.dlThreadRow}>
            {THREAD_OPTIONS.map((t) => (
              <TouchableOpacity
                key={t}
                style={[
                  styles.dlThreadBtn,
                  {
                    backgroundColor: threads === t ? colors.primary : colors.muted,
                    borderColor: threads === t ? colors.primary : colors.border,
                  },
                ]}
                onPress={() => setThreads(t)}
              >
                <Text style={[styles.dlThreadLabel, { color: threads === t ? "#fff" : colors.mutedForeground }]}>
                  {t}x
                </Text>
                {t === 4 && (
                  <Text style={[styles.dlThreadSub, { color: threads === t ? "#ffffff99" : colors.mutedForeground }]}>
                    rec
                  </Text>
                )}
              </TouchableOpacity>
            ))}
          </View>

          <View style={styles.dlActions}>
            <TouchableOpacity
              style={[styles.dlBtn, { backgroundColor: colors.muted }]}
              onPress={onCancel}
            >
              <Text style={[styles.dlBtnText, { color: colors.foreground }]}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.dlBtn, { backgroundColor: colors.primary, flex: 1.5 }]}
              onPress={() => onConfirm(name || filename, threads)}
            >
              <Ionicons name="download-outline" size={16} color="#fff" />
              <Text style={[styles.dlBtnText, { color: "#fff" }]}>Download Now</Text>
            </TouchableOpacity>
          </View>
        </Pressable>
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
    const proxyUA = proxyActive ? getEffectiveUserAgent() : "";
    return buildInjectionScript({
      adBlock: settings.adBlockEnabled && !isHome,
      extensionScript,
      proxy: proxyActive ? activeProxy : null,
      desktopMode: settings.desktopMode,
      effectiveUA: proxyUA,
    });
  }, [tab.url, settings.adBlockEnabled, settings.desktopMode, getInjectionScript, proxyActive, activeProxy, getEffectiveUserAgent, isHome]);

  const effectiveUA = settings.desktopMode
    ? DESKTOP_UA
    : proxyActive
    ? getEffectiveUserAgent() || MOBILE_CHROME_UA
    : MOBILE_CHROME_UA;

  function handleMessage(e: WebViewMessageEvent) {
    try {
      const data = JSON.parse(e.nativeEvent.data);
      if (data.type === "download") {
        const dlUrl = data.url as string;
        const dlFilename = (data.filename as string) || getFilenameFromUrl(dlUrl);
        if (dlUrl) {
          onDownloadRequest(dlUrl, dlFilename, tab.url);
        }
      }
    } catch {}
  }

  if (isHome) {
    return (
      <View
        style={[
          styles.webviewContainer,
          { opacity: isActive ? 1 : 0, zIndex: isActive ? 1 : -1 },
        ]}
        pointerEvents={isActive ? "auto" : "none"}
      >
        <SpeedDial onSearch={() => {}} />
      </View>
    );
  }

  return (
    <View
      style={[
        styles.webviewContainer,
        { opacity: isActive ? 1 : 0, zIndex: isActive ? 1 : -1 },
      ]}
      pointerEvents={isActive ? "auto" : "none"}
    >
      <WebView
        ref={webViewRef}
        source={{ uri: tab.url }}
        style={styles.webview}
        userAgent={effectiveUA}
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
        onLoadProgress={({ nativeEvent }) =>
          updateTab(tab.id, { loadProgress: nativeEvent.progress })
        }
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
            <Ionicons name="wifi-outline" size={56} color={colors.mutedForeground} />
            <Text style={[styles.errorTitle, { color: colors.foreground }]}>Can't reach page</Text>
            <Text style={[styles.errorSub, { color: colors.mutedForeground }]}>
              Check your connection and try again
            </Text>
          </View>
        )}
      />
    </View>
  );
}

export default function BrowserScreen() {
  const {
    tabs,
    activeTabId,
    activeTab,
    navigateTo,
    issueCommand,
  } = useBrowser();
  const { getSearchUrl } = useSettings();
  const { startDownload, activeCount } = useDownloads();
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

  useEffect(() => {
    const handler = BackHandler.addEventListener("hardwareBackPress", () => {
      if (editing) {
        setEditing(false);
        return true;
      }
      if (showTabs) { setShowTabs(false); return true; }
      if (showMenu) { setShowMenu(false); return true; }
      if (showFind) { setShowFind(false); return true; }
      if (dlDialog.visible) { setDlDialog((d) => ({ ...d, visible: false })); return true; }
      if (canGoBack) {
        issueCommand("goBack");
        return true;
      }
      return false;
    });
    return () => handler.remove();
  }, [canGoBack, issueCommand, editing, showTabs, showMenu, showFind, dlDialog.visible]);

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
  const urlBarBg = isIncognito ? colors.muted : colors.urlBar;

  return (
    <View
      style={[
        styles.container,
        {
          backgroundColor: isIncognito ? colors.incognito : colors.background,
          paddingTop: insets.top,
        },
      ]}
    >
      {/* WebViews — full remaining space */}
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

      {/* Find in page */}
      <FindInPage
        visible={showFind}
        onClose={() => setShowFind(false)}
        onFind={() => {}}
      />

      {/* ───── Bottom Chrome Bar ───── */}
      <View
        style={[
          styles.bottomBar,
          {
            backgroundColor: barBg,
            borderTopColor: colors.border,
            paddingBottom: Math.max(insets.bottom, 8),
          },
        ]}
      >
        {/* Loading progress stripe */}
        {isLoading && (
          <View style={[styles.progressTrack, { backgroundColor: colors.muted }]}>
            <View
              style={[
                styles.progressFill,
                {
                  backgroundColor: colors.progressBar,
                  width: `${Math.round(progress * 100)}%`,
                },
              ]}
            />
          </View>
        )}

        {editing ? (
          /* ── Inline URL edit mode ── */
          <View style={styles.editRow}>
            <TextInput
              ref={inputRef}
              style={[styles.editInput, { backgroundColor: urlBarBg, color: colors.foreground }]}
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
              placeholder="Search or enter URL..."
            />
            <TouchableOpacity
              style={[styles.editCancel, { backgroundColor: colors.muted }]}
              onPress={() => setEditing(false)}
            >
              <Text style={[styles.editCancelText, { color: colors.foreground }]}>Cancel</Text>
            </TouchableOpacity>
          </View>
        ) : (
          /* ── Normal toolbar row ── */
          <View style={styles.toolbarRow}>
            {/* Back */}
            <TouchableOpacity
              style={styles.toolbarBtn}
              onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); issueCommand("goBack"); }}
              disabled={!canGoBack}
              hitSlop={{ top: 8, bottom: 8, left: 4, right: 4 }}
            >
              <Ionicons name="chevron-back" size={26} color={canGoBack ? colors.foreground : colors.mutedForeground + "60"} />
            </TouchableOpacity>

            {/* Forward */}
            <TouchableOpacity
              style={styles.toolbarBtn}
              onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); issueCommand("goForward"); }}
              disabled={!canGoForward}
              hitSlop={{ top: 8, bottom: 8, left: 4, right: 4 }}
            >
              <Ionicons name="chevron-forward" size={26} color={canGoForward ? colors.foreground : colors.mutedForeground + "60"} />
            </TouchableOpacity>

            {/* URL Bar (middle) */}
            <TouchableOpacity
              style={[styles.urlBar, { backgroundColor: urlBarBg }]}
              onPress={startEditing}
              activeOpacity={0.8}
            >
              {!isHome && (
                <Ionicons
                  name={secure ? "lock-closed" : "warning-outline"}
                  size={11}
                  color={secure ? "#22C55E" : "#F59E0B"}
                  style={{ marginRight: 4 }}
                />
              )}
              {isIncognito && (
                <Ionicons name="glasses" size={13} color={colors.incognitoForeground} style={{ marginRight: 3 }} />
              )}
              <Text
                style={[
                  styles.urlText,
                  {
                    color: isHome
                      ? colors.mutedForeground
                      : isIncognito
                      ? colors.incognitoForeground
                      : colors.foreground,
                    fontStyle: isHome ? "italic" : "normal",
                  },
                ]}
                numberOfLines={1}
              >
                {isHome ? "Search or type a URL" : displayUrl}
              </Text>
              {isLoading && (
                <View style={[styles.urlLoadingDot, { backgroundColor: colors.primary }]} />
              )}
            </TouchableOpacity>

            {/* Tabs switcher */}
            <TouchableOpacity
              style={[styles.tabsBtn, { borderColor: isIncognito ? colors.incognitoForeground : colors.foreground }]}
              onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); setShowTabs(true); }}
              hitSlop={{ top: 8, bottom: 8, left: 4, right: 4 }}
            >
              <Text style={[styles.tabsCount, { color: isIncognito ? colors.incognitoForeground : colors.foreground }]}>
                {tabCount > 99 ? "99+" : tabCount}
              </Text>
            </TouchableOpacity>

            {/* Menu */}
            <TouchableOpacity
              style={styles.toolbarBtn}
              onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); setShowMenu(true); }}
              hitSlop={{ top: 8, bottom: 8, left: 4, right: 4 }}
            >
              <Ionicons name="ellipsis-vertical" size={22} color={colors.foreground} />
            </TouchableOpacity>
          </View>
        )}
      </View>

      {/* Sheets */}
      <TabsSheet visible={showTabs} onClose={() => setShowTabs(false)} />
      <MenuSheet
        visible={showMenu}
        onClose={() => setShowMenu(false)}
        onFindInPage={() => {
          setShowMenu(false);
          setTimeout(() => setShowFind(true), 300);
        }}
      />

      {/* Download dialog */}
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
  webviewContainer: { position: "absolute", top: 0, left: 0, right: 0, bottom: 0 },
  webview: { flex: 1 },

  errorView: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    padding: 40,
  },
  errorTitle: { fontSize: 18, fontWeight: "700", fontFamily: "Inter_700Bold" },
  errorSub: { fontSize: 14, textAlign: "center" },

  /* Bottom Chrome bar */
  bottomBar: {
    borderTopWidth: StyleSheet.hairlineWidth,
    paddingTop: 4,
  },
  progressTrack: {
    height: 2,
    width: "100%",
    marginBottom: 2,
  },
  progressFill: {
    height: 2,
  },
  toolbarRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 6,
    paddingVertical: 6,
    gap: 2,
  },
  toolbarBtn: {
    width: 40,
    height: 42,
    alignItems: "center",
    justifyContent: "center",
  },
  urlBar: {
    flex: 1,
    height: 38,
    borderRadius: 20,
    paddingHorizontal: 12,
    flexDirection: "row",
    alignItems: "center",
    marginHorizontal: 4,
  },
  urlText: {
    fontSize: 14,
    flex: 1,
    fontFamily: "Inter_500Medium",
  },
  urlLoadingDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginLeft: 4,
  },
  tabsBtn: {
    width: 28,
    height: 22,
    borderRadius: 5,
    borderWidth: 1.5,
    alignItems: "center",
    justifyContent: "center",
    marginHorizontal: 4,
  },
  tabsCount: {
    fontSize: 11,
    fontWeight: "700",
    fontFamily: "Inter_700Bold",
  },

  /* Editing mode */
  editRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 8,
    paddingVertical: 6,
    gap: 8,
  },
  editInput: {
    flex: 1,
    height: 40,
    borderRadius: 20,
    paddingHorizontal: 16,
    fontSize: 14,
    fontFamily: "Inter_400Regular",
  },
  editCancel: {
    paddingHorizontal: 14,
    height: 40,
    borderRadius: 20,
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
    backgroundColor: "#00000060",
    justifyContent: "flex-end",
  },
  dlSheet: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    paddingBottom: 32,
    gap: 12,
  },
  dlHandle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    alignSelf: "center",
    marginBottom: 4,
  },
  dlHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  dlTitle: {
    fontSize: 18,
    fontWeight: "700",
    fontFamily: "Inter_700Bold",
  },
  dlUrl: {
    fontSize: 12,
    marginTop: -4,
  },
  dlLabel: {
    fontSize: 12,
    fontWeight: "600",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  dlInput: {
    height: 44,
    borderRadius: 10,
    borderWidth: 1,
    paddingHorizontal: 14,
    fontSize: 14,
  },
  dlThreadRow: {
    flexDirection: "row",
    gap: 10,
  },
  dlThreadBtn: {
    flex: 1,
    height: 52,
    borderRadius: 10,
    borderWidth: 1.5,
    alignItems: "center",
    justifyContent: "center",
    gap: 2,
  },
  dlThreadLabel: {
    fontSize: 15,
    fontWeight: "700",
    fontFamily: "Inter_700Bold",
  },
  dlThreadSub: {
    fontSize: 10,
    fontWeight: "500",
  },
  dlActions: {
    flexDirection: "row",
    gap: 10,
    marginTop: 4,
  },
  dlBtn: {
    flex: 1,
    height: 48,
    borderRadius: 12,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
  },
  dlBtnText: {
    fontSize: 15,
    fontWeight: "700",
    fontFamily: "Inter_700Bold",
  },
});
