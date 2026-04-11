import React, { useEffect, useState } from "react";
import { View, Text, ScrollView, Pressable, RefreshControl, ActivityIndicator } from "react-native";
import { useTheme } from "@/lib/theme";
import { KeyboardAwareScrollViewCompat } from "@/components/KeyboardAwareScrollViewCompat";
import { useRouter } from "expo-router";
import { apiRequest } from "@/lib/query-client";

interface AnalyticsOverview {
  activeUsers24h: number;
  activeUsers7d: number;
  totalSessions: number;
  totalPageViews: number;
  totalContentViews: number;
  totalInteractions: number;
  topPages: Array<{ screen: string; count: number }>;
  avgSessionDurationMs: number;
  contentViewsByType: Record<string, number>;
  interactionsByType: Record<string, number>;
}

interface ScreenTimeAnalytics {
  totalTimeMs: number;
  totalTimeMinutes: number;
  totalTimeHours: number;
  screenTimeByScreen: Record<string, { timeMs: number; timeMinutes: number; percentage: number }>;
  uniqueDevicesCount: number;
}

interface UserAnalytics {
  deviceId: string;
  totalSessions: number;
  totalTimeSpentMs: number;
  avgSessionDurationMs: number;
  totalPageViews: number;
  totalContentViews: number;
  totalInteractions: number;
  pageViewsByScreen: Record<string, number>;
  contentViewsByType: Record<string, number>;
  interactionsByType: Record<string, number>;
}

export default function AdminPage() {
  const { colors } = useTheme();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [overview, setOverview] = useState<AnalyticsOverview | null>(null);
  const [screenTime, setScreenTime] = useState<ScreenTimeAnalytics | null>(null);
  const [topUsers, setTopUsers] = useState<UserAnalytics[]>([]);

  const fetchAnalytics = async () => {
    try {
      const [overviewData, screenTimeData, usersData] = await Promise.all([
        apiRequest("GET", "/api/admin/analytics/overview"),
        apiRequest("GET", "/api/admin/analytics/screen-time"),
        apiRequest("GET", "/api/admin/analytics/users?limit=10"),
      ]);

      setOverview(overviewData);
      setScreenTime(screenTimeData);
      setTopUsers(usersData);
    } catch (error) {
      console.error("Failed to fetch analytics:", error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchAnalytics();
  }, []);

  const onRefresh = () => {
    setRefreshing(true);
    fetchAnalytics();
  };

  const adminOptions = [
    {
      title: "Bulk Import",
      description: "Import subjects and papers from CSV files",
      onPress: () => router.push("/admin/bulk-import"),
    },
  ];

  const formatMs = (ms: number) => {
    const hours = Math.floor(ms / 3600000);
    const minutes = Math.floor((ms % 3600000) / 60000);
    const seconds = Math.floor((ms % 60000) / 1000);

    if (hours > 0) {
      return `${hours}h ${minutes}m`;
    }
    if (minutes > 0) {
      return `${minutes}m ${seconds}s`;
    }
    return `${seconds}s`;
  };

  const StatCard = ({ title, value, subtitle }: { title: string; value: string; subtitle?: string }) => (
    <View
      style={{
        flex: 1,
        backgroundColor: colors.card,
        borderWidth: 1,
        borderColor: colors.cardBorder,
        borderRadius: 12,
        padding: 12,
        marginBottom: 12,
      }}
    >
      <Text style={{ color: colors.textSecondary, fontFamily: "Inter_500Medium", fontSize: 12, marginBottom: 4 }}>
        {title}
      </Text>
      <Text style={{ color: colors.text, fontFamily: "Inter_700Bold", fontSize: 24, marginBottom: subtitle ? 4 : 0 }}>
        {value}
      </Text>
      {subtitle && <Text style={{ color: colors.textSecondary, fontFamily: "Inter_400Regular", fontSize: 11 }}>{subtitle}</Text>}
    </View>
  );

  return (
    <KeyboardAwareScrollViewCompat
      style={{ flex: 1, backgroundColor: colors.background }}
      contentContainerStyle={{ padding: 16 }}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
    >
      {/* Header */}
      <View style={{ marginBottom: 24 }}>
        <Text style={{ color: colors.text, fontFamily: "Inter_700Bold", fontSize: 28, marginBottom: 4 }}>
          Admin Panel
        </Text>
        <Text style={{ color: colors.textSecondary, fontFamily: "Inter_400Regular", fontSize: 14 }}>
          Analytics & Data Management
        </Text>
      </View>

      {/* Admin Options */}
      <View style={{ marginBottom: 24 }}>
        <Text style={{ color: colors.text, fontFamily: "Inter_600SemiBold", fontSize: 16, marginBottom: 12 }}>
          Tools
        </Text>
        {adminOptions.map((option, index) => (
          <Pressable
            key={index}
            onPress={option.onPress}
            style={({ pressed }) => ({
              backgroundColor: colors.card,
              borderWidth: 1,
              borderColor: colors.cardBorder,
              borderRadius: 12,
              padding: 16,
              marginBottom: 12,
              opacity: pressed ? 0.7 : 1,
            })}
          >
            <Text style={{ color: colors.text, fontFamily: "Inter_600SemiBold", fontSize: 16, marginBottom: 6 }}>
              {option.title}
            </Text>
            <Text style={{ color: colors.textSecondary, fontFamily: "Inter_400Regular", fontSize: 13 }}>
              {option.description}
            </Text>
          </Pressable>
        ))}
      </View>

      {loading ? (
        <View style={{ alignItems: "center", justifyContent: "center", paddingVertical: 40 }}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={{ color: colors.textSecondary, fontFamily: "Inter_400Regular", marginTop: 12 }}>
            Loading analytics...
          </Text>
        </View>
      ) : (
        <>
          {/* Analytics Overview */}
          {overview && (
            <>
              <Text style={{ color: colors.text, fontFamily: "Inter_600SemiBold", fontSize: 16, marginBottom: 12 }}>
                Overview
              </Text>

              <View style={{ flexDirection: "row", marginBottom: 12, gap: 12 }}>
                <StatCard title="Active Users (24h)" value={overview.activeUsers24h.toString()} />
                <StatCard title="Active Users (7d)" value={overview.activeUsers7d.toString()} />
              </View>

              <View style={{ flexDirection: "row", marginBottom: 12, gap: 12 }}>
                <StatCard title="Total Sessions" value={overview.totalSessions.toString()} />
                <StatCard title="Avg Session Duration" value={formatMs(overview.avgSessionDurationMs)} />
              </View>

              <View style={{ flexDirection: "row", marginBottom: 24, gap: 12 }}>
                <StatCard title="Page Views" value={overview.totalPageViews.toString()} />
                <StatCard title="Content Views" value={overview.totalContentViews.toString()} />
              </View>

              {/* Top Pages */}
              <Text style={{ color: colors.text, fontFamily: "Inter_600SemiBold", fontSize: 16, marginBottom: 12 }}>
                Top Pages
              </Text>
              {overview.topPages.length > 0 ? (
                <View
                  style={{
                    backgroundColor: colors.card,
                    borderWidth: 1,
                    borderColor: colors.cardBorder,
                    borderRadius: 12,
                    padding: 12,
                    marginBottom: 24,
                  }}
                >
                  {overview.topPages.map((page, index) => (
                    <View key={index} style={{ paddingVertical: 8, borderBottomWidth: index !== overview.topPages.length - 1 ? 1 : 0, borderBottomColor: colors.cardBorder }}>
                      <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
                        <Text style={{ color: colors.text, fontFamily: "Inter_500Medium", flex: 1 }}>
                          {page.screen}
                        </Text>
                        <Text style={{ color: colors.primary, fontFamily: "Inter_600SemiBold" }}>
                          {page.count} views
                        </Text>
                      </View>
                      <View style={{ height: 4, backgroundColor: colors.cardBorder, borderRadius: 2, marginTop: 4, overflow: "hidden" }}>
                        <View
                          style={{
                            height: "100%",
                            backgroundColor: colors.primary,
                            width: `${Math.min((page.count / Math.max(...overview.topPages.map((p) => p.count), 1)) * 100, 100)}%`,
                          }}
                        />
                      </View>
                    </View>
                  ))}
                </View>
              ) : (
                <View style={{ backgroundColor: colors.card, borderWidth: 1, borderColor: colors.cardBorder, borderRadius: 12, padding: 12, marginBottom: 24 }}>
                  <Text style={{ color: colors.textSecondary, fontFamily: "Inter_400Regular", textAlign: "center" }}>
                    No page view data yet
                  </Text>
                </View>
              )}

              {/* Content Views by Type */}
              {Object.keys(overview.contentViewsByType).length > 0 && (
                <>
                  <Text style={{ color: colors.text, fontFamily: "Inter_600SemiBold", fontSize: 16, marginBottom: 12 }}>
                    Content Views by Type
                  </Text>
                  <View
                    style={{
                      backgroundColor: colors.card,
                      borderWidth: 1,
                      borderColor: colors.cardBorder,
                      borderRadius: 12,
                      padding: 12,
                      marginBottom: 24,
                    }}
                  >
                    {Object.entries(overview.contentViewsByType).map(([type, count], index) => (
                      <View key={index} style={{ paddingVertical: 8, borderBottomWidth: index !== Object.keys(overview.contentViewsByType).length - 1 ? 1 : 0, borderBottomColor: colors.cardBorder }}>
                        <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
                          <Text style={{ color: colors.text, fontFamily: "Inter_500Medium" }}>
                            {type}
                          </Text>
                          <Text style={{ color: colors.primary, fontFamily: "Inter_600SemiBold" }}>
                            {count} views
                          </Text>
                        </View>
                      </View>
                    ))}
                  </View>
                </>
              )}

              {/* Interactions by Type */}
              {Object.keys(overview.interactionsByType).length > 0 && (
                <>
                  <Text style={{ color: colors.text, fontFamily: "Inter_600SemiBold", fontSize: 16, marginBottom: 12 }}>
                    Interactions by Type
                  </Text>
                  <View
                    style={{
                      backgroundColor: colors.card,
                      borderWidth: 1,
                      borderColor: colors.cardBorder,
                      borderRadius: 12,
                      padding: 12,
                      marginBottom: 24,
                    }}
                  >
                    {Object.entries(overview.interactionsByType).map(([type, count], index) => (
                      <View key={index} style={{ paddingVertical: 8, borderBottomWidth: index !== Object.keys(overview.interactionsByType).length - 1 ? 1 : 0, borderBottomColor: colors.cardBorder }}>
                        <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
                          <Text style={{ color: colors.text, fontFamily: "Inter_500Medium" }}>
                            {type}
                          </Text>
                          <Text style={{ color: colors.primary, fontFamily: "Inter_600SemiBold" }}>
                            {count}
                          </Text>
                        </View>
                      </View>
                    ))}
                  </View>
                </>
              )}
            </>
          )}

          {/* Screen Time Analytics */}
          {screenTime && (
            <>
              <Text style={{ color: colors.text, fontFamily: "Inter_600SemiBold", fontSize: 16, marginBottom: 12 }}>
                Screen Time Analysis
              </Text>

              <View style={{ flexDirection: "row", marginBottom: 12, gap: 12 }}>
                <StatCard
                  title="Total Screen Time"
                  value={`${screenTime.totalTimeHours}h`}
                  subtitle={`${screenTime.totalTimeMinutes} minutes total`}
                />
                <StatCard title="Unique Devices" value={screenTime.uniqueDevicesCount.toString()} />
              </View>

              {Object.keys(screenTime.screenTimeByScreen).length > 0 && (
                <View
                  style={{
                    backgroundColor: colors.card,
                    borderWidth: 1,
                    borderColor: colors.cardBorder,
                    borderRadius: 12,
                    padding: 12,
                    marginBottom: 24,
                  }}
                >
                  <Text style={{ color: colors.text, fontFamily: "Inter_600SemiBold", fontSize: 14, marginBottom: 12 }}>
                    Time by Screen
                  </Text>
                  {Object.entries(screenTime.screenTimeByScreen).map(([screen, data], index) => (
                    <View key={index} style={{ marginBottom: index !== Object.keys(screenTime.screenTimeByScreen).length - 1 ? 12 : 0 }}>
                      <View style={{ flexDirection: "row", justifyContent: "space-between", marginBottom: 4 }}>
                        <Text style={{ color: colors.text, fontFamily: "Inter_500Medium", flex: 1 }}>
                          {screen}
                        </Text>
                        <Text style={{ color: colors.primary, fontFamily: "Inter_600SemiBold" }}>
                          {data.timeMinutes}m ({data.percentage}%)
                        </Text>
                      </View>
                      <View style={{ height: 6, backgroundColor: colors.cardBorder, borderRadius: 3, overflow: "hidden" }}>
                        <View
                          style={{
                            height: "100%",
                            backgroundColor: colors.primary,
                            width: `${data.percentage}%`,
                          }}
                        />
                      </View>
                    </View>
                  ))}
                </View>
              )}
            </>
          )}

          {/* Top Users */}
          {topUsers.length > 0 && (
            <>
              <Text style={{ color: colors.text, fontFamily: "Inter_600SemiBold", fontSize: 16, marginBottom: 12 }}>
                Top Users by Screen Time
              </Text>
              {topUsers.map((user, index) => (
                <Pressable
                  key={index}
                  style={({ pressed }) => ({
                    backgroundColor: colors.card,
                    borderWidth: 1,
                    borderColor: colors.cardBorder,
                    borderRadius: 12,
                    padding: 12,
                    marginBottom: 12,
                    opacity: pressed ? 0.7 : 1,
                  })}
                  onPress={() => router.push(`/admin/user-analytics/${user.deviceId}`)}
                >
                  <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 8 }}>
                    <View style={{ flex: 1 }}>
                      <Text style={{ color: colors.text, fontFamily: "Inter_600SemiBold", marginBottom: 4 }}>
                        Device ID: {user.deviceId.substring(0, 12)}...
                      </Text>
                      <Text style={{ color: colors.textSecondary, fontFamily: "Inter_400Regular", fontSize: 12 }}>
                        {user.totalSessions} sessions • {formatMs(user.totalTimeSpentMs)} total time
                      </Text>
                    </View>
                  </View>
                  <View style={{ flexDirection: "row", gap: 16 }}>
                    <View>
                      <Text style={{ color: colors.textSecondary, fontFamily: "Inter_400Regular", fontSize: 11 }}>
                        Page Views
                      </Text>
                      <Text style={{ color: colors.primary, fontFamily: "Inter_600SemiBold" }}>
                        {user.totalPageViews}
                      </Text>
                    </View>
                    <View>
                      <Text style={{ color: colors.textSecondary, fontFamily: "Inter_400Regular", fontSize: 11 }}>
                        Content Views
                      </Text>
                      <Text style={{ color: colors.primary, fontFamily: "Inter_600SemiBold" }}>
                        {user.totalContentViews}
                      </Text>
                    </View>
                    <View>
                      <Text style={{ color: colors.textSecondary, fontFamily: "Inter_400Regular", fontSize: 11 }}>
                        Interactions
                      </Text>
                      <Text style={{ color: colors.primary, fontFamily: "Inter_600SemiBold" }}>
                        {user.totalInteractions}
                      </Text>
                    </View>
                  </View>
                </Pressable>
              ))}
            </>
          )}
        </>
      )}
    </KeyboardAwareScrollViewCompat>
  );
}
