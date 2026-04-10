import { StyleSheet, Text, View, ScrollView, Pressable, Platform, ActivityIndicator } from "react-native";
import React, { useMemo, useState } from "react";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { router, useFocusEffect } from "expo-router";
import { Feather, Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import * as Haptics from "expo-haptics";
import { useQuery } from "@tanstack/react-query";
import { useTheme } from "@/lib/theme";
import type { Branch, Paper, Subject } from "@/lib/rgpv-data";
import { getApiUrl } from "@/lib/query-client";
import { getViewerUrl } from "@/lib/pdf-viewer";
import { ensureProfileComplete } from "@/lib/profile-guard";
import { auth, db } from "@/lib/firebase-client";
import { getStoredProfile } from "@/lib/profile-storage";

function getFirstName(fullName?: string | null) {
  const cleaned = (fullName || "").trim();
  return cleaned ? cleaned.split(/\s+/)[0] : null;
}

function BranchCard({ branch }: { branch: Branch }) {
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);

  const handlePress = () => {
    if (Platform.OS !== "web") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    router.push(`/branch/${branch.id}`);
  };

  const iconMap: Record<string, any> = {
    monitor: <Feather name="monitor" size={26} color={branch.color} />,
    laptop: <Feather name="monitor" size={26} color={branch.color} />,
    cpu: <Feather name="cpu" size={26} color={branch.color} />,
    settings: <Feather name="settings" size={26} color={branch.color} />,
    zap: <Feather name="zap" size={26} color={branch.color} />,
    home: <MaterialCommunityIcons name="bridge" size={26} color={branch.color} />,
    globe: <Feather name="globe" size={26} color={branch.color} />,
    activity: <Feather name="activity" size={26} color={branch.color} />,
    droplet: <Feather name="droplet" size={26} color={branch.color} />,
  };

  return (
    <Pressable
      onPress={handlePress}
      style={({ pressed }) => [
        styles.branchCard,
        { transform: [{ scale: pressed ? 0.97 : 1 }] },
      ]}
    >
      <View style={[styles.branchIconContainer, { backgroundColor: branch.color + '18' }]}>
        {iconMap[branch.icon] || <Feather name="book" size={26} color={branch.color} />}
      </View>
      <View style={styles.branchTextContainer}>
        <Text style={styles.branchShortName}>{branch.shortName}</Text>
        <Text style={styles.branchFullName} numberOfLines={2}>{branch.name}</Text>
      </View>
      <Feather name="chevron-right" size={18} color={colors.textMuted} />
    </Pressable>
  );
}

function RecentPaperCard({ paper, subject }: { paper: Paper; subject?: Subject }) {
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const examType = paper.examType === "Supply" || paper.examType === "Supplementary" || paper.examType === "Back"
    ? "Mid Sem"
    : paper.examType;
  const isMain = examType === "Main";

  const handlePress = async () => {
    if (Platform.OS !== "web") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    const ok = await ensureProfileComplete(() => router.replace("/profile"));
    if (!ok) return;
    if (paper.pdfPath) {
      const pdfUrl = paper.pdfPath.startsWith("http")
        ? paper.pdfPath
        : getApiUrl() + paper.pdfPath.replace(/^\//, "");
      router.push({ pathname: "/pdf-viewer", params: { url: encodeURIComponent(getViewerUrl(pdfUrl)) } });
      return;
    }
    if (subject) {
      router.push({ pathname: "/subject/[id]", params: { id: subject.id } });
    }
  };

  return (
    <Pressable
      onPress={handlePress}
      style={({ pressed }) => [
        styles.paperCard,
        { transform: [{ scale: pressed ? 0.98 : 1 }] },
      ]}
    >
      <View style={[styles.paperIcon, { backgroundColor: isMain ? colors.primary + "18" : colors.warning + "18" }]}>
        <Feather name="file-text" size={18} color={isMain ? colors.primary : colors.warning} />
      </View>
      <View style={styles.paperInfo}>
        <Text style={styles.paperTitle}>{paper.month} {paper.year}</Text>
        <Text style={styles.paperSubtitle} numberOfLines={1}>
          {subject ? `${subject.code} - ${subject.name}` : paper.subjectId}
        </Text>
        <View style={styles.paperMetaRow}>
          <Text style={[styles.paperBadge, { color: isMain ? colors.accent : colors.warning }]}>
            {examType}
          </Text>
          <Text style={styles.paperBadge}>{paper.pdfPath ? "PDF" : "Coming Soon"}</Text>
        </View>
      </View>
      <Feather name={paper.pdfPath ? "download" : "chevron-right"} size={18} color={colors.textMuted} />
    </Pressable>
  );
}

export default function HomeScreen() {
  const insets = useSafeAreaInsets();
  const webTopInset = Platform.OS === "web" ? 67 : 0;
  const { colors, toggle, mode } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const [profileName, setProfileName] = useState<string | null>(null);

  useFocusEffect(
    React.useCallback(() => {
      let active = true;

      const loadProfileName = async () => {
        try {
          const localProfile = await getStoredProfile();
          const localFirstName = getFirstName(localProfile?.name);
          if (localFirstName) {
            if (active) setProfileName(localFirstName);
            return;
          }

          const user = auth.currentUser;
          if (!user) {
            if (active) setProfileName(null);
            return;
          }

          try {
            const snap = await db.collection("profiles").doc(user.uid).get();
            const data = snap.exists ? (snap.data() as any) : {};
            const remoteFirstName = getFirstName(data?.name || user.displayName);
            if (active) setProfileName(remoteFirstName);
          } catch {
            if (active) setProfileName(getFirstName(user.displayName));
          }
        } catch {
          if (active) setProfileName(null);
        }
      };

      loadProfileName();

      return () => {
        active = false;
      };
    }, []),
  );

  const greeting = (() => {
    const hour = new Date().getHours();
    if (hour < 12) return "Good morning";
    if (hour < 18) return "Good afternoon";
    return "Good evening";
  })();

  const { data: branches = [], isLoading } = useQuery<Branch[]>({
    queryKey: ["/api/branches"],
  });

  const { data: subjects = [] } = useQuery<Subject[]>({
    queryKey: ["/api/subjects"],
  });

  const { data: papers = [] } = useQuery<Paper[]>({
    queryKey: ["/api/papers"],
  });

  const { data: mostViewed = [] } = useQuery<Paper[]>({
    queryKey: ["/api/papers?sort=views&limit=5"],
  });



  const monthOrder: Record<string, number> = {
    Jan: 1, Feb: 2, Mar: 3, Apr: 4, May: 5, Jun: 6,
    Jul: 7, Aug: 8, Sep: 9, Oct: 10, Nov: 11, Dec: 12,
  };

  const filteredSubjects = subjects;
  const filteredPapers = papers;
  const filteredMostViewed = mostViewed;

  const recentPapers = [...filteredPapers]
    .sort((a, b) => {
      const yearDiff = Number(b.year) - Number(a.year);
      if (yearDiff !== 0) return yearDiff;
      return (monthOrder[b.month] || 0) - (monthOrder[a.month] || 0);
    })
    .slice(0, 5);

  const subjectsById = subjects.reduce<Record<string, Subject>>((acc, s) => {
    acc[s.id] = s;
    return acc;
  }, {});

  return (
    <View style={styles.container}>
      <ScrollView
        contentContainerStyle={[
          styles.scrollContent,
          {
            paddingTop: (Platform.OS === "web" ? webTopInset : insets.top) + 16,
            paddingBottom: Platform.OS === "web" ? 34 + 84 : 100,
          },
        ]}
        showsVerticalScrollIndicator={false}
        contentInsetAdjustmentBehavior="automatic"
      >
        <LinearGradient
          colors={[colors.primary + '25', colors.background]}
          style={styles.headerGradient}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
        >
          <View style={styles.headerContent}>
            {profileName ? (
              <View style={styles.greetingBlock}>
                <Text style={styles.greetingText}>{greeting}, {profileName}</Text>
                <Text style={styles.greetingSubtext}>Welcome back to your study space.</Text>
              </View>
            ) : null}
            <View style={styles.headerBadge}>
              <Ionicons name="school" size={16} color={colors.primary} />
              <Text style={styles.headerBadgeText}>RGPV</Text>
            </View>
            <View style={styles.headerTitleRow}>
              <Text style={styles.headerTitle}>Previous Year{`\n`}Papers & Syllabus</Text>
              <Pressable onPress={toggle} style={styles.themeToggle} hitSlop={10}>
                <Ionicons name={mode === "dark" ? "sunny" : "moon"} size={18} color={colors.text} />
              </Pressable>
            </View>
            <Text style={styles.headerSubtitle}>
              Access question papers, syllabus & study material for all branches
            </Text>
          </View>
        </LinearGradient>

        <View style={styles.statsRow}>
          <View style={styles.statItem}>
            <Text style={styles.statNumber}>{branches.length}</Text>
            <Text style={styles.statLabel}>Branches</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Text style={styles.statNumber}>{filteredSubjects.length}</Text>
            <Text style={styles.statLabel}>Subjects</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Text style={styles.statNumber}>{filteredPapers.length}</Text>
            <Text style={styles.statLabel}>Papers</Text>
          </View>
        </View>


        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Latest Papers</Text>
          <Text style={styles.sectionSubtitle}>Quick access to recently added papers</Text>
        </View>

        {recentPapers.length === 0 ? (
          <View style={styles.emptyLatest}>
            <Feather name="clock" size={32} color={colors.textMuted} />
            <Text style={styles.emptyLatestText}>No papers yet</Text>
          </View>
        ) : (
          <View style={styles.paperList}>
            {recentPapers.map((paper) => (
              <RecentPaperCard
                key={paper.id}
                paper={paper}
                subject={subjectsById[paper.subjectId]}
              />
            ))}
          </View>
        )}

        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Most Viewed</Text>
          <Text style={styles.sectionSubtitle}>Popular papers across all branches</Text>
        </View>

        {filteredMostViewed.length === 0 ? (
          <View style={styles.emptyLatest}>
            <Feather name="trending-up" size={32} color={colors.textMuted} />
            <Text style={styles.emptyLatestText}>No views yet</Text>
          </View>
        ) : (
          <View style={styles.paperList}>
            {filteredMostViewed.map((paper) => (
              <RecentPaperCard
                key={`mv-${paper.id}`}
                paper={paper}
                subject={subjectsById[paper.subjectId]}
              />
            ))}
          </View>
        )}

        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Select Your Branch</Text>
          <Text style={styles.sectionSubtitle}>Choose your engineering discipline</Text>
        </View>

        {isLoading ? (
          <ActivityIndicator size="large" color={colors.primary} style={{ marginTop: 40 }} />
        ) : (
          <View style={styles.branchList}>
            {branches.map((branch) => (
              <BranchCard key={branch.id} branch={branch} />
            ))}
          </View>
        )}

        <View style={styles.footer}>
          <Text style={styles.footerTitle}>Legal</Text>
          <View style={styles.footerLinks}>
            <Pressable onPress={() => router.push("/legal/privacy")}>
              <Text style={styles.footerLink}>Privacy Policy</Text>
            </Pressable>
            <Pressable onPress={() => router.push("/legal/terms")}>
              <Text style={styles.footerLink}>Terms & Conditions</Text>
            </Pressable>
            <Pressable onPress={() => router.push("/legal/copyright")}>
              <Text style={styles.footerLink}>Copyright Notice</Text>
            </Pressable>
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

const baseStyles = {
  container: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 20,
  },
  headerGradient: {
    borderRadius: 20,
    marginBottom: 20,
    overflow: "hidden",
  },
  headerContent: {
    padding: 24,
    paddingTop: 28,
    paddingBottom: 28,
  },
  headerBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    alignSelf: "flex-start",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    marginBottom: 16,
  },
  headerBadgeText: {
    fontFamily: "Inter_700Bold",
    fontSize: 13,
    letterSpacing: 1,
  },
  greetingBlock: {
    marginBottom: 10,
  },
  greetingText: {
    fontFamily: "Inter_700Bold",
    fontSize: 22,
    lineHeight: 28,
  },
  greetingSubtext: {
    fontFamily: "Inter_500Medium",
    fontSize: 14,
    marginTop: 2,
  },
  headerTitleRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: 12,
  },
  themeToggle: {
    marginTop: 6,
    width: 36,
    height: 36,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
  },
  headerTitle: {
    fontFamily: "Inter_700Bold",
    fontSize: 28,
    lineHeight: 36,
    marginBottom: 10,
  },
  headerSubtitle: {
    fontFamily: "Inter_400Regular",
    fontSize: 14,
    lineHeight: 20,
  },
  statsRow: {
    flexDirection: "row",
    borderRadius: 16,
    padding: 20,
    marginBottom: 28,
    alignItems: "center",
    borderWidth: 1,
  },
  statItem: {
    flex: 1,
    alignItems: "center",
  },
  statNumber: {
    fontFamily: "Inter_700Bold",
    fontSize: 22,
    marginBottom: 4,
  },
  statLabel: {
    fontFamily: "Inter_400Regular",
    fontSize: 12,
  },
  statDivider: {
    width: 1,
    height: 32,
  },
  sectionHeader: {
    marginBottom: 16,
  },
  sectionTitle: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 18,
    marginBottom: 4,
  },
  sectionSubtitle: {
    fontFamily: "Inter_400Regular",
    fontSize: 13,
  },
  branchList: {
    gap: 10,
  },
  paperList: {
    gap: 10,
    marginBottom: 16,
  },
  paperCard: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    gap: 12,
  },
  paperIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  paperInfo: {
    flex: 1,
    gap: 4,
  },
  paperTitle: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 14,
  },
  paperSubtitle: {
    fontFamily: "Inter_400Regular",
    fontSize: 12,
  },
  paperMetaRow: {
    flexDirection: "row",
    gap: 10,
  },
  paperBadge: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 11,
  },
  emptyLatest: {
    borderRadius: 14,
    padding: 20,
    alignItems: "center",
    gap: 8,
    borderWidth: 1,
    marginBottom: 16,
  },
  emptyLatestText: {
    fontFamily: "Inter_500Medium",
    fontSize: 13,
  },
  branchCard: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    gap: 14,
  },
  branchIconContainer: {
    width: 50,
    height: 50,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  branchTextContainer: {
    flex: 1,
  },
  branchShortName: {
    fontFamily: "Inter_700Bold",
    fontSize: 16,
    marginBottom: 2,
  },
  branchFullName: {
    fontFamily: "Inter_400Regular",
    fontSize: 12,
    lineHeight: 16,
  },
  footer: {
    marginTop: 24,
    paddingTop: 16,
    borderTopWidth: 1,
    gap: 10,
  },
  footerTitle: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 14,
  },
  footerLinks: {
    gap: 6,
  },
  footerLink: {
    fontFamily: "Inter_500Medium",
    fontSize: 13,
  },
};

function makeStyles(colors: ReturnType<typeof useTheme>["colors"]) {
  return StyleSheet.create({
    ...baseStyles,
    container: { ...baseStyles.container, backgroundColor: colors.background },
    headerBadge: { ...baseStyles.headerBadge, backgroundColor: colors.primary + "20" },
    headerBadgeText: { ...baseStyles.headerBadgeText, color: colors.primary },
    greetingText: { ...baseStyles.greetingText, color: colors.text },
    greetingBlock: { ...baseStyles.greetingBlock },
    greetingSubtext: { ...baseStyles.greetingSubtext, color: colors.textSecondary },
    themeToggle: { ...baseStyles.themeToggle, backgroundColor: colors.card, borderColor: colors.cardBorder },
    headerTitle: { ...baseStyles.headerTitle, color: colors.text },
    headerSubtitle: { ...baseStyles.headerSubtitle, color: colors.textSecondary },
    statsRow: { ...baseStyles.statsRow, backgroundColor: colors.card, borderColor: colors.cardBorder },
    statNumber: { ...baseStyles.statNumber, color: colors.primary },
    statLabel: { ...baseStyles.statLabel, color: colors.textSecondary },
    statDivider: { ...baseStyles.statDivider, backgroundColor: colors.cardBorder },
    sectionTitle: { ...baseStyles.sectionTitle, color: colors.text },
    sectionSubtitle: { ...baseStyles.sectionSubtitle, color: colors.textMuted },
    paperCard: { ...baseStyles.paperCard, backgroundColor: colors.card, borderColor: colors.cardBorder },
    paperTitle: { ...baseStyles.paperTitle, color: colors.text },
    paperSubtitle: { ...baseStyles.paperSubtitle, color: colors.textSecondary },
    paperBadge: { ...baseStyles.paperBadge, color: colors.textMuted },
    emptyLatest: { ...baseStyles.emptyLatest, backgroundColor: colors.card, borderColor: colors.cardBorder },
    emptyLatestText: { ...baseStyles.emptyLatestText, color: colors.textMuted },
    branchCard: { ...baseStyles.branchCard, backgroundColor: colors.card, borderColor: colors.cardBorder },
    branchShortName: { ...baseStyles.branchShortName, color: colors.text },
    branchFullName: { ...baseStyles.branchFullName, color: colors.textSecondary },
    footer: { ...baseStyles.footer, borderTopColor: colors.cardBorder },
    footerTitle: { ...baseStyles.footerTitle, color: colors.text },
    footerLinks: { ...baseStyles.footerLinks },
    footerLink: { ...baseStyles.footerLink, color: colors.primary },

  });
}
