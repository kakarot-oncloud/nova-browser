import { Ionicons } from "@expo/vector-icons";
import React from "react";
import {
  Dimensions,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableNativeFeedback,
  TouchableOpacity,
  View,
  useColorScheme,
} from "react-native";
import { useBrowser } from "@/contexts/BrowserContext";
import { useBookmarks } from "@/contexts/BookmarksContext";
import { useHistory } from "@/contexts/HistoryContext";
import { useColors } from "@/hooks/useColors";
import { getDisplayUrl } from "@/utils/urlUtils";

const { width: SCREEN_W } = Dimensions.get("window");
const TILE_SIZE = Math.floor((SCREEN_W - 32 - 24) / 4); // 4 tiles, 16px side padding, 8px gaps

const SITES = [
  { id: "google",    name: "Google",    url: "https://www.google.com",    bg: "#4285F4", letter: "G" },
  { id: "youtube",   name: "YouTube",   url: "https://www.youtube.com",   bg: "#FF0000", letter: "▶" },
  { id: "reddit",    name: "Reddit",    url: "https://www.reddit.com",    bg: "#FF4500", letter: "r" },
  { id: "x",         name: "X",         url: "https://x.com",             bg: "#000000", letter: "X" },
  { id: "wikipedia", name: "Wikipedia", url: "https://www.wikipedia.org", bg: "#3F3F3F", letter: "W" },
  { id: "amazon",    name: "Amazon",    url: "https://www.amazon.com",    bg: "#FF9900", letter: "a" },
  { id: "github",    name: "GitHub",    url: "https://github.com",        bg: "#24292e", letter: "G" },
  { id: "instagram", name: "Instagram", url: "https://www.instagram.com", bg: "#E1306C", letter: "in" },
];

function Tile({ site, onPress }: { site: typeof SITES[0]; onPress: () => void }) {
  const inner = (
    <View style={styles.tileOuter}>
      <View style={[styles.tileIcon, { backgroundColor: site.bg }]}>
        <Text style={styles.tileLetter}>{site.letter}</Text>
      </View>
      <Text style={styles.tileName} numberOfLines={1}>{site.name}</Text>
    </View>
  );

  if (Platform.OS === "android") {
    return (
      <View style={{ width: TILE_SIZE, alignItems: "center" }}>
        <TouchableNativeFeedback
          onPress={onPress}
          background={TouchableNativeFeedback.Ripple("rgba(0,0,0,0.1)", true, TILE_SIZE / 2)}
        >
          {inner}
        </TouchableNativeFeedback>
      </View>
    );
  }
  return (
    <TouchableOpacity style={{ width: TILE_SIZE, alignItems: "center" }} onPress={onPress} activeOpacity={0.7}>
      {inner}
    </TouchableOpacity>
  );
}

interface SpeedDialProps {
  onSearch: () => void;
}

export default function SpeedDial({ onSearch }: SpeedDialProps) {
  const { navigateTo } = useBrowser();
  const { bookmarks } = useBookmarks();
  const { history } = useHistory();
  const colors = useColors();
  const isDark = useColorScheme() === "dark";

  const recent = history.slice(0, 5);
  const recentBM = bookmarks.slice(0, 4);

  const now = new Date().getHours();
  const greeting = now < 12 ? "Good morning" : now < 17 ? "Good afternoon" : "Good evening";

  return (
    <ScrollView
      style={[styles.root, { backgroundColor: isDark ? "#111111" : "#F8F9FA" }]}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
      keyboardShouldPersistTaps="handled"
    >
      {/* ── Header ── */}
      <View style={styles.header}>
        <View style={[styles.logoMark, { backgroundColor: colors.primary }]}>
          <Ionicons name="globe" size={22} color="#fff" />
        </View>
        <View>
          <Text style={[styles.greeting, { color: colors.mutedForeground }]}>{greeting}</Text>
          <Text style={[styles.appName, { color: colors.foreground }]}>Nova Browser</Text>
        </View>
      </View>

      {/* ── Search Bar ── */}
      <TouchableOpacity
        style={[
          styles.searchBar,
          {
            backgroundColor: isDark ? "#1E1E1E" : "#FFFFFF",
            shadowColor: isDark ? "#000" : "#000",
            shadowOpacity: isDark ? 0.4 : 0.1,
          },
        ]}
        onPress={onSearch}
        activeOpacity={0.9}
      >
        <View style={[styles.searchIconWrap, { backgroundColor: colors.primary + "18" }]}>
          <Ionicons name="search" size={17} color={colors.primary} />
        </View>
        <Text style={[styles.searchText, { color: colors.mutedForeground }]}>
          Search or type URL
        </Text>
        <Ionicons name="mic-outline" size={19} color={colors.mutedForeground} />
      </TouchableOpacity>

      {/* ── Quick Access ── */}
      <View style={styles.tilesSection}>
        <Text style={[styles.sectionLabel, { color: colors.mutedForeground }]}>Quick Access</Text>
        <View style={styles.tilesRow}>
          {SITES.slice(0, 4).map((s) => (
            <Tile key={s.id} site={s} onPress={() => navigateTo(s.url)} />
          ))}
        </View>
        <View style={[styles.tilesRow, { marginTop: 4 }]}>
          {SITES.slice(4).map((s) => (
            <Tile key={s.id} site={s} onPress={() => navigateTo(s.url)} />
          ))}
        </View>
      </View>

      {/* ── Bookmarks ── */}
      {recentBM.length > 0 && (
        <View style={styles.listSection}>
          <Text style={[styles.sectionLabel, { color: colors.mutedForeground }]}>Bookmarks</Text>
          <View style={[styles.listCard, {
            backgroundColor: isDark ? "#1E1E1E" : "#FFFFFF",
            shadowColor: "#000",
            shadowOpacity: isDark ? 0.3 : 0.06,
          }]}>
            {recentBM.map((b, i) => (
              <View key={b.id}>
                <TouchableOpacity
                  style={styles.listRow}
                  onPress={() => navigateTo(b.url)}
                  activeOpacity={0.7}
                >
                  <View style={[styles.rowDot, { backgroundColor: colors.primary }]} />
                  <View style={styles.rowText}>
                    <Text style={[styles.rowTitle, { color: colors.foreground }]} numberOfLines={1}>{b.title}</Text>
                    <Text style={[styles.rowSub, { color: colors.mutedForeground }]} numberOfLines={1}>{getDisplayUrl(b.url)}</Text>
                  </View>
                  <Ionicons name="chevron-forward" size={15} color={colors.mutedForeground} />
                </TouchableOpacity>
                {i < recentBM.length - 1 && (
                  <View style={[styles.rowLine, { backgroundColor: colors.border }]} />
                )}
              </View>
            ))}
          </View>
        </View>
      )}

      {/* ── History ── */}
      {recent.length > 0 && (
        <View style={styles.listSection}>
          <Text style={[styles.sectionLabel, { color: colors.mutedForeground }]}>Recently Visited</Text>
          <View style={[styles.listCard, {
            backgroundColor: isDark ? "#1E1E1E" : "#FFFFFF",
            shadowColor: "#000",
            shadowOpacity: isDark ? 0.3 : 0.06,
          }]}>
            {recent.map((h, i) => (
              <View key={h.id}>
                <TouchableOpacity
                  style={styles.listRow}
                  onPress={() => navigateTo(h.url)}
                  activeOpacity={0.7}
                >
                  <View style={[styles.rowDot, { backgroundColor: colors.mutedForeground }]} />
                  <View style={styles.rowText}>
                    <Text style={[styles.rowTitle, { color: colors.foreground }]} numberOfLines={1}>{h.title || getDisplayUrl(h.url)}</Text>
                    <Text style={[styles.rowSub, { color: colors.mutedForeground }]} numberOfLines={1}>{getDisplayUrl(h.url)}</Text>
                  </View>
                  <Ionicons name="chevron-forward" size={15} color={colors.mutedForeground} />
                </TouchableOpacity>
                {i < recent.length - 1 && (
                  <View style={[styles.rowLine, { backgroundColor: colors.border }]} />
                )}
              </View>
            ))}
          </View>
        </View>
      )}

      <View style={{ height: 24 }} />
    </ScrollView>
  );
}

const ICON_SIZE = Math.min(TILE_SIZE - 16, 52);

const styles = StyleSheet.create({
  root: { flex: 1 },
  content: { paddingHorizontal: 16, paddingBottom: 20 },

  /* Header */
  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingTop: 28,
    paddingBottom: 20,
  },
  logoMark: {
    width: 46,
    height: 46,
    borderRadius: 13,
    alignItems: "center",
    justifyContent: "center",
  },
  greeting: {
    fontSize: 12,
    fontWeight: "400",
    marginBottom: 1,
  },
  appName: {
    fontSize: 20,
    fontWeight: "700",
    fontFamily: "Inter_700Bold",
  },

  /* Search */
  searchBar: {
    flexDirection: "row",
    alignItems: "center",
    height: 54,
    borderRadius: 27,
    paddingHorizontal: 14,
    gap: 10,
    marginBottom: 28,
    shadowOffset: { width: 0, height: 3 },
    shadowRadius: 10,
    elevation: 5,
  },
  searchIconWrap: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  searchText: {
    flex: 1,
    fontSize: 15,
    fontFamily: "Inter_400Regular",
  },

  /* Tiles */
  tilesSection: { marginBottom: 24 },
  sectionLabel: {
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 0.8,
    textTransform: "uppercase",
    marginBottom: 14,
  },
  tilesRow: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  tileOuter: {
    alignItems: "center",
    paddingVertical: 8,
    paddingHorizontal: 4,
    gap: 7,
    borderRadius: 12,
  },
  tileIcon: {
    width: ICON_SIZE,
    height: ICON_SIZE,
    borderRadius: ICON_SIZE * 0.27,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.18,
    shadowRadius: 4,
    elevation: 3,
  },
  tileLetter: {
    color: "#fff",
    fontSize: 20,
    fontWeight: "800",
    fontFamily: "Inter_700Bold",
  },
  tileName: {
    fontSize: 11,
    fontWeight: "500",
    color: "#666",
    textAlign: "center",
  },

  /* List cards */
  listSection: { marginBottom: 20 },
  listCard: {
    borderRadius: 14,
    overflow: "hidden",
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 8,
    elevation: 3,
  },
  listRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 13,
    gap: 12,
  },
  rowDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  rowText: { flex: 1 },
  rowTitle: { fontSize: 14, fontWeight: "500" },
  rowSub: { fontSize: 12, marginTop: 1 },
  rowLine: { height: StyleSheet.hairlineWidth, marginLeft: 36 },
});
