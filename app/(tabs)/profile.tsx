import React, { useEffect, useMemo, useState } from "react";
import { Alert, Pressable, ScrollView, StyleSheet, Text, TextInput, View, ActivityIndicator, Platform } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTheme } from "@/lib/theme";
import { useQuery } from "@tanstack/react-query";
import type { Branch } from "@/lib/rgpv-data";
import { Feather } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { auth, db, firebase } from "@/lib/firebase-client";
import { apiRequest } from "@/lib/query-client";
import {
  clearStoredProfile,
  getOrCreateProfileDeviceId,
  getStoredProfile,
  isStoredProfileComplete,
  saveStoredProfile,
  type StoredProfile,
} from "@/lib/profile-storage";

const years = [
  { value: "1", label: "1st Year" },
  { value: "2", label: "2nd Year" },
  { value: "3", label: "3rd Year" },
  { value: "4", label: "4th Year" },
];

export default function ProfileScreen() {
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const bottomOffset = Platform.OS === "web" ? 120 : insets.bottom + 104;

  const [name, setName] = useState("");
  const [branchId, setBranchId] = useState("");
  const [year, setYear] = useState("");
  const [collegeName, setCollegeName] = useState("");
  const [email, setEmail] = useState("");
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [loadingProfile, setLoadingProfile] = useState(true);
  const [lastSavedAt, setLastSavedAt] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(true);

  const { data: branches = [] } = useQuery<Branch[]>({
    queryKey: ["/api/branches"],
  });

  useEffect(() => {
    let active = true;

    const loadProfile = async () => {
      try {
        const localProfile = await getStoredProfile();
        const user = auth.currentUser;
        let remoteProfile: Partial<StoredProfile> | null = null;

        if (user) {
          const snap = await db.collection("profiles").doc(user.uid).get();
          if (snap.exists) {
            remoteProfile = snap.data() as Partial<StoredProfile>;
          }
        }

        const profile: StoredProfile = {
          name: remoteProfile?.name || localProfile?.name || "",
          branchId: remoteProfile?.branchId || localProfile?.branchId || "",
          year: remoteProfile?.year || localProfile?.year || "",
          collegeName: remoteProfile?.collegeName || localProfile?.collegeName || "",
          email: remoteProfile?.email || localProfile?.email || user?.email || "",
          deviceId: localProfile?.deviceId || remoteProfile?.deviceId,
        };

        if (!active) {
          return;
        }

        setName(profile.name);
        setBranchId(profile.branchId);
        setYear(profile.year);
        setCollegeName(profile.collegeName);
        setEmail(profile.email);

        if (isStoredProfileComplete(profile)) {
          setShowForm(false);
          setLastSavedAt(new Date().toLocaleString());
        }
      } catch (e) {
        console.error("Failed to load profile", e);
      } finally {
        if (active) {
          setLoadingProfile(false);
        }
      }
    };

    loadProfile();

    return () => {
      active = false;
    };
  }, []);

  const handleSave = async () => {
    const deviceId = await getOrCreateProfileDeviceId();
    const normalizedEmail = email.trim() || auth.currentUser?.email || "";
    const profile: StoredProfile = {
      name: name.trim(),
      branchId,
      year,
      collegeName: collegeName.trim(),
      email: normalizedEmail,
      deviceId,
    };

    if (!isStoredProfileComplete(profile)) {
      Alert.alert("Missing info", "Please fill all fields.");
      return;
    }

    setSaving(true);

    try {
      const user = auth.currentUser;
      await apiRequest("POST", "/api/profile", {
        ...profile,
        email: normalizedEmail,
        firebaseUid: user?.uid || null,
      });
      await saveStoredProfile(profile);

      if (user) {
        await db.collection("profiles").doc(user.uid).set(
          {
            ...profile,
            email: normalizedEmail,
            firebaseUid: user.uid,
            createdAt: firebase.firestore.FieldValue.serverTimestamp(),
            updatedAt: firebase.firestore.FieldValue.serverTimestamp(),
          },
          { merge: true },
        );
      }

      setName(profile.name);
      setCollegeName(profile.collegeName);
      setEmail(profile.email);
      setLastSavedAt(new Date().toLocaleString());
      setShowForm(false);
      Alert.alert("Success", "Profile saved successfully!");
    } catch (e: any) {
      Alert.alert("Save failed", e.message);
    } finally {
      setSaving(false);
    }
  };

  const handleEditProfile = () => {
    setShowForm(true);
  };

  const resetProfileState = () => {
    setName("");
    setBranchId("");
    setYear("");
    setCollegeName("");
    setEmail(auth.currentUser?.email || "");
    setLastSavedAt(null);
    setShowForm(true);
  };

  const deleteFirestoreProfiles = async (deviceId?: string | null, firebaseUid?: string | null) => {
    const refs = new Map<string, firebase.firestore.DocumentReference>();

    if (firebaseUid) {
      refs.set(firebaseUid, db.collection("profiles").doc(firebaseUid));

      const firebaseUidSnap = await db.collection("profiles").where("firebaseUid", "==", firebaseUid).get();
      firebaseUidSnap.docs.forEach((doc) => refs.set(doc.id, doc.ref));
    }

    if (deviceId) {
      const deviceSnap = await db.collection("profiles").where("deviceId", "==", deviceId).get();
      deviceSnap.docs.forEach((doc) => refs.set(doc.id, doc.ref));
    }

    if (!refs.size) {
      return 0;
    }

    const batch = db.batch();
    refs.forEach((ref) => batch.delete(ref));
    await batch.commit();
    return refs.size;
  };

  const performDeleteProfile = async () => {
    setDeleting(true);
    try {
      const localProfile = await getStoredProfile();
      const user = auth.currentUser;

      const localDeleted = await deleteFirestoreProfiles(localProfile?.deviceId || null, user?.uid || null).catch(() => 0);

      let apiDeleted = 0;
      try {
        const response = await apiRequest("POST", "/api/profile/delete", {
          deviceId: localProfile?.deviceId || null,
          firebaseUid: user?.uid || null,
        });
        const result = await response.json();
        apiDeleted = Number(result?.deleted || 0);
      } catch {
        apiDeleted = 0;
      }

      await clearStoredProfile();
      resetProfileState();

      const removed = Math.max(localDeleted, apiDeleted);
      Alert.alert("Deleted", `Your profile has been deleted.${removed ? ` Removed records: ${removed}` : ""}`);
    } catch (e: any) {
      Alert.alert("Delete failed", e.message);
    } finally {
      setDeleting(false);
    }
  };

  const handleDeleteProfile = () => {
    const message = "This will remove your saved profile. You can create it again later.";

    if (Platform.OS === "web") {
      const confirmed = globalThis.confirm?.(`Delete Profile\n\n${message}`) ?? true;
      if (!confirmed) return;
      performDeleteProfile();
      return;
    }

    Alert.alert("Delete Profile", message, [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: () => {
          performDeleteProfile();
        },
      },
    ]);
  };

  if (loadingProfile) {
    return (
      <View style={[styles.container, { justifyContent: "center", alignItems: "center" }]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  const selectedBranch = branches.find((b) => b.id === branchId);

  return (
    <ScrollView
      contentContainerStyle={[
        styles.container,
        { paddingTop: insets.top + 16, paddingBottom: bottomOffset },
      ]}
      keyboardShouldPersistTaps="handled"
      contentInsetAdjustmentBehavior="automatic"
      showsVerticalScrollIndicator={false}
    >
      {showForm ? (
        <>
          <LinearGradient
            colors={[colors.primary + "20", colors.background]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.headerGradient}
          >
            <Text style={styles.header}>Create Your Profile</Text>
            <Text style={styles.heroTitle}>Personalize Your Experience</Text>
            <Text style={styles.heroSubtitle}>
              Tell us about yourself to keep your study profile ready
            </Text>
          </LinearGradient>

          <View style={styles.card}>
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

            <Text style={styles.sectionTitle}>Select Your Year</Text>
            <View style={styles.semesterRow}>
              {years.map((s) => (
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
            <TextInput
              style={styles.input}
              placeholder="Email Address"
              placeholderTextColor={colors.textMuted}
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
            />
            <Pressable style={styles.primaryBtn} onPress={handleSave} disabled={saving}>
              <Text style={styles.primaryBtnText}>{saving ? "Saving..." : "Save Profile"}</Text>
            </Pressable>
          </View>
        </>
      ) : (
        <>
          <LinearGradient
            colors={[selectedBranch?.color + "25" || colors.primary + "25", colors.background]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.profileHeaderGradient}
          >
            <View style={styles.profileHeader}>
              <View style={[styles.avatarCircle, { backgroundColor: selectedBranch?.color || colors.primary }]}>
                <Text style={styles.avatarText}>{name.charAt(0).toUpperCase()}</Text>
              </View>
              <View style={styles.profileInfo}>
                <Text style={styles.profileName}>{name}</Text>
                <Text style={styles.profileBranch}>{selectedBranch?.shortName || branchId}</Text>
                <Text style={styles.profileYear}>Year {year}</Text>
              </View>
            </View>
          </LinearGradient>

          <View style={styles.detailsCard}>
            <View style={styles.detailRow}>
              <View style={styles.detailIconBox}>
                <Feather name="book" size={20} color={colors.primary} />
              </View>
              <View style={styles.detailContent}>
                <Text style={styles.detailLabel}>Branch</Text>
                <Text style={styles.detailValue}>{selectedBranch?.name || branchId}</Text>
              </View>
            </View>

            <View style={styles.detailRow}>
              <View style={styles.detailIconBox}>
                <Feather name="calendar" size={20} color={colors.primary} />
              </View>
              <View style={styles.detailContent}>
                <Text style={styles.detailLabel}>Current Year</Text>
                <Text style={styles.detailValue}>Year {year}</Text>
              </View>
            </View>

            <View style={styles.detailRow}>
              <View style={styles.detailIconBox}>
                <Feather name="building" size={20} color={colors.primary} />
              </View>
              <View style={styles.detailContent}>
                <Text style={styles.detailLabel}>College</Text>
                <Text style={styles.detailValue}>{collegeName}</Text>
              </View>
            </View>

            <View style={styles.detailRow}>
              <View style={styles.detailIconBox}>
                <Feather name="mail" size={20} color={colors.primary} />
              </View>
              <View style={styles.detailContent}>
                <Text style={styles.detailLabel}>Email</Text>
                <Text style={styles.detailValue}>{email}</Text>
              </View>
            </View>
            {lastSavedAt ? <Text style={styles.savedAtText}>Last saved: {lastSavedAt}</Text> : null}
          </View>

          <View style={styles.actionButtons}>
            <Pressable style={styles.primaryBtn} onPress={handleEditProfile}>
              <Feather name="edit-2" size={16} color="white" />
              <Text style={styles.primaryBtnText}>Edit Profile</Text>
            </Pressable>
            <Pressable style={styles.deleteBtn} onPress={handleDeleteProfile} disabled={deleting}>
              <Feather name="trash-2" size={16} color="white" />
              <Text style={styles.primaryBtnText}>{deleting ? "Deleting..." : "Delete Profile"}</Text>
            </Pressable>
          </View>
        </>
      )}
    </ScrollView>
  );
}

function makeStyles(colors: ReturnType<typeof useTheme>["colors"]) {
  return StyleSheet.create({
    container: {
      paddingHorizontal: 20,
      backgroundColor: colors.background,
      flexGrow: 1,
    },
    headerGradient: {
      borderRadius: 20,
      padding: 24,
      marginBottom: 20,
      overflow: "hidden",
    },
    header: {
      fontFamily: "Inter_600SemiBold",
      fontSize: 14,
      color: colors.primary,
      textAlign: "center",
      marginBottom: 8,
      letterSpacing: 1,
    },
    heroTitle: {
      fontFamily: "Inter_700Bold",
      fontSize: 26,
      color: colors.text,
      textAlign: "center",
      marginBottom: 8,
    },
    heroSubtitle: {
      fontFamily: "Inter_400Regular",
      fontSize: 13,
      color: colors.textSecondary,
      textAlign: "center",
    },
    card: {
      backgroundColor: colors.card,
      borderColor: colors.cardBorder,
      borderWidth: 1,
      borderRadius: 18,
      padding: 16,
      gap: 12,
      marginBottom: 16,
    },
    sectionTitle: {
      fontFamily: "Inter_600SemiBold",
      fontSize: 16,
      color: colors.text,
      marginTop: 6,
    },
    subText: {
      fontFamily: "Inter_400Regular",
      fontSize: 12,
      color: colors.textSecondary,
    },
    input: {
      borderWidth: 1,
      borderColor: colors.cardBorder,
      backgroundColor: colors.background,
      borderRadius: 10,
      paddingHorizontal: 12,
      paddingVertical: 10,
      fontFamily: "Inter_400Regular",
      color: colors.text,
    },
    primaryBtn: {
      backgroundColor: colors.primary,
      borderRadius: 10,
      paddingVertical: 12,
      paddingHorizontal: 14,
      alignItems: "center",
      justifyContent: "center",
      flexDirection: "row",
      gap: 8,
    },
    deleteBtn: {
      backgroundColor: colors.danger,
      borderRadius: 10,
      paddingVertical: 12,
      paddingHorizontal: 14,
      alignItems: "center",
      justifyContent: "center",
      flexDirection: "row",
      gap: 8,
    },
    primaryBtnText: {
      fontFamily: "Inter_600SemiBold",
      color: "white",
    },
    grid: {
      flexDirection: "row",
      flexWrap: "wrap",
      gap: 12,
    },
    cardItem: {
      flexBasis: "48%",
      flexGrow: 1,
      minWidth: 140,
      borderRadius: 18,
      padding: 14,
      borderWidth: 2,
      borderColor: colors.cardBorder,
      backgroundColor: colors.card,
      alignItems: "center",
      gap: 10,
    },
    cardItemActive: {
      borderColor: colors.primary,
      backgroundColor: colors.primary + "18",
    },
    cardIcon: {
      width: 44,
      height: 44,
      borderRadius: 22,
      backgroundColor: colors.primary + "15",
      alignItems: "center",
      justifyContent: "center",
    },
    cardIconActive: {
      backgroundColor: colors.primary,
    },
    cardIconText: {
      fontFamily: "Inter_600SemiBold",
      fontSize: 12,
      color: colors.primary,
    },
    cardIconTextActive: {
      color: "white",
    },
    cardText: {
      fontFamily: "Inter_600SemiBold",
      fontSize: 12,
      color: colors.text,
      textAlign: "center",
    },
    cardTextActive: {
      color: colors.text,
    },
    semesterRow: {
      flexDirection: "row",
      flexWrap: "wrap",
      gap: 10,
    },
    semesterChip: {
      flexBasis: "48%",
      flexGrow: 1,
      minWidth: 130,
      paddingHorizontal: 16,
      paddingVertical: 12,
      borderRadius: 14,
      borderWidth: 1,
      borderColor: colors.cardBorder,
      backgroundColor: colors.card,
      alignItems: "center",
    },
    semesterChipActive: {
      backgroundColor: colors.primary,
      borderColor: colors.primary,
    },
    semesterText: {
      fontFamily: "Inter_600SemiBold",
      fontSize: 12,
      color: colors.text,
    },
    semesterTextActive: {
      color: "white",
    },
    // Profile Display Styles
    profileHeaderGradient: {
      borderRadius: 20,
      padding: 24,
      marginBottom: 20,
      overflow: "hidden",
    },
    profileHeader: {
      alignItems: "center",
      gap: 16,
    },
    avatarCircle: {
      width: 80,
      height: 80,
      borderRadius: 40,
      alignItems: "center",
      justifyContent: "center",
    },
    avatarText: {
      fontFamily: "Inter_700Bold",
      fontSize: 32,
      color: "white",
    },
    profileInfo: {
      alignItems: "center",
      gap: 4,
    },
    profileName: {
      fontFamily: "Inter_700Bold",
      fontSize: 22,
      color: colors.text,
    },
    profileBranch: {
      fontFamily: "Inter_600SemiBold",
      fontSize: 14,
      color: colors.primary,
    },
    profileYear: {
      fontFamily: "Inter_500Medium",
      fontSize: 12,
      color: colors.textSecondary,
    },
    detailsCard: {
      backgroundColor: colors.card,
      borderColor: colors.cardBorder,
      borderWidth: 1,
      borderRadius: 16,
      padding: 16,
      gap: 16,
      marginBottom: 20,
    },
    detailRow: {
      flexDirection: "row",
      gap: 12,
      alignItems: "center",
    },
    detailIconBox: {
      width: 40,
      height: 40,
      borderRadius: 10,
      backgroundColor: colors.primary + "15",
      alignItems: "center",
      justifyContent: "center",
    },
    detailContent: {
      flex: 1,
      gap: 2,
    },
    detailLabel: {
      fontFamily: "Inter_500Medium",
      fontSize: 12,
      color: colors.textSecondary,
    },
    detailValue: {
      fontFamily: "Inter_600SemiBold",
      fontSize: 14,
      color: colors.text,
    },
    savedAtText: {
      fontFamily: "Inter_400Regular",
      fontSize: 12,
      color: colors.textSecondary,
      marginTop: 2,
    },
    actionButtons: {
      gap: 10,
      marginTop: 10,
    },
  });
}
