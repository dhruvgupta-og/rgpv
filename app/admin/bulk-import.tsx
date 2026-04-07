import React, { useState } from "react";
import { View, Text, ScrollView, Pressable, ActivityIndicator, Alert } from "react-native";
import { useTheme } from "@/lib/theme";
import { KeyboardAwareScrollViewCompat } from "@/components/KeyboardAwareScrollViewCompat";
import { useRouter } from "expo-router";
import * as DocumentPicker from "expo-document-picker";
import { apiRequest } from "@/lib/query-client";

interface UploadResult {
  created: number;
  skipped: number;
  errors: number;
}

export default function BulkImportPage() {
  const { colors } = useTheme();
  const router = useRouter();
  const [subjectsFile, setSubjectsFile] = useState<{ name: string; uri: string } | null>(null);
  const [papersFile, setPapersFile] = useState<{ name: string; uri: string } | null>(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{ type: "subjects" | "papers"; data: UploadResult } | null>(null);

  const pickFile = async (type: "subjects" | "papers") => {
    try {
      const doc = await DocumentPicker.getDocumentAsync({
        type: "text/csv",
      });

      if (doc.type === "success") {
        if (type === "subjects") {
          setSubjectsFile({ name: doc.name, uri: doc.uri });
        } else {
          setPapersFile({ name: doc.name, uri: doc.uri });
        }
      }
    } catch (error) {
      Alert.alert("Error", "Failed to pick file");
    }
  };

  const uploadFile = async (type: "subjects" | "papers", fileUri: string) => {
    setLoading(true);
    try {
      const formData = new FormData();
      const file = {
        uri: fileUri,
        type: "text/csv",
        name: type === "subjects" ? "subjects.csv" : "papers.csv",
      } as any;
      formData.append("file", file);

      const response = await fetch(
        `${process.env.EXPO_PUBLIC_DOMAIN || "http://localhost:5000"}/api/admin/import/${type === "subjects" ? "subjects" : "papers"}`,
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
      setResult({ type, data });
      Alert.alert(
        "Success",
        `Created: ${data.created}, Skipped: ${data.skipped}, Errors: ${data.errors}`
      );
    } catch (error) {
      Alert.alert("Error", error instanceof Error ? error.message : "Upload failed");
    } finally {
      setLoading(false);
    }
  };

  const handleSubjectsUpload = () => {
    if (!subjectsFile) return;
    uploadFile("subjects", subjectsFile.uri);
  };

  const handlePapersUpload = () => {
    if (!papersFile) return;
    uploadFile("papers", papersFile.uri);
  };

  return (
    <KeyboardAwareScrollViewCompat
      style={{ flex: 1, backgroundColor: colors.background }}
      contentContainerStyle={{ padding: 16 }}
    >
      {/* Header */}
      <View style={{ marginBottom: 24 }}>
        <Pressable onPress={() => router.back()}>
          <Text style={{ color: colors.primary, fontFamily: "Inter_600SemiBold", fontSize: 16, marginBottom: 12 }}>
            ← Back
          </Text>
        </Pressable>
        <Text style={{ color: colors.text, fontFamily: "Inter_700Bold", fontSize: 24, marginBottom: 4 }}>
          Bulk Import
        </Text>
        <Text style={{ color: colors.textSecondary, fontFamily: "Inter_400Regular", fontSize: 14 }}>
          Upload CSV files to import subjects and papers
        </Text>
      </View>

      {/* Subjects Section */}
      <View
        style={{
          backgroundColor: colors.card,
          borderWidth: 1,
          borderColor: colors.cardBorder,
          borderRadius: 12,
          padding: 16,
          marginBottom: 16,
        }}
      >
        <Text style={{ color: colors.text, fontFamily: "Inter_600SemiBold", fontSize: 16, marginBottom: 8 }}>
          Subjects + Syllabus CSV
        </Text>
        <Text style={{ color: colors.textMuted, fontFamily: "Inter_400Regular", fontSize: 12, marginBottom: 12 }}>
          Required: id, name, code, branchId, semester{"\n"}Optional: unit1_title, unit1_topics, etc.
        </Text>

        {subjectsFile && (
          <Text style={{ color: colors.accent, fontFamily: "Inter_500Medium", fontSize: 13, marginBottom: 12 }}>
            Selected: {subjectsFile.name}
          </Text>
        )}

        <View style={{ flexDirection: "row", gap: 12 }}>
          <Pressable
            onPress={() => pickFile("subjects")}
            style={{
              flex: 1,
              backgroundColor: colors.cardLight,
              borderWidth: 1,
              borderColor: colors.cardBorder,
              borderRadius: 8,
              paddingVertical: 12,
              paddingHorizontal: 16,
              alignItems: "center",
            }}
          >
            <Text style={{ color: colors.textSecondary, fontFamily: "Inter_500Medium", fontSize: 14 }}>
              Choose File
            </Text>
          </Pressable>

          <Pressable
            onPress={handleSubjectsUpload}
            disabled={!subjectsFile || loading}
            style={{
              flex: 1,
              backgroundColor: subjectsFile && !loading ? colors.primary : colors.cardLight,
              borderRadius: 8,
              paddingVertical: 12,
              paddingHorizontal: 16,
              alignItems: "center",
              opacity: !subjectsFile || loading ? 0.5 : 1,
            }}
          >
            {loading && result?.type === "subjects" ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={{ color: "#fff", fontFamily: "Inter_600SemiBold", fontSize: 14 }}>
                Upload
              </Text>
            )}
          </Pressable>
        </View>
      </View>

      {/* Papers Section */}
      <View
        style={{
          backgroundColor: colors.card,
          borderWidth: 1,
          borderColor: colors.cardBorder,
          borderRadius: 12,
          padding: 16,
          marginBottom: 16,
        }}
      >
        <Text style={{ color: colors.text, fontFamily: "Inter_600SemiBold", fontSize: 16, marginBottom: 8 }}>
          Papers CSV
        </Text>
        <Text style={{ color: colors.textMuted, fontFamily: "Inter_400Regular", fontSize: 12, marginBottom: 12 }}>
          Format: subjectCode or subjectName, year, month, examType, pdfPath (optional)
        </Text>

        {papersFile && (
          <Text style={{ color: colors.accent, fontFamily: "Inter_500Medium", fontSize: 13, marginBottom: 12 }}>
            Selected: {papersFile.name}
          </Text>
        )}

        <View style={{ flexDirection: "row", gap: 12 }}>
          <Pressable
            onPress={() => pickFile("papers")}
            style={{
              flex: 1,
              backgroundColor: colors.cardLight,
              borderWidth: 1,
              borderColor: colors.cardBorder,
              borderRadius: 8,
              paddingVertical: 12,
              paddingHorizontal: 16,
              alignItems: "center",
            }}
          >
            <Text style={{ color: colors.textSecondary, fontFamily: "Inter_500Medium", fontSize: 14 }}>
              Choose File
            </Text>
          </Pressable>

          <Pressable
            onPress={handlePapersUpload}
            disabled={!papersFile || loading}
            style={{
              flex: 1,
              backgroundColor: papersFile && !loading ? colors.primary : colors.cardLight,
              borderRadius: 8,
              paddingVertical: 12,
              paddingHorizontal: 16,
              alignItems: "center",
              opacity: !papersFile || loading ? 0.5 : 1,
            }}
          >
            {loading && result?.type === "papers" ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={{ color: "#fff", fontFamily: "Inter_600SemiBold", fontSize: 14 }}>
                Upload
              </Text>
            )}
          </Pressable>
        </View>
      </View>

      {/* Results */}
      {result && (
        <View
          style={{
            backgroundColor: colors.success + "15",
            borderWidth: 1,
            borderColor: colors.success + "40",
            borderRadius: 12,
            padding: 16,
          }}
        >
          <Text style={{ color: colors.text, fontFamily: "Inter_600SemiBold", fontSize: 15, marginBottom: 8 }}>
            {result.type === "subjects" ? "Subjects" : "Papers"} Import Results
          </Text>
          <View style={{ gap: 6 }}>
            <Text style={{ color: colors.textSecondary, fontFamily: "Inter_400Regular", fontSize: 13 }}>
              Created: <Text style={{ color: colors.success, fontFamily: "Inter_600SemiBold" }}>{result.data.created}</Text>
            </Text>
            <Text style={{ color: colors.textSecondary, fontFamily: "Inter_400Regular", fontSize: 13 }}>
              Skipped: <Text style={{ color: colors.warning, fontFamily: "Inter_600SemiBold" }}>{result.data.skipped}</Text>
            </Text>
            <Text style={{ color: colors.textSecondary, fontFamily: "Inter_400Regular", fontSize: 13 }}>
              Errors: <Text style={{ color: colors.danger, fontFamily: "Inter_600SemiBold" }}>{result.data.errors}</Text>
            </Text>
          </View>
        </View>
      )}
    </KeyboardAwareScrollViewCompat>
  );
}
