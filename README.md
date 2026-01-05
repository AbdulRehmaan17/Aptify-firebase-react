# Aptify - Real Estate & Services Platform

A comprehensive real estate platform with property listings, construction/renovation services, rental management, and integrated chat system.

## Features

- 🏠 **Property Management** - List, browse, and manage properties
- 🔨 **Construction Services** - Request and manage construction projects
- 🛠️ **Renovation Services** - Request and manage renovation projects
- 💬 **Real-time Chat** - User-to-user and support chat systems
- 🔔 **Notifications** - Real-time notifications for all activities
- ⭐ **Reviews & Ratings** - Review properties and service providers
- 💳 **Payment Processing** - Mock payment flow with transaction logging
- 👥 **Admin Panel** - Comprehensive admin dashboard
- 📱 **Responsive Design** - Mobile-friendly interface

## Tech Stack

- **Frontend:** React 18, Vite, Tailwind CSS
- **Backend:** Firebase (Firestore, Storage, Functions, Auth)
- **Maps:** Google Maps JavaScript API, Places API, Geocoding API
- **Real-time:** Firestore onSnapshot listeners
- **State Management:** React Context API
- **Routing:** React Router DOM
- **Notifications:** react-hot-toast
- **Icons:** Lucide React

## Quick Start

### Prerequisites

- Node.js 18+
- npm or yarn
- Firebase account
- Firebase CLI (`npm install -g firebase-tools`)

### Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd Aptify-firebase-react
   ```

2. **Install dependencies**
   ```bash
   npm install
   cd functions
   npm install
   cd ..
   ```

3. **Set up environment variables**
   ```bash
   cp env.example .env.local
   # Edit .env.local with your Firebase credentials and Google Maps API key
   ```
   
   **CRITICAL:** Vite reads environment variables ONLY when the dev server starts. After adding or changing variables in `.env.local`, you MUST restart the dev server:
   ```bash
   # Stop current server (Ctrl+C)
   npm run dev
   ```
   
   **File Location:** `.env.local` must be in the **project root** (same folder as `package.json`)
   
   **Variable Naming:** All variables MUST start with `VITE_` prefix for Vite to expose them
   
   Required environment variables:
   - `VITE_FIREBASE_API_KEY` - Firebase API key
   - `VITE_FIREBASE_AUTH_DOMAIN` - Firebase auth domain
   - `VITE_FIREBASE_PROJECT_ID` - Firebase project ID
   - `VITE_FIREBASE_STORAGE_BUCKET` - Firebase storage bucket
   - `VITE_FIREBASE_MESSAGING_SENDER_ID` - Firebase messaging sender ID
   - `VITE_FIREBASE_APP_ID` - Firebase app ID
   - `VITE_GOOGLE_MAPS_API_KEY` - **Google Maps API key (required for location features)**
   
   **Example .env.local (in project root):**
   ```env
   VITE_FIREBASE_API_KEY=your_firebase_api_key
   VITE_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
   VITE_FIREBASE_PROJECT_ID=your-project-id
   VITE_FIREBASE_STORAGE_BUCKET=your-project.appspot.com
   VITE_FIREBASE_MESSAGING_SENDER_ID=123456789
   VITE_FIREBASE_APP_ID=1:123456789:web:abcdef
   VITE_GOOGLE_MAPS_API_KEY=AIzaSyYourActualGoogleMapsAPIKeyHere
   ```
   
   **Troubleshooting:** If `VITE_GOOGLE_MAPS_API_KEY` is undefined:
   - Open browser console (F12) and run: `window.debugGoogleMapsKey()`
   - Or run: `window.validateGoogleMapsConfig()` for detailed validation
   - This will show exactly what Vite is reading and why it's failing
   - See [GOOGLE_MAPS_SETUP.md](GOOGLE_MAPS_SETUP.md) and [ENV_TROUBLESHOOTING.md](ENV_TROUBLESHOOTING.md) for detailed troubleshooting
   
   **Common Issues:**
   - Variable undefined → Check `.env.local` exists in project root, variable name is correct, dev server was restarted
   - Variable empty → Check `.env.local` file has the key on the same line (no line breaks)
   - Variable is placeholder → Replace `YOUR_GOOGLE_MAPS_API_KEY` with actual key

4. **Configure Firebase**
   - Create a Firebase project
   - Enable Authentication, Firestore, Storage, Functions, and Hosting
   - Copy credentials to `.env.local`

5. **Set up Google Maps API**
   - Go to [Google Cloud Console](https://console.cloud.google.com/google/maps-apis)
   - Create a new project or select existing project
   - Enable the following APIs:
     - **Maps JavaScript API** (for map display)
     - **Places API** (for address autocomplete)
     - **Geocoding API** (for address to coordinates conversion)
   - Create an API key
   - (Optional) Restrict the API key to your domain for production
   - Add the API key to `.env.local` as `VITE_GOOGLE_MAPS_API_KEY`
   - **CRITICAL:** Restart the dev server after adding the API key:
     ```bash
     # Stop the current dev server (Ctrl+C)
     npm run dev
     ```
   - The app will automatically detect the API key and enable map features

6. **Run development server**
   ```bash
   npm run dev
   ```

## Documentation

- **[Google Maps Setup Guide](GOOGLE_MAPS_SETUP.md)** - Complete guide for setting up Google Maps API key
- **[Environment Variables Troubleshooting](ENV_TROUBLESHOOTING.md)** - Fix "VITE_GOOGLE_MAPS_API_KEY is undefined" issues
- **[Manual Test Checklist](docs/MANUAL_TEST_CHECKLIST.md)** - Complete end-to-end testing guide
- **[Deployment Guide](docs/deployment.md)** - Environment setup and deployment instructions
- **[Database Structure](docs/structure.md)** - Firestore database schema
- **[Chat System](docs/chat-structure.md)** - Chat architecture and implementation
- **[Service Workflow](docs/service-workflow.md)** - Service request workflows
- **[QA Summary](docs/QA_SUMMARY.md)** - Pre-deployment checklist

## Build & Deploy

### Build

```bash
npm run build
```

### Deploy

```bash
# Deploy all services
firebase deploy --only hosting,firestore:rules,storage:rules,functions
```

See [deployment.md](docs/deployment.md) for detailed instructions.

## Project Structure

```
├── src/
│   ├── components/      # Reusable components
│   ├── pages/          # Page components
│   ├── services/       # Firebase service layers
│   ├── context/       # React context providers
│   ├── hooks/         # Custom React hooks
│   ├── firebase/       # Firebase configuration
│   └── utils/         # Utility functions
├── functions/          # Cloud Functions
├── docs/              # Documentation
├── public/            # Static assets
└── dist/              # Build output
```

## Key Features

### Property Management
- Post properties with images
- Browse and filter properties
- Rental and buy/sell requests
- Owner dashboard

### Service Requests
- Construction project requests
- Renovation project requests
- Provider assignment and management
- Status tracking and updates

### Communication
- Real-time user-to-user chat
- Support chatbot
- Admin support chat management
- Notification system

### Reviews & Ratings
- Property reviews
- Provider reviews
- Average rating calculation
- Review management

### Admin Features
- User management
- Provider approval
- Property moderation
- Request management
- Support ticket handling
- Transaction logs
- Notification broadcasting

## Testing

See [MANUAL_TEST_CHECKLIST.md](docs/MANUAL_TEST_CHECKLIST.md) for comprehensive testing instructions.

## Troubleshooting

### Build Errors
If you encounter build errors:
1. Copy the first error message
2. Check [deployment.md](docs/deployment.md) troubleshooting section
3. Verify environment variables are set correctly

### Common Issues
- **Environment variables not working:** Ensure `.env.local` exists and variables start with `VITE_`
- **Functions not triggering:** Check Firebase Console logs and verify deployment
- **Real-time updates not working:** Verify Firestore rules allow read access

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## License

[Your License Here]

## Support

For issues and questions:
- Check documentation in `docs/` folder
- Review Firebase Console logs
- Check browser console for errors

---

**Version:** 1.0.0  
**Last Updated:** [Current Date]
