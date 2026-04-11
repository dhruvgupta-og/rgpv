import React, { useEffect, useState } from "react";
import { View, Text, ScrollView, Pressable, RefreshControl, ActivityIndicator } from "react-native";
import { useTheme } from "@/lib/theme";
import { KeyboardAwareScrollViewCompat } from "@/components/KeyboardAwareScrollViewCompat";
import { useRouter } from "expo-router";
import { apiRequest } from "@/lib/query-client";

interface UserOverview {
  deviceId: string;
  name?: string;
  branch?: string;
  year?: string;
  totalSessions: number;
  totalTimeSpentMs: number;
  totalPageViews: number;
  totalContentViews: number;
  totalInteractions: number;
  avgSessionDurationMs: number;
}

export default function UserAnalyticsOverview() {
  const { colors } = useTheme();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [users, setUsers] = useState<UserOverview[]>([]);

  const fetchUsers = async () => {
    try {
      setRefreshing(true);
      const data = await apiRequest("GET", "/api/admin/analytics/users?limit=50");
      setUsers(data);
    } catch (error) {
      console.error("Failed to fetch users:", error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const onRefresh = () => fetchUsers();

  const formatMs = (ms: number) => {
    const h = Math.floor(ms / 3600000);
    const m = Math.floor((ms % 3600000) / 60000);
    return h > 0 ? `${h}h ${m}m` : `${m}m`;
  };

  if (loading) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.background, alignItems: "center", justifyContent: "center" }}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <KeyboardAwareScrollViewCompat
      style={{ flex: 1, backgroundColor: colors.background }}
      contentContainerStyle={{ padding: 16 }}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
    >
      <View style={{ marginBottom: 24 }}>
        <Text style={{ color: colors.text, fontFamily: "Inter_700Bold", fontSize: 28, marginBottom: 4 }}>
          User Analytics
        </Text>
        <Text style={{ color: colors.textSecondary, fontFamily: "Inter_400Regular", fontSize: 14 }}>
          Screen time, sessions and usage data ({users.length} users)
        </Text>
      </View>

      {users.length === 0 ? (
        <View style={{ alignItems: "center", paddingVertical: 40 }}>
          <Text style={{ color: colors.textSecondary, fontFamily: "Inter_400Regular" }}>
            No user data yet
          </Text>
        </View>
      ) : (
        users.map((user: UserOverview, index: number) => (
          <Pressable
            key={index}
            onPress={() => router.push(`/admin/user-analytics/${user.deviceId}`)}
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
            <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 8 }}>
              <View style={{ flex: 1 }}>
                <Text style={{ color: colors.text, fontFamily: "Inter_600SemiBold", fontSize: 16, marginBottom: 2 }}>
                  {user.name || `Device ${user.deviceId.substring(0, 12)}...`}
                </Text>
                <Text style={{ color: colors.textSecondary, fontFamily: "Inter_400Regular", fontSize: 12 }}>
                  {user.branch} {user.year} • {user.totalSessions} sessions
                </Text>
              </View>
              <Text style={{ color: colors.primary, fontFamily: "Inter_600SemiBold", fontSize: 16 }}>
                {formatMs(user.totalTimeSpentMs)}
              </Text>
            </View>
            <View style={{ flexDirection: "row", gap: 16 }}>
              <View style={{ flex: 1 }}>
                <Text style={{ color: colors.textSecondary, fontSize: 11 }}>Page Views</Text>
                <Text style={{ color: colors.text, fontFamily: "Inter_500Medium" }}>{user.totalPageViews}</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ color: colors.textSecondary, fontSize: 11 }}>Content Views</Text>
                <Text style={{ color: colors.text, fontFamily: "Inter_500Medium" }}>{user.totalContentViews}</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ color: colors.textSecondary, fontSize: 11 }}>Interactions</Text>
                <Text style={{ color: colors.text, fontFamily: "Inter_500Medium" }}>{user.totalInteractions}</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ color: colors.textSecondary, fontSize: 11 }}>Avg Session</Text>
                <Text style={{ color: colors.text, fontFamily: "Inter_500Medium" }}>{formatMs(user.avgSessionDurationMs)}</Text>
              </View>
            </View>
          </Pressable>
        ))
      )}
    </KeyboardAwareScrollViewCompat>
  );
}

