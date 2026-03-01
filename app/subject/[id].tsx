import { StyleSheet, Text, View, ScrollView, Pressable, Platform, Alert, ActivityIndicator, Linking } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useLocalSearchParams, router } from "expo-router";
import { useEffect, useMemo, useState } from "react";
import { Feather, Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import Animated, { FadeInDown } from "react-native-reanimated";
import { useQuery } from "@tanstack/react-query";
import type { Branch, Subject, SyllabusUnit, Paper } from "@/lib/rgpv-data";
import { useBookmarks } from "@/lib/bookmarks";
import { getApiUrl, apiRequest } from "@/lib/query-client";
import { useTheme } from "@/lib/theme";
import { downloadPaper, isDownloaded, openDownload, shareDownload, type DownloadItem } from "@/lib/downloads";

type TabType = "syllabus" | "papers";

function SyllabusUnitCard({ unit, index }: { unit: SyllabusUnit; index: number }) {
  const [expanded, setExpanded] = useState(index === 0);
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);

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
          <Feather name={expanded ? "chevron-up" : "chevron-down"} size={18} color={colors.textMuted} />
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
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const isMain = paper.examType === "Main";
  const [downloaded, setDownloaded] = useState<DownloadItem | null>(null);
  const [downloading, setDownloading] = useState(false);

  useEffect(() => {
    if (!paper.pdfPath) return;
    isDownloaded(String(paper.id)).then(setDownloaded);
  }, [paper.id, paper.pdfPath]);

  const markView = () => {
    apiRequest("POST", `/api/papers/${paper.id}/view`).catch(() => {});
  };

  const handlePress = async () => {
    if (Platform.OS !== "web") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    if (downloaded) {
      await openDownload(downloaded);
      markView();
      return;
    }
    if (paper.pdfPath) {
      const pdfUrl = getApiUrl() + paper.pdfPath.replace(/^\//, '');
      Linking.openURL(pdfUrl);
      markView();
    } else {
      Alert.alert(
        `${subjectName}`,
        `${paper.month} ${paper.year} (${paper.examType} Exam)\n\nPaper PDF not uploaded yet. Stay tuned!`,
        [{ text: "OK" }]
      );
    }
  };

  const handleDownload = async () => {
    if (!paper.pdfPath || downloading) return;
    setDownloading(true);
    try {
      const pdfUrl = getApiUrl() + paper.pdfPath.replace(/^\//, '');
      const item = await downloadPaper({
        id: String(paper.id),
        subjectId: paper.subjectId,
        title: subjectName,
        year: paper.year,
        month: paper.month,
        examType: paper.examType,
        remoteUrl: pdfUrl,
      });
      setDownloaded(item);
    } finally {
      setDownloading(false);
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
        <View style={[styles.paperIcon, { backgroundColor: isMain ? colors.primary + '18' : colors.warning + '18' }]}>
          <Feather name="file-text" size={20} color={isMain ? colors.primary : colors.warning} />
        </View>
        <View style={styles.paperInfo}>
          <Text style={styles.paperTitle}>{paper.month} {paper.year}</Text>
          <View style={styles.paperMeta}>
            <View style={[styles.typeBadge, { backgroundColor: isMain ? colors.accent + '20' : colors.warning + '20' }]}>
              <Text style={[styles.typeText, { color: isMain ? colors.accent : colors.warning }]}>{paper.examType}</Text>
            </View>
            {paper.pdfPath ? (
              <View style={[styles.typeBadge, { backgroundColor: colors.accent + '20' }]}>
                <Text style={[styles.typeText, { color: colors.accent }]}>{downloaded ? "Saved" : "PDF"}</Text>
              </View>
            ) : null}
          </View>
        </View>
        <View style={styles.paperActions}>
          {Platform.OS === "android" && paper.pdfPath ? (
            <Pressable onPress={handleDownload} hitSlop={8} disabled={downloading}>
              <Feather name={downloaded ? "check-circle" : "download"} size={18} color={downloaded ? colors.success : colors.primary} />
            </Pressable>
          ) : null}
          {downloaded ? (
            <Pressable onPress={() => shareDownload(downloaded)} hitSlop={8}>
              <Feather name="share-2" size={18} color={colors.textMuted} />
            </Pressable>
          ) : null}
          <Feather name={paper.pdfPath ? "external-link" : "clock"} size={18} color={paper.pdfPath ? colors.textMuted : colors.textMuted} />
        </View>
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
  const [paperFilter, setPaperFilter] = useState<"All" | "Main" | "Supply" | "Back">("All");
  const webTopInset = Platform.OS === "web" ? 67 : 0;
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);

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
        <ActivityIndicator size="large" color={colors.primary} />
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
  const filteredPapers = paperFilter === "All"
    ? papers
    : papers.filter(p => p.examType === paperFilter);

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
          <Ionicons name="arrow-back" size={22} color={colors.text} />
        </Pressable>
        <View style={styles.topBarCenter}>
          <Text style={styles.topBarCode}>{subject.code}</Text>
        </View>
        <Pressable onPress={handleBookmark} hitSlop={12} style={styles.backBtn}>
          <Ionicons
            name={bookmarked ? "bookmark" : "bookmark-outline"}
            size={20}
            color={bookmarked ? colors.primary : colors.text}
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
            <View style={[styles.metaChip, { backgroundColor: (branch?.color || colors.primary) + '18' }]}>
              <Text style={[styles.metaChipText, { color: branch?.color || colors.primary }]}>
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
            <Feather name="layers" size={16} color={activeTab === "syllabus" ? colors.primary : colors.textMuted} />
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
            <Feather name="file-text" size={16} color={activeTab === "papers" ? colors.primary : colors.textMuted} />
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
                <Feather name="layers" size={40} color={colors.textMuted} />
                <Text style={styles.emptyTitle}>No syllabus available</Text>
                <Text style={styles.emptySubtext}>Syllabus will be added soon</Text>
              </View>
            )}
          </View>
        ) : (
          <View style={styles.contentList}>
            <View style={styles.filterRow}>
              {(["All", "Main", "Supply", "Back"] as const).map(type => (
                <Pressable
                  key={type}
                  onPress={() => {
                    if (Platform.OS !== "web") Haptics.selectionAsync();
                    setPaperFilter(type);
                  }}
                  style={[
                    styles.filterChip,
                    paperFilter === type && styles.filterChipActive,
                  ]}
                >
                  <Text
                    style={[
                      styles.filterText,
                      paperFilter === type && styles.filterTextActive,
                    ]}
                  >
                    {type}
                  </Text>
                </Pressable>
              ))}
            </View>
            {filteredPapers.length > 0 ? (
              filteredPapers.map((paper, i) => (
                <PaperCard key={paper.id} paper={paper} index={i} subjectName={subject.name} />
              ))
            ) : (
              <View style={styles.emptyPapers}>
                <MaterialCommunityIcons name="file-search-outline" size={40} color={colors.textMuted} />
                <Text style={styles.emptyTitle}>No papers available</Text>
                <Text style={styles.emptySubtext}>Try a different filter or check back soon</Text>
              </View>
            )}
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
  topBarCode: {
    fontFamily: "Inter_700Bold",
    fontSize: 16,
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
  },
  metaChipText: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 12,
  },
  metaChipTextMuted: {
    fontFamily: "Inter_500Medium",
    fontSize: 12,
  },
  tabBar: {
    flexDirection: "row",
    borderRadius: 12,
    padding: 4,
    marginBottom: 20,
    borderWidth: 1,
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
  tabActive: {},
  tabText: {
    fontFamily: "Inter_500Medium",
    fontSize: 14,
  },
  tabTextActive: {
    fontFamily: "Inter_600SemiBold",
  },
  contentList: {
    gap: 10,
  },
  filterRow: {
    flexDirection: "row",
    gap: 8,
    marginBottom: 6,
    flexWrap: "wrap",
  },
  filterChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
    borderWidth: 1,
  },
  filterChipActive: {},
  filterText: {
    fontFamily: "Inter_500Medium",
    fontSize: 12,
  },
  filterTextActive: {
    fontFamily: "Inter_600SemiBold",
  },
  unitCard: {
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
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
    alignItems: "center",
    justifyContent: "center",
  },
  unitBadgeText: {
    fontFamily: "Inter_700Bold",
    fontSize: 14,
  },
  unitTitle: {
    flex: 1,
    fontFamily: "Inter_600SemiBold",
    fontSize: 15,
  },
  topicsList: {
    marginTop: 14,
    paddingTop: 14,
    borderTopWidth: 1,
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
    marginTop: 6,
  },
  topicText: {
    flex: 1,
    fontFamily: "Inter_400Regular",
    fontSize: 14,
    lineHeight: 20,
  },
  paperCard: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 14,
    padding: 16,
    gap: 14,
    borderWidth: 1,
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
  paperActions: {
    alignItems: "center",
    gap: 10,
  },
  paperTitle: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 15,
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
  },
  emptySubtext: {
    fontFamily: "Inter_400Regular",
    fontSize: 13,
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
    topBarCode: { ...baseStyles.topBarCode, color: colors.text },
    subjectName: { ...baseStyles.subjectName, color: colors.text },
    metaChip: { ...baseStyles.metaChip, backgroundColor: colors.card },
    metaChipTextMuted: { ...baseStyles.metaChipTextMuted, color: colors.textSecondary },
    tabBar: { ...baseStyles.tabBar, backgroundColor: colors.card, borderColor: colors.cardBorder },
    tabActive: { ...baseStyles.tabActive, backgroundColor: colors.primary + "18" },
    tabText: { ...baseStyles.tabText, color: colors.textMuted },
    tabTextActive: { ...baseStyles.tabTextActive, color: colors.primary },
    filterChip: { ...baseStyles.filterChip, backgroundColor: colors.card, borderColor: colors.cardBorder },
    filterChipActive: { ...baseStyles.filterChipActive, borderColor: colors.primary, backgroundColor: colors.primary + "18" },
    filterText: { ...baseStyles.filterText, color: colors.textMuted },
    filterTextActive: { ...baseStyles.filterTextActive, color: colors.primary },
    unitCard: { ...baseStyles.unitCard, backgroundColor: colors.card, borderColor: colors.cardBorder },
    unitBadge: { ...baseStyles.unitBadge, backgroundColor: colors.primary + "20" },
    unitBadgeText: { ...baseStyles.unitBadgeText, color: colors.primary },
    unitTitle: { ...baseStyles.unitTitle, color: colors.text },
    topicsList: { ...baseStyles.topicsList, borderTopColor: colors.cardBorder },
    topicDot: { ...baseStyles.topicDot, backgroundColor: colors.primary },
    topicText: { ...baseStyles.topicText, color: colors.textSecondary },
    paperCard: { ...baseStyles.paperCard, backgroundColor: colors.card, borderColor: colors.cardBorder },
    paperTitle: { ...baseStyles.paperTitle, color: colors.text },
    emptyTitle: { ...baseStyles.emptyTitle, color: colors.textSecondary },
    emptySubtext: { ...baseStyles.emptySubtext, color: colors.textMuted },
    errorText: { ...baseStyles.errorText, color: colors.danger },
  });
}

