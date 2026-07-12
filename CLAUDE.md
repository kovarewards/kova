# Kova — project instructions

## What this is
Kova: a credit-card rewards optimization app. React Native + Expo
(TypeScript), Supabase backend. Founder is non-technical — explain
what you're doing in plain English before and after changes.

## Source of truth (read before big tasks)
- docs/kova-build-checklist.html — the build plan; follow its steps in order
- docs/kova-screen-mockups.html — the six core screens; match them exactly
- docs/kova-business-plan-v2.html — product decisions and rationale

## Hard rules
- No bank login, ever. No transaction-data features.
- Design tokens live in src/constants/theme.ts (Midnight Slate).
  Never hardcode colors. Never redraw src/components/KovaLogo.tsx.
- Secrets: only EXPO_PUBLIC_SUPABASE_URL, EXPO_PUBLIC_SUPABASE_ANON_KEY,
  EXPO_PUBLIC_POSTHOG_KEY belong in .env. The Google Places key lives
  ONLY in Supabase secrets. Never write any key into source files.
  Never commit .env.
- Places API: never combine radius with rankby=distance.
- Analytics events are exactly: rec_viewed, rec_used, trial_started,
  card_application_started. No new events without asking me.
- Use `npx expo install` for packages. Never upgrade the Expo SDK
  unless I explicitly ask.

## Workflow
- One checklist step per session where possible.
- After each working step: git commit with a clear message.
- If something fails twice, stop and explain my options in plain
  English instead of retrying variations.
