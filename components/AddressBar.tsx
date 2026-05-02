import * as Clipboard from "expo-clipboard";
import * as Haptics from "expo-haptics";
import { Ionicons } from "@expo/vector-icons";
import React, { useEffect, useRef, useState } from "react";
import {
  Animated,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useBrowser } from "@/contexts/BrowserContext";
import { useProxy } from "@/contexts/ProxyContext";
import { useSettings } from "@/contexts/SettingsContext";
import { useColors } from "@/hooks/useColors";
import { HOME_URL, getDisplayUrl, isSecure, normalizeUrl } from "@/utils/urlUtils";

interface AddressBarProps {
  onTabsPress: () => void;
  onMenuPress: () => void;
}

export default function AddressBar({ onTabsPress, onMenuPress }: AddressBarProps) {
  const { activeTab, tabs, navigateTo, issueCommand } = useBrowser();
  const { getSearchUrl } = useSettings();
  const { isActive: proxyActive, activeProxy } = useProxy();
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const [editing, setEditing] = useState(false);
  const [inputText, setInputText] = useState("");
  const inputRef = useRef<TextInput>(null);
  const progressAnim = useRef(new Animated.Value(0)).current;

  const url = activeTab?.url ?? HOME_URL;
  const displayUrl = getDisplayUrl(url);
  const isHome = url === HOME_URL || url === "about:blank" || !url;
  const secure = isSecure(url);
  const isLoading = activeTab?.isLoading ?? false;
  const progress = activeTab?.loadProgress ?? 0;
  const tabCount = tabs.length;
  const isIncognito = activeTab?.isIncognito ?? false;

  useEffect(() => {
    if (isLoading) {
      Animated.timing(progressAnim, { toValue: progress, duration: 100, useNativeDriver: false }).start();
    } else {
      Animated.sequence([
        Animated.timing(progressAnim, { toValue: 1, duration: 150, useNativeDriver: false }),
        Animated.timing(progressAnim, { toValue: 0, duration: 300, useNativeDriver: false }),
      ]).start();
    }
  }, [progress, isLoading]);

  function startEditing() {
    setInputText(isHome ? "" : url);
    setEditing(true);
    setTimeout(() => { inputRef.current?.focus(); }, 50);
  }

  function cancelEdit() {
    setEditing(false);
    setInputText("");
  }

  function submitUrl() {
    const searchBase = getSearchUrl("").split("?")[0];
    const resolved = normalizeUrl(inputText.trim(), searchBase);
    setEditing(false);
    setInputText("");
    navigateTo(resolved);
  }

  const barBg = isIncognito ? colors.incognito : colors.toolbar;
  const inputBg = isIncognito ? colors.muted : colors.urlBar;

  return (
    <View
      style={[
        styles.container,
        {
          backgroundColor: barBg,
          paddingTop: insets.top + (Platform.OS === "web" ? 20 : 0),
          borderBottomColor: colors.border,
        },
      ]}
    >
      {/* Progress bar */}
      {isLoading && (
        <Animated.View
          style={[
            styles.progressBar,
            {
              backgroundColor: colors.progressBar,
              width: progressAnim.interpolate({ inputRange: [0, 1], outputRange: ["0%", "100%"] }),
            },
          ]}
        />
      )}

      <View style={styles.row}>
        {/* Back */}
        <TouchableOpacity style={styles.navBtn} onPress={() => issueCommand("goBack")} disabled={!activeTab?.canGoBack} hitSlop={{ top: 8, bottom: 8, left: 4, right: 4 }}>
          <Ionicons name="chevron-back" size={22} color={activeTab?.canGoBack ? colors.foreground : colors.mutedForeground} />
        </TouchableOpacity>

        {/* Forward */}
        <TouchableOpacity style={styles.navBtn} onPress={() => issueCommand("goForward")} disabled={!activeTab?.canGoForward} hitSlop={{ top: 8, bottom: 8, left: 4, right: 4 }}>
          <Ionicons name="chevron-forward" size={22} color={activeTab?.canGoForward ? colors.foreground : colors.mutedForeground} />
        </TouchableOpacity>

        {/* URL Bar */}
        <Pressable
          style={[styles.urlBar, { backgroundColor: inputBg, borderRadius: colors.radius }]}
          onPress={startEditing}
          onLongPress={async () => {
            if (!isHome) {
              await Clipboard.setStringAsync(url);
              Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            }
          }}
        >
          {editing ? (
            <TextInput
              ref={inputRef}
              style={[styles.urlInput, { color: colors.foreground }]}
              value={inputText}
              onChangeText={setInputText}
              onSubmitEditing={submitUrl}
              onBlur={cancelEdit}
              autoCapitalize="none"
              autoCorrect={false}
              keyboardType="url"
              returnKeyType="go"
              selectTextOnFocus
              placeholderTextColor={colors.mutedForeground}
              placeholder="Search or enter URL"
            />
          ) : (
            <View style={styles.urlDisplay}>
              {/* Security / proxy indicators */}
              {!isHome && (
                <Ionicons
                  name={secure ? "lock-closed" : "warning-outline"}
                  size={11}
                  color={secure ? "#22C55E" : colors.mutedForeground}
                  style={{ marginRight: 3 }}
                />
              )}
              {proxyActive && (
                <View style={[styles.proxyBadge, { backgroundColor: colors.primary }]}>
                  <Ionicons name="shield" size={8} color="#fff" />
                  <Text style={styles.proxyBadgeText}>{activeProxy?.type}</Text>
                </View>
              )}
              {isIncognito && (
                <Ionicons name="glasses" size={13} color={colors.incognitoForeground} style={{ marginRight: 3 }} />
              )}
              <Text
                style={[
                  styles.urlText,
                  { color: isHome ? colors.mutedForeground : (isIncognito ? colors.incognitoForeground : colors.foreground), fontStyle: isHome ? "italic" : "normal" },
                ]}
                numberOfLines={1}
              >
                {isHome ? "Search or enter URL" : displayUrl}
              </Text>
            </View>
          )}
        </Pressable>

        {/* Reload / Stop */}
        <TouchableOpacity style={styles.navBtn} onPress={() => issueCommand(isLoading ? "stopLoading" : "reload")} hitSlop={{ top: 8, bottom: 8, left: 4, right: 4 }}>
          <Ionicons name={isLoading ? "close" : "refresh"} size={20} color={colors.foreground} />
        </TouchableOpacity>

        {/* Tabs */}
        <TouchableOpacity
          style={[styles.tabsBtn, { borderColor: isIncognito ? colors.incognitoForeground : colors.foreground }]}
          onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); onTabsPress(); }}
          hitSlop={{ top: 8, bottom: 8, left: 4, right: 4 }}
        >
          <Text style={[styles.tabsCount, { color: isIncognito ? colors.incognitoForeground : colors.foreground }]}>
            {tabCount > 99 ? "99+" : tabCount}
          </Text>
        </TouchableOpacity>

        {/* Menu */}
        <TouchableOpacity style={styles.navBtn} onPress={onMenuPress} hitSlop={{ top: 8, bottom: 8, left: 4, right: 4 }}>
          <Ionicons name="ellipsis-vertical" size={20} color={colors.foreground} />
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { borderBottomWidth: StyleSheet.hairlineWidth, paddingBottom: 6, paddingHorizontal: 8, overflow: "hidden" },
  progressBar: { position: "absolute", bottom: 0, left: 0, height: 2, zIndex: 10 },
  row: { flexDirection: "row", alignItems: "center", gap: 3, marginTop: 6 },
  navBtn: { width: 34, height: 34, alignItems: "center", justifyContent: "center" },
  urlBar: { flex: 1, height: 34, paddingHorizontal: 10, justifyContent: "center" },
  urlDisplay: { flexDirection: "row", alignItems: "center" },
  urlText: { fontSize: 13, flex: 1 },
  urlInput: { fontSize: 13, padding: 0, margin: 0, height: 34 },
  tabsBtn: { width: 28, height: 22, borderRadius: 5, borderWidth: 1.5, alignItems: "center", justifyContent: "center", marginHorizontal: 2 },
  tabsCount: { fontSize: 11, fontWeight: "700" },
  proxyBadge: { flexDirection: "row", alignItems: "center", paddingHorizontal: 4, paddingVertical: 1, borderRadius: 4, marginRight: 4, gap: 2 },
  proxyBadgeText: { color: "#fff", fontSize: 8, fontWeight: "700" },
});
