import { StyleSheet, Text, View, FlatList, Pressable, Platform } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { router } from "expo-router";
import { Ionicons, Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import Colors from "@/constants/colors";
import { getSubjectById, getBranchById, Subject } from "@/lib/rgpv-data";
import { useBookmarks } from "@/lib/bookmarks";
import { useMemo } from "react";

function BookmarkItem({ subject }: { subject: Subject }) {
  const branch = getBranchById(subject.branch);
  const { toggleBookmark } = useBookmarks();

  const handlePress = () => {
    if (Platform.OS !== "web") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    router.push({ pathname: "/subject/[id]", params: { id: subject.id } });
  };

  const handleRemove = () => {
    if (Platform.OS !== "web") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }
    toggleBookmark(subject.id);
  };

  return (
    <Pressable
      onPress={handlePress}
      style={({ pressed }) => [
        styles.bookmarkCard,
        { transform: [{ scale: pressed ? 0.98 : 1 }] },
      ]}
    >
      <View style={[styles.branchDot, { backgroundColor: branch?.color || Colors.primary }]} />
      <View style={styles.bookmarkInfo}>
        <Text style={styles.bookmarkName} numberOfLines={1}>{subject.name}</Text>
        <Text style={styles.bookmarkMeta}>
          {branch?.shortName || subject.branch.toUpperCase()} | {subject.code} | Sem {subject.semester}
        </Text>
      </View>
      <Pressable onPress={handleRemove} hitSlop={10}>
        <Ionicons name="bookmark" size={20} color={Colors.primary} />
      </Pressable>
    </Pressable>
  );
}

export default function BookmarksScreen() {
  const insets = useSafeAreaInsets();
  const { bookmarks } = useBookmarks();
  const webTopInset = Platform.OS === "web" ? 67 : 0;

  const bookmarkedSubjects = useMemo(() => {
    return bookmarks
      .map(id => getSubjectById(id))
      .filter((s): s is Subject => s !== undefined);
  }, [bookmarks]);

  return (
    <View style={styles.container}>
      <View style={[styles.header, { paddingTop: (Platform.OS === "web" ? webTopInset : insets.top) + 12 }]}>
        <Text style={styles.headerTitle}>Saved</Text>
        {bookmarkedSubjects.length > 0 && (
          <View style={styles.countBadge}>
            <Text style={styles.countText}>{bookmarkedSubjects.length}</Text>
          </View>
        )}
      </View>

      <FlatList
        data={bookmarkedSubjects}
        keyExtractor={item => item.id}
        renderItem={({ item }) => <BookmarkItem subject={item} />}
        contentContainerStyle={[
          styles.listContent,
          { paddingBottom: Platform.OS === "web" ? 34 + 84 : 100 },
        ]}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <View style={styles.emptyIconContainer}>
              <Ionicons name="bookmark-outline" size={48} color={Colors.textMuted} />
            </View>
            <Text style={styles.emptyTitle}>No saved subjects</Text>
            <Text style={styles.emptySubtext}>
              Tap the bookmark icon on any subject to save it here for quick access
            </Text>
          </View>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  header: {
    paddingHorizontal: 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: Colors.cardBorder,
    flexDirection: "row",
    alignItems: "flex-end",
    gap: 10,
  },
  headerTitle: {
    fontFamily: "Inter_700Bold",
    fontSize: 28,
    color: Colors.text,
  },
  countBadge: {
    backgroundColor: Colors.primary + '25',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 10,
    marginBottom: 4,
  },
  countText: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 13,
    color: Colors.primary,
  },
  listContent: {
    paddingHorizontal: 20,
    paddingTop: 16,
    gap: 8,
  },
  bookmarkCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: Colors.card,
    borderRadius: 12,
    padding: 16,
    gap: 12,
    borderWidth: 1,
    borderColor: Colors.cardBorder,
  },
  branchDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  bookmarkInfo: {
    flex: 1,
  },
  bookmarkName: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 15,
    color: Colors.text,
    marginBottom: 2,
  },
  bookmarkMeta: {
    fontFamily: "Inter_400Regular",
    fontSize: 12,
    color: Colors.textSecondary,
  },
  emptyState: {
    alignItems: "center",
    justifyContent: "center",
    paddingTop: 80,
    paddingHorizontal: 40,
    gap: 12,
  },
  emptyIconContainer: {
    width: 80,
    height: 80,
    borderRadius: 24,
    backgroundColor: Colors.card,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 8,
  },
  emptyTitle: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 18,
    color: Colors.textSecondary,
  },
  emptySubtext: {
    fontFamily: "Inter_400Regular",
    fontSize: 13,
    color: Colors.textMuted,
    textAlign: "center",
    lineHeight: 20,
  },
});
