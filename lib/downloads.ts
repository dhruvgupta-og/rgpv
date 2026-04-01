import AsyncStorage from "@react-native-async-storage/async-storage";
import * as FileSystem from "expo-file-system/legacy";
import { Platform } from "react-native";

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
  storageType?: "local" | "remote";
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
    const parsed = JSON.parse(raw) as DownloadItem[];
    const validItems: DownloadItem[] = [];

    for (const item of parsed) {
      if (item.storageType === "remote") {
        validItems.push(item);
        continue;
      }
      const info = await FileSystem.getInfoAsync(item.localUri);
      if (info.exists) {
        validItems.push(item);
      }
    }

    if (validItems.length !== parsed.length) {
      await saveDownloads(validItems);
    }

    return validItems;
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
  if (item.storageType === "remote") return item;
  const info = await FileSystem.getInfoAsync(item.localUri);
  if (!info.exists) return null;
  return item;
}

export async function downloadPaper(item: Omit<DownloadItem, "localUri" | "createdAt">) {
  const downloads = await getDownloads();

  if (Platform.OS === "web") {
    const next: DownloadItem = {
      ...item,
      localUri: item.remoteUrl,
      storageType: "remote",
      createdAt: new Date().toISOString(),
    };
    await saveDownloads([next, ...downloads.filter((d) => d.id !== item.id)]);
    return next;
  }

  await ensureDir();
  const fileName = `${item.id}-${item.year}-${item.month}.pdf`;
  const localUri = DOWNLOADS_DIR + fileName;
  const result = await FileSystem.downloadAsync(item.remoteUrl, localUri);
  const next: DownloadItem = {
    ...item,
    localUri: result.uri,
    storageType: "local",
    createdAt: new Date().toISOString(),
  };
  await saveDownloads([next, ...downloads.filter((d) => d.id !== item.id)]);
  return next;
}

export async function removeDownload(id: string) {
  const downloads = await getDownloads();
  const target = downloads.find((d) => d.id === id);
  if (target && target.storageType !== "remote") {
    const info = await FileSystem.getInfoAsync(target.localUri);
    if (info.exists) await FileSystem.deleteAsync(target.localUri, { idempotent: true });
  }
  await saveDownloads(downloads.filter((d) => d.id !== id));
}
