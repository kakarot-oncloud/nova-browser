import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import React from "react";
import {
  FlatList,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useBrowser } from "@/contexts/BrowserContext";
import { useBookmarks } from "@/contexts/BookmarksContext";
import { useHistory } from "@/contexts/HistoryContext";
import { useSettings } from "@/contexts/SettingsContext";
import { useColors } from "@/hooks/useColors";

const SPEED_DIALS = [
  { id: "google", name: "Google", url: "https://www.google.com", color: "#4285F4", icon: "logo-google" as const },
  { id: "youtube", name: "YouTube", url: "https://www.youtube.com", color: "#FF0000", icon: "logo-youtube" as const },
  { id: "reddit", name: "Reddit", url: "https://www.reddit.com", color: "#FF4500", icon: "logo-reddit" as const },
  { id: "twitter", name: "X", url: "https://x.com", color: "#000000", icon: "logo-twitter" as const },
  { id: "wikipedia", name: "Wikipedia", url: "https://www.wikipedia.org", color: "#636466", icon: "book" as const },
  { id: "amazon", name: "Amazon", url: "https://www.amazon.com", color: "#FF9900", icon: "bag" as const },
  { id: "github", name: "GitHub", url: "https://github.com", color: "#333333", icon: "logo-github" as const },
  { id: "instagram", name: "Instagram", url: "https://www.instagram.com", color: "#C13584", icon: "logo-instagram" as const },
  { id: "netflix", name: "Netflix", url: "https://www.netflix.com", color: "#E50914", icon: "film" as const },
  { id: "maps", name: "Maps", url: "https://maps.google.com", color: "#34A853", icon: "map" as const },
];

interface SpeedDialProps {
  onSearch: (query: string) => void;
}

export default function SpeedDial({ onSearch }: SpeedDialProps) {
  const { navigateTo, addTab } = useBrowser();
  const { bookmarks } = useBookmarks();
  const { history } = useHistory();
  const { currentSearchEngine } = useSettings();
  const colors = useColors();

  const recentHistory = history.slice(0, 5);
  const recentBookmarks = bookmarks.slice(0, 5);

  function goto(url: string) {
    navigateTo(url);
  }

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: colors.background }]}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
    >
      {/* Logo */}
      <View style={styles.logoRow}>
        <Ionicons name="globe" size={32} color={colors.primary} />
        <Text style={[styles.logoText, { color: colors.foreground }]}>Nova Browser</Text>
      </View>

      {/* Speed Dials */}
      <Text style={[styles.sectionTitle, { color: colors.mutedForeground }]}>Quick Access</Text>
      <View style={styles.grid}>
        {SPEED_DIALS.map((site) => (
          <TouchableOpacity
            key={site.id}
            style={[styles.dial, { backgroundColor: colors.card, borderColor: colors.border }]}
            onPress={() => goto(site.url)}
            activeOpacity={0.7}
          >
            <View style={[styles.dialIcon, { backgroundColor: site.color + "20" }]}>
              <Ionicons name={site.icon as any} size={22} color={site.color} />
            </View>
            <Text style={[styles.dialName, { color: colors.foreground }]} numberOfLines={1}>
              {site.name}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Recent Bookmarks */}
      {recentBookmarks.length > 0 && (
        <>
          <Text style={[styles.sectionTitle, { color: colors.mutedForeground }]}>Bookmarks</Text>
          {recentBookmarks.map((b) => (
            <TouchableOpacity
              key={b.id}
              style={[styles.listItem, { backgroundColor: colors.card, borderColor: colors.border }]}
              onPress={() => goto(b.url)}
              activeOpacity={0.7}
            >
              <View style={[styles.listIcon, { backgroundColor: colors.primary + "20" }]}>
                <Ionicons name="bookmark" size={16} color={colors.primary} />
              </View>
              <View style={styles.listText}>
                <Text style={[styles.listTitle, { color: colors.foreground }]} numberOfLines={1}>{b.title}</Text>
                <Text style={[styles.listUrl, { color: colors.mutedForeground }]} numberOfLines={1}>{b.url}</Text>
              </View>
              <Ionicons name="chevron-forward" size={16} color={colors.mutedForeground} />
            </TouchableOpacity>
          ))}
        </>
      )}

      {/* Recent History */}
      {recentHistory.length > 0 && (
        <>
          <Text style={[styles.sectionTitle, { color: colors.mutedForeground }]}>Recently Visited</Text>
          {recentHistory.map((h) => (
            <TouchableOpacity
              key={h.id}
              style={[styles.listItem, { backgroundColor: colors.card, borderColor: colors.border }]}
              onPress={() => goto(h.url)}
              activeOpacity={0.7}
            >
              <View style={[styles.listIcon, { backgroundColor: colors.muted }]}>
                <Ionicons name="time" size={16} color={colors.mutedForeground} />
              </View>
              <View style={styles.listText}>
                <Text style={[styles.listTitle, { color: colors.foreground }]} numberOfLines={1}>{h.title || h.url}</Text>
                <Text style={[styles.listUrl, { color: colors.mutedForeground }]} numberOfLines={1}>{h.url}</Text>
              </View>
              <Ionicons name="chevron-forward" size={16} color={colors.mutedForeground} />
            </TouchableOpacity>
          ))}
        </>
      )}

      <View style={{ height: 40 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: 20 },
  logoRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    marginBottom: 28,
    marginTop: 10,
  },
  logoText: {
    fontSize: 22,
    fontWeight: "700",
    fontFamily: "Inter_700Bold",
  },
  sectionTitle: {
    fontSize: 11,
    fontWeight: "600",
    textTransform: "uppercase",
    letterSpacing: 0.8,
    marginBottom: 10,
    marginTop: 8,
    fontFamily: "Inter_600SemiBold",
  },
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
    marginBottom: 8,
  },
  dial: {
    width: "18%",
    aspectRatio: 0.9,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 14,
    borderWidth: 1,
    gap: 6,
    paddingVertical: 8,
  },
  dialIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  dialName: {
    fontSize: 10,
    fontWeight: "500",
    textAlign: "center",
  },
  listItem: {
    flexDirection: "row",
    alignItems: "center",
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 6,
    gap: 12,
  },
  listIcon: {
    width: 32,
    height: 32,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
  },
  listText: { flex: 1 },
  listTitle: { fontSize: 13, fontWeight: "600" },
  listUrl: { fontSize: 11, marginTop: 2 },
});
