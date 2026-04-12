import { StyleSheet, Text, View, FlatList, Platform } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useMemo } from "react";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "@/lib/theme";

export default function EventsScreen() {
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);

  // Placeholder events
  const events = [
    { id: 1, title: "Exam Form Deadline", date: "April 20, 2026", type: "Deadline" },
    { id: 2, title: "Webinar: Tech Trends", date: "April 22, 2026", type: "Event" },
    { id: 3, title: "Cultural Fest '26", date: "May 5-7, 2026", type: "Event" },
  ];

  return (
    <View style={styles.container}>
      <View style={[styles.header, { paddingTop: (Platform.OS === "web" ? 67 : insets.top) + 12 }]}>
        <Text style={styles.headerTitle}>Events</Text>
      </View>

      <FlatList
        data={events}
        keyExtractor={(item) => String(item.id)}
        contentContainerStyle={[
          styles.listContent,
          { paddingBottom: Platform.OS === "web" ? 34 + 84 : 100 },
        ]}
        renderItem={({ item }) => (
          <View style={styles.card}>
            <View style={styles.cardHeader}>
               <Text style={styles.title}>{item.title}</Text>
               <View style={[styles.tag, { backgroundColor: item.type === 'Deadline' ? colors.danger + '20' : colors.primary + '20' }]}>
                 <Text style={[styles.tagText, { color: item.type === 'Deadline' ? colors.danger : colors.primary }]}>{item.type}</Text>
               </View>
            </View>
            <View style={styles.footer}>
              <Ionicons name="calendar-outline" size={14} color={colors.textMuted} />
              <Text style={styles.time}>{item.date}</Text>
            </View>
          </View>
        )}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Ionicons name="calendar-outline" size={48} color={colors.textMuted} />
            <Text style={styles.emptyTitle}>No events scheduled</Text>
            <Text style={styles.emptySubtext}>Upcoming college events will appear here</Text>
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
    gap: 10,
  },
  cardHeader: {
    flexDirection: 'row' as const,
    justifyContent: 'space-between' as const,
    alignItems: 'center' as const,
  },
  title: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 15,
    flex: 1,
  },
  tag: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  tagText: {
    fontSize: 10,
    fontFamily: 'Inter_600SemiBold',
  },
  footer: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    gap: 4,
  },
  time: {
    fontFamily: "Inter_400Regular",
    fontSize: 12,
  },
  emptyState: {
    alignItems: "center" as const,
    justifyContent: "center" as const,
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
    textAlign: "center" as const,
  },
};

function makeStyles(colors: any) {
  return StyleSheet.create({
    ...baseStyles,
    container: { ...baseStyles.container, backgroundColor: colors.background },
    header: { ...baseStyles.header, borderBottomColor: colors.cardBorder },
    headerTitle: { ...baseStyles.headerTitle, color: colors.text },
    card: { ...baseStyles.card, backgroundColor: colors.card, borderColor: colors.cardBorder },
    title: { ...baseStyles.title, color: colors.text },
    time: { ...baseStyles.time, color: colors.textMuted },
    emptyTitle: { ...baseStyles.emptyTitle, color: colors.textSecondary },
    emptySubtext: { ...baseStyles.emptySubtext, color: colors.textMuted },
  });
}
