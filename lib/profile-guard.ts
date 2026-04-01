import { Alert } from "react-native";
import { auth, db } from "@/lib/firebase-client";
import { getStoredProfile, isStoredProfileComplete } from "@/lib/profile-storage";

export async function ensureProfileComplete(onIncomplete?: () => void) {
  const localProfile = await getStoredProfile();
  if (isStoredProfileComplete(localProfile)) {
    return true;
  }

  const user = auth.currentUser;
  if (!user) {
    Alert.alert("Complete profile", "Please fill and save your profile to access content.");
    onIncomplete?.();
    return false;
  }

  const snap = await db.collection("profiles").doc(user.uid).get();
  const data = snap.exists ? (snap.data() as any) : {};
  const ok = isStoredProfileComplete(data);
  if (!ok) {
    Alert.alert("Complete profile", "Please fill and save your profile with email to access content.");
    onIncomplete?.();
    return false;
  }
  return true;
}
