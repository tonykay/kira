export interface ThemeTokens {
  "--kira-bg-page": string;
  "--kira-bg-card": string;
  "--kira-bg-input": string;
  "--kira-text-primary": string;
  "--kira-text-secondary": string;
  "--kira-text-muted": string;
  "--kira-border": string;
  "--kira-border-subtle": string;
  "--kira-accent": string;
  "--kira-nav-bg": string;
  "--kira-link": string;
  "--kira-btn-bg": string;
  "--kira-btn-border": string;
  "--kira-btn-text": string;
  "--kira-status-opacity": string;
}

export const darkTheme: ThemeTokens = {
  "--kira-bg-page": "#002b36",
  "--kira-bg-card": "#073642",
  "--kira-bg-input": "#002b36",
  "--kira-text-primary": "#93a1a1",
  "--kira-text-secondary": "#839496",
  "--kira-text-muted": "#586e75",
  "--kira-border": "rgba(42, 161, 152, 0.2)",
  "--kira-border-subtle": "rgba(42, 161, 152, 0.1)",
  "--kira-accent": "#268bd2",
  "--kira-nav-bg": "#073642",
  "--kira-link": "#93a1a1",
  "--kira-btn-bg": "transparent",
  "--kira-btn-border": "#586e75",
  "--kira-btn-text": "#839496",
  "--kira-status-opacity": "0.13",
};

export const lightTheme: ThemeTokens = {
  "--kira-bg-page": "#fdf6e3",
  "--kira-bg-card": "#eee8d5",
  "--kira-bg-input": "#fdf6e3",
  "--kira-text-primary": "#073642",
  "--kira-text-secondary": "#586e75",
  "--kira-text-muted": "#93a1a1",
  "--kira-border": "rgba(147, 161, 161, 0.3)",
  "--kira-border-subtle": "rgba(147, 161, 161, 0.15)",
  "--kira-accent": "#268bd2",
  "--kira-nav-bg": "#eee8d5",
  "--kira-link": "#073642",
  "--kira-btn-bg": "transparent",
  "--kira-btn-border": "#93a1a1",
  "--kira-btn-text": "#586e75",
  "--kira-status-opacity": "0.15",
};

export type ThemeName = "dark" | "light";

export const themes: Record<ThemeName, ThemeTokens> = {
  dark: darkTheme,
  light: lightTheme,
};
