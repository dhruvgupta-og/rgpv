import { QueryClientProvider } from "@tanstack/react-query";
import { Stack, usePathname, useRouter } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import React, { useEffect } from "react";
import * as Notifications from "expo-notifications";
import * as Device from "expo-device";
import { ActivityIndicator, Platform, Pressable, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
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
  const googleWebClientId = process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID || undefined;
  const googleAndroidClientId = process.env.EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID || undefined;
  const isExpoGo = Constants.appOwnership === "expo" || Constants.executionEnvironment === "storeClient";
  const useProxy = isExpoGo;
  const redirectUri = AuthSession.makeRedirectUri({
    useProxy,
    scheme: "myapp",
    projectNameForProxy: "@dhruvhereyo0s-organization/rgpv-pyq",
  });
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
    const ref = db.collection("profiles").doc(user.uid);
    const unsubscribe = ref.onSnapshot(
      (snap) => {
        const data = snap.exists ? (snap.data() as any) : {};
        const isComplete = !!data?.name && !!data?.branchId && !!data?.year && !!data?.collegeName;
        setProfileComplete(isComplete);
        setProfileReady(true);
        if (!isComplete) {
          router.replace("/profile");
        }
      },
      () => {
        setProfileComplete(false);
        setProfileReady(true);
      },
    );
    return () => unsubscribe();
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
        {profileReady && !profileComplete ? (
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
                Please fill your name, branch, year, and college to continue.
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

  return (
    <View style={{ flex: 1, backgroundColor: "#F5F8FC" }}>
      {!authReady ? (
        <View
          style={{
            position: "absolute",
            inset: 0,
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <ActivityIndicator size="large" color="#2E8BFF" />
          <Text style={{ fontFamily: "Inter_500Medium", marginTop: 10, color: "#6B7A90" }}>
            Loading...
          </Text>
        </View>
      ) : null}
      <View style={{ flex: 1, padding: 24, alignItems: "center", justifyContent: "center" }}>
        <View style={{ alignItems: "center", marginBottom: 22 }}>
          <View
            style={{
              width: 72,
              height: 72,
              borderRadius: 18,
              backgroundColor: "#EAF2FF",
              borderWidth: 2,
              borderColor: "#D6E6FF",
              alignItems: "center",
              justifyContent: "center",
              marginBottom: 14,
            }}
          >
            <Ionicons name="school" size={28} color="#2E8BFF" />
          </View>
          <Text style={{ fontFamily: "Inter_700Bold", fontSize: 24, color: "#1E2A3A" }}>RGPV Resources</Text>
          <Text style={{ fontFamily: "Inter_500Medium", fontSize: 13, color: "#6B7A90", marginTop: 6 }}>
            Previous Papers • Notes • Syllabus
          </Text>
        </View>

        <View
          style={{
            width: "100%",
            maxWidth: 420,
            borderRadius: 22,
            padding: 18,
            backgroundColor: "white",
            borderWidth: 1,
            borderColor: "#E3ECF9",
            shadowColor: "#000",
            shadowOpacity: 0.06,
            shadowRadius: 12,
            elevation: 2,
          }}
        >
          <Text style={{ fontFamily: "Inter_500Medium", fontSize: 13, color: "#1E2A3A", textAlign: "center" }}>
            Get branch-wise PYQs, syllabus, and subject videos.
          </Text>
          <Text style={{ fontFamily: "Inter_400Regular", fontSize: 12, color: "#6B7A90", textAlign: "center", marginTop: 6 }}>
            Save your profile to filter content by semester and quickly access your most relevant papers.
          </Text>
          <Pressable
            onPress={async () => {
              if (Platform.OS === "web") {
                await auth.signInWithPopup(new firebase.auth.GoogleAuthProvider());
                return;
              }
              if (!googleAndroidClientId) return;
              await promptAsync(promptOptions);
            }}
            style={{
              borderRadius: 16,
              borderWidth: 1,
              borderColor: "#D6E6FF",
              paddingVertical: 12,
              alignItems: "center",
              backgroundColor: "#F7FAFF",
            }}
            disabled={!request && Platform.OS !== "web"}
          >
            <Text style={{ fontFamily: "Inter_600SemiBold", color: "#1E2A3A" }}>Continue with Google</Text>
          </Pressable>
          <Text
            style={{
              fontFamily: "Inter_400Regular",
              fontSize: 12,
              color: "#6B7A90",
              textAlign: "center",
              marginTop: 10,
            }}
          >
            Sign in to access your semester resources and exam papers.
          </Text>
        </View>

        <View
          style={{
            width: "100%",
            maxWidth: 420,
            borderRadius: 20,
            padding: 16,
            backgroundColor: "#F1F6FF",
            borderWidth: 1,
            borderColor: "#DDE9FF",
            marginTop: 16,
          }}
        >
          <Text style={{ fontFamily: "Inter_500Medium", fontSize: 11, color: "#6B7A90", textAlign: "center" }}>
            Disclaimer: This app is not affiliated with Rajiv Gandhi Proudyogiki Vishwavidyalaya (RGPV). It is an
            independent student resource platform.
          </Text>
        </View>
      </View>
    </View>
  );
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
