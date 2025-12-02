import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Mail, ArrowLeft, CheckCircle } from 'lucide-react';
import Button from '../components/common/Button';
import Input from '../components/common/Input';
import toast from 'react-hot-toast';
import { resetPassword } from '../firebase/authFunctions';

const ForgotPassword = () => {
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  const validateEmail = () => {
    if (!email) {
      setError('Email is required');
      return false;
    }
    if (!/\S+@\S+\.\S+/.test(email)) {
      setError('Email is invalid');
      return false;
    }
    setError('');
    return true;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!validateEmail()) {
      return;
    }

    setIsLoading(true);
    try {
      const result = await resetPassword(email);

      if (!result.success) {
        toast.error(result.error || 'Failed to send password reset email');
        setError(result.error || 'Failed to send password reset email');
        setIsLoading(false);
        return;
      }

      setIsSuccess(true);
      toast.success('Password reset email sent! Check your inbox.');
    } catch (error) {
      console.error('Password reset error:', error);
      const errorMessage = error.message || 'An error occurred. Please try again.';
      toast.error(errorMessage);
      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  const handleEmailChange = (value) => {
    setEmail(value);
    // Clear error when user starts typing
    if (error) {
      setError('');
    }
  };

  if (isSuccess) {
    return (
      <div className="min-h-screen bg-background flex flex-col justify-center py-12 sm:px-6 lg:px-8">
        <div className="sm:mx-auto sm:w-full sm:max-w-md">
          <div className="bg-surface py-8 px-4 shadow-md rounded-base sm:px-10 border border-muted">
            <div className="text-center">
              <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-primary/10">
                <CheckCircle className="h-6 w-6 text-primary" />
              </div>
              <h2 className="mt-6 text-2xl font-display font-bold text-textMain">
                Check your email
              </h2>
              <p className="mt-2 text-sm text-textSecondary">
                We've sent a password reset link to <strong>{email}</strong>
              </p>
              <p className="mt-4 text-sm text-textSecondary">
                Please check your inbox and click the link to reset your password. If you don't see
                the email, check your spam folder.
              </p>
              <div className="mt-6 space-y-4">
                <Button
                  onClick={() => {
                    setIsSuccess(false);
                    setEmail('');
                  }}
                  fullWidth
                >
                  Send another email
                </Button>
                <Link
                  to="/login"
                  className="block text-center text-sm font-medium text-primary hover:text-primaryDark transition-colors"
                >
                  <ArrowLeft className="inline w-4 h-4 mr-1" />
                  Back to login
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <div className="text-center">
          <h2 className="text-3xl font-display font-bold text-textMain">Forgot Password</h2>
          <p className="mt-2 text-sm text-textSecondary">
            Enter your email address and we'll send you a link to reset your password
          </p>
        </div>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-surface py-8 px-4 shadow-md rounded-base sm:px-10 border border-muted">
          <form onSubmit={handleSubmit} className="space-y-6">
            <Input
              label="Email Address"
              type="email"
              value={email}
              onChange={(e) => handleEmailChange(e.target.value)}
              error={error}
              leftIcon={<Mail className="w-4 h-4" />}
              placeholder="Enter your email"
              required
              autoComplete="email"
              autoFocus
            />

            <Button type="submit" loading={isLoading} fullWidth size="lg">
              Send Reset Link
            </Button>
          </form>

          <div className="mt-6 text-center">
            <Link
              to="/login"
              className="inline-flex items-center text-sm font-medium text-primary hover:text-primaryDark transition-colors"
            >
              <ArrowLeft className="w-4 h-4 mr-1" />
              Back to login
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ForgotPassword;

