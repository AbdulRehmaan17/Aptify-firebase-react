import React, { useState, useEffect, useRef } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { Search, User, Menu, X, Home, Bell, MessageSquare } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import userService from '../../services/userService';
import toast from 'react-hot-toast';
import Button from '../common/Button';
import NotificationBell from '../notification/NotificationBell';

/**
 * Navbar Component
 * Main navigation bar with user menu and links
 * Improved with better alignment, styling, and responsiveness
 */
const Navbar = () => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [userProfile, setUserProfile] = useState(null);
  const [isProfileLoading, setIsProfileLoading] = useState(true);
  const { currentUser, currentUserRole, loading: authLoading, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const userMenuRef = useRef(null);
  const mobileMenuRef = useRef(null);

  // Fetch user profile when user is authenticated
  useEffect(() => {
    if (!authLoading && currentUser) {
      const fetchUserProfile = async () => {
        try {
          const profile = await userService.getProfile(currentUser.uid);
          setUserProfile(profile);
        } catch (error) {
          console.error('Error fetching user profile:', error);
          if (!error.message?.includes('not found')) {
            toast.error('Failed to load user profile.');
          }
        } finally {
          setIsProfileLoading(false);
        }
      };
      fetchUserProfile();
    } else if (!authLoading && !currentUser) {
      setIsProfileLoading(false);
    }
  }, [authLoading, currentUser]);

  // Close user menu when clicking outside or pressing Escape
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (
        userMenuRef.current &&
        !userMenuRef.current.contains(event.target) &&
        mobileMenuRef.current &&
        !mobileMenuRef.current.contains(event.target)
      ) {
        setIsUserMenuOpen(false);
        if (window.innerWidth < 1024) {
          setIsMenuOpen(false);
        }
      }
    };

    const handleEscape = (event) => {
      if (event.key === 'Escape') {
        setIsUserMenuOpen(false);
        setIsMenuOpen(false);
      }
    };

    if (isUserMenuOpen || isMenuOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('keydown', handleEscape);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleEscape);
    };
  }, [isUserMenuOpen, isMenuOpen]);

  // Prevent body scroll when mobile menu is open
  useEffect(() => {
    if (isMenuOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isMenuOpen]);

  const handleLogout = async () => {
    try {
      await logout();
      toast.success('Logged out successfully');
      setIsUserMenuOpen(false);
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

  // Check if a link is active
  const isActiveLink = (path) => {
    return location.pathname === path || location.pathname.startsWith(`${path}/`);
  };

  // Navigation links
  const navLinks = [
    { to: '/buy-sell', label: 'Buy/Sell' },
    { to: '/services', label: 'Renovation Services' },
    { to: '/construction-services', label: 'Construction' },
    { to: '/rental-services', label: 'Rental Services' },
    { to: '/about', label: 'About' },
    { to: '/contact', label: 'Contact' },
  ];

  return (
    <nav
      className="bg-white shadow-md border-b border-gray-200 sticky top-0 z-50 backdrop-blur-sm bg-white/95"
      role="navigation"
      aria-label="Main navigation"
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Main Navbar Container */}
        <div className="flex items-center justify-between h-16 lg:h-18">
          {/* Logo - Left Aligned */}
          <Link
            to="/"
            className="flex items-center space-x-2.5 flex-shrink-0 group"
            aria-label="Aptify Home"
          >
            <div className="p-1.5 rounded-lg bg-primary/10 group-hover:bg-primary/20 transition-colors">
              <Home className="w-6 h-6 lg:w-7 lg:h-7 text-primary" />
            </div>
            <span className="text-xl lg:text-2xl font-bold text-textMain tracking-tight">
              Aptify
            </span>
          </Link>

          {/* Desktop Navigation Links - Center */}
          <div className="hidden lg:flex items-center justify-center flex-1 px-8">
            <div className="flex items-center space-x-1">
              {navLinks.map((link) => (
                <Link
                  key={link.to}
                  to={link.to}
                  className={`relative px-4 py-2 text-sm font-medium rounded-lg transition-all duration-200 ${
                    isActiveLink(link.to)
                      ? 'text-primary bg-primary/10'
                      : 'text-gray-700 hover:text-primary hover:bg-gray-50'
                  }`}
                  aria-current={isActiveLink(link.to) ? 'page' : undefined}
                >
                  {link.label}
                  {isActiveLink(link.to) && (
                    <span className="absolute bottom-0 left-1/2 transform -translate-x-1/2 w-1 h-1 bg-primary rounded-full" />
                  )}
                </Link>
              ))}
            </div>
          </div>

          {/* Right Section - Actions & User Menu */}
          <div className="flex items-center space-x-2 lg:space-x-3 flex-shrink-0">
            {/* Desktop Search Button */}
            <Link
              to="/properties"
              className="hidden lg:flex items-center justify-center w-10 h-10 rounded-lg text-gray-600 hover:text-primary hover:bg-gray-100 transition-colors"
              aria-label="Search properties"
            >
              <Search className="w-5 h-5" />
            </Link>

            {/* Notification Bell - Only for authenticated users */}
            {currentUser && (
              <div className="hidden lg:block">
                <NotificationBell />
              </div>
            )}

            {/* User Menu or Auth Buttons */}
            {currentUser ? (
              <div className="relative" ref={userMenuRef}>
                <button
                  onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
                  className={`flex items-center space-x-2 px-3 py-2 rounded-lg transition-all duration-200 ${
                    isUserMenuOpen
                      ? 'bg-primary/10 text-primary'
                      : 'text-gray-700 hover:bg-gray-100 hover:text-primary'
                  }`}
                  aria-label="User menu"
                  aria-expanded={isUserMenuOpen}
                  aria-haspopup="true"
                >
                  <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                    {userProfile?.photoURL ? (
                      <img
                        src={userProfile.photoURL}
                        alt={userProfile.displayName || 'User'}
                        className="w-8 h-8 rounded-full object-cover"
                      />
                    ) : (
                      <User className="w-4 h-4 text-primary" />
                    )}
                  </div>
                  <span className="hidden xl:block text-sm font-medium max-w-[120px] truncate">
                    {userProfile?.displayName || currentUser.email?.split('@')[0] || 'User'}
                  </span>
                  <svg
                    className={`w-4 h-4 transition-transform duration-200 ${
                      isUserMenuOpen ? 'rotate-180' : ''
                    }`}
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M19 9l-7 7-7-7"
                    />
                  </svg>
                </button>

                {/* User Dropdown Menu */}
                {isUserMenuOpen && !isProfileLoading && (
                  <div
                    className="absolute right-0 mt-2 w-56 bg-white rounded-xl shadow-xl border border-gray-200 py-2 z-50 transform transition-all duration-200 ease-out origin-top-right"
                    role="menu"
                    aria-orientation="vertical"
                  >
                    {/* User Info Header */}
                    <div className="px-4 py-3 border-b border-gray-100">
                      <p className="text-sm font-semibold text-gray-900 truncate">
                        {userProfile?.displayName || 'User'}
                      </p>
                      <p className="text-xs text-gray-500 truncate mt-0.5">
                        {currentUser.email}
                      </p>
                    </div>

                    {/* Menu Items */}
                    <div className="py-1">
                      <Link
                        to="/account"
                        className="flex items-center px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                        onClick={() => setIsUserMenuOpen(false)}
                        role="menuitem"
                      >
                        <User className="w-4 h-4 mr-3 text-primary" />
                        My Account
                      </Link>
                      <Link
                        to="/notifications"
                        className="flex items-center px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                        onClick={() => setIsUserMenuOpen(false)}
                        role="menuitem"
                      >
                        <Bell className="w-4 h-4 mr-3 text-primary" />
                        Notifications
                      </Link>
                      <Link
                        to="/chats"
                        className="flex items-center px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                        onClick={() => setIsUserMenuOpen(false)}
                        role="menuitem"
                      >
                        <MessageSquare className="w-4 h-4 mr-3 text-primary" />
                        Messages
                      </Link>
                      {currentUserRole === 'admin' && (
                        <Link
                          to="/admin"
                          className="flex items-center px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                          onClick={() => setIsUserMenuOpen(false)}
                          role="menuitem"
                        >
                          <Home className="w-4 h-4 mr-3 text-primary" />
                          Admin Panel
                        </Link>
                      )}
                    </div>

                    {/* Divider */}
                    <div className="border-t border-gray-100 my-1" />

                    {/* Logout */}
                    <div className="py-1">
                      <button
                        onClick={handleLogout}
                        className="flex items-center w-full px-4 py-2.5 text-sm text-red-600 hover:bg-red-50 transition-colors"
                        role="menuitem"
                      >
                        <span className="mr-3">🚪</span>
                        Logout
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="flex items-center space-x-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => navigate('/auth')}
                  className="hidden sm:inline-flex"
                >
                  Sign In
                </Button>
                <Button
                  variant="primary"
                  size="sm"
                  onClick={() => navigate('/auth')}
                >
                  Sign Up
                </Button>
              </div>
            )}

            {/* Mobile Menu Button */}
            <button
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              className="lg:hidden p-2 rounded-lg text-gray-600 hover:text-primary hover:bg-gray-100 transition-colors"
              aria-label="Toggle mobile menu"
              aria-expanded={isMenuOpen}
            >
              {isMenuOpen ? (
                <X className="w-6 h-6" />
              ) : (
                <Menu className="w-6 h-6" />
              )}
            </button>
          </div>
        </div>

        {/* Mobile Menu - Slide Animation */}
        <div
          ref={mobileMenuRef}
          className={`lg:hidden overflow-hidden transition-all duration-300 ease-in-out ${
            isMenuOpen ? 'max-h-screen opacity-100' : 'max-h-0 opacity-0'
          }`}
        >
          <div className="border-t border-gray-200 bg-white py-4">
            {/* Mobile Search */}
            <form onSubmit={handleSearch} className="px-4 mb-4">
              <div className="relative">
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search properties..."
                  className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary bg-white text-gray-900 placeholder-gray-500"
                  aria-label="Search properties"
                />
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              </div>
            </form>

            {/* Mobile Navigation Links */}
            <nav className="px-4 space-y-1" role="navigation" aria-label="Mobile navigation">
              {navLinks.map((link) => (
                <Link
                  key={link.to}
                  to={link.to}
                  onClick={() => setIsMenuOpen(false)}
                  className={`flex items-center px-4 py-3 rounded-lg text-base font-medium transition-colors ${
                    isActiveLink(link.to)
                      ? 'text-primary bg-primary/10'
                      : 'text-gray-700 hover:text-primary hover:bg-gray-50'
                  }`}
                  aria-current={isActiveLink(link.to) ? 'page' : undefined}
                >
                  {link.label}
                </Link>
              ))}

              {/* Mobile User Actions */}
              {currentUser && (
                <>
                  <div className="border-t border-gray-200 my-2" />
                  <Link
                    to="/account"
                    onClick={() => setIsMenuOpen(false)}
                    className="flex items-center px-4 py-3 rounded-lg text-base font-medium text-gray-700 hover:text-primary hover:bg-gray-50 transition-colors"
                  >
                    <User className="w-5 h-5 mr-3 text-primary" />
                    My Account
                  </Link>
                  <Link
                    to="/notifications"
                    onClick={() => setIsMenuOpen(false)}
                    className="flex items-center px-4 py-3 rounded-lg text-base font-medium text-gray-700 hover:text-primary hover:bg-gray-50 transition-colors"
                  >
                    <Bell className="w-5 h-5 mr-3 text-primary" />
                    Notifications
                  </Link>
                  <Link
                    to="/chats"
                    onClick={() => setIsMenuOpen(false)}
                    className="flex items-center px-4 py-3 rounded-lg text-base font-medium text-gray-700 hover:text-primary hover:bg-gray-50 transition-colors"
                  >
                    <MessageSquare className="w-5 h-5 mr-3 text-primary" />
                    Messages
                  </Link>
                  <button
                    onClick={() => {
                      handleLogout();
                      setIsMenuOpen(false);
                    }}
                    className="flex items-center w-full px-4 py-3 rounded-lg text-base font-medium text-red-600 hover:bg-red-50 transition-colors"
                  >
                    <span className="mr-3">🚪</span>
                    Logout
                  </button>
                </>
              )}
            </nav>
          </div>
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
