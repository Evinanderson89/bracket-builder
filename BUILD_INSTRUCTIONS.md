# Building and Distributing Bracket Builder

## Prerequisites

1. **Expo Account**: Sign up at https://expo.dev (free)
2. **EAS CLI**: Already installed (version 16.28.0)

## Setup Steps

### 1. Login to Expo
```bash
npx eas login
```

### 2. Configure Your Project
```bash
npx eas build:configure
```
This will create/update the `eas.json` file (already created).

### 3. Build for Android (APK - for direct download)
```bash
npx eas build --platform android --profile preview
```

This will:
- Create an APK file that can be downloaded and installed directly
- Build takes about 10-20 minutes
- You'll get a download link when it's done

### 4. Build for iOS (requires Apple Developer account)
```bash
npx eas build --platform ios --profile preview
```

**Note**: iOS builds require:
- Apple Developer account ($99/year)
- Proper certificates and provisioning profiles

### 5. Build for Both Platforms
```bash
npx eas build --platform all --profile preview
```

## Distribution Options

### Option 1: Direct Download (APK for Android)
- Build with `--profile preview`
- Share the download link with users
- Users can install directly on Android devices

### Option 2: App Stores
- **Google Play Store**: Requires Google Play Developer account ($25 one-time)
- **Apple App Store**: Requires Apple Developer account ($99/year)

### Option 3: Internal Testing
- Use Expo's internal distribution
- Share via Expo Go app or direct download links

## Quick Start Commands

```bash
# Login to Expo
npx eas login

# Build Android APK (for direct download)
npm run build:android

# Build iOS (requires Apple Developer account)
npm run build:ios

# Build both platforms
npm run build:all
```

## Important Notes

1. **Icons**: Make sure you have the required icon files in `./assets/images/`:
   - `icon.png` (1024x1024)
   - Android adaptive icon images
   - Splash screen images

2. **Bundle Identifiers**: 
   - iOS: `com.bracketbuilder.app`
   - Android: `com.bracketbuilder.app`
   - You can change these in `app.json` if needed

3. **First Build**: The first build may take longer as EAS sets up your project

4. **Build Status**: Check build status at https://expo.dev/accounts/[your-username]/projects/bracket-builder/builds

## Troubleshooting

- If build fails, check the build logs on expo.dev
- Make sure all dependencies are properly installed
- Verify icon files exist and are correct sizes
- Check that bundle identifiers are unique

