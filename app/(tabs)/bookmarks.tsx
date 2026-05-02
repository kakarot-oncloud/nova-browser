import * as Haptics from "expo-haptics";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React, { useState } from "react";
import {
  Alert,
  FlatList,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useBookmarks, Bookmark } from "@/contexts/BookmarksContext";
import { useBrowser } from "@/contexts/BrowserContext";
import { useColors } from "@/hooks/useColors";
import { getDisplayUrl } from "@/utils/urlUtils";

function BookmarkItem({ item, onPress, onDelete }: { item: Bookmark; onPress: () => void; onDelete: () => void }) {
  const colors = useColors();
  return (
    <TouchableOpacity
      style={[styles.item, { backgroundColor: colors.card, borderColor: colors.border }]}
      onPress={onPress}
      onLongPress={() => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        Alert.alert("Bookmark", item.title || item.url, [
          { text: "Cancel", style: "cancel" },
          { text: "Delete", style: "destructive", onPress: onDelete },
        ]);
      }}
      activeOpacity={0.7}
    >
      <View style={[styles.favicon, { backgroundColor: colors.primary + "20" }]}>
        <Ionicons name="bookmark" size={18} color={colors.primary} />
      </View>
      <View style={styles.itemText}>
        <Text style={[styles.itemTitle, { color: colors.foreground }]} numberOfLines={1}>
          {item.title || item.url}
        </Text>
        <Text style={[styles.itemUrl, { color: colors.mutedForeground }]} numberOfLines={1}>
          {getDisplayUrl(item.url)}
        </Text>
      </View>
      <TouchableOpacity onPress={onDelete} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
        <Ionicons name="trash-outline" size={18} color={colors.mutedForeground} />
      </TouchableOpacity>
    </TouchableOpacity>
  );
}

export default function BookmarksScreen() {
  const { bookmarks, removeBookmark, clearBookmarks } = useBookmarks();
  const { navigateTo } = useBrowser();
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const [search, setSearch] = useState("");

  const filtered = search
    ? bookmarks.filter(
        (b) =>
          b.title.toLowerCase().includes(search.toLowerCase()) ||
          b.url.toLowerCase().includes(search.toLowerCase())
      )
    : bookmarks;

  function openBookmark(url: string) {
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
          placeholder="Search bookmarks..."
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

      <FlatList
        data={filtered}
        keyExtractor={(b) => b.id}
        contentContainerStyle={[
          styles.list,
          { paddingBottom: insets.bottom + (Platform.OS === "web" ? 84 : 0) },
        ]}
        scrollEnabled={!!filtered.length}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Ionicons name="bookmark-outline" size={52} color={colors.mutedForeground} />
            <Text style={[styles.emptyTitle, { color: colors.foreground }]}>No bookmarks</Text>
            <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>
              {search ? "No results found" : "Tap the menu in the browser to bookmark a page"}
            </Text>
          </View>
        }
        ListHeaderComponent={
          bookmarks.length > 0 ? (
            <View style={styles.listHeader}>
              <Text style={[styles.listCount, { color: colors.mutedForeground }]}>
                {filtered.length} bookmark{filtered.length !== 1 ? "s" : ""}
              </Text>
              {!search && (
                <TouchableOpacity
                  onPress={() => Alert.alert("Clear Bookmarks", "Delete all bookmarks?", [
                    { text: "Cancel", style: "cancel" },
                    { text: "Clear All", style: "destructive", onPress: clearBookmarks },
                  ])}
                >
                  <Text style={[styles.clearAll, { color: colors.destructive }]}>Clear All</Text>
                </TouchableOpacity>
              )}
            </View>
          ) : null
        }
        renderItem={({ item }) => (
          <BookmarkItem
            item={item}
            onPress={() => openBookmark(item.url)}
            onDelete={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
              removeBookmark(item.id);
            }}
          />
        )}
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
  list: { paddingHorizontal: 16, gap: 8, flexGrow: 1 },
  item: {
    flexDirection: "row",
    alignItems: "center",
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
    gap: 12,
  },
  favicon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  itemText: { flex: 1 },
  itemTitle: { fontSize: 14, fontWeight: "600", fontFamily: "Inter_600SemiBold" },
  itemUrl: { fontSize: 12, marginTop: 2 },
  empty: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingTop: 80,
    gap: 10,
  },
  emptyTitle: { fontSize: 18, fontWeight: "700", fontFamily: "Inter_700Bold" },
  emptyText: { fontSize: 14, textAlign: "center", paddingHorizontal: 40 },
  listHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 10,
  },
  listCount: { fontSize: 13 },
  clearAll: { fontSize: 13, fontWeight: "600" },
});
