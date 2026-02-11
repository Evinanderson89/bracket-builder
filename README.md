# Bracket Builder

Tournament bracket management app built with React Native and Expo.

## Tech Stack

- **React Native** - Mobile framework
- **Expo** - Development platform
- **React** 19.1.0
- **Expo Router** - File-based routing
- **Supabase** - Cloud database (shared app state)

## Getting Started

1. Install dependencies:
   ```bash
   npm install
   ```

2. Create local env file:
   ```bash
   cp .env.example .env
   ```

3. Start the development server:
   ```bash
   npm start
   ```

4. Run on your preferred platform:
   - Press `w` for web
   - Press `i` for iOS simulator
   - Press `a` for Android emulator
   - Scan QR code with Expo Go app on your phone

## Production Setup

### 1) Create Supabase table

Run `/Users/evinanderson/Documents/GitHub/bracket-builder/supabase/schema.sql` in Supabase SQL Editor.

### 2) Configure environment variables

Set these in local `.env` and in your hosting provider (Vercel):

```bash
EXPO_PUBLIC_SUPABASE_URL=https://YOUR_PROJECT_REF.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=YOUR_SUPABASE_ANON_KEY

EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID=YOUR_GOOGLE_WEB_CLIENT_ID
EXPO_PUBLIC_GOOGLE_EXPO_CLIENT_ID=YOUR_GOOGLE_EXPO_CLIENT_ID
EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID=YOUR_GOOGLE_IOS_CLIENT_ID
EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID=YOUR_GOOGLE_ANDROID_CLIENT_ID
```

### 3) Configure Google OAuth

In Google Cloud Console for your Web OAuth client:
- Add your deployed web URL(s) to **Authorized JavaScript origins**
- Add your callback URL(s) to **Authorized redirect URIs** if required by your flow

For local testing, add `http://localhost:8081`.

### 4) Deploy to web (Vercel)

```bash
npm i -g vercel
vercel
vercel --prod
```

## Notes

- App data (players, cohorts, brackets, payouts, requests) is now shared via Supabase when `EXPO_PUBLIC_SUPABASE_*` is set.
- Auth session (`AUTH_USER`) and mode (`USER_MODE`) stay local per device.

## Project Structure

```
bracket-builder/
├── app/              # Main app entry point
├── components/       # Reusable components
├── context/          # App/Auth state providers
├── styles/           # Style definitions
├── supabase/         # SQL schema
├── utils/            # Utility + storage logic
└── assets/           # Images and static assets
```

## Features

- Tournament bracket creation and management
- Real-time bracket updates
- Match tracking and scoring
- Gmail sign-in with verified email gate
- Player self-request workflow with admin approval
