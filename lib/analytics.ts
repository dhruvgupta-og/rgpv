import * as SecureStore from "expo-secure-store";
import { v4 as uuidv4 } from "uuid";
import * as Device from "expo-device";
import Constants from "expo-constants";
import { getApiUrl } from "./query-client";

// Storage keys
const SESSION_ID_KEY = "analytics_session_id";
const DEVICE_ID_KEY = "analytics_device_id";
const SESSION_START_TIME_KEY = "analytics_session_start";

interface AnalyticsEvent {
  type: "page_view" | "interaction" | "content_view" | "session_start" | "session_end";
  data: any;
}

class Analytics {
  private sessionId: string | null = null;
  private deviceId: string | null = null;
  private sessionStartTime: number = 0;
  private currentPage: string | null = null;
  private pageStartTime: number = 0;
  private eventQueue: AnalyticsEvent[] = [];
  private isInitialized = false;

  async initialize() {
    if (this.isInitialized) return;

    try {
      // Get or create device ID
      this.deviceId = await SecureStore.getItemAsync(DEVICE_ID_KEY);
      if (!this.deviceId) {
        this.deviceId = uuidv4();
        await SecureStore.setItemAsync(DEVICE_ID_KEY, this.deviceId);
      }

      // Get or create session ID
      this.sessionId = await SecureStore.getItemAsync(SESSION_ID_KEY);
      if (!this.sessionId) {
        this.sessionId = uuidv4();
        await SecureStore.setItemAsync(SESSION_ID_KEY, this.sessionId);
      }

      // Get session start time
      const startTimeStr = await SecureStore.getItemAsync(SESSION_START_TIME_KEY);
      this.sessionStartTime = startTimeStr ? parseInt(startTimeStr) : Date.now();
      if (!startTimeStr) {
        await SecureStore.setItemAsync(SESSION_START_TIME_KEY, this.sessionStartTime.toString());
      }

      this.isInitialized = true;

      // Track session start
      this.trackSessionStart();
    } catch (error) {
      console.error("Analytics initialization error:", error);
    }
  }

  private async trackSessionStart() {
    try {
      await fetch(getApiUrl() + "api/analytics/session-start", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          deviceId: this.deviceId,
          sessionId: this.sessionId,
          appVersion: Constants.expoConfig?.version || "unknown",
          osVersion: Device.osVersion || "unknown",
          deviceModel: Device.modelName || "unknown",
        }),
      }).catch(() => {}); // Silently fail if offline
    } catch (error) {
      console.error("Session start tracking error:", error);
    }
  }

  async trackPageView(screen: string, page: string, metadata?: any) {
    if (!this.isInitialized) await this.initialize();

    // Calculate duration of previous page
    if (this.currentPage && this.pageStartTime) {
      const duration = Date.now() - this.pageStartTime;
      this.queueEvent({
        type: "page_view",
        data: {
          deviceId: this.deviceId,
          sessionId: this.sessionId,
          page: this.currentPage,
          screen: this.currentPage,
          durationMs: duration,
          metadata,
        },
      });
    }

    // Track new page
    this.currentPage = screen;
    this.pageStartTime = Date.now();

    try {
      await fetch(getApiUrl() + "api/analytics/page-view", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          deviceId: this.deviceId,
          sessionId: this.sessionId,
          page,
          screen,
          metadata,
        }),
      }).catch(() => {}); // Silently fail if offline
    } catch (error) {
      console.error("Page view tracking error:", error);
    }
  }

  async trackInteraction(interactionType: string, screen: string, targetId?: string, targetType?: string, metadata?: any) {
    if (!this.isInitialized) await this.initialize();

    try {
      await fetch(getApiUrl() + "api/analytics/interaction", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          deviceId: this.deviceId,
          sessionId: this.sessionId,
          interactionType,
          screen,
          targetId,
          targetType,
          metadata,
        }),
      }).catch(() => {}); // Silently fail if offline
    } catch (error) {
      console.error("Interaction tracking error:", error);
    }
  }

  async trackContentView(contentType: string, contentId: string, contentName?: string, metadata?: any) {
    if (!this.isInitialized) await this.initialize();

    try {
      await fetch(getApiUrl() + "api/analytics/content-view", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          deviceId: this.deviceId,
          sessionId: this.sessionId,
          contentType,
          contentId,
          contentName,
          metadata,
        }),
      }).catch(() => {}); // Silently fail if offline
    } catch (error) {
      console.error("Content view tracking error:", error);
    }
  }

  async endSession() {
    if (!this.isInitialized || !this.sessionId) return;

    try {
      const duration = Date.now() - this.sessionStartTime;
      await fetch(getApiUrl() + "api/analytics/session-end", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          deviceId: this.deviceId,
          sessionId: this.sessionId,
          totalDurationMs: duration,
        }),
      }).catch(() => {}); // Silently fail if offline

      // Reset session
      await SecureStore.deleteItemAsync(SESSION_ID_KEY);
      await SecureStore.deleteItemAsync(SESSION_START_TIME_KEY);
      this.sessionId = null;
      this.sessionStartTime = 0;
    } catch (error) {
      console.error("Session end tracking error:", error);
    }
  }

  private queueEvent(event: AnalyticsEvent) {
    this.eventQueue.push(event);
    if (this.eventQueue.length >= 10) {
      this.flushEvents();
    }
  }

  private async flushEvents() {
    if (this.eventQueue.length === 0) return;

    try {
      const eventsToSend = [...this.eventQueue];
      this.eventQueue = [];

      await fetch(getApiUrl() + "api/analytics/batch", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ events: eventsToSend }),
      }).catch(() => {
        // Re-queue events if batch fails
        this.eventQueue = eventsToSend;
      });
    } catch (error) {
      console.error("Batch event flush error:", error);
    }
  }

  getDeviceId() {
    return this.deviceId;
  }

  getSessionId() {
    return this.sessionId;
  }
}

export const analytics = new Analytics();
