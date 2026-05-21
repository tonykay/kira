import { createContext, useContext, useEffect, type ReactNode } from "react";
import { theme, type ThemeTokens } from "./themes";

interface ThemeContextValue {
  theme: ThemeTokens;
}

const ThemeContext = createContext<ThemeContextValue>({ theme });

export function useTheme() {
  return useContext(ThemeContext);
}

function applyTheme() {
  const root = document.documentElement;
  for (const [key, value] of Object.entries(theme)) {
    root.style.setProperty(key, value);
  }
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  useEffect(() => {
    applyTheme();
  }, []);

  return (
    <ThemeContext.Provider value={{ theme }}>
      {children}
    </ThemeContext.Provider>
  );
}
