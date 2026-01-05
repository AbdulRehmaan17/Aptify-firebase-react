# Google Maps API Key Setup Guide

## ⚠️ If VITE_GOOGLE_MAPS_API_KEY is undefined

If `import.meta.env.VITE_GOOGLE_MAPS_API_KEY === undefined`, this means Vite is not loading the variable. Follow these steps:

## Quick Fix for "API key is not configured" Warning

If you're seeing the warning about Google Maps API key not being configured, follow these steps:

### Step 1: Check if .env.local exists

```bash
# In your project root directory (same folder as package.json)
ls -la .env.local
# Or on Windows PowerShell:
Test-Path .env.local
# Or on Windows CMD:
dir .env.local
```

**CRITICAL:** The file must be in the **project root**, not in `/src` or any subfolder.

If the file doesn't exist, create it:

```bash
# Copy from example
cp env.example .env.local

# Or create manually
# On Windows: New-Item .env.local -ItemType File
```

### Step 2: Add Your API Key

Open `.env.local` in the project root and add your Google Maps API key:

```env
VITE_GOOGLE_MAPS_API_KEY=AIzaSyYourActualGoogleMapsAPIKeyHere
```

**CRITICAL Requirements:**
- Variable name must be exactly: `VITE_GOOGLE_MAPS_API_KEY` (case-sensitive)
- Must start with `VITE_` prefix (Vite only exposes variables with this prefix)
- No spaces around the `=` sign
- No quotes around the value
- Replace `AIzaSyYourActualGoogleMapsAPIKeyHere` with your actual API key
- File must be named `.env.local` (not `.env` or `.env.development`)

**Example of correct format:**
```env
VITE_GOOGLE_MAPS_API_KEY=AIzaSyCmlbNCJGx5rwMv4D26-hGvlfdmAKJQm-0
```

**Example of WRONG format (will not work):**
```env
# Wrong - missing VITE_ prefix
GOOGLE_MAPS_API_KEY=AIzaSy...

# Wrong - spaces around =
VITE_GOOGLE_MAPS_API_KEY = AIzaSy...

# Wrong - quotes
VITE_GOOGLE_MAPS_API_KEY="AIzaSy..."

# Wrong - wrong case
vite_google_maps_api_key=AIzaSy...
```

### Step 3: Restart Dev Server

**CRITICAL:** Vite only reads environment variables when the dev server starts. You MUST restart:

```bash
# Stop the current server (press Ctrl+C)
# Then start it again:
npm run dev
```

### Step 4: Verify It Works

After restarting, open browser console (F12) and check:

1. **Run validation:**
   ```javascript
   window.validateGoogleMapsKey()
   ```
   This should show: `valid: true`

2. **Check if variable is loaded:**
   ```javascript
   import.meta.env.VITE_GOOGLE_MAPS_API_KEY
   ```
   This should NOT be `undefined`

3. **Full diagnostics:**
   ```javascript
   window.debugGoogleMapsKey()
   ```
   This shows all environment variables and their status

If the variable is still undefined after restart:
- Verify file is named `.env.local` (not `.env`)
- Verify file is in project root (same folder as `package.json`)
- Verify variable name is exactly `VITE_GOOGLE_MAPS_API_KEY`
- Try clearing Vite cache: Delete `.vite` folder and restart

## Debugging

If the warning persists after restarting:

### 1. Check in Browser Console

Open browser console (F12) and run:

```javascript
window.debugGoogleMapsKey()
```

This will show:
- The raw API key value
- Whether it's being read correctly
- All VITE_ environment variables

### 2. Verify File Location

Make sure your `.env.local` file is in the **project root** (same directory as `package.json`):

```
Aptify-firebase-react/
├── .env.local          ← Should be here
├── package.json
├── src/
└── ...
```

### 3. Check File Format

Your `.env.local` should look like this:

```env
VITE_FIREBASE_API_KEY=your_firebase_key
VITE_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your-project-id
VITE_FIREBASE_STORAGE_BUCKET=your-project.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=123456789
VITE_FIREBASE_APP_ID=1:123456789:web:abcdef
VITE_GOOGLE_MAPS_API_KEY=AIzaSyYourActualKeyHere
```

### 4. Common Issues

**Issue:** "API key is not configured" even after adding it
- **Solution:** Restart the dev server (stop and run `npm run dev` again)

**Issue:** Key is too short error
- **Solution:** Make sure you copied the full API key (usually 39+ characters)

**Issue:** Key appears to be a placeholder
- **Solution:** Make sure you replaced `YOUR_GOOGLE_MAPS_API_KEY` with your actual key

**Issue:** Key works in one file but not another
- **Solution:** All environment variables must start with `VITE_` for Vite to expose them

## Getting a Google Maps API Key

If you don't have an API key yet:

1. Go to [Google Cloud Console](https://console.cloud.google.com/google/maps-apis)
2. Create a new project or select existing
3. Enable these APIs:
   - Maps JavaScript API
   - Places API
   - Geocoding API
4. Go to "Credentials" → "Create Credentials" → "API Key"
5. Copy the API key
6. (Optional) Restrict the key to your domain for production

## Still Having Issues?

1. Run `window.debugGoogleMapsKey()` in browser console
2. Check the output - it will show exactly what Vite is reading
3. Verify the key format matches the example above
4. Make sure you restarted the dev server after adding the key

