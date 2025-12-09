import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  collection,
  query,
  where,
  getDocs,
  doc,
  getDoc,
  updateDoc,
  onSnapshot,
  serverTimestamp,
} from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage';
import { db, storage } from '../../firebase';
import { useAuth } from '../../context/AuthContext';
import {
  User,
  Building2,
  Briefcase,
  MapPin,
  Phone,
  Mail,
  Star,
  Calendar,
  Upload,
  X,
  Edit2,
  Save,
  XCircle,
  Image as ImageIcon,
} from 'lucide-react';
import Button from '../../components/common/Button';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import toast from 'react-hot-toast';
import { getOrCreateChat } from '../../utils/chatHelpers';
import reviewsService from '../../services/reviewsService';

/**
 * ConstructorProfile Component
 * Profile management page for construction service providers
 * Allows editing profile information, portfolio, and credentials
 * 
 * Fetches serviceProviders/{providerId} where userId == currentUser.uid
 * Shows provider info, ratings & reviews, portfolio images
 * Allows editing and saving updates
 */
const ConstructorProfile = () => {
  const navigate = useNavigate();
  const { currentUser, loading: authLoading, userProfile } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploadingImages, setUploadingImages] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [providerData, setProviderData] = useState(null);
  const [providerId, setProviderId] = useState(null);
  const [userName, setUserName] = useState('');
  const [reviews, setReviews] = useState([]);
  const [averageRating, setAverageRating] = useState(0);
  const [totalReviews, setTotalReviews] = useState(0);
  const [loadingReviews, setLoadingReviews] = useState(true);

  // Form state
  const [formData, setFormData] = useState({
    experience: '',
    skills: [],
    description: '',
    bio: '',
    availability: true,
    city: '',
    address: '',
    phone: '',
    email: '',
  });

  // Portfolio images
  const [portfolioImages, setPortfolioImages] = useState([]);
  const [newPortfolioFiles, setNewPortfolioFiles] = useState([]);
  const [newPortfolioPreviews, setNewPortfolioPreviews] = useState([]);

  // Skills input
  const [skillInput, setSkillInput] = useState('');

  // Use refs for cleanup
  const unsubscribeRef = useRef(null);

  // Fetch provider profile
  useEffect(() => {
    if (authLoading || !currentUser || !currentUser.uid) {
      if (!authLoading && (!currentUser || !currentUser.uid)) {
        setLoading(false);
        toast.error('Please log in to view your profile.');
        navigate('/auth');
      }
      return;
    }

    if (!db) {
      console.error('Firestore db is not initialized');
      setLoading(false);
      return;
    }

    const fetchProviderProfile = async () => {
      try {
        setLoading(true);

        // Query serviceProviders where userId == currentUser.uid and serviceType == 'Construction'
        const providersQuery = query(
          collection(db, 'serviceProviders'),
          where('userId', '==', currentUser.uid),
          where('serviceType', '==', 'Construction')
        );

        const snapshot = await getDocs(providersQuery);

        if (snapshot.empty) {
          toast.error('Constructor profile not found. Please register as a constructor first.');
          navigate('/register-constructor');
          return;
        }

        const providerDoc = snapshot.docs[0];
        const data = { id: providerDoc.id, ...providerDoc.data() };
        setProviderId(providerDoc.id);
        setProviderData(data);

        // Set form data
        setFormData({
          experience: data.experience?.toString() || data.experienceYears?.toString() || '',
          skills: data.skills || data.expertise || [],
          description: data.description || data.bio || '',
          bio: data.bio || data.description || '',
          availability: data.availability !== undefined ? data.availability : true,
          city: data.city || '',
          address: data.address || '',
          phone: data.phone || '',
          email: data.email || '',
        });

        // Set portfolio images
        if (data.portfolioImages && Array.isArray(data.portfolioImages)) {
          setPortfolioImages(data.portfolioImages);
        } else if (data.portfolioLinks && Array.isArray(data.portfolioLinks)) {
          // Fallback to portfolioLinks if portfolioImages doesn't exist
          setPortfolioImages(data.portfolioLinks);
        }

        // Fetch user name
        try {
          const userDoc = await getDoc(doc(db, 'users', currentUser.uid));
          if (userDoc.exists()) {
            const userData = userDoc.data();
            setUserName(
              userData.displayName ||
                userData.name ||
                data.name ||
                currentUser.email?.split('@')[0] ||
                'Provider'
            );
          } else {
            setUserName(data.name || currentUser.email?.split('@')[0] || 'Provider');
          }
        } catch (error) {
          console.error('Error fetching user name:', error);
          setUserName(data.name || currentUser.email?.split('@')[0] || 'Provider');
        }
      } catch (error) {
        console.error('Error fetching provider profile:', error);
        toast.error('Failed to load profile. Please try again.');
      } finally {
        setLoading(false);
      }
    };

    fetchProviderProfile();
  }, [currentUser, authLoading, navigate]);

  // Fetch reviews
  useEffect(() => {
    if (!providerId) return;

    const fetchReviews = async () => {
      try {
        setLoadingReviews(true);
        const [fetchedReviews, ratingData] = await Promise.all([
          reviewsService.getByTarget(providerId, 'provider'),
          reviewsService.getAverageRating(providerId, 'provider'),
        ]);

        setReviews(fetchedReviews);
        setAverageRating(ratingData.average || 0);
        setTotalReviews(ratingData.count || 0);
      } catch (error) {
        console.error('Error loading reviews:', error);
        setReviews([]);
        setAverageRating(0);
        setTotalReviews(0);
      } finally {
        setLoadingReviews(false);
      }
    };

    fetchReviews();
  }, [providerId]);

  // Handle form input change
  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value,
    }));
  };

  // Add skill
  const handleAddSkill = () => {
    if (skillInput.trim() && !formData.skills.includes(skillInput.trim())) {
      setFormData((prev) => ({
        ...prev,
        skills: [...prev.skills, skillInput.trim()],
      }));
      setSkillInput('');
    }
  };

  // Remove skill
  const handleRemoveSkill = (skillToRemove) => {
    setFormData((prev) => ({
      ...prev,
      skills: prev.skills.filter((skill) => skill !== skillToRemove),
    }));
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

  // Remove new portfolio image
  const handleRemoveNewPortfolioImage = (index) => {
    setNewPortfolioFiles((prev) => {
      const newFiles = prev.filter((_, i) => i !== index);
      return newFiles;
    });
    setNewPortfolioPreviews((prev) => {
      URL.revokeObjectURL(prev[index]);
      return prev.filter((_, i) => i !== index);
    });
  };

  // Remove existing portfolio image
  const handleRemovePortfolioImage = async (imageUrl, index) => {
    if (!isEditing) return;
    setPortfolioImages((prev) => prev.filter((_, i) => i !== index));
    // Optionally delete from Storage (if URL is from Storage)
    // This is a simplified version - you may want to extract the path from the URL
  };

  // Upload new portfolio images
  const uploadPortfolioImages = async () => {
    if (newPortfolioFiles.length === 0) return [];

    setUploadingImages(true);
    const uploadedUrls = [];

    try {
      for (const file of newPortfolioFiles) {
        const timestamp = Date.now();
        const fileName = `${timestamp}_portfolio_${file.name.replace(/[^a-zA-Z0-9.-]/g, '_')}`;
        const storagePath = `providers/constructors/${currentUser.uid}/portfolio/${fileName}`;
        const storageRef = ref(storage, storagePath);
        await uploadBytes(storageRef, file);
        const url = await getDownloadURL(storageRef);
        uploadedUrls.push(url);
      }
    } catch (error) {
      console.error('Error uploading portfolio images:', error);
      throw new Error('Failed to upload portfolio images');
    } finally {
      setUploadingImages(false);
    }

    return uploadedUrls;
  };

  // Save profile updates
  const handleSave = async () => {
    if (!providerId || !db) {
      toast.error('Profile not found');
      return;
    }

    try {
      setSaving(true);

      // Validate form
      if (!formData.experience || Number(formData.experience) < 0) {
        toast.error('Please enter a valid experience (years)');
        return;
      }

      // Upload new portfolio images
      const newImageUrls = await uploadPortfolioImages();
      const allPortfolioImages = [...portfolioImages, ...newImageUrls];

      // Prepare update data
      const updateData = {
        experience: Number(formData.experience),
        experienceYears: Number(formData.experience), // Keep for backward compatibility
        skills: formData.skills,
        expertise: formData.skills, // Keep for backward compatibility
        description: formData.description || formData.bio,
        bio: formData.bio || formData.description,
        availability: formData.availability,
        city: formData.city,
        address: formData.address,
        phone: formData.phone,
        email: formData.email,
        portfolioImages: allPortfolioImages,
        updatedAt: serverTimestamp(),
      };

      // Update Firestore document
      const providerRef = doc(db, 'serviceProviders', providerId);
      await updateDoc(providerRef, updateData);

      // Update local state
      setProviderData((prev) => ({ ...prev, ...updateData }));
      setPortfolioImages(allPortfolioImages);
      setNewPortfolioFiles([]);
      setNewPortfolioPreviews([]);

      toast.success('Profile updated successfully!');
      setIsEditing(false);
    } catch (error) {
      console.error('Error saving profile:', error);
      toast.error(error.message || 'Failed to save profile. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  // Cancel editing
  const handleCancel = () => {
    // Reset form data to original
    if (providerData) {
      setFormData({
        experience: providerData.experience?.toString() || providerData.experienceYears?.toString() || '',
        skills: providerData.skills || providerData.expertise || [],
        description: providerData.description || providerData.bio || '',
        bio: providerData.bio || providerData.description || '',
        availability: providerData.availability !== undefined ? providerData.availability : true,
        city: providerData.city || '',
        address: providerData.address || '',
        phone: providerData.phone || '',
        email: providerData.email || '',
      });
      if (providerData.portfolioImages && Array.isArray(providerData.portfolioImages)) {
        setPortfolioImages(providerData.portfolioImages);
      } else if (providerData.portfolioLinks && Array.isArray(providerData.portfolioLinks)) {
        setPortfolioImages(providerData.portfolioLinks);
      }
    }
    setNewPortfolioFiles([]);
    setNewPortfolioPreviews([]);
    setIsEditing(false);
  };

  // Format date
  const formatDate = (dateValue) => {
    if (!dateValue) return 'N/A';
    try {
      if (dateValue.toDate) {
        return dateValue.toDate().toLocaleDateString('en-US', {
          year: 'numeric',
          month: 'short',
          day: 'numeric',
        });
      }
      return new Date(dateValue).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
      });
    } catch (err) {
      return 'Invalid date';
    }
  };

  if (authLoading || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  if (!providerData) {
    return (
      <div className="min-h-screen bg-background">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="text-center py-12">
            <Building2 className="w-16 h-16 mx-auto text-textSecondary mb-4" />
            <h2 className="text-2xl font-bold text-textMain mb-2">Profile Not Found</h2>
            <p className="text-textSecondary mb-6">Please register as a constructor first.</p>
            <Button onClick={() => navigate('/register-constructor')}>Register as Constructor</Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-textMain mb-2">Constructor Profile</h1>
            <p className="text-textSecondary">Manage your profile information and portfolio</p>
          </div>
          {!isEditing ? (
            <Button onClick={() => setIsEditing(true)} icon={<Edit2 className="w-4 h-4" />}>
              Edit Profile
            </Button>
          ) : (
            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={handleCancel}
                disabled={saving || uploadingImages}
              >
                Cancel
              </Button>
              <Button
                onClick={handleSave}
                disabled={saving || uploadingImages}
                icon={<Save className="w-4 h-4" />}
              >
                {saving ? 'Saving...' : 'Save Changes'}
              </Button>
            </div>
          )}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column - Profile Info */}
          <div className="lg:col-span-2 space-y-6">
            {/* Basic Information */}
            <div className="bg-surface rounded-lg border border-borderColor p-6">
              <h2 className="text-xl font-semibold text-textMain mb-4">Basic Information</h2>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-textMain mb-2">
                    Provider Name
                  </label>
                  <div className="flex items-center gap-2 text-textMain">
                    <User className="w-5 h-5" />
                    <span>{userName}</span>
                  </div>
                  <p className="text-xs text-textSecondary mt-1">Name from user profile</p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-textMain mb-2">
                    Service Category
                  </label>
                  <div className="flex items-center gap-2 text-textMain">
                    <Building2 className="w-5 h-5" />
                    <span>Construction</span>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-textMain mb-2">
                    Experience (Years) *
                  </label>
                  {isEditing ? (
                    <input
                      type="number"
                      name="experience"
                      value={formData.experience}
                      onChange={handleInputChange}
                      min="0"
                      className="w-full px-4 py-2 border border-borderColor rounded-lg bg-background text-textMain focus:outline-none focus:ring-2 focus:ring-primary"
                      placeholder="Enter years of experience"
                    />
                  ) : (
                    <div className="flex items-center gap-2 text-textMain">
                      <Briefcase className="w-5 h-5" />
                      <span>{providerData.experience || providerData.experienceYears || 0} years</span>
                    </div>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-textMain mb-2">
                    Skills *
                  </label>
                  {isEditing ? (
                    <div className="space-y-2">
                      <div className="flex gap-2">
                        <input
                          type="text"
                          value={skillInput}
                          onChange={(e) => setSkillInput(e.target.value)}
                          onKeyPress={(e) => {
                            if (e.key === 'Enter') {
                              e.preventDefault();
                              handleAddSkill();
                            }
                          }}
                          className="flex-1 px-4 py-2 border border-borderColor rounded-lg bg-background text-textMain focus:outline-none focus:ring-2 focus:ring-primary"
                          placeholder="Add a skill and press Enter"
                        />
                        <Button onClick={handleAddSkill} size="sm">
                          Add
                        </Button>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {formData.skills.map((skill, index) => (
                          <span
                            key={index}
                            className="inline-flex items-center gap-1 px-3 py-1 bg-primary/10 text-primary rounded-full text-sm"
                          >
                            {skill}
                            <button
                              type="button"
                              onClick={() => handleRemoveSkill(skill)}
                              className="hover:text-primary/70"
                            >
                              <X className="w-3 h-3" />
                            </button>
                          </span>
                        ))}
                      </div>
                    </div>
                  ) : (
                    <div className="flex flex-wrap gap-2">
                      {(providerData.skills || providerData.expertise || []).map((skill, index) => (
                        <span
                          key={index}
                          className="px-3 py-1 bg-primary/10 text-primary rounded-full text-sm"
                        >
                          {skill}
                        </span>
                      ))}
                    </div>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-textMain mb-2">
                    Description / Bio
                  </label>
                  {isEditing ? (
                    <textarea
                      name="description"
                      value={formData.description}
                      onChange={handleInputChange}
                      rows={4}
                      className="w-full px-4 py-2 border border-borderColor rounded-lg bg-background text-textMain focus:outline-none focus:ring-2 focus:ring-primary"
                      placeholder="Describe your services and expertise..."
                    />
                  ) : (
                    <p className="text-textMain whitespace-pre-wrap">
                      {providerData.description || providerData.bio || 'No description provided'}
                    </p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-textMain mb-2">
                    Availability
                  </label>
                  {isEditing ? (
                    <label className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        name="availability"
                        checked={formData.availability}
                        onChange={handleInputChange}
                        className="w-4 h-4 text-primary rounded focus:ring-primary"
                      />
                      <span className="text-textMain">Available for new projects</span>
                    </label>
                  ) : (
                    <div className="flex items-center gap-2">
                      <span
                        className={`px-3 py-1 rounded-full text-sm font-medium ${
                          providerData.availability
                            ? 'bg-primary/20 text-primary'
                            : 'bg-gray-100 text-gray-800'
                        }`}
                      >
                        {providerData.availability ? 'Available' : 'Not Available'}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Contact Information */}
            <div className="bg-surface rounded-lg border border-borderColor p-6">
              <h2 className="text-xl font-semibold text-textMain mb-4">Contact Information</h2>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-textMain mb-2">
                    <Phone className="w-4 h-4 inline mr-2" />
                    Phone
                  </label>
                  {isEditing ? (
                    <input
                      type="tel"
                      name="phone"
                      value={formData.phone}
                      onChange={handleInputChange}
                      className="w-full px-4 py-2 border border-borderColor rounded-lg bg-background text-textMain focus:outline-none focus:ring-2 focus:ring-primary"
                      placeholder="+92 300 123-4567"
                    />
                  ) : (
                    <p className="text-textMain">{providerData.phone || 'Not provided'}</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-textMain mb-2">
                    <Mail className="w-4 h-4 inline mr-2" />
                    Email
                  </label>
                  {isEditing ? (
                    <input
                      type="email"
                      name="email"
                      value={formData.email}
                      onChange={handleInputChange}
                      className="w-full px-4 py-2 border border-borderColor rounded-lg bg-background text-textMain focus:outline-none focus:ring-2 focus:ring-primary"
                      placeholder="email@example.com"
                    />
                  ) : (
                    <p className="text-textMain">{providerData.email || 'Not provided'}</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-textMain mb-2">
                    <MapPin className="w-4 h-4 inline mr-2" />
                    City
                  </label>
                  {isEditing ? (
                    <input
                      type="text"
                      name="city"
                      value={formData.city}
                      onChange={handleInputChange}
                      className="w-full px-4 py-2 border border-borderColor rounded-lg bg-background text-textMain focus:outline-none focus:ring-2 focus:ring-primary"
                      placeholder="Lahore"
                    />
                  ) : (
                    <p className="text-textMain">{providerData.city || 'Not provided'}</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-textMain mb-2">
                    <MapPin className="w-4 h-4 inline mr-2" />
                    Address
                  </label>
                  {isEditing ? (
                    <textarea
                      name="address"
                      value={formData.address}
                      onChange={handleInputChange}
                      rows={2}
                      className="w-full px-4 py-2 border border-borderColor rounded-lg bg-background text-textMain focus:outline-none focus:ring-2 focus:ring-primary"
                      placeholder="Full address"
                    />
                  ) : (
                    <p className="text-textMain">{providerData.address || 'Not provided'}</p>
                  )}
                </div>
              </div>
            </div>

            {/* Portfolio Images */}
            <div className="bg-surface rounded-lg border border-borderColor p-6">
              <h2 className="text-xl font-semibold text-textMain mb-4">Portfolio Images</h2>
              {isEditing && (
                <div className="mb-4">
                  <label className="block text-sm font-medium text-textMain mb-2">
                    Upload New Images
                  </label>
                  <input
                    type="file"
                    accept="image/*"
                    multiple
                    onChange={handlePortfolioImageChange}
                    className="hidden"
                    id="portfolio-upload"
                    disabled={uploadingImages}
                  />
                  <label
                    htmlFor="portfolio-upload"
                    className="inline-flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-lg cursor-pointer hover:bg-primary/90 disabled:opacity-50"
                  >
                    <Upload className="w-4 h-4" />
                    {uploadingImages ? 'Uploading...' : 'Upload Images'}
                  </label>
                  <p className="text-xs text-textSecondary mt-1">
                    Max 5MB per image. Multiple images allowed.
                  </p>
                </div>
              )}

              {/* New Portfolio Previews */}
              {isEditing && newPortfolioPreviews.length > 0 && (
                <div className="mb-4">
                  <h3 className="text-sm font-medium text-textMain mb-2">New Images (to be uploaded)</h3>
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

              {/* Existing Portfolio Images */}
              {portfolioImages.length > 0 ? (
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
                      {isEditing && (
                        <button
                          type="button"
                          onClick={() => handleRemovePortfolioImage(imageUrl, index)}
                          className="absolute top-2 right-2 bg-error text-white rounded-full p-1 hover:bg-error/80"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 bg-muted rounded-lg">
                  <ImageIcon className="w-12 h-12 mx-auto text-textSecondary mb-2" />
                  <p className="text-textSecondary text-sm">No portfolio images yet</p>
                </div>
              )}
            </div>
          </div>

          {/* Right Column - Ratings & Reviews */}
          <div className="space-y-6">
            {/* Ratings Summary */}
            <div className="bg-surface rounded-lg border border-borderColor p-6">
              <h2 className="text-xl font-semibold text-textMain mb-4">Ratings & Reviews</h2>
              {loadingReviews ? (
                <LoadingSpinner size="sm" />
              ) : (
                <div className="space-y-4">
                  <div className="text-center">
                    <div className="flex items-center justify-center gap-2 mb-2">
                      <Star className="w-8 h-8 text-accent fill-accent" />
                      <span className="text-3xl font-bold text-textMain">{averageRating.toFixed(1)}</span>
                    </div>
                    <p className="text-textSecondary text-sm">
                      {totalReviews} {totalReviews === 1 ? 'review' : 'reviews'}
                    </p>
                  </div>

                  {reviews.length > 0 ? (
                    <div className="space-y-4 max-h-96 overflow-y-auto">
                      {reviews.slice(0, 5).map((review) => (
                        <div key={review.id} className="border-t border-borderColor pt-4">
                          <div className="flex items-start justify-between mb-2">
                            <div className="flex items-center gap-1">
                              {[...Array(5)].map((_, i) => (
                                <Star
                                  key={i}
                                  className={`w-4 h-4 ${
                                    i < (review.rating || 0)
                                      ? 'text-accent fill-accent'
                                      : 'text-gray-300'
                                  }`}
                                />
                              ))}
                            </div>
                            <span className="text-xs text-textSecondary">
                              {formatDate(review.createdAt)}
                            </span>
                          </div>
                          {review.comment && (
                            <p className="text-sm text-textMain">{review.comment}</p>
                          )}
                          {review.reviewerName && (
                            <p className="text-xs text-textSecondary mt-1">— {review.reviewerName}</p>
                          )}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-4">
                      <Star className="w-8 h-8 mx-auto text-textSecondary mb-2" />
                      <p className="text-textSecondary text-sm">No reviews yet</p>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Profile Stats */}
            <div className="bg-surface rounded-lg border border-borderColor p-6">
              <h2 className="text-xl font-semibold text-textMain mb-4">Profile Information</h2>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-textSecondary">Status</span>
                  <span
                    className={`px-2 py-1 rounded text-xs font-medium ${
                      providerData.approved || providerData.isApproved
                        ? 'bg-primary/20 text-primary'
                        : 'bg-accent/20 text-accent'
                    }`}
                  >
                    {providerData.approved || providerData.isApproved ? 'Approved' : 'Pending Approval'}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-textSecondary">Member Since</span>
                  <span className="text-textMain text-sm">
                    {formatDate(providerData.createdAt)}
                  </span>
                </div>
                {providerData.updatedAt && (
                  <div className="flex items-center justify-between">
                    <span className="text-textSecondary">Last Updated</span>
                    <span className="text-textMain text-sm">
                      {formatDate(providerData.updatedAt)}
                    </span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ConstructorProfile;
