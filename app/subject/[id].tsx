import { StyleSheet, Text, View, ScrollView, Pressable, Platform, Alert, ActivityIndicator } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useLocalSearchParams, router } from "expo-router";
import { useEffect, useMemo, useState } from "react";
import { Feather, Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import Animated, { FadeInDown } from "react-native-reanimated";
import { useQuery } from "@tanstack/react-query";
import type { Branch, Subject, SyllabusUnit, Paper, Video, PyqAnalytics } from "@/lib/rgpv-data";
import { useBookmarks } from "@/lib/bookmarks";
import { getApiUrl, apiRequest } from "@/lib/query-client";
import { getViewerUrl } from "@/lib/pdf-viewer";
import { useTheme } from "@/lib/theme";
import { downloadPaper, isDownloaded, type DownloadItem } from "@/lib/downloads";
import { ensureProfileComplete } from "@/lib/profile-guard";

type TabType = "syllabus" | "papers" | "videos" | "analyzer";

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
  const hasPdf = !!paper.pdfPath;
  const [downloaded, setDownloaded] = useState<DownloadItem | null>(null);
  const [downloading, setDownloading] = useState(false);

  useEffect(() => {
    if (!paper.pdfPath) return;
    isDownloaded(String(paper.id)).then(setDownloaded);
  }, [paper.id, paper.pdfPath]);

  const markView = () => {
    apiRequest("POST", `/api/papers/${paper.id}/view`).catch(() => {});
  };

  const getPdfUrl = () => {
    if (!paper.pdfPath) return "";
    return paper.pdfPath.startsWith("http")
      ? paper.pdfPath
      : getApiUrl() + paper.pdfPath.replace(/^\//, "");
  };

  const handlePress = async () => {
    if (Platform.OS !== "web") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    const ok = await ensureProfileComplete(() => router.replace("/profile"));
    if (!ok) return;
    if (downloaded) {
      router.push({
        pathname: "/pdf-viewer",
        params: {
          url: encodeURIComponent(
            downloaded.storageType === "remote"
              ? getViewerUrl(downloaded.remoteUrl)
              : downloaded.localUri
          ),
          title: encodeURIComponent(`${downloaded.title} • ${downloaded.month} ${downloaded.year}`),
          local: downloaded.storageType === "remote" ? "0" : "1",
        },
      });
      markView();
      return;
    }
    if (paper.pdfPath) {
      const pdfUrl = getPdfUrl();
      router.push({ pathname: "/pdf-viewer", params: { url: encodeURIComponent(getViewerUrl(pdfUrl)) } });
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
    const ok = await ensureProfileComplete(() => router.replace("/profile"));
    if (!ok) return;
    setDownloading(true);
    try {
      const pdfUrl = getPdfUrl();
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

  const handleDownloadButton = async () => {
    if (!hasPdf) return;
    await handleDownload();
  };

  const actionLabel = !hasPdf
    ? "Uploading Soon"
    : downloaded
      ? "Downloaded"
      : downloading
        ? "Downloading..."
        : "Download PDF";

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
            {hasPdf ? (
              <View style={[styles.typeBadge, { backgroundColor: colors.accent + '20' }]}>
                <Text style={[styles.typeText, { color: colors.accent }]}>{downloaded ? "Saved" : "PDF"}</Text>
              </View>
            ) : (
              <View style={[styles.typeBadge, { backgroundColor: colors.warning + '20' }]}>
                <Text style={[styles.typeText, { color: colors.warning }]}>Soon</Text>
              </View>
            )}
          </View>
        </View>
        <View style={styles.paperActions}>
          <Pressable
            onPress={(event) => {
              event.stopPropagation?.();
              handleDownloadButton();
            }}
            disabled={!hasPdf || downloading}
            style={[
              styles.paperActionBtn,
              !hasPdf && styles.paperActionBtnDisabled,
              downloaded && styles.paperActionBtnSuccess,
            ]}
          >
            <Feather
              name={!hasPdf ? "clock" : downloaded ? "check-circle" : Platform.OS === "web" ? "eye" : "download"}
              size={14}
              color={!hasPdf ? colors.textMuted : downloaded ? colors.success : colors.primary}
            />
            <Text
              style={[
                styles.paperActionBtnText,
                !hasPdf && styles.paperActionBtnTextDisabled,
                downloaded && styles.paperActionBtnTextSuccess,
              ]}
            >
              {actionLabel}
            </Text>
          </Pressable>
          <Feather name={hasPdf ? "eye" : "clock"} size={18} color={colors.textMuted} />
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
  const [checkingAccess, setCheckingAccess] = useState(true);
  const [hasAccess, setHasAccess] = useState(false);
  const webTopInset = Platform.OS === "web" ? 67 : 0;
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);

  const { data: subject, isLoading } = useQuery<SubjectDetail>({
    queryKey: ["/api/subjects", id],
  });

  const { data: videos = [] } = useQuery<Video[]>({
    queryKey: ["/api/subjects/" + id + "/videos"],
    enabled: !!id,
  });

  const { data: analytics } = useQuery<PyqAnalytics | null>({
    queryKey: ["/api/subjects/" + id + "/analytics"],
    enabled: !!id,
  });
  const [expandedUnitIndex, setExpandedUnitIndex] = useState<number | null>(0);

  const { data: branch } = useQuery<Branch>({
    queryKey: ["/api/branches", subject?.branchId],
    enabled: !!subject?.branchId,
  });

  useEffect(() => {
    let active = true;

    ensureProfileComplete(() => router.replace("/profile"))
      .then((ok) => {
        if (!active) return;
        setHasAccess(ok);
        setCheckingAccess(false);
      })
      .catch(() => {
        if (!active) return;
        setHasAccess(false);
        setCheckingAccess(false);
      });

    return () => {
      active = false;
    };
  }, []);

  if (checkingAccess) {
    return (
      <View style={[styles.container, { justifyContent: "center", alignItems: "center" }]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  if (!hasAccess) {
    return null;
  }

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
          <Pressable
            onPress={() => {
              if (Platform.OS !== "web") Haptics.selectionAsync();
              setActiveTab("videos");
            }}
            style={[styles.tab, activeTab === "videos" && styles.tabActive]}
          >
            <Feather name="video" size={16} color={activeTab === "videos" ? colors.primary : colors.textMuted} />
            <Text style={[styles.tabText, activeTab === "videos" && styles.tabTextActive]}>
              Videos ({videos.length})
            </Text>
          </Pressable>
          <Pressable
            onPress={() => {
              if (Platform.OS !== "web") Haptics.selectionAsync();
              setActiveTab("analyzer");
            }}
            style={[styles.tab, activeTab === "analyzer" && styles.tabActive]}
          >
            <Feather name="bar-chart-2" size={16} color={activeTab === "analyzer" ? colors.primary : colors.textMuted} />
            <Text style={[styles.tabText, activeTab === "analyzer" && styles.tabTextActive]}>
              Analyzer
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
        ) : activeTab === "papers" ? (
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
        ) : activeTab === "videos" ? (
          <View style={styles.contentList}>
            {videos.length > 0 ? (
              videos.map((video, i) => (
                <Animated.View key={video.id} entering={FadeInDown.delay(i * 60).duration(400)}>
                  <Pressable
                    onPress={async () => {
                      const ok = await ensureProfileComplete(() => router.replace("/profile"));
                      if (!ok) return;
                      Linking.openURL(video.url);
                    }}
                    style={({ pressed }) => [
                      styles.videoCard,
                      { transform: [{ scale: pressed ? 0.98 : 1 }] },
                    ]}
                  >
                    <View style={styles.videoIcon}>
                      <Feather name="play-circle" size={20} color={colors.primary} />
                    </View>
                    <View style={styles.videoInfo}>
                      <Text style={styles.videoTitle}>{video.title}</Text>
                      <Text style={styles.videoUrl} numberOfLines={1}>{video.url}</Text>
                    </View>
                    <Feather name="external-link" size={18} color={colors.textMuted} />
                  </Pressable>
                </Animated.View>
              ))
            ) : (
              <View style={styles.emptyPapers}>
                <Feather name="video" size={40} color={colors.textMuted} />
                <Text style={styles.emptyTitle}>No videos available</Text>
                <Text style={styles.emptySubtext}>Video links will be added soon</Text>
              </View>
            )}
          </View>
        ) : (
          <View style={styles.contentList}>
            {analytics && (analytics.units || []).length > 0 ? (
              <>
                {analytics.units!.map((u, i) => {
                  const expanded = expandedUnitIndex === i;
                  return (
                    <View key={`${u.unit}-${i}`} style={styles.analyticsCard}>
                      <Pressable
                        onPress={() => setExpandedUnitIndex(expanded ? null : i)}
                        style={styles.unitHeaderRow}
                      >
                        <View>
                          <Text style={styles.analyticsTitle}>{u.unit}</Text>
                          <Text style={styles.unitWeightage}>
                            {typeof u.percentage === "number" ? `${u.percentage}% weightage` : "Weightage not set"}
                          </Text>
                        </View>
                        <Feather name={expanded ? "chevron-up" : "chevron-down"} size={18} color={colors.textMuted} />
                      </Pressable>

                      {expanded ? (
                        <View style={styles.unitDetails}>
                          <Text style={styles.sectionLabel}>Topics</Text>
                          {(u.topics || []).length ? (
                            u.topics!.map((t, idx) => (
                              <Text key={`${t}-${idx}`} style={styles.analyticsBullet}>• {t}</Text>
                            ))
                          ) : (
                            <Text style={styles.analyticsEmpty}>No topics for this unit</Text>
                          )}

                          <Text style={styles.sectionLabel}>Most Repeated Questions</Text>
                          {(u.repeated || []).length ? (
                            u.repeated!.map((q, idx) => (
                              <Text key={`${q}-${idx}`} style={styles.analyticsBullet}>• {q}</Text>
                            ))
                          ) : (
                            <Text style={styles.analyticsEmpty}>No repeated questions for this unit</Text>
                          )}

                          <Text style={styles.sectionLabel}>5-Year Trend</Text>
                          {(u.trend || []).length ? (
                            u.trend!.map((y, idx) => (
                              <View key={`${y.year}-${idx}`} style={styles.analyticsRow}>
                                <Text style={styles.analyticsLabel}>{y.year}</Text>
                                <Text style={styles.analyticsValue}>{y.count} questions</Text>
                              </View>
                            ))
                          ) : (
                            <Text style={styles.analyticsEmpty}>No trend data for this unit</Text>
                          )}
                        </View>
                      ) : null}
                    </View>
                  );
                })}
              </>
            ) : (
              <View style={styles.emptyPapers}>
                <Feather name="bar-chart-2" size={40} color={colors.textMuted} />
                <Text style={styles.emptyTitle}>No analysis available</Text>
                <Text style={styles.emptySubtext}>Add analysis in admin panel</Text>
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
  videoCard: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 14,
    padding: 16,
    gap: 14,
    borderWidth: 1,
  },
  videoIcon: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  videoInfo: {
    flex: 1,
    gap: 4,
  },
  videoTitle: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 15,
  },
  videoUrl: {
    fontFamily: "Inter_400Regular",
    fontSize: 12,
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
  paperActionBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderWidth: 1,
  },
  paperActionBtnDisabled: {
    opacity: 0.75,
  },
  paperActionBtnSuccess: {},
  paperActionBtnText: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 11,
  },
  paperActionBtnTextDisabled: {},
  paperActionBtnTextSuccess: {},
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
  analyticsCard: {
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    gap: 10,
  },
  analyticsTitle: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 15,
  },
  analyticsRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 12,
  },
  unitHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
  },
  unitWeightage: {
    fontFamily: "Inter_400Regular",
    fontSize: 12,
  },
  unitDetails: {
    marginTop: 12,
    gap: 8,
  },
  sectionLabel: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 13,
    marginTop: 6,
  },
  analyticsLabel: {
    fontFamily: "Inter_500Medium",
    fontSize: 13,
  },
  analyticsValue: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 13,
  },
  analyticsEmpty: {
    fontFamily: "Inter_400Regular",
    fontSize: 12,
  },
  analyticsBullet: {
    fontFamily: "Inter_400Regular",
    fontSize: 13,
    lineHeight: 18,
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
    paperActionBtn: { ...baseStyles.paperActionBtn, borderColor: colors.primary + "35", backgroundColor: colors.primary + "10" },
    paperActionBtnDisabled: { ...baseStyles.paperActionBtnDisabled, borderColor: colors.cardBorder, backgroundColor: colors.background },
    paperActionBtnSuccess: { ...baseStyles.paperActionBtnSuccess, borderColor: colors.success + "35", backgroundColor: colors.success + "12" },
    paperActionBtnText: { ...baseStyles.paperActionBtnText, color: colors.primary },
    paperActionBtnTextDisabled: { ...baseStyles.paperActionBtnTextDisabled, color: colors.textMuted },
    paperActionBtnTextSuccess: { ...baseStyles.paperActionBtnTextSuccess, color: colors.success },
    videoCard: { ...baseStyles.videoCard, backgroundColor: colors.card, borderColor: colors.cardBorder },
    videoIcon: { ...baseStyles.videoIcon, backgroundColor: colors.primary + "18" },
    videoTitle: { ...baseStyles.videoTitle, color: colors.text },
    videoUrl: { ...baseStyles.videoUrl, color: colors.textMuted },
    paperTitle: { ...baseStyles.paperTitle, color: colors.text },
    emptyTitle: { ...baseStyles.emptyTitle, color: colors.textSecondary },
    emptySubtext: { ...baseStyles.emptySubtext, color: colors.textMuted },
    errorText: { ...baseStyles.errorText, color: colors.danger },
    analyticsCard: { ...baseStyles.analyticsCard, backgroundColor: colors.card, borderColor: colors.cardBorder },
    analyticsTitle: { ...baseStyles.analyticsTitle, color: colors.text },
    analyticsLabel: { ...baseStyles.analyticsLabel, color: colors.textSecondary },
    analyticsValue: { ...baseStyles.analyticsValue, color: colors.primary },
    analyticsEmpty: { ...baseStyles.analyticsEmpty, color: colors.textMuted },
    analyticsBullet: { ...baseStyles.analyticsBullet, color: colors.textSecondary },
    unitHeaderRow: { ...baseStyles.unitHeaderRow },
    unitWeightage: { ...baseStyles.unitWeightage, color: colors.textMuted },
    unitDetails: { ...baseStyles.unitDetails },
    sectionLabel: { ...baseStyles.sectionLabel, color: colors.text },
  });
}

