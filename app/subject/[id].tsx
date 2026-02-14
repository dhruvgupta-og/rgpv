import { StyleSheet, Text, View, ScrollView, Pressable, Platform, Alert, ActivityIndicator, Linking } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useLocalSearchParams, router } from "expo-router";
import { useState } from "react";
import { Feather, Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import Animated, { FadeInDown } from "react-native-reanimated";
import { useQuery } from "@tanstack/react-query";
import Colors from "@/constants/colors";
import type { Branch, Subject, SyllabusUnit, Paper } from "@/lib/rgpv-data";
import { useBookmarks } from "@/lib/bookmarks";
import { getApiUrl } from "@/lib/query-client";

type TabType = "syllabus" | "papers";

function SyllabusUnitCard({ unit, index }: { unit: SyllabusUnit; index: number }) {
  const [expanded, setExpanded] = useState(index === 0);

  return (
    <Animated.View entering={FadeInDown.delay(index * 60).duration(400)}>
      <Pressable
        onPress={() => {
          if (Platform.OS !== "web") Haptics.selectionAsync();
          setExpanded(!expanded);
        }}
        style={styles.unitCard}
      >
        <View style={styles.unitHeader}>
          <View style={styles.unitBadge}>
            <Text style={styles.unitBadgeText}>{unit.unitNumber}</Text>
          </View>
          <Text style={styles.unitTitle}>{unit.title}</Text>
          <Feather name={expanded ? "chevron-up" : "chevron-down"} size={18} color={Colors.textMuted} />
        </View>
        {expanded && (
          <View style={styles.topicsList}>
            {(unit.topics || []).map((topic, i) => (
              <View key={i} style={styles.topicRow}>
                <View style={styles.topicDot} />
                <Text style={styles.topicText}>{topic}</Text>
              </View>
            ))}
          </View>
        )}
      </Pressable>
    </Animated.View>
  );
}

function PaperCard({ paper, index, subjectName }: { paper: Paper; index: number; subjectName: string }) {
  const isMain = paper.examType === "Main";

  const handlePress = () => {
    if (Platform.OS !== "web") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    if (paper.pdfPath) {
      const pdfUrl = getApiUrl() + paper.pdfPath.replace(/^\//, '');
      Linking.openURL(pdfUrl);
    } else {
      Alert.alert(
        `${subjectName}`,
        `${paper.month} ${paper.year} (${paper.examType} Exam)\n\nPaper PDF not uploaded yet. Stay tuned!`,
        [{ text: "OK" }]
      );
    }
  };

  return (
    <Animated.View entering={FadeInDown.delay(index * 60).duration(400)}>
      <Pressable
        onPress={handlePress}
        style={({ pressed }) => [
          styles.paperCard,
          { transform: [{ scale: pressed ? 0.98 : 1 }] },
        ]}
      >
        <View style={[styles.paperIcon, { backgroundColor: isMain ? Colors.primary + '18' : Colors.warning + '18' }]}>
          <Feather name="file-text" size={20} color={isMain ? Colors.primary : Colors.warning} />
        </View>
        <View style={styles.paperInfo}>
          <Text style={styles.paperTitle}>{paper.month} {paper.year}</Text>
          <View style={styles.paperMeta}>
            <View style={[styles.typeBadge, { backgroundColor: isMain ? Colors.accent + '20' : Colors.warning + '20' }]}>
              <Text style={[styles.typeText, { color: isMain ? Colors.accent : Colors.warning }]}>{paper.examType}</Text>
            </View>
            {paper.pdfPath ? (
              <View style={[styles.typeBadge, { backgroundColor: Colors.accent + '20' }]}>
                <Text style={[styles.typeText, { color: Colors.accent }]}>PDF</Text>
              </View>
            ) : null}
          </View>
        </View>
        <Feather name={paper.pdfPath ? "download" : "clock"} size={18} color={paper.pdfPath ? Colors.primary : Colors.textMuted} />
      </Pressable>
    </Animated.View>
  );
}

interface SubjectDetail extends Subject {
  syllabus: SyllabusUnit[];
  papers: Paper[];
}

export default function SubjectScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const insets = useSafeAreaInsets();
  const { isBookmarked, toggleBookmark } = useBookmarks();
  const [activeTab, setActiveTab] = useState<TabType>("syllabus");
  const webTopInset = Platform.OS === "web" ? 67 : 0;

  const { data: subject, isLoading } = useQuery<SubjectDetail>({
    queryKey: ["/api/subjects", id],
  });

  const { data: branch } = useQuery<Branch>({
    queryKey: ["/api/branches", subject?.branchId],
    enabled: !!subject?.branchId,
  });

  if (isLoading) {
    return (
      <View style={[styles.container, { justifyContent: "center", alignItems: "center" }]}>
        <ActivityIndicator size="large" color={Colors.primary} />
      </View>
    );
  }

  if (!subject) {
    return (
      <View style={styles.container}>
        <Text style={styles.errorText}>Subject not found</Text>
      </View>
    );
  }

  const bookmarked = isBookmarked(subject.id);
  const syllabus = subject.syllabus || [];
  const papers = subject.papers || [];

  const handleBookmark = () => {
    if (Platform.OS !== "web") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }
    toggleBookmark(subject.id);
  };

  return (
    <View style={styles.container}>
      <View style={[styles.topBar, { paddingTop: (Platform.OS === "web" ? webTopInset : insets.top) + 8 }]}>
        <Pressable onPress={() => router.back()} hitSlop={12} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={22} color={Colors.text} />
        </Pressable>
        <View style={styles.topBarCenter}>
          <Text style={styles.topBarCode}>{subject.code}</Text>
        </View>
        <Pressable onPress={handleBookmark} hitSlop={12} style={styles.backBtn}>
          <Ionicons
            name={bookmarked ? "bookmark" : "bookmark-outline"}
            size={20}
            color={bookmarked ? Colors.primary : Colors.text}
          />
        </Pressable>
      </View>

      <ScrollView
        contentContainerStyle={[
          styles.scrollContent,
          { paddingBottom: Platform.OS === "web" ? 34 : insets.bottom + 20 },
        ]}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.subjectHeader}>
          <Text style={styles.subjectName}>{subject.name}</Text>
          <View style={styles.metaRow}>
            <View style={[styles.metaChip, { backgroundColor: (branch?.color || Colors.primary) + '18' }]}>
              <Text style={[styles.metaChipText, { color: branch?.color || Colors.primary }]}>
                {branch?.shortName || subject.branchId?.toUpperCase()}
              </Text>
            </View>
            <View style={styles.metaChip}>
              <Text style={styles.metaChipTextMuted}>Semester {subject.semester}</Text>
            </View>
          </View>
        </View>

        <View style={styles.tabBar}>
          <Pressable
            onPress={() => {
              if (Platform.OS !== "web") Haptics.selectionAsync();
              setActiveTab("syllabus");
            }}
            style={[styles.tab, activeTab === "syllabus" && styles.tabActive]}
          >
            <Feather name="layers" size={16} color={activeTab === "syllabus" ? Colors.primary : Colors.textMuted} />
            <Text style={[styles.tabText, activeTab === "syllabus" && styles.tabTextActive]}>
              Syllabus
            </Text>
          </Pressable>
          <Pressable
            onPress={() => {
              if (Platform.OS !== "web") Haptics.selectionAsync();
              setActiveTab("papers");
            }}
            style={[styles.tab, activeTab === "papers" && styles.tabActive]}
          >
            <Feather name="file-text" size={16} color={activeTab === "papers" ? Colors.primary : Colors.textMuted} />
            <Text style={[styles.tabText, activeTab === "papers" && styles.tabTextActive]}>
              Papers ({papers.length})
            </Text>
          </Pressable>
        </View>

        {activeTab === "syllabus" ? (
          <View style={styles.contentList}>
            {syllabus.length > 0 ? (
              syllabus.map((unit, i) => (
                <SyllabusUnitCard key={unit.id || i} unit={unit} index={i} />
              ))
            ) : (
              <View style={styles.emptyPapers}>
                <Feather name="layers" size={40} color={Colors.textMuted} />
                <Text style={styles.emptyTitle}>No syllabus available</Text>
                <Text style={styles.emptySubtext}>Syllabus will be added soon</Text>
              </View>
            )}
          </View>
        ) : (
          <View style={styles.contentList}>
            {papers.length > 0 ? (
              papers.map((paper, i) => (
                <PaperCard key={paper.id} paper={paper} index={i} subjectName={subject.name} />
              ))
            ) : (
              <View style={styles.emptyPapers}>
                <MaterialCommunityIcons name="file-search-outline" size={40} color={Colors.textMuted} />
                <Text style={styles.emptyTitle}>No papers available</Text>
                <Text style={styles.emptySubtext}>Papers will be uploaded soon</Text>
              </View>
            )}
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
  topBarCode: {
    fontFamily: "Inter_700Bold",
    fontSize: 16,
    color: Colors.text,
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 20,
  },
  subjectHeader: {
    marginBottom: 24,
  },
  subjectName: {
    fontFamily: "Inter_700Bold",
    fontSize: 24,
    color: Colors.text,
    lineHeight: 30,
    marginBottom: 12,
  },
  metaRow: {
    flexDirection: "row",
    gap: 8,
  },
  metaChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: Colors.card,
  },
  metaChipText: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 12,
  },
  metaChipTextMuted: {
    fontFamily: "Inter_500Medium",
    fontSize: 12,
    color: Colors.textSecondary,
  },
  tabBar: {
    flexDirection: "row",
    backgroundColor: Colors.card,
    borderRadius: 12,
    padding: 4,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: Colors.cardBorder,
  },
  tab: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 12,
    borderRadius: 10,
    gap: 6,
  },
  tabActive: {
    backgroundColor: Colors.primary + '18',
  },
  tabText: {
    fontFamily: "Inter_500Medium",
    fontSize: 14,
    color: Colors.textMuted,
  },
  tabTextActive: {
    color: Colors.primary,
    fontFamily: "Inter_600SemiBold",
  },
  contentList: {
    gap: 10,
  },
  unitCard: {
    backgroundColor: Colors.card,
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: Colors.cardBorder,
  },
  unitHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  unitBadge: {
    width: 32,
    height: 32,
    borderRadius: 10,
    backgroundColor: Colors.primary + '20',
    alignItems: "center",
    justifyContent: "center",
  },
  unitBadgeText: {
    fontFamily: "Inter_700Bold",
    fontSize: 14,
    color: Colors.primary,
  },
  unitTitle: {
    flex: 1,
    fontFamily: "Inter_600SemiBold",
    fontSize: 15,
    color: Colors.text,
  },
  topicsList: {
    marginTop: 14,
    paddingTop: 14,
    borderTopWidth: 1,
    borderTopColor: Colors.cardBorder,
    gap: 10,
  },
  topicRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
    paddingLeft: 4,
  },
  topicDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: Colors.primary,
    marginTop: 6,
  },
  topicText: {
    flex: 1,
    fontFamily: "Inter_400Regular",
    fontSize: 14,
    color: Colors.textSecondary,
    lineHeight: 20,
  },
  paperCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: Colors.card,
    borderRadius: 14,
    padding: 16,
    gap: 14,
    borderWidth: 1,
    borderColor: Colors.cardBorder,
  },
  paperIcon: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  paperInfo: {
    flex: 1,
    gap: 6,
  },
  paperTitle: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 15,
    color: Colors.text,
  },
  paperMeta: {
    flexDirection: "row",
    gap: 8,
  },
  typeBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  typeText: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 11,
  },
  emptyPapers: {
    alignItems: "center",
    paddingTop: 40,
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
  },
  errorText: {
    fontFamily: "Inter_500Medium",
    fontSize: 16,
    color: Colors.danger,
    textAlign: "center",
    marginTop: 100,
  },
});
