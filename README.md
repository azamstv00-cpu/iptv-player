# IPTV Player

A personal IPTV streaming website with glass-design dark UI. Plays MPD (DASH) and M3U8 (HLS) streams with ClearKey DRM support.

## Features

- **Stream playback** — DASH (MPD) and HLS (M3U8) via Shaka Player
- **ClearKey DRM** — Auto-detected from KODIPROP tags or URL query params
- **Channel management** — Admin panel with Firestore CRUD, auto-numbering
- **Firebase Auth** — Email/password admin login
- **Glass design** — Frosted glass UI with dark theme
- **Responsive** — Desktop sidebar, mobile drawer

## Prerequisites

- Node.js 18+
- Firebase project with Firestore and Authentication enabled

## Setup

1. Clone the repo and install dependencies:
   ```bash
   npm install
   ```

2. Create a `.env` file from the example:
   ```bash
   cp .env.example .env
   ```

3. Fill in your Firebase project credentials in `.env`:
   ```
   VITE_FIREBASE_API_KEY=...
   VITE_FIREBASE_AUTH_DOMAIN=...
   VITE_FIREBASE_PROJECT_ID=...
   VITE_FIREBASE_STORAGE_BUCKET=...
   VITE_FIREBASE_MESSAGING_SENDER_ID=...
   VITE_FIREBASE_APP_ID=...
   VITE_FIREBASE_MEASUREMENT_ID=...
   ```

4. Start the dev server:
   ```bash
   npm run dev
   ```

## Build

```bash
npm run build
```

Output goes to `dist/`.

## Stream URL Format

Paste a stream URL in the input area:

- **DASH with ClearKey**: Append `?drmLicense=key_id:key` or add a `#KODIPROP:inputstream.adaptive.license_key=key_id:key` line before the URL
- **HLS**: Plain M3U8 URL

## Deployment

The app is a static site — deploy `dist/` to any host (Vercel, Netlify, Cloudflare Pages, etc.).

Firebase config is loaded from environment variables, so set them in your hosting dashboard before building.

## License

MIT
