import * as Haptics from "expo-haptics";
import { Ionicons } from "@expo/vector-icons";
import React, { useCallback, useEffect, useRef, useState } from "react";
import { Platform, StyleSheet, View } from "react-native";
import WebView, { WebViewNavigation } from "react-native-webview";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import AddressBar from "@/components/AddressBar";
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
  getFilenameFromUrl,
  isDownloadable,
} from "@/utils/urlUtils";
import {
  buildGeolocationScript,
  buildLanguageScript,
  buildTimezoneScript,
  buildUserAgentScript,
  buildWebRTCLeakPreventScript,
  ADBLOCK_SCRIPT,
} from "@/services/spoofingScripts";

const DESKTOP_UA =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36";

function buildInjectionScript(options: {
  adBlock: boolean;
  extensionScript: string;
  proxy: any;
  desktopMode: boolean;
  effectiveUA: string;
}): string {
  const parts: string[] = [];

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

  return parts.length > 0 ? parts.join("\n") + "\ntrue;" : "true;";
}

function BrowserWebView({ tab, isActive }: { tab: Tab; isActive: boolean }) {
  const { updateTab, pendingCommand, clearPendingCommand } = useBrowser();
  const { settings } = useSettings();
  const { addHistory } = useHistory();
  const { startDownload } = useDownloads();
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
      effectiveUA: getEffectiveUserAgent(),
    });
  }, [tab.url, settings.adBlockEnabled, settings.desktopMode, getInjectionScript, proxyActive, activeProxy, getEffectiveUserAgent, isHome]);

  const effectiveUA = settings.desktopMode
    ? DESKTOP_UA
    : getEffectiveUserAgent() || undefined;

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
        javaScriptEnabled={settings.javascriptEnabled}
        domStorageEnabled
        allowsBackForwardNavigationGestures
        allowsInlineMediaPlayback
        mediaPlaybackRequiresUserAction={false}
        setSupportMultipleWindows={false}
        userAgent={effectiveUA}
        injectedJavaScript={injectedJS()}
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
            startDownload(request.url, filename, undefined, 4);
            return false;
          }
          return true;
        }}
        renderError={(domain, code, desc) => (
          <View style={[styles.errorView, { backgroundColor: colors.background }]}>
            <Ionicons name="wifi-outline" size={48} color={colors.mutedForeground} />
          </View>
        )}
      />
    </View>
  );
}

export default function BrowserScreen() {
  const { tabs, activeTabId, activeTab } = useBrowser();
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const [showTabs, setShowTabs] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
  const [showFind, setShowFind] = useState(false);

  return (
    <View
      style={[
        styles.container,
        {
          backgroundColor: activeTab?.isIncognito
            ? colors.incognito
            : colors.background,
        },
      ]}
    >
      <AddressBar
        onTabsPress={() => {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          setShowTabs(true);
        }}
        onMenuPress={() => {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          setShowMenu(true);
        }}
      />

      <View style={styles.webviewsContainer}>
        {tabs.map((tab) => (
          <BrowserWebView key={tab.id} tab={tab} isActive={tab.id === activeTabId} />
        ))}
      </View>

      <FindInPage
        visible={showFind}
        onClose={() => setShowFind(false)}
        onFind={() => {}}
      />

      <View
        style={[
          styles.bottomSafe,
          {
            height: Platform.OS === "web" ? 0 : insets.bottom,
            backgroundColor: activeTab?.isIncognito ? colors.incognito : colors.toolbar,
          },
        ]}
      />

      <TabsSheet visible={showTabs} onClose={() => setShowTabs(false)} />
      <MenuSheet
        visible={showMenu}
        onClose={() => setShowMenu(false)}
        onFindInPage={() => {
          setShowMenu(false);
          setTimeout(() => setShowFind(true), 300);
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  webviewsContainer: { flex: 1, position: "relative" },
  webviewContainer: { position: "absolute", top: 0, left: 0, right: 0, bottom: 0 },
  webview: { flex: 1 },
  errorView: { flex: 1, alignItems: "center", justifyContent: "center" },
  bottomSafe: {},
});
