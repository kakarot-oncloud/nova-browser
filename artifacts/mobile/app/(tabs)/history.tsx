import * as Haptics from "expo-haptics";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React, { useState } from "react";
import {
  Alert,
  Platform,
  SectionList,
  StyleSheet,
  Text,
  TextInput,
  TouchableNativeFeedback,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useHistory, HistoryItem } from "@/contexts/HistoryContext";
import { useBrowser } from "@/contexts/BrowserContext";
import { useColors } from "@/hooks/useColors";
import { getDisplayUrl } from "@/utils/urlUtils";

function timeAgo(ms: number): string {
  const diff = Date.now() - ms;
  if (diff < 60000) return "Just now";
  if (diff < 3600000) return Math.floor(diff / 60000) + "m ago";
  if (diff < 86400000) return Math.floor(diff / 3600000) + "h ago";
  return Math.floor(diff / 86400000) + "d ago";
}

function groupByDate(items: HistoryItem[]): { title: string; data: HistoryItem[] }[] {
  const now = Date.now();
  const today: HistoryItem[] = [];
  const yesterday: HistoryItem[] = [];
  const week: HistoryItem[] = [];
  const earlier: HistoryItem[] = [];
  items.forEach((item) => {
    const age = now - item.visitedAt;
    if (age < 86400000) today.push(item);
    else if (age < 172800000) yesterday.push(item);
    else if (age < 604800000) week.push(item);
    else earlier.push(item);
  });
  const s = [];
  if (today.length) s.push({ title: "Today", data: today });
  if (yesterday.length) s.push({ title: "Yesterday", data: yesterday });
  if (week.length) s.push({ title: "This Week", data: week });
  if (earlier.length) s.push({ title: "Earlier", data: earlier });
  return s;
}

function HistoryRow({
  item,
  isLast,
  onPress,
  onDelete,
}: {
  item: HistoryItem;
  isLast: boolean;
  onPress: () => void;
  onDelete: () => void;
}) {
  const colors = useColors();
  const display = getDisplayUrl(item.url);

  const inner = (
    <View style={styles.row}>
      <View style={[styles.rowIcon, { backgroundColor: colors.muted }]}>
        <Ionicons name="globe-outline" size={15} color={colors.mutedForeground} />
      </View>
      <View style={styles.rowText}>
        <Text style={[styles.rowTitle, { color: colors.foreground }]} numberOfLines={1}>
          {item.title || display}
        </Text>
        <Text style={[styles.rowSub, { color: colors.mutedForeground }]} numberOfLines={1}>
          {display} · {timeAgo(item.visitedAt)}
        </Text>
      </View>
      <TouchableOpacity
        onPress={onDelete}
        hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        style={styles.deleteBtn}
        activeOpacity={0.6}
      >
        <Ionicons name="close" size={17} color={colors.mutedForeground} />
      </TouchableOpacity>
    </View>
  );

  return (
    <View>
      {Platform.OS === "android" ? (
        <TouchableNativeFeedback
          onPress={onPress}
          onLongPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
            Alert.alert("Remove from history?", item.url, [
              { text: "Cancel", style: "cancel" },
              { text: "Remove", style: "destructive", onPress: onDelete },
            ]);
          }}
          background={TouchableNativeFeedback.Ripple(colors.muted, false)}
        >
          {inner}
        </TouchableNativeFeedback>
      ) : (
        <TouchableOpacity onPress={onPress} activeOpacity={0.7}>
          {inner}
        </TouchableOpacity>
      )}
      {!isLast && <View style={[styles.separator, { backgroundColor: colors.border }]} />}
    </View>
  );
}

export default function HistoryScreen() {
  const { history, removeHistory, clearHistory, searchHistory } = useHistory();
  const { navigateTo } = useBrowser();
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const [search, setSearch] = useState("");

  const isSearching = search.trim().length > 0;
  const filtered = isSearching ? searchHistory(search) : history;
  const sections = isSearching
    ? [{ title: "Results", data: filtered }]
    : groupByDate(history);

  function openPage(url: string) {
    navigateTo(url);
    router.push("/");
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Search */}
      <View style={[styles.searchWrap, { backgroundColor: colors.background }]}>
        <View style={[styles.searchBar, { backgroundColor: colors.card }]}>
          <Ionicons name="search" size={16} color={colors.mutedForeground} />
          <TextInput
            style={[styles.searchInput, { color: colors.foreground }]}
            placeholder="Search history"
            placeholderTextColor={colors.mutedForeground}
            value={search}
            onChangeText={setSearch}
          />
          {search.length > 0 && (
            <TouchableOpacity onPress={() => setSearch("")} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
              <Ionicons name="close-circle" size={16} color={colors.mutedForeground} />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {history.length > 0 && !isSearching && (
        <View style={[styles.topRow]}>
          <Text style={[styles.topCount, { color: colors.mutedForeground }]}>
            {history.length} {history.length === 1 ? "visit" : "visits"}
          </Text>
          <TouchableOpacity
            onPress={() =>
              Alert.alert("Clear browsing history?", "All history will be deleted.", [
                { text: "Cancel", style: "cancel" },
                { text: "Clear All", style: "destructive", onPress: clearHistory },
              ])
            }
          >
            <Text style={[styles.clearBtn, { color: colors.destructive }]}>Clear All</Text>
          </TouchableOpacity>
        </View>
      )}

      <SectionList
        sections={sections}
        keyExtractor={(item) => item.id}
        stickySectionHeadersEnabled={false}
        contentContainerStyle={[
          styles.listContent,
          { paddingBottom: insets.bottom + (Platform.OS === "web" ? 84 : 24), flexGrow: 1 },
        ]}
        renderSectionHeader={({ section: { title, data } }) => (
          <View style={[styles.sectionHeader, { backgroundColor: colors.background }]}>
            <Text style={[styles.sectionTitle, { color: colors.mutedForeground }]}>{title}</Text>
          </View>
        )}
        renderSectionFooter={() => <View style={{ height: 16 }} />}
        renderItem={({ item, index, section }) => {
          const isLast = index === section.data.length - 1;
          const isFirst = index === 0;
          return (
            <View
              style={[
                styles.card,
                isFirst && styles.cardFirst,
                isLast && styles.cardLast,
                { backgroundColor: colors.card },
              ]}
            >
              <HistoryRow
                item={item}
                isLast={isLast}
                onPress={() => openPage(item.url)}
                onDelete={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  removeHistory(item.id);
                }}
              />
            </View>
          );
        }}
        ListEmptyComponent={
          <View style={styles.empty}>
            <View style={[styles.emptyIcon, { backgroundColor: colors.muted }]}>
              <Ionicons name="time-outline" size={36} color={colors.mutedForeground} />
            </View>
            <Text style={[styles.emptyTitle, { color: colors.foreground }]}>No history</Text>
            <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>
              {search ? "No results for this search" : "Pages you visit will appear here"}
            </Text>
          </View>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },

  searchWrap: { paddingHorizontal: 16, paddingVertical: 10 },
  searchBar: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 12,
    gap: 8,
    elevation: 1,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
  },
  searchInput: { flex: 1, fontSize: 15, padding: 0 },

  topRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingBottom: 4,
  },
  topCount: { fontSize: 13 },
  clearBtn: { fontSize: 13, fontWeight: "600" },

  listContent: { paddingHorizontal: 16 },

  sectionHeader: { paddingTop: 8, paddingBottom: 8, paddingHorizontal: 4 },
  sectionTitle: {
    fontSize: 11,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 0.8,
  },

  card: {
    overflow: "hidden",
    elevation: 1,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 3,
  },
  cardFirst: { borderTopLeftRadius: 12, borderTopRightRadius: 12 },
  cardLast: { borderBottomLeftRadius: 12, borderBottomRightRadius: 12 },

  row: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 14,
    paddingVertical: 12,
    gap: 12,
  },
  rowIcon: {
    width: 32,
    height: 32,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
  },
  rowText: { flex: 1 },
  rowTitle: { fontSize: 14, fontWeight: "500" },
  rowSub: { fontSize: 12, marginTop: 1 },
  deleteBtn: { padding: 4 },
  separator: { height: StyleSheet.hairlineWidth, marginLeft: 58 },

  empty: {
    paddingTop: 80,
    alignItems: "center",
    gap: 12,
    paddingHorizontal: 40,
  },
  emptyIcon: {
    width: 72,
    height: 72,
    borderRadius: 36,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 4,
  },
  emptyTitle: { fontSize: 18, fontWeight: "600" },
  emptyText: { fontSize: 14, textAlign: "center", lineHeight: 20 },
});
