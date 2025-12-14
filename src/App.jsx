import React, { Suspense, lazy } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { AuthProvider } from './context/AuthContext';
import Navbar from './components/layout/Navbar';
import Footer from './components/layout/Footer';
import ProtectedRoute from './components/common/ProtectedRoute';
import LoadingSpinner from './components/common/LoadingSpinner';
import Home from './pages/Home';
import PropertiesPage from './pages/PropertiesPage';
import PropertyDetailPage from './pages/PropertyDetailPage';
import PostPropertyPage from './pages/PostPropertyPage';
import Auth from './pages/Auth';
import About from './pages/About';
import Contact from './pages/Contact';
import MyAccount from './pages/MyAccount';
import Construction from './pages/Construction';
import ConstructionServicesPage from './pages/ConstructionServicesPage';
import ConstructionRequestForm from './pages/ConstructionRequestForm';
import RequestConstruction from './pages/RequestConstruction';
import ConstructionList from './pages/ConstructionList';
import ConstructionProviders from './pages/ConstructionProviders';
import ProvidersList from './pages/ProvidersList';
import ConstructionDashboard from './pages/ConstructionDashboard';
import ConstructorDashboard from './pages/ConstructorDashboard';
import ConstructorProjects from './pages/constructor/ConstructorProjects';
import ConstructorProjectDetails from './pages/constructor/ConstructorProjectDetails';
import ConstructorProfile from './pages/constructor/ConstructorProfile';
import ProviderConstructionPanel from './pages/ProviderConstructionPanel';
import RegisterConstructor from './pages/RegisterConstructor';
import ProviderOptions from './pages/providers/ProviderOptions';
import Renovation from './pages/Renovation';
import RenovationServicesPage from './pages/RenovationServicesPage';
import RenovationList from './pages/RenovationList';
import RenovationRequestForm from './pages/RenovationRequestForm';
import RequestRenovation from './pages/RequestRenovation';
import RenovationProviders from './pages/RenovationProviders';
import RenovationDashboard from './pages/RenovationDashboard';
import ProviderRenovationPanel from './pages/ProviderRenovationPanel';
import RegisterRenovator from './pages/RegisterRenovator';
import RentPage from './pages/RentPage';
import BuyPage from './pages/BuyPage';
import SellPage from './pages/SellPage';
import BuySellLanding from './pages/BuySellLanding';
import RenovationProviderDetail from './pages/RenovationProviderDetail';
import ConstructionProviderDetail from './pages/ConstructionProviderDetail';
import RentalServicesPage from './pages/RentalServicesPage';
import RentalRequestForm from './pages/RentalRequestForm';
import BrowseRentals from './pages/BrowseRentals';
import Dashboard from './pages/Dashboard';
import NotificationsPage from './pages/NotificationsPage';
import UserChatsPage from './pages/UserChatsPage';
import Chatbot from './pages/Chatbot';
import OwnerDashboard from './pages/OwnerDashboard';
import PaymentMock from './pages/PaymentMock';

// Lazy load heavy pages for better performance
const AdminPanel = lazy(() => import('./pages/AdminPanel'));
const Chat = lazy(() => import('./pages/Chat'));
const RenovatorDashboard = lazy(() => import('./pages/renovator/RenovatorDashboard'));
const RenovatorProjects = lazy(() => import('./pages/renovator/RenovatorProjects'));
const RenovatorProjectDetails = lazy(() => import('./pages/renovator/RenovatorProjectDetails'));
const RenovatorProfile = lazy(() => import('./pages/renovator/RenovatorProfile'));
const RenovatorPortfolio = lazy(() => import('./pages/renovator/RenovatorPortfolio'));

function App() {
  return (
    <AuthProvider>
      <Router
        future={{
          v7_startTransition: true,
          v7_relativeSplatPath: true,
        }}
      >
        <div className="min-h-screen bg-background flex flex-col">
          <Navbar />
          <main className="flex-1">
            <Routes>
              {/* Public Routes */}
              <Route path="/" element={<Home />} />
              <Route path="/properties" element={<PropertiesPage />} />
              <Route path="/properties/:id" element={<PropertyDetailPage />} />
              <Route path="/auth" element={<Auth />} />
              <Route path="/about" element={<About />} />
              <Route path="/contact" element={<Contact />} />
              <Route path="/renovation" element={<Renovation />} />
              <Route path="/services" element={<RenovationServicesPage />} />
              <Route path="/renovation-providers" element={<RenovationProviders />} />
              <Route path="/construction-services" element={<ConstructionServicesPage />} />
              <Route path="/construction-providers" element={<ConstructionProviders />} />
              <Route path="/providers" element={<ProvidersList />} />
              <Route path="/rental-services" element={<RentalServicesPage />} />
              <Route path="/browse-rentals" element={<BrowseRentals />} />
              <Route path="/buy-sell" element={<BuySellLanding />} />
              <Route path="/rent" element={<RentPage />} />
              <Route path="/buy" element={<BuyPage />} />
              <Route path="/sell" element={<SellPage />} />

              {/* Protected Routes */}
              <Route
                path="/dashboard"
                element={
                  <ProtectedRoute>
                    <Dashboard />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/notifications"
                element={
                  <ProtectedRoute>
                    <NotificationsPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/chats"
                element={
                  <ProtectedRoute>
                    <UserChatsPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/chat"
                element={
                  <ProtectedRoute>
                    <Suspense fallback={<LoadingSpinner size="lg" />}>
                      <Chat />
                    </Suspense>
                  </ProtectedRoute>
                }
              />
              <Route
                path="/chatbot"
                element={
                  <ProtectedRoute>
                    <Chatbot />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/construction"
                element={
                  <ProtectedRoute>
                    <Construction />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/post-property"
                element={
                  <ProtectedRoute>
                    <PostPropertyPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/account"
                element={
                  <ProtectedRoute>
                    <MyAccount />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/owner-dashboard"
                element={
                  <ProtectedRoute>
                    <OwnerDashboard />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/admin"
                element={
                  <ProtectedRoute adminOnly>
                    <Suspense fallback={<LoadingSpinner size="lg" />}>
                      <AdminPanel />
                    </Suspense>
                  </ProtectedRoute>
                }
              />
              <Route
                path="/payment-mock"
                element={
                  <ProtectedRoute>
                    <PaymentMock />
                  </ProtectedRoute>
                }
              />

              {/* Construction Module Routes */}
              <Route
                path="/construction-request"
                element={
                  <ProtectedRoute>
                    <ConstructionRequestForm />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/request-construction"
                element={
                  <ProtectedRoute>
                    <RequestConstruction />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/construction-list"
                element={
                  <ProtectedRoute>
                    <ConstructionList />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/construction-provider/:id"
                element={
                  <ProtectedRoute>
                    <ConstructionProviderDetail />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/construction-dashboard"
                element={
                  <ProtectedRoute>
                    <ConstructionDashboard />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/constructor-dashboard"
                element={
                  <ProtectedRoute>
                    <ConstructorDashboard />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/provider-construction"
                element={
                  <ProtectedRoute>
                    <ProviderConstructionPanel />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/providers"
                element={
                  <ProtectedRoute>
                    <ProviderOptions />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/register-constructor"
                element={
                  <ProtectedRoute>
                    <RegisterConstructor />
                  </ProtectedRoute>
                }
              />

              {/* Renovation Module Routes */}
              <Route
                path="/renovation-list"
                element={
                  <ProtectedRoute>
                    <RenovationList />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/renovation-provider/:id"
                element={
                  <ProtectedRoute>
                    <RenovationProviderDetail />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/renovation-request"
                element={
                  <ProtectedRoute>
                    <RenovationRequestForm />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/request-renovation"
                element={
                  <ProtectedRoute>
                    <RequestRenovation />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/renovation-dashboard"
                element={
                  <ProtectedRoute>
                    <RenovationDashboard />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/renovator-dashboard"
                element={
                  <ProtectedRoute>
                    <Suspense fallback={<LoadingSpinner size="lg" />}>
                      <RenovatorDashboard />
                    </Suspense>
                  </ProtectedRoute>
                }
              />
              <Route
                path="/provider-renovation"
                element={
                  <ProtectedRoute>
                    <ProviderRenovationPanel />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/register-renovator"
                element={
                  <ProtectedRoute>
                    <RegisterRenovator />
                  </ProtectedRoute>
                }
              />

              {/* Rental Module Routes */}
              <Route
                path="/rental-request"
                element={
                  <ProtectedRoute>
                    <RentalRequestForm />
                  </ProtectedRoute>
                }
              />

              {/* Constructor Module Routes */}
              <Route
                path="/constructor/dashboard"
                element={
                  <ProtectedRoute constructorOnly>
                    <ConstructorDashboard />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/constructor/projects"
                element={
                  <ProtectedRoute constructorOnly>
                    <ConstructorProjects />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/constructor/projects/:id"
                element={
                  <ProtectedRoute constructorOnly>
                    <ConstructorProjectDetails />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/constructor/profile"
                element={
                  <ProtectedRoute constructorOnly>
                    <ConstructorProfile />
                  </ProtectedRoute>
                }
              />

              {/* Renovator Module Routes */}
              <Route
                path="/renovator/dashboard"
                element={
                  <ProtectedRoute renovatorOnly>
                    <Suspense fallback={<LoadingSpinner size="lg" />}>
                      <RenovatorDashboard />
                    </Suspense>
                  </ProtectedRoute>
                }
              />
              <Route
                path="/renovator/projects"
                element={
                  <ProtectedRoute renovatorOnly>
                    <Suspense fallback={<LoadingSpinner size="lg" />}>
                      <RenovatorProjects />
                    </Suspense>
                  </ProtectedRoute>
                }
              />
              <Route
                path="/renovator/project/:id"
                element={
                  <ProtectedRoute renovatorOnly>
                    <Suspense fallback={<LoadingSpinner size="lg" />}>
                      <RenovatorProjectDetails />
                    </Suspense>
                  </ProtectedRoute>
                }
              />
              <Route
                path="/renovator/profile"
                element={
                  <ProtectedRoute renovatorOnly>
                    <Suspense fallback={<LoadingSpinner size="lg" />}>
                      <RenovatorProfile />
                    </Suspense>
                  </ProtectedRoute>
                }
              />
              <Route
                path="/renovator/chat"
                element={
                  <ProtectedRoute renovatorOnly>
                    <Suspense fallback={<LoadingSpinner size="lg" />}>
                      <Chat />
                    </Suspense>
                  </ProtectedRoute>
                }
              />
              <Route
                path="/renovator/notifications"
                element={
                  <ProtectedRoute renovatorOnly>
                    <Suspense fallback={<LoadingSpinner size="lg" />}>
                      <NotificationsPage />
                    </Suspense>
                  </ProtectedRoute>
                }
              />
              <Route
                path="/renovator/portfolio"
                element={
                  <ProtectedRoute renovatorOnly>
                    <Suspense fallback={<LoadingSpinner size="lg" />}>
                      <RenovatorPortfolio />
                    </Suspense>
                  </ProtectedRoute>
                }
              />

              {/* 404 Route */}
              <Route
                path="*"
                element={
                  <div className="min-h-screen flex items-center justify-center">
                    <div className="text-center">
                      <h1 className="text-4xl font-bold text-textMain mb-4">404</h1>
                      <p className="text-textSecondary mb-8">Page not found</p>
                      <a href="/" className="text-primary hover:underline">
                        Go back home
                      </a>
                    </div>
                  </div>
                }
              />
            </Routes>
          </main>
          <Footer />
          <Toaster
            position="top-right"
            toastOptions={{
              duration: 4000,
              style: {
                background: '#363636',
                color: '#fff',
              },
              success: {
                style: {
                  background: '#0D9488', // primary teal
                },
              },
              error: {
                style: {
                  background: '#EF4444',
                },
              },
            }}
          />
        </div>
      </Router>
    </AuthProvider>
  );
}

export default App;
