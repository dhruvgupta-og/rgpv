import React, { useState, useEffect } from "react";
import { View, Text, Pressable, ActivityIndicator, Alert, FlatList } from "react-native";
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

interface Subject {
  id: string;
  name: string;
  code: string;
  branchId: string;
  semester: number;
}

export default function BulkImportPage() {
  const { colors } = useTheme();
  const router = useRouter();
  const [loading, setLoading] = useState<"subjects" | "papers" | null>(null);
  const [results, setResults] = useState<UploadResult[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [selectedSubject, setSelectedSubject] = useState<Subject | null>(null);
  const [showSubjectPicker, setShowSubjectPicker] = useState(false);

  useEffect(() => {
    fetchSubjects();
  }, []);

  const fetchSubjects = async () => {
    try {
      const response = await fetch(
        `${process.env.EXPO_PUBLIC_DOMAIN || "http://localhost:5000"}/api/subjects`
      );
      const data = await response.json();
      setSubjects(data);
    } catch (error) {
      console.error("Failed to fetch subjects", error);
    }
  };

  const pickAndUpload = async (type: "subjects" | "papers") => {
    if (type === "papers" && !selectedSubject) {
      Alert.alert("Select Subject", "Please select a subject before uploading papers");
      return;
    }

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

      if (type === "papers" && selectedSubject) {
        formData.append("subjectId", selectedSubject.id);
      }

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
        "✓ Upload Complete",
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
      {/* Header */}
      <View style={{ marginBottom: 32 }}>
        <Pressable onPress={() => router.back()} style={{ marginBottom: 16 }}>
          <Text style={{ color: colors.primary, fontFamily: "Inter_600SemiBold", fontSize: 16 }}>
            ← Back
          </Text>
        </Pressable>
        <Text style={{ color: colors.text, fontFamily: "Inter_700Bold", fontSize: 28, marginBottom: 6 }}>
          Bulk Import
        </Text>
        <Text style={{ color: colors.textSecondary, fontFamily: "Inter_400Regular", fontSize: 14 }}>
          Upload CSV files to add subjects and papers
        </Text>
      </View>

      {/* Subjects Upload Button */}
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
                📚 Upload Subjects CSV
              </Text>
              <Text style={{ color: "#fff", fontFamily: "Inter_400Regular", fontSize: 12, textAlign: "center" }}>
                Tap to select and upload subjects with syllabus
              </Text>
            </>
          )}
        </View>
      </Pressable>

      {/* Papers Section */}
      <View style={{ marginBottom: 12 }}>
        <Text style={{ color: colors.textSecondary, fontFamily: "Inter_600SemiBold", fontSize: 13, marginBottom: 10 }}>
          Select Subject for Papers
        </Text>
        {selectedSubject ? (
          <Pressable
            onPress={() => setShowSubjectPicker(!showSubjectPicker)}
            style={{
              backgroundColor: colors.primary,
              borderRadius: 8,
              paddingVertical: 12,
              paddingHorizontal: 14,
              marginBottom: 12,
            }}
          >
            <Text style={{ color: "#fff", fontFamily: "Inter_600SemiBold", fontSize: 14 }}>
              ✓ {selectedSubject.code} - {selectedSubject.name}
            </Text>
          </Pressable>
        ) : (
          <Pressable
            onPress={() => setShowSubjectPicker(!showSubjectPicker)}
            style={{
              backgroundColor: colors.cardLight,
              borderWidth: 1,
              borderColor: colors.cardBorder,
              borderRadius: 8,
              paddingVertical: 12,
              paddingHorizontal: 14,
              marginBottom: 12,
            }}
          >
            <Text style={{ color: colors.textSecondary, fontFamily: "Inter_500Medium", fontSize: 14 }}>
              Choose subject...
            </Text>
          </Pressable>
        )}

        {showSubjectPicker && (
          <View
            style={{
              backgroundColor: colors.card,
              borderWidth: 1,
              borderColor: colors.cardBorder,
              borderRadius: 8,
              marginBottom: 12,
              maxHeight: 200,
            }}
          >
            <FlatList
              data={subjects}
              scrollEnabled={true}
              keyExtractor={(item) => item.id}
              renderItem={({ item }) => (
                <Pressable
                  onPress={() => {
                    setSelectedSubject(item);
                    setShowSubjectPicker(false);
                  }}
                  style={{
                    paddingVertical: 10,
                    paddingHorizontal: 14,
                    borderBottomWidth: 1,
                    borderBottomColor: colors.cardBorder,
                  }}
                >
                  <Text style={{ color: colors.text, fontFamily: "Inter_400Regular", fontSize: 13 }}>
                    {item.code} - {item.name}
                  </Text>
                </Pressable>
              )}
            />
          </View>
        )}
      </View>

      {/* Papers Upload Button */}
      <Pressable
        onPress={() => pickAndUpload("papers")}
        disabled={loading !== null || !selectedSubject}
        style={({ pressed }) => ({
          backgroundColor: selectedSubject && loading !== "papers" ? colors.primary : colors.cardLight,
          borderRadius: 12,
          padding: 20,
          marginBottom: 12,
          opacity: loading === "papers" ? 0.7 : pressed && selectedSubject ? 0.85 : 1,
        })}
      >
        <View style={{ alignItems: "center", gap: 12 }}>
          {loading === "papers" ? (
            <ActivityIndicator color="#fff" size="large" />
          ) : (
            <>
              <Text style={{ color: selectedSubject ? "#fff" : colors.textSecondary, fontFamily: "Inter_700Bold", fontSize: 18 }}>
                📄 Upload Papers CSV
              </Text>
              <Text style={{ color: selectedSubject ? "#fff" : colors.textSecondary, fontFamily: "Inter_400Regular", fontSize: 12, textAlign: "center" }}>
                Format: year, month, examType, pdfPath
              </Text>
            </>
          )}
        </View>
      </Pressable>

      {/* Format Help */}
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
          <Text style={{ color: colors.textSecondary, fontFamily: "Inter_600SemiBold" }}>Subjects CSV:</Text> id, name, code, branchId, semester{"\n"}
          <Text style={{ color: colors.textSecondary, fontFamily: "Inter_600SemiBold" }}>Papers CSV:</Text> year, month, examType, pdfPath
        </Text>
      </View>

      {/* Recent Results */}
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
                {result.type === "subjects" ? "📚 Subjects" : "📄 Papers"}
              </Text>
              <View style={{ gap: 4 }}>
                <Text style={{ color: colors.textSecondary, fontFamily: "Inter_400Regular", fontSize: 12 }}>
                  ✓ Created: <Text style={{ color: colors.success, fontFamily: "Inter_600SemiBold" }}>{result.created}</Text>
                </Text>
                <Text style={{ color: colors.textSecondary, fontFamily: "Inter_400Regular", fontSize: 12 }}>
                  ⊗ Skipped: <Text style={{ color: colors.warning, fontFamily: "Inter_600SemiBold" }}>{result.skipped}</Text>
                </Text>
                {result.errors > 0 && (
                  <Text style={{ color: colors.textSecondary, fontFamily: "Inter_400Regular", fontSize: 12 }}>
                    ✕ Errors: <Text style={{ color: colors.danger, fontFamily: "Inter_600SemiBold" }}>{result.errors}</Text>
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
