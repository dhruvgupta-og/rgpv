import { Alert } from "react-native";
import { doc, getDoc } from "firebase/firestore";
import { auth, db } from "@/lib/firebase-client";

export async function ensureProfileComplete(onIncomplete?: () => void) {
  const user = auth.currentUser;
  if (!user) {
    Alert.alert("Login required", "Please sign in to continue.");
    onIncomplete?.();
    return false;
  }
  const snap = await getDoc(doc(db, "profiles", user.uid));
  const data = snap.exists() ? (snap.data() as any) : {};
  const ok = !!data?.name && !!data?.branchId && !!data?.year && !!data?.collegeName;
  if (!ok) {
    Alert.alert("Complete profile", "Please fill your profile to access papers.");
    onIncomplete?.();
    return false;
  }
  return true;
}
