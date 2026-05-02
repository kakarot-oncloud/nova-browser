import * as Clipboard from "expo-clipboard";
import * as Haptics from "expo-haptics";
import * as Sharing from "expo-sharing";
import { Ionicons } from "@expo/vector-icons";
import React from "react";
import {
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TouchableNativeFeedback,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useBrowser } from "@/contexts/BrowserContext";
import { useBookmarks } from "@/contexts/BookmarksContext";
import { useSettings } from "@/contexts/SettingsContext";
import { useColors } from "@/hooks/useColors";
import { HOME_URL, getDisplayUrl } from "@/utils/urlUtils";

function Row({
  icon,
  label,
  onPress,
  right,
  danger,
  disabled,
}: {
  icon: string;
  label: string;
  onPress?: () => void;
  right?: React.ReactNode;
  danger?: boolean;
  disabled?: boolean;
}) {
  const colors = useColors();
  const iconColor = danger ? colors.destructive : disabled ? colors.mutedForeground : colors.foreground;
  const textColor = danger ? colors.destructive : disabled ? colors.mutedForeground : colors.foreground;

  const inner = (
    <View style={styles.row} pointerEvents="box-none">
      <View style={[styles.rowIconWrap, { backgroundColor: danger ? colors.destructive + "15" : colors.muted }]}>
        <Ionicons name={icon as any} size={19} color={iconColor} />
      </View>
      <Text style={[styles.rowLabel, { color: textColor }]}>{label}</Text>
      {right !== undefined ? right : null}
    </View>
  );

  if (!onPress) return inner;

  if (Platform.OS === "android") {
    return (
      <TouchableNativeFeedback
        onPress={onPress}
        disabled={disabled}
        background={TouchableNativeFeedback.Ripple(colors.muted, false)}
      >
        {inner}
      </TouchableNativeFeedback>
    );
  }
  return (
    <TouchableOpacity onPress={onPress} disabled={disabled} activeOpacity={0.65}>
      {inner}
    </TouchableOpacity>
  );
}

function Divider() {
  const colors = useColors();
  return <View style={[styles.divider, { backgroundColor: colors.border }]} />;
}

interface MenuSheetProps {
  visible: boolean;
  onClose: () => void;
  onFindInPage: () => void;
}

export default function MenuSheet({ visible, onClose, onFindInPage }: MenuSheetProps) {
  const { activeTab, navigateTo } = useBrowser();
  const { isBookmarked, addBookmark, removeBookmarkByUrl } = useBookmarks();
  const { settings, updateSetting } = useSettings();
  const colors = useColors();
  const insets = useSafeAreaInsets();

  const url = activeTab?.url ?? HOME_URL;
  const title = activeTab?.title ?? "";
  const isHome = !url || url === HOME_URL || url === "about:blank";
  const bookmarked = isBookmarked(url);

  async function handleShare() {
    onClose();
    if (isHome) return;
    if (Platform.OS !== "web") {
      const ok = await Sharing.isAvailableAsync();
      if (ok) { await Sharing.shareAsync(url, { dialogTitle: title }); return; }
    }
    await Clipboard.setStringAsync(url);
  }

  function handleBookmark() {
    if (isHome) return;
    if (bookmarked) removeBookmarkByUrl(url);
    else addBookmark(url, title);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    onClose();
  }

  async function handleCopy() {
    await Clipboard.setStringAsync(url);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    onClose();
  }

  function handleFind() {
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
            backgroundColor: colors.card,
            paddingBottom: Math.max(insets.bottom, 8),
          },
        ]}
      >
        <View style={[styles.handle, { backgroundColor: colors.border }]} />

        {/* Current URL chip */}
        {!isHome && (
          <View style={[styles.urlChip, { backgroundColor: colors.muted }]}>
            <Ionicons name="globe-outline" size={13} color={colors.mutedForeground} />
            <Text style={[styles.urlChipText, { color: colors.mutedForeground }]} numberOfLines={1}>
              {getDisplayUrl(url)}
            </Text>
          </View>
        )}

        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          bounces={false}
        >
          {/* Page actions */}
          <View style={[styles.section, { backgroundColor: colors.card }]}>
            <Row
              icon={bookmarked ? "bookmark" : "bookmark-outline"}
              label={bookmarked ? "Bookmarked" : "Bookmark"}
              onPress={handleBookmark}
              disabled={isHome}
            />
            <Divider />
            <Row icon="share-outline" label="Share" onPress={handleShare} disabled={isHome} />
            <Divider />
            <Row icon="search-outline" label="Find in page" onPress={handleFind} disabled={isHome} />
            <Divider />
            <Row icon="copy-outline" label="Copy link" onPress={handleCopy} disabled={isHome} />
          </View>

          {/* Browser settings */}
          <View style={[styles.section, { backgroundColor: colors.card, marginTop: 8 }]}>
            <View style={styles.row}>
              <View style={[styles.rowIconWrap, { backgroundColor: colors.muted }]}>
                <Ionicons name="shield-checkmark-outline" size={19} color={colors.foreground} />
              </View>
              <Text style={[styles.rowLabel, { color: colors.foreground }]}>Ad Blocker</Text>
              <Switch
                value={settings.adBlockEnabled}
                onValueChange={(v) => updateSetting("adBlockEnabled", v)}
                trackColor={{ false: colors.border, true: colors.primary }}
                thumbColor="#fff"
              />
            </View>
            <Divider />
            <View style={styles.row}>
              <View style={[styles.rowIconWrap, { backgroundColor: colors.muted }]}>
                <Ionicons name="code-slash-outline" size={19} color={colors.foreground} />
              </View>
              <Text style={[styles.rowLabel, { color: colors.foreground }]}>JavaScript</Text>
              <Switch
                value={settings.javascriptEnabled}
                onValueChange={(v) => updateSetting("javascriptEnabled", v)}
                trackColor={{ false: colors.border, true: colors.primary }}
                thumbColor="#fff"
              />
            </View>
            <Divider />
            <View style={styles.row}>
              <View style={[styles.rowIconWrap, { backgroundColor: colors.muted }]}>
                <Ionicons name="desktop-outline" size={19} color={colors.foreground} />
              </View>
              <Text style={[styles.rowLabel, { color: colors.foreground }]}>Desktop Mode</Text>
              <Switch
                value={settings.desktopMode}
                onValueChange={(v) => updateSetting("desktopMode", v)}
                trackColor={{ false: colors.border, true: colors.primary }}
                thumbColor="#fff"
              />
            </View>
          </View>

          {/* Reload */}
          <View style={[styles.section, { backgroundColor: colors.card, marginTop: 8 }]}>
            <Row
              icon="refresh-outline"
              label="Reload page"
              onPress={() => { navigateTo(url); onClose(); }}
              disabled={isHome}
            />
          </View>
        </ScrollView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: "rgba(0,0,0,0.35)" },
  sheet: {
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    maxHeight: "80%",
    elevation: 24,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -3 },
    shadowOpacity: 0.15,
    shadowRadius: 10,
  },
  handle: {
    width: 32,
    height: 4,
    borderRadius: 2,
    alignSelf: "center",
    marginTop: 8,
    marginBottom: 10,
  },
  urlChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginHorizontal: 16,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 8,
    marginBottom: 8,
  },
  urlChipText: { flex: 1, fontSize: 12 },
  scroll: {},
  scrollContent: { paddingBottom: 8 },
  section: {},
  row: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 13,
    gap: 14,
    minHeight: 52,
  },
  rowIconWrap: {
    width: 34,
    height: 34,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
  },
  rowLabel: { flex: 1, fontSize: 15, fontWeight: "400" },
  divider: {
    height: StyleSheet.hairlineWidth,
    marginLeft: 64,
  },
});
