import { Ionicons } from "@expo/vector-icons";
import React from "react";
import {
  ScrollView,
  StyleSheet,
  Text,
  TouchableNativeFeedback,
  TouchableOpacity,
  View,
  Platform,
  useColorScheme,
} from "react-native";
import { useBrowser } from "@/contexts/BrowserContext";
import { useBookmarks } from "@/contexts/BookmarksContext";
import { useHistory } from "@/contexts/HistoryContext";
import { useColors } from "@/hooks/useColors";
import { getDisplayUrl } from "@/utils/urlUtils";

const SITES = [
  { id: "google",    name: "Google",    url: "https://www.google.com",    bg: "#4285F4", letter: "G" },
  { id: "youtube",   name: "YouTube",   url: "https://www.youtube.com",   bg: "#FF0000", letter: "▶" },
  { id: "reddit",    name: "Reddit",    url: "https://www.reddit.com",    bg: "#FF4500", letter: "r" },
  { id: "x",         name: "X",         url: "https://x.com",             bg: "#000000", letter: "𝕏" },
  { id: "wikipedia", name: "Wikipedia", url: "https://www.wikipedia.org", bg: "#636466", letter: "W" },
  { id: "amazon",    name: "Amazon",    url: "https://www.amazon.com",    bg: "#FF9900", letter: "a" },
  { id: "github",    name: "GitHub",    url: "https://github.com",        bg: "#24292e", letter: "gh" },
  { id: "instagram", name: "Instagram", url: "https://www.instagram.com", bg: "#C13584", letter: "in" },
];

function SiteTile({ site, onPress }: { site: typeof SITES[0]; onPress: () => void }) {
  const colors = useColors();
  const inner = (
    <View style={styles.tileInner}>
      <View style={[styles.tileIcon, { backgroundColor: site.bg }]}>
        <Text style={styles.tileLetter}>{site.letter}</Text>
      </View>
      <Text style={[styles.tileName, { color: colors.mutedForeground }]} numberOfLines={1}>
        {site.name}
      </Text>
    </View>
  );

  if (Platform.OS === "android") {
    return (
      <View style={styles.tileWrap}>
        <TouchableNativeFeedback
          onPress={onPress}
          background={TouchableNativeFeedback.Ripple("rgba(0,0,0,0.1)", true, 36)}
        >
          {inner}
        </TouchableNativeFeedback>
      </View>
    );
  }
  return (
    <TouchableOpacity style={styles.tileWrap} onPress={onPress} activeOpacity={0.7}>
      {inner}
    </TouchableOpacity>
  );
}

function HistoryRow({ title, url, onPress }: { title: string; url: string; onPress: () => void }) {
  const colors = useColors();
  const host = getDisplayUrl(url);
  return (
    <TouchableOpacity style={[styles.histRow, { backgroundColor: colors.card }]} onPress={onPress} activeOpacity={0.75}>
      <View style={[styles.histIcon, { backgroundColor: colors.muted }]}>
        <Ionicons name="time-outline" size={16} color={colors.mutedForeground} />
      </View>
      <View style={styles.histText}>
        <Text style={[styles.histTitle, { color: colors.foreground }]} numberOfLines={1}>{title || host}</Text>
        <Text style={[styles.histUrl, { color: colors.mutedForeground }]} numberOfLines={1}>{host}</Text>
      </View>
      <Ionicons name="arrow-forward" size={14} color={colors.mutedForeground} />
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

  const recentHistory = history.slice(0, 6);
  const recentBookmarks = bookmarks.slice(0, 4);

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: colors.background }]}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
      keyboardShouldPersistTaps="handled"
    >
      {/* ── Logo ── */}
      <View style={styles.logoArea}>
        <View style={[styles.logoIcon, { backgroundColor: colors.primary }]}>
          <Ionicons name="globe" size={28} color="#fff" />
        </View>
        <Text style={[styles.logoText, { color: colors.foreground }]}>Nova</Text>
        <Text style={[styles.logoTextBold, { color: colors.primary }]}>Browser</Text>
      </View>

      {/* ── Search bar (tappable, opens URL editing) ── */}
      <TouchableOpacity
        style={[
          styles.searchBar,
          {
            backgroundColor: colors.card,
            shadowColor: isDark ? "#000" : "#00000020",
          },
        ]}
        onPress={onSearch}
        activeOpacity={0.85}
      >
        <Ionicons name="search" size={18} color={colors.mutedForeground} />
        <Text style={[styles.searchPlaceholder, { color: colors.mutedForeground }]}>
          Search or type URL
        </Text>
        <View style={[styles.searchDivider, { backgroundColor: colors.border }]} />
        <Ionicons name="mic-outline" size={18} color={colors.primary} />
      </TouchableOpacity>

      {/* ── Quick Access tiles ── */}
      <Text style={[styles.sectionLabel, { color: colors.mutedForeground }]}>Quick Access</Text>
      <View style={styles.tilesGrid}>
        {SITES.map((site) => (
          <SiteTile key={site.id} site={site} onPress={() => navigateTo(site.url)} />
        ))}
      </View>

      {/* ── Bookmarks ── */}
      {recentBookmarks.length > 0 && (
        <>
          <View style={styles.sectionRow}>
            <Text style={[styles.sectionLabel, { color: colors.mutedForeground }]}>Bookmarks</Text>
          </View>
          <View style={[styles.listCard, { backgroundColor: colors.card }]}>
            {recentBookmarks.map((b, idx) => (
              <View key={b.id}>
                <TouchableOpacity
                  style={styles.bookmarkRow}
                  onPress={() => navigateTo(b.url)}
                  activeOpacity={0.75}
                >
                  <View style={[styles.bookmarkIcon, { backgroundColor: colors.primary + "18" }]}>
                    <Ionicons name="bookmark" size={15} color={colors.primary} />
                  </View>
                  <View style={styles.bookmarkText}>
                    <Text style={[styles.bookmarkTitle, { color: colors.foreground }]} numberOfLines={1}>
                      {b.title}
                    </Text>
                    <Text style={[styles.bookmarkUrl, { color: colors.mutedForeground }]} numberOfLines={1}>
                      {getDisplayUrl(b.url)}
                    </Text>
                  </View>
                  <Ionicons name="chevron-forward" size={14} color={colors.mutedForeground} />
                </TouchableOpacity>
                {idx < recentBookmarks.length - 1 && (
                  <View style={[styles.rowDivider, { backgroundColor: colors.border }]} />
                )}
              </View>
            ))}
          </View>
        </>
      )}

      {/* ── Recently Visited ── */}
      {recentHistory.length > 0 && (
        <>
          <View style={styles.sectionRow}>
            <Text style={[styles.sectionLabel, { color: colors.mutedForeground }]}>Recently Visited</Text>
          </View>
          <View style={styles.histList}>
            {recentHistory.map((h) => (
              <HistoryRow
                key={h.id}
                title={h.title}
                url={h.url}
                onPress={() => navigateTo(h.url)}
              />
            ))}
          </View>
        </>
      )}

      <View style={{ height: 30 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { paddingHorizontal: 16, paddingBottom: 20 },

  /* Logo */
  logoArea: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    paddingTop: 36,
    paddingBottom: 24,
  },
  logoIcon: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  logoText: {
    fontSize: 26,
    fontWeight: "300",
    letterSpacing: -0.5,
  },
  logoTextBold: {
    fontSize: 26,
    fontWeight: "800",
    fontFamily: "Inter_700Bold",
    letterSpacing: -0.5,
    marginLeft: -4,
  },

  /* Search bar */
  searchBar: {
    flexDirection: "row",
    alignItems: "center",
    height: 52,
    borderRadius: 26,
    paddingHorizontal: 18,
    gap: 10,
    marginBottom: 28,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 8,
    shadowOpacity: 1,
    elevation: 4,
  },
  searchPlaceholder: {
    flex: 1,
    fontSize: 15,
    fontFamily: "Inter_400Regular",
  },
  searchDivider: {
    width: 1,
    height: 20,
    marginHorizontal: 2,
  },

  /* Section labels */
  sectionLabel: {
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 1,
    textTransform: "uppercase",
    marginBottom: 12,
  },
  sectionRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 24,
    marginBottom: 12,
  },

  /* Tiles */
  tilesGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    marginHorizontal: -4,
  },
  tileWrap: {
    width: "25%",
    padding: 4,
    alignItems: "center",
    marginBottom: 8,
  },
  tileInner: {
    alignItems: "center",
    paddingVertical: 10,
    paddingHorizontal: 6,
    borderRadius: 12,
    gap: 7,
    width: "100%",
  },
  tileIcon: {
    width: 54,
    height: 54,
    borderRadius: 15,
    alignItems: "center",
    justifyContent: "center",
  },
  tileLetter: {
    color: "#FFFFFF",
    fontSize: 20,
    fontWeight: "800",
    fontFamily: "Inter_700Bold",
  },
  tileName: {
    fontSize: 11,
    fontWeight: "500",
    textAlign: "center",
  },

  /* Bookmark card */
  listCard: {
    borderRadius: 12,
    overflow: "hidden",
  },
  bookmarkRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 14,
    paddingVertical: 12,
    gap: 12,
  },
  bookmarkIcon: {
    width: 32,
    height: 32,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
  },
  bookmarkText: { flex: 1 },
  bookmarkTitle: { fontSize: 13, fontWeight: "600" },
  bookmarkUrl: { fontSize: 11, marginTop: 1 },
  rowDivider: { height: StyleSheet.hairlineWidth, marginLeft: 58 },

  /* History */
  histList: { gap: 6 },
  histRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 14,
    paddingVertical: 11,
    borderRadius: 10,
    gap: 12,
  },
  histIcon: {
    width: 30,
    height: 30,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
  },
  histText: { flex: 1 },
  histTitle: { fontSize: 13, fontWeight: "500" },
  histUrl: { fontSize: 11, marginTop: 1 },
});
