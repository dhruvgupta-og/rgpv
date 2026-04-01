import { StyleSheet, Text, View, ScrollView, Pressable, Platform, ActivityIndicator, TextInput } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useLocalSearchParams, router } from "expo-router";
import { useState, useMemo } from "react";
import { Feather, Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { useQuery } from "@tanstack/react-query";
import type { Branch, Subject } from "@/lib/rgpv-data";
import { useBookmarks } from "@/lib/bookmarks";
import { useTheme } from "@/lib/theme";

function SemesterPill({ label, isSelected, onPress }: { label: string; isSelected: boolean; onPress: () => void }) {
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  return (
    <Pressable
      onPress={onPress}
      style={[
        styles.semPill,
        isSelected && styles.semPillActive,
      ]}
    >
      <Text style={[
        styles.semPillText,
        isSelected && styles.semPillTextActive,
      ]}>
        {label}
      </Text>
    </Pressable>
  );
}

function SubjectCard({ subject, branchColor }: { subject: Subject; branchColor: string }) {
  const { isBookmarked, toggleBookmark } = useBookmarks();
  const bookmarked = isBookmarked(subject.id);
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);

  const handlePress = () => {
    if (Platform.OS !== "web") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    router.push({ pathname: "/subject/[id]", params: { id: subject.id } });
  };

  const handleBookmark = () => {
    if (Platform.OS !== "web") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }
    toggleBookmark(subject.id);
  };

  return (
    <Pressable
      onPress={handlePress}
      style={({ pressed }) => [
        styles.subjectCard,
        { transform: [{ scale: pressed ? 0.98 : 1 }] },
      ]}
    >
      <View style={styles.subjectTop}>
        <View style={[styles.codeTag, { backgroundColor: branchColor + '18' }]}>
          <Text style={[styles.codeText, { color: branchColor }]}>{subject.code}</Text>
        </View>
        <Pressable onPress={handleBookmark} hitSlop={12}>
          <Ionicons
            name={bookmarked ? "bookmark" : "bookmark-outline"}
            size={20}
            color={bookmarked ? colors.primary : colors.textMuted}
          />
        </Pressable>
      </View>
      <Text style={styles.subjectName}>{subject.name}</Text>
      <View style={styles.subjectBottom}>
        <Feather name="arrow-right" size={16} color={colors.primary} />
      </View>
    </Pressable>
  );
}

export default function BranchScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const insets = useSafeAreaInsets();
  const webTopInset = Platform.OS === "web" ? 67 : 0;
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);

  const { data: branch, isLoading: branchLoading } = useQuery<Branch>({
    queryKey: ["/api/branches", id],
  });

  const { data: allSubjects = [], isLoading: subjectsLoading } = useQuery<Subject[]>({
    queryKey: ["/api/subjects?branch=" + id],
  });

  const [selectedSem, setSelectedSem] = useState<number | "all" | null>(null);
  const [query, setQuery] = useState("");

  const semesters = useMemo(() => {
    // Always show all 8 semesters for every branch
    return [1, 2, 3, 4, 5, 6, 7, 8];
  }, []);

  const currentSem = selectedSem ?? semesters[0] ?? 3;

  const filteredSubjects = useMemo(() => {
    const q = query.trim().toLowerCase();
    return allSubjects.filter(s => {
      const subjectSem =
        typeof s.semester === "string" ? Number.parseInt(s.semester, 10) : s.semester;
      if (currentSem !== "all" && subjectSem !== currentSem) return false;
      if (!q) return true;
      return s.name.toLowerCase().includes(q) || s.code.toLowerCase().includes(q);
    });
  }, [allSubjects, currentSem, query]);

  if (branchLoading) {
    return (
      <View style={[styles.container, { justifyContent: "center", alignItems: "center" }]}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={styles.loadingText}>Loading branch details...</Text>
      </View>
    );
  }

  if (!branch) {
    return (
      <View style={styles.container}>
        <Text style={styles.errorText}>Branch not found</Text>
      </View>
    );
  }

  const handleSemSelect = (sem: number | "all") => {
    if (Platform.OS !== "web") {
      Haptics.selectionAsync();
    }
    setSelectedSem(sem);
  };

  return (
    <View style={styles.container}>
      <View style={[styles.topBar, { paddingTop: (Platform.OS === "web" ? webTopInset : insets.top) + 8 }]}> 
        <Pressable onPress={() => router.back()} hitSlop={12} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={22} color={colors.text} />
        </Pressable>
        <View style={styles.topBarCenter}>
          <Text style={styles.topBarTitle}>{branch.shortName}</Text>
          <Text style={styles.topBarSubtitle} numberOfLines={1}>{branch.name}</Text>
        </View>
        <View style={{ width: 36 }} />
      </View>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.semRow}
        style={styles.semScroll}
        contentInsetAdjustmentBehavior="automatic"
      >
        {semesters.map(sem => (
          <SemesterPill
            key={sem}
            label={`Sem ${sem}`}
            isSelected={currentSem !== "all" && sem === currentSem}
            onPress={() => handleSemSelect(sem)}
          />
        ))}
        <SemesterPill
          key="all"
          label="All"
          isSelected={currentSem === "all"}
          onPress={() => handleSemSelect("all")}
        />
      </ScrollView>

      <View style={styles.searchBarWrap}>
        <View style={styles.searchBar}>
          <Ionicons name="search" size={16} color={colors.textMuted} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search subjects in this branch..."
            placeholderTextColor={colors.textMuted}
            value={query}
            onChangeText={setQuery}
            autoCorrect={false}
            autoCapitalize="none"
          />
          {query.length > 0 && (
            <Pressable onPress={() => setQuery("")}>
              <Ionicons name="close-circle" size={16} color={colors.textMuted} />
            </Pressable>
          )}
        </View>
      </View>

      <ScrollView
        contentContainerStyle={[
          styles.scrollContent,
          { paddingBottom: Platform.OS === "web" ? 34 : insets.bottom + 20 },
        ]}
        showsVerticalScrollIndicator={false}
      >
        {subjectsLoading ? (
          <View style={styles.loadingState}>
            <ActivityIndicator size="large" color={colors.primary} />
            <Text style={styles.loadingText}>Loading subjects for this branch...</Text>
          </View>
        ) : filteredSubjects.length > 0 ? (
          <View style={styles.subjectList}>
            {filteredSubjects.map(subject => (
              <SubjectCard
                key={subject.id}
                subject={subject}
                branchColor={branch.color}
              />
            ))}
          </View>
        ) : (
          <View style={styles.emptyState}>
            <Feather name="inbox" size={40} color={colors.textMuted} />
            <Text style={styles.emptyTitle}>No subjects available</Text>
            <Text style={styles.emptySubtext}>
              Subjects for this semester will be added soon
            </Text>
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const baseStyles = {
  container: {
    flex: 1,
  },
  topBar: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    gap: 8,
  },
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  topBarCenter: {
    flex: 1,
    alignItems: "center",
  },
  topBarTitle: {
    fontFamily: "Inter_700Bold",
    fontSize: 18,
  },
  topBarSubtitle: {
    fontFamily: "Inter_400Regular",
    fontSize: 11,
  },
  semScroll: {
    flexGrow: 0,
    borderBottomWidth: 1,
    minHeight: 70,
  },
  searchBarWrap: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  searchBar: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    gap: 8,
    borderWidth: 1,
  },
  searchInput: {
    flex: 1,
    fontFamily: "Inter_400Regular",
    fontSize: 14,
    padding: 0,
  },
  semRow: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 8,
    alignItems: "center",
  },
  semPill: {
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
    minWidth: 64,
    minHeight: 42,
  },
  semPillActive: {},
  semPillText: {
    fontFamily: "Inter_500Medium",
    fontSize: 13,
    textAlign: "center",
  },
  semPillTextActive: {
    fontFamily: "Inter_600SemiBold",
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 8,
  },
  subjectList: {
    gap: 12,
  },
  subjectCard: {
    borderRadius: 16,
    padding: 18,
    borderWidth: 1,
    gap: 10,
  },
  subjectTop: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  codeTag: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
  },
  codeText: {
    fontFamily: "Inter_700Bold",
    fontSize: 11,
    letterSpacing: 0.5,
  },
  subjectName: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 17,
    lineHeight: 22,
  },
  subjectBottom: {
    flexDirection: "row",
    alignItems: "center",
    gap: 16,
    marginTop: 2,
  },
  emptyState: {
    alignItems: "center",
    paddingTop: 80,
    gap: 10,
  },
  loadingState: {
    alignItems: "center",
    paddingTop: 60,
    gap: 12,
  },
  loadingText: {
    fontFamily: "Inter_500Medium",
    fontSize: 14,
    textAlign: "center",
    marginTop: 12,
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
  errorText: {
    fontFamily: "Inter_500Medium",
    fontSize: 16,
    textAlign: "center",
    marginTop: 100,
  },
};

function makeStyles(colors: ReturnType<typeof useTheme>["colors"]) {
  return StyleSheet.create({
    ...baseStyles,
    container: { ...baseStyles.container, backgroundColor: colors.background },
    topBar: { ...baseStyles.topBar, borderBottomColor: colors.cardBorder },
    backBtn: { ...baseStyles.backBtn, backgroundColor: colors.card },
    topBarTitle: { ...baseStyles.topBarTitle, color: colors.text },
    topBarSubtitle: { ...baseStyles.topBarSubtitle, color: colors.textSecondary },
    semScroll: { ...baseStyles.semScroll, borderBottomColor: colors.cardBorder },
    searchBarWrap: { ...baseStyles.searchBarWrap, borderBottomColor: colors.cardBorder },
    searchBar: { ...baseStyles.searchBar, backgroundColor: colors.card, borderColor: colors.cardBorder },
    searchInput: { ...baseStyles.searchInput, color: colors.text },
    semPill: { ...baseStyles.semPill, backgroundColor: colors.cardLight ?? colors.card, borderColor: colors.cardBorder },
    semPillActive: { ...baseStyles.semPillActive, backgroundColor: colors.primary + "20", borderColor: colors.primary },
    semPillText: { ...baseStyles.semPillText, color: colors.text },
    semPillTextActive: { ...baseStyles.semPillTextActive, color: colors.primary },
    subjectCard: { ...baseStyles.subjectCard, backgroundColor: colors.card, borderColor: colors.cardBorder },
    subjectName: { ...baseStyles.subjectName, color: colors.text },
    loadingText: { ...baseStyles.loadingText, color: colors.textSecondary },
    emptyTitle: { ...baseStyles.emptyTitle, color: colors.textSecondary },
    emptySubtext: { ...baseStyles.emptySubtext, color: colors.textMuted },
    errorText: { ...baseStyles.errorText, color: colors.danger },
  });
}
