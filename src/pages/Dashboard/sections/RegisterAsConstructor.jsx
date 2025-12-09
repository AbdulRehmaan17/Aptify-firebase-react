import React, { useState, useEffect } from 'react';
import {
  doc,
  getDoc,
  setDoc,
  deleteDoc,
  serverTimestamp,
} from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage';
import { db, storage } from '../../../firebase';
import { useAuth } from '../../../context/AuthContext';
import {
  User,
  Building2,
  Phone,
  Mail,
  MapPin,
  Briefcase,
  Calendar,
  Upload,
  X,
  Save,
  Trash2,
  FileText,
  Image as ImageIcon,
  Users,
} from 'lucide-react';
import Button from '../../../components/common/Button';
import LoadingSpinner from '../../../components/common/LoadingSpinner';
import toast from 'react-hot-toast';

/**
 * RegisterAsConstructor Component
 * Registration form for constructors in My Account Dashboard
 * Stores data in Firestore: constructors/{userId}/profile
 * Supports CRUD operations: Create, Read, Update, Delete
 */
const RegisterAsConstructor = () => {
  const { currentUser } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [hasRegistration, setHasRegistration] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  // Form state
  const [formData, setFormData] = useState({
    fullName: '',
    companyName: '',
    email: '',
    phoneNumber: '',
    cnic: '',
    constructionServices: [],
    yearsOfExperience: '',
    description: '',
    officeAddress: '',
    city: '',
    teamSize: '',
  });

  // Portfolio images
  const [portfolioImages, setPortfolioImages] = useState([]);
  const [newPortfolioFiles, setNewPortfolioFiles] = useState([]);
  const [newPortfolioPreviews, setNewPortfolioPreviews] = useState([]);

  // License/Certification files
  const [licenseFiles, setLicenseFiles] = useState([]);
  const [newLicenseFiles, setNewLicenseFiles] = useState([]);
  const [newLicensePreviews, setNewLicensePreviews] = useState([]);

  // Errors
  const [errors, setErrors] = useState({});

  // Construction services options
  const constructionServicesOptions = [
    'Commercial',
    'Residential',
    'Grey Structure',
    'Full Turnkey',
    'Extension',
    'Remodeling',
    'Interior Finishing',
    'Architectural Design',
    'Land Development',
  ];

  // Fetch existing registration
  useEffect(() => {
    if (!currentUser?.uid || !db) {
      setLoading(false);
      return;
    }

    const fetchRegistration = async () => {
      try {
        setLoading(true);
        const profileRef = doc(db, 'constructors', currentUser.uid, 'profile', 'data');
        const profileSnap = await getDoc(profileRef);

        if (profileSnap.exists()) {
          const data = profileSnap.data();
          setHasRegistration(true);
          setFormData({
            fullName: data.fullName || '',
            companyName: data.companyName || '',
            email: data.email || currentUser.email || '',
            phoneNumber: data.phoneNumber || '',
            cnic: data.cnic || '',
            constructionServices: data.constructionServices || [],
            yearsOfExperience: data.yearsOfExperience?.toString() || '',
            description: data.description || data.bio || '',
            officeAddress: data.officeAddress || '',
            city: data.city || '',
            teamSize: data.teamSize?.toString() || '',
          });
          setPortfolioImages(data.portfolioImages || []);
          setLicenseFiles(data.licenseFiles || []);
        } else {
          // Set email from auth
          setFormData((prev) => ({
            ...prev,
            email: currentUser.email || '',
            fullName: currentUser.displayName || '',
          }));
        }
      } catch (error) {
        console.error('Error fetching constructor registration:', error);
        toast.error('Failed to load registration data');
      } finally {
        setLoading(false);
      }
    };

    fetchRegistration();
  }, [currentUser]);

  // Handle input change
  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    setErrors((prev) => ({ ...prev, [name]: '' }));
  };

  // Handle service toggle
  const handleServiceToggle = (service) => {
    setFormData((prev) => {
      const services = prev.constructionServices || [];
      if (services.includes(service)) {
        return { ...prev, constructionServices: services.filter((s) => s !== service) };
      } else {
        return { ...prev, constructionServices: [...services, service] };
      }
    });
  };

  // Handle portfolio image upload
  const handlePortfolioImageChange = (e) => {
    const files = Array.from(e.target.files || []);
    const validFiles = files.filter((file) => {
      if (!file.type.startsWith('image/')) {
        toast.error(`${file.name} is not an image file`);
        return false;
      }
      if (file.size > 5 * 1024 * 1024) {
        toast.error(`${file.name} is too large. Max 5MB per file.`);
        return false;
      }
      return true;
    });

    setNewPortfolioFiles((prev) => [...prev, ...validFiles]);
    validFiles.forEach((file) => {
      setNewPortfolioPreviews((prev) => [...prev, URL.createObjectURL(file)]);
    });
  };

  // Handle license file upload
  const handleLicenseFileChange = (e) => {
    const files = Array.from(e.target.files || []);
    const validFiles = files.filter((file) => {
      if (!file.type.startsWith('image/') && file.type !== 'application/pdf') {
        toast.error(`${file.name} must be an image or PDF file`);
        return false;
      }
      if (file.size > 10 * 1024 * 1024) {
        toast.error(`${file.name} is too large. Max 10MB per file.`);
        return false;
      }
      return true;
    });

    setNewLicenseFiles((prev) => [...prev, ...validFiles]);
    validFiles.forEach((file) => {
      if (file.type.startsWith('image/')) {
        setNewLicensePreviews((prev) => [...prev, URL.createObjectURL(file)]);
      } else {
        setNewLicensePreviews((prev) => [...prev, null]); // PDF placeholder
      }
    });
  };

  // Remove new portfolio image
  const handleRemoveNewPortfolioImage = (index) => {
    setNewPortfolioFiles((prev) => prev.filter((_, i) => i !== index));
    setNewPortfolioPreviews((prev) => {
      URL.revokeObjectURL(prev[index]);
      return prev.filter((_, i) => i !== index);
    });
  };

  // Remove existing portfolio image
  const handleRemoveExistingPortfolioImage = (index) => {
    setPortfolioImages((prev) => prev.filter((_, i) => i !== index));
  };

  // Remove new license file
  const handleRemoveNewLicenseFile = (index) => {
    setNewLicenseFiles((prev) => prev.filter((_, i) => i !== index));
    setNewLicensePreviews((prev) => {
      if (prev[index]) URL.revokeObjectURL(prev[index]);
      return prev.filter((_, i) => i !== index);
    });
  };

  // Remove existing license file
  const handleRemoveExistingLicenseFile = (index) => {
    setLicenseFiles((prev) => prev.filter((_, i) => i !== index));
  };

  // Upload portfolio images
  const uploadPortfolioImages = async () => {
    if (newPortfolioFiles.length === 0) return [];

    setUploading(true);
    const uploadedUrls = [];

    try {
      for (const file of newPortfolioFiles) {
        const timestamp = Date.now();
        const fileName = `${timestamp}_portfolio_${file.name.replace(/[^a-zA-Z0-9.-]/g, '_')}`;
        const storagePath = `constructors/${currentUser.uid}/portfolio/${fileName}`;
        const storageRef = ref(storage, storagePath);
        await uploadBytes(storageRef, file);
        const url = await getDownloadURL(storageRef);
        uploadedUrls.push(url);
      }
    } catch (error) {
      console.error('Error uploading portfolio images:', error);
      throw new Error('Failed to upload portfolio images');
    } finally {
      setUploading(false);
    }

    return uploadedUrls;
  };

  // Upload license files
  const uploadLicenseFiles = async () => {
    if (newLicenseFiles.length === 0) return [];

    setUploading(true);
    const uploadedUrls = [];

    try {
      for (const file of newLicenseFiles) {
        const timestamp = Date.now();
        const fileName = `${timestamp}_license_${file.name.replace(/[^a-zA-Z0-9.-]/g, '_')}`;
        const storagePath = `constructors/${currentUser.uid}/licenses/${fileName}`;
        const storageRef = ref(storage, storagePath);
        await uploadBytes(storageRef, file);
        const url = await getDownloadURL(storageRef);
        uploadedUrls.push(url);
      }
    } catch (error) {
      console.error('Error uploading license files:', error);
      throw new Error('Failed to upload license files');
    } finally {
      setUploading(false);
    }

    return uploadedUrls;
  };

  // Validate form
  const validateForm = () => {
    const newErrors = {};

    if (!formData.fullName?.trim()) {
      newErrors.fullName = 'Full name is required';
    }

    if (!formData.companyName?.trim()) {
      newErrors.companyName = 'Company name is required';
    }

    if (!formData.phoneNumber?.trim()) {
      newErrors.phoneNumber = 'Phone number is required';
    } else if (!/^\+?[\d\s-]{10,15}$/.test(formData.phoneNumber.trim())) {
      newErrors.phoneNumber = 'Invalid phone number format';
    }

    if (!formData.cnic?.trim()) {
      newErrors.cnic = 'CNIC or National ID is required';
    }

    if (formData.constructionServices.length === 0) {
      newErrors.constructionServices = 'At least one construction service is required';
    }

    if (!formData.yearsOfExperience || Number(formData.yearsOfExperience) < 0) {
      newErrors.yearsOfExperience = 'Valid years of experience is required';
    }

    if (!formData.city?.trim()) {
      newErrors.city = 'City is required';
    }

    if (!formData.officeAddress?.trim()) {
      newErrors.officeAddress = 'Office address is required';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Handle save/register
  const handleSave = async () => {
    if (!currentUser?.uid || !db) {
      toast.error('User not authenticated');
      return;
    }

    if (!validateForm()) {
      toast.error('Please fix the errors in the form');
      return;
    }

    try {
      setSaving(true);

      // Upload new files
      const [newImageUrls, newLicenseUrls] = await Promise.all([
        uploadPortfolioImages(),
        uploadLicenseFiles(),
      ]);

      const allPortfolioImages = [...portfolioImages, ...newImageUrls];
      const allLicenseFiles = [...licenseFiles, ...newLicenseUrls];

      // Prepare data
      const registrationData = {
        fullName: formData.fullName.trim(),
        companyName: formData.companyName.trim(),
        email: formData.email || currentUser.email,
        phoneNumber: formData.phoneNumber.trim(),
        cnic: formData.cnic.trim(),
        constructionServices: formData.constructionServices,
        yearsOfExperience: Number(formData.yearsOfExperience),
        description: formData.description?.trim() || '',
        officeAddress: formData.officeAddress.trim(),
        city: formData.city.trim(),
        teamSize: formData.teamSize ? Number(formData.teamSize) : null,
        portfolioImages: allPortfolioImages,
        licenseFiles: allLicenseFiles,
        userId: currentUser.uid,
        updatedAt: serverTimestamp(),
      };

      if (!hasRegistration) {
        registrationData.createdAt = serverTimestamp();
      }

      // Save to Firestore: constructors/{userId}/profile/data
      const profileRef = doc(db, 'constructors', currentUser.uid, 'profile', 'data');
      await setDoc(profileRef, registrationData, { merge: true });

      // Update state
      setHasRegistration(true);
      setPortfolioImages(allPortfolioImages);
      setLicenseFiles(allLicenseFiles);
      setNewPortfolioFiles([]);
      setNewPortfolioPreviews([]);
      setNewLicenseFiles([]);
      setNewLicensePreviews([]);

      toast.success(hasRegistration ? 'Registration updated successfully!' : 'Registered as constructor successfully!');
    } catch (error) {
      console.error('Error saving constructor registration:', error);
      toast.error(error.message || 'Failed to save registration');
    } finally {
      setSaving(false);
    }
  };

  // Handle delete
  const handleDelete = async () => {
    if (!currentUser?.uid || !db) {
      return;
    }

    try {
      setSaving(true);

      // Delete portfolio images from Storage
      for (const imageUrl of portfolioImages) {
        try {
          const urlParts = imageUrl.split('/');
          const fileName = urlParts[urlParts.length - 1].split('?')[0];
          const storagePath = `constructors/${currentUser.uid}/portfolio/${fileName}`;
          const storageRef = ref(storage, storagePath);
          await deleteObject(storageRef);
        } catch (error) {
          console.error('Error deleting portfolio image:', error);
        }
      }

      // Delete license files from Storage
      for (const licenseUrl of licenseFiles) {
        try {
          const urlParts = licenseUrl.split('/');
          const fileName = urlParts[urlParts.length - 1].split('?')[0];
          const storagePath = `constructors/${currentUser.uid}/licenses/${fileName}`;
          const storageRef = ref(storage, storagePath);
          await deleteObject(storageRef);
        } catch (error) {
          console.error('Error deleting license file:', error);
        }
      }

      // Delete Firestore document
      const profileRef = doc(db, 'constructors', currentUser.uid, 'profile', 'data');
      await deleteDoc(profileRef);

      // Reset state
      setHasRegistration(false);
      setFormData({
        fullName: currentUser.displayName || '',
        companyName: '',
        email: currentUser.email || '',
        phoneNumber: '',
        cnic: '',
        constructionServices: [],
        yearsOfExperience: '',
        description: '',
        officeAddress: '',
        city: '',
        teamSize: '',
      });
      setPortfolioImages([]);
      setLicenseFiles([]);
      setShowDeleteConfirm(false);

      toast.success('Registration deleted successfully');
    } catch (error) {
      console.error('Error deleting registration:', error);
      toast.error('Failed to delete registration');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <LoadingSpinner />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-textMain">Register as Constructor</h2>
          <p className="text-textSecondary mt-1">
            {hasRegistration ? 'Update your constructor profile' : 'Complete your constructor registration'}
          </p>
        </div>
        {hasRegistration && (
          <Button
            variant="danger"
            onClick={() => setShowDeleteConfirm(true)}
            disabled={saving}
          >
            <Trash2 className="w-4 h-4 mr-2" />
            Delete Registration
          </Button>
        )}
      </div>

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-surface rounded-lg p-6 max-w-md w-full mx-4">
            <h3 className="text-lg font-semibold text-textMain mb-4">Delete Registration</h3>
            <p className="text-textSecondary mb-6">
              Are you sure you want to delete your constructor registration? This action cannot be undone.
            </p>
            <div className="flex gap-2">
              <Button variant="danger" onClick={handleDelete} disabled={saving}>
                {saving ? 'Deleting...' : 'Delete'}
              </Button>
              <Button variant="outline" onClick={() => setShowDeleteConfirm(false)} disabled={saving}>
                Cancel
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Form */}
      <form onSubmit={(e) => { e.preventDefault(); handleSave(); }} className="space-y-6">
        {/* Personal Information Section */}
        <div className="bg-surface rounded-lg border border-borderColor p-6">
          <h3 className="text-lg font-semibold text-textMain mb-4 flex items-center gap-2">
            <User className="w-5 h-5" />
            Personal Information
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-textMain mb-2">
                Full Name *
              </label>
              <input
                type="text"
                name="fullName"
                value={formData.fullName}
                onChange={handleInputChange}
                className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-primary focus:border-primary bg-background text-textMain ${
                  errors.fullName ? 'border-error' : 'border-borderColor'
                }`}
                placeholder="Enter your full name"
              />
              {errors.fullName && (
                <p className="mt-1 text-sm text-error">{errors.fullName}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-textMain mb-2">
                Company Name *
              </label>
              <input
                type="text"
                name="companyName"
                value={formData.companyName}
                onChange={handleInputChange}
                className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-primary focus:border-primary bg-background text-textMain ${
                  errors.companyName ? 'border-error' : 'border-borderColor'
                }`}
                placeholder="Enter company name"
              />
              {errors.companyName && (
                <p className="mt-1 text-sm text-error">{errors.companyName}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-textMain mb-2">
                <Mail className="w-4 h-4 inline mr-1" />
                Email *
              </label>
              <input
                type="email"
                name="email"
                value={formData.email}
                onChange={handleInputChange}
                disabled
                className="w-full px-4 py-2 border border-borderColor rounded-lg bg-muted text-textSecondary cursor-not-allowed"
              />
              <p className="mt-1 text-xs text-textSecondary">Email from your account</p>
            </div>

            <div>
              <label className="block text-sm font-medium text-textMain mb-2">
                <Phone className="w-4 h-4 inline mr-1" />
                Phone Number *
              </label>
              <input
                type="tel"
                name="phoneNumber"
                value={formData.phoneNumber}
                onChange={handleInputChange}
                className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-primary focus:border-primary bg-background text-textMain ${
                  errors.phoneNumber ? 'border-error' : 'border-borderColor'
                }`}
                placeholder="+92 300 123-4567"
              />
              {errors.phoneNumber && (
                <p className="mt-1 text-sm text-error">{errors.phoneNumber}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-textMain mb-2">
                <FileText className="w-4 h-4 inline mr-1" />
                CNIC or National ID *
              </label>
              <input
                type="text"
                name="cnic"
                value={formData.cnic}
                onChange={handleInputChange}
                className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-primary focus:border-primary bg-background text-textMain ${
                  errors.cnic ? 'border-error' : 'border-borderColor'
                }`}
                placeholder="12345-1234567-1"
              />
              {errors.cnic && (
                <p className="mt-1 text-sm text-error">{errors.cnic}</p>
              )}
            </div>
          </div>
        </div>

        {/* Service Information Section */}
        <div className="bg-surface rounded-lg border border-borderColor p-6">
          <h3 className="text-lg font-semibold text-textMain mb-4 flex items-center gap-2">
            <Briefcase className="w-5 h-5" />
            Service Information
          </h3>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-textMain mb-2">
                Construction Services * (Select all that apply)
              </label>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                {constructionServicesOptions.map((service) => (
                  <label
                    key={service}
                    className="flex items-center space-x-2 p-3 border border-borderColor rounded-lg cursor-pointer hover:bg-muted transition-colors"
                  >
                    <input
                      type="checkbox"
                      checked={formData.constructionServices.includes(service)}
                      onChange={() => handleServiceToggle(service)}
                      className="w-4 h-4 text-primary rounded focus:ring-primary"
                    />
                    <span className="text-sm text-textMain">{service}</span>
                  </label>
                ))}
              </div>
              {errors.constructionServices && (
                <p className="mt-1 text-sm text-error">{errors.constructionServices}</p>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-textMain mb-2">
                  Years of Experience *
                </label>
                <input
                  type="number"
                  name="yearsOfExperience"
                  value={formData.yearsOfExperience}
                  onChange={handleInputChange}
                  min="0"
                  className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-primary focus:border-primary bg-background text-textMain ${
                    errors.yearsOfExperience ? 'border-error' : 'border-borderColor'
                  }`}
                  placeholder="10"
                />
                {errors.yearsOfExperience && (
                  <p className="mt-1 text-sm text-error">{errors.yearsOfExperience}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-textMain mb-2">
                  <Users className="w-4 h-4 inline mr-1" />
                  Team Size
                </label>
                <input
                  type="number"
                  name="teamSize"
                  value={formData.teamSize}
                  onChange={handleInputChange}
                  min="0"
                  className="w-full px-4 py-2 border border-borderColor rounded-lg focus:ring-2 focus:ring-primary focus:border-primary bg-background text-textMain"
                  placeholder="50"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-textMain mb-2">
                Description / Bio
              </label>
              <textarea
                name="description"
                value={formData.description}
                onChange={handleInputChange}
                rows={4}
                className="w-full px-4 py-2 border border-borderColor rounded-lg focus:ring-2 focus:ring-primary focus:border-primary bg-background text-textMain"
                placeholder="Describe your construction services and expertise..."
              />
            </div>
          </div>
        </div>

        {/* Location Section */}
        <div className="bg-surface rounded-lg border border-borderColor p-6">
          <h3 className="text-lg font-semibold text-textMain mb-4 flex items-center gap-2">
            <MapPin className="w-5 h-5" />
            Location
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-textMain mb-2">
                Office Address *
              </label>
              <textarea
                name="officeAddress"
                value={formData.officeAddress}
                onChange={handleInputChange}
                rows={2}
                className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-primary focus:border-primary bg-background text-textMain ${
                  errors.officeAddress ? 'border-error' : 'border-borderColor'
                }`}
                placeholder="Enter your office address"
              />
              {errors.officeAddress && (
                <p className="mt-1 text-sm text-error">{errors.officeAddress}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-textMain mb-2">
                City *
              </label>
              <input
                type="text"
                name="city"
                value={formData.city}
                onChange={handleInputChange}
                className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-primary focus:border-primary bg-background text-textMain ${
                  errors.city ? 'border-error' : 'border-borderColor'
                }`}
                placeholder="Lahore"
              />
              {errors.city && (
                <p className="mt-1 text-sm text-error">{errors.city}</p>
              )}
            </div>
          </div>
        </div>

        {/* License/Certification Section */}
        <div className="bg-surface rounded-lg border border-borderColor p-6">
          <h3 className="text-lg font-semibold text-textMain mb-4 flex items-center gap-2">
            <FileText className="w-5 h-5" />
            License / Certification
          </h3>
          <div className="space-y-4">
            <div>
              <input
                type="file"
                accept="image/*,application/pdf"
                multiple
                onChange={handleLicenseFileChange}
                className="hidden"
                id="license-upload"
                disabled={uploading}
              />
              <label
                htmlFor="license-upload"
                className="inline-flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-lg cursor-pointer hover:bg-primary/90 disabled:opacity-50"
              >
                <Upload className="w-4 h-4" />
                {uploading ? 'Uploading...' : 'Upload License/Certification (PDF or Image)'}
              </label>
              <p className="text-xs text-textSecondary mt-1">
                Max 10MB per file. PDF or image files allowed.
              </p>
            </div>

            {/* New License File Previews */}
            {newLicensePreviews.length > 0 && (
              <div>
                <h4 className="text-sm font-medium text-textMain mb-2">New Files (to be uploaded)</h4>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                  {newLicensePreviews.map((preview, index) => (
                    <div key={index} className="relative aspect-square rounded-lg overflow-hidden border border-borderColor bg-muted flex items-center justify-center">
                      {preview ? (
                        <img
                          src={preview}
                          alt={`New license ${index + 1}`}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <FileText className="w-12 h-12 text-textSecondary" />
                      )}
                      <button
                        type="button"
                        onClick={() => handleRemoveNewLicenseFile(index)}
                        className="absolute top-2 right-2 bg-error text-white rounded-full p-1 hover:bg-error/80"
                      >
                        <X className="w-4 h-4" />
                      </button>
                      <p className="absolute bottom-2 left-2 right-2 text-xs text-textSecondary truncate">
                        {newLicenseFiles[index]?.name}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Existing License Files */}
            {licenseFiles.length > 0 && (
              <div>
                <h4 className="text-sm font-medium text-textMain mb-2">Current License Files</h4>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                  {licenseFiles.map((fileUrl, index) => (
                    <div key={index} className="relative aspect-square rounded-lg overflow-hidden border border-borderColor bg-muted flex items-center justify-center">
                      {fileUrl.includes('.pdf') ? (
                        <FileText className="w-12 h-12 text-textSecondary" />
                      ) : (
                        <img
                          src={fileUrl}
                          alt={`License ${index + 1}`}
                          className="w-full h-full object-cover"
                          onError={(e) => {
                            e.target.src = '';
                            e.target.style.display = 'none';
                            e.target.nextSibling.style.display = 'flex';
                          }}
                        />
                      )}
                      <div className="hidden absolute inset-0 items-center justify-center">
                        <FileText className="w-12 h-12 text-textSecondary" />
                      </div>
                      <button
                        type="button"
                        onClick={() => handleRemoveExistingLicenseFile(index)}
                        className="absolute top-2 right-2 bg-error text-white rounded-full p-1 hover:bg-error/80"
                      >
                        <X className="w-4 h-4" />
                      </button>
                      <a
                        href={fileUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="absolute bottom-2 left-2 right-2 text-xs text-primary hover:underline truncate"
                      >
                        View File
                      </a>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Portfolio Images Section */}
        <div className="bg-surface rounded-lg border border-borderColor p-6">
          <h3 className="text-lg font-semibold text-textMain mb-4 flex items-center gap-2">
            <ImageIcon className="w-5 h-5" />
            Portfolio Images
          </h3>
          <div className="space-y-4">
            <div>
              <input
                type="file"
                accept="image/*"
                multiple
                onChange={handlePortfolioImageChange}
                className="hidden"
                id="portfolio-upload"
                disabled={uploading}
              />
              <label
                htmlFor="portfolio-upload"
                className="inline-flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-lg cursor-pointer hover:bg-primary/90 disabled:opacity-50"
              >
                <Upload className="w-4 h-4" />
                {uploading ? 'Uploading...' : 'Upload Portfolio Images'}
              </label>
              <p className="text-xs text-textSecondary mt-1">
                Max 5MB per image. Multiple images allowed.
              </p>
            </div>

            {/* New Image Previews */}
            {newPortfolioPreviews.length > 0 && (
              <div>
                <h4 className="text-sm font-medium text-textMain mb-2">New Images (to be uploaded)</h4>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                  {newPortfolioPreviews.map((preview, index) => (
                    <div key={index} className="relative aspect-square rounded-lg overflow-hidden border border-borderColor">
                      <img
                        src={preview}
                        alt={`New portfolio ${index + 1}`}
                        className="w-full h-full object-cover"
                      />
                      <button
                        type="button"
                        onClick={() => handleRemoveNewPortfolioImage(index)}
                        className="absolute top-2 right-2 bg-error text-white rounded-full p-1 hover:bg-error/80"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Existing Images */}
            {portfolioImages.length > 0 && (
              <div>
                <h4 className="text-sm font-medium text-textMain mb-2">Current Portfolio Images</h4>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                  {portfolioImages.map((imageUrl, index) => (
                    <div key={index} className="relative aspect-square rounded-lg overflow-hidden border border-borderColor">
                      <img
                        src={imageUrl}
                        alt={`Portfolio ${index + 1}`}
                        className="w-full h-full object-cover"
                        onError={(e) => {
                          e.target.src = 'https://via.placeholder.com/300?text=Image+Not+Found';
                        }}
                      />
                      <button
                        type="button"
                        onClick={() => handleRemoveExistingPortfolioImage(index)}
                        className="absolute top-2 right-2 bg-error text-white rounded-full p-1 hover:bg-error/80"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Submit Button */}
        <div className="flex justify-end gap-4">
          <Button
            type="submit"
            disabled={saving || uploading}
          >
            <Save className="w-4 h-4 mr-2" />
            {saving ? 'Saving...' : hasRegistration ? 'Update Registration' : 'Register as Constructor'}
          </Button>
        </div>
      </form>
    </div>
  );
};

export default RegisterAsConstructor;

