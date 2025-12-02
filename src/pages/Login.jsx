import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { Eye, EyeOff, Mail, Lock } from 'lucide-react';
import { FcGoogle } from 'react-icons/fc';
import { useAuth } from '../context/AuthContext';
import Button from '../components/common/Button';
import Input from '../components/common/Input';
import toast from 'react-hot-toast';

const Login = () => {
  const [formData, setFormData] = useState({
    email: '',
    password: '',
  });
  const [errors, setErrors] = useState({});
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const navigate = useNavigate();
  const location = useLocation();
  const { login, loginWithGoogle, handleGoogleRedirect, getUserRole } = useAuth();
  const from = location.state?.from?.pathname || '/';

  // Handle Google redirect result on mount
  useEffect(() => {
    const checkGoogleRedirect = async () => {
      const result = await handleGoogleRedirect();
      if (result.success && result.user) {
        toast.success('Logged in with Google');
        redirectToDashboard();
      } else if (result.error) {
        toast.error(result.error);
      }
    };
    checkGoogleRedirect();
  }, []);

  const redirectToDashboard = () => {
    const role = getUserRole();
    if (role === 'admin') {
      navigate('/admin', { replace: true });
    } else if (role === 'constructor' || role === 'renovator' || role === 'provider') {
      navigate('/provider-dashboard', { replace: true });
    } else {
      navigate('/dashboard', { replace: true });
    }
  };

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

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleInputChange = (field, value) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    // Clear error when user starts typing
    if (errors[field]) {
      setErrors((prev) => ({ ...prev, [field]: '' }));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    setIsLoading(true);
    try {
      const result = await login(formData.email, formData.password);

      if (!result.success) {
        toast.error(result.error || 'Login failed');
        setIsLoading(false);
        return;
      }

      toast.success('Welcome back!');
      redirectToDashboard();
    } catch (error) {
      console.error('Login error:', error);
      toast.error(error.message || 'An error occurred. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    try {
      setIsLoading(true);
      const result = await loginWithGoogle();

      if (!result.success) {
        toast.error(result.error || 'Failed to sign in with Google');
        setIsLoading(false);
        return;
      }

      if (result.redirect) {
        // Redirect flow - will be handled by handleGoogleRedirect in useEffect
        return;
      }

      toast.success('Logged in with Google');
      redirectToDashboard();
    } catch (error) {
      console.error('Google login error:', error);
      toast.error(error.message || 'Failed to sign in with Google');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <div className="text-center">
          <h2 className="text-3xl font-display font-bold text-textMain">Welcome Back</h2>
          <p className="mt-2 text-sm text-textSecondary">
            Enter your credentials to access your account
          </p>
        </div>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-surface py-8 px-4 shadow-md rounded-base sm:px-10 border border-muted">
          <form onSubmit={handleSubmit} className="space-y-6">
            <Input
              label="Email Address"
              type="email"
              value={formData.email}
              onChange={(e) => handleInputChange('email', e.target.value)}
              error={errors.email}
              leftIcon={<Mail className="w-4 h-4" />}
              placeholder="Enter your email"
              required
              autoComplete="email"
            />

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
                  className="text-textSecondary hover:text-textMain transition-colors"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              }
              placeholder="Enter your password"
              required
              autoComplete="current-password"
            />

            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <input
                  id="remember-me"
                  name="remember-me"
                  type="checkbox"
                  className="h-4 w-4 text-primary focus:ring-primary border-muted rounded"
                />
                <label htmlFor="remember-me" className="ml-2 block text-sm text-textSecondary">
                  Remember me
                </label>
              </div>

              <div className="text-sm">
                <Link
                  to="/forgot-password"
                  className="font-medium text-primary hover:text-primaryDark transition-colors"
                >
                  Forgot password?
                </Link>
              </div>
            </div>

            <Button type="submit" loading={isLoading} fullWidth size="lg">
              Sign In
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
              disabled={isLoading}
              className="mt-4 w-full flex items-center justify-center gap-3 px-4 py-3 border border-muted rounded-base bg-surface text-textMain font-medium hover:bg-background transition-colors shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <FcGoogle className="w-5 h-5" />
              <span>Continue with Google</span>
            </button>
          </div>

          {/* Sign Up Link */}
          <div className="mt-6 text-center">
            <p className="text-sm text-textSecondary">
              Don't have an account?{' '}
              <Link
                to="/signup"
                className="font-medium text-primary hover:text-primaryDark transition-colors"
              >
                Sign up
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;



