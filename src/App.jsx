import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { AuthProvider } from './context/AuthContext';
import Navbar from './components/layout/Navbar';
import Footer from './components/layout/Footer';
import ProtectedRoute from './components/common/ProtectedRoute';
import Home from './pages/Home';
import PropertiesPage from './pages/PropertiesPage';
import PropertyDetailPage from './pages/PropertyDetailPage';
import PostPropertyPage from './pages/PostPropertyPage';
import Auth from './pages/Auth';
import AdminPanel from './pages/AdminPanel';
import About from './pages/About';
import Contact from './pages/Contact';
import MyAccount from './pages/MyAccount';
import ConstructionServicesPage from './pages/ConstructionServicesPage';
import ConstructionRequestForm from './pages/ConstructionRequestForm';
import ConstructionList from './pages/ConstructionList';
import ConstructionDashboard from './pages/ConstructionDashboard';
import ProviderConstructionPanel from './pages/ProviderConstructionPanel';
import RegisterConstructor from './pages/RegisterConstructor';
import RenovationServicesPage from './pages/RenovationServicesPage';
import RenovationList from './pages/RenovationList';
import RenovationRequestForm from './pages/RenovationRequestForm';
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

function App() {
  return (
    <AuthProvider>
      <Router>
        <div className="min-h-screen bg-white flex flex-col">
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
              <Route path="/services" element={<RenovationServicesPage />} />
              <Route path="/construction-services" element={<ConstructionServicesPage />} />
              <Route path="/rental-services" element={<RentalServicesPage />} />
              <Route path="/browse-rentals" element={<BrowseRentals />} />
              <Route path="/buy-sell" element={<BuySellLanding />} />
              <Route path="/rent" element={<RentPage />} />
              <Route path="/buy" element={<BuyPage />} />
              <Route path="/sell" element={<SellPage />} />

              {/* Protected Routes */}
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
                path="/admin"
                element={
                  <ProtectedRoute>
                    <AdminPanel />
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
                path="/provider-construction"
                element={
                  <ProtectedRoute>
                    <ProviderConstructionPanel />
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
                path="/renovation-dashboard"
                element={
                  <ProtectedRoute>
                    <RenovationDashboard />
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
              <Route path="*" element={
                <div className="min-h-screen flex items-center justify-center">
                  <div className="text-center">
                    <h1 className="text-4xl font-bold text-gray-900 mb-4">404</h1>
                    <p className="text-gray-600 mb-8">Page not found</p>
                    <a href="/" className="text-blue-600 hover:underline">Go back home</a>
                  </div>
                </div>
              } />
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