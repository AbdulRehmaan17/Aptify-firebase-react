import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Search, User, Menu, X, Home, Bell, MessageSquare } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import userService from '../../services/userService';
import toast from 'react-hot-toast';
import Button from '../common/Button';
import NotificationBell from '../notification/NotificationBell';

const Navbar = () => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [userProfile, setUserProfile] = useState(null);
  const [isProfileLoading, setIsProfileLoading] = useState(true);
  const { user, currentUserRole, loading: authLoading, logout } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!authLoading && user) {
      const fetchUserProfile = async () => {
        try {
          const profile = await userService.getProfile(user.uid);
          console.log('User profile fetched:', profile); // Debug log
          setUserProfile(profile);
        } catch (error) {
          console.error('Error fetching user profile:', error);
          // Don't show error toast if profile doesn't exist yet
          if (!error.message.includes('not found')) {
            toast.error('Failed to load user profile.');
          }
        } finally {
          setIsProfileLoading(false);
        }
      };
      fetchUserProfile();
    } else if (!authLoading && !user) {
      setIsProfileLoading(false);
    }
  }, [authLoading, user]);

  const handleLogout = async () => {
    try {
      await logout();
      toast.success('Logged out successfully');
      navigate('/auth');
    } catch (error) {
      console.error('Logout error:', error);
      toast.error('Failed to logout');
    }
  };

  const handleSearch = (e) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      navigate(`/properties?search=${encodeURIComponent(searchQuery.trim())}`);
      setSearchQuery('');
      setIsMenuOpen(false);
    }
  };

  return (
    <nav className="bg-white shadow-lg sticky top-0 z-40">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Logo */}
          <Link to="/" className="flex items-center space-x-2">
            <Home className="w-8 h-8 text-luxury-gold" />
            <span className="text-2xl font-display font-bold text-luxury-black">Aptify</span>
          </Link>

          {/* Desktop Navigation */}
          <div className="hidden lg:flex items-center space-x-8">
            <Link
              to="/buy-sell"
              className="text-gray-700 hover:text-luxury-gold transition-colors font-medium"
            >
              Buy/Sell
            </Link>
            <Link
              to="/services"
              className="text-gray-700 hover:text-luxury-gold transition-colors font-medium"
            >
              Renovation Services
            </Link>
            <Link
              to="/construction-services"
              className="text-gray-700 hover:text-luxury-gold transition-colors font-medium"
            >
              Construction Service
            </Link>
            <Link
              to="/rental-services"
              className="text-gray-700 hover:text-luxury-gold transition-colors font-medium"
            >
              Rental Services
            </Link>
            <Link
              to="/about"
              className="text-gray-700 hover:text-luxury-gold transition-colors font-medium"
            >
              About
            </Link>
            <Link
              to="/contact"
              className="text-gray-700 hover:text-luxury-gold transition-colors font-medium"
            >
              Contact
            </Link>
          </div>

          {/* Right Section */}
          <div className="flex items-center space-x-4">
            {/* Mobile Search */}
            <button className="lg:hidden p-2 text-gray-600 hover:text-gray-900">
              <Search className="w-5 h-5" />
            </button>

            {/* Notification Bell */}
            {user && <NotificationBell />}

            {/* User Menu */}
            {user ? (
              <div className="relative">
                <button
                  onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
                  className="flex items-center space-x-2 p-2 text-gray-600 hover:text-gray-900 transition-colors"
                >
                  <User className="w-5 h-5" />
                  <span className="hidden sm:block text-sm font-medium">
                    {userProfile?.displayName || user.email}
                  </span>
                </button>

                {isUserMenuOpen && !isProfileLoading && (
                  <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg py-2 z-50">
                    <Link
                      to="/account"
                      className="flex items-center px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                      onClick={() => setIsUserMenuOpen(false)}
                    >
                      <User className="w-4 h-4 mr-2" />
                      My Account
                    </Link>
                    <Link
                      to="/notifications"
                      className="flex items-center px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                      onClick={() => setIsUserMenuOpen(false)}
                    >
                      <Bell className="w-4 h-4 mr-2" />
                      All Notifications
                    </Link>
                    <Link
                      to="/chat"
                      className="flex items-center px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                      onClick={() => setIsUserMenuOpen(false)}
                    >
                      <MessageSquare className="w-4 h-4 mr-2" />
                      Chat
                    </Link>
                    {currentUserRole === 'admin' && (
                      <Link
                        to="/admin"
                        className="flex items-center px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                        onClick={() => setIsUserMenuOpen(false)}
                      >
                        <Home className="w-4 h-4 mr-2" />
                        Admin Panel
                      </Link>
                    )}
                    <hr className="my-2" />
                    <button
                      onClick={() => {
                        handleLogout();
                        setIsUserMenuOpen(false);
                      }}
                      className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                    >
                      Logout
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <div className="flex items-center space-x-2">
                <Button variant="ghost" size="sm" onClick={() => navigate('/auth')}>
                  Sign In
                </Button>
                <Button variant="primary" size="sm" onClick={() => navigate('/auth')}>
                  Sign Up
                </Button>
              </div>
            )}

            {/* Mobile Menu Button */}
            <button
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              className="lg:hidden p-2 text-gray-600 hover:text-gray-900"
            >
              {isMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>

        {/* Mobile Menu */}
        {isMenuOpen && (
          <div className="lg:hidden border-t border-gray-200">
            <div className="px-2 pt-2 pb-3 space-y-1">
              <form onSubmit={handleSearch} className="mb-4">
                <div className="relative">
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search properties..."
                    className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-luxury-gold focus:border-transparent"
                  />
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                </div>
              </form>

              <Link
                to="/buy-sell"
                className="block px-3 py-2 text-base font-medium text-gray-700 hover:text-gray-900 hover:bg-gray-50 rounded-md"
                onClick={() => setIsMenuOpen(false)}
              >
                Buy/Sell
              </Link>
              <Link
                to="/services"
                className="block px-3 py-2 text-base font-medium text-gray-700 hover:text-gray-900 hover:bg-gray-50 rounded-md"
                onClick={() => setIsMenuOpen(false)}
              >
                Renovation Services
              </Link>
              <Link
                to="/construction-services"
                className="block px-3 py-2 text-base font-medium text-gray-700 hover:text-gray-900 hover:bg-gray-50 rounded-md"
                onClick={() => setIsMenuOpen(false)}
              >
                Construction Service
              </Link>
              <Link
                to="/rental-services"
                className="block px-3 py-2 text-base font-medium text-gray-700 hover:text-gray-900 hover:bg-gray-50 rounded-md"
                onClick={() => setIsMenuOpen(false)}
              >
                Rental Services
              </Link>
              <Link
                to="/about"
                className="block px-3 py-2 text-base font-medium text-gray-700 hover:text-gray-900 hover:bg-gray-50 rounded-md"
                onClick={() => setIsMenuOpen(false)}
              >
                About
              </Link>
              <Link
                to="/contact"
                className="block px-3 py-2 text-base font-medium text-gray-700 hover:text-gray-900 hover:bg-gray-50 rounded-md"
                onClick={() => setIsMenuOpen(false)}
              >
                Contact
              </Link>
            </div>
          </div>
        )}
      </div>
    </nav>
  );
};

export default Navbar;
