import { Ionicons } from "@expo/vector-icons";
import React, { useRef, useState } from "react";
import {
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  Platform,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useColors } from "@/hooks/useColors";

interface FindInPageProps {
  visible: boolean;
  onClose: () => void;
  onFind: (query: string, direction: "forward" | "backward") => void;
  matchCount?: number;
  currentMatch?: number;
}

export default function FindInPage({ visible, onClose, onFind, matchCount = 0, currentMatch = 0 }: FindInPageProps) {
  const [query, setQuery] = useState("");
  const inputRef = useRef<TextInput>(null);
  const colors = useColors();
  const insets = useSafeAreaInsets();

  if (!visible) return null;

  function handleChange(text: string) {
    setQuery(text);
    if (text.trim()) onFind(text, "forward");
  }

  return (
    <View
      style={[
        styles.container,
        {
          backgroundColor: colors.toolbar,
          borderTopColor: colors.border,
          bottom: Platform.OS === "web" ? 84 : insets.bottom + 56,
        },
      ]}
    >
      <Ionicons name="search" size={16} color={colors.mutedForeground} />
      <TextInput
        ref={inputRef}
        style={[styles.input, { color: colors.foreground }]}
        value={query}
        onChangeText={handleChange}
        placeholder="Find in page..."
        placeholderTextColor={colors.mutedForeground}
        autoFocus
        returnKeyType="search"
        onSubmitEditing={() => onFind(query, "forward")}
      />
      {matchCount > 0 && (
        <Text style={[styles.count, { color: colors.mutedForeground }]}>
          {currentMatch}/{matchCount}
        </Text>
      )}
      <TouchableOpacity onPress={() => onFind(query, "backward")} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
        <Ionicons name="chevron-up" size={20} color={colors.foreground} />
      </TouchableOpacity>
      <TouchableOpacity onPress={() => onFind(query, "forward")} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
        <Ionicons name="chevron-down" size={20} color={colors.foreground} />
      </TouchableOpacity>
      <TouchableOpacity
        onPress={() => {
          setQuery("");
          onClose();
        }}
        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
      >
        <Ionicons name="close" size={20} color={colors.foreground} />
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: "absolute",
    left: 0,
    right: 0,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderTopWidth: StyleSheet.hairlineWidth,
    gap: 8,
    zIndex: 100,
  },
  input: {
    flex: 1,
    fontSize: 14,
    height: 36,
  },
  count: {
    fontSize: 12,
    minWidth: 40,
    textAlign: "right",
  },
});
