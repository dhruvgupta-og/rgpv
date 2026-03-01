import { StyleSheet, Text, View, FlatList, Platform } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useMemo } from "react";
import { Ionicons } from "@expo/vector-icons";
import { useQuery } from "@tanstack/react-query";
import { useTheme } from "@/lib/theme";

type NotificationItem = {
  id: number;
  title: string;
  body: string;
  createdAt?: string;
};

export default function NotificationsScreen() {
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);

  const { data: notifications = [] } = useQuery<NotificationItem[]>({
    queryKey: ["/api/notifications?limit=100"],
  });

  return (
    <View style={styles.container}>
      <View style={[styles.header, { paddingTop: (Platform.OS === "web" ? 67 : insets.top) + 12 }]}>
        <Text style={styles.headerTitle}>Notifications</Text>
      </View>

      <FlatList
        data={notifications}
        keyExtractor={(item) => String(item.id)}
        contentContainerStyle={[
          styles.listContent,
          { paddingBottom: Platform.OS === "web" ? 34 + 84 : 100 },
        ]}
        renderItem={({ item }) => (
          <View style={styles.card}>
            <Text style={styles.title}>{item.title}</Text>
            <Text style={styles.body}>{item.body}</Text>
            {item.createdAt ? (
              <Text style={styles.time}>{new Date(item.createdAt).toLocaleString()}</Text>
            ) : null}
          </View>
        )}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Ionicons name="notifications-outline" size={48} color={colors.textMuted} />
            <Text style={styles.emptyTitle}>No notifications yet</Text>
            <Text style={styles.emptySubtext}>Messages from admin will appear here</Text>
          </View>
        }
      />
    </View>
  );
}

const baseStyles = {
  container: {
    flex: 1,
  },
  header: {
    paddingHorizontal: 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
  },
  headerTitle: {
    fontFamily: "Inter_700Bold",
    fontSize: 26,
  },
  listContent: {
    paddingHorizontal: 20,
    paddingTop: 16,
    gap: 10,
  },
  card: {
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    gap: 6,
  },
  title: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 14,
  },
  body: {
    fontFamily: "Inter_400Regular",
    fontSize: 13,
  },
  time: {
    fontFamily: "Inter_400Regular",
    fontSize: 11,
  },
  emptyState: {
    alignItems: "center",
    justifyContent: "center",
    paddingTop: 80,
    gap: 10,
  },
  emptyTitle: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 16,
  },
  emptySubtext: {
    fontFamily: "Inter_400Regular",
    fontSize: 13,
    textAlign: "center",
  },
};

function makeStyles(colors: ReturnType<typeof useTheme>["colors"]) {
  return StyleSheet.create({
    ...baseStyles,
    container: { ...baseStyles.container, backgroundColor: colors.background },
    header: { ...baseStyles.header, borderBottomColor: colors.cardBorder },
    headerTitle: { ...baseStyles.headerTitle, color: colors.text },
    card: { ...baseStyles.card, backgroundColor: colors.card, borderColor: colors.cardBorder },
    title: { ...baseStyles.title, color: colors.text },
    body: { ...baseStyles.body, color: colors.textSecondary },
    time: { ...baseStyles.time, color: colors.textMuted },
    emptyTitle: { ...baseStyles.emptyTitle, color: colors.textSecondary },
    emptySubtext: { ...baseStyles.emptySubtext, color: colors.textMuted },
  });
}
