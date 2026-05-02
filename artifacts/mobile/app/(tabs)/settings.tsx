import * as Haptics from "expo-haptics";
import { Ionicons } from "@expo/vector-icons";
import React, { useState } from "react";
import {
  Alert,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  TouchableNativeFeedback,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useBookmarks } from "@/contexts/BookmarksContext";
import { useDownloads } from "@/contexts/DownloadsContext";
import { useHistory } from "@/contexts/HistoryContext";
import { useSettings } from "@/contexts/SettingsContext";
import { useExtensions } from "@/contexts/ExtensionsContext";
import { useProxy, ProxyConfig, ProxyType, DEFAULT_UA_PRESETS } from "@/contexts/ProxyContext";
import { useColors } from "@/hooks/useColors";
import { SEARCH_ENGINES } from "@/constants/searchEngines";

/* ── Primitives ─────────────────────────────────────────────── */

function SectionLabel({ title }: { title: string }) {
  const colors = useColors();
  return <Text style={[styles.sectionLabel, { color: colors.mutedForeground }]}>{title}</Text>;
}

function SectionCard({ children }: { children: React.ReactNode }) {
  const colors = useColors();
  return (
    <View style={[styles.sectionCard, { backgroundColor: colors.card }]}>
      {children}
    </View>
  );
}

function RowDivider() {
  const colors = useColors();
  return <View style={[styles.rowDivider, { backgroundColor: colors.border }]} />;
}

function Row({
  icon,
  iconBg,
  label,
  subtitle,
  right,
  onPress,
  danger,
}: {
  icon: string;
  iconBg?: string;
  label: string;
  subtitle?: string;
  right?: React.ReactNode;
  onPress?: () => void;
  danger?: boolean;
}) {
  const colors = useColors();
  const bg = iconBg ?? (danger ? colors.destructive + "18" : colors.primary + "18");
  const textColor = danger ? colors.destructive : colors.foreground;
  const iconColor = danger ? colors.destructive : colors.primary;

  const inner = (
    <View style={styles.row} pointerEvents="box-none">
      <View style={[styles.rowIconWrap, { backgroundColor: bg }]}>
        <Ionicons name={icon as any} size={17} color={iconColor} />
      </View>
      <View style={styles.rowContent}>
        <Text style={[styles.rowLabel, { color: textColor }]}>{label}</Text>
        {subtitle ? <Text style={[styles.rowSub, { color: colors.mutedForeground }]}>{subtitle}</Text> : null}
      </View>
      {right !== undefined
        ? right
        : onPress
        ? <Ionicons name="chevron-forward" size={16} color={colors.mutedForeground} />
        : null}
    </View>
  );

  if (!onPress) return inner;

  if (Platform.OS === "android") {
    return (
      <TouchableNativeFeedback
        onPress={onPress}
        background={TouchableNativeFeedback.Ripple(colors.muted, false)}
      >
        {inner}
      </TouchableNativeFeedback>
    );
  }
  return (
    <TouchableOpacity onPress={onPress} activeOpacity={0.7}>
      {inner}
    </TouchableOpacity>
  );
}

/* ── Proxy modal ─────────────────────────────────────────────── */
function ProxyModal({ proxy, onSave, onClose }: {
  proxy?: ProxyConfig;
  onSave: (p: Omit<ProxyConfig, "id">) => void;
  onClose: () => void;
}) {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const [name, setName] = useState(proxy?.name ?? "");
  const [type, setType] = useState<ProxyType>(proxy?.type ?? "HTTP");
  const [host, setHost] = useState(proxy?.host ?? "");
  const [port, setPort] = useState(proxy?.port?.toString() ?? "");
  const [username, setUsername] = useState(proxy?.username ?? "");
  const [password, setPassword] = useState(proxy?.password ?? "");
  const [autoTz, setAutoTz] = useState(proxy?.autoTimezone ?? false);
  const [tz, setTz] = useState(proxy?.timezone ?? "America/New_York");
  const [autoLang, setAutoLang] = useState(proxy?.autoLanguage ?? false);
  const [lang, setLang] = useState(proxy?.language ?? "en-US");
  const [spoofLoc, setSpoofLoc] = useState(proxy?.spoofLocation ?? false);
  const [lat, setLat] = useState(proxy?.lat?.toString() ?? "40.7128");
  const [lng, setLng] = useState(proxy?.lng?.toString() ?? "-74.0060");
  const [spoofHW, setSpoofHW] = useState(proxy?.spoofHardware ?? false);
  const [blockWRTC, setBlockWRTC] = useState(proxy?.blockWebRTC ?? true);
  const [uaPreset, setUaPreset] = useState(proxy?.userAgentPreset ?? "default");

  function save() {
    if (!host.trim()) { Alert.alert("Error", "Host is required"); return; }
    const p = parseInt(port);
    if (isNaN(p) || p < 1 || p > 65535) { Alert.alert("Error", "Invalid port (1–65535)"); return; }
    onSave({ name: name || `${type} ${host}:${port}`, type, host: host.trim(), port: p, username: username || undefined, password: password || undefined, autoTimezone: autoTz, timezone: tz, autoLanguage: autoLang, language: lang, spoofLocation: spoofLoc, lat: parseFloat(lat) || 0, lng: parseFloat(lng) || 0, spoofHardware: spoofHW, blockWebRTC: blockWRTC, userAgentPreset: uaPreset });
    onClose();
  }

  const Field = ({ label, value, onChange, placeholder, keyboardType = "default" }: any) => (
    <View style={styles.fieldWrap}>
      <Text style={[styles.fieldLabel, { color: colors.mutedForeground }]}>{label}</Text>
      <TextInput
        style={[styles.fieldInput, { backgroundColor: colors.input, color: colors.foreground }]}
        value={value} onChangeText={onChange} placeholder={placeholder}
        placeholderTextColor={colors.mutedForeground} keyboardType={keyboardType}
        autoCapitalize="none" autoCorrect={false}
      />
    </View>
  );

  const Toggle = ({ label, value, onChange }: any) => (
    <View style={styles.inlineToggle}>
      <Text style={[styles.rowLabel, { color: colors.foreground }]}>{label}</Text>
      <Switch value={value} onValueChange={onChange} trackColor={{ false: colors.border, true: colors.primary }} thumbColor="#fff" />
    </View>
  );

  return (
    <Modal animationType="slide" onRequestClose={onClose}>
      <View style={[styles.modalScreen, { backgroundColor: colors.background }]}>
        <View style={[styles.modalHeader, { borderBottomColor: colors.border, paddingTop: insets.top + 10 }]}>
          <Text style={[styles.modalTitle, { color: colors.foreground }]}>{proxy ? "Edit Proxy" : "Add Proxy"}</Text>
          <TouchableOpacity onPress={onClose} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
            <Ionicons name="close" size={22} color={colors.foreground} />
          </TouchableOpacity>
        </View>
        <ScrollView contentContainerStyle={styles.modalBody}>
          <Field label="Name (optional)" value={name} onChange={setName} placeholder="My Proxy" />
          <Text style={[styles.fieldLabel, { color: colors.mutedForeground }]}>Protocol</Text>
          <View style={styles.typeRow}>
            {(["HTTP", "HTTPS", "SOCKS5"] as ProxyType[]).map((t) => (
              <TouchableOpacity key={t} style={[styles.typeBtn, { backgroundColor: type === t ? colors.primary : colors.muted }]} onPress={() => setType(t)}>
                <Text style={[styles.typeBtnText, { color: type === t ? "#fff" : colors.mutedForeground }]}>{t}</Text>
              </TouchableOpacity>
            ))}
          </View>
          <Field label="Host / IP" value={host} onChange={setHost} placeholder="192.168.1.1" />
          <Field label="Port" value={port} onChange={setPort} placeholder="8080" keyboardType="numeric" />
          <Field label="Username (optional)" value={username} onChange={setUsername} placeholder="username" />
          <Field label="Password (optional)" value={password} onChange={setPassword} placeholder="password" />
          <Text style={[styles.subHeader, { color: colors.mutedForeground }]}>Spoofing</Text>
          <Toggle label="Auto-adjust Timezone" value={autoTz} onChange={setAutoTz} />
          {autoTz && <Field label="Timezone" value={tz} onChange={setTz} placeholder="America/New_York" />}
          <Toggle label="Auto-adjust Language" value={autoLang} onChange={setAutoLang} />
          {autoLang && <Field label="Language" value={lang} onChange={setLang} placeholder="en-US" />}
          <Toggle label="Spoof Geolocation" value={spoofLoc} onChange={setSpoofLoc} />
          {spoofLoc && (
            <View style={{ flexDirection: "row", gap: 12 }}>
              <View style={{ flex: 1 }}><Field label="Latitude" value={lat} onChange={setLat} placeholder="40.7128" keyboardType="decimal-pad" /></View>
              <View style={{ flex: 1 }}><Field label="Longitude" value={lng} onChange={setLng} placeholder="-74.0060" keyboardType="decimal-pad" /></View>
            </View>
          )}
          <Toggle label="Spoof Hardware" value={spoofHW} onChange={setSpoofHW} />
          <Toggle label="Block WebRTC Leak" value={blockWRTC} onChange={setBlockWRTC} />
          <TouchableOpacity style={[styles.saveBtn, { backgroundColor: colors.primary }]} onPress={save}>
            <Text style={styles.saveBtnText}>Save Proxy</Text>
          </TouchableOpacity>
        </ScrollView>
      </View>
    </Modal>
  );
}

/* ── Main screen ─────────────────────────────────────────────── */
export default function SettingsScreen() {
  const { settings, updateSetting, resetSettings } = useSettings();
  const { clearHistory } = useHistory();
  const { clearBookmarks } = useBookmarks();
  const { clearCompleted } = useDownloads();
  const { scripts, enabledCount } = useExtensions();
  const { proxies, spoofing, activeProxy, addProxy, updateProxy, removeProxy, setActiveProxy, setSpoofing, isActive: proxyActive } = useProxy();
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const [showEngines, setShowEngines] = useState(false);
  const [showZoom, setShowZoom] = useState(false);
  const [showProxyModal, setShowProxyModal] = useState(false);
  const [editingProxy, setEditingProxy] = useState<ProxyConfig | undefined>();
  const [showUaModal, setShowUaModal] = useState(false);
  const currentEngine = SEARCH_ENGINES.find((e) => e.id === settings.searchEngineId);

  function T(v: boolean, f: (b: boolean) => void) {
    return <Switch value={v} onValueChange={f} trackColor={{ false: colors.border, true: colors.primary }} thumbColor="#fff" />;
  }

  function confirm(title: string, msg: string, action: () => void) {
    Alert.alert(title, msg, [{ text: "Cancel", style: "cancel" }, { text: "Confirm", style: "destructive", onPress: action }]);
  }

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: colors.background }]}
      contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + (Platform.OS === "web" ? 100 : 32) }]}
    >
      {Platform.OS === "web" && <View style={{ height: 67 }} />}

      {/* Extensions */}
      <SectionLabel title="Extensions" />
      <SectionCard>
        <Row icon="code-slash" label="Userscripts" subtitle={`${scripts.length} installed · ${enabledCount} active`} iconBg="#7C3AED18" onPress={() => Alert.alert("Userscripts", "Manage scripts in the Extensions tab.")} />
        <RowDivider />
        <Row icon="shield-checkmark" label="Ad Blocker" right={T(settings.adBlockEnabled, (v) => updateSetting("adBlockEnabled", v))} />
      </SectionCard>

      {/* Proxy */}
      <SectionLabel title="Proxy & Identity" />
      {proxyActive && activeProxy && (
        <View style={[styles.activeBanner, { backgroundColor: colors.primary + "18" }]}>
          <Ionicons name="shield" size={15} color={colors.primary} />
          <Text style={[styles.activeBannerText, { color: colors.primary }]} numberOfLines={1}>
            Active: {activeProxy.name} ({activeProxy.type} {activeProxy.host}:{activeProxy.port})
          </Text>
          <TouchableOpacity onPress={() => setActiveProxy(null)} hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}>
            <Ionicons name="close" size={15} color={colors.primary} />
          </TouchableOpacity>
        </View>
      )}
      {proxies.length > 0 && (
        <SectionCard>
          {proxies.map((p, i) => (
            <View key={p.id}>
              {i > 0 && <RowDivider />}
              <TouchableOpacity
                style={styles.row}
                onPress={() => setActiveProxy(spoofing.activeProxyId === p.id ? null : p.id)}
                onLongPress={() => Alert.alert(p.name, undefined, [
                  { text: "Cancel", style: "cancel" },
                  { text: "Edit", onPress: () => { setEditingProxy(p); setShowProxyModal(true); } },
                  { text: "Delete", style: "destructive", onPress: () => removeProxy(p.id) },
                ])}
                activeOpacity={0.75}
              >
                <View style={[styles.rowIconWrap, { backgroundColor: colors.primary + "18" }]}>
                  <Ionicons name={spoofing.activeProxyId === p.id ? "shield" : "shield-outline"} size={17} color={colors.primary} />
                </View>
                <View style={styles.rowContent}>
                  <Text style={[styles.rowLabel, { color: colors.foreground }]}>{p.name}</Text>
                  <Text style={[styles.rowSub, { color: colors.mutedForeground }]}>{p.type} · {p.host}:{p.port}</Text>
                </View>
                {spoofing.activeProxyId === p.id && <Ionicons name="checkmark-circle" size={20} color={colors.primary} />}
              </TouchableOpacity>
            </View>
          ))}
        </SectionCard>
      )}
      <TouchableOpacity
        style={[styles.addBtn, { borderColor: colors.primary }]}
        onPress={() => { setEditingProxy(undefined); setShowProxyModal(true); }}
      >
        <Ionicons name="add" size={17} color={colors.primary} />
        <Text style={[styles.addBtnText, { color: colors.primary }]}>Add Proxy</Text>
      </TouchableOpacity>

      {/* UA */}
      <SectionLabel title="User Agent" />
      <SectionCard>
        <Row icon="laptop-outline" label="UA Preset"
          subtitle={spoofing.useUserAgentPreset === "default" ? "Default (Mobile)" : spoofing.useUserAgentPreset.replace(/_/g, " ")}
          onPress={() => setShowUaModal(true)}
        />
      </SectionCard>

      {/* Search */}
      <SectionLabel title="Search" />
      <SectionCard>
        <Row icon="search" label="Search Engine" subtitle={currentEngine?.name} onPress={() => setShowEngines(true)} />
      </SectionCard>

      {/* Browsing */}
      <SectionLabel title="Browsing" />
      <SectionCard>
        <Row icon="code-slash" label="JavaScript" right={T(settings.javascriptEnabled, (v) => updateSetting("javascriptEnabled", v))} />
        <RowDivider />
        <Row icon="image" label="Load Images" right={T(settings.showImages, (v) => updateSetting("showImages", v))} />
        <RowDivider />
        <Row icon="desktop-outline" label="Desktop Mode" right={T(settings.desktopMode, (v) => updateSetting("desktopMode", v))} />
        <RowDivider />
        <Row icon="eye-off-outline" label="Save History" right={T(settings.saveHistory, (v) => updateSetting("saveHistory", v))} />
        <RowDivider />
        <Row icon="resize" label="Page Zoom" subtitle={`${settings.fontSize}%`} onPress={() => setShowZoom(true)} />
      </SectionCard>

      {/* Downloads */}
      <SectionLabel title="Downloads" />
      <SectionCard>
        <Row icon="layers-outline" label="Download Threads" subtitle="4 parallel connections per file" />
        <RowDivider />
        <Row icon="folder-outline" label="Download Folder" subtitle="Documents / nova_downloads" />
      </SectionCard>

      {/* Clear data */}
      <SectionLabel title="Clear Data" />
      <SectionCard>
        <Row icon="time-outline" label="Clear History" onPress={() => confirm("Clear History", "Delete all browsing history?", clearHistory)} danger />
        <RowDivider />
        <Row icon="bookmark-outline" label="Clear Bookmarks" onPress={() => confirm("Clear Bookmarks", "Delete all bookmarks?", clearBookmarks)} danger />
        <RowDivider />
        <Row icon="cloud-download-outline" label="Clear Downloads" onPress={() => confirm("Clear Downloads", "Remove all completed downloads?", clearCompleted)} danger />
      </SectionCard>

      {/* About */}
      <SectionLabel title="About" />
      <SectionCard>
        <Row icon="globe" label="Nova Browser" subtitle="Version 2.0.0 — Advanced Edition" />
        <RowDivider />
        <Row icon="refresh" label="Reset Settings" onPress={() => confirm("Reset Settings", "Restore all defaults?", resetSettings)} danger />
      </SectionCard>

      {/* ── Modals ── */}
      <Modal visible={showEngines} animationType="slide" transparent onRequestClose={() => setShowEngines(false)}>
        <Pressable style={styles.backdrop} onPress={() => setShowEngines(false)} />
        <View style={[styles.sheet, { backgroundColor: colors.card, paddingBottom: insets.bottom + 16 }]}>
          <View style={[styles.sheetHeader, { borderBottomColor: colors.border }]}>
            <Text style={[styles.sheetTitle, { color: colors.foreground }]}>Search Engine</Text>
            <TouchableOpacity onPress={() => setShowEngines(false)}><Ionicons name="close" size={22} color={colors.foreground} /></TouchableOpacity>
          </View>
          {SEARCH_ENGINES.map((e, i) => (
            <View key={e.id}>
              {i > 0 && <View style={[styles.rowDivider, { backgroundColor: colors.border, marginLeft: 20 }]} />}
              <TouchableOpacity style={styles.sheetRow} onPress={() => { updateSetting("searchEngineId", e.id); setShowEngines(false); }}>
                <View style={[styles.engineDot, { backgroundColor: e.color }]} />
                <Text style={[styles.sheetRowLabel, { color: colors.foreground }]}>{e.name}</Text>
                {settings.searchEngineId === e.id && <Ionicons name="checkmark" size={20} color={colors.primary} />}
              </TouchableOpacity>
            </View>
          ))}
        </View>
      </Modal>

      <Modal visible={showZoom} animationType="slide" transparent onRequestClose={() => setShowZoom(false)}>
        <Pressable style={styles.backdrop} onPress={() => setShowZoom(false)} />
        <View style={[styles.sheet, { backgroundColor: colors.card, paddingBottom: insets.bottom + 16 }]}>
          <View style={[styles.sheetHeader, { borderBottomColor: colors.border }]}>
            <Text style={[styles.sheetTitle, { color: colors.foreground }]}>Page Zoom</Text>
            <TouchableOpacity onPress={() => setShowZoom(false)}><Ionicons name="close" size={22} color={colors.foreground} /></TouchableOpacity>
          </View>
          {[75, 90, 100, 110, 125, 150, 175, 200].map((s, i) => (
            <View key={s}>
              {i > 0 && <View style={[styles.rowDivider, { backgroundColor: colors.border, marginLeft: 20 }]} />}
              <TouchableOpacity style={styles.sheetRow} onPress={() => { updateSetting("fontSize", s); setShowZoom(false); }}>
                <Text style={[styles.sheetRowLabel, { color: colors.foreground }]}>{s}%</Text>
                {settings.fontSize === s && <Ionicons name="checkmark" size={20} color={colors.primary} />}
              </TouchableOpacity>
            </View>
          ))}
        </View>
      </Modal>

      <Modal visible={showUaModal} animationType="slide" transparent onRequestClose={() => setShowUaModal(false)}>
        <Pressable style={styles.backdrop} onPress={() => setShowUaModal(false)} />
        <View style={[styles.sheet, { backgroundColor: colors.card, paddingBottom: insets.bottom + 16 }]}>
          <View style={[styles.sheetHeader, { borderBottomColor: colors.border }]}>
            <Text style={[styles.sheetTitle, { color: colors.foreground }]}>User Agent</Text>
            <TouchableOpacity onPress={() => setShowUaModal(false)}><Ionicons name="close" size={22} color={colors.foreground} /></TouchableOpacity>
          </View>
          {Object.keys(DEFAULT_UA_PRESETS).map((key, i) => (
            <View key={key}>
              {i > 0 && <View style={[styles.rowDivider, { backgroundColor: colors.border, marginLeft: 20 }]} />}
              <TouchableOpacity style={styles.sheetRow} onPress={() => { setSpoofing("useUserAgentPreset", key); setShowUaModal(false); }}>
                <Text style={[styles.sheetRowLabel, { color: colors.foreground }]}>{key === "default" ? "Default (Nova Mobile)" : key.replace(/_/g, " ")}</Text>
                {spoofing.useUserAgentPreset === key && <Ionicons name="checkmark" size={20} color={colors.primary} />}
              </TouchableOpacity>
            </View>
          ))}
        </View>
      </Modal>

      {showProxyModal && (
        <ProxyModal
          proxy={editingProxy}
          onSave={(p) => { if (editingProxy) updateProxy(editingProxy.id, p); else addProxy(p); }}
          onClose={() => { setShowProxyModal(false); setEditingProxy(undefined); }}
        />
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { paddingHorizontal: 16 },

  sectionLabel: {
    fontSize: 11,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 0.8,
    marginTop: 28,
    marginBottom: 8,
    marginLeft: 4,
  },
  sectionCard: {
    borderRadius: 12,
    overflow: "hidden",
    elevation: 1,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 14,
    paddingVertical: 13,
    gap: 12,
    minHeight: 52,
  },
  rowIconWrap: {
    width: 32,
    height: 32,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
  },
  rowContent: { flex: 1 },
  rowLabel: { fontSize: 14, fontWeight: "500" },
  rowSub: { fontSize: 12, marginTop: 2 },
  rowDivider: { height: StyleSheet.hairlineWidth, marginLeft: 58 },

  activeBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    padding: 12,
    borderRadius: 10,
    marginBottom: 8,
  },
  activeBannerText: { flex: 1, fontSize: 12, fontWeight: "600" },

  addBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 12,
    borderRadius: 10,
    borderWidth: 1.5,
    borderStyle: "dashed",
    marginTop: 8,
  },
  addBtnText: { fontSize: 14, fontWeight: "600" },

  inlineToggle: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 14,
    paddingVertical: 10,
    gap: 12,
  },

  /* Proxy modal */
  modalScreen: { flex: 1 },
  modalHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 20, paddingBottom: 14, borderBottomWidth: StyleSheet.hairlineWidth },
  modalTitle: { fontSize: 18, fontWeight: "700" },
  modalBody: { padding: 20, gap: 14 },
  fieldWrap: { gap: 5 },
  fieldLabel: { fontSize: 11, fontWeight: "700", textTransform: "uppercase", letterSpacing: 0.5 },
  fieldInput: { borderRadius: 10, padding: 12, fontSize: 14 },
  typeRow: { flexDirection: "row", gap: 8 },
  typeBtn: { flex: 1, paddingVertical: 10, borderRadius: 10, alignItems: "center" },
  typeBtnText: { fontSize: 13, fontWeight: "700" },
  subHeader: { fontSize: 11, fontWeight: "700", textTransform: "uppercase", letterSpacing: 0.5, marginTop: 4 },
  saveBtn: { padding: 16, borderRadius: 12, alignItems: "center", marginTop: 8 },
  saveBtnText: { color: "#fff", fontSize: 16, fontWeight: "700" },

  /* Picker sheets */
  backdrop: { flex: 1, backgroundColor: "rgba(0,0,0,0.35)" },
  sheet: { borderTopLeftRadius: 16, borderTopRightRadius: 16, elevation: 24 },
  sheetHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", padding: 18, borderBottomWidth: StyleSheet.hairlineWidth },
  sheetTitle: { fontSize: 17, fontWeight: "700" },
  sheetRow: { flexDirection: "row", alignItems: "center", paddingHorizontal: 20, paddingVertical: 15, gap: 14 },
  sheetRowLabel: { flex: 1, fontSize: 15 },
  engineDot: { width: 10, height: 10, borderRadius: 5 },
});
