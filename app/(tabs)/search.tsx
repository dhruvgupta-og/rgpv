import { StyleSheet, Text, View, TextInput, FlatList, Pressable, Platform } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useState, useMemo } from "react";
import { router } from "expo-router";
import { Ionicons, Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import Colors from "@/constants/colors";
import { searchSubjects, allSubjects, getBranchById, Subject } from "@/lib/rgpv-data";
import { useBookmarks } from "@/lib/bookmarks";

function SubjectResultItem({ subject }: { subject: Subject }) {
  const branch = getBranchById(subject.branch);
  const { isBookmarked } = useBookmarks();
  const bookmarked = isBookmarked(subject.id);

  const handlePress = () => {
    if (Platform.OS !== "web") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    router.push({ pathname: "/subject/[id]", params: { id: subject.id } });
  };

  return (
    <Pressable
      onPress={handlePress}
      style={({ pressed }) => [
        styles.resultCard,
        { transform: [{ scale: pressed ? 0.98 : 1 }] },
      ]}
    >
      <View style={[styles.resultBadge, { backgroundColor: (branch?.color || Colors.primary) + '18' }]}>
        <Text style={[styles.resultBadgeText, { color: branch?.color || Colors.primary }]}>
          {branch?.shortName || subject.branch.toUpperCase()}
        </Text>
      </View>
      <View style={styles.resultInfo}>
        <Text style={styles.resultName} numberOfLines={1}>{subject.name}</Text>
        <Text style={styles.resultMeta}>{subject.code} | Sem {subject.semester}</Text>
      </View>
      <View style={styles.resultRight}>
        {bookmarked && <Ionicons name="bookmark" size={14} color={Colors.primary} />}
        <Feather name="chevron-right" size={16} color={Colors.textMuted} />
      </View>
    </Pressable>
  );
}

export default function SearchScreen() {
  const insets = useSafeAreaInsets();
  const [query, setQuery] = useState("");
  const webTopInset = Platform.OS === "web" ? 67 : 0;

  const results = useMemo(() => {
    if (!query.trim()) return [];
    return searchSubjects(query);
  }, [query]);

  const popularSubjects = useMemo(() => {
    return allSubjects.filter(s => ['cse-3-ds', 'cse-4-dbms', 'cse-4-os', 'cse-5-cn', 'cse-6-ai'].includes(s.id));
  }, []);

  return (
    <View style={styles.container}>
      <View style={[styles.header, { paddingTop: (Platform.OS === "web" ? webTopInset : insets.top) + 12 }]}>
        <Text style={styles.headerTitle}>Search</Text>
        <View style={styles.searchBar}>
          <Ionicons name="search" size={18} color={Colors.textMuted} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search subjects, codes..."
            placeholderTextColor={Colors.textMuted}
            value={query}
            onChangeText={setQuery}
            autoCorrect={false}
            autoCapitalize="none"
          />
          {query.length > 0 && (
            <Pressable onPress={() => setQuery("")}>
              <Ionicons name="close-circle" size={18} color={Colors.textMuted} />
            </Pressable>
          )}
        </View>
      </View>

      {query.trim() ? (
        <FlatList
          data={results}
          keyExtractor={item => item.id}
          renderItem={({ item }) => <SubjectResultItem subject={item} />}
          contentContainerStyle={[
            styles.listContent,
            { paddingBottom: Platform.OS === "web" ? 34 + 84 : 100 },
          ]}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <Ionicons name="search-outline" size={48} color={Colors.textMuted} />
              <Text style={styles.emptyText}>No subjects found</Text>
              <Text style={styles.emptySubtext}>Try a different search term</Text>
            </View>
          }
        />
      ) : (
        <FlatList
          data={popularSubjects}
          keyExtractor={item => item.id}
          renderItem={({ item }) => <SubjectResultItem subject={item} />}
          contentContainerStyle={[
            styles.listContent,
            { paddingBottom: Platform.OS === "web" ? 34 + 84 : 100 },
          ]}
          showsVerticalScrollIndicator={false}
          ListHeaderComponent={
            <View style={styles.popularHeader}>
              <Ionicons name="trending-up" size={18} color={Colors.accent} />
              <Text style={styles.popularTitle}>Popular Subjects</Text>
            </View>
          }
        />
      )}
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
  },
  headerTitle: {
    fontFamily: "Inter_700Bold",
    fontSize: 28,
    color: Colors.text,
    marginBottom: 14,
  },
  searchBar: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: Colors.card,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    gap: 10,
    borderWidth: 1,
    borderColor: Colors.cardBorder,
  },
  searchInput: {
    flex: 1,
    fontFamily: "Inter_400Regular",
    fontSize: 15,
    color: Colors.text,
    padding: 0,
  },
  listContent: {
    paddingHorizontal: 20,
    paddingTop: 16,
    gap: 8,
  },
  resultCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: Colors.card,
    borderRadius: 12,
    padding: 14,
    gap: 12,
    borderWidth: 1,
    borderColor: Colors.cardBorder,
  },
  resultBadge: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
  },
  resultBadgeText: {
    fontFamily: "Inter_700Bold",
    fontSize: 11,
    letterSpacing: 0.5,
  },
  resultInfo: {
    flex: 1,
  },
  resultName: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 14,
    color: Colors.text,
    marginBottom: 2,
  },
  resultMeta: {
    fontFamily: "Inter_400Regular",
    fontSize: 12,
    color: Colors.textSecondary,
  },
  resultRight: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  emptyState: {
    alignItems: "center",
    justifyContent: "center",
    paddingTop: 60,
    gap: 10,
  },
  emptyText: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 16,
    color: Colors.textSecondary,
  },
  emptySubtext: {
    fontFamily: "Inter_400Regular",
    fontSize: 13,
    color: Colors.textMuted,
  },
  popularHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 8,
  },
  popularTitle: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 16,
    color: Colors.text,
  },
});
