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
   # Edit .env.local with your Firebase credentials
   ```

4. **Configure Firebase**
   - Create a Firebase project
   - Enable Authentication, Firestore, Storage, Functions, and Hosting
   - Copy credentials to `.env.local`

5. **Run development server**
   ```bash
   npm run dev
   ```

## Documentation

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
