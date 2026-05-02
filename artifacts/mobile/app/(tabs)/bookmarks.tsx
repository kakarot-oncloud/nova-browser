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
  TouchableNativeFeedback,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useBookmarks, Bookmark } from "@/contexts/BookmarksContext";
import { useBrowser } from "@/contexts/BrowserContext";
import { useColors } from "@/hooks/useColors";
import { getDisplayUrl } from "@/utils/urlUtils";

function BookmarkRow({
  item,
  isLast,
  onPress,
  onDelete,
}: {
  item: Bookmark;
  isLast: boolean;
  onPress: () => void;
  onDelete: () => void;
}) {
  const colors = useColors();

  const inner = (
    <View style={styles.row}>
      <View style={[styles.rowIcon, { backgroundColor: colors.primary + "18" }]}>
        <Ionicons name="bookmark" size={16} color={colors.primary} />
      </View>
      <View style={styles.rowText}>
        <Text style={[styles.rowTitle, { color: colors.foreground }]} numberOfLines={1}>
          {item.title || item.url}
        </Text>
        <Text style={[styles.rowSub, { color: colors.mutedForeground }]} numberOfLines={1}>
          {getDisplayUrl(item.url)}
        </Text>
      </View>
      <TouchableOpacity
        onPress={onDelete}
        hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        style={styles.deleteBtn}
        activeOpacity={0.6}
      >
        <Ionicons name="trash-outline" size={17} color={colors.mutedForeground} />
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
            Alert.alert(item.title || "Bookmark", item.url, [
              { text: "Cancel", style: "cancel" },
              { text: "Delete", style: "destructive", onPress: onDelete },
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
      {/* Search */}
      <View style={[styles.searchWrap, { backgroundColor: colors.background }]}>
        <View style={[styles.searchBar, { backgroundColor: colors.card }]}>
          <Ionicons name="search" size={16} color={colors.mutedForeground} />
          <TextInput
            style={[styles.searchInput, { color: colors.foreground }]}
            placeholder="Search bookmarks"
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

      <FlatList
        data={filtered}
        keyExtractor={(b) => b.id}
        contentContainerStyle={[
          styles.listContent,
          { paddingBottom: insets.bottom + (Platform.OS === "web" ? 84 : 16) },
        ]}
        scrollEnabled
        ListHeaderComponent={
          filtered.length > 0 ? (
            <View style={styles.listHeader}>
              <Text style={[styles.listCount, { color: colors.mutedForeground }]}>
                {filtered.length} {filtered.length === 1 ? "bookmark" : "bookmarks"}
              </Text>
              {!search && (
                <TouchableOpacity
                  onPress={() =>
                    Alert.alert("Clear all bookmarks?", "This cannot be undone.", [
                      { text: "Cancel", style: "cancel" },
                      { text: "Clear All", style: "destructive", onPress: clearBookmarks },
                    ])
                  }
                >
                  <Text style={[styles.clearAll, { color: colors.destructive }]}>Clear All</Text>
                </TouchableOpacity>
              )}
            </View>
          ) : null
        }
        ListEmptyComponent={
          <View style={styles.empty}>
            <View style={[styles.emptyIcon, { backgroundColor: colors.muted }]}>
              <Ionicons name="bookmark-outline" size={36} color={colors.mutedForeground} />
            </View>
            <Text style={[styles.emptyTitle, { color: colors.foreground }]}>No bookmarks</Text>
            <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>
              {search ? "No results for this search" : "Open the menu while browsing to save pages"}
            </Text>
          </View>
        }
        renderItem={({ item, index }) => (
          <View style={index === 0 ? styles.cardFirst : index === filtered.length - 1 ? styles.cardLast : styles.cardMiddle}>
            <BookmarkRow
              item={item}
              isLast={index === filtered.length - 1}
              onPress={() => openBookmark(item.url)}
              onDelete={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                removeBookmark(item.id);
              }}
            />
          </View>
        )}
        ListFooterComponent={<View style={{ height: 20 }} />}
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

  listContent: { paddingHorizontal: 16 },
  listHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 10,
    paddingHorizontal: 4,
  },
  listCount: { fontSize: 13 },
  clearAll: { fontSize: 13, fontWeight: "600" },

  /* Card group — individual items share a continuous card */
  cardFirst: {
    borderTopLeftRadius: 12,
    borderTopRightRadius: 12,
    overflow: "hidden",
    backgroundColor: "#fff",
    elevation: 1,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
  },
  cardMiddle: { backgroundColor: "#fff", overflow: "hidden" },
  cardLast: {
    borderBottomLeftRadius: 12,
    borderBottomRightRadius: 12,
    overflow: "hidden",
    backgroundColor: "#fff",
    marginBottom: 0,
  },

  row: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 14,
    paddingVertical: 13,
    gap: 12,
  },
  rowIcon: {
    width: 34,
    height: 34,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
  },
  rowText: { flex: 1 },
  rowTitle: { fontSize: 14, fontWeight: "500" },
  rowSub: { fontSize: 12, marginTop: 2 },
  deleteBtn: { padding: 4 },
  separator: { height: StyleSheet.hairlineWidth, marginLeft: 60 },

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
