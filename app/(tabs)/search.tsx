import { StyleSheet, Text, View, TextInput, FlatList, Pressable, Platform, ActivityIndicator } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useState, useMemo } from "react";
import { router } from "expo-router";
import { Ionicons, Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { useQuery } from "@tanstack/react-query";
import type { Subject, Branch } from "@/lib/rgpv-data";
import { useBookmarks } from "@/lib/bookmarks";
import { useTheme } from "@/lib/theme";

function SubjectResultItem({ subject, branches }: { subject: Subject; branches: Branch[] }) {
  const branch = branches.find(b => b.id === subject.branchId);
  const { isBookmarked } = useBookmarks();
  const bookmarked = isBookmarked(subject.id);
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);

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
      <View style={[styles.resultBadge, { backgroundColor: (branch?.color || colors.primary) + '18' }]}>
        <Text style={[styles.resultBadgeText, { color: branch?.color || colors.primary }]}>
          {branch?.shortName || subject.branchId?.toUpperCase()}
        </Text>
      </View>
      <View style={styles.resultInfo}>
        <Text style={styles.resultName} numberOfLines={1}>{subject.name}</Text>
        <Text style={styles.resultMeta}>{subject.code} | Sem {subject.semester}</Text>
      </View>
      <View style={styles.resultRight}>
        {bookmarked && <Ionicons name="bookmark" size={14} color={colors.primary} />}
        <Feather name="chevron-right" size={16} color={colors.textMuted} />
      </View>
    </Pressable>
  );
}

export default function SearchScreen() {
  const insets = useSafeAreaInsets();
  const [query, setQuery] = useState("");
  const webTopInset = Platform.OS === "web" ? 67 : 0;
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);

  const { data: allSubjects = [], isLoading: subjectsLoading } = useQuery<Subject[]>({
    queryKey: ["/api/subjects"],
  });

  const { data: branches = [], isLoading: branchesLoading } = useQuery<Branch[]>({
    queryKey: ["/api/branches"],
  });


  const results = useMemo(() => {
    if (!query.trim()) return [];
    const q = query.toLowerCase();
    return allSubjects.filter(s => (
      s.name.toLowerCase().includes(q) ||
      s.code.toLowerCase().includes(q) ||
      s.branchId?.toLowerCase().includes(q)
    ));
  }, [query, allSubjects]);

  const popularSubjects = useMemo(() => {
    return allSubjects.slice(0, 5);
  }, [allSubjects]);

  return (
    <View style={styles.container}>
      <View style={[styles.header, { paddingTop: (Platform.OS === "web" ? webTopInset : insets.top) + 12 }]}>
        <Text style={styles.headerTitle}>Search</Text>
        <View style={styles.searchBar}>
          <Ionicons name="search" size={18} color={colors.textMuted} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search subjects, codes..."
            placeholderTextColor={colors.textMuted}
            value={query}
            onChangeText={setQuery}
            autoCorrect={false}
            autoCapitalize="none"
          />
          {query.length > 0 && (
            <Pressable onPress={() => setQuery("")}>
              <Ionicons name="close-circle" size={18} color={colors.textMuted} />
            </Pressable>
          )}
        </View>
      </View>

      {subjectsLoading || branchesLoading ? (
        <View style={styles.loadingState}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles.loadingText}>
            {branchesLoading ? "Loading branches and subjects..." : "Loading subjects..."}
          </Text>
        </View>
      ) : query.trim() ? (
        <FlatList
          data={results}
          keyExtractor={item => item.id}
          renderItem={({ item }) => <SubjectResultItem subject={item} branches={branches} />}
          contentContainerStyle={[
            styles.listContent,
            { paddingBottom: Platform.OS === "web" ? 34 + 84 : 100 },
          ]}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <Ionicons name="search-outline" size={48} color={colors.textMuted} />
              <Text style={styles.emptyText}>No subjects found</Text>
              <Text style={styles.emptySubtext}>Try a different search term</Text>
            </View>
          }
        />
      ) : (
        <FlatList
          data={popularSubjects}
          keyExtractor={item => item.id}
          renderItem={({ item }) => <SubjectResultItem subject={item} branches={branches} />}
          contentContainerStyle={[
            styles.listContent,
            { paddingBottom: Platform.OS === "web" ? 34 + 84 : 100 },
          ]}
          showsVerticalScrollIndicator={false}
          ListHeaderComponent={
            <View style={styles.popularHeader}>
              <Ionicons name="trending-up" size={18} color={colors.accent} />
              <Text style={styles.popularTitle}>Popular Subjects</Text>
            </View>
          }
        />
      )}
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
    fontSize: 28,
    marginBottom: 14,
  },
  searchBar: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    gap: 10,
    borderWidth: 1,
  },
  searchInput: {
    flex: 1,
    fontFamily: "Inter_400Regular",
    fontSize: 15,
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
    borderRadius: 12,
    padding: 14,
    gap: 12,
    borderWidth: 1,
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
    marginBottom: 2,
  },
  resultMeta: {
    fontFamily: "Inter_400Regular",
    fontSize: 12,
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
  loadingState: {
    alignItems: "center",
    justifyContent: "center",
    paddingTop: 60,
    gap: 12,
  },
  loadingText: {
    fontFamily: "Inter_500Medium",
    fontSize: 14,
  },
  emptyText: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 16,
  },
  emptySubtext: {
    fontFamily: "Inter_400Regular",
    fontSize: 13,
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
  },
};

function makeStyles(colors: ReturnType<typeof useTheme>["colors"]) {
  return StyleSheet.create({
    ...baseStyles,
    container: { ...baseStyles.container, backgroundColor: colors.background },
    header: { ...baseStyles.header, borderBottomColor: colors.cardBorder },
    headerTitle: { ...baseStyles.headerTitle, color: colors.text },
    searchBar: { ...baseStyles.searchBar, backgroundColor: colors.card, borderColor: colors.cardBorder },
    searchInput: { ...baseStyles.searchInput, color: colors.text },
    resultCard: { ...baseStyles.resultCard, backgroundColor: colors.card, borderColor: colors.cardBorder },
    resultName: { ...baseStyles.resultName, color: colors.text },
    resultMeta: { ...baseStyles.resultMeta, color: colors.textSecondary },
    emptyText: { ...baseStyles.emptyText, color: colors.textSecondary },
    emptySubtext: { ...baseStyles.emptySubtext, color: colors.textMuted },
    popularTitle: { ...baseStyles.popularTitle, color: colors.text },
    loadingText: { ...baseStyles.loadingText, color: colors.textSecondary },
  });
}
