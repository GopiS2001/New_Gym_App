# FitFlow — Member App

React Native + Expo (SDK 58) + Expo Router. Design follows `../App Design Image/` (navy foundation, glass cards, lime accent). Talks to the API in `../Backend`.

## Run

```bash
npm install
npx expo start            # scan the QR with Expo Go (phone on the same Wi-Fi as this PC)
npx expo start --web      # quick preview in the browser
```

The API must be running (`cd ../Backend && npm run dev`, port 4100). In development the app finds it automatically at `http://<your PC's IP>:4100`. To point at another server set `EXPO_PUBLIC_API_URL` in `.env`.

> Windows firewall: allow inbound TCP 4100 (Node) so a phone on Wi-Fi can reach the API.

Checks: `npx tsc --noEmit` · `npx expo lint` · `npx expo-doctor`.

## Structure

```
src/app/                 routes (Expo Router)
  welcome, login, forgot-password, onboarding        auth + 13-step guided onboarding
  (tabs)/ index · explore · workout · library · profile
  exercises/[category], exercise/[id]                discovery, filters, detail (About / History / Programs)
  programs, program/[id], program/[id]/workout/[id]  programs, follow/continue, workout overview
  session, session-complete, pick-exercise           active workout logger, rest timer, completion
  progress, history, coaches, collection, featured, settings/*
src/components/          UI kit (ui.tsx), charts (svg), content cards, option cards
src/lib/                 api client (token refresh), queries (TanStack Query), reminders, workout helpers
src/stores/              auth, onboarding draft, active session, offline outbox (zustand)
src/theme/tokens.ts      design tokens
```

## How it works

- **Auth** — access + rotating refresh token in SecureStore (localStorage on web preview); silent refresh on 401.
- **Onboarding** — answers saved locally after every step (resumes after restart) and to the server once signed in; account is created at the end and onboarding is completed server-side.
- **Workouts** — the active session lives on the device (AsyncStorage) so closing the app never loses a set. On finish it's uploaded once to `/workout-sessions/sync` (idempotent `clientId`). Offline, it goes to an outbox that syncs automatically when the connection returns (shown as "pending sync").
- **Logging fields** adapt to the exercise type configured in the admin (sets/reps/weight, duration/hold, distance, RPE, notes) and start the rest timer after each set.
- **Reminders** — local weekly notifications on the chosen days/time (work in Expo Go). Permission is requested only when the member opts in and never re-prompted after a denial. Remote push needs a development build + EAS project id.

## Not yet included

- Brand photography: the welcome hero is an animated composition; exercise/program images come from the admin media library.
- Social sign-in (Google/Apple), payments, wearables — out of MVP scope per the plan.
