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
  const { currentUser, userProfile: authUserProfile, getUserRole, loading: authLoading, logout } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!authLoading && currentUser) {
      // Use profile from AuthContext if available, otherwise fetch
      if (authUserProfile) {
        setUserProfile(authUserProfile);
        setIsProfileLoading(false);
      } else {
        const fetchUserProfile = async () => {
          try {
            const profile = await userService.getProfile(currentUser.uid);
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
      }
    } else if (!authLoading && !currentUser) {
      setIsProfileLoading(false);
    }
  }, [authLoading, currentUser, authUserProfile]);

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
    <nav className="bg-surface shadow-sm border-b border-muted sticky top-0 z-40">
      <div className="max-w-7xl mx-auto px-6">
        <div className="flex justify-between items-center h-16">
          {/* Logo */}
          <Link to="/" className="flex items-center space-x-2">
            <Home className="w-8 h-8 text-primary" />
            <span className="text-2xl font-bold text-textMain">Aptify</span>
          </Link>

          {/* Desktop Navigation */}
          <div className="hidden lg:flex items-center space-x-8">
            <Link
              to="/buy-sell"
              className="text-textMain hover:text-primary font-medium transition-colors"
            >
              Buy/Sell
            </Link>
            <Link
              to="/services"
              className="text-textMain hover:text-primary font-medium transition-colors"
            >
              Renovation Services
            </Link>
            <Link
              to="/construction-services"
              className="text-textMain hover:text-primary font-medium transition-colors"
            >
              Construction Service
            </Link>
            <Link
              to="/rental-services"
              className="text-textMain hover:text-primary font-medium transition-colors"
            >
              Rental Services
            </Link>
            <Link
              to="/about"
              className="text-textMain hover:text-primary font-medium transition-colors"
            >
              About
            </Link>
            <Link
              to="/contact"
              className="text-textMain hover:text-primary font-medium transition-colors"
            >
              Contact
            </Link>
          </div>

          {/* Right Section */}
          <div className="flex items-center space-x-4">
            {/* Mobile Search */}
            <button className="lg:hidden p-2 text-textSecondary hover:text-primary transition-colors">
              <Search className="w-5 h-5" />
            </button>

            {/* Notification Bell */}
            {currentUser && <NotificationBell />}

            {/* User Menu */}
            {currentUser ? (
              <div className="relative">
                <button
                  onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
                  className="flex items-center space-x-2 p-2 text-textSecondary hover:text-primary transition-colors"
                >
                  {userProfile?.photoURL || authUserProfile?.photoURL || currentUser.photoURL ? (
                    <img
                      src={userProfile?.photoURL || authUserProfile?.photoURL || currentUser.photoURL}
                      alt={userProfile?.displayName || authUserProfile?.displayName || currentUser.email || 'User'}
                      className="w-8 h-8 rounded-full object-cover border-2 border-primary"
                    />
                  ) : (
                    <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center border-2 border-primary">
                      <User className="w-5 h-5 text-primary" />
                    </div>
                  )}
                  <span className="hidden sm:block text-sm font-medium text-textMain">
                    {userProfile?.displayName || userProfile?.name || authUserProfile?.displayName || authUserProfile?.name || currentUser.email}
                  </span>
                </button>

                {isUserMenuOpen && !isProfileLoading && (
                  <div className="absolute right-0 mt-2 w-48 bg-surface rounded-lg shadow-lg border border-muted py-2 z-50">
                    <Link
                      to="/account"
                      className="flex items-center px-4 py-2 text-sm text-textMain hover:bg-muted transition-colors"
                      onClick={() => setIsUserMenuOpen(false)}
                    >
                      <User className="w-4 h-4 mr-2 text-primary" />
                      My Account
                    </Link>
                    <Link
                      to="/notifications"
                      className="flex items-center px-4 py-2 text-sm text-textMain hover:bg-muted transition-colors"
                      onClick={() => setIsUserMenuOpen(false)}
                    >
                      <Bell className="w-4 h-4 mr-2 text-primary" />
                      All Notifications
                    </Link>
                    <Link
                      to="/chats"
                      className="flex items-center px-4 py-2 text-sm text-textMain hover:bg-muted transition-colors"
                      onClick={() => setIsUserMenuOpen(false)}
                    >
                      <MessageSquare className="w-4 h-4 mr-2 text-primary" />
                      Chat
                    </Link>
                    {getUserRole() === 'admin' && (
                      <Link
                        to="/admin"
                        className="flex items-center px-4 py-2 text-sm text-textMain hover:bg-muted transition-colors"
                        onClick={() => setIsUserMenuOpen(false)}
                      >
                        <Home className="w-4 h-4 mr-2 text-primary" />
                        Admin Panel
                      </Link>
                    )}
                    <hr className="my-2 border-muted" />
                    <button
                      onClick={() => {
                        handleLogout();
                        setIsUserMenuOpen(false);
                      }}
                      className="block w-full text-left px-4 py-2 text-sm text-textMain hover:bg-muted transition-colors"
                    >
                      Logout
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <div className="flex items-center space-x-2">
                <Button variant="ghost" size="sm" onClick={() => navigate('/login')}>
                  Sign In
                </Button>
                <Button variant="primary" size="sm" onClick={() => navigate('/signup')}>
                  Sign Up
                </Button>
              </div>
            )}

            {/* Mobile Menu Button */}
            <button
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              className="lg:hidden p-2 text-textSecondary hover:text-primary transition-colors"
            >
              {isMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>

        {/* Mobile Menu */}
        {isMenuOpen && (
          <div className="lg:hidden border-t border-muted bg-surface">
            <div className="px-2 pt-2 pb-3 space-y-1">
              <form onSubmit={handleSearch} className="mb-4">
                <div className="relative">
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search properties..."
                    className="w-full pl-10 pr-4 py-2 border border-muted rounded-base focus:ring-2 focus:ring-primary focus:border-primary bg-surface text-textMain"
                  />
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-textSecondary w-4 h-4" />
                </div>
              </form>

              <Link
                to="/buy-sell"
                className="block px-3 py-2 text-base font-medium text-textSecondary hover:text-primary hover:bg-muted rounded-base transition-colors"
                onClick={() => setIsMenuOpen(false)}
              >
                Buy/Sell
              </Link>
              <Link
                to="/services"
                className="block px-3 py-2 text-base font-medium text-textSecondary hover:text-primary hover:bg-muted rounded-base transition-colors"
                onClick={() => setIsMenuOpen(false)}
              >
                Renovation Services
              </Link>
              <Link
                to="/construction-services"
                className="block px-3 py-2 text-base font-medium text-textSecondary hover:text-primary hover:bg-muted rounded-base transition-colors"
                onClick={() => setIsMenuOpen(false)}
              >
                Construction Service
              </Link>
              <Link
                to="/rental-services"
                className="block px-3 py-2 text-base font-medium text-textSecondary hover:text-primary hover:bg-muted rounded-base transition-colors"
                onClick={() => setIsMenuOpen(false)}
              >
                Rental Services
              </Link>
              <Link
                to="/about"
                className="block px-3 py-2 text-base font-medium text-textSecondary hover:text-primary hover:bg-muted rounded-base transition-colors"
                onClick={() => setIsMenuOpen(false)}
              >
                About
              </Link>
              <Link
                to="/contact"
                className="block px-3 py-2 text-base font-medium text-textSecondary hover:text-primary hover:bg-muted rounded-base transition-colors"
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
