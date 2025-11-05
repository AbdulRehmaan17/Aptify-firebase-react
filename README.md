Aptify 🏠


Aptify is a comprehensive property rental and purchase platform with renovation services, delivering an elegant and seamless real estate experience. Built with Vite, React, and Firebase, it combines a modern frontend with a scalable serverless backend.

🌟 Features

Property Listings: Browse and search rental and purchase properties with detailed descriptions and high-quality images.
Renovation Services: Connect with renovation experts and request services for your properties.
Secure Authentication: Firebase Authentication for safe user login and registration.
Real-Time Data: Firebase Firestore for managing properties, bookings, and user profiles in real-time.
Fast & Responsive: Vite and React ensure blazing-fast performance across devices.
Messaging System: Direct communication between property owners and potential buyers/renters.

🛠️ Tech Stack

Frontend: Vite, React, Tailwind CSS
Backend: Firebase (Authentication, Firestore, Storage, Hosting)
Deployment: Firebase Hosting, Vercel

🚀 Getting Started
Prerequisites

Node.js (v18+)
pnpm (recommended)
Firebase Account

Installation

Clone the Repository:
git clone https://github.com/your-username/luxury-time.git
cd luxury-time


Install Dependencies:
pnpm install


Configure Firebase:

Create a Firebase project in the Firebase Console.
Enable Authentication, Firestore, and Storage.
Add Firebase config to .env file:
VITE_FIREBASE_API_KEY=your-api-key
VITE_FIREBASE_AUTH_DOMAIN=your-auth-domain
VITE_FIREBASE_PROJECT_ID=your-project-id
VITE_FIREBASE_STORAGE_BUCKET=your-storage-bucket
VITE_FIREBASE_MESSAGING_SENDER_ID=your-sender-id
VITE_FIREBASE_APP_ID=your-app-id




Run Locally:
pnpm dev

Open http://localhost:5173 in your browser.

Build for Production:
pnpm build
pnpm start



📂 Project Structure
The project structure is organized as follows:



Directory/File
Description



public/
Static assets (images, fonts, etc.)


src/components/
Reusable React components


src/pages/
React pages (routes)


src/lib/
Firebase utilities and configuration


src/types/
TypeScript type definitions


src/styles/
Tailwind CSS and global styles


.env.local
Firebase environment variables


vite.config.js
Vite configuration


tailwind.config.js
Tailwind CSS configuration


🔥 Firebase Integration

Authentication: Supports email/password and Google login.
Firestore: Stores property listings, user profiles, renovation service requests, and conversations.
Storage: Hosts property images and media.
Hosting: Deploys static assets for fast load times.

Ensure Firestore security rules and indexes are configured for secure data access.
🤝 Contributing
Contributions are welcome! To contribute:

Fork the repository.
Create a branch: git checkout -b feature/your-feature.
Commit changes: git commit -m "Add your feature".
Push to your branch: git push origin feature/your-feature.
Open a Pull Request.

Please adhere to our Code of Conduct.
📜 License
This project is licensed under the MIT License.
📧 Contact
For support or feedback, contact support@aptify.com or open a GitHub issue.

Aptify - Your perfect property, simplified. 🏠
