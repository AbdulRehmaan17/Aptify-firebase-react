import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Eye, EyeOff, Mail, Lock, User, Phone } from 'lucide-react';
import { FcGoogle } from 'react-icons/fc';
import { useAuth } from '../context/AuthContext';
import Button from '../components/common/Button';
import Input from '../components/common/Input';
import toast from 'react-hot-toast';

const Signup = () => {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    password: '',
    confirmPassword: '',
  });
  const [errors, setErrors] = useState({});
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const navigate = useNavigate();
  const { signup, loginWithGoogle, getUserRole } = useAuth();

  const redirectToDashboard = () => {
    const role = getUserRole();
    switch (role) {
      case 'admin':
      case 'superadmin':
        navigate('/admin', { replace: true });
        break;
      case 'provider':
        navigate('/provider-dashboard', { replace: true });
        break;
      case 'constructor':
        navigate('/constructor-dashboard', { replace: true });
        break;
      case 'renovator':
        navigate('/renovator-dashboard', { replace: true });
        break;
      default:
        navigate('/dashboard', { replace: true });
    }
  };

  const validateForm = () => {
    const newErrors = {};

    if (!formData.name) {
      newErrors.name = 'Name is required';
    } else if (formData.name.length < 2) {
      newErrors.name = 'Name must be at least 2 characters';
    }

    if (!formData.email) {
      newErrors.email = 'Email is required';
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      newErrors.email = 'Email is invalid';
    }

    if (!formData.phone) {
      newErrors.phone = 'Phone number is required';
    } else if (!/^[\d\s\-\+\(\)]+$/.test(formData.phone)) {
      newErrors.phone = 'Phone number is invalid';
    }

    if (!formData.password) {
      newErrors.password = 'Password is required';
    } else if (formData.password.length < 6) {
      newErrors.password = 'Password must be at least 6 characters';
    } else if (!/(?=.*[a-z])(?=.*[A-Z])/.test(formData.password)) {
      newErrors.password = 'Password must contain at least one uppercase and one lowercase letter';
    }

    if (!formData.confirmPassword) {
      newErrors.confirmPassword = 'Please confirm your password';
    } else if (formData.password !== formData.confirmPassword) {
      newErrors.confirmPassword = 'Passwords do not match';
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
      const result = await signup(formData.email, formData.password, formData.name, formData.phone);

      if (!result.success) {
        toast.error(result.error || 'Sign up failed');
        setIsLoading(false);
        return;
      }

      toast.success('Account created successfully!');
      
      // Wait a moment for user profile to be created, then redirect
      setTimeout(() => {
        redirectToDashboard();
      }, 500);
    } catch (error) {
      console.error('Signup error:', error);
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
        // Redirect flow - will be handled by handleGoogleRedirect
        return;
      }

      toast.success('Account created with Google');
      redirectToDashboard();
    } catch (error) {
      console.error('Google signup error:', error);
      toast.error(error.message || 'Failed to sign up with Google');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <div className="text-center">
          <h2 className="text-3xl font-display font-bold text-textMain">Create Account</h2>
          <p className="mt-2 text-sm text-textSecondary">
            Join Aptify and start your property journey
          </p>
        </div>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-surface py-8 px-4 shadow-md rounded-base sm:px-10 border border-muted">
          <form onSubmit={handleSubmit} className="space-y-6">
            <Input
              label="Full Name"
              type="text"
              value={formData.name}
              onChange={(e) => handleInputChange('name', e.target.value)}
              error={errors.name}
              leftIcon={<User className="w-4 h-4" />}
              placeholder="Enter your full name"
              required
              autoComplete="name"
            />

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
              label="Phone Number"
              type="tel"
              value={formData.phone}
              onChange={(e) => handleInputChange('phone', e.target.value)}
              error={errors.phone}
              leftIcon={<Phone className="w-4 h-4" />}
              placeholder="Enter your phone number"
              required
              autoComplete="tel"
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
              placeholder="Create a password"
              required
              autoComplete="new-password"
            />

            <Input
              label="Confirm Password"
              type={showPassword ? 'text' : 'password'}
              value={formData.confirmPassword}
              onChange={(e) => handleInputChange('confirmPassword', e.target.value)}
              error={errors.confirmPassword}
              leftIcon={<Lock className="w-4 h-4" />}
              placeholder="Confirm your password"
              required
              autoComplete="new-password"
            />

            <div className="flex items-center">
              <input
                id="terms"
                name="terms"
                type="checkbox"
                required
                className="h-4 w-4 text-primary focus:ring-primary border-muted rounded"
              />
              <label htmlFor="terms" className="ml-2 block text-sm text-textSecondary">
                I agree to the{' '}
                <Link to="/terms" className="text-primary hover:text-primaryDark">
                  Terms of Service
                </Link>{' '}
                and{' '}
                <Link to="/privacy" className="text-primary hover:text-primaryDark">
                  Privacy Policy
                </Link>
              </label>
            </div>

            <Button type="submit" loading={isLoading} fullWidth size="lg">
              Create Account
            </Button>
          </form>

          {/* Google Signup Button */}
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

          {/* Login Link */}
          <div className="mt-6 text-center">
            <p className="text-sm text-textSecondary">
              Already have an account?{' '}
              <Link
                to="/login"
                className="font-medium text-primary hover:text-primaryDark transition-colors"
              >
                Sign in
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Signup;




