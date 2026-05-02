import * as Haptics from "expo-haptics";
import { Ionicons } from "@expo/vector-icons";
import React, { useState } from "react";
import {
  Alert,
  FlatList,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import {
  useDownloads,
  Download,
  DownloadStatus,
  DownloadCategory,
  categoryIcon,
  categoryColor,
  formatBytes,
  formatSpeed,
  formatEta,
} from "@/contexts/DownloadsContext";
import { useColors } from "@/hooks/useColors";

const CATEGORIES: { id: DownloadCategory | "all"; label: string }[] = [
  { id: "all", label: "All" },
  { id: "video", label: "Video" },
  { id: "audio", label: "Audio" },
  { id: "document", label: "Docs" },
  { id: "image", label: "Images" },
  { id: "archive", label: "Archives" },
  { id: "apk", label: "APK" },
  { id: "other", label: "Other" },
];

function statusColor(status: DownloadStatus, colors: any): string {
  switch (status) {
    case "completed": return "#22C55E";
    case "downloading": return colors.primary;
    case "paused": return "#F59E0B";
    case "failed": return colors.destructive;
    case "cancelled": return colors.mutedForeground;
    default: return colors.mutedForeground;
  }
}

function statusLabel(status: DownloadStatus): string {
  switch (status) {
    case "downloading": return "Downloading";
    case "paused": return "Paused";
    case "completed": return "Complete";
    case "failed": return "Failed";
    case "cancelled": return "Cancelled";
    default: return "Pending";
  }
}

function DownloadCard({ item, onPause, onResume, onCancel, onRemove, onOpen }: {
  item: Download;
  onPause: () => void;
  onResume: () => void;
  onCancel: () => void;
  onRemove: () => void;
  onOpen: () => void;
}) {
  const colors = useColors();
  const isActive = item.status === "downloading";
  const isPaused = item.status === "paused";
  const isDone = item.status === "completed";
  const isFailed = item.status === "failed" || item.status === "cancelled";
  const catColor = categoryColor(item.category);
  const pct = Math.round(item.progress * 100);

  return (
    <TouchableOpacity
      style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}
      onPress={isDone ? onOpen : undefined}
      onLongPress={() => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        Alert.alert(item.filename, undefined, [
          { text: "Cancel", style: "cancel" },
          isActive ? { text: "Pause", onPress: onPause } : null,
          isPaused ? { text: "Resume", onPress: onResume } : null,
          (isActive || isPaused) ? { text: "Cancel Download", style: "destructive", onPress: onCancel } : null,
          { text: "Remove from List", style: "destructive", onPress: onRemove },
        ].filter(Boolean) as any);
      }}
      activeOpacity={0.85}
    >
      {/* Category icon + filename row */}
      <View style={styles.cardTop}>
        <View style={[styles.catIcon, { backgroundColor: catColor + "20" }]}>
          <Ionicons name={categoryIcon(item.category) as any} size={20} color={catColor} />
        </View>
        <View style={styles.fileInfo}>
          <Text style={[styles.filename, { color: colors.foreground }]} numberOfLines={1}>
            {item.filename}
          </Text>
          <View style={styles.metaRow}>
            <View style={[styles.statusDot, { backgroundColor: statusColor(item.status, colors) }]} />
            <Text style={[styles.statusText, { color: statusColor(item.status, colors) }]}>
              {statusLabel(item.status)}
            </Text>
            {item.size ? (
              <Text style={[styles.sizeMeta, { color: colors.mutedForeground }]}>
                · {formatBytes(item.size)}
              </Text>
            ) : null}
          </View>
        </View>
        {/* Action button */}
        {isActive && (
          <TouchableOpacity onPress={onPause} style={styles.actionBtn} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
            <Ionicons name="pause" size={18} color={colors.primary} />
          </TouchableOpacity>
        )}
        {isPaused && (
          <TouchableOpacity onPress={onResume} style={styles.actionBtn} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
            <Ionicons name="play" size={18} color={colors.primary} />
          </TouchableOpacity>
        )}
        {isDone && (
          <Ionicons name="checkmark-circle" size={22} color="#22C55E" />
        )}
        {isFailed && (
          <TouchableOpacity onPress={onRemove} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
            <Ionicons name="close-circle" size={22} color={colors.mutedForeground} />
          </TouchableOpacity>
        )}
      </View>

      {/* Progress bar (active or paused) */}
      {(isActive || isPaused) && (
        <View style={styles.progressSection}>
          <View style={[styles.progressTrack, { backgroundColor: colors.muted }]}>
            <View
              style={[
                styles.progressFill,
                {
                  backgroundColor: isPaused ? "#F59E0B" : colors.primary,
                  width: `${pct}%`,
                },
              ]}
            />
          </View>
          <View style={styles.progressStats}>
            <Text style={[styles.progressPct, { color: colors.foreground }]}>{pct}%</Text>
            {item.size ? (
              <Text style={[styles.progressBytes, { color: colors.mutedForeground }]}>
                {formatBytes(item.downloadedBytes)} / {formatBytes(item.size)}
              </Text>
            ) : null}
            {isActive && item.speedBps > 0 && (
              <Text style={[styles.speed, { color: colors.primary }]}>
                {formatSpeed(item.speedBps)}
              </Text>
            )}
            {isActive && item.etaSeconds > 0 && (
              <Text style={[styles.eta, { color: colors.mutedForeground }]}>
                ETA {formatEta(item.etaSeconds)}
              </Text>
            )}
          </View>
          {/* Thread indicator */}
          {isActive && (
            <View style={styles.threadRow}>
              {Array.from({ length: Math.min(item.threads, 8) }).map((_, i) => (
                <View
                  key={i}
                  style={[
                    styles.threadBar,
                    {
                      backgroundColor: i < Math.ceil(item.threads * item.progress)
                        ? colors.primary
                        : colors.muted,
                    },
                  ]}
                />
              ))}
              <Text style={[styles.threadLabel, { color: colors.mutedForeground }]}>
                {item.threads} threads
              </Text>
            </View>
          )}
        </View>
      )}

      {/* Error */}
      {item.status === "failed" && item.error && (
        <Text style={[styles.errorText, { color: colors.destructive }]} numberOfLines={2}>
          {item.error}
        </Text>
      )}
    </TouchableOpacity>
  );
}

export default function DownloadsScreen() {
  const { downloads, activeCount, pauseDownload, resumeDownload, cancelDownload, removeDownload, clearCompleted, openDownload } = useDownloads();
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const [catFilter, setCatFilter] = useState<DownloadCategory | "all">("all");
  const [statusFilter, setStatusFilter] = useState<"all" | "active" | "done">("all");

  const filtered = downloads.filter((d) => {
    if (catFilter !== "all" && d.category !== catFilter) return false;
    if (statusFilter === "active" && d.status !== "downloading" && d.status !== "paused") return false;
    if (statusFilter === "done" && d.status !== "completed" && d.status !== "failed" && d.status !== "cancelled") return false;
    return true;
  });

  const totalSize = downloads.filter((d) => d.status === "completed" && d.size).reduce((sum, d) => sum + (d.size || 0), 0);

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Header stats */}
      <View style={[styles.statsRow, { backgroundColor: colors.card, borderBottomColor: colors.border, paddingTop: Platform.OS === "web" ? 67 : 0 }]}>
        <View style={styles.stat}>
          <Text style={[styles.statNum, { color: colors.foreground }]}>{downloads.length}</Text>
          <Text style={[styles.statLabel, { color: colors.mutedForeground }]}>Total</Text>
        </View>
        <View style={[styles.divider, { backgroundColor: colors.border }]} />
        <View style={styles.stat}>
          <Text style={[styles.statNum, { color: colors.primary }]}>{activeCount}</Text>
          <Text style={[styles.statLabel, { color: colors.mutedForeground }]}>Active</Text>
        </View>
        <View style={[styles.divider, { backgroundColor: colors.border }]} />
        <View style={styles.stat}>
          <Text style={[styles.statNum, { color: "#22C55E" }]}>{downloads.filter((d) => d.status === "completed").length}</Text>
          <Text style={[styles.statLabel, { color: colors.mutedForeground }]}>Done</Text>
        </View>
        <View style={[styles.divider, { backgroundColor: colors.border }]} />
        <View style={styles.stat}>
          <Text style={[styles.statNum, { color: colors.accent }]}>{formatBytes(totalSize)}</Text>
          <Text style={[styles.statLabel, { color: colors.mutedForeground }]}>Saved</Text>
        </View>
      </View>

      {/* Status filter */}
      <View style={styles.statusRow}>
        {([["all", "All"], ["active", "Active"], ["done", "Completed"]] as const).map(([v, l]) => (
          <TouchableOpacity
            key={v}
            style={[styles.statusChip, { backgroundColor: statusFilter === v ? colors.primary : colors.muted }]}
            onPress={() => setStatusFilter(v)}
          >
            <Text style={[styles.chipLabel, { color: statusFilter === v ? "#fff" : colors.mutedForeground }]}>{l}</Text>
          </TouchableOpacity>
        ))}
        <View style={{ flex: 1 }} />
        {downloads.some((d) => d.status === "completed" || d.status === "failed" || d.status === "cancelled") && (
          <TouchableOpacity onPress={clearCompleted}>
            <Text style={[styles.clearText, { color: colors.primary }]}>Clear Done</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Category filter */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.catScroll} contentContainerStyle={{ paddingHorizontal: 16, gap: 6 }}>
        {CATEGORIES.filter((c) => c.id === "all" || downloads.some((d) => d.category === c.id)).map((c) => (
          <TouchableOpacity
            key={c.id}
            style={[
              styles.catChip,
              { backgroundColor: catFilter === c.id ? colors.primary + "20" : colors.muted, borderColor: catFilter === c.id ? colors.primary : "transparent", borderWidth: 1 },
            ]}
            onPress={() => setCatFilter(c.id)}
          >
            {c.id !== "all" && (
              <Ionicons name={categoryIcon(c.id as DownloadCategory) as any} size={12} color={catFilter === c.id ? colors.primary : colors.mutedForeground} />
            )}
            <Text style={[styles.catLabel, { color: catFilter === c.id ? colors.primary : colors.mutedForeground }]}>{c.label}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      <FlatList
        data={filtered}
        keyExtractor={(d) => d.id}
        contentContainerStyle={[
          styles.list,
          { paddingBottom: insets.bottom + (Platform.OS === "web" ? 84 : 20), flexGrow: 1 },
        ]}
        scrollEnabled={!!filtered.length}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Ionicons name="cloud-download-outline" size={54} color={colors.mutedForeground} />
            <Text style={[styles.emptyTitle, { color: colors.foreground }]}>No Downloads</Text>
            <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>
              {statusFilter !== "all" || catFilter !== "all"
                ? "No downloads match your filter"
                : "Files you download from the browser will appear here"}
            </Text>
          </View>
        }
        renderItem={({ item }) => (
          <DownloadCard
            item={item}
            onPause={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); pauseDownload(item.id); }}
            onResume={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); resumeDownload(item.id); }}
            onCancel={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium); cancelDownload(item.id); }}
            onRemove={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium); removeDownload(item.id); }}
            onOpen={() => openDownload(item)}
          />
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  statsRow: { flexDirection: "row", paddingVertical: 12, borderBottomWidth: StyleSheet.hairlineWidth },
  stat: { flex: 1, alignItems: "center" },
  statNum: { fontSize: 16, fontWeight: "800", fontFamily: "Inter_700Bold" },
  statLabel: { fontSize: 10, marginTop: 2 },
  divider: { width: 1 },
  statusRow: { flexDirection: "row", alignItems: "center", paddingHorizontal: 16, paddingVertical: 10, gap: 6 },
  statusChip: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20 },
  chipLabel: { fontSize: 12, fontWeight: "600" },
  clearText: { fontSize: 12, fontWeight: "600" },
  catScroll: { maxHeight: 40 },
  catChip: { flexDirection: "row", alignItems: "center", paddingHorizontal: 10, paddingVertical: 5, borderRadius: 16, gap: 4 },
  catLabel: { fontSize: 11, fontWeight: "600" },
  list: { padding: 16, gap: 10 },
  card: { borderRadius: 16, borderWidth: 1, padding: 14, gap: 10 },
  cardTop: { flexDirection: "row", alignItems: "center", gap: 10 },
  catIcon: { width: 40, height: 40, borderRadius: 12, alignItems: "center", justifyContent: "center" },
  fileInfo: { flex: 1 },
  filename: { fontSize: 13, fontWeight: "600", fontFamily: "Inter_600SemiBold" },
  metaRow: { flexDirection: "row", alignItems: "center", gap: 4, marginTop: 3 },
  statusDot: { width: 6, height: 6, borderRadius: 3 },
  statusText: { fontSize: 11, fontWeight: "600" },
  sizeMeta: { fontSize: 11 },
  actionBtn: { padding: 4 },
  progressSection: { gap: 6 },
  progressTrack: { height: 4, borderRadius: 2, overflow: "hidden" },
  progressFill: { height: "100%", borderRadius: 2 },
  progressStats: { flexDirection: "row", alignItems: "center", gap: 8, flexWrap: "wrap" },
  progressPct: { fontSize: 12, fontWeight: "700" },
  progressBytes: { fontSize: 11 },
  speed: { fontSize: 11, fontWeight: "700" },
  eta: { fontSize: 11 },
  threadRow: { flexDirection: "row", alignItems: "center", gap: 3 },
  threadBar: { width: 16, height: 3, borderRadius: 2 },
  threadLabel: { fontSize: 10, marginLeft: 4 },
  errorText: { fontSize: 12, lineHeight: 17 },
  empty: { flex: 1, alignItems: "center", justifyContent: "center", paddingTop: 60, gap: 10 },
  emptyTitle: { fontSize: 18, fontWeight: "700", fontFamily: "Inter_700Bold" },
  emptyText: { fontSize: 14, textAlign: "center", paddingHorizontal: 40 },
});
