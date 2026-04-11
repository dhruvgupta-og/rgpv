import { QueryClientProvider } from "@tanstack/react-query";
import { Stack, usePathname, useRouter } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import React, { useEffect } from "react";
import * as Notifications from "expo-notifications";
import * as Device from "expo-device";
import { ActivityIndicator, Platform, Pressable, Text, View, AppState } from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { KeyboardProvider } from "react-native-keyboard-controller";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { queryClient, apiRequest } from "@/lib/query-client";
import { BookmarksProvider } from "@/lib/bookmarks";
import { useFonts, Inter_400Regular, Inter_500Medium, Inter_600SemiBold, Inter_700Bold } from "@expo-google-fonts/inter";
import { StatusBar } from "expo-status-bar";
import { ThemeProvider, useTheme } from "@/lib/theme";
import { auth, db, firebase } from "@/lib/firebase-client";
import * as Google from "expo-auth-session/providers/google";
import * as WebBrowser from "expo-web-browser";
import { LinearGradient } from "expo-linear-gradient";
import * as ScreenCapture from "expo-screen-capture";
import * as AuthSession from "expo-auth-session";
import Constants from "expo-constants";
import { getStoredProfile, isStoredProfileComplete } from "@/lib/profile-storage";
import { analytics } from "@/lib/analytics";

WebBrowser.maybeCompleteAuthSession();

SplashScreen.preventAutoHideAsync();

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

function RootLayoutNav() {
  return (
    <Stack screenOptions={{ headerBackTitle: "Back", headerShown: false }}>
      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      <Stack.Screen name="branch/[id]" options={{ headerShown: false }} />
      <Stack.Screen name="subject/[id]" options={{ headerShown: false }} />
      <Stack.Screen name="admin" options={{ headerShown: false }} />
    </Stack>
  );
}

function ThemedStatusBar() {
  const { mode } = useTheme();
  return <StatusBar style={mode === "dark" ? "light" : "dark"} />;
}

function AuthGate() {
  const { colors } = useTheme();
  const router = useRouter();
  const pathname = usePathname();
  const hasRedirectedRef = React.useRef(false);
  const [user, setUser] = React.useState<firebase.User | null>(null);
  const [authReady, setAuthReady] = React.useState(false);
  const [profileReady, setProfileReady] = React.useState(false);
  const [profileComplete, setProfileComplete] = React.useState(true);
  const appStateRef = React.useRef(AppState.currentState);
  const screenStartTimeRef = React.useRef(Date.now());
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

  React.useEffect(() => {
    return auth.onAuthStateChanged((u) => {
      setUser(u);
      setAuthReady(true);
      if (!u) {
        hasRedirectedRef.current = false;
      }
    });
  }, []);

  React.useEffect(() => {
    if (!user) {
      setProfileReady(true);
      setProfileComplete(true);
      return;
    }
    setProfileReady(false);
    let active = true;
    let unsubscribe = () => {};

    const syncProfileState = async (remoteData?: any) => {
      const localProfile = await getStoredProfile();
      const localComplete = isStoredProfileComplete(localProfile);
      const remoteComplete = !!remoteData?.name && !!remoteData?.branchId && !!remoteData?.year && !!remoteData?.collegeName && !!remoteData?.email;
      const isComplete = remoteComplete || localComplete;

      if (!active) return;

      setProfileComplete(isComplete);
      setProfileReady(true);

      if (!isComplete) {
        router.replace("/profile");
      }
    };

    (async () => {
      await syncProfileState();

      const ref = db.collection("profiles").doc(user.uid);
      unsubscribe = ref.onSnapshot(
        (snap) => {
          const data = snap.exists ? (snap.data() as any) : {};
          syncProfileState(data);
        },
        () => {
          syncProfileState();
        },
      );
    })();

    return () => {
      active = false;
      unsubscribe();
    };
  }, [user, router]);

  React.useEffect(() => {
    if (response?.type === "success") {
      const idToken = response.authentication?.idToken;
      const accessToken = response.authentication?.accessToken;
      if (!idToken && !accessToken) return;
      const credential = firebase.auth.GoogleAuthProvider.credential(idToken, accessToken);
      auth.signInWithCredential(credential).catch(() => {});
    }
  }, [response]);

  React.useEffect(() => {
    if (user && !hasRedirectedRef.current && pathname !== "/profile") {
      hasRedirectedRef.current = true;
      router.replace("/profile");
    }
  }, [user, pathname, router]);

  // Track page views
  React.useEffect(() => {
    analytics.trackPageView(pathname, pathname).catch(() => {});
  }, [pathname]);

  // Handle app state changes for session tracking
  React.useEffect(() => {
    const subscription = AppState.addEventListener("change", handleAppStateChange);
    return () => subscription.remove();
  }, []);

  const handleAppStateChange = async (state: string) => {
    if (appStateRef.current.match(/inactive|background/) && state === "active") {
      // App has come to foreground
      analytics.initialize().catch(() => {});
    } else if (state.match(/inactive|background/)) {
      // App has gone to background
      analytics.endSession().catch(() => {});
    }
    appStateRef.current = state;
  };

  if (user) {
    return (
      <View style={{ flex: 1 }}>
        <RootLayoutNav />
        {!profileReady ? (
          <View
            style={{
              position: "absolute",
              inset: 0,
              backgroundColor: colors.background + "F2",
              alignItems: "center",
              justifyContent: "center",
              padding: 24,
            }}
          >
            <ActivityIndicator size="large" color={colors.primary} />
            <Text style={{ fontFamily: "Inter_500Medium", marginTop: 10, color: colors.text }}>
              Checking your profile...
            </Text>
          </View>
        ) : null}
        {profileReady && !profileComplete && pathname !== "/profile" ? (
          <View
            style={{
              position: "absolute",
              inset: 0,
              backgroundColor: colors.background + "F2",
              alignItems: "center",
              justifyContent: "center",
              padding: 24,
            }}
          >
            <View
              style={{
                width: "100%",
                maxWidth: 420,
                borderRadius: 20,
                padding: 20,
                backgroundColor: colors.card,
                borderWidth: 1,
                borderColor: colors.cardBorder,
              }}
            >
              <Text style={{ fontFamily: "Inter_700Bold", fontSize: 20, color: colors.text, marginBottom: 6 }}>
                Complete Your Profile
              </Text>
              <Text style={{ fontFamily: "Inter_400Regular", fontSize: 12, color: colors.textSecondary, marginBottom: 14 }}>
                Please fill your name, branch, year, college, and email to continue.
              </Text>
              <Pressable
                onPress={() => router.replace("/profile")}
                style={{
                  backgroundColor: colors.primary,
                  borderRadius: 12,
                  paddingVertical: 10,
                  alignItems: "center",
                }}
              >
                <Text style={{ fontFamily: "Inter_600SemiBold", color: "white" }}>Go to Profile</Text>
              </Pressable>
            </View>
          </View>
        ) : null}
      </View>
    );
  }

  return <RootLayoutNav />;
}

async function registerForPushNotifications() {
  if (!Device.isDevice) return;

  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  let finalStatus = existingStatus;
  if (existingStatus !== "granted") {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }
  if (finalStatus !== "granted") return;

  if (Platform.OS === "android") {
    await Notifications.setNotificationChannelAsync("default", {
      name: "default",
      importance: Notifications.AndroidImportance.DEFAULT,
    });
  }

  const token = await Notifications.getExpoPushTokenAsync();
  await apiRequest("POST", "/api/push/register", {
    token: token.data,
    platform: Platform.OS,
    deviceId: Device.modelId || Device.deviceName || "unknown",
  });
}

export default function RootLayout() {
  const [fontsLoaded] = useFonts({
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
    Inter_700Bold,
  });

  useEffect(() => {
    if (fontsLoaded) {
      SplashScreen.hideAsync();
    }
  }, [fontsLoaded]);

  useEffect(() => {
    if (fontsLoaded) {
      registerForPushNotifications().catch(() => {});
    }
  }, [fontsLoaded]);

  useEffect(() => {
    if (fontsLoaded && Platform.OS !== "web") {
      ScreenCapture.preventScreenCaptureAsync().catch(() => {});
    }
  }, [fontsLoaded]);

  useEffect(() => {
    if (fontsLoaded) {
      analytics.initialize().catch(() => {});
    }
  }, [fontsLoaded]);

  if (!fontsLoaded) return null;

  return (
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <GestureHandlerRootView>
          <KeyboardProvider>
            <BookmarksProvider>
              <ThemeProvider>
                <ThemedStatusBar />
                <AuthGate />
              </ThemeProvider>
            </BookmarksProvider>
          </KeyboardProvider>
        </GestureHandlerRootView>
      </QueryClientProvider>
    </ErrorBoundary>
  );
}
