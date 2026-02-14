import { StyleSheet, Text, View, ScrollView, Pressable, Platform, ActivityIndicator } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useLocalSearchParams, router } from "expo-router";
import { useState, useMemo } from "react";
import { Feather, Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { useQuery } from "@tanstack/react-query";
import Colors from "@/constants/colors";
import type { Branch, Subject } from "@/lib/rgpv-data";
import { useBookmarks } from "@/lib/bookmarks";

function SemesterPill({ semester, isSelected, onPress }: { semester: number; isSelected: boolean; onPress: () => void }) {
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
        Sem {semester}
      </Text>
    </Pressable>
  );
}

function SubjectCard({ subject, branchColor }: { subject: Subject; branchColor: string }) {
  const { isBookmarked, toggleBookmark } = useBookmarks();
  const bookmarked = isBookmarked(subject.id);

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
            color={bookmarked ? Colors.primary : Colors.textMuted}
          />
        </Pressable>
      </View>
      <Text style={styles.subjectName}>{subject.name}</Text>
      <View style={styles.subjectBottom}>
        <Feather name="arrow-right" size={16} color={Colors.primary} />
      </View>
    </Pressable>
  );
}

export default function BranchScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const insets = useSafeAreaInsets();
  const webTopInset = Platform.OS === "web" ? 67 : 0;

  const { data: branch, isLoading: branchLoading } = useQuery<Branch>({
    queryKey: ["/api/branches", id],
  });

  const { data: allSubjects = [], isLoading: subjectsLoading } = useQuery<Subject[]>({
    queryKey: ["/api/subjects?branch=" + id],
  });

  const semesters = useMemo(() => {
    const sems = [...new Set(allSubjects.map(s => s.semester))].sort((a, b) => a - b);
    return sems.length > 0 ? sems : [3];
  }, [allSubjects]);

  const [selectedSem, setSelectedSem] = useState<number | null>(null);

  const currentSem = selectedSem ?? semesters[0] ?? 3;

  const filteredSubjects = useMemo(
    () => allSubjects.filter(s => s.semester === currentSem),
    [allSubjects, currentSem]
  );

  if (branchLoading) {
    return (
      <View style={[styles.container, { justifyContent: "center", alignItems: "center" }]}>
        <ActivityIndicator size="large" color={Colors.primary} />
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

  const handleSemSelect = (sem: number) => {
    if (Platform.OS !== "web") {
      Haptics.selectionAsync();
    }
    setSelectedSem(sem);
  };

  return (
    <View style={styles.container}>
      <View style={[styles.topBar, { paddingTop: (Platform.OS === "web" ? webTopInset : insets.top) + 8 }]}>
        <Pressable onPress={() => router.back()} hitSlop={12} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={22} color={Colors.text} />
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
      >
        {semesters.map(sem => (
          <SemesterPill
            key={sem}
            semester={sem}
            isSelected={sem === currentSem}
            onPress={() => handleSemSelect(sem)}
          />
        ))}
      </ScrollView>

      <ScrollView
        contentContainerStyle={[
          styles.scrollContent,
          { paddingBottom: Platform.OS === "web" ? 34 : insets.bottom + 20 },
        ]}
        showsVerticalScrollIndicator={false}
      >
        {subjectsLoading ? (
          <ActivityIndicator size="large" color={Colors.primary} style={{ marginTop: 40 }} />
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
            <Feather name="inbox" size={40} color={Colors.textMuted} />
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

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  topBar: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: Colors.cardBorder,
    gap: 8,
  },
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: Colors.card,
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
    color: Colors.text,
  },
  topBarSubtitle: {
    fontFamily: "Inter_400Regular",
    fontSize: 11,
    color: Colors.textSecondary,
  },
  semScroll: {
    flexGrow: 0,
    borderBottomWidth: 1,
    borderBottomColor: Colors.cardBorder,
  },
  semRow: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 8,
  },
  semPill: {
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 10,
    backgroundColor: Colors.card,
    borderWidth: 1,
    borderColor: Colors.cardBorder,
  },
  semPillActive: {
    backgroundColor: Colors.primary + '20',
    borderColor: Colors.primary,
  },
  semPillText: {
    fontFamily: "Inter_500Medium",
    fontSize: 13,
    color: Colors.textSecondary,
  },
  semPillTextActive: {
    color: Colors.primary,
    fontFamily: "Inter_600SemiBold",
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 16,
  },
  subjectList: {
    gap: 12,
  },
  subjectCard: {
    backgroundColor: Colors.card,
    borderRadius: 16,
    padding: 18,
    borderWidth: 1,
    borderColor: Colors.cardBorder,
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
    color: Colors.text,
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
  emptyTitle: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 16,
    color: Colors.textSecondary,
  },
  emptySubtext: {
    fontFamily: "Inter_400Regular",
    fontSize: 13,
    color: Colors.textMuted,
    textAlign: "center",
  },
  errorText: {
    fontFamily: "Inter_500Medium",
    fontSize: 16,
    color: Colors.danger,
    textAlign: "center",
    marginTop: 100,
  },
});
