import React, { useEffect, useState } from "react";
import { View, Text, ScrollView, Pressable, RefreshControl, ActivityIndicator } from "react-native";
import { useTheme } from "@/lib/theme";
import { KeyboardAwareScrollViewCompat } from "@/components/KeyboardAwareScrollViewCompat";
import { useRouter, useLocalSearchParams } from "expo-router";
import { apiRequest } from "@/lib/query-client";

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
  sessions: any[];
  recentPageViews: any[];
  recentContentViews: any[];
}

export default function UserAnalyticsPage() {
  const { colors } = useTheme();
  const router = useRouter();
  const { deviceId } = useLocalSearchParams<{ deviceId: string }>();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [analytics, setAnalytics] = useState<UserAnalytics | null>(null);

  const fetchAnalytics = async () => {
    if (!deviceId) return;
    try {
      const data = await apiRequest("GET", `/api/admin/analytics/users/${deviceId}`);
      setAnalytics(data);
    } catch (error) {
      console.error("Failed to fetch user analytics:", error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchAnalytics();
  }, [deviceId]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchAnalytics();
  };

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

  const formatDate = (dateStr: string) => {
    try {
      const date = new Date(dateStr);
      return date.toLocaleString("en-IN");
    } catch {
      return dateStr;
    }
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
      <Text style={{ color: colors.text, fontFamily: "Inter_700Bold", fontSize: 20, marginBottom: subtitle ? 4 : 0 }}>
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
      <Pressable onPress={() => router.back()} style={{ marginBottom: 16 }}>
        <Text style={{ color: colors.primary, fontFamily: "Inter_600SemiBold", fontSize: 14 }}>← Back</Text>
      </Pressable>

      <View style={{ marginBottom: 24 }}>
        <Text style={{ color: colors.text, fontFamily: "Inter_700Bold", fontSize: 28, marginBottom: 4 }}>
          User Analytics
        </Text>
        <Text style={{ color: colors.textSecondary, fontFamily: "Inter_400Regular", fontSize: 12 }}>
          Device: {deviceId?.substring(0, 16)}...
        </Text>
      </View>

      {loading ? (
        <View style={{ alignItems: "center", justifyContent: "center", paddingVertical: 40 }}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={{ color: colors.textSecondary, fontFamily: "Inter_400Regular", marginTop: 12 }}>
            Loading user analytics...
          </Text>
        </View>
      ) : analytics ? (
        <>
          {/* Usage Stats */}
          <Text style={{ color: colors.text, fontFamily: "Inter_600SemiBold", fontSize: 16, marginBottom: 12 }}>
            Usage Statistics
          </Text>

          <View style={{ flexDirection: "row", marginBottom: 12, gap: 12 }}>
            <StatCard title="Total Sessions" value={analytics.totalSessions.toString()} />
            <StatCard title="Total Time Spent" value={formatMs(analytics.totalTimeSpentMs)} subtitle={`Avg: ${formatMs(analytics.avgSessionDurationMs)} per session`} />
          </View>

          <View style={{ flexDirection: "row", marginBottom: 24, gap: 12 }}>
            <StatCard title="Page Views" value={analytics.totalPageViews.toString()} />
            <StatCard title="Content Views" value={analytics.totalContentViews.toString()} />
          </View>

          <StatCard title="Total Interactions" value={analytics.totalInteractions.toString()} />

          {/* Page Views by Screen */}
          {Object.keys(analytics.pageViewsByScreen).length > 0 && (
            <>
              <Text style={{ color: colors.text, fontFamily: "Inter_600SemiBold", fontSize: 16, marginBottom: 12, marginTop: 12 }}>
                Page Views by Screen
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
                {Object.entries(analytics.pageViewsByScreen)
                  .sort((a, b) => b[1] - a[1])
                  .map(([screen, count], index) => (
                    <View
                      key={index}
                      style={{
                        paddingVertical: 8,
                        borderBottomWidth: index !== Object.keys(analytics.pageViewsByScreen).length - 1 ? 1 : 0,
                        borderBottomColor: colors.cardBorder,
                      }}
                    >
                      <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
                        <Text style={{ color: colors.text, fontFamily: "Inter_500Medium", flex: 1 }}>
                          {screen}
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

          {/* Content Views by Type */}
          {Object.keys(analytics.contentViewsByType).length > 0 && (
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
                {Object.entries(analytics.contentViewsByType)
                  .sort((a, b) => b[1] - a[1])
                  .map(([type, count], index) => (
                    <View
                      key={index}
                      style={{
                        paddingVertical: 8,
                        borderBottomWidth: index !== Object.keys(analytics.contentViewsByType).length - 1 ? 1 : 0,
                        borderBottomColor: colors.cardBorder,
                      }}
                    >
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
          {Object.keys(analytics.interactionsByType).length > 0 && (
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
                {Object.entries(analytics.interactionsByType)
                  .sort((a, b) => b[1] - a[1])
                  .map(([type, count], index) => (
                    <View
                      key={index}
                      style={{
                        paddingVertical: 8,
                        borderBottomWidth: index !== Object.keys(analytics.interactionsByType).length - 1 ? 1 : 0,
                        borderBottomColor: colors.cardBorder,
                      }}
                    >
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

          {/* Recent Page Views */}
          {analytics.recentPageViews.length > 0 && (
            <>
              <Text style={{ color: colors.text, fontFamily: "Inter_600SemiBold", fontSize: 16, marginBottom: 12 }}>
                Recent Page Views
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
                {analytics.recentPageViews.slice(0, 10).map((pv, index) => (
                  <View
                    key={index}
                    style={{
                      paddingVertical: 8,
                      borderBottomWidth: index !== Math.min(analytics.recentPageViews.length, 10) - 1 ? 1 : 0,
                      borderBottomColor: colors.cardBorder,
                    }}
                  >
                    <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start" }}>
                      <View style={{ flex: 1 }}>
                        <Text style={{ color: colors.text, fontFamily: "Inter_500Medium", marginBottom: 2 }}>
                          {pv.screen}
                        </Text>
                        <Text style={{ color: colors.textSecondary, fontFamily: "Inter_400Regular", fontSize: 11 }}>
                          {formatDate(pv.viewedAt)} • {formatMs(pv.durationMs || 0)} time
                        </Text>
                      </View>
                    </View>
                  </View>
                ))}
              </View>
            </>
          )}

          {/* Sessions */}
          {analytics.sessions.length > 0 && (
            <>
              <Text style={{ color: colors.text, fontFamily: "Inter_600SemiBold", fontSize: 16, marginBottom: 12 }}>
                All Sessions
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
                {analytics.sessions.slice(0, 10).map((session, index) => (
                  <View
                    key={index}
                    style={{
                      paddingVertical: 8,
                      borderBottomWidth: index !== Math.min(analytics.sessions.length, 10) - 1 ? 1 : 0,
                      borderBottomColor: colors.cardBorder,
                    }}
                  >
                    <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start" }}>
                      <View style={{ flex: 1 }}>
                        <Text style={{ color: colors.text, fontFamily: "Inter_500Medium", marginBottom: 2 }}>
                          Session {session.sessionId.substring(0, 8)}...
                        </Text>
                        <Text style={{ color: colors.textSecondary, fontFamily: "Inter_400Regular", fontSize: 11, marginBottom: 2 }}>
                          Started: {formatDate(session.startedAt)}
                        </Text>
                        {session.endedAt && (
                          <Text style={{ color: colors.textSecondary, fontFamily: "Inter_400Regular", fontSize: 11 }}>
                            Duration: {formatMs(session.totalDurationMs || 0)}
                          </Text>
                        )}
                      </View>
                    </View>
                  </View>
                ))}
              </View>
            </>
          )}
        </>
      ) : (
        <View style={{ backgroundColor: colors.card, borderWidth: 1, borderColor: colors.cardBorder, borderRadius: 12, padding: 16, alignItems: "center" }}>
          <Text style={{ color: colors.textSecondary, fontFamily: "Inter_400Regular" }}>
            No analytics data available for this user
          </Text>
        </View>
      )}
    </KeyboardAwareScrollViewCompat>
  );
}
