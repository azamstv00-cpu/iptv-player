# IPTV Player — Glass Dark Mode Brand Spec

## Color tokens

| Token | Value | Usage |
|---|---|---|
| `--bg` | `#0a0a0f` | Dark base canvas |
| `--glass-surface` | `rgba(26, 26, 36, 0.55)` + `backdrop-blur(16px)` | Standard glass panels |
| `--glass-elevated` | `rgba(16, 16, 24, 0.75)` + `backdrop-blur(20px)` | Modals, overlays |
| `--glass-border` | `rgba(255, 255, 255, 0.08)` | All glass borders |
| `--text-primary` | `#e0e0e8` | Body text |
| `--text-muted` | `#8888a0` | Secondary / metadata text |
| `--accent` | `#5b7cfa` | Accent blue |
| `--accent-glass` | `rgba(91, 124, 250, 0.15)` | Active channel fill |
| `--error` | `#f05a5a` | Error states |
| `--error-glass` | `rgba(240, 90, 90, 0.12)` | Error glass fill |
| `--success` | `#4ade80` | Success / online states |

## Glass design system

- All UI surfaces use frosted glass over `#0a0a0f` base
- No solid backgrounds, no gradients, no shadows
- Standard glass: `rgba(26, 26, 36, 0.55)` + `backdrop-blur(16px)`
- Elevated glass (modals): `rgba(16, 16, 24, 0.75)` + `backdrop-blur(20px)`
- Borders: `1px solid rgba(255, 255, 255, 0.08)`
- Hover lift: `rgba(255, 255, 255, 0.04)` overlay

## Typography

- System font stack: `-apple-system, BlinkMacSystemFont, 'Segoe UI', system-ui, sans-serif`
- No emoji — SVG or Unicode symbols for controls
- Clean, minimal, high contrast for couch viewing
- Channel numbers: bold, muted, fixed 24px width

## Layout

- Left sidebar: 280px glass panel, 12px border-radius
- Right area: video player with floating glass controls
- 16px gap between sidebar and player
- Controls overlay: 20px inset from right edge of video
- Controls pill: 56px wide, rounded-2xl
