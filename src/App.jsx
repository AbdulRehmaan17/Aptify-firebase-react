import React, { Suspense, lazy } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { AuthProvider } from './context/AuthContext';
import Navbar from './components/layout/Navbar';
import Footer from './components/layout/Footer';
// Route guards (React Router v6, Outlet-based, case-sensitive for Netlify)
import ProtectedRoute from './routes/ProtectedRoute';
import PublicRoute from './routes/PublicRoute';
import LoadingSpinner from './components/common/LoadingSpinner';
import ScrollToTop from './components/common/ScrollToTop';
import { ROUTES } from './routes/routes';
import Home from './pages/Home';
import PropertiesPage from './pages/PropertiesPage';
import PropertyDetailPage from './pages/PropertyDetailPage';
import PostPropertyPage from './pages/PostPropertyPage';
import Auth from './pages/Auth';
import About from './pages/About';
import Contact from './pages/Contact';
import MyAccount from './pages/MyAccount';
import MyProjects from './pages/MyProjects';
import ConstructionProjectDetail from './pages/Construction/ConstructionProjectDetail';
import RenovationProjectDetail from './pages/Renovation/RenovationProjectDetail';
import ViewBooking from './pages/Rental/ViewBooking';
import NotificationDetailPage from './pages/NotificationDetailPage';
import Construction from './pages/Construction';
import ConstructionServicesPage from './pages/ConstructionServicesPage';
import ConstructionRequestForm from './pages/ConstructionRequestForm';
import RequestConstruction from './pages/RequestConstruction';
import ConstructionList from './pages/ConstructionList';
import ConstructionProviders from './pages/ConstructionProviders';
import ProvidersList from './pages/ProvidersList';
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
import Dashboard from './pages/Dashboard';
import NotificationsPage from './pages/NotificationsPage';
import UserChatsPage from './pages/UserChatsPage';
import Chatbot from './pages/Chatbot';
import OwnerDashboard from './pages/OwnerDashboard';
import PaymentMock from './pages/PaymentMock';

// Lazy load heavy pages for better performance
const AdminPanel = lazy(() => import('./pages/AdminPanel'));
const Chat = lazy(() => import('./pages/Chat'));
const ConstructorDashboard = lazy(() => import('./pages/constructor/ConstructorDashboard'));
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
        <ScrollToTop />
        <div className="min-h-screen bg-background flex flex-col">
          <Navbar />
          <main className="flex-1">
            <Routes>
              {/* Public Routes */}
              <Route element={<PublicRoute />}>
                <Route path={ROUTES.AUTH} element={<Auth />} />
              </Route>
              <Route path={ROUTES.HOME} element={<Home />} />
              <Route path={ROUTES.PROPERTIES} element={<PropertiesPage />} />
              <Route path={ROUTES.PROPERTY_DETAIL} element={<PropertyDetailPage />} />
              <Route path={ROUTES.ABOUT} element={<About />} />
              <Route path={ROUTES.CONTACT} element={<Contact />} />
              <Route path={ROUTES.RENOVATION} element={<Renovation />} />
              <Route path={ROUTES.RENOVATION_SERVICES} element={<RenovationServicesPage />} />
              <Route path={ROUTES.RENOVATION_PROVIDERS} element={<RenovationProviders />} />
              <Route path={ROUTES.CONSTRUCTION_SERVICES} element={<ConstructionServicesPage />} />
              <Route path={ROUTES.CONSTRUCTION_PROVIDERS} element={<ConstructionProviders />} />
              <Route path={ROUTES.PROVIDERS_LIST} element={<ProvidersList />} />
              <Route path={ROUTES.RENTAL_SERVICES} element={<RentalServicesPage />} />
              <Route path={ROUTES.BROWSE_RENTALS} element={<RentPage />} />
              <Route path={ROUTES.BUY_SELL} element={<BuySellLanding />} />
              <Route path={ROUTES.RENT_LEGACY} element={<Navigate to={ROUTES.BROWSE_RENTALS} replace />} />
              <Route path={ROUTES.BUY} element={<BuyPage />} />
              <Route path={ROUTES.SELL} element={<SellPage />} />

              {/* Authenticated user routes */}
              <Route element={<ProtectedRoute />}>
                <Route path={ROUTES.MY_PROJECTS} element={<MyProjects />} />
                {/* Project Detail Routes */}
                <Route
                  path={ROUTES.CONSTRUCTION_PROJECT_DETAIL}
                  element={<ConstructionProjectDetail />}
                />
                <Route
                  path={ROUTES.RENOVATION_PROJECT_DETAIL}
                  element={<RenovationProjectDetail />}
                />
                <Route path={ROUTES.RENTAL_BOOKING} element={<ViewBooking />} />
                <Route path={ROUTES.DASHBOARD} element={<Dashboard />} />
                <Route path={ROUTES.NOTIFICATIONS} element={<NotificationsPage />} />
                <Route path={ROUTES.NOTIFICATION_DETAIL} element={<NotificationDetailPage />} />
                <Route path={ROUTES.CHATS} element={<UserChatsPage />} />
                <Route
                  path={ROUTES.CHAT}
                  element={
                    <Suspense fallback={<LoadingSpinner size="lg" />}>
                      <Chat />
                    </Suspense>
                  }
                />
                <Route path={ROUTES.CHATBOT} element={<Chatbot />} />
                <Route path={ROUTES.CONSTRUCTION} element={<Construction />} />
                <Route path={ROUTES.POST_PROPERTY} element={<PostPropertyPage />} />
                {/* Account/Profile page - accessible via avatar click or "My Account" menu */}
                <Route path={ROUTES.ACCOUNT} element={<MyAccount />} />
                <Route path={ROUTES.OWNER_DASHBOARD} element={<OwnerDashboard />} />
                <Route path={ROUTES.PAYMENT_MOCK} element={<PaymentMock />} />

                {/* Construction Module Routes */}
                <Route path={ROUTES.CONSTRUCTION_REQUEST} element={<ConstructionRequestForm />} />
                <Route path={ROUTES.REQUEST_CONSTRUCTION} element={<RequestConstruction />} />
                <Route path={ROUTES.CONSTRUCTION_LIST} element={<ConstructionList />} />
                <Route
                  path={ROUTES.CONSTRUCTION_PROVIDER_DETAIL}
                  element={<ConstructionProviderDetail />}
                />
                <Route
                  path={ROUTES.PROVIDER_CONSTRUCTION}
                  element={<ProviderConstructionPanel />}
                />
                <Route path={ROUTES.PROVIDERS} element={<ProviderOptions />} />
                <Route path={ROUTES.REGISTER_CONSTRUCTOR} element={<RegisterConstructor />} />

                {/* Renovation Module Routes */}
                <Route path={ROUTES.RENOVATION_LIST} element={<RenovationList />} />
                <Route
                  path={ROUTES.RENOVATION_PROVIDER_DETAIL}
                  element={<RenovationProviderDetail />}
                />
                <Route path={ROUTES.RENOVATION_REQUEST} element={<RenovationRequestForm />} />
                <Route path={ROUTES.REQUEST_RENOVATION} element={<RequestRenovation />} />
                <Route path={ROUTES.RENOVATION_DASHBOARD} element={<RenovationDashboard />} />
                <Route
                  path={ROUTES.PROVIDER_RENOVATION}
                  element={<ProviderRenovationPanel />}
                />
                <Route path={ROUTES.REGISTER_RENOVATOR} element={<RegisterRenovator />} />

                {/* Rental Module Routes */}
                <Route path={ROUTES.RENTAL_REQUEST} element={<RentalRequestForm />} />
              </Route>

              {/* Admin-only routes */}
              <Route element={<ProtectedRoute adminOnly />}>
                <Route
                  path={ROUTES.ADMIN}
                  element={
                    <Suspense fallback={<LoadingSpinner size="lg" />}>
                      <AdminPanel />
                    </Suspense>
                  }
                />
              </Route>

              {/* Constructor-only routes */}
              <Route element={<ProtectedRoute constructorOnly />}>
                <Route
                  path={ROUTES.CONSTRUCTOR_DASHBOARD}
                  element={
                    <Suspense fallback={<LoadingSpinner size="lg" />}>
                      <ConstructorDashboard />
                    </Suspense>
                  }
                />
                <Route
                  path={ROUTES.CONSTRUCTOR_PROJECTS}
                  element={<ConstructorProjects />}
                />
                <Route
                  path={ROUTES.CONSTRUCTOR_PROJECT_DETAIL}
                  element={<ConstructorProjectDetails />}
                />
                <Route path={ROUTES.CONSTRUCTOR_PROFILE} element={<ConstructorProfile />} />
              </Route>

              {/* Renovator-only routes */}
              <Route element={<ProtectedRoute renovatorOnly />}>
                <Route
                  path={ROUTES.RENOVATOR_DASHBOARD}
                  element={
                    <Suspense fallback={<LoadingSpinner size="lg" />}>
                      <RenovatorDashboard />
                    </Suspense>
                  }
                />
                <Route
                  path={ROUTES.RENOVATOR_PROJECTS}
                  element={
                    <Suspense fallback={<LoadingSpinner size="lg" />}>
                      <RenovatorProjects />
                    </Suspense>
                  }
                />
                <Route
                  path={ROUTES.RENOVATOR_PROJECT_DETAIL}
                  element={
                    <Suspense fallback={<LoadingSpinner size="lg" />}>
                      <RenovatorProjectDetails />
                    </Suspense>
                  }
                />
                <Route
                  path={ROUTES.RENOVATOR_PROFILE}
                  element={
                    <Suspense fallback={<LoadingSpinner size="lg" />}>
                      <RenovatorProfile />
                    </Suspense>
                  }
                />
                <Route
                  path={ROUTES.RENOVATOR_CHAT}
                  element={
                    <Suspense fallback={<LoadingSpinner size="lg" />}>
                      <Chat />
                    </Suspense>
                  }
                />
                <Route
                  path={ROUTES.RENOVATOR_NOTIFICATIONS}
                  element={
                    <Suspense fallback={<LoadingSpinner size="lg" />}>
                      <NotificationsPage />
                    </Suspense>
                  }
                />
                <Route
                  path={ROUTES.RENOVATOR_PORTFOLIO}
                  element={
                    <Suspense fallback={<LoadingSpinner size="lg" />}>
                      <RenovatorPortfolio />
                    </Suspense>
                  }
                />
              </Route>

              {/* 404 Route */}
              <Route
                path={ROUTES.NOT_FOUND}
                element={
                  <div className="min-h-screen flex items-center justify-center">
                    <div className="text-center">
                      <h1 className="text-4xl font-bold text-textMain mb-4">404</h1>
                      <p className="text-textSecondary mb-8">Page not found</p>
                      <a href={ROUTES.HOME} className="text-primary hover:underline">
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
