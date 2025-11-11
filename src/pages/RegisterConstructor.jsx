import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { collection, query, where, getDocs, addDoc, serverTimestamp } from 'firebase/firestore';
import { db, auth } from '../firebase';
import { useAuth } from '../context/AuthContext';
import { Building2, CheckCircle, AlertCircle, User, Briefcase, Calendar, Phone, Mail } from 'lucide-react';
import Button from '../components/common/Button';
import LoadingSpinner from '../components/common/LoadingSpinner';
import toast from 'react-hot-toast';

/**
 * RegisterConstructor Component
 * 
 * Allows authenticated users to register themselves as construction service providers.
 * When submitted, creates a document in Firestore "serviceProviders" collection with serviceType = "Construction".
 * Checks if user is already registered before allowing submission.
 */
const RegisterConstructor = () => {
  const navigate = useNavigate();
  const { user: contextUser, loading: authLoading } = useAuth();

  // Get currentUser from Firebase auth
  const currentUser = auth.currentUser || contextUser;

  // Form state
  const [formData, setFormData] = useState({
    name: '',
    expertise: '',
    experienceYears: '',
    phone: '',
    email: '',
  });

  // UI state
  const [loading, setLoading] = useState(false);
  const [checkingRegistration, setCheckingRegistration] = useState(true);
  const [isAlreadyRegistered, setIsAlreadyRegistered] = useState(false);
  const [errors, setErrors] = useState({});

  /**
   * Check if user is already registered as a constructor
   * Queries "serviceProviders" collection where userId == currentUser.uid
   */
  useEffect(() => {
    const checkExistingRegistration = async () => {
      if (authLoading) {
        return;
      }

      if (!currentUser || !currentUser.uid) {
        setCheckingRegistration(false);
        return;
      }

      try {
        setCheckingRegistration(true);
        console.log('Checking if user is already registered as constructor:', currentUser.uid);

        // Query serviceProviders collection filtered by userId
        const providersQuery = query(
          collection(db, 'serviceProviders'),
          where('userId', '==', currentUser.uid)
        );

        const snapshot = await getDocs(providersQuery);

        if (!snapshot.empty) {
          // User is already registered
          setIsAlreadyRegistered(true);
          const existingProvider = snapshot.docs[0].data();
          console.log('User is already registered:', existingProvider);
          
          // Pre-fill form with existing data
          setFormData({
            name: existingProvider.name || '',
            expertise: Array.isArray(existingProvider.expertise) 
              ? existingProvider.expertise.join(', ') 
              : existingProvider.expertise || '',
            experienceYears: existingProvider.experienceYears?.toString() || '',
            phone: existingProvider.phone || '',
            email: existingProvider.email || currentUser.email || '',
          });
        } else {
          // User is not registered, pre-fill email from currentUser
          setFormData(prev => ({
            ...prev,
            email: currentUser.email || '',
          }));
        }
      } catch (error) {
        console.error('Error checking existing registration:', error);
        toast.error('Failed to check registration status. Please try again.');
      } finally {
        setCheckingRegistration(false);
      }
    };

    checkExistingRegistration();
  }, [currentUser, authLoading]);

  /**
   * Handle form field changes
   */
  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    
    // Clear error for this field when user starts typing
    if (errors[name]) {
      setErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[name];
        return newErrors;
      });
    }
  };

  /**
   * Validate form fields
   * Returns true if valid, false otherwise
   */
  const validateForm = () => {
    const newErrors = {};

    // Validate name
    if (!formData.name.trim()) {
      newErrors.name = 'Full name is required';
    } else if (formData.name.trim().length < 2) {
      newErrors.name = 'Name must be at least 2 characters';
    }

    // Validate expertise
    if (!formData.expertise.trim()) {
      newErrors.expertise = 'Expertise is required';
    } else if (formData.expertise.trim().length < 5) {
      newErrors.expertise = 'Please provide more details about your expertise';
    }

    // Validate experience years
    if (!formData.experienceYears.trim()) {
      newErrors.experienceYears = 'Years of experience is required';
    } else {
      const years = Number(formData.experienceYears);
      if (isNaN(years) || years < 0 || years > 100) {
        newErrors.experienceYears = 'Please enter a valid number of years (0-100)';
      }
    }

    // Validate phone
    if (!formData.phone.trim()) {
      newErrors.phone = 'Phone number is required';
    } else if (formData.phone.trim().length < 10) {
      newErrors.phone = 'Please enter a valid phone number';
    }

    // Validate email
    if (!formData.email.trim()) {
      newErrors.email = 'Email is required';
    } else {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(formData.email.trim())) {
        newErrors.email = 'Please enter a valid email address';
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  /**
   * Handle form submission
   * Creates a new document in "serviceProviders" collection
   */
  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!currentUser || !currentUser.uid) {
      toast.error('Please log in to register as a constructor.');
      navigate('/auth');
      return;
    }

    // If already registered, show message and don't allow re-registration
    if (isAlreadyRegistered) {
      toast.error('You are already registered as a constructor.');
      return;
    }

    // Validate form
    if (!validateForm()) {
      toast.error('Please fix the errors in the form.');
      return;
    }

    try {
      setLoading(true);

      // Check again if user is already registered (race condition protection)
      const providersQuery = query(
        collection(db, 'serviceProviders'),
        where('userId', '==', currentUser.uid)
      );
      const snapshot = await getDocs(providersQuery);

      if (!snapshot.empty) {
        setIsAlreadyRegistered(true);
        toast.error('You are already registered as a constructor.');
        setLoading(false);
        return;
      }

      // Prepare provider data
      // Convert expertise string to array (split by comma)
      const expertiseArray = formData.expertise
        .split(',')
        .map(item => item.trim())
        .filter(item => item.length > 0);

      const providerData = {
        userId: currentUser.uid,
        name: formData.name.trim(),
        serviceType: 'Construction',
        expertise: expertiseArray.length > 0 ? expertiseArray : [formData.expertise.trim()],
        experienceYears: Number(formData.experienceYears),
        rating: 0, // Initial rating
        phone: formData.phone.trim(),
        email: formData.email.trim(),
        createdAt: serverTimestamp(),
      };

      // Add document to Firestore
      const docRef = await addDoc(collection(db, 'serviceProviders'), providerData);
      console.log('Constructor registered with ID:', docRef.id);
      console.log('Provider data:', providerData);

      toast.success('You have been successfully registered as a Construction Service Provider.');
      
      // Navigate to construction list to see the new provider
      navigate('/construction-list');
    } catch (error) {
      console.error('Error registering as constructor:', error);
      
      // Handle specific Firestore errors
      if (error.code === 'permission-denied') {
        toast.error('Permission denied. Please check Firestore security rules.');
      } else {
        toast.error(error.message || 'Failed to register as constructor. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  // Show loading spinner while checking auth or registration status
  if (authLoading || checkingRegistration) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  // Redirect to login if not authenticated
  if (!currentUser || !currentUser.uid) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <p className="text-gray-600 mb-4">Please log in to register as a constructor.</p>
          <Button onClick={() => navigate('/auth')}>Log In</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-12 bg-gray-50 min-h-screen">
      {/* Page Header */}
      <div className="mb-8">
        <h1 className="text-4xl font-display font-bold text-gray-900 mb-2">
          Register as Constructor
        </h1>
        <p className="text-lg text-gray-600">
          Register yourself as a construction service provider to start receiving project requests.
        </p>
      </div>

      {/* Already Registered Message */}
      {isAlreadyRegistered && (
        <div className="bg-slate-50 border-l-4 border-slate-400 text-slate-800 p-4 mb-6 rounded-lg flex items-start">
          <CheckCircle className="w-5 h-5 mr-3 flex-shrink-0 mt-0.5" />
          <div>
            <p className="font-semibold mb-1">You are already registered as a constructor.</p>
            <p className="text-sm">
              Your registration details are shown below. If you need to update your information, please contact support.
            </p>
          </div>
        </div>
      )}

      {/* Form Container */}
      <div className="bg-white rounded-xl shadow-xl p-6 sm:p-8">
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Full Name Field */}
          <div>
            <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-2">
              <User className="w-4 h-4 inline mr-1" />
              Full Name <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              id="name"
              name="name"
              value={formData.name}
              onChange={handleChange}
              disabled={isAlreadyRegistered}
              placeholder="Enter your full name"
              className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-slate-500 focus:border-slate-500 transition-colors ${
                errors.name ? 'border-red-500' : 'border-gray-300'
              } ${isAlreadyRegistered ? 'bg-gray-100 cursor-not-allowed' : ''}`}
            />
            {errors.name && (
              <p className="mt-1 text-sm text-red-600">{errors.name}</p>
            )}
          </div>

          {/* Expertise Field */}
          <div>
            <label htmlFor="expertise" className="block text-sm font-medium text-gray-700 mb-2">
              <Briefcase className="w-4 h-4 inline mr-1" />
              Expertise <span className="text-red-500">*</span>
            </label>
            <textarea
              id="expertise"
              name="expertise"
              value={formData.expertise}
              onChange={handleChange}
              disabled={isAlreadyRegistered}
              rows={3}
              placeholder="e.g., Residential Construction, Remodeling, Interior Finishing (separate with commas)"
              className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-slate-500 focus:border-slate-500 transition-colors resize-none ${
                errors.expertise ? 'border-red-500' : 'border-gray-300'
              } ${isAlreadyRegistered ? 'bg-gray-100 cursor-not-allowed' : ''}`}
            />
            <p className="mt-1 text-xs text-gray-500">
              List your areas of expertise, separated by commas
            </p>
            {errors.expertise && (
              <p className="mt-1 text-sm text-red-600">{errors.expertise}</p>
            )}
          </div>

          {/* Years of Experience Field */}
          <div>
            <label htmlFor="experienceYears" className="block text-sm font-medium text-gray-700 mb-2">
              <Calendar className="w-4 h-4 inline mr-1" />
              Years of Experience <span className="text-red-500">*</span>
            </label>
            <input
              type="number"
              id="experienceYears"
              name="experienceYears"
              value={formData.experienceYears}
              onChange={handleChange}
              disabled={isAlreadyRegistered}
              min="0"
              max="100"
              placeholder="Enter years of experience"
              className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-slate-500 focus:border-slate-500 transition-colors ${
                errors.experienceYears ? 'border-red-500' : 'border-gray-300'
              } ${isAlreadyRegistered ? 'bg-gray-100 cursor-not-allowed' : ''}`}
            />
            {errors.experienceYears && (
              <p className="mt-1 text-sm text-red-600">{errors.experienceYears}</p>
            )}
          </div>

          {/* Phone Field */}
          <div>
            <label htmlFor="phone" className="block text-sm font-medium text-gray-700 mb-2">
              <Phone className="w-4 h-4 inline mr-1" />
              Phone Number <span className="text-red-500">*</span>
            </label>
            <input
              type="tel"
              id="phone"
              name="phone"
              value={formData.phone}
              onChange={handleChange}
              disabled={isAlreadyRegistered}
              placeholder="e.g., +92 300 123-4567"
              className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-slate-500 focus:border-slate-500 transition-colors ${
                errors.phone ? 'border-red-500' : 'border-gray-300'
              } ${isAlreadyRegistered ? 'bg-gray-100 cursor-not-allowed' : ''}`}
            />
            {errors.phone && (
              <p className="mt-1 text-sm text-red-600">{errors.phone}</p>
            )}
          </div>

          {/* Email Field */}
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
              <Mail className="w-4 h-4 inline mr-1" />
              Email Address <span className="text-red-500">*</span>
            </label>
            <input
              type="email"
              id="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              disabled={isAlreadyRegistered}
              placeholder="your.email@example.com"
              className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-slate-500 focus:border-slate-500 transition-colors ${
                errors.email ? 'border-red-500' : 'border-gray-300'
              } ${isAlreadyRegistered ? 'bg-gray-100 cursor-not-allowed' : ''}`}
            />
            {errors.email && (
              <p className="mt-1 text-sm text-red-600">{errors.email}</p>
            )}
          </div>

          {/* Submit Button */}
          <div className="flex flex-col sm:flex-row gap-4 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => navigate(-1)}
              className="flex-1"
              disabled={loading || isAlreadyRegistered}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
              loading={loading}
              disabled={loading || isAlreadyRegistered}
              className="flex-1"
            >
              {isAlreadyRegistered ? (
                <>
                  <CheckCircle className="w-4 h-4 mr-2" />
                  Already Registered
                </>
              ) : (
                <>
                  <Building2 className="w-4 h-4 mr-2" />
                  Register as Constructor
                </>
              )}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default RegisterConstructor;

