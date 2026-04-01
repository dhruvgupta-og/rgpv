import AsyncStorage from "@react-native-async-storage/async-storage";

export const PROFILE_STORAGE_KEY = "user_profile";
const PROFILE_DEVICE_KEY = "user_profile_device_id";

export interface StoredProfile {
  name: string;
  branchId: string;
  year: string;
  collegeName: string;
  email: string;
  deviceId?: string;
}

export function isStoredProfileComplete(profile: Partial<StoredProfile> | null | undefined) {
  return !!profile?.name && !!profile?.branchId && !!profile?.year && !!profile?.collegeName && !!profile?.email;
}

export async function getStoredProfile() {
  const stored = await AsyncStorage.getItem(PROFILE_STORAGE_KEY);
  if (!stored) return null;
  return JSON.parse(stored) as StoredProfile;
}

export async function saveStoredProfile(profile: StoredProfile) {
  await AsyncStorage.setItem(PROFILE_STORAGE_KEY, JSON.stringify(profile));
}

export async function clearStoredProfile() {
  await AsyncStorage.removeItem(PROFILE_STORAGE_KEY);
}

export async function getOrCreateProfileDeviceId() {
  const existing = await AsyncStorage.getItem(PROFILE_DEVICE_KEY);
  if (existing) return existing;
  const next = `profile-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
  await AsyncStorage.setItem(PROFILE_DEVICE_KEY, next);
  return next;
}
