import * as Haptics from "expo-haptics";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React, { useState } from "react";
import {
  Alert,
  FlatList,
  Platform,
  SectionList,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useHistory, HistoryItem } from "@/contexts/HistoryContext";
import { useBrowser } from "@/contexts/BrowserContext";
import { useColors } from "@/hooks/useColors";
import { getDisplayUrl } from "@/utils/urlUtils";

function timeAgo(ms: number): string {
  const now = Date.now();
  const diff = now - ms;
  if (diff < 60000) return "Just now";
  if (diff < 3600000) return Math.floor(diff / 60000) + "m ago";
  if (diff < 86400000) return Math.floor(diff / 3600000) + "h ago";
  return Math.floor(diff / 86400000) + "d ago";
}

function groupByDate(items: HistoryItem[]): { title: string; data: HistoryItem[] }[] {
  const now = Date.now();
  const today: HistoryItem[] = [];
  const yesterday: HistoryItem[] = [];
  const thisWeek: HistoryItem[] = [];
  const earlier: HistoryItem[] = [];

  items.forEach((item) => {
    const age = now - item.visitedAt;
    if (age < 86400000) today.push(item);
    else if (age < 172800000) yesterday.push(item);
    else if (age < 604800000) thisWeek.push(item);
    else earlier.push(item);
  });

  const sections = [];
  if (today.length > 0) sections.push({ title: "Today", data: today });
  if (yesterday.length > 0) sections.push({ title: "Yesterday", data: yesterday });
  if (thisWeek.length > 0) sections.push({ title: "This Week", data: thisWeek });
  if (earlier.length > 0) sections.push({ title: "Earlier", data: earlier });
  return sections;
}

function HistoryRow({ item, onPress, onDelete }: { item: HistoryItem; onPress: () => void; onDelete: () => void }) {
  const colors = useColors();
  return (
    <TouchableOpacity
      style={[styles.item, { backgroundColor: colors.card, borderColor: colors.border }]}
      onPress={onPress}
      onLongPress={() => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        Alert.alert("Remove from History?", item.url, [
          { text: "Cancel", style: "cancel" },
          { text: "Remove", style: "destructive", onPress: onDelete },
        ]);
      }}
      activeOpacity={0.7}
    >
      <View style={[styles.favicon, { backgroundColor: colors.muted }]}>
        <Ionicons name="globe-outline" size={16} color={colors.mutedForeground} />
      </View>
      <View style={styles.itemText}>
        <Text style={[styles.itemTitle, { color: colors.foreground }]} numberOfLines={1}>
          {item.title || getDisplayUrl(item.url)}
        </Text>
        <Text style={[styles.itemUrl, { color: colors.mutedForeground }]} numberOfLines={1}>
          {getDisplayUrl(item.url)}
        </Text>
      </View>
      <Text style={[styles.time, { color: colors.mutedForeground }]}>{timeAgo(item.visitedAt)}</Text>
    </TouchableOpacity>
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
  const sections = isSearching ? [{ title: "Results", data: filtered }] : groupByDate(history);

  function openPage(url: string) {
    navigateTo(url);
    router.push("/");
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Search bar */}
      <View style={[styles.searchBar, { backgroundColor: colors.input, marginTop: Platform.OS === "web" ? 67 : 0 }]}>
        <Ionicons name="search" size={16} color={colors.mutedForeground} />
        <TextInput
          style={[styles.searchInput, { color: colors.foreground }]}
          placeholder="Search history..."
          placeholderTextColor={colors.mutedForeground}
          value={search}
          onChangeText={setSearch}
        />
        {search.length > 0 && (
          <TouchableOpacity onPress={() => setSearch("")}>
            <Ionicons name="close-circle" size={16} color={colors.mutedForeground} />
          </TouchableOpacity>
        )}
      </View>

      {/* Header action */}
      {history.length > 0 && (
        <View style={[styles.topBar, { borderBottomColor: colors.border }]}>
          <Text style={[styles.count, { color: colors.mutedForeground }]}>
            {filtered.length} item{filtered.length !== 1 ? "s" : ""}
          </Text>
          <TouchableOpacity
            onPress={() =>
              Alert.alert("Clear History", "Delete all browsing history?", [
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
        contentContainerStyle={[
          styles.list,
          { paddingBottom: insets.bottom + (Platform.OS === "web" ? 84 : 0), flexGrow: 1 },
        ]}
        stickySectionHeadersEnabled={false}
        renderSectionHeader={({ section: { title } }) => (
          <Text style={[styles.sectionHeader, { color: colors.mutedForeground }]}>{title}</Text>
        )}
        renderItem={({ item }) => (
          <HistoryRow
            item={item}
            onPress={() => openPage(item.url)}
            onDelete={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              removeHistory(item.id);
            }}
          />
        )}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Ionicons name="time-outline" size={54} color={colors.mutedForeground} />
            <Text style={[styles.emptyTitle, { color: colors.foreground }]}>No History</Text>
            <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>
              {search ? "No results found" : "Sites you visit will appear here"}
            </Text>
          </View>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  searchBar: {
    flexDirection: "row",
    alignItems: "center",
    margin: 16,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 12,
    gap: 8,
  },
  searchInput: { flex: 1, fontSize: 14 },
  topBar: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingBottom: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    marginBottom: 4,
  },
  count: { fontSize: 13 },
  clearBtn: { fontSize: 13, fontWeight: "600" },
  sectionHeader: {
    fontSize: 11,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 0.8,
    paddingHorizontal: 16,
    paddingVertical: 10,
    fontFamily: "Inter_700Bold",
  },
  list: { paddingBottom: 20 },
  item: {
    flexDirection: "row",
    alignItems: "center",
    marginHorizontal: 16,
    marginBottom: 6,
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    gap: 10,
  },
  favicon: {
    width: 32,
    height: 32,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
  },
  itemText: { flex: 1 },
  itemTitle: { fontSize: 13, fontWeight: "600" },
  itemUrl: { fontSize: 11, marginTop: 2 },
  time: { fontSize: 11 },
  empty: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingTop: 80,
    gap: 10,
  },
  emptyTitle: { fontSize: 18, fontWeight: "700", fontFamily: "Inter_700Bold" },
  emptyText: { fontSize: 14, textAlign: "center", paddingHorizontal: 40 },
});
