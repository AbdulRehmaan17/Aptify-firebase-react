import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Eye, EyeOff, Mail, Lock, User, Phone } from 'lucide-react';
import { FcGoogle } from 'react-icons/fc';
import { useAuth } from '../context/AuthContext';
import { getPostLoginRedirectPath } from '../utils/authHelpers';
import Button from '../components/common/Button';
import Input from '../components/common/Input';
import toast from 'react-hot-toast';

const Auth = () => {
  const [isLogin, setIsLogin] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    confirmPassword: '',
    name: '',
    phone: '',
  });
  const [errors, setErrors] = useState({});

  const navigate = useNavigate();
  const location = useLocation();
  const { signup, login, loginWithGoogle, handleGoogleRedirect, currentUser, loading, userProfile } = useAuth();
  // Get redirect path from URL query param or state
  const searchParams = new URLSearchParams(location.search);
  const nextPath = searchParams.get('next') || location.state?.from?.pathname || '/account';
  const redirectedRef = useRef(false); // Prevent double redirect

  // Safe redirect: only after loading is false
  useEffect(() => {
    if (loading) return; // crucial: wait until auth resolved
    if (currentUser && !redirectedRef.current) {
      redirectedRef.current = true; // avoid double redirect
      // Use role-based redirect path if available, otherwise use next param
      getPostLoginRedirectPath(currentUser, userProfile, nextPath).then((redirectPath) => {
        navigate(redirectPath, { replace: true });
      });
    }
  }, [loading, currentUser, userProfile, location, navigate, nextPath]);

  // Handle Google redirect result on mount (only once, with proper guards)
  useEffect(() => {
    if (loading || currentUser || redirectedRef.current) return; // Guard against re-runs
    
    let mounted = true;
    const checkGoogleRedirect = async () => {
      try {
        const result = await handleGoogleRedirect();
        if (!mounted) return;
        if (result.success && result.user) {
          redirectedRef.current = true; // Mark as redirected
          toast.success('Logged in with Google');
          // Get role-based redirect path
          const redirectPath = await getPostLoginRedirectPath(result.user, userProfile, nextPath);
          navigate(redirectPath, { replace: true });
        }
      } catch (error) {
        // No redirect result, continue normally
      }
    };
    checkGoogleRedirect();
    
    return () => { mounted = false; };
  }, [loading, currentUser, userProfile, nextPath, navigate]); // Include dependencies

  const validateForm = () => {
    const newErrors = {};

    if (!formData.email) {
      newErrors.email = 'Email is required';
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      newErrors.email = 'Email is invalid';
    }

    if (!formData.password) {
      newErrors.password = 'Password is required';
    } else if (formData.password.length < 6) {
      newErrors.password = 'Password must be at least 6 characters';
    }

    if (!isLogin) {
      if (!formData.name) {
        newErrors.name = 'Name is required';
      }
      if (!formData.phone) {
        newErrors.phone = 'Phone number is required';
      } else if (!/^[\d\s\-\+\(\)]+$/.test(formData.phone)) {
        newErrors.phone = 'Phone number is invalid';
      }
      if (!formData.confirmPassword) {
        newErrors.confirmPassword = 'Please confirm your password';
      } else if (formData.password !== formData.confirmPassword) {
        newErrors.confirmPassword = 'Passwords do not match';
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!validateForm()) return;

    setIsLoading(true);
    try {
      let result;
      if (isLogin) {
        result = await login(formData.email, formData.password);
        if (result.success) {
          redirectedRef.current = true; // Mark as redirected to prevent re-renders
          toast.success('Welcome back!');
          // Get role-based redirect path
          const redirectPath = await getPostLoginRedirectPath(result.user, userProfile, nextPath);
          navigate(redirectPath, { replace: true });
        } else {
          toast.error(result.error || 'Failed to login');
        }
      } else {
        result = await signup(formData.email, formData.password, formData.name);
        if (result.success) {
          redirectedRef.current = true; // Mark as redirected to prevent re-renders
          toast.success('Account created successfully!');
          // Get role-based redirect path
          const redirectPath = await getPostLoginRedirectPath(result.user, userProfile, nextPath);
          navigate(redirectPath, { replace: true });
        } else {
          toast.error(result.error || 'Failed to create account');
        }
      }
    } catch (error) {
      console.error('Auth error:', error);
      toast.error(error.message || 'An error occurred. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleInputChange = (field, value) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors((prev) => ({ ...prev, [field]: '' }));
    }
  };

  const handleGoogleLogin = async () => {
    try {
      const result = await loginWithGoogle();
      if (result.success) {
        if (result.redirect) {
          // Redirect flow - will be handled by handleGoogleRedirectResult
          return;
        }
        redirectedRef.current = true; // Mark as redirected to prevent re-renders
        toast.success('Logged in with Google');
        // Get role-based redirect path
        const redirectPath = await getPostLoginRedirectPath(result.user, userProfile, nextPath);
        navigate(redirectPath, { replace: true });
      } else {
        toast.error(result.error || 'Failed to sign in with Google');
      }
    } catch (error) {
      console.error('Google login error:', error);
      toast.error(error.message || 'Failed to sign in with Google. Please try again.');
    }
  };

  // Show loading while auth initializes to prevent blinking
  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-4 border-primary border-t-transparent mb-4"></div>
          <p className="text-textSecondary">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <div className="text-center">
          <h2 className="text-3xl font-display font-bold text-textMain">
            {isLogin ? 'Welcome Back' : 'Create Account'}
          </h2>
          <p className="mt-2 text-sm text-textSecondary">
            {isLogin
              ? 'Enter your credentials to access your account'
              : 'Join Aptify and start your property journey'}
          </p>
        </div>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-surface py-8 px-4 shadow-md rounded-base sm:px-10">
          {/* Tabs */}
          <div className="flex mb-6 border-b border-muted">
            <button
              type="button"
              onClick={() => {
                setIsLogin(true);
                setErrors({});
                setFormData({
                  email: '',
                  password: '',
                  confirmPassword: '',
                  name: '',
                  phone: '',
                });
              }}
              className={`flex-1 py-2 text-center font-medium transition-colors ${
                isLogin
                  ? 'text-primary border-b-2 border-primary'
                  : 'text-textSecondary hover:text-textMain'
              }`}
            >
              Login
            </button>
            <button
              type="button"
              onClick={() => {
                setIsLogin(false);
                setErrors({});
                setFormData({
                  email: '',
                  password: '',
                  confirmPassword: '',
                  name: '',
                  phone: '',
                });
              }}
              className={`flex-1 py-2 text-center font-medium transition-colors ${
                !isLogin
                  ? 'text-primary border-b-2 border-primary'
                  : 'text-textSecondary hover:text-textMain'
              }`}
            >
              Register
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            {!isLogin && (
              <Input
                label="Full Name"
                type="text"
                value={formData.name}
                onChange={(e) => handleInputChange('name', e.target.value)}
                error={errors.name}
                leftIcon={<User className="w-4 h-4" />}
                placeholder="Enter your full name"
                required
              />
            )}

            <Input
              label="Email Address"
              type="email"
              value={formData.email}
              onChange={(e) => handleInputChange('email', e.target.value)}
              error={errors.email}
              leftIcon={<Mail className="w-4 h-4" />}
              placeholder="Enter your email"
              required
            />

            {!isLogin && (
              <Input
                label="Phone Number"
                type="tel"
                value={formData.phone}
                onChange={(e) => handleInputChange('phone', e.target.value)}
                error={errors.phone}
                leftIcon={<Phone className="w-4 h-4" />}
                placeholder="Enter your phone number"
                required
              />
            )}

            <Input
              label="Password"
              type={showPassword ? 'text' : 'password'}
              value={formData.password}
              onChange={(e) => handleInputChange('password', e.target.value)}
              error={errors.password}
              leftIcon={<Lock className="w-4 h-4" />}
              rightIcon={
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="text-textSecondary hover:text-textMain"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              }
              placeholder="Enter your password"
              required
            />

            {!isLogin && (
              <Input
                label="Confirm Password"
                type={showPassword ? 'text' : 'password'}
                value={formData.confirmPassword}
                onChange={(e) => handleInputChange('confirmPassword', e.target.value)}
                error={errors.confirmPassword}
                leftIcon={<Lock className="w-4 h-4" />}
                placeholder="Confirm your password"
                required
              />
            )}

            <Button type="submit" loading={isLoading} fullWidth size="lg">
              {isLogin ? 'Sign In' : 'Create Account'}
            </Button>
          </form>

          {/* Google Login Button */}
          <div className="mt-6">
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-muted" />
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-2 bg-surface text-textSecondary">Or continue with</span>
              </div>
            </div>

            <button
              type="button"
              onClick={handleGoogleLogin}
              className="mt-4 w-full flex items-center justify-center gap-3 px-4 py-3 border border-muted rounded-base bg-surface text-textMain font-medium hover:bg-background transition-colors shadow-sm"
            >
              <FcGoogle className="w-5 h-5" />
              <span>Continue with Google</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Auth;
