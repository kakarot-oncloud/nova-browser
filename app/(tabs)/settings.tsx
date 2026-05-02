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

function SectionTitle({ title }: { title: string }) {
  const colors = useColors();
  return <Text style={[styles.sectionTitle, { color: colors.mutedForeground }]}>{title}</Text>;
}

function SettingsRow({ icon, label, subtitle, rightContent, onPress, danger, iconBg }: {
  icon: string; label: string; subtitle?: string; rightContent?: React.ReactNode;
  onPress?: () => void; danger?: boolean; iconBg?: string;
}) {
  const colors = useColors();
  const bg = iconBg ?? ((danger ? colors.destructive : colors.primary) + "15");
  return (
    <TouchableOpacity
      style={[styles.row, { backgroundColor: colors.card, borderColor: colors.border }]}
      onPress={onPress}
      activeOpacity={onPress ? 0.7 : 1}
    >
      <View style={[styles.rowIcon, { backgroundColor: bg }]}>
        <Ionicons name={icon as any} size={18} color={danger ? colors.destructive : colors.primary} />
      </View>
      <View style={styles.rowText}>
        <Text style={[styles.rowLabel, { color: danger ? colors.destructive : colors.foreground }]}>{label}</Text>
        {subtitle ? <Text style={[styles.rowSub, { color: colors.mutedForeground }]}>{subtitle}</Text> : null}
      </View>
      {rightContent ?? (onPress ? <Ionicons name="chevron-forward" size={16} color={colors.mutedForeground} /> : null)}
    </TouchableOpacity>
  );
}

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
      <TextInput style={[styles.fieldInput, { backgroundColor: colors.input, color: colors.foreground, borderColor: colors.border }]} value={value} onChangeText={onChange} placeholder={placeholder} placeholderTextColor={colors.mutedForeground} keyboardType={keyboardType} autoCapitalize="none" autoCorrect={false} />
    </View>
  );

  const Toggle = ({ label, value, onChange }: any) => (
    <View style={styles.toggleRow}>
      <Text style={[styles.toggleLabel, { color: colors.foreground }]}>{label}</Text>
      <Switch value={value} onValueChange={onChange} trackColor={{ false: colors.border, true: colors.primary }} thumbColor="#fff" />
    </View>
  );

  return (
    <Modal animationType="slide" onRequestClose={onClose}>
      <View style={[styles.proxyModal, { backgroundColor: colors.background }]}>
        <View style={[styles.proxyHeader, { borderBottomColor: colors.border, paddingTop: insets.top + 10 }]}>
          <Text style={[styles.proxyTitle, { color: colors.foreground }]}>{proxy ? "Edit Proxy" : "Add Proxy"}</Text>
          <TouchableOpacity onPress={onClose}><Ionicons name="close" size={22} color={colors.foreground} /></TouchableOpacity>
        </View>
        <ScrollView contentContainerStyle={styles.proxyBody}>
          <Field label="Name (optional)" value={name} onChange={setName} placeholder="My Proxy" />
          <Text style={[styles.fieldLabel, { color: colors.mutedForeground }]}>Protocol</Text>
          <View style={styles.typeRow}>
            {(["HTTP", "HTTPS", "SOCKS5"] as ProxyType[]).map((t) => (
              <TouchableOpacity key={t} style={[styles.typeBtn, { backgroundColor: type === t ? colors.primary : colors.muted }]} onPress={() => setType(t)}>
                <Text style={[styles.typeBtnLabel, { color: type === t ? "#fff" : colors.mutedForeground }]}>{t}</Text>
              </TouchableOpacity>
            ))}
          </View>
          <Field label="Host / IP" value={host} onChange={setHost} placeholder="192.168.1.1 or proxy.example.com" />
          <Field label="Port" value={port} onChange={setPort} placeholder="8080" keyboardType="numeric" />
          <Field label="Username (optional)" value={username} onChange={setUsername} placeholder="username" />
          <Field label="Password (optional)" value={password} onChange={setPassword} placeholder="password" />

          <Text style={[styles.sectionHeader, { color: colors.mutedForeground }]}>Spoofing Options</Text>
          <Toggle label="Auto-adjust Timezone" value={autoTz} onChange={setAutoTz} />
          {autoTz && <Field label="Timezone" value={tz} onChange={setTz} placeholder="America/New_York" />}
          <Toggle label="Auto-adjust Language" value={autoLang} onChange={setAutoLang} />
          {autoLang && <Field label="Language" value={lang} onChange={setLang} placeholder="en-US" />}
          <Toggle label="Spoof Geolocation" value={spoofLoc} onChange={setSpoofLoc} />
          {spoofLoc && (
            <View style={styles.coordRow}>
              <View style={{ flex: 1 }}><Field label="Latitude" value={lat} onChange={setLat} placeholder="40.7128" keyboardType="decimal-pad" /></View>
              <View style={{ flex: 1 }}><Field label="Longitude" value={lng} onChange={setLng} placeholder="-74.0060" keyboardType="decimal-pad" /></View>
            </View>
          )}
          <Toggle label="Spoof Hardware (8-core, 8GB)" value={spoofHW} onChange={setSpoofHW} />
          <Toggle label="Block WebRTC Leak" value={blockWRTC} onChange={setBlockWRTC} />

          <TouchableOpacity style={[styles.saveBtn, { backgroundColor: colors.primary }]} onPress={save}>
            <Text style={styles.saveBtnText}>Save Proxy</Text>
          </TouchableOpacity>
        </ScrollView>
      </View>
    </Modal>
  );
}

export default function SettingsScreen() {
  const { settings, updateSetting, resetSettings } = useSettings();
  const { clearHistory } = useHistory();
  const { clearBookmarks } = useBookmarks();
  const { clearCompleted, downloads } = useDownloads();
  const { scripts, enabledCount } = useExtensions();
  const { proxies, spoofing, activeProxy, addProxy, updateProxy, removeProxy, setActiveProxy, setSpoofing, getEffectiveUserAgent, isActive: proxyActive } = useProxy();
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const [showEngines, setShowEngines] = useState(false);
  const [showZoom, setShowZoom] = useState(false);
  const [showProxyModal, setShowProxyModal] = useState(false);
  const [editingProxy, setEditingProxy] = useState<ProxyConfig | undefined>();
  const [showUaModal, setShowUaModal] = useState(false);
  const currentEngine = SEARCH_ENGINES.find((e) => e.id === settings.searchEngineId);

  function confirmClear(title: string, msg: string, action: () => void) {
    Alert.alert(title, msg, [{ text: "Cancel", style: "cancel" }, { text: "Clear", style: "destructive", onPress: action }]);
  }

  const Toggle = ({ label, value, onChange }: { label: string; value: boolean; onChange: (v: boolean) => void }) => (
    <Switch value={value} onValueChange={onChange} trackColor={{ false: colors.border, true: colors.primary }} thumbColor="#fff" />
  );

  return (
    <ScrollView style={[styles.container, { backgroundColor: colors.background }]}
      contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + (Platform.OS === "web" ? 84 : 20) }]}>
      {Platform.OS === "web" && <View style={{ height: 67 }} />}

      {/* Extensions / Userscripts */}
      <SectionTitle title="Extensions & Userscripts" />
      <SettingsRow icon="code-slash" label="Userscript Manager" subtitle={`${scripts.length} scripts · ${enabledCount} active`} iconBg="#7C3AED20" onPress={() => Alert.alert("Userscripts", "Go to the Extensions tab to manage your scripts.")} />
      <SettingsRow icon="shield-checkmark" label="Ad Blocker" rightContent={<Toggle label="" value={settings.adBlockEnabled} onChange={(v) => updateSetting("adBlockEnabled", v)} />} />

      {/* Proxy & Spoofing */}
      <SectionTitle title="Proxy & Identity" />
      {proxyActive && activeProxy && (
        <View style={[styles.activeProxyBanner, { backgroundColor: colors.primary + "15", borderColor: colors.primary }]}>
          <Ionicons name="shield" size={16} color={colors.primary} />
          <Text style={[styles.activeBannerText, { color: colors.primary }]}>
            Active: {activeProxy.name} ({activeProxy.type} {activeProxy.host}:{activeProxy.port})
          </Text>
          <TouchableOpacity onPress={() => setActiveProxy(null)}>
            <Ionicons name="close" size={16} color={colors.primary} />
          </TouchableOpacity>
        </View>
      )}
      {proxies.map((p) => (
        <TouchableOpacity
          key={p.id}
          style={[styles.proxyCard, { backgroundColor: colors.card, borderColor: spoofing.activeProxyId === p.id ? colors.primary : colors.border }]}
          onPress={() => setActiveProxy(spoofing.activeProxyId === p.id ? null : p.id)}
          onLongPress={() => Alert.alert(p.name, undefined, [
            { text: "Cancel", style: "cancel" },
            { text: "Edit", onPress: () => { setEditingProxy(p); setShowProxyModal(true); } },
            { text: "Delete", style: "destructive", onPress: () => removeProxy(p.id) },
          ])}
          activeOpacity={0.8}
        >
          <Ionicons name={spoofing.activeProxyId === p.id ? "shield" : "shield-outline"} size={18} color={spoofing.activeProxyId === p.id ? colors.primary : colors.mutedForeground} />
          <View style={{ flex: 1 }}>
            <Text style={[styles.proxyName, { color: colors.foreground }]}>{p.name}</Text>
            <Text style={[styles.proxyMeta, { color: colors.mutedForeground }]}>{p.type} · {p.host}:{p.port}</Text>
          </View>
          {spoofing.activeProxyId === p.id && <Ionicons name="checkmark-circle" size={20} color={colors.primary} />}
        </TouchableOpacity>
      ))}
      <TouchableOpacity
        style={[styles.addProxyBtn, { borderColor: colors.primary }]}
        onPress={() => { setEditingProxy(undefined); setShowProxyModal(true); }}
      >
        <Ionicons name="add" size={18} color={colors.primary} />
        <Text style={[styles.addProxyText, { color: colors.primary }]}>Add Proxy</Text>
      </TouchableOpacity>

      <SectionTitle title="User Agent" />
      <SettingsRow icon="laptop-outline" label="User Agent Preset"
        subtitle={spoofing.useUserAgentPreset === "default" ? "Default (Mobile)" : spoofing.useUserAgentPreset.replace(/_/g, " ")}
        onPress={() => setShowUaModal(true)}
      />

      {/* Search */}
      <SectionTitle title="Search" />
      <SettingsRow icon="search" label="Search Engine" subtitle={currentEngine?.name} onPress={() => setShowEngines(true)} />

      {/* Browsing */}
      <SectionTitle title="Browsing" />
      <SettingsRow icon="code-slash" label="JavaScript" rightContent={<Toggle label="" value={settings.javascriptEnabled} onChange={(v) => updateSetting("javascriptEnabled", v)} />} />
      <SettingsRow icon="image" label="Load Images" rightContent={<Toggle label="" value={settings.showImages} onChange={(v) => updateSetting("showImages", v)} />} />
      <SettingsRow icon="desktop" label="Desktop Mode" rightContent={<Toggle label="" value={settings.desktopMode} onChange={(v) => updateSetting("desktopMode", v)} />} />
      <SettingsRow icon="eye-off" label="Save History" rightContent={<Toggle label="" value={settings.saveHistory} onChange={(v) => updateSetting("saveHistory", v)} />} />
      <SettingsRow icon="resize" label="Page Zoom" subtitle={`${settings.fontSize}%`} onPress={() => setShowZoom(true)} />

      {/* Downloads */}
      <SectionTitle title="Downloads" />
      <SettingsRow icon="layers" label="Download Threads" subtitle="4 parallel connections per file" />
      <SettingsRow icon="folder" label="Download Folder" subtitle="App Documents/nova_downloads/" />

      {/* Clear data */}
      <SectionTitle title="Clear Data" />
      <SettingsRow icon="time" label="Clear History" onPress={() => confirmClear("Clear History", "Delete all browsing history?", clearHistory)} danger />
      <SettingsRow icon="bookmark" label="Clear Bookmarks" onPress={() => confirmClear("Clear Bookmarks", "Delete all bookmarks?", clearBookmarks)} danger />
      <SettingsRow icon="cloud-download" label="Clear Downloads List" onPress={() => confirmClear("Clear Downloads", "Remove completed/failed downloads?", clearCompleted)} danger />

      {/* About */}
      <SectionTitle title="About" />
      <SettingsRow icon="globe" label="Nova Browser" subtitle="Version 2.0.0 · Advanced Edition" />
      <SettingsRow icon="refresh" label="Reset All Settings" onPress={() => confirmClear("Reset", "Restore all defaults?", resetSettings)} danger />

      {/* Search engine modal */}
      <Modal visible={showEngines} animationType="slide" transparent onRequestClose={() => setShowEngines(false)}>
        <Pressable style={styles.modalBackdrop} onPress={() => setShowEngines(false)} />
        <View style={[styles.modalSheet, { backgroundColor: colors.background, paddingBottom: insets.bottom + 16 }]}>
          <View style={[styles.modalHeader, { borderBottomColor: colors.border }]}>
            <Text style={[styles.modalTitle, { color: colors.foreground }]}>Search Engine</Text>
            <TouchableOpacity onPress={() => setShowEngines(false)}><Ionicons name="close" size={22} color={colors.foreground} /></TouchableOpacity>
          </View>
          {SEARCH_ENGINES.map((e) => (
            <TouchableOpacity key={e.id} style={[styles.sheetRow, { borderBottomColor: colors.border }]} onPress={() => { updateSetting("searchEngineId", e.id); setShowEngines(false); }}>
              <View style={[styles.engineDot, { backgroundColor: e.color }]} />
              <Text style={[styles.sheetRowLabel, { color: colors.foreground }]}>{e.name}</Text>
              {settings.searchEngineId === e.id && <Ionicons name="checkmark" size={20} color={colors.primary} />}
            </TouchableOpacity>
          ))}
        </View>
      </Modal>

      {/* Zoom modal */}
      <Modal visible={showZoom} animationType="slide" transparent onRequestClose={() => setShowZoom(false)}>
        <Pressable style={styles.modalBackdrop} onPress={() => setShowZoom(false)} />
        <View style={[styles.modalSheet, { backgroundColor: colors.background, paddingBottom: insets.bottom + 16 }]}>
          <View style={[styles.modalHeader, { borderBottomColor: colors.border }]}>
            <Text style={[styles.modalTitle, { color: colors.foreground }]}>Page Zoom</Text>
            <TouchableOpacity onPress={() => setShowZoom(false)}><Ionicons name="close" size={22} color={colors.foreground} /></TouchableOpacity>
          </View>
          {[75, 90, 100, 110, 125, 150, 175, 200].map((s) => (
            <TouchableOpacity key={s} style={[styles.sheetRow, { borderBottomColor: colors.border }]} onPress={() => { updateSetting("fontSize", s); setShowZoom(false); }}>
              <Text style={[styles.sheetRowLabel, { color: colors.foreground }]}>{s}%</Text>
              {settings.fontSize === s && <Ionicons name="checkmark" size={20} color={colors.primary} />}
            </TouchableOpacity>
          ))}
        </View>
      </Modal>

      {/* UA preset modal */}
      <Modal visible={showUaModal} animationType="slide" transparent onRequestClose={() => setShowUaModal(false)}>
        <Pressable style={styles.modalBackdrop} onPress={() => setShowUaModal(false)} />
        <View style={[styles.modalSheet, { backgroundColor: colors.background, paddingBottom: insets.bottom + 16 }]}>
          <View style={[styles.modalHeader, { borderBottomColor: colors.border }]}>
            <Text style={[styles.modalTitle, { color: colors.foreground }]}>User Agent</Text>
            <TouchableOpacity onPress={() => setShowUaModal(false)}><Ionicons name="close" size={22} color={colors.foreground} /></TouchableOpacity>
          </View>
          {Object.keys(DEFAULT_UA_PRESETS).map((key) => (
            <TouchableOpacity key={key} style={[styles.sheetRow, { borderBottomColor: colors.border }]} onPress={() => { setSpoofing("useUserAgentPreset", key); setShowUaModal(false); }}>
              <Text style={[styles.sheetRowLabel, { color: colors.foreground }]}>{key === "default" ? "Default (Nova Mobile)" : key.replace(/_/g, " ")}</Text>
              {spoofing.useUserAgentPreset === key && <Ionicons name="checkmark" size={20} color={colors.primary} />}
            </TouchableOpacity>
          ))}
        </View>
      </Modal>

      {showProxyModal && (
        <ProxyModal
          proxy={editingProxy}
          onSave={(p) => {
            if (editingProxy) updateProxy(editingProxy.id, p);
            else addProxy(p);
          }}
          onClose={() => { setShowProxyModal(false); setEditingProxy(undefined); }}
        />
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { paddingHorizontal: 16 },
  sectionTitle: { fontSize: 11, fontWeight: "700", textTransform: "uppercase", letterSpacing: 0.8, marginTop: 24, marginBottom: 8, marginLeft: 4, fontFamily: "Inter_700Bold" },
  row: { flexDirection: "row", alignItems: "center", padding: 14, borderRadius: 14, borderWidth: 1, marginBottom: 6, gap: 12 },
  rowIcon: { width: 34, height: 34, borderRadius: 9, alignItems: "center", justifyContent: "center" },
  rowText: { flex: 1 },
  rowLabel: { fontSize: 14, fontWeight: "600", fontFamily: "Inter_600SemiBold" },
  rowSub: { fontSize: 12, marginTop: 2 },
  activeProxyBanner: { flexDirection: "row", alignItems: "center", gap: 8, padding: 12, borderRadius: 12, borderWidth: 1, marginBottom: 8 },
  activeBannerText: { flex: 1, fontSize: 12, fontWeight: "600" },
  proxyCard: { flexDirection: "row", alignItems: "center", gap: 10, padding: 14, borderRadius: 14, borderWidth: 1, marginBottom: 6 },
  proxyName: { fontSize: 13, fontWeight: "600" },
  proxyMeta: { fontSize: 11, marginTop: 2 },
  addProxyBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6, padding: 12, borderRadius: 12, borderWidth: 1.5, borderStyle: "dashed", marginBottom: 6 },
  addProxyText: { fontSize: 14, fontWeight: "600" },
  modalBackdrop: { flex: 1, backgroundColor: "rgba(0,0,0,0.4)" },
  modalSheet: { borderTopLeftRadius: 24, borderTopRightRadius: 24, shadowColor: "#000", shadowOffset: { width: 0, height: -4 }, shadowOpacity: 0.15, shadowRadius: 12, elevation: 20 },
  modalHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", padding: 20, borderBottomWidth: StyleSheet.hairlineWidth },
  modalTitle: { fontSize: 18, fontWeight: "700", fontFamily: "Inter_700Bold" },
  sheetRow: { flexDirection: "row", alignItems: "center", paddingHorizontal: 20, paddingVertical: 16, borderBottomWidth: StyleSheet.hairlineWidth, gap: 14 },
  sheetRowLabel: { flex: 1, fontSize: 15, fontWeight: "500" },
  engineDot: { width: 10, height: 10, borderRadius: 5 },
  proxyModal: { flex: 1 },
  proxyHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 20, paddingBottom: 14, borderBottomWidth: StyleSheet.hairlineWidth },
  proxyTitle: { fontSize: 18, fontWeight: "700", fontFamily: "Inter_700Bold" },
  proxyBody: { padding: 20, gap: 12 },
  fieldWrap: { gap: 4 },
  fieldLabel: { fontSize: 12, fontWeight: "600", textTransform: "uppercase", letterSpacing: 0.5 },
  fieldInput: { borderWidth: 1, borderRadius: 10, padding: 12, fontSize: 14 },
  typeRow: { flexDirection: "row", gap: 8 },
  typeBtn: { flex: 1, padding: 10, borderRadius: 10, alignItems: "center" },
  typeBtnLabel: { fontSize: 13, fontWeight: "700" },
  sectionHeader: { fontSize: 13, fontWeight: "700", textTransform: "uppercase", letterSpacing: 0.5, marginTop: 8 },
  toggleRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingVertical: 6 },
  toggleLabel: { fontSize: 14, fontWeight: "500", flex: 1 },
  coordRow: { flexDirection: "row", gap: 12 },
  saveBtn: { padding: 16, borderRadius: 14, alignItems: "center", marginTop: 12 },
  saveBtnText: { color: "#fff", fontSize: 16, fontWeight: "700" },
});
