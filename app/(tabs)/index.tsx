import { StyleSheet, Text, View, ScrollView, Pressable, Platform } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { router } from "expo-router";
import { Feather, Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import * as Haptics from "expo-haptics";
import Colors from "@/constants/colors";
import { branches } from "@/lib/rgpv-data";

function BranchCard({ branch, index }: { branch: typeof branches[0]; index: number }) {
  const handlePress = () => {
    if (Platform.OS !== "web") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    router.push({ pathname: "/branch/[id]", params: { id: branch.id } });
  };

  const iconMap: Record<string, any> = {
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
      <Feather name="chevron-right" size={18} color={Colors.textMuted} />
    </Pressable>
  );
}

export default function HomeScreen() {
  const insets = useSafeAreaInsets();
  const webTopInset = Platform.OS === "web" ? 67 : 0;

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
          colors={[Colors.primary + '25', Colors.background]}
          style={styles.headerGradient}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
        >
          <View style={styles.headerContent}>
            <View style={styles.headerBadge}>
              <Ionicons name="school" size={16} color={Colors.primary} />
              <Text style={styles.headerBadgeText}>RGPV</Text>
            </View>
            <Text style={styles.headerTitle}>Previous Year{'\n'}Papers & Syllabus</Text>
            <Text style={styles.headerSubtitle}>
              Access question papers, syllabus & study material for all branches
            </Text>
          </View>
        </LinearGradient>

        <View style={styles.statsRow}>
          <View style={styles.statItem}>
            <Text style={styles.statNumber}>8</Text>
            <Text style={styles.statLabel}>Branches</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Text style={styles.statNumber}>50+</Text>
            <Text style={styles.statLabel}>Subjects</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Text style={styles.statNumber}>100+</Text>
            <Text style={styles.statLabel}>Papers</Text>
          </View>
        </View>

        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Select Your Branch</Text>
          <Text style={styles.sectionSubtitle}>Choose your engineering discipline</Text>
        </View>

        <View style={styles.branchList}>
          {branches.map((branch, index) => (
            <BranchCard key={branch.id} branch={branch} index={index} />
          ))}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
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
    backgroundColor: Colors.primary + '20',
    alignSelf: "flex-start",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    marginBottom: 16,
  },
  headerBadgeText: {
    fontFamily: "Inter_700Bold",
    fontSize: 13,
    color: Colors.primary,
    letterSpacing: 1,
  },
  headerTitle: {
    fontFamily: "Inter_700Bold",
    fontSize: 28,
    color: Colors.text,
    lineHeight: 36,
    marginBottom: 10,
  },
  headerSubtitle: {
    fontFamily: "Inter_400Regular",
    fontSize: 14,
    color: Colors.textSecondary,
    lineHeight: 20,
  },
  statsRow: {
    flexDirection: "row",
    backgroundColor: Colors.card,
    borderRadius: 16,
    padding: 20,
    marginBottom: 28,
    alignItems: "center",
    borderWidth: 1,
    borderColor: Colors.cardBorder,
  },
  statItem: {
    flex: 1,
    alignItems: "center",
  },
  statNumber: {
    fontFamily: "Inter_700Bold",
    fontSize: 22,
    color: Colors.primary,
    marginBottom: 4,
  },
  statLabel: {
    fontFamily: "Inter_400Regular",
    fontSize: 12,
    color: Colors.textSecondary,
  },
  statDivider: {
    width: 1,
    height: 32,
    backgroundColor: Colors.cardBorder,
  },
  sectionHeader: {
    marginBottom: 16,
  },
  sectionTitle: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 18,
    color: Colors.text,
    marginBottom: 4,
  },
  sectionSubtitle: {
    fontFamily: "Inter_400Regular",
    fontSize: 13,
    color: Colors.textMuted,
  },
  branchList: {
    gap: 10,
  },
  branchCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: Colors.card,
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: Colors.cardBorder,
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
    color: Colors.text,
    marginBottom: 2,
  },
  branchFullName: {
    fontFamily: "Inter_400Regular",
    fontSize: 12,
    color: Colors.textSecondary,
    lineHeight: 16,
  },
});
