import React, { createContext, useContext, useState, useCallback } from 'react';
import { colors, getThemeColors } from './colors';
import type { ThemeMode } from './colors';

interface ThemeContextValue {
  mode: ThemeMode;
  toggle: () => void;
  colors: ReturnType<typeof getThemeColors>;
  brand: typeof colors.brand;
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

/**
 * Prava ThemeProvider
 * Injects CSS custom properties for the active theme mode onto :root
 */
export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [mode, setMode] = useState<ThemeMode>('light');

  const toggle = useCallback(() => {
    setMode(prev => (prev === 'light' ? 'dark' : 'light'));
  }, []);

  const themeColors = getThemeColors(mode);

  const value: ThemeContextValue = {
    mode,
    toggle,
    colors: themeColors,
    brand: colors.brand,
  };

  return (
    <ThemeContext.Provider value={value}>
      {children}
    </ThemeContext.Provider>
  );
};

export function useTheme(): ThemeContextValue {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useTheme must be used within ThemeProvider');
  return ctx;
}
