<div align="center">
  <img src="public/logo.png" alt="Lkwan Logo" width="120" />
  <h1>Lkwan</h1>
  <p><strong>Anti-Brain Rot Social Media</strong></p>
  <p>Share deep thoughts, connect with thinkers. Realtime posts, DMs, and community — no page refreshes.</p>
</div>

<div align="center">

[![React](https://img.shields.io/badge/React-18-61DAFB?logo=react&logoColor=white)](https://react.dev/)
[![Vite](https://img.shields.io/badge/Vite-5-646CFF?logo=vite&logoColor=white)](https://vitejs.dev/)
[![Supabase](https://img.shields.io/badge/Supabase-Backend-3ECF8E?logo=supabase&logoColor=white)](https://supabase.com/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-3-06B6D4?logo=tailwindcss&logoColor=white)](https://tailwindcss.com/)
[![PWA](https://img.shields.io/badge/PWA-ready-5A0FC8)](https://web.dev/progressive-web-apps/)
[![Vercel](https://img.shields.io/badge/Deployed_on-Vercel-black?logo=vercel)](https://vercel.com/)
[![License](https://img.shields.io/badge/license-MIT-blue)](./LICENSE)

[Live Demo](https://lkwan.vercel.app) · [Report Issue](https://github.com/zakariaelqannaa-dv/lkwan-zeta/issues) · [Request Feature](https://github.com/zakariaelqannaa-dv/lkwan-zeta/issues)

<!-- TODO: replace https://lkwan.vercel.app with your actual Vercel deployment URL if different -->

</div>

---

## Table of Contents

- [About](#about)
- [Features](#features)
- [Verification Badges](#verification-badges)
- [Tech Stack](#tech-stack)
- [Project Structure](#project-structure)
- [Getting Started](#getting-started)
- [Supabase Backend Setup](#supabase-backend-setup)
- [Environment Variables](#environment-variables)
- [Available Scripts](#available-scripts)
- [Deployment](#deployment)
- [PWA and Push Notifications](#pwa-and-push-notifications)
- [Media Upload and Security](#media-upload-and-security)
- [Routes](#routes)
- [Contributing](#contributing)
- [License](#license)

---

## About

Lkwan is a full-stack social media app built with React + Vite on the frontend and Supabase (Postgres, Auth, Storage, Realtime) on the backend.

Posts are called **Kwans**. Users can post text, images, video, and audio, follow thinkers, message privately, join a public chat room, get notified in realtime, and install the app as a PWA.

This repository contains the complete app: `src/` (React frontend), `api/` (Vercel serverless upload validator), `schema.sql` (full Supabase schema), and `public/` (PWA assets).

---

## Features

| Area | What you get |
|------|--------------|
| **Feed** | For You + Following tabs, infinite scroll (IntersectionObserver), realtime INSERT/UPDATE/DELETE via Supabase channels |
| **Posts (Kwans)** | Text + Markdown (sanitized), images (carousel), video/audio player, embeds (YouTube-nocookie, Spotify, Instagram, TikTok, Facebook, X), reposts, edit with `is_edited`, categories |
| **Interactions** | Likes, comments, bookmarks, follows — optimistic UI + realtime sync, `sync_unread` event bus for nav badges |
| **Messaging** | 1:1 DMs with read receipts, image sharing, optimistic send with rollback, realtime channels per conversation |
| **Community** | Public `chat` room (`chat_messages`), online presence (`Online` page), follow suggestions, trends |
| **Search** | Debounced user search + paginated post search, `#tag` maps to category, `@username` maps to profile |
| **Notifications** | Like / comment / follow / message / bookmark / mention, filterable list, mark-all-read, sound + vibration on new |
| **Profiles** | Cover + avatar, bio, follower/following modals, Posts / Liked tabs, `@me` shorthand |
| **Admin Panel** | Category CRUD with drag-and-drop (`@dnd-kit`), moderation search, grant/revoke artist verification |
| **Media** | Client-side image compression (canvas) + video compression (ffmpeg.wasm), progress XHR, server magic-byte validation |
| **UX** | Dark OLED theme, responsive 3-column shell (sidebar / feed / chat panel) + mobile bottom nav, single-playback enforcement for media |
| **PWA** | Installable, offline precache (Workbox), push notifications via VAPID, custom service worker `src/sw.js` |

---

## Verification Badges

Two badge types are shown next to usernames via `src/components/VerificationBadge.jsx`:

| Type | Asset | Meaning | Source |
|------|-------|---------|--------|
| Standard | `src/assets/verification.png` | Notable account | `VERIFIED_NAMES` in `src/lib/verified.js` |
| Artist | `src/assets/artistVerification.png` | Musician / artist account | `ARTIST_NAMES` + Admin grants |

How it works (`src/lib/verified.js`):

1. `VERIFIED_NAMES` and `ARTIST_NAMES` are hardcoded `Set`s.
2. Admin Panel can grant/revoke artist status at runtime via `addArtistName()` / `removeArtistName()`, persisted in `localStorage` key `lkwan_artist_names`.
3. `getAllArtistNames()` merges hardcoded + stored names. `getVerificationType(user)` returns `artist | standard | none`.
4. Priority: `artist > standard > none`.
5. On Profile, clicking the badge explains how to earn verification.

---

## Tech Stack

| Layer | Choice |
|-------|--------|
| Framework | React 18, React Router 6 |
| Bundler | Vite 5 (`@vitejs/plugin-react`, `@` alias to `src/`) |
| Styling | Tailwind CSS 3, PostCSS, Lucide icons |
| Backend | Supabase (Postgres + RLS, Auth, Storage `media` bucket, Realtime + Presence) |
| Content | `react-markdown` + `rehype-sanitize` + `highlight.js` |
| Input | `@emoji-mart/react`, `@dnd-kit` (sortable), custom `MentionInput` (`@`/`#` autocomplete) |
| Media | Canvas image compression, `@ffmpeg` video compression |
| PWA / Push | `vite-plugin-pwa` + Workbox, Web Push (VAPID), `src/sw.js` |
| Validation | `zod` (client), magic-byte check in `api/validate-upload.js` (server) |
| Hosting | Vercel (SPA rewrite, serverless `api/`) |

---

## Project Structure

```
.
├── api/
│   └── validate-upload.js      # Vercel function: auth, magic-byte, size, folder checks, service-role upload
├── public/
│   ├── logo.png                # App logo (used in README hero)
│   ├── favicon.png
│   ├── manifest.json
│   └── pwa-*.png               # PWA icons
├── schema.sql                  # Full Supabase schema: tables, RLS, triggers, storage, realtime
├── src/
│   ├── App.jsx                 # Auth gate, router, theme, splash, push wiring
│   ├── main.jsx                # Bootstrap, noise filter, PWA mode, media exclusivity
│   ├── supabaseClient.js       # Singleton Supabase client (env-based)
│   ├── index.css               # Design tokens, scrollbars, animations, safe-area
│   ├── sw.js                   # Push + navigation service worker source
│   ├── assets/                 # logo, verification.png, artistVerification.png
│   ├── components/             # Feed, PostCard, Profile, Messages, ChatPanel, ChatPage,
│   │                           # Explore, Notifications, Bookmarks, Auth, AdminPanel,
│   │                           # ComposeInline/Page, MentionInput, EmojiPicker,
│   │                           # VideoPreview, EmbedPreview, AppShell, LeftSidebar, MobileNav, ...
│   ├── hooks/                  # useSearch, useMessaging, useCompose, useBookmarks
│   ├── lib/                    # admin.ts, verified.js, push.js, uploadWithValidation.js, notificationSound.js
│   └── utils/                  # imageCompression.js, videoCompression.js, embedPatterns.js
├── vercel.json                 # vite build -> dist, SPA fallback to index.html
├── vite.config.js              # React + PWA injectManifest, runtime caching
└── tailwind.config.js
```

---

## Getting Started

### Prerequisites

- Node.js `>= 18.0.0` (see `.node-version`)
- npm
- A Supabase project (free tier works)

### 1. Clone and install

```bash
git clone https://github.com/zakariaelqannaa-dv/lkwan-zeta.git
cd lkwan-zeta
npm install
```

### 2. Configure environment

```bash
cp .env.example .env
```

Fill in `.env`:

```
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
VITE_VAPID_PUBLIC_KEY=your-vapid-public-key
VITE_RECAPTCHA_SITE_KEY=your-recaptcha-site-key
```

Server-only (Vercel env, never expose to client):

```
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
```

> `src/supabaseClient.js` already reads the `VITE_` vars. Do not hardcode keys in source.

### 3. Run locally

```bash
npm run dev
```

Open `http://localhost:5173`.

### 4. Build and preview

```bash
npm run build
npm run preview
```

---

## Supabase Backend Setup

The app will not work without this. All SQL is in `schema.sql` (idempotent, safe to re-run).

1. Open Supabase Dashboard → SQL Editor → New Query.
2. Paste the full contents of `schema.sql` and run it.
3. What it creates:
   - Tables: `profiles, admins, categories, posts, comments, messages, likes, follows, notifications, chat_messages, bookmarks, reports`
   - `handle_new_user()` trigger: auto-creates `profiles` row on signup, adds admin row for the owner email
   - Counter triggers: `posts_count`, `following_count`, `followers_count`
   - Notification triggers: like / comment / follow / message / bookmark
   - Protect triggers: immutable fields + `is_edited` handling
   - RLS enabled with least-privilege policies + `is_admin()` helper
   - Storage: public `media` bucket with folder-scoped policies (`post_images, post_videos, messages, avatars, covers`)
   - Realtime: adds all interactive tables to `supabase_realtime` publication
   - Seed: 8 default categories
4. Storage: confirm `media` bucket is Public.
5. Auth: enable Email provider. No extra config required — profile creation is automatic.
6. Realtime: no manual step needed if `schema.sql` ran (it executes `alter publication ... add table`).

---

## Environment Variables

| Var | Where | Required | Purpose |
|-----|-------|----------|---------|
| `VITE_SUPABASE_URL` | client `.env` + Vercel | yes | Supabase project URL |
| `VITE_SUPABASE_ANON_KEY` | client `.env` + Vercel | yes | Anon public key |
| `VITE_VAPID_PUBLIC_KEY` | client `.env` + Vercel | for push | Web Push VAPID public key (`src/lib/push.js`) |
| `VITE_RECAPTCHA_SITE_KEY` | client `.env` + Vercel | for captcha | reCAPTCHA v3 site key (`ReCaptcha.jsx`) |
| `SUPABASE_SERVICE_ROLE_KEY` | Vercel server only | for uploads | Used only by `api/validate-upload.js`, never prefix with `VITE_` |

---

## Available Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start Vite dev server |
| `npm run build` | Production build to `dist/` |
| `npm run preview` | Preview production build locally |
| `npm run lint` | ESLint with zero-warning policy |

---

## Deployment

Vercel is the supported target (`vercel.json` builds with `npx vite build`, outputs `dist/`, rewrites all routes to `/index.html`).

1. Import `https://github.com/zakariaelqannaa-dv/lkwan-zeta` into Vercel.
2. Set env vars: `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`, `VITE_VAPID_PUBLIC_KEY`, `VITE_RECAPTCHA_SITE_KEY`, `SUPABASE_SERVICE_ROLE_KEY`.
3. Deploy. `api/validate-upload.js` deploys automatically as a serverless function.
4. Update the Live Demo link at the top of this README to your deployment URL.

---

## PWA and Push Notifications

- Manifest: `public/manifest.json` (name `Lkwan`, black theme, standalone, portrait).
- Service worker source: `src/sw.js` (precache + `push` → `showNotification` + `notificationclick` focus).
- Build: `vite-plugin-pwa` with `injectManifest`, precaches JS/CSS/HTML/images, runtime caches Supabase storage (NetworkOnly) and API (NetworkFirst).
- Push flow: `Settings` → enable → `registerPush()` saves subscription (VAPID) → `unregisterPush()` on logout.
- CSP in `index.html` already allows Supabase, YouTube-nocookie, Spotify, reCAPTCHA, and fonts.

---

## Media Upload and Security

- Client: extension + size checks, image resize to max 1920x1080 JPEG q0.8, video transcode (H.264 720p, AAC, 120s cap, skip if <2MB or WebM), XHR progress with 120s timeout (`src/lib/uploadWithValidation.js`).
- Server (`POST /api/validate-upload?path=<folder>/<uid>/<file>`):
  - Requires `Authorization: Bearer <supabase-jwt>`, validates user via service-role `auth.getUser()`.
  - Path must be exactly `folder/uid/filename`, folder in `post_images, post_videos, messages, avatars, covers`, `uid === auth.uid()`.
  - Magic-byte detection for `jpeg, png, gif, webp, mp4, webm, mp3, wav, ogg, flac, opus`; rejects unknown types.
  - Limits: images 10MB, video/audio 20MB. Folder-type gating (e.g. `avatars` = images only).
  - Uploads with `service-role` and returns `publicUrl`.
- Rendering: `react-markdown` + `rehype-sanitize` for posts, sandboxed iframes for embeds.

---

## Routes

| Path | Access | Page |
|------|--------|------|
| `/login`, `/signup` | public (redirect to `/` if authed) | `Auth` |
| `/` | auth | `Feed` (For You / Following) |
| `/explore` | public | `Explore` (categories, trends, suggestions) |
| `/post/:postId` | auth | `PostDetail` |
| `/u/:username` | public (`/u/me` = self) | `Profile` |
| `/messages` | auth | `Messages` (DMs) |
| `/chat` | auth | `ChatPage` (public room) |
| `/online` | auth | `Online` (presence) |
| `/notifications` | auth | `Notifications` |
| `/bookmarks` | auth | `Bookmarks` |
| `/compose` (`?edit=`) | auth | `ComposePage` |
| `/admin` | admin-only | `AdminPanel` |
| `/settings`, `/support` | public | `Settings`, `Support` |
| `/report` | auth | `ReportProblem` |

Layout: `AppShell` → `LeftSidebar` (desktop) + feed column + `ChatPanel` (xl) + `MobileNav` (mobile, hidden on chat).

---

## Contributing

1. Fork the repo and create a feature branch: `git checkout -b feat/my-change`.
2. Run `npm run dev` and `npm run lint` (must pass with zero warnings).
3. If you touch the DB, update `schema.sql` (keep it idempotent) and note the change in your PR.
4. Open a PR against `master` with a clear description and screenshots for UI changes.

---

## License

MIT — see `LICENSE` if present, otherwise all rights reserved to the repository owner.

Built by [@zakariaelqannaa-dv](https://github.com/zakariaelqannaa-dv).
