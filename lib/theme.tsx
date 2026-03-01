import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { DarkColors, LightColors } from "@/constants/colors";

export type ThemeMode = "dark" | "light";

const THEME_KEY = "rgpv_theme_mode";

type ThemeContextValue = {
  mode: ThemeMode;
  colors: typeof DarkColors;
  toggle: () => void;
  setMode: (mode: ThemeMode) => void;
};

const ThemeContext = createContext<ThemeContextValue | null>(null);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [mode, setModeState] = useState<ThemeMode>("dark");

  useEffect(() => {
    AsyncStorage.getItem(THEME_KEY).then((value) => {
      if (value === "light" || value === "dark") {
        setModeState(value);
      }
    });
  }, []);

  const setMode = useCallback((next: ThemeMode) => {
    setModeState(next);
    AsyncStorage.setItem(THEME_KEY, next);
  }, []);

  const toggle = useCallback(() => {
    setMode(mode === "dark" ? "light" : "dark");
  }, [mode, setMode]);

  const colors = mode === "dark" ? DarkColors : LightColors;

  const value = useMemo(
    () => ({ mode, colors, toggle, setMode }),
    [mode, colors, toggle, setMode],
  );

  return React.createElement(ThemeContext.Provider, { value }, children);
}

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error("useTheme must be used within ThemeProvider");
  return ctx;
}
