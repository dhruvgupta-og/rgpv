import { Stack } from "expo-router";
import { useEffect } from "react";
import { useRouter } from "expo-router";
import { ActivityIndicator, View } from "react-native";
import { useTheme } from "@/lib/theme";
import { useState } from "react";

export default function AdminLayout() {
  const { colors } = useTheme();
  const router = useRouter();
  const [isChecking, setIsChecking] = useState(true);

  useEffect(() => {
    checkAdminAccess();
  }, []);

  const checkAdminAccess = async () => {
    try {
      const response = await fetch(`${process.env.EXPO_PUBLIC_DOMAIN || "http://localhost:5000"}/api/admin/session`);
      const data = await response.json();
      if (!data.authenticated) {
        router.replace("/");
      }
    } catch (error) {
      router.replace("/");
    } finally {
      setIsChecking(false);
    }
  };

  if (isChecking) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.background, alignItems: "center", justifyContent: "center" }}>
        <ActivityIndicator color={colors.primary} />
      </View>
    );
  }

  return (
    <Stack
      screenOptions={{
        headerShown: false,
      }}
    >
      <Stack.Screen name="index" />
      <Stack.Screen name="bulk-import" />
      <Stack.Screen name="user-analytics/[deviceId]" />
    </Stack>
  );
}
