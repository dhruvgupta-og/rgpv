import { useLocalSearchParams, router } from "expo-router";
import { StyleSheet, View, Pressable, Text } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Platform } from "react-native";
import { WebView } from "react-native-webview";
import { useTheme } from "@/lib/theme";
import { useEffect, useMemo } from "react";
import { Ionicons } from "@expo/vector-icons";
import { ensureProfileComplete } from "@/lib/profile-guard";

export default function PdfViewerScreen() {
  const { url } = useLocalSearchParams<{ url?: string }>();
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);

  const decodedUrl = url ? decodeURIComponent(url) : "";
  useEffect(() => {
    ensureProfileComplete(() => router.replace("/profile"));
  }, []);

  return (
    <View style={styles.container}>
      <View style={[styles.topBar, { paddingTop: insets.top + 8 }]}>
        <Pressable onPress={() => router.back()} hitSlop={12} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={22} color={colors.text} />
        </Pressable>
        <Text style={styles.topBarTitle}>PDF Viewer</Text>
        <View style={{ width: 36 }} />
      </View>
      {decodedUrl ? (
        Platform.OS === "web" ? (
          <iframe src={decodedUrl} style={styles.iframe as any} />
        ) : (
          <WebView source={{ uri: decodedUrl }} style={styles.webview} />
        )
      ) : (
        <View style={styles.empty}>
          <Text style={styles.emptyText}>PDF link not available</Text>
        </View>
      )}
    </View>
  );
}

function makeStyles(colors: ReturnType<typeof useTheme>["colors"]) {
  return StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background,
    },
    topBar: {
      flexDirection: "row",
      alignItems: "center",
      paddingHorizontal: 16,
      paddingBottom: 12,
      borderBottomWidth: 1,
      borderBottomColor: colors.cardBorder,
      gap: 8,
    },
    backBtn: {
      width: 36,
      height: 36,
      borderRadius: 10,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: colors.card,
    },
    topBarTitle: {
      flex: 1,
      textAlign: "center",
      fontFamily: "Inter_600SemiBold",
      fontSize: 16,
      color: colors.text,
    },
    webview: {
      flex: 1,
      backgroundColor: colors.background,
    },
    iframe: {
      flex: 1,
      width: "100%",
      border: "none",
    },
    empty: {
      flex: 1,
      alignItems: "center",
      justifyContent: "center",
    },
    emptyText: {
      fontFamily: "Inter_500Medium",
      fontSize: 14,
      color: colors.textMuted,
    },
  });
}
