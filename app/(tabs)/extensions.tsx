import * as Haptics from "expo-haptics";
import { Ionicons } from "@expo/vector-icons";
import React, { useState } from "react";
import {
  Alert,
  FlatList,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useExtensions, UserScript } from "@/contexts/ExtensionsContext";
import { useColors } from "@/hooks/useColors";

function ScriptCard({ script, onToggle, onRemove, onView }: {
  script: UserScript;
  onToggle: () => void;
  onRemove: () => void;
  onView: () => void;
}) {
  const colors = useColors();
  return (
    <TouchableOpacity
      style={[styles.card, { backgroundColor: colors.card, borderColor: script.enabled ? colors.primary + "40" : colors.border }]}
      onPress={onView}
      activeOpacity={0.8}
      onLongPress={() => {
        if (!script.isBuiltin) {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
          Alert.alert(script.name, "What would you like to do?", [
            { text: "Cancel", style: "cancel" },
            { text: "View Code", onPress: onView },
            { text: "Remove", style: "destructive", onPress: onRemove },
          ]);
        }
      }}
    >
      <View style={styles.cardHeader}>
        <View style={[styles.scriptIcon, {
          backgroundColor: script.enabled ? colors.primary + "20" : colors.muted,
        }]}>
          <Ionicons
            name={script.isBuiltin ? "shield-checkmark" : "code-slash"}
            size={20}
            color={script.enabled ? colors.primary : colors.mutedForeground}
          />
        </View>
        <View style={styles.scriptInfo}>
          <Text style={[styles.scriptName, { color: colors.foreground }]} numberOfLines={1}>
            {script.name}
          </Text>
          <Text style={[styles.scriptMeta, { color: colors.mutedForeground }]}>
            v{script.version} · {script.isBuiltin ? "Built-in" : script.author || "Custom"}
          </Text>
        </View>
        <Switch
          value={script.enabled}
          onValueChange={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            onToggle();
          }}
          trackColor={{ false: colors.border, true: colors.primary }}
          thumbColor="#fff"
        />
      </View>

      <Text style={[styles.scriptDesc, { color: colors.mutedForeground }]} numberOfLines={2}>
        {script.description || "No description"}
      </Text>

      {script.matches.length > 0 && (
        <View style={styles.matchRow}>
          <Ionicons name="globe-outline" size={11} color={colors.mutedForeground} />
          <Text style={[styles.matchText, { color: colors.mutedForeground }]} numberOfLines={1}>
            {script.matches[0] === "*" ? "All websites" : script.matches.slice(0, 2).join(", ")}
            {script.matches.length > 2 ? ` +${script.matches.length - 2} more` : ""}
          </Text>
        </View>
      )}

      {!script.isBuiltin && (
        <TouchableOpacity
          style={styles.removeBtn}
          onPress={onRemove}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Ionicons name="trash-outline" size={14} color={colors.destructive} />
        </TouchableOpacity>
      )}
    </TouchableOpacity>
  );
}

function CodeModal({ script, onClose }: { script: UserScript; onClose: () => void }) {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  return (
    <Modal visible animationType="slide" onRequestClose={onClose}>
      <View style={[styles.codeModal, { backgroundColor: colors.background }]}>
        <View style={[styles.codeHeader, { borderBottomColor: colors.border, paddingTop: insets.top + 10 }]}>
          <Text style={[styles.codeTitle, { color: colors.foreground }]} numberOfLines={1}>
            {script.name}
          </Text>
          <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
            <Ionicons name="close" size={22} color={colors.foreground} />
          </TouchableOpacity>
        </View>
        <ScrollView style={[styles.codeScroll, { backgroundColor: "#1E1E2E" }]}>
          <Text style={styles.codeText} selectable>
            {script.code}
          </Text>
        </ScrollView>
      </View>
    </Modal>
  );
}

function InstallModal({ visible, onClose, onInstallUrl, onInstallCode }: {
  visible: boolean;
  onClose: () => void;
  onInstallUrl: (url: string) => Promise<void>;
  onInstallCode: (code: string) => Promise<void>;
}) {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const [tab, setTab] = useState<"url" | "code">("url");
  const [url, setUrl] = useState("");
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);

  async function install() {
    setLoading(true);
    try {
      if (tab === "url") {
        if (!url.trim()) { Alert.alert("Error", "Enter a script URL"); return; }
        await onInstallUrl(url.trim());
        setUrl("");
      } else {
        if (!code.trim()) { Alert.alert("Error", "Paste script code"); return; }
        await onInstallCode(code.trim());
        setCode("");
      }
      onClose();
    } catch (err: any) {
      Alert.alert("Install Failed", err?.message || "Could not install script");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose} />
      <View style={[styles.installSheet, { backgroundColor: colors.background, paddingBottom: insets.bottom + 16 }]}>
        <View style={[styles.installHeader, { borderBottomColor: colors.border }]}>
          <Text style={[styles.installTitle, { color: colors.foreground }]}>Install Userscript</Text>
          <TouchableOpacity onPress={onClose}>
            <Ionicons name="close" size={22} color={colors.foreground} />
          </TouchableOpacity>
        </View>

        {/* Tabs */}
        <View style={[styles.tabRow, { backgroundColor: colors.muted }]}>
          {(["url", "code"] as const).map((t) => (
            <TouchableOpacity
              key={t}
              style={[styles.tabBtn, { backgroundColor: tab === t ? colors.primary : "transparent" }]}
              onPress={() => setTab(t)}
            >
              <Text style={[styles.tabLabel, { color: tab === t ? "#fff" : colors.mutedForeground }]}>
                {t === "url" ? "From URL" : "Paste Code"}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        <View style={styles.installBody}>
          {tab === "url" ? (
            <>
              <Text style={[styles.hint, { color: colors.mutedForeground }]}>
                Paste a Greasy Fork, GitHub Gist, or any .user.js URL
              </Text>
              <TextInput
                style={[styles.urlInput, { backgroundColor: colors.input, color: colors.foreground, borderColor: colors.border }]}
                value={url}
                onChangeText={setUrl}
                placeholder="https://greasyfork.org/.../script.user.js"
                placeholderTextColor={colors.mutedForeground}
                autoCapitalize="none"
                keyboardType="url"
              />
            </>
          ) : (
            <>
              <Text style={[styles.hint, { color: colors.mutedForeground }]}>
                Paste your userscript code (must start with ==UserScript== header)
              </Text>
              <TextInput
                style={[styles.codeInput, { backgroundColor: colors.input, color: colors.foreground, borderColor: colors.border }]}
                value={code}
                onChangeText={setCode}
                placeholder={"// ==UserScript==\n// @name My Script\n// @match *\n// ==/UserScript==\n(function() { ... })();"}
                placeholderTextColor={colors.mutedForeground}
                multiline
                autoCapitalize="none"
                autoCorrect={false}
              />
            </>
          )}

          <TouchableOpacity
            style={[styles.installBtn, { backgroundColor: loading ? colors.muted : colors.primary }]}
            onPress={install}
            disabled={loading}
          >
            <Text style={styles.installBtnText}>{loading ? "Installing..." : "Install Script"}</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

export default function ExtensionsScreen() {
  const { scripts, enabledCount, toggleScript, removeScript, installFromUrl, installFromCode } = useExtensions();
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const [showInstall, setShowInstall] = useState(false);
  const [viewingScript, setViewingScript] = useState<UserScript | null>(null);
  const [filter, setFilter] = useState<"all" | "enabled" | "custom">("all");

  const filtered = scripts.filter((s) => {
    if (filter === "enabled") return s.enabled;
    if (filter === "custom") return !s.isBuiltin;
    return true;
  });

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Stats bar */}
      <View style={[styles.statsBar, { backgroundColor: colors.card, borderBottomColor: colors.border, paddingTop: Platform.OS === "web" ? 67 : 0 }]}>
        <View style={styles.stat}>
          <Text style={[styles.statNum, { color: colors.primary }]}>{scripts.length}</Text>
          <Text style={[styles.statLabel, { color: colors.mutedForeground }]}>Total</Text>
        </View>
        <View style={[styles.statDivider, { backgroundColor: colors.border }]} />
        <View style={styles.stat}>
          <Text style={[styles.statNum, { color: "#22C55E" }]}>{enabledCount}</Text>
          <Text style={[styles.statLabel, { color: colors.mutedForeground }]}>Active</Text>
        </View>
        <View style={[styles.statDivider, { backgroundColor: colors.border }]} />
        <View style={styles.stat}>
          <Text style={[styles.statNum, { color: colors.accent }]}>{scripts.filter((s) => !s.isBuiltin).length}</Text>
          <Text style={[styles.statLabel, { color: colors.mutedForeground }]}>Custom</Text>
        </View>
      </View>

      {/* Filter row */}
      <View style={styles.filterRow}>
        {(["all", "enabled", "custom"] as const).map((f) => (
          <TouchableOpacity
            key={f}
            style={[styles.filterChip, { backgroundColor: filter === f ? colors.primary : colors.muted }]}
            onPress={() => setFilter(f)}
          >
            <Text style={[styles.filterLabel, { color: filter === f ? "#fff" : colors.mutedForeground }]}>
              {f.charAt(0).toUpperCase() + f.slice(1)}
            </Text>
          </TouchableOpacity>
        ))}
        <View style={{ flex: 1 }} />
        <TouchableOpacity
          style={[styles.installChip, { backgroundColor: colors.primary }]}
          onPress={() => setShowInstall(true)}
        >
          <Ionicons name="add" size={16} color="#fff" />
          <Text style={styles.installChipText}>Install</Text>
        </TouchableOpacity>
      </View>

      <FlatList
        data={filtered}
        keyExtractor={(s) => s.id}
        contentContainerStyle={[
          styles.list,
          { paddingBottom: insets.bottom + (Platform.OS === "web" ? 84 : 20) },
        ]}
        scrollEnabled={!!filtered.length}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Ionicons name="code-slash-outline" size={52} color={colors.mutedForeground} />
            <Text style={[styles.emptyTitle, { color: colors.foreground }]}>
              {filter === "custom" ? "No Custom Scripts" : "No Scripts"}
            </Text>
            <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>
              {filter === "custom"
                ? "Install scripts from Greasy Fork or paste your own code"
                : "No matching scripts found"}
            </Text>
          </View>
        }
        renderItem={({ item }) => (
          <ScriptCard
            script={item}
            onToggle={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              toggleScript(item.id);
            }}
            onRemove={() => {
              Alert.alert("Remove Script", `Remove "${item.name}"?`, [
                { text: "Cancel", style: "cancel" },
                { text: "Remove", style: "destructive", onPress: () => removeScript(item.id) },
              ]);
            }}
            onView={() => setViewingScript(item)}
          />
        )}
      />

      <InstallModal
        visible={showInstall}
        onClose={() => setShowInstall(false)}
        onInstallUrl={installFromUrl}
        onInstallCode={installFromCode}
      />
      {viewingScript && (
        <CodeModal script={viewingScript} onClose={() => setViewingScript(null)} />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  statsBar: {
    flexDirection: "row",
    paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  stat: { flex: 1, alignItems: "center" },
  statNum: { fontSize: 22, fontWeight: "800", fontFamily: "Inter_700Bold" },
  statLabel: { fontSize: 11, marginTop: 2 },
  statDivider: { width: 1 },
  filterRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 8,
  },
  filterChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  filterLabel: { fontSize: 13, fontWeight: "600" },
  installChip: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    gap: 4,
  },
  installChipText: { color: "#fff", fontSize: 13, fontWeight: "600" },
  list: { paddingHorizontal: 16, paddingTop: 4, gap: 10 },
  card: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 14,
    gap: 8,
    position: "relative",
  },
  cardHeader: { flexDirection: "row", alignItems: "center", gap: 10 },
  scriptIcon: { width: 40, height: 40, borderRadius: 12, alignItems: "center", justifyContent: "center" },
  scriptInfo: { flex: 1 },
  scriptName: { fontSize: 14, fontWeight: "700", fontFamily: "Inter_700Bold" },
  scriptMeta: { fontSize: 11, marginTop: 1 },
  scriptDesc: { fontSize: 12, lineHeight: 17 },
  matchRow: { flexDirection: "row", alignItems: "center", gap: 4 },
  matchText: { fontSize: 11 },
  removeBtn: { position: "absolute", top: 14, right: 56 },
  backdrop: { flex: 1, backgroundColor: "rgba(0,0,0,0.5)" },
  installSheet: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: "85%",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.2,
    shadowRadius: 12,
    elevation: 20,
  },
  installHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 20,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  installTitle: { fontSize: 18, fontWeight: "700", fontFamily: "Inter_700Bold" },
  tabRow: { flexDirection: "row", margin: 16, borderRadius: 10, padding: 3 },
  tabBtn: { flex: 1, paddingVertical: 8, borderRadius: 8, alignItems: "center" },
  tabLabel: { fontSize: 13, fontWeight: "600" },
  installBody: { paddingHorizontal: 16, gap: 10 },
  hint: { fontSize: 12, lineHeight: 17 },
  urlInput: {
    borderWidth: 1,
    borderRadius: 10,
    padding: 12,
    fontSize: 13,
  },
  codeInput: {
    borderWidth: 1,
    borderRadius: 10,
    padding: 12,
    fontSize: 12,
    fontFamily: Platform.OS === "ios" ? "Menlo" : "monospace",
    height: 180,
    textAlignVertical: "top",
  },
  installBtn: {
    padding: 14,
    borderRadius: 12,
    alignItems: "center",
    marginTop: 4,
  },
  installBtnText: { color: "#fff", fontSize: 15, fontWeight: "700" },
  codeModal: { flex: 1 },
  codeHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingBottom: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  codeTitle: { flex: 1, fontSize: 16, fontWeight: "700" },
  closeBtn: { padding: 4 },
  codeScroll: { flex: 1 },
  codeText: {
    color: "#CDD6F4",
    fontFamily: Platform.OS === "ios" ? "Menlo" : "monospace",
    fontSize: 12,
    padding: 16,
    lineHeight: 20,
  },
  empty: { flex: 1, alignItems: "center", justifyContent: "center", paddingTop: 60, gap: 10 },
  emptyTitle: { fontSize: 18, fontWeight: "700", fontFamily: "Inter_700Bold" },
  emptyText: { fontSize: 14, textAlign: "center", paddingHorizontal: 40 },
});
