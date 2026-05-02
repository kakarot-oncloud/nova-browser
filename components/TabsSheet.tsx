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
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useBrowser, Tab } from "@/contexts/BrowserContext";
import { useColors } from "@/hooks/useColors";
import { getDisplayUrl, HOME_URL } from "@/utils/urlUtils";

interface TabsSheetProps {
  visible: boolean;
  onClose: () => void;
}

function TabCard({ tab, isActive, onPress, onClose }: {
  tab: Tab;
  isActive: boolean;
  onPress: () => void;
  onClose: () => void;
}) {
  const colors = useColors();
  const displayUrl = getDisplayUrl(tab.url);

  return (
    <TouchableOpacity
      style={[
        styles.tabCard,
        {
          backgroundColor: isActive ? colors.primary + "15" : colors.card,
          borderColor: isActive ? colors.primary : colors.border,
        },
      ]}
      onPress={onPress}
      activeOpacity={0.8}
    >
      {/* Incognito badge */}
      {tab.isIncognito && (
        <View style={[styles.incognitoBadge, { backgroundColor: colors.incognito }]}>
          <Ionicons name="glasses" size={10} color="#fff" />
        </View>
      )}

      <View style={styles.tabCardContent}>
        <Ionicons name="globe-outline" size={18} color={isActive ? colors.primary : colors.mutedForeground} />
        <View style={styles.tabInfo}>
          <Text
            style={[styles.tabTitle, { color: isActive ? colors.primary : colors.foreground }]}
            numberOfLines={1}
          >
            {tab.title || "New Tab"}
          </Text>
          <Text
            style={[styles.tabUrl, { color: colors.mutedForeground }]}
            numberOfLines={1}
          >
            {tab.url === HOME_URL ? "New Tab" : displayUrl}
          </Text>
        </View>
        <TouchableOpacity
          onPress={onClose}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          style={styles.closeBtn}
        >
          <Ionicons name="close" size={18} color={colors.mutedForeground} />
        </TouchableOpacity>
      </View>
    </TouchableOpacity>
  );
}

export default function TabsSheet({ visible, onClose }: TabsSheetProps) {
  const { tabs, activeTabId, switchTab, closeTab, addTab, closeAllTabs } = useBrowser();
  const colors = useColors();
  const insets = useSafeAreaInsets();

  function handleSwitchTab(id: string) {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    switchTab(id);
    onClose();
  }

  function handleCloseTab(id: string) {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    closeTab(id);
  }

  function handleNewTab(incognito = false) {
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
            backgroundColor: colors.background,
            paddingBottom: insets.bottom + 16,
          },
        ]}
      >
        {/* Header */}
        <View style={[styles.header, { borderBottomColor: colors.border }]}>
          <Text style={[styles.title, { color: colors.foreground }]}>
            {tabs.length} {tabs.length === 1 ? "Tab" : "Tabs"}
          </Text>
          <View style={styles.headerActions}>
            <TouchableOpacity
              style={[styles.headerBtn, { backgroundColor: colors.muted }]}
              onPress={() => {
                closeAllTabs();
                onClose();
              }}
            >
              <Ionicons name="trash-outline" size={16} color={colors.destructive} />
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.headerBtn, { backgroundColor: colors.muted }]}
              onPress={onClose}
            >
              <Ionicons name="close" size={18} color={colors.foreground} />
            </TouchableOpacity>
          </View>
        </View>

        {/* Tabs list */}
        <FlatList
          data={tabs}
          keyExtractor={(t) => t.id}
          contentContainerStyle={{ padding: 16, gap: 8 }}
          renderItem={({ item }) => (
            <TabCard
              tab={item}
              isActive={item.id === activeTabId}
              onPress={() => handleSwitchTab(item.id)}
              onClose={() => handleCloseTab(item.id)}
            />
          )}
        />

        {/* New tab buttons */}
        <View style={[styles.footer, { borderTopColor: colors.border }]}>
          <TouchableOpacity
            style={[styles.newTabBtn, { backgroundColor: colors.primary }]}
            onPress={() => handleNewTab(false)}
            activeOpacity={0.8}
          >
            <Ionicons name="add" size={20} color="#fff" />
            <Text style={styles.newTabText}>New Tab</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.newTabBtn, { backgroundColor: colors.incognito }]}
            onPress={() => handleNewTab(true)}
            activeOpacity={0.8}
          >
            <Ionicons name="glasses" size={18} color={colors.incognitoForeground} />
            <Text style={[styles.newTabText, { color: colors.incognitoForeground }]}>Incognito</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
  },
  sheet: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: "85%",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.2,
    shadowRadius: 12,
    elevation: 20,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  title: { fontSize: 17, fontWeight: "700", fontFamily: "Inter_700Bold" },
  headerActions: { flexDirection: "row", gap: 8 },
  headerBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  tabCard: {
    borderRadius: 14,
    borderWidth: 1,
    overflow: "hidden",
  },
  tabCardContent: {
    flexDirection: "row",
    alignItems: "center",
    padding: 12,
    gap: 10,
  },
  incognitoBadge: {
    position: "absolute",
    top: 6,
    right: 36,
    paddingHorizontal: 5,
    paddingVertical: 2,
    borderRadius: 4,
    zIndex: 1,
  },
  tabInfo: { flex: 1 },
  tabTitle: { fontSize: 13, fontWeight: "600", fontFamily: "Inter_600SemiBold" },
  tabUrl: { fontSize: 11, marginTop: 2 },
  closeBtn: { padding: 2 },
  footer: {
    flexDirection: "row",
    gap: 10,
    paddingHorizontal: 16,
    paddingTop: 12,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  newTabBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 12,
    borderRadius: 12,
    gap: 6,
  },
  newTabText: { color: "#fff", fontWeight: "700", fontSize: 14 },
});
