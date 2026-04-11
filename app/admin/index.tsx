import React, { useEffect, useState } from "react";
import { View, Text, RefreshControl, ActivityIndicator, Pressable, Platform } from "react-native";
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

export default function AdminPage() {
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
      <View style={{ marginBottom: 32 }}>
        <Pressable onPress={() => router.replace("/")} style={{ marginBottom: 16 }}>
          <Text style={{ color: colors.primary, fontFamily: "Inter_600SemiBold", fontSize: 16 }}>
            {"<-"} Home
          </Text>
        </Pressable>
        <Text style={{ color: colors.text, fontFamily: "Inter_700Bold", fontSize: 28, marginBottom: 6 }}>
          User Analytics
        </Text>
        <Text style={{ color: colors.textSecondary, fontFamily: "Inter_400Regular", fontSize: 14 }}>
          Monitor app usage and user activity.
        </Text>
      </View>

      <Pressable
        onPress={() => router.push("/admin/bulk-import")}
        style={({ pressed }) => ({
          backgroundColor: colors.primary,
          borderRadius: 12,
          padding: 16,
          marginBottom: 24,
          alignItems: "center",
          opacity: pressed ? 0.85 : 1,
        })}
      >
        <Text style={{ color: "#fff", fontFamily: "Inter_700Bold", fontSize: 16 }}>Bulk Import Data</Text>
      </Pressable>

      <Text style={{ color: colors.textSecondary, fontFamily: "Inter_600SemiBold", fontSize: 12, marginBottom: 16, textTransform: "uppercase", letterSpacing: 1 }}>
        Recent Users
      </Text>

      {users.length === 0 ? (
        <View style={{ padding: 40, alignItems: "center" }}>
          <Text style={{ color: colors.textMuted, fontFamily: "Inter_400Regular" }}>No users found</Text>
        </View>
      ) : (
        users.map((user) => (
          <Pressable
            key={user.deviceId}
            style={({ pressed }) => ({
              backgroundColor: colors.card,
              padding: 16,
              borderRadius: 12,
              marginBottom: 12,
              borderWidth: 1,
              borderColor: colors.cardBorder,
              opacity: pressed ? 0.9 : 1,
            })}
            onPress={() => router.push(`/admin/user-analytics/${user.deviceId}`)}
          >
            <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 16, fontFamily: "Inter_700Bold", color: colors.text }}>
                  {user.name || "Anonymous User"}
                </Text>
                <Text style={{ fontSize: 12, color: colors.textMuted, marginTop: 2 }}>
                  {user.deviceId.slice(0, 16)}...
                </Text>
              </View>
              <View style={{ alignItems: "flex-end" }}>
                <Text style={{ fontSize: 14, fontFamily: "Inter_700Bold", color: colors.primary }}>
                  {formatMs(user.totalTimeSpentMs)}
                </Text>
                <Text style={{ fontSize: 11, color: colors.textSecondary, marginTop: 2 }}>
                  {user.totalSessions} sessions
                </Text>
              </View>
            </View>
          </Pressable>
        ))
      )}
    </KeyboardAwareScrollViewCompat>
  );
}
