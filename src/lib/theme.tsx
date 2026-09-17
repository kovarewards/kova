import { createContext, useContext, useEffect, useMemo, useState, ReactNode } from 'react';
import { useColorScheme } from 'react-native';
import * as SecureStore from 'expo-secure-store';
import { dark, light } from '../constants/theme';

export type ThemeTokens = typeof dark;
export type ThemeMode = 'light' | 'dark' | 'system';

const STORAGE_KEY = 'kova_theme_mode';

export type ThemeContextValue = {
  mode: ThemeMode;
  scheme: 'light' | 'dark';
  theme: ThemeTokens;
  setMode: (mode: ThemeMode) => void;
};

export const ThemeContext = createContext<ThemeContextValue | null>(null);

export function ThemeProvider({ children }: { children: ReactNode }) {
  const systemScheme = useColorScheme();
  const [mode, setModeState] = useState<ThemeMode>('system');

  useEffect(() => {
    SecureStore.getItemAsync(STORAGE_KEY).then((stored) => {
      if (stored === 'light' || stored === 'dark' || stored === 'system') setModeState(stored);
    });
  }, []);

  function setMode(next: ThemeMode) {
    setModeState(next);
    SecureStore.setItemAsync(STORAGE_KEY, next);
  }

  const scheme: 'light' | 'dark' = mode === 'system' ? (systemScheme === 'light' ? 'light' : 'dark') : mode;
  const theme = scheme === 'light' ? light : dark;

  const value = useMemo(() => ({ mode, scheme, theme, setMode }), [mode, scheme, theme]);

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme(): ThemeContextValue {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useTheme must be used within ThemeProvider');
  return ctx;
}
