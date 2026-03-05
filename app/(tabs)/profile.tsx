import React, { useEffect, useMemo, useState } from "react";
import { Alert, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTheme } from "@/lib/theme";
import { auth, db, firebase } from "@/lib/firebase-client";
import { useQuery } from "@tanstack/react-query";
import type { Branch } from "@/lib/rgpv-data";
import * as Google from "expo-auth-session/providers/google";
import * as WebBrowser from "expo-web-browser";
import * as AuthSession from "expo-auth-session";
import Constants from "expo-constants";

WebBrowser.maybeCompleteAuthSession();

const semesters = [
  { value: "1", label: "1st" },
  { value: "2", label: "2nd" },
  { value: "3", label: "3rd" },
  { value: "4", label: "4th" },
  { value: "5", label: "5th" },
  { value: "6", label: "6th" },
  { value: "7", label: "7th" },
  { value: "8", label: "8th" },
];

export default function ProfileScreen() {
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);

  const [user, setUser] = useState<firebase.User | null>(null);
  const [name, setName] = useState("");
  const [branchId, setBranchId] = useState("");
  const [year, setYear] = useState("");
  const [collegeName, setCollegeName] = useState("");
  const [saving, setSaving] = useState(false);
  const [loadingProfile, setLoadingProfile] = useState(false);
  const [lastSavedAt, setLastSavedAt] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(true);
  const [authStatus, setAuthStatus] = useState("");

  const { data: branches = [] } = useQuery<Branch[]>({
    queryKey: ["/api/branches"],
  });

  const googleWebClientId = process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID || undefined;
  const googleAndroidClientId = process.env.EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID || undefined;
  const isExpoGo = Constants.appOwnership === "expo" || Constants.executionEnvironment === "storeClient";
  const useProxy = isExpoGo;
  const androidRedirectScheme = googleAndroidClientId
    ? `com.googleusercontent.apps.${googleAndroidClientId.split(".apps.googleusercontent.com")[0]}`
    : "com.googleusercontent.apps";
  const redirectUri = AuthSession.makeRedirectUri(
    isExpoGo
      ? { useProxy: true, projectNameForProxy: "@dhruvhereyo0s-organization/rgpv-pyq" }
      : { scheme: androidRedirectScheme },
  );
  const promptOptions = isExpoGo ? { useProxy: true, projectNameForProxy: "@dhruvhereyo0s-organization/rgpv-pyq" } : undefined;

  const [request, response, promptAsync] = Google.useAuthRequest({
    webClientId: googleWebClientId,
    expoClientId: googleWebClientId,
    androidClientId: googleAndroidClientId,
    redirectUri,
    useProxy,
  });

  useEffect(() => {
    return auth.onAuthStateChanged((u) => {
      setUser(u);
      if (u) {
        loadProfile(u).catch(() => {});
      }
    });
  }, []);

  useEffect(() => {
    if (response?.type === "success") {
      const idToken = response.authentication?.idToken;
      const accessToken = response.authentication?.accessToken;
      if (!idToken && !accessToken) return;
      const credential = firebase.auth.GoogleAuthProvider.credential(idToken, accessToken);
      auth.signInWithCredential(credential).catch((e) => {
        Alert.alert("Google login failed", e.message);
      });
    }
  }, [response]);

  const loadProfile = async (u: firebase.User) => {
    setLoadingProfile(true);
    const ref = db.collection("profiles").doc(u.uid);
    const snap = await ref.get();
    if (snap.exists) {
      const data = snap.data() as any;
      setName(data.name || u.displayName || "");
      setBranchId(data.branchId || "");
      setYear(data.year || "");
      setCollegeName(data.collegeName || "");
    } else {
      setName(u.displayName || "");
    }
    setLoadingProfile(false);
  };

  const handleGoogleLogin = async () => {
    if (Platform.OS === "web") {
      try {
        setAuthStatus("Opening Google...");
        await auth.signInWithPopup(new firebase.auth.GoogleAuthProvider());
        setAuthStatus("");
      } catch (e: any) {
        setAuthStatus("");
        console.error("Google login failed", e);
        Alert.alert("Google login failed", e.message);
      }
      return;
    }
    if (!isExpoGo && !googleAndroidClientId) {
      Alert.alert("Google login not configured", "Set EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID in .env and eas.json.");
      return;
    }
    await promptAsync(promptOptions);
  };

  const handleSave = async () => {
    if (!user) return;
    if (!name || !branchId || !year || !collegeName) {
      Alert.alert("Missing info", "Please fill all fields.");
      return;
    }
    setSaving(true);
    try {
      const ref = db.collection("profiles").doc(user.uid);
      await ref.set(
        {
          id: user.uid,
          deviceId: user.uid,
          email: user.email || "",
          name,
          branchId,
          year,
          collegeName,
          updatedAt: firebase.firestore.FieldValue.serverTimestamp(),
          createdAt: firebase.firestore.FieldValue.serverTimestamp(),
        },
        { merge: true },
      );
      setLastSavedAt(new Date().toLocaleString());
      setShowForm(false);
      Alert.alert("Saved", "Profile updated.");
    } catch (e: any) {
      Alert.alert("Save failed", e.message);
    } finally {
      setSaving(false);
    }
  };

  const handleLogout = async () => {
    await auth.signOut();
    setUser(null);
  };

  return (
    <ScrollView
      contentContainerStyle={[
        styles.container,
        { paddingTop: insets.top + 16, paddingBottom: insets.bottom + 24 },
      ]}
    >
      <Text style={styles.header}>Academic Selection</Text>
      <Text style={styles.heroTitle}>Personalize Your Experience</Text>
      <Text style={styles.heroSubtitle}>
        Choose your branch and current semester to get relevant study materials.
      </Text>

      {!user ? (
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Google Sign In Required</Text>
          <Text style={styles.subText}>Please continue with Google to access your profile.</Text>
          {!!authStatus && <Text style={styles.subText}>{authStatus}</Text>}
          <Pressable style={styles.primaryBtn} onPress={handleGoogleLogin} disabled={!request && Platform.OS !== "web"}>
            <Text style={styles.primaryBtnText}>Continue with Google</Text>
          </Pressable>
        </View>
      ) : (
        <View style={styles.card}>
          {showForm ? (
            <>
              <Text style={styles.sectionTitle}>Select Your Branch</Text>
              <View style={styles.grid}>
                {branches.map((b) => (
                  <Pressable
                    key={b.id}
                    onPress={() => setBranchId(b.id)}
                    style={[styles.cardItem, branchId === b.id && styles.cardItemActive]}
                  >
                    <View style={[styles.cardIcon, branchId === b.id && styles.cardIconActive]}>
                      <Text style={[styles.cardIconText, branchId === b.id && styles.cardIconTextActive]}>
                        {b.shortName}
                      </Text>
                    </View>
                    <Text style={[styles.cardText, branchId === b.id && styles.cardTextActive]}>
                      {b.name}
                    </Text>
                  </Pressable>
                ))}
              </View>

              <Text style={styles.sectionTitle}>Select Your Semester</Text>
              <View style={styles.semesterRow}>
                {semesters.map((s) => (
                  <Pressable
                    key={s.value}
                    onPress={() => setYear(s.value)}
                    style={[styles.semesterChip, year === s.value && styles.semesterChipActive]}
                  >
                    <Text style={[styles.semesterText, year === s.value && styles.semesterTextActive]}>
                      {s.label}
                    </Text>
                  </Pressable>
                ))}
              </View>

              <Text style={styles.sectionTitle}>Your Details</Text>
              <Text style={styles.subText}>Signed in as {user.email}</Text>
              <TextInput
                style={styles.input}
                placeholder="Full Name"
                placeholderTextColor={colors.textMuted}
                value={name}
                onChangeText={setName}
              />
              <TextInput
                style={styles.input}
                placeholder="College Name"
                placeholderTextColor={colors.textMuted}
                value={collegeName}
                onChangeText={setCollegeName}
              />
              <Pressable style={styles.primaryBtn} onPress={handleSave} disabled={saving || loadingProfile}>
                <Text style={styles.primaryBtnText}>{saving ? "Saving..." : "Save Profile"}</Text>
              </Pressable>
            </>
          ) : null}
          {!showForm ? (
            <>
              <View style={styles.dashboardCard}>
            <Text style={styles.sectionTitle}>Profile Dashboard</Text>
            <Text style={styles.subText}>Overview of your saved details</Text>
            <View style={styles.dashboardRow}>
              <Text style={styles.dashboardLabel}>Name</Text>
              <Text style={styles.dashboardValue}>{name || "-"}</Text>
            </View>
            <View style={styles.dashboardRow}>
              <Text style={styles.dashboardLabel}>Branch</Text>
              <Text style={styles.dashboardValue}>
                {branches.find((b) => b.id === branchId)?.shortName || branchId || "-"}
              </Text>
            </View>
            <View style={styles.dashboardRow}>
              <Text style={styles.dashboardLabel}>Year</Text>
              <Text style={styles.dashboardValue}>{year ? `Year ${year}` : "-"}</Text>
            </View>
            <View style={styles.dashboardRow}>
              <Text style={styles.dashboardLabel}>College</Text>
              <Text style={styles.dashboardValue}>{collegeName || "-"}</Text>
            </View>
            <View style={styles.dashboardRow}>
              <Text style={styles.dashboardLabel}>Email</Text>
              <Text style={styles.dashboardValue}>{user.email || "-"}</Text>
            </View>
            {lastSavedAt ? (
              <Text style={styles.subText}>Last saved: {lastSavedAt}</Text>
            ) : null}
              </View>
              <Pressable style={styles.primaryBtn} onPress={() => setShowForm(true)}>
                <Text style={styles.primaryBtnText}>Edit Profile</Text>
              </Pressable>
            </>
          ) : null}
          <Pressable style={styles.outlineBtn} onPress={handleLogout}>
            <Text style={styles.outlineBtnText}>Logout</Text>
          </Pressable>
        </View>
      )}
    </ScrollView>
  );
}

function makeStyles(colors: ReturnType<typeof useTheme>["colors"]) {
  return StyleSheet.create({
    container: {
      paddingHorizontal: 20,
      backgroundColor: "#F5F8FC",
      flexGrow: 1,
    },
    header: {
      fontFamily: "Inter_600SemiBold",
      fontSize: 16,
      color: "#2A3B52",
      textAlign: "center",
      marginBottom: 10,
    },
    heroTitle: {
      fontFamily: "Inter_700Bold",
      fontSize: 26,
      color: "#1E2A3A",
      textAlign: "center",
      marginBottom: 8,
    },
    heroSubtitle: {
      fontFamily: "Inter_400Regular",
      fontSize: 13,
      color: "#6B7A90",
      textAlign: "center",
      marginBottom: 18,
    },
    card: {
      backgroundColor: "white",
      borderColor: "#E3ECF9",
      borderWidth: 1,
      borderRadius: 18,
      padding: 16,
      gap: 12,
    },
    sectionTitle: {
      fontFamily: "Inter_600SemiBold",
      fontSize: 16,
      color: "#1E2A3A",
      marginTop: 6,
    },
    subText: {
      fontFamily: "Inter_400Regular",
      fontSize: 12,
      color: "#6B7A90",
    },
    input: {
      borderWidth: 1,
      borderColor: "#E3ECF9",
      backgroundColor: "#F9FBFF",
      borderRadius: 10,
      paddingHorizontal: 12,
      paddingVertical: 10,
      fontFamily: "Inter_400Regular",
      color: "#1E2A3A",
    },
    primaryBtn: {
      backgroundColor: "#2E8BFF",
      borderRadius: 10,
      paddingVertical: 10,
      paddingHorizontal: 14,
      alignItems: "center",
      flex: 1,
    },
    primaryBtnText: {
      fontFamily: "Inter_600SemiBold",
      color: "white",
    },
    outlineBtn: {
      borderWidth: 1,
      borderColor: "#E3ECF9",
      borderRadius: 10,
      paddingVertical: 10,
      paddingHorizontal: 14,
      alignItems: "center",
      flex: 1,
    },
    outlineBtnText: {
      fontFamily: "Inter_600SemiBold",
      color: colors.text,
    },
    dashboardCard: {
      borderWidth: 1,
      borderColor: "#E3ECF9",
      borderRadius: 14,
      padding: 14,
      gap: 8,
      backgroundColor: "#F9FBFF",
    },
    dashboardRow: {
      flexDirection: "row",
      justifyContent: "space-between",
      gap: 10,
    },
    dashboardLabel: {
      fontFamily: "Inter_500Medium",
      fontSize: 12,
      color: "#6B7A90",
    },
    dashboardValue: {
      fontFamily: "Inter_600SemiBold",
      fontSize: 12,
      color: colors.text,
    },
    grid: {
      flexDirection: "row",
      flexWrap: "wrap",
      gap: 12,
    },
    cardItem: {
      width: "48%",
      borderRadius: 18,
      padding: 14,
      borderWidth: 2,
      borderColor: "#E3ECF9",
      backgroundColor: "#FFFFFF",
      alignItems: "center",
      gap: 10,
    },
    cardItemActive: {
      borderColor: "#2E8BFF",
      backgroundColor: "#EAF2FF",
    },
    cardIcon: {
      width: 44,
      height: 44,
      borderRadius: 22,
      backgroundColor: "#EEF3FA",
      alignItems: "center",
      justifyContent: "center",
    },
    cardIconActive: {
      backgroundColor: "#2E8BFF",
    },
    cardIconText: {
      fontFamily: "Inter_600SemiBold",
      fontSize: 12,
      color: "#65758C",
    },
    cardIconTextActive: {
      color: "white",
    },
    cardText: {
      fontFamily: "Inter_600SemiBold",
      fontSize: 12,
      color: "#1E2A3A",
      textAlign: "center",
    },
    cardTextActive: {
      color: "#1E2A3A",
    },
    semesterRow: {
      flexDirection: "row",
      flexWrap: "wrap",
      gap: 10,
    },
    semesterChip: {
      paddingHorizontal: 16,
      paddingVertical: 10,
      borderRadius: 999,
      borderWidth: 1,
      borderColor: "#E3ECF9",
      backgroundColor: "white",
    },
    semesterChipActive: {
      backgroundColor: "#2E8BFF",
      borderColor: "#2E8BFF",
    },
    semesterText: {
      fontFamily: "Inter_600SemiBold",
      fontSize: 12,
      color: "#1E2A3A",
    },
    semesterTextActive: {
      color: "white",
    },
  });
}
