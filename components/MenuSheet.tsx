import * as Clipboard from "expo-clipboard";
import * as Haptics from "expo-haptics";
import * as Sharing from "expo-sharing";
import { Ionicons } from "@expo/vector-icons";
import React, { useState } from "react";
import {
  Alert,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useBrowser } from "@/contexts/BrowserContext";
import { useBookmarks } from "@/contexts/BookmarksContext";
import { useDownloads } from "@/contexts/DownloadsContext";
import { useSettings } from "@/contexts/SettingsContext";
import { useColors } from "@/hooks/useColors";
import { HOME_URL, getFilenameFromUrl, isDownloadable } from "@/utils/urlUtils";

interface MenuSheetProps {
  visible: boolean;
  onClose: () => void;
  onFindInPage: () => void;
}

interface MenuRowProps {
  icon: string;
  label: string;
  onPress: () => void;
  rightContent?: React.ReactNode;
  danger?: boolean;
}

function MenuRow({ icon, label, onPress, rightContent, danger }: MenuRowProps) {
  const colors = useColors();
  return (
    <TouchableOpacity style={styles.menuRow} onPress={onPress} activeOpacity={0.7}>
      <Ionicons name={icon as any} size={20} color={danger ? colors.destructive : colors.foreground} />
      <Text style={[styles.menuLabel, { color: danger ? colors.destructive : colors.foreground }]}>{label}</Text>
      {rightContent ?? <Ionicons name="chevron-forward" size={16} color={colors.mutedForeground} />}
    </TouchableOpacity>
  );
}

export default function MenuSheet({ visible, onClose, onFindInPage }: MenuSheetProps) {
  const { activeTab } = useBrowser();
  const { isBookmarked, addBookmark, removeBookmarkByUrl } = useBookmarks();
  const { startDownload } = useDownloads();
  const { settings, updateSetting } = useSettings();
  const colors = useColors();
  const insets = useSafeAreaInsets();

  const url = activeTab?.url ?? HOME_URL;
  const title = activeTab?.title ?? "";
  const isHome = url === HOME_URL;
  const bookmarked = isBookmarked(url);

  async function handleShare() {
    onClose();
    if (isHome) return;
    if (Platform.OS !== "web") {
      const canShare = await Sharing.isAvailableAsync();
      if (canShare) {
        await Sharing.shareAsync(url, { dialogTitle: title });
      }
    }
    await Clipboard.setStringAsync(url);
    Alert.alert("Copied", "Link copied to clipboard");
  }

  function handleBookmark() {
    if (isHome) return;
    if (bookmarked) {
      removeBookmarkByUrl(url);
    } else {
      addBookmark(url, title);
    }
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    onClose();
  }

  function handleDownload() {
    if (isHome) return;
    const filename = getFilenameFromUrl(url);
    startDownload(url, filename);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    Alert.alert("Download Started", `Downloading: ${filename}`);
    onClose();
  }

  function handleFindInPage() {
    onClose();
    setTimeout(() => onFindInPage(), 300);
  }

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose} />
      <View
        style={[
          styles.sheet,
          {
            backgroundColor: colors.background,
            paddingBottom: insets.bottom + 10,
          },
        ]}
      >
        {/* Drag handle */}
        <View style={[styles.handle, { backgroundColor: colors.border }]} />

        {/* URL display */}
        {!isHome && (
          <View style={[styles.urlRow, { backgroundColor: colors.muted, borderColor: colors.border }]}>
            <Ionicons name="globe-outline" size={14} color={colors.mutedForeground} />
            <Text style={[styles.urlText, { color: colors.mutedForeground }]} numberOfLines={1}>
              {url}
            </Text>
          </View>
        )}

        <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent}>
          {/* Quick actions row */}
          <View style={styles.quickRow}>
            {[
              { icon: bookmarked ? "bookmark" : "bookmark-outline", label: bookmarked ? "Saved" : "Bookmark", action: handleBookmark, active: bookmarked },
              { icon: "share-outline", label: "Share", action: handleShare, active: false },
              { icon: "download-outline", label: "Download", action: handleDownload, active: false },
              { icon: "search-outline", label: "Find", action: handleFindInPage, active: false },
            ].map((item) => (
              <TouchableOpacity
                key={item.label}
                style={[styles.quickAction, { backgroundColor: item.active ? colors.primary + "20" : colors.card, borderColor: item.active ? colors.primary : colors.border }]}
                onPress={item.action}
                activeOpacity={0.7}
              >
                <Ionicons name={item.icon as any} size={22} color={item.active ? colors.primary : colors.foreground} />
                <Text style={[styles.quickLabel, { color: item.active ? colors.primary : colors.mutedForeground }]}>
                  {item.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Toggle rows */}
          <View style={[styles.section, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <View style={styles.toggleRow}>
              <Ionicons name="shield-checkmark-outline" size={20} color={colors.foreground} />
              <Text style={[styles.toggleLabel, { color: colors.foreground }]}>Ad Blocker</Text>
              <Switch
                value={settings.adBlockEnabled}
                onValueChange={(v) => updateSetting("adBlockEnabled", v)}
                trackColor={{ false: colors.border, true: colors.primary }}
                thumbColor="#fff"
              />
            </View>
            <View style={[styles.divider, { backgroundColor: colors.border }]} />
            <View style={styles.toggleRow}>
              <Ionicons name="code-slash-outline" size={20} color={colors.foreground} />
              <Text style={[styles.toggleLabel, { color: colors.foreground }]}>JavaScript</Text>
              <Switch
                value={settings.javascriptEnabled}
                onValueChange={(v) => updateSetting("javascriptEnabled", v)}
                trackColor={{ false: colors.border, true: colors.primary }}
                thumbColor="#fff"
              />
            </View>
            <View style={[styles.divider, { backgroundColor: colors.border }]} />
            <View style={styles.toggleRow}>
              <Ionicons name="desktop-outline" size={20} color={colors.foreground} />
              <Text style={[styles.toggleLabel, { color: colors.foreground }]}>Desktop Mode</Text>
              <Switch
                value={settings.desktopMode}
                onValueChange={(v) => updateSetting("desktopMode", v)}
                trackColor={{ false: colors.border, true: colors.primary }}
                thumbColor="#fff"
              />
            </View>
          </View>

          {/* Copy link */}
          {!isHome && (
            <TouchableOpacity
              style={[styles.copyBtn, { backgroundColor: colors.card, borderColor: colors.border }]}
              onPress={async () => {
                await Clipboard.setStringAsync(url);
                Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                Alert.alert("Copied", "Link copied to clipboard");
                onClose();
              }}
            >
              <Ionicons name="copy-outline" size={18} color={colors.foreground} />
              <Text style={[styles.copyLabel, { color: colors.foreground }]}>Copy Link</Text>
            </TouchableOpacity>
          )}
        </ScrollView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: "rgba(0,0,0,0.4)" },
  sheet: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: "75%",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 20,
  },
  handle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    alignSelf: "center",
    marginTop: 10,
    marginBottom: 12,
  },
  urlRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginHorizontal: 16,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    borderWidth: 1,
    marginBottom: 12,
  },
  urlText: { fontSize: 12, flex: 1 },
  scroll: {},
  scrollContent: { paddingHorizontal: 16, paddingBottom: 16, gap: 12 },
  quickRow: { flexDirection: "row", gap: 8 },
  quickAction: {
    flex: 1,
    alignItems: "center",
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
    gap: 4,
  },
  quickLabel: { fontSize: 11, fontWeight: "500" },
  section: { borderRadius: 14, borderWidth: 1, overflow: "hidden" },
  toggleRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 12,
  },
  toggleLabel: { flex: 1, fontSize: 14, fontWeight: "500" },
  divider: { height: StyleSheet.hairlineWidth, marginLeft: 48 },
  menuRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 14,
    gap: 12,
  },
  menuLabel: { flex: 1, fontSize: 14, fontWeight: "500" },
  copyBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
  },
  copyLabel: { fontSize: 14, fontWeight: "500" },
});
