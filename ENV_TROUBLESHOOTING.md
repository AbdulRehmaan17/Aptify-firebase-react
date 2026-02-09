# Environment Variables Troubleshooting Guide

## Problem: VITE_GOOGLE_MAPS_API_KEY is undefined

If `import.meta.env.VITE_GOOGLE_MAPS_API_KEY === undefined`, follow this guide.

## Root Cause Analysis

Vite only exposes environment variables that:
1. ✅ Start with `VITE_` prefix
2. ✅ Are in `.env`, `.env.local`, or `.env.[mode]` files
3. ✅ Are loaded when the dev server starts (restart required after changes)

## Step-by-Step Fix

### 1. Verify File Exists and Location

**Check if `.env.local` exists in project root:**

```bash
# Windows PowerShell
Test-Path .env.local

# Windows CMD
dir .env.local

# Linux/Mac
ls -la .env.local
```

**File must be in project root** (same folder as `package.json`):
```
Aptify-firebase-react/
├── .env.local          ← HERE (project root)
├── package.json
├── src/
└── ...
```

**NOT here:**
```
Aptify-firebase-react/
├── src/
│   └── .env.local      ← WRONG LOCATION
```

### 2. Verify File Content

Open `.env.local` and check:

```env
# Must be exactly this format:
VITE_GOOGLE_MAPS_API_KEY=AIzaSyYourActualKeyHere

# Common mistakes:
# ❌ GOOGLE_MAPS_API_KEY=... (missing VITE_ prefix)
# ❌ VITE_GOOGLE_MAPS_API_KEY = ... (spaces around =)
# ❌ VITE_GOOGLE_MAPS_API_KEY="..." (quotes)
# ❌ vite_google_maps_api_key=... (wrong case)
```

### 3. Restart Dev Server

**CRITICAL:** Vite reads env vars only at startup.

```bash
# Stop current server
# Press Ctrl+C in terminal

# Clear Vite cache (optional but recommended)
Remove-Item -Recurse -Force .vite -ErrorAction SilentlyContinue

# Restart server
npm run dev
```

### 4. Verify in Browser Console

Open browser console (F12) and run:

```javascript
// Check if variable exists
import.meta.env.VITE_GOOGLE_MAPS_API_KEY

// Run comprehensive validation
window.validateGoogleMapsKey()

// See all VITE_ variables
window.debugGoogleMapsKey()
```

## Diagnostic Commands

### In Browser Console (F12):

```javascript
// Quick check
import.meta.env.VITE_GOOGLE_MAPS_API_KEY

// Detailed validation
window.validateGoogleMapsKey()

// Full diagnostics
window.debugGoogleMapsKey()

// Compare with working Firebase vars
import.meta.env.VITE_FIREBASE_API_KEY
```

### Expected Output:

**If working correctly:**
```javascript
import.meta.env.VITE_GOOGLE_MAPS_API_KEY
// Returns: "AIzaSyYourActualKeyHere" (string, not undefined)
```

**If not working:**
```javascript
import.meta.env.VITE_GOOGLE_MAPS_API_KEY
// Returns: undefined
```

## Common Issues and Solutions

### Issue 1: Variable is undefined

**Symptoms:**
- `import.meta.env.VITE_GOOGLE_MAPS_API_KEY === undefined`
- Warning banner appears
- Maps don't load

**Solutions:**
1. Check file name is `.env.local` (not `.env`)
2. Check file is in project root
3. Check variable name is exactly `VITE_GOOGLE_MAPS_API_KEY`
4. **Restart dev server** after adding variable
5. Clear `.vite` cache folder and restart

### Issue 2: Variable exists but is empty string

**Symptoms:**
- `import.meta.env.VITE_GOOGLE_MAPS_API_KEY === ""`

**Solution:**
- Check `.env.local` file - remove any empty lines or spaces
- Ensure value is on the same line as the variable name

### Issue 3: Variable is placeholder value

**Symptoms:**
- `import.meta.env.VITE_GOOGLE_MAPS_API_KEY === "YOUR_GOOGLE_MAPS_API_KEY"`

**Solution:**
- Replace placeholder with actual API key from Google Cloud Console

### Issue 4: Firebase vars work but Google Maps doesn't

**Symptoms:**
- `VITE_FIREBASE_API_KEY` works
- `VITE_GOOGLE_MAPS_API_KEY` is undefined

**Solution:**
- Check if `VITE_GOOGLE_MAPS_API_KEY` line exists in `.env.local`
- Check for typos in variable name
- Ensure no trailing spaces or special characters

## Verification Checklist

After fixing, verify:

- [ ] `.env.local` exists in project root
- [ ] File contains `VITE_GOOGLE_MAPS_API_KEY=...` (no spaces, no quotes)
- [ ] Variable name is exactly `VITE_GOOGLE_MAPS_API_KEY` (case-sensitive)
- [ ] Dev server was restarted after adding variable
- [ ] `import.meta.env.VITE_GOOGLE_MAPS_API_KEY` is NOT undefined
- [ ] `window.validateGoogleMapsKey()` shows `valid: true`
- [ ] Warning banner disappears
- [ ] Maps load correctly

## Still Not Working?

1. **Run full diagnostics:**
   ```javascript
   window.debugGoogleMapsKey()
   ```

2. **Check all VITE_ variables:**
   ```javascript
   window.validateEnvVars()
   ```

3. **Compare with Firebase vars:**
   ```javascript
   // These work
   import.meta.env.VITE_FIREBASE_API_KEY
   
   // This should also work
   import.meta.env.VITE_GOOGLE_MAPS_API_KEY
   ```

4. **Clear everything and restart:**
   ```bash
   # Delete cache
   Remove-Item -Recurse -Force .vite -ErrorAction SilentlyContinue
   Remove-Item -Recurse -Force node_modules/.vite -ErrorAction SilentlyContinue
   
   # Restart
   npm run dev
   ```

5. **Check Vite config:**
   - Open `vite.config.js`
   - Verify `envPrefix: 'VITE_'` is set

## Getting Help

If still not working, provide:
1. Output of `window.debugGoogleMapsKey()`
2. Output of `window.validateEnvVars()`
3. Contents of `.env.local` (with API key redacted)
4. Location of `.env.local` file
5. Whether dev server was restarted











