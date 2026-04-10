import React, { useState } from "react";
import { View, Text, Pressable, ActivityIndicator, Alert } from "react-native";
import { useTheme } from "@/lib/theme";
import { KeyboardAwareScrollViewCompat } from "@/components/KeyboardAwareScrollViewCompat";
import { useRouter } from "expo-router";
import * as DocumentPicker from "expo-document-picker";

interface UploadResult {
  created: number;
  skipped: number;
  errors: number;
  type: "subjects" | "papers";
}

export default function BulkImportPage() {
  const { colors } = useTheme();
  const router = useRouter();
  const [loading, setLoading] = useState<"subjects" | "papers" | null>(null);
  const [results, setResults] = useState<UploadResult[]>([]);

  const pickAndUpload = async (type: "subjects" | "papers") => {
    try {
      const doc = await DocumentPicker.getDocumentAsync({
        type: "text/csv",
      });

      if (doc.type !== "success") return;

      setLoading(type);

      const formData = new FormData();
      const file = {
        uri: doc.uri,
        type: "text/csv",
        name: doc.name,
      } as any;
      formData.append("file", file);

      const response = await fetch(
        `${process.env.EXPO_PUBLIC_DOMAIN || "http://localhost:5000"}/api/admin/import/${type}`,
        {
          method: "POST",
          body: formData,
          headers: {
            Accept: "application/json",
          },
        }
      );

      if (!response.ok) {
        throw new Error(await response.text());
      }

      const data = (await response.json()) as UploadResult;
      setResults((prev) => [{ ...data, type }, ...prev]);

      Alert.alert(
        "Upload Complete",
        `Created: ${data.created}\nSkipped: ${data.skipped}\nErrors: ${data.errors}`
      );
    } catch (error) {
      Alert.alert("Error", error instanceof Error ? error.message : "Upload failed");
    } finally {
      setLoading(null);
    }
  };

  return (
    <KeyboardAwareScrollViewCompat
      style={{ flex: 1, backgroundColor: colors.background }}
      contentContainerStyle={{ padding: 16 }}
    >
      <View style={{ marginBottom: 32 }}>
        <Pressable onPress={() => router.back()} style={{ marginBottom: 16 }}>
          <Text style={{ color: colors.primary, fontFamily: "Inter_600SemiBold", fontSize: 16 }}>
            {"<-"} Back
          </Text>
        </Pressable>
        <Text style={{ color: colors.text, fontFamily: "Inter_700Bold", fontSize: 28, marginBottom: 6 }}>
          Bulk Import
        </Text>
        <Text style={{ color: colors.textSecondary, fontFamily: "Inter_400Regular", fontSize: 14 }}>
          Upload subjects, syllabus, and papers with subject names first, without manual IDs.
        </Text>
      </View>

      <Pressable
        onPress={() => pickAndUpload("subjects")}
        disabled={loading !== null}
        style={({ pressed }) => ({
          backgroundColor: colors.primary,
          borderRadius: 12,
          padding: 20,
          marginBottom: 16,
          opacity: loading === "subjects" ? 0.7 : pressed ? 0.85 : 1,
        })}
      >
        <View style={{ alignItems: "center", gap: 12 }}>
          {loading === "subjects" ? (
            <ActivityIndicator color="#fff" size="large" />
          ) : (
            <>
              <Text style={{ color: "#fff", fontFamily: "Inter_700Bold", fontSize: 18 }}>
                Upload Subjects CSV
              </Text>
              <Text style={{ color: "#fff", fontFamily: "Inter_400Regular", fontSize: 12, textAlign: "center" }}>
                Code and ID are optional. Syllabus units can be included in the same file.
              </Text>
            </>
          )}
        </View>
      </Pressable>

      <View
        style={{
          backgroundColor: colors.cardLight,
          borderWidth: 1,
          borderColor: colors.cardBorder,
          borderRadius: 10,
          padding: 12,
          marginBottom: 12,
        }}
      >
        <Text style={{ color: colors.textSecondary, fontFamily: "Inter_600SemiBold", fontSize: 13, marginBottom: 8 }}>
          Papers CSV can match subjects automatically
        </Text>
        <Text style={{ color: colors.textMuted, fontFamily: "Inter_400Regular", fontSize: 12, lineHeight: 18 }}>
          Use `subjectName` in the CSV. `subject` or `subjectCode` also works if you already have it.
        </Text>
      </View>

      <Pressable
        onPress={() => pickAndUpload("papers")}
        disabled={loading !== null}
        style={({ pressed }) => ({
          backgroundColor: colors.primary,
          borderRadius: 12,
          padding: 20,
          marginBottom: 12,
          opacity: loading === "papers" ? 0.7 : pressed ? 0.85 : 1,
        })}
      >
        <View style={{ alignItems: "center", gap: 12 }}>
          {loading === "papers" ? (
            <ActivityIndicator color="#fff" size="large" />
          ) : (
            <>
              <Text style={{ color: "#fff", fontFamily: "Inter_700Bold", fontSize: 18 }}>
                Upload Papers CSV
              </Text>
              <Text style={{ color: "#fff", fontFamily: "Inter_400Regular", fontSize: 12, textAlign: "center" }}>
                Format: subjectName, year, month, examType, pdfPath
              </Text>
            </>
          )}
        </View>
      </Pressable>

      <View
        style={{
          backgroundColor: colors.cardLight,
          borderWidth: 1,
          borderColor: colors.cardBorder,
          borderRadius: 10,
          padding: 12,
          marginBottom: 24,
        }}
      >
        <Text style={{ color: colors.textMuted, fontFamily: "Inter_400Regular", fontSize: 11, lineHeight: 16 }}>
          <Text style={{ color: colors.textSecondary, fontFamily: "Inter_600SemiBold" }}>Subjects CSV:</Text> name, branchId, semester{"\n"}
          Optional: code, id, unit1_title, unit1_topics, unit2_title, unit2_topics...{"\n"}
          <Text style={{ color: colors.textSecondary, fontFamily: "Inter_600SemiBold" }}>Papers CSV:</Text> subjectName, year, month, examType, pdfPath
        </Text>
      </View>

      {results.length > 0 && (
        <View>
          <Text style={{ color: colors.textSecondary, fontFamily: "Inter_600SemiBold", fontSize: 13, marginBottom: 12, textTransform: "uppercase" }}>
            Recent Uploads
          </Text>
          {results.map((result, idx) => (
            <View
              key={idx}
              style={{
                backgroundColor: colors.success + "15",
                borderWidth: 1,
                borderColor: colors.success + "40",
                borderRadius: 10,
                padding: 14,
                marginBottom: 10,
              }}
            >
              <Text style={{ color: colors.text, fontFamily: "Inter_600SemiBold", fontSize: 13, marginBottom: 8 }}>
                {result.type === "subjects" ? "Subjects" : "Papers"}
              </Text>
              <View style={{ gap: 4 }}>
                <Text style={{ color: colors.textSecondary, fontFamily: "Inter_400Regular", fontSize: 12 }}>
                  Created: <Text style={{ color: colors.success, fontFamily: "Inter_600SemiBold" }}>{result.created}</Text>
                </Text>
                <Text style={{ color: colors.textSecondary, fontFamily: "Inter_400Regular", fontSize: 12 }}>
                  Skipped: <Text style={{ color: colors.warning, fontFamily: "Inter_600SemiBold" }}>{result.skipped}</Text>
                </Text>
                {result.errors > 0 && (
                  <Text style={{ color: colors.textSecondary, fontFamily: "Inter_400Regular", fontSize: 12 }}>
                    Errors: <Text style={{ color: colors.danger, fontFamily: "Inter_600SemiBold" }}>{result.errors}</Text>
                  </Text>
                )}
              </View>
            </View>
          ))}
        </View>
      )}
    </KeyboardAwareScrollViewCompat>
  );
}
