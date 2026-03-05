import { auth, db } from "@/lib/firebase-client";

export async function ensureProfileComplete(onIncomplete?: () => void) {
  const user = auth.currentUser;
  if (!user) {
    onIncomplete?.();
    return true;
  }
  const snap = await db.collection("profiles").doc(user.uid).get();
  const data = snap.exists ? (snap.data() as any) : {};
  const ok = !!data?.name && !!data?.branchId && !!data?.year && !!data?.collegeName;
  if (!ok) {
    Alert.alert("Complete profile", "Please fill your profile to access papers.");
    onIncomplete?.();
    return false;
  }
  return true;
}
