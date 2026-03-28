# Kira Theming Design Spec

## Purpose

Add a theme system to the Kira frontend with a Solarized-inspired dark theme as default and a light theme option. Theme toggle in the nav bar, persisted to localStorage.

## Approach

React Context + CSS custom properties. Theme tokens defined as CSS variables on `:root`, toggled by setting a `data-theme` attribute on `<html>`. Components reference `var(--kira-*)` instead of hardcoded hex values. No new libraries.

## Theme Tokens

Semantic CSS variable names used throughout all components:

| Token | Purpose |
|---|---|
| `--kira-bg-page` | Page/body background |
| `--kira-bg-card` | Card/section backgrounds |
| `--kira-bg-input` | Input/textarea backgrounds |
| `--kira-text-primary` | Main body text |
| `--kira-text-secondary` | Secondary text |
| `--kira-text-muted` | De-emphasized text |
| `--kira-border` | Borders and dividers |
| `--kira-accent` | Primary accent color |
| `--kira-nav-bg` | Navigation bar background |

## Color Palettes

### Solarized-Inspired Dark (default)

| Token | Value | Solarized ref |
|---|---|---|
| `--kira-bg-page` | `#002b36` | base03 |
| `--kira-bg-card` | `#073642` | base02 |
| `--kira-bg-input` | `#002b36` | base03 |
| `--kira-text-primary` | `#93a1a1` | base1 |
| `--kira-text-secondary` | `#839496` | base0 |
| `--kira-text-muted` | `#586e75` | base01 |
| `--kira-border` | `rgba(42, 161, 152, 0.2)` | cyan at 20% |
| `--kira-accent` | `#268bd2` | Solarized blue |
| `--kira-nav-bg` | `#073642` | base02 |

### Light

| Token | Value | Solarized ref |
|---|---|---|
| `--kira-bg-page` | `#fdf6e3` | base3 |
| `--kira-bg-card` | `#eee8d5` | base2 |
| `--kira-bg-input` | `#fdf6e3` | base3 |
| `--kira-text-primary` | `#073642` | base03 |
| `--kira-text-secondary` | `#586e75` | base01 |
| `--kira-text-muted` | `#93a1a1` | base1 |
| `--kira-border` | `rgba(147, 161, 161, 0.3)` | base1 at 30% |
| `--kira-accent` | `#268bd2` | Solarized blue |
| `--kira-nav-bg` | `#eee8d5` | base2 |

## Lozenge Behavior

Area, risk, and confidence lozenge colors remain constant across themes — they are vivid enough to work on both backgrounds. Status lozenges use a theme-aware token `--kira-status-opacity` for their translucent backgrounds:

- Dark theme: `0.13` (current behavior)
- Light theme: `0.15` (slightly more opaque for readability on light cards)

## Theme Toggle

- Sun/moon icon button in the nav bar, right of user info
- Clicking toggles `data-theme` attribute on `<html>` between `dark` and `light`
- Choice persisted to `localStorage` key `kira-theme`
- On load, reads `localStorage` and defaults to `dark` if unset

## Implementation

### New Files

- `frontend/src/theme/themes.ts` — theme token definitions (dark/light palettes as JS objects)
- `frontend/src/theme/ThemeProvider.tsx` — React context, CSS variable injection, `useTheme()` hook

### Modified Files

- `frontend/src/App.tsx` — wrap with `ThemeProvider`
- `frontend/src/components/Layout.tsx` — replace hardcoded colors with `var()`, add toggle button
- `frontend/src/components/Lozenge.tsx` — status lozenge backgrounds use theme-aware opacity
- `frontend/src/pages/Login.tsx` — replace hardcoded colors with `var()`
- `frontend/src/pages/Dashboard.tsx` — replace hardcoded colors with `var()`
- `frontend/src/pages/TicketList.tsx` — replace hardcoded colors with `var()`
- `frontend/src/pages/TicketDetail.tsx` — replace hardcoded colors with `var()`

## Out of Scope

- System preference detection (`prefers-color-scheme`) — can be added later
- Per-user theme preference stored on the server
- Custom/user-defined themes
- Theming the Recharts tooltips (they use their own styling)
