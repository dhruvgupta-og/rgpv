import React from "react";
import { View, Text, ScrollView, Pressable } from "react-native";
import { useTheme } from "@/lib/theme";
import { KeyboardAwareScrollViewCompat } from "@/components/KeyboardAwareScrollViewCompat";
import { useRouter } from "expo-router";

export default function AdminPage() {
  const { colors } = useTheme();
  const router = useRouter();

  const adminOptions = [
    {
      title: "Bulk Import",
      description: "Import subjects and papers from CSV files",
      onPress: () => router.push("/admin/bulk-import"),
    },
  ];

  return (
    <KeyboardAwareScrollViewCompat
      style={{ flex: 1, backgroundColor: colors.background }}
      contentContainerStyle={{ padding: 16 }}
    >
      {/* Header */}
      <View style={{ marginBottom: 24 }}>
        <Text style={{ color: colors.text, fontFamily: "Inter_700Bold", fontSize: 28, marginBottom: 4 }}>
          Admin Panel
        </Text>
        <Text style={{ color: colors.textSecondary, fontFamily: "Inter_400Regular", fontSize: 14 }}>
          Manage your RGPV Papers data
        </Text>
      </View>

      {/* Admin Options */}
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
    </KeyboardAwareScrollViewCompat>
  );
}
