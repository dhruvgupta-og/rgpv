import AsyncStorage from "@react-native-async-storage/async-storage";
import * as FileSystem from "expo-file-system";
import * as Sharing from "expo-sharing";
import { Linking, Platform } from "react-native";

const DOWNLOADS_KEY = "rgpv_downloads";
const DOWNLOADS_DIR = FileSystem.documentDirectory + "papers/";

export type DownloadItem = {
  id: string;
  subjectId: string;
  title: string;
  year: string;
  month: string;
  examType: string;
  remoteUrl: string;
  localUri: string;
  createdAt: string;
};

async function ensureDir() {
  const dirInfo = await FileSystem.getInfoAsync(DOWNLOADS_DIR);
  if (!dirInfo.exists) {
    await FileSystem.makeDirectoryAsync(DOWNLOADS_DIR, { intermediates: true });
  }
}

export async function getDownloads(): Promise<DownloadItem[]> {
  const raw = await AsyncStorage.getItem(DOWNLOADS_KEY);
  if (!raw) return [];
  try {
    return JSON.parse(raw);
  } catch {
    return [];
  }
}

async function saveDownloads(items: DownloadItem[]) {
  await AsyncStorage.setItem(DOWNLOADS_KEY, JSON.stringify(items));
}

export async function isDownloaded(id: string): Promise<DownloadItem | null> {
  const items = await getDownloads();
  const item = items.find((d) => d.id === id);
  if (!item) return null;
  const info = await FileSystem.getInfoAsync(item.localUri);
  if (!info.exists) return null;
  return item;
}

export async function downloadPaper(item: Omit<DownloadItem, "localUri" | "createdAt">) {
  await ensureDir();
  const fileName = `${item.id}-${item.year}-${item.month}.pdf`;
  const localUri = DOWNLOADS_DIR + fileName;
  const result = await FileSystem.downloadAsync(item.remoteUrl, localUri);
  const downloads = await getDownloads();
  const next: DownloadItem = { ...item, localUri: result.uri, createdAt: new Date().toISOString() };
  await saveDownloads([next, ...downloads.filter((d) => d.id !== item.id)]);
  return next;
}

export async function removeDownload(id: string) {
  const downloads = await getDownloads();
  const target = downloads.find((d) => d.id === id);
  if (target) {
    const info = await FileSystem.getInfoAsync(target.localUri);
    if (info.exists) await FileSystem.deleteAsync(target.localUri, { idempotent: true });
  }
  await saveDownloads(downloads.filter((d) => d.id !== id));
}

export async function openDownload(item: DownloadItem) {
  if (Platform.OS === "android") {
    const contentUri = await FileSystem.getContentUriAsync(item.localUri);
    await Linking.openURL(contentUri);
  } else {
    await Linking.openURL(item.localUri);
  }
}

export async function shareDownload(item: DownloadItem) {
  if (await Sharing.isAvailableAsync()) {
    await Sharing.shareAsync(item.localUri);
  } else {
    await Linking.openURL(item.localUri);
  }
}
