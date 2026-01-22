import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { collection, query, where, getDocs, addDoc, serverTimestamp } from 'firebase/firestore';
import { db, auth } from '../firebase';
import { uploadImage } from '../firebase/storageFunctions';
import { useAuth } from '../context/AuthContext';
import {
  Wrench,
  CheckCircle,
  AlertCircle,
  User,
  Briefcase,
  Calendar,
  Phone,
  Mail,
  MapPin,
  Link as LinkIcon,
  Upload,
  FileText,
  Image as ImageIcon,
} from 'lucide-react';
import Button from '../components/common/Button';
import LoadingSpinner from '../components/common/LoadingSpinner';
import toast from 'react-hot-toast';

/**
 * RegisterRenovator Component
 *
 * Allows authenticated users to register themselves as renovation service providers.
 * When submitted, creates a document in Firestore "serviceProviders" collection with serviceType = "Renovation".
 * Checks if user is already registered before allowing submission.
 */
const RegisterRenovator = () => {
  const navigate = useNavigate();
  const { user: contextUser, loading: authLoading } = useAuth();

  // Get currentUser from Firebase auth
  const currentUser = auth?.currentUser || contextUser;

  // Form state
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    experience: '',
    specialization: '',
    portfolioLinks: '',
    city: '',
  });

  // File uploads
  const [cnicFile, setCnicFile] = useState(null);
  const [cnicPreview, setCnicPreview] = useState(null);
  const [profileImageFile, setProfileImageFile] = useState(null);
  const [profileImagePreview, setProfileImagePreview] = useState(null);

  // UI state
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [checkingRegistration, setCheckingRegistration] = useState(true);
  const [isAlreadyRegistered, setIsAlreadyRegistered] = useState(false);
  const [errors, setErrors] = useState({});

  /**
   * Check if user is already registered as a renovator
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
        console.log('Checking if user is already registered as renovator:', currentUser.uid);

        // Query serviceProviders collection filtered by userId
        const providersQuery = query(
          collection(db, 'serviceProviders'),
          where('userId', '==', currentUser.uid)
        );

        const snapshot = await getDocs(providersQuery);

        // Filter for Renovation service type
        const renovationProvider = snapshot.docs.find(
          (doc) => doc.data().serviceType === 'Renovation'
        );

        if (renovationProvider) {
          // User is already registered
          setIsAlreadyRegistered(true);
          const existingProvider = renovationProvider.data();
          console.log('User is already registered as renovator:', existingProvider);

          // Pre-fill form with existing data
          setFormData({
            name: existingProvider.name || currentUser.displayName || '',
            phone: existingProvider.phone || '',
            experience: existingProvider.experienceYears?.toString() || existingProvider.experience?.toString() || '',
            specialization: Array.isArray(existingProvider.specialization)
              ? existingProvider.specialization.join(', ')
              : existingProvider.specialization || existingProvider.expertise || '',
            portfolioLinks: Array.isArray(existingProvider.portfolioLinks)
              ? existingProvider.portfolioLinks.join('\n')
              : existingProvider.portfolioLinks || '',
            city: existingProvider.city || '',
          });
        } else {
          // User is not registered, pre-fill name from currentUser
          setFormData((prev) => ({
            ...prev,
            name: currentUser.displayName || currentUser.email?.split('@')[0] || '',
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
    setFormData((prev) => ({ ...prev, [name]: value }));

    // Clear error for this field when user starts typing
    if (errors[name]) {
      setErrors((prev) => {
        const newErrors = { ...prev };
        delete newErrors[name];
        return newErrors;
      });
    }
  };

  /**
   * Handle CNIC file upload
   */
  const handleCnicChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      // Validate file type (PDF or image)
      if (!file.type.startsWith('image/') && file.type !== 'application/pdf') {
        toast.error('CNIC must be an image or PDF file');
        return;
      }
      // Validate file size (max 5MB)
      if (file.size > 5 * 1024 * 1024) {
        toast.error('CNIC file must be less than 5MB');
        return;
      }
      setCnicFile(file);
      if (file.type.startsWith('image/')) {
        setCnicPreview(URL.createObjectURL(file));
      } else {
        setCnicPreview(null);
      }
    }
  };

  /**
   * Handle profile image upload
   */
  const handleProfileImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      // Validate file type (image only)
      if (!file.type.startsWith('image/')) {
        toast.error('Profile image must be an image file');
        return;
      }
      // Validate file size (max 5MB)
      if (file.size > 5 * 1024 * 1024) {
        toast.error('Profile image must be less than 5MB');
        return;
      }
      setProfileImageFile(file);
      setProfileImagePreview(URL.createObjectURL(file));
    }
  };

  /**
   * Upload files to Firebase Storage
   */
  const uploadFiles = async () => {
    const uploads = {};

    if (cnicFile) {
      try {
        const folder = `user_uploads/${currentUser.uid}/cnic`;
        uploads.cnicUrl = await uploadImage(cnicFile, folder);
      } catch (error) {
        console.error('Error uploading CNIC:', error);
        throw new Error('Failed to upload CNIC document');
      }
    }

    if (profileImageFile) {
      try {
        const folder = `user_uploads/${currentUser.uid}/profile`;
        uploads.profileImageUrl = await uploadImage(profileImageFile, folder);
      } catch (error) {
        console.error('Error uploading profile image:', error);
        throw new Error('Failed to upload profile image');
      }
    }

    return uploads;
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

    // Validate phone
    if (!formData.phone.trim()) {
      newErrors.phone = 'Phone number is required';
    } else if (!/^[\d\s\-\+\(\)]+$/.test(formData.phone.trim())) {
      newErrors.phone = 'Please enter a valid phone number';
    }

    // Validate experience
    if (!formData.experience.trim()) {
      newErrors.experience = 'Years of experience is required';
    } else {
      const years = Number(formData.experience);
      if (isNaN(years) || years < 0 || years > 100) {
        newErrors.experience = 'Please enter a valid number of years (0-100)';
      }
    }

    // Validate specialization
    if (!formData.specialization.trim()) {
      newErrors.specialization = 'Specialization is required';
    } else if (formData.specialization.trim().length < 3) {
      newErrors.specialization = 'Please provide your specialization';
    }

    // Validate city
    if (!formData.city.trim()) {
      newErrors.city = 'City is required';
    }

    // Validate CNIC (required)
    if (!cnicFile) {
      newErrors.cnic = 'CNIC document is required';
    }

    // Profile image is optional, no validation needed

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
      toast.error('Please log in to register as a renovator.');
      navigate('/auth');
      return;
    }

    // If already registered, show message and don't allow re-registration
    if (isAlreadyRegistered) {
      toast.error('You are already registered as a renovator.');
      return;
    }

    // Validate form
    if (!validateForm()) {
      toast.error('Please fix the errors in the form.');
      return;
    }

    try {
      setLoading(true);
      setUploading(true);

      // Check again if user is already registered (race condition protection)
      const providersQuery = query(
        collection(db, 'serviceProviders'),
        where('userId', '==', currentUser.uid)
      );
      const snapshot = await getDocs(providersQuery);

      // Check if user already has Renovation service type
      const renovationProvider = snapshot.docs.find(
        (doc) => doc.data().serviceType === 'Renovation'
      );

      if (renovationProvider) {
        setIsAlreadyRegistered(true);
        toast.error('You are already registered as a renovator.');
        setLoading(false);
        setUploading(false);
        return;
      }

      // Upload files first
      const uploads = await uploadFiles();
      setUploading(false);

      // Prepare provider data
      // Convert specialization string to array (split by comma or newline)
      const specializationArray = formData.specialization
        .split(/[,\n]/)
        .map((item) => item.trim())
        .filter((item) => item.length > 0);

      // Convert portfolio links string to array (split by newline)
      const portfolioLinksArray = formData.portfolioLinks
        .split('\n')
        .map((link) => link.trim())
        .filter((link) => link.length > 0 && (link.startsWith('http://') || link.startsWith('https://')));

      const providerData = {
        userId: currentUser.uid,
        name: formData.name.trim(),
        phone: formData.phone.trim(),
        experience: Number(formData.experience),
        experienceYears: Number(formData.experience), // Keep for backward compatibility
        specialization: specializationArray.length > 0 ? specializationArray : [formData.specialization.trim()],
        expertise: specializationArray.length > 0 ? specializationArray : [formData.specialization.trim()], // Keep for backward compatibility
        portfolioLinks: portfolioLinksArray,
        city: formData.city.trim(),
        serviceType: 'Renovation',
        role: 'renovator',
        isApproved: false,
        approved: false, // Keep for backward compatibility
        rating: 0,
        totalProjects: 0,
        completedProjects: 0,
        email: currentUser.email || '',
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      };

      // Add file URLs if uploaded
      if (uploads.cnicUrl) {
        providerData.cnicUrl = uploads.cnicUrl;
      }
      if (uploads.profileImageUrl) {
        providerData.profileImageUrl = uploads.profileImageUrl;
        providerData.profileImage = uploads.profileImageUrl; // Keep for backward compatibility
      }

      // Add document to Firestore
      const docRef = await addDoc(collection(db, 'serviceProviders'), providerData);
      console.log('Renovator registered with ID:', docRef.id);
      console.log('Provider data:', providerData);

      toast.success('Registration submitted successfully! Your application is pending admin approval.');

      // Navigate to renovation providers list
      navigate('/renovation-providers');
    } catch (error) {
      console.error('Error registering as renovator:', error);
      setUploading(false);

      // Handle specific Firestore errors
      if (error.code === 'permission-denied') {
        toast.error('Permission denied. Please check Firestore security rules.');
      } else {
        toast.error(error.message || 'Failed to register as renovator. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  // Show loading spinner while checking auth or registration status
  if (authLoading || checkingRegistration) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  // Redirect to login if not authenticated
  if (!currentUser || !currentUser.uid) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <p className="text-textSecondary mb-4">Please log in to register as a renovator.</p>
          <Button onClick={() => navigate('/auth')}>Log In</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-12 bg-background min-h-screen">
      {/* Page Header */}
      <div className="mb-8">
        <h1 className="text-4xl font-display font-bold text-textMain mb-2">
          Register as Renovator
        </h1>
        <p className="text-lg text-textSecondary">
          Register yourself as a renovation service provider to start receiving project requests.
        </p>
      </div>

      {/* Already Registered Message */}
      {isAlreadyRegistered && (
        <div className="bg-primary/10 border-l-4 border-primary text-textMain p-4 mb-6 rounded-lg flex items-start">
          <CheckCircle className="w-5 h-5 mr-3 flex-shrink-0 mt-0.5" />
          <div>
            <p className="font-semibold mb-1">You are already registered as a renovator.</p>
            <p className="text-sm">
              Your registration details are shown below. If you need to update your information,
              please contact support.
            </p>
          </div>
        </div>
      )}

      {/* Form Container */}
      <div className="bg-surface rounded-base shadow-xl p-6 sm:p-8">
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Full Name Field */}
          <div>
            <label htmlFor="name" className="block text-sm font-medium text-textMain mb-2">
              <User className="w-4 h-4 inline mr-1" />
              Full Name <span className="text-error">*</span>
            </label>
            <input
              type="text"
              id="name"
              name="name"
              value={formData.name}
              onChange={handleChange}
              disabled={isAlreadyRegistered}
              placeholder="Enter your full name"
              className={`w-full px-4 py-2 border border-muted rounded-base focus:ring-2 focus:ring-primary focus:border-primary transition-colors ${
                errors.name ? 'border-error' : 'border-muted'
              } ${isAlreadyRegistered ? 'bg-muted cursor-not-allowed' : 'bg-surface'}`}
            />
            {errors.name && <p className="mt-1 text-sm text-error">{errors.name}</p>}
          </div>

          {/* Phone Field */}
          <div>
            <label htmlFor="phone" className="block text-sm font-medium text-textMain mb-2">
              <Phone className="w-4 h-4 inline mr-1" />
              Phone Number <span className="text-error">*</span>
            </label>
            <input
              type="tel"
              id="phone"
              name="phone"
              value={formData.phone}
              onChange={handleChange}
              disabled={isAlreadyRegistered}
              placeholder="e.g., +92 300 123-4567"
              className={`w-full px-4 py-2 border border-muted rounded-base focus:ring-2 focus:ring-primary focus:border-primary transition-colors ${
                errors.phone ? 'border-error' : 'border-muted'
              } ${isAlreadyRegistered ? 'bg-muted cursor-not-allowed' : 'bg-surface'}`}
            />
            {errors.phone && <p className="mt-1 text-sm text-error">{errors.phone}</p>}
          </div>

          {/* Experience Field */}
          <div>
            <label htmlFor="experience" className="block text-sm font-medium text-textMain mb-2">
              <Calendar className="w-4 h-4 inline mr-1" />
              Years of Experience <span className="text-error">*</span>
            </label>
            <input
              type="number"
              id="experience"
              name="experience"
              value={formData.experience}
              onChange={handleChange}
              disabled={isAlreadyRegistered}
              min="0"
              max="100"
              placeholder="Enter years of experience"
              className={`w-full px-4 py-2 border border-muted rounded-base focus:ring-2 focus:ring-primary focus:border-primary transition-colors ${
                errors.experience ? 'border-error' : 'border-muted'
              } ${isAlreadyRegistered ? 'bg-muted cursor-not-allowed' : 'bg-surface'}`}
            />
            {errors.experience && <p className="mt-1 text-sm text-error">{errors.experience}</p>}
          </div>

          {/* Specialization Field */}
          <div>
            <label htmlFor="specialization" className="block text-sm font-medium text-textMain mb-2">
              <Briefcase className="w-4 h-4 inline mr-1" />
              Specialization <span className="text-error">*</span>
            </label>
            <textarea
              id="specialization"
              name="specialization"
              value={formData.specialization}
              onChange={handleChange}
              disabled={isAlreadyRegistered}
              rows={3}
              placeholder="e.g., Kitchen Renovation, Bathroom Remodeling, Interior Design (separate with commas)"
              className={`w-full px-4 py-2 border border-muted rounded-base focus:ring-2 focus:ring-primary focus:border-primary transition-colors resize-none ${
                errors.specialization ? 'border-error' : 'border-muted'
              } ${isAlreadyRegistered ? 'bg-muted cursor-not-allowed' : 'bg-surface'}`}
            />
            <p className="mt-1 text-xs text-textSecondary">
              List your areas of specialization, separated by commas
            </p>
            {errors.specialization && (
              <p className="mt-1 text-sm text-error">{errors.specialization}</p>
            )}
          </div>

          {/* Portfolio Links Field */}
          <div>
            <label htmlFor="portfolioLinks" className="block text-sm font-medium text-textMain mb-2">
              <LinkIcon className="w-4 h-4 inline mr-1" />
              Portfolio Links (Optional)
            </label>
            <textarea
              id="portfolioLinks"
              name="portfolioLinks"
              value={formData.portfolioLinks}
              onChange={handleChange}
              disabled={isAlreadyRegistered}
              rows={3}
              placeholder="Enter portfolio links, one per line (e.g., https://example.com/portfolio)"
              className={`w-full px-4 py-2 border border-muted rounded-base focus:ring-2 focus:ring-primary focus:border-primary transition-colors resize-none ${
                errors.portfolioLinks ? 'border-error' : 'border-muted'
              } ${isAlreadyRegistered ? 'bg-muted cursor-not-allowed' : 'bg-surface'}`}
            />
            <p className="mt-1 text-xs text-textSecondary">
              Add links to your portfolio or previous work (one per line)
            </p>
          </div>

          {/* City Field */}
          <div>
            <label htmlFor="city" className="block text-sm font-medium text-textMain mb-2">
              <MapPin className="w-4 h-4 inline mr-1" />
              City <span className="text-error">*</span>
            </label>
            <input
              type="text"
              id="city"
              name="city"
              value={formData.city}
              onChange={handleChange}
              disabled={isAlreadyRegistered}
              placeholder="e.g., Lahore, Karachi, Islamabad"
              className={`w-full px-4 py-2 border border-muted rounded-base focus:ring-2 focus:ring-primary focus:border-primary transition-colors ${
                errors.city ? 'border-error' : 'border-muted'
              } ${isAlreadyRegistered ? 'bg-muted cursor-not-allowed' : 'bg-surface'}`}
            />
            {errors.city && <p className="mt-1 text-sm text-error">{errors.city}</p>}
          </div>

          {/* CNIC Upload Field */}
          <div>
            <label className="block text-sm font-medium text-textMain mb-2">
              <FileText className="w-4 h-4 inline mr-1" />
              CNIC Document <span className="text-error">*</span>
            </label>
            <div className="border-2 border-dashed border-muted rounded-base p-4 hover:border-primary transition-colors">
              <input
                type="file"
                id="cnic"
                accept="image/*,application/pdf"
                onChange={handleCnicChange}
                disabled={isAlreadyRegistered || loading}
                className="hidden"
              />
              <label
                htmlFor="cnic"
                className={`flex flex-col items-center justify-center cursor-pointer ${
                  isAlreadyRegistered || loading ? 'cursor-not-allowed opacity-50' : ''
                }`}
              >
                <Upload className="w-8 h-8 text-textSecondary mb-2" />
                <span className="text-sm text-textSecondary">
                  {cnicFile ? cnicFile.name : 'Click to upload CNIC (Image or PDF)'}
                </span>
                <span className="text-xs text-textSecondary mt-1">Max 5MB</span>
              </label>
            </div>
            {cnicPreview && (
              <div className="mt-2">
                <img
                  src={cnicPreview}
                  alt="CNIC Preview"
                  className="max-w-xs max-h-32 rounded border border-muted"
                />
              </div>
            )}
            {errors.cnic && <p className="mt-1 text-sm text-error">{errors.cnic}</p>}
          </div>

          {/* Profile Image Upload Field */}
          <div>
            <label className="block text-sm font-medium text-textMain mb-2">
              <ImageIcon className="w-4 h-4 inline mr-1" />
              Profile Image (Optional)
            </label>
            <div className="border-2 border-dashed border-muted rounded-base p-4 hover:border-primary transition-colors">
              <input
                type="file"
                id="profileImage"
                accept="image/*"
                onChange={handleProfileImageChange}
                disabled={isAlreadyRegistered || loading}
                className="hidden"
              />
              <label
                htmlFor="profileImage"
                className={`flex flex-col items-center justify-center cursor-pointer ${
                  isAlreadyRegistered || loading ? 'cursor-not-allowed opacity-50' : ''
                }`}
              >
                <Upload className="w-8 h-8 text-textSecondary mb-2" />
                <span className="text-sm text-textSecondary">
                  {profileImageFile ? profileImageFile.name : 'Click to upload profile image'}
                </span>
                <span className="text-xs text-textSecondary mt-1">Max 5MB</span>
              </label>
            </div>
            {profileImagePreview && (
              <div className="mt-2">
                <img
                  src={profileImagePreview}
                  alt="Profile Preview"
                  className="w-32 h-32 rounded-full object-cover border-2 border-muted"
                />
              </div>
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
              loading={loading || uploading}
              disabled={loading || uploading || isAlreadyRegistered}
              className="flex-1"
            >
              {uploading ? (
                <>
                  <Upload className="w-4 h-4 mr-2 animate-spin" />
                  Uploading Files...
                </>
              ) : isAlreadyRegistered ? (
                <>
                  <CheckCircle className="w-4 h-4 mr-2" />
                  Already Registered
                </>
              ) : (
                <>
                  <Wrench className="w-4 h-4 mr-2" />
                  Submit Registration
                </>
              )}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default RegisterRenovator;
