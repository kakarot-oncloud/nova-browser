import * as Haptics from "expo-haptics";
import { Ionicons } from "@expo/vector-icons";
import React from "react";
import {
  FlatList,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TouchableNativeFeedback,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useBrowser, Tab } from "@/contexts/BrowserContext";
import { useColors } from "@/hooks/useColors";
import { getDisplayUrl, HOME_URL } from "@/utils/urlUtils";

function TabRow({
  tab,
  isActive,
  onPress,
  onClose,
}: {
  tab: Tab;
  isActive: boolean;
  onPress: () => void;
  onClose: () => void;
}) {
  const colors = useColors();
  const display = tab.url === HOME_URL || !tab.url ? "New Tab" : getDisplayUrl(tab.url);
  const title = tab.title && tab.title !== tab.url ? tab.title : display;

  const inner = (
    <View
      style={[
        styles.tabRow,
        {
          backgroundColor: isActive ? colors.primary + "12" : "transparent",
        },
      ]}
    >
      {/* Site indicator */}
      <View
        style={[
          styles.favicon,
          { backgroundColor: isActive ? colors.primary : colors.muted },
        ]}
      >
        {tab.isIncognito ? (
          <Ionicons name="glasses" size={14} color={isActive ? "#fff" : colors.mutedForeground} />
        ) : (
          <Ionicons name="globe-outline" size={14} color={isActive ? "#fff" : colors.mutedForeground} />
        )}
      </View>

      {/* Title + URL */}
      <View style={styles.tabInfo}>
        <Text
          style={[
            styles.tabTitle,
            { color: isActive ? colors.primary : colors.foreground },
          ]}
          numberOfLines={1}
        >
          {title}
        </Text>
        {tab.url && tab.url !== HOME_URL && (
          <Text style={[styles.tabUrl, { color: colors.mutedForeground }]} numberOfLines={1}>
            {display}
          </Text>
        )}
      </View>

      {/* Active indicator dot */}
      {isActive && (
        <View style={[styles.activeDot, { backgroundColor: colors.primary }]} />
      )}

      {/* Close button */}
      <TouchableOpacity
        onPress={onClose}
        hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        style={styles.closeBtn}
        activeOpacity={0.6}
      >
        <Ionicons name="close" size={18} color={colors.mutedForeground} />
      </TouchableOpacity>
    </View>
  );

  if (Platform.OS === "android") {
    return (
      <TouchableNativeFeedback
        onPress={onPress}
        background={TouchableNativeFeedback.Ripple(colors.primary + "20", false)}
      >
        {inner}
      </TouchableNativeFeedback>
    );
  }
  return (
    <TouchableOpacity onPress={onPress} activeOpacity={0.75}>
      {inner}
    </TouchableOpacity>
  );
}

export default function TabsSheet({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  const { tabs, activeTabId, switchTab, closeTab, addTab, closeAllTabs } = useBrowser();
  const colors = useColors();
  const insets = useSafeAreaInsets();

  function handleSwitch(id: string) {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    switchTab(id);
    onClose();
  }

  function handleClose(id: string) {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    closeTab(id);
  }

  function handleNew(incognito = false) {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    addTab(HOME_URL, incognito);
    onClose();
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
        {/* Header */}
        <View style={[styles.header, { borderBottomColor: colors.border }]}>
          <Text style={[styles.headerTitle, { color: colors.foreground }]}>
            {tabs.length} {tabs.length === 1 ? "tab" : "tabs"}
          </Text>
          <View style={styles.headerRight}>
            {tabs.length > 1 && (
              <TouchableOpacity
                style={styles.headerBtn}
                onPress={() => { closeAllTabs(); onClose(); }}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <Text style={[styles.headerBtnText, { color: colors.destructive }]}>Close all</Text>
              </TouchableOpacity>
            )}
            <TouchableOpacity
              style={styles.headerBtn}
              onPress={onClose}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Ionicons name="close" size={22} color={colors.foreground} />
            </TouchableOpacity>
          </View>
        </View>

        {/* Tab list */}
        <FlatList
          data={tabs}
          keyExtractor={(t) => t.id}
          style={{ flex: 1 }}
          contentContainerStyle={{ paddingVertical: 4 }}
          ItemSeparatorComponent={() => (
            <View style={[styles.separator, { backgroundColor: colors.border }]} />
          )}
          renderItem={({ item }) => (
            <TabRow
              tab={item}
              isActive={item.id === activeTabId}
              onPress={() => handleSwitch(item.id)}
              onClose={() => handleClose(item.id)}
            />
          )}
        />

        {/* Bottom actions */}
        <View style={[styles.footer, { borderTopColor: colors.border }]}>
          <TouchableOpacity
            style={[styles.footerBtn, { backgroundColor: colors.primary }]}
            onPress={() => handleNew(false)}
            activeOpacity={0.85}
          >
            <Ionicons name="add" size={22} color="#fff" />
            <Text style={styles.footerBtnText}>New tab</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.footerBtn, { backgroundColor: "#1A1A2A" }]}
            onPress={() => handleNew(true)}
            activeOpacity={0.85}
          >
            <Ionicons name="glasses" size={18} color="#C8C8FF" />
            <Text style={[styles.footerBtnText, { color: "#C8C8FF" }]}>Incognito</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: "rgba(0,0,0,0.4)" },
  sheet: {
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    maxHeight: "80%",
    elevation: 24,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.2,
    shadowRadius: 12,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  headerTitle: { fontSize: 16, fontWeight: "600" },
  headerRight: { flexDirection: "row", alignItems: "center", gap: 16 },
  headerBtn: { justifyContent: "center", alignItems: "center" },
  headerBtnText: { fontSize: 14, fontWeight: "500" },
  separator: { height: StyleSheet.hairlineWidth, marginLeft: 68 },
  tabRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 12,
    minHeight: 60,
  },
  favicon: {
    width: 36,
    height: 36,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
  },
  tabInfo: { flex: 1 },
  tabTitle: { fontSize: 14, fontWeight: "500", lineHeight: 19 },
  tabUrl: { fontSize: 12, marginTop: 1, lineHeight: 16 },
  activeDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginRight: 4,
  },
  closeBtn: {
    width: 32,
    height: 32,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 16,
  },
  footer: {
    flexDirection: "row",
    gap: 10,
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 4,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  footerBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 13,
    borderRadius: 10,
    gap: 6,
  },
  footerBtnText: { color: "#fff", fontWeight: "600", fontSize: 14 },
});
