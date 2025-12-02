import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { AuthProvider } from './context/AuthContext';
import Navbar from './components/layout/Navbar';
import Footer from './components/layout/Footer';
import ProtectedRoute from './components/common/ProtectedRoute';
import PrivateRoute from './components/common/PrivateRoute';
import PublicRoute from './components/common/PublicRoute';
import AdminRoute from './components/common/AdminRoute';
import ProviderRoute from './components/common/ProviderRoute';
import Home from './pages/Home';
import PropertiesPage from './pages/PropertiesPage';
import PropertyDetailPage from './pages/PropertyDetailPage';
import PostPropertyPage from './pages/PostPropertyPage';
import Login from './pages/Login';
import Signup from './pages/Signup';
import ForgotPassword from './pages/ForgotPassword';
import AdminPanel from './pages/AdminPanel';
import About from './pages/About';
import Contact from './pages/Contact';
import MyAccount from './pages/MyAccount';
import Profile from './pages/Profile';
import Dashboard from './pages/Dashboard';
import Construction from './pages/Construction';
import ConstructionServicesPage from './pages/ConstructionServicesPage';
import ConstructionRequestForm from './pages/ConstructionRequestForm';
import RequestConstruction from './pages/RequestConstruction';
import ConstructionList from './pages/ConstructionList';
import MyConstructionRequests from './pages/Construction/MyConstructionRequests';
import ProviderConstructionRequests from './pages/Construction/ProviderConstructionRequests';
import ConstructionProviders from './pages/ConstructionProviders';
import ConstructionDashboard from './pages/ConstructionDashboard';
import ConstructorDashboard from './pages/ConstructorDashboard';
import ProviderConstructionPanel from './pages/ProviderConstructionPanel';
import RegisterConstructor from './pages/RegisterConstructor';
import ProviderOptions from './pages/providers/ProviderOptions';
import Renovation from './pages/Renovation';
import RenovationServicesPage from './pages/RenovationServicesPage';
import RenovationList from './pages/RenovationList';
import RenovationRequestForm from './pages/RenovationRequestForm';
import RequestRenovation from './pages/RequestRenovation';
import RenovationProviders from './pages/RenovationProviders';
import MyRenovations from './pages/Renovation/MyRenovations';
import ProviderRenovationRequests from './pages/Renovation/ProviderRenovationRequests';
import RenovationDashboard from './pages/RenovationDashboard';
import RenovatorDashboard from './pages/RenovatorDashboard';
import ProviderRenovationPanel from './pages/ProviderRenovationPanel';
import RegisterRenovator from './pages/RegisterRenovator';
import RentPage from './pages/RentPage';
import AddRental from './pages/Rental/AddRental';
import MyRentals from './pages/Rental/MyRentals';
import ViewRental from './pages/Rental/ViewRental';
import BookRental from './pages/Rental/BookRental';
import MyBookings from './pages/Rental/MyBookings';
import ViewBooking from './pages/Rental/ViewBooking';
import BuyPage from './pages/BuyPage';
import SellPage from './pages/SellPage';
import BuySellLanding from './pages/BuySellLanding';
import RenovationProviderDetail from './pages/RenovationProviderDetail';
import ConstructionProviderDetail from './pages/ConstructionProviderDetail';
import RentalServicesPage from './pages/RentalServicesPage';
import RentalRequestForm from './pages/RentalRequestForm';
import BrowseRentals from './pages/BrowseRentals';
import NotificationsPage from './pages/NotificationsPage';
import NotificationsPageNew from './pages/Notifications/NotificationsPage';
import UserChatsPage from './pages/UserChatsPage';
import Chat from './pages/Chat';
import ChatPage from './pages/Chat/ChatPage';
import Chatbot from './pages/Chatbot';
import OwnerDashboard from './pages/OwnerDashboard';
import ProviderDashboard from './pages/ProviderDashboard';
import PaymentMock from './pages/PaymentMock';
import AddListing from './pages/BuySell/AddListing';
import ViewListing from './pages/BuySell/ViewListing';
import Marketplace from './pages/BuySell/Marketplace';
import MyListings from './pages/BuySell/MyListings';

function App() {
  return (
    <AuthProvider>
      <Router>
        <div className="min-h-screen bg-background flex flex-col">
          <Navbar />
          <main className="flex-1">
            <Routes>
              {/* Public Routes */}
              <Route path="/" element={<Home />} />
              <Route path="/properties" element={<PropertiesPage />} />
              <Route path="/properties/:id" element={<PropertyDetailPage />} />
              <Route
                path="/login"
                element={
                  <PublicRoute>
                    <Login />
                  </PublicRoute>
                }
              />
              <Route
                path="/signup"
                element={
                  <PublicRoute>
                    <Signup />
                  </PublicRoute>
                }
              />
              <Route
                path="/forgot-password"
                element={
                  <PublicRoute>
                    <ForgotPassword />
                  </PublicRoute>
                }
              />
              {/* Legacy auth route - redirect to login */}
              <Route path="/auth" element={<Navigate to="/login" replace />} />
              <Route path="/about" element={<About />} />
              <Route path="/contact" element={<Contact />} />
              <Route path="/renovation" element={<Renovation />} />
              <Route path="/services" element={<RenovationServicesPage />} />
              <Route path="/renovation-providers" element={<RenovationProviders />} />
              {/* Renovation Request Routes */}
              <Route
                path="/renovation/request"
                element={
                  <PrivateRoute>
                    <RequestRenovation />
                  </PrivateRoute>
                }
              />
              <Route
                path="/renovation/my-renovations"
                element={
                  <PrivateRoute>
                    <MyRenovations />
                  </PrivateRoute>
                }
              />
              <Route
                path="/renovation/my-renovations/:id"
                element={
                  <PrivateRoute>
                    <MyRenovations />
                  </PrivateRoute>
                }
              />
              <Route
                path="/renovation/provider-requests"
                element={
                  <ProviderRoute>
                    <ProviderRenovationRequests />
                  </ProviderRoute>
                }
              />
              <Route
                path="/renovation/provider-requests/:id"
                element={
                  <ProviderRoute>
                    <ProviderRenovationRequests />
                  </ProviderRoute>
                }
              />
              <Route path="/construction" element={<Construction />} />
              <Route path="/construction-services" element={<ConstructionServicesPage />} />
              <Route path="/construction-providers" element={<ConstructionProviders />} />
              {/* Construction Request Routes */}
              <Route
                path="/construction/request"
                element={
                  <PrivateRoute>
                    <RequestConstruction />
                  </PrivateRoute>
                }
              />
              <Route
                path="/construction/my-requests"
                element={
                  <PrivateRoute>
                    <MyConstructionRequests />
                  </PrivateRoute>
                }
              />
              <Route
                path="/construction/my-requests/:id"
                element={
                  <PrivateRoute>
                    <MyConstructionRequests />
                  </PrivateRoute>
                }
              />
              <Route
                path="/construction/provider-requests"
                element={
                  <ProviderRoute>
                    <ProviderConstructionRequests />
                  </ProviderRoute>
                }
              />
              <Route
                path="/construction/provider-requests/:id"
                element={
                  <ProviderRoute>
                    <ProviderConstructionRequests />
                  </ProviderRoute>
                }
              />
              <Route path="/rental-services" element={<RentalServicesPage />} />
              <Route path="/browse-rentals" element={<BrowseRentals />} />
              <Route path="/buy-sell" element={<BuySellLanding />} />
              {/* Buy/Sell Marketplace Routes */}
              <Route path="/buy-sell/marketplace" element={<Marketplace />} />
              <Route path="/buy-sell/listing/:id" element={<ViewListing />} />
              <Route
                path="/buy-sell/add"
                element={
                  <PrivateRoute>
                    <AddListing />
                  </PrivateRoute>
                }
              />
              <Route
                path="/buy-sell/edit/:id"
                element={
                  <PrivateRoute>
                    <AddListing />
                  </PrivateRoute>
                }
              />
              <Route
                path="/buy-sell/my-listings"
                element={
                  <PrivateRoute>
                    <MyListings />
                  </PrivateRoute>
                }
              />
              <Route path="/rent" element={<RentPage />} />
              {/* Rental Management Routes */}
              <Route
                path="/rental/add"
                element={
                  <PrivateRoute>
                    <AddRental />
                  </PrivateRoute>
                }
              />
              <Route
                path="/rental/my-rentals"
                element={
                  <PrivateRoute>
                    <MyRentals />
                  </PrivateRoute>
                }
              />
              <Route
                path="/rental/:id"
                element={
                  <PrivateRoute>
                    <ViewRental />
                  </PrivateRoute>
                }
              />
              <Route
                path="/rental/edit/:id"
                element={
                  <PrivateRoute>
                    <AddRental />
                  </PrivateRoute>
                }
              />
              <Route
                path="/rental/book/:id"
                element={
                  <PrivateRoute>
                    <BookRental />
                  </PrivateRoute>
                }
              />
              <Route
                path="/rental/my-bookings"
                element={
                  <PrivateRoute>
                    <MyBookings />
                  </PrivateRoute>
                }
              />
              <Route
                path="/rental/booking/:id"
                element={
                  <PrivateRoute>
                    <ViewBooking />
                  </PrivateRoute>
                }
              />
              <Route path="/buy" element={<BuyPage />} />
              <Route path="/sell" element={<SellPage />} />

              {/* Protected Routes */}
              <Route
                path="/notifications"
                element={
                  <PrivateRoute>
                    <NotificationsPageNew />
                  </PrivateRoute>
                }
              />
              <Route
                path="/notifications-old"
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
                  <PrivateRoute>
                    <ChatPage />
                  </PrivateRoute>
                }
              />
              <Route
                path="/chat-old"
                element={
                  <ProtectedRoute>
                    <Chat />
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
                    <ConstructionServicesPage />
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
              {/* Dashboard Routes */}
              <Route
                path="/dashboard"
                element={
                  <PrivateRoute>
                    <Dashboard />
                  </PrivateRoute>
                }
              />
              <Route
                path="/account"
                element={
                  <PrivateRoute>
                    <MyAccount />
                  </PrivateRoute>
                }
              />
              <Route
                path="/profile"
                element={
                  <PrivateRoute>
                    <Profile />
                  </PrivateRoute>
                }
              />
              <Route
                path="/provider-dashboard"
                element={
                  <ProviderRoute>
                    <ProviderDashboard />
                  </ProviderRoute>
                }
              />
              <Route
                path="/owner-dashboard"
                element={
                  <PrivateRoute>
                    <OwnerDashboard />
                  </PrivateRoute>
                }
              />
              <Route
                path="/admin"
                element={
                  <AdminRoute>
                    <AdminPanel />
                  </AdminRoute>
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
                    <RenovatorDashboard />
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
                  background: '#10B981',
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
