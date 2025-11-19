# Firebase Environment Variables Setup

## ✅ .env File Created

The `.env` file has been created in the project root with the following variables:

```
VITE_FIREBASE_API_KEY=AIzaSyCmlbNCJGx5rwMv4D26-hGvlfdmAKJQm-0
VITE_FIREBASE_AUTH_DOMAIN=aptify-82cd6.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=aptify-82cd6
VITE_FIREBASE_STORAGE_BUCKET=aptify-82cd6.firebasestorage.app
VITE_FIREBASE_MESSAGING_SENDER_ID=375881241889
VITE_FIREBASE_APP_ID=1:375881241889:web:57c58411c47750ba039a60
```

## 🔄 Important: Restart Dev Server

**After creating or modifying the `.env` file, you MUST restart your Vite dev server:**

1. Stop the current dev server (Ctrl+C)
2. Delete the `.vite` cache folder (optional but recommended):
   ```bash
   Remove-Item -Recurse -Force .vite -ErrorAction SilentlyContinue
   ```
3. Restart the dev server:
   ```bash
   npm run dev
   ```

## ✅ Verification

The app will now:
- ✅ Load Firebase environment variables correctly
- ✅ Initialize Firebase without errors
- ✅ Show clear error messages if variables are missing
- ✅ Display helpful debugging information in console

## 🔍 Troubleshooting

If you still see "Missing Firebase environment variables":

1. **Verify .env file exists** in project root (not in /src)
2. **Check variable names** start with `VITE_`
3. **Restart dev server** after creating/modifying .env
4. **Clear Vite cache**: Delete `.vite` folder
5. **Check console** for detailed environment variable debugging info


