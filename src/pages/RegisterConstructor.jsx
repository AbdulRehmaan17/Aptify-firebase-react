import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { collection, query, where, getDocs, addDoc, serverTimestamp } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { db, auth, storage } from '../firebase';
import { useAuth } from '../context/AuthContext';
import {
  Building2,
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
  const currentUser = auth?.currentUser || contextUser;

  // Form state
  const [formData, setFormData] = useState({
    name: '',
    companyName: '',
    cnic: '',
    phone: '',
    email: '',
    experience: '',
    skills: [],
    city: '',
    address: '',
    portfolioLinks: '',
  });

  // File uploads
  const [cnicFile, setCnicFile] = useState(null);
  const [cnicPreview, setCnicPreview] = useState(null);
  const [profileImageFile, setProfileImageFile] = useState(null);
  const [profileImagePreview, setProfileImagePreview] = useState(null);
  const [licenseFiles, setLicenseFiles] = useState([]);
  const [licensePreviews, setLicensePreviews] = useState([]);

  // UI state
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [checkingRegistration, setCheckingRegistration] = useState(true);
  const [isAlreadyRegistered, setIsAlreadyRegistered] = useState(false);
  const [errors, setErrors] = useState({});

  // Skill categories for construction
  const skillCategories = [
    'New Construction',
    'Extension',
    'Remodeling',
    'Finishing',
    'Grey Structure',
    'Commercial',
    'Residential',
    'Interior Design',
    'Architectural Design',
  ];

  // Initialize email from auth
  useEffect(() => {
    if (currentUser?.email && !formData.email) {
      setFormData((prev) => ({ ...prev, email: currentUser.email }));
    }
  }, [currentUser]);

  /**
   * Check if user is already registered as a constructor
   * Queries "constructionProviders" collection where userId == currentUser.uid
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

        // Query constructionProviders collection filtered by userId
        const providersQuery = query(
          collection(db, 'constructionProviders'),
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
            name: existingProvider.name || currentUser.displayName || '',
            companyName: existingProvider.companyName || '',
            cnic: existingProvider.cnic || '',
            phone: existingProvider.phone || '',
            email: existingProvider.email || currentUser.email || '',
            experience: existingProvider.experience?.toString() || '',
            skills: existingProvider.skills || [],
            city: existingProvider.city || '',
            address: existingProvider.address || '',
            portfolioLinks: Array.isArray(existingProvider.portfolioLinks)
              ? existingProvider.portfolioLinks.join('\n')
              : existingProvider.portfolioLinks || '',
          });
        } else {
          // User is not registered, pre-fill name and email from currentUser
          setFormData((prev) => ({
            ...prev,
            name: currentUser.displayName || currentUser.email?.split('@')[0] || '',
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
   * Handle skills checkbox changes
   */
  const handleSkillChange = (skill) => {
    setFormData((prev) => {
      const currentSkills = prev.skills || [];
      const newSkills = currentSkills.includes(skill)
        ? currentSkills.filter((s) => s !== skill)
        : [...currentSkills, skill];
      return { ...prev, skills: newSkills };
    });

    if (errors.skills) {
      setErrors((prev) => {
        const newErrors = { ...prev };
        delete newErrors.skills;
        return newErrors;
      });
    }
  };

  /**
   * Handle license files upload
   */
  const handleLicenseFilesChange = (e) => {
    const files = Array.from(e.target.files);
    if (files.length > 0) {
      const validFiles = files.filter((file) => {
        if (file.size > 5 * 1024 * 1024) {
          toast.error(`${file.name} is too large. Max 5MB per file.`);
          return false;
        }
        return true;
      });
      setLicenseFiles((prev) => [...prev, ...validFiles]);
      validFiles.forEach((file) => {
        if (file.type.startsWith('image/')) {
          setLicensePreviews((prev) => [...prev, URL.createObjectURL(file)]);
        }
      });
    }
  };

  /**
   * Remove license file
   */
  const removeLicenseFile = (index) => {
    setLicenseFiles((prev) => prev.filter((_, i) => i !== index));
    setLicensePreviews((prev) => {
      const newPreviews = [...prev];
      URL.revokeObjectURL(newPreviews[index]);
      return newPreviews.filter((_, i) => i !== index);
    });
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
        const timestamp = Date.now();
        const fileName = `${timestamp}_cnic_${cnicFile.name.replace(/[^a-zA-Z0-9.-]/g, '_')}`;
        const storagePath = `providers/constructors/${currentUser.uid}/${fileName}`;
        const storageRef = ref(storage, storagePath);
        await uploadBytes(storageRef, cnicFile);
        uploads.cnicUrl = await getDownloadURL(storageRef);
      } catch (error) {
        console.error('Error uploading CNIC:', error);
        throw new Error('Failed to upload CNIC document');
      }
    }

    if (profileImageFile) {
      try {
        const timestamp = Date.now();
        const fileName = `${timestamp}_profile_${profileImageFile.name.replace(/[^a-zA-Z0-9.-]/g, '_')}`;
        const storagePath = `providers/constructors/${currentUser.uid}/${fileName}`;
        const storageRef = ref(storage, storagePath);
        await uploadBytes(storageRef, profileImageFile);
        uploads.profileImageUrl = await getDownloadURL(storageRef);
      } catch (error) {
        console.error('Error uploading profile image:', error);
        throw new Error('Failed to upload profile image');
      }
    }

    // Upload license files
    if (licenseFiles.length > 0) {
      const licenseUrls = [];
      for (const licenseFile of licenseFiles) {
        try {
          const timestamp = Date.now();
          const fileName = `${timestamp}_license_${licenseFile.name.replace(/[^a-zA-Z0-9.-]/g, '_')}`;
          const storagePath = `providers/constructors/${currentUser.uid}/${fileName}`;
          const storageRef = ref(storage, storagePath);
          await uploadBytes(storageRef, licenseFile);
          const url = await getDownloadURL(storageRef);
          licenseUrls.push(url);
        } catch (error) {
          console.error('Error uploading license file:', error);
          throw new Error(`Failed to upload license file: ${licenseFile.name}`);
        }
      }
      uploads.licenseFiles = licenseUrls;
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

    // Validate company name
    if (!formData.companyName.trim()) {
      newErrors.companyName = 'Business/Company name is required';
    }

    // Validate CNIC
    if (!formData.cnic.trim()) {
      newErrors.cnic = 'CNIC/National ID is required';
    }

    // Validate email
    if (!formData.email.trim()) {
      newErrors.email = 'Email is required';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email.trim())) {
      newErrors.email = 'Please enter a valid email address';
    }

    // Validate skills (at least one must be selected)
    if (!formData.skills || formData.skills.length === 0) {
      newErrors.skills = 'Please select at least one skill category';
    }

    // Validate address
    if (!formData.address.trim()) {
      newErrors.address = 'Address is required';
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
      setUploading(true);

      // Check again if user is already registered (race condition protection)
      const providersQuery = query(
        collection(db, 'constructionProviders'),
        where('userId', '==', currentUser.uid)
      );
      const snapshot = await getDocs(providersQuery);

      if (!snapshot.empty) {
        setIsAlreadyRegistered(true);
        toast.error('You are already registered as a constructor.');
        setLoading(false);
        setUploading(false);
        return;
      }

      // Upload files first
      const uploads = await uploadFiles();
      setUploading(false);

      // Convert portfolio links string to array (split by newline)
      const portfolioLinksArray = formData.portfolioLinks
        .split('\n')
        .map((link) => link.trim())
        .filter((link) => link.length > 0 && (link.startsWith('http://') || link.startsWith('https://')));

      const providerData = {
        userId: currentUser.uid,
        name: formData.name.trim(),
        companyName: formData.companyName.trim(),
        cnic: formData.cnic.trim(),
        phone: formData.phone.trim(),
        email: formData.email.trim(),
        experience: Number(formData.experience),
        skills: formData.skills,
        city: formData.city.trim(),
        address: formData.address.trim(),
        portfolioLinks: portfolioLinksArray,
        createdAt: serverTimestamp(),
      };

      // Add file URLs if uploaded
      if (uploads.cnicUrl) {
        providerData.cnicUrl = uploads.cnicUrl;
      }
      if (uploads.profileImageUrl) {
        providerData.profileImageUrl = uploads.profileImageUrl;
      }
      if (uploads.licenseFiles && uploads.licenseFiles.length > 0) {
        providerData.licenseFiles = uploads.licenseFiles;
      }

      // Add document to Firestore - use constructionProviders collection
      const docRef = await addDoc(collection(db, 'constructionProviders'), providerData);
      console.log('Constructor registered with ID:', docRef.id);
      console.log('Provider data:', providerData);

      toast.success('Registration submitted successfully! Your application is pending admin approval.');

      // Navigate to my account
      navigate('/my-account');
    } catch (error) {
      console.error('Error registering as constructor:', error);
      setUploading(false);

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
          <p className="text-textSecondary mb-4">Please log in to register as a constructor.</p>
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
          Register as Constructor
        </h1>
        <p className="text-lg text-textSecondary">
          Register yourself as a construction service provider to start receiving project requests.
        </p>
      </div>

      {/* Already Registered Message */}
      {isAlreadyRegistered && (
        <div className="bg-muted/30 border-l-4 border-primary text-textMain p-4 mb-6 rounded-lg flex items-start">
          <CheckCircle className="w-5 h-5 mr-3 flex-shrink-0 mt-0.5" />
          <div>
            <p className="font-semibold mb-1">You are already registered as a constructor.</p>
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

          {/* Company Name Field */}
          <div>
            <label htmlFor="companyName" className="block text-sm font-medium text-textMain mb-2">
              <Briefcase className="w-4 h-4 inline mr-1" />
              Business / Company Name <span className="text-error">*</span>
            </label>
            <input
              type="text"
              id="companyName"
              name="companyName"
              value={formData.companyName}
              onChange={handleChange}
              disabled={isAlreadyRegistered}
              placeholder="Enter your business or company name"
              className={`w-full px-4 py-2 border border-muted rounded-base focus:ring-2 focus:ring-primary focus:border-primary transition-colors ${
                errors.companyName ? 'border-error' : 'border-muted'
              } ${isAlreadyRegistered ? 'bg-muted cursor-not-allowed' : 'bg-surface'}`}
            />
            {errors.companyName && <p className="mt-1 text-sm text-error">{errors.companyName}</p>}
          </div>

          {/* CNIC Field */}
          <div>
            <label htmlFor="cnic" className="block text-sm font-medium text-textMain mb-2">
              <FileText className="w-4 h-4 inline mr-1" />
              CNIC / National ID <span className="text-error">*</span>
            </label>
            <input
              type="text"
              id="cnic"
              name="cnic"
              value={formData.cnic}
              onChange={handleChange}
              disabled={isAlreadyRegistered}
              placeholder="Enter your CNIC or National ID number"
              className={`w-full px-4 py-2 border border-muted rounded-base focus:ring-2 focus:ring-primary focus:border-primary transition-colors ${
                errors.cnic ? 'border-error' : 'border-muted'
              } ${isAlreadyRegistered ? 'bg-muted cursor-not-allowed' : 'bg-surface'}`}
            />
            {errors.cnic && <p className="mt-1 text-sm text-error">{errors.cnic}</p>}
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

          {/* Email Field */}
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-textMain mb-2">
              <Mail className="w-4 h-4 inline mr-1" />
              Email Address <span className="text-error">*</span>
            </label>
            <input
              type="email"
              id="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              disabled={isAlreadyRegistered}
              placeholder="your.email@example.com"
              className={`w-full px-4 py-2 border border-muted rounded-base focus:ring-2 focus:ring-primary focus:border-primary transition-colors ${
                errors.email ? 'border-error' : 'border-muted'
              } ${isAlreadyRegistered ? 'bg-muted cursor-not-allowed' : 'bg-surface'}`}
            />
            {errors.email && <p className="mt-1 text-sm text-error">{errors.email}</p>}
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

          {/* Skills Categories Field */}
          <div>
            <label className="block text-sm font-medium text-textMain mb-2">
              <Briefcase className="w-4 h-4 inline mr-1" />
              Skill Categories <span className="text-error">*</span>
            </label>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              {skillCategories.map((skill) => (
                <label
                  key={skill}
                  className={`flex items-center p-3 border rounded-base cursor-pointer transition-colors ${
                    formData.skills?.includes(skill)
                      ? 'border-primary bg-primary/10'
                      : 'border-muted hover:border-primary'
                  } ${isAlreadyRegistered ? 'opacity-50 cursor-not-allowed' : ''}`}
                >
                  <input
                    type="checkbox"
                    checked={formData.skills?.includes(skill) || false}
                    onChange={() => handleSkillChange(skill)}
                    disabled={isAlreadyRegistered}
                    className="mr-2"
                  />
                  <span className="text-sm">{skill}</span>
                </label>
              ))}
            </div>
            {errors.skills && <p className="mt-1 text-sm text-error">{errors.skills}</p>}
            <p className="mt-2 text-xs text-textSecondary">Select at least one skill category</p>
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

          {/* Address Field */}
          <div>
            <label htmlFor="address" className="block text-sm font-medium text-textMain mb-2">
              <MapPin className="w-4 h-4 inline mr-1" />
              Address <span className="text-error">*</span>
            </label>
            <textarea
              id="address"
              name="address"
              value={formData.address}
              onChange={handleChange}
              disabled={isAlreadyRegistered}
              rows={3}
              placeholder="Enter your complete address"
              className={`w-full px-4 py-2 border border-muted rounded-base focus:ring-2 focus:ring-primary focus:border-primary transition-colors resize-none ${
                errors.address ? 'border-error' : 'border-muted'
              } ${isAlreadyRegistered ? 'bg-muted cursor-not-allowed' : 'bg-surface'}`}
            />
            {errors.address && <p className="mt-1 text-sm text-error">{errors.address}</p>}
          </div>

          {/* CNIC Document Upload Field */}
          <div>
            <label className="block text-sm font-medium text-textMain mb-2">
              <FileText className="w-4 h-4 inline mr-1" />
              CNIC Document (Upload) <span className="text-error">*</span>
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

          {/* License / Certificates Upload Field */}
          <div>
            <label className="block text-sm font-medium text-textMain mb-2">
              <FileText className="w-4 h-4 inline mr-1" />
              License / Certificates (Optional)
            </label>
            <div className="border-2 border-dashed border-muted rounded-base p-4 hover:border-primary transition-colors">
              <input
                type="file"
                id="licenseFiles"
                accept="image/*,application/pdf"
                multiple
                onChange={handleLicenseFilesChange}
                disabled={isAlreadyRegistered || loading}
                className="hidden"
              />
              <label
                htmlFor="licenseFiles"
                className={`flex flex-col items-center justify-center cursor-pointer ${
                  isAlreadyRegistered || loading ? 'cursor-not-allowed opacity-50' : ''
                }`}
              >
                <Upload className="w-8 h-8 text-textSecondary mb-2" />
                <span className="text-sm text-textSecondary">
                  Click to upload license or certificate files
                </span>
                <span className="text-xs text-textSecondary mt-1">Max 5MB per file</span>
              </label>
            </div>
            {licenseFiles.length > 0 && (
              <div className="mt-4 space-y-2">
                {licenseFiles.map((file, index) => (
                  <div
                    key={index}
                    className="flex items-center justify-between p-2 bg-background rounded border border-muted"
                  >
                    <span className="text-sm text-textMain">{file.name}</span>
                    <button
                      type="button"
                      onClick={() => removeLicenseFile(index)}
                      disabled={isAlreadyRegistered || loading}
                      className="text-error hover:text-error text-sm"
                    >
                      Remove
                    </button>
                  </div>
                ))}
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
                  <Building2 className="w-4 h-4 mr-2" />
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

export default RegisterConstructor;
