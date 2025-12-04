import React, { useState, useEffect } from 'react';
import { Camera, User, Mail, Phone, MapPin, Lock, Save, X } from 'lucide-react';
import { useAuth } from '../../../context/AuthContext';
import userService from '../../../services/userService';
import { uploadImage } from '../../../firebase/storageFunctions';
import { updatePassword, reauthenticateWithCredential, EmailAuthProvider } from 'firebase/auth';
import { auth } from '../../../firebase';
import toast from 'react-hot-toast';
import Button from '../../../components/common/Button';
import Input from '../../../components/common/Input';
import LoadingSpinner from '../../../components/common/LoadingSpinner';
import Modal from '../../../components/common/Modal';

const ProfileDetails = ({ user, userProfile, onDataReload }) => {
  const { currentUser } = useAuth();
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);

  const [formData, setFormData] = useState({
    displayName: '',
    email: '',
    phone: '',
    address: {
      line1: '',
      line2: '',
      city: '',
      state: '',
      postalCode: '',
      country: 'Pakistan',
    },
    photoURL: '',
  });

  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });

  const [errors, setErrors] = useState({});

  useEffect(() => {
    if (userProfile || currentUser) {
      // AUTO-FIX: Always prioritize Google photoURL if user logged in with Google
      const isGoogleUser = currentUser?.providerData?.some(
        (provider) => provider.providerId === 'google.com'
      );
      
      // Sync Google photoURL to Firestore if it exists and is different
      const syncGooglePhoto = async () => {
        if (isGoogleUser && currentUser?.photoURL && user?.uid) {
          const currentPhotoURL = userProfile?.photoURL || '';
          const googlePhotoURL = currentUser.photoURL;
          
          // If Google photoURL is different from Firestore, sync it
          if (googlePhotoURL !== currentPhotoURL) {
            try {
              await userService.updateProfile(user.uid, {
                photoURL: googlePhotoURL,
              });
              // Reload profile data after sync
              if (onDataReload) {
                onDataReload();
              }
            } catch (error) {
              console.error('Error syncing Google photoURL:', error);
            }
          }
        }
      };
      
      // Determine which photoURL to use (prioritize Google if available)
      const photoURLToUse = isGoogleUser && currentUser?.photoURL
        ? currentUser.photoURL
        : userProfile?.photoURL || currentUser?.photoURL || '';
      
      setFormData({
        displayName: userProfile?.displayName || userProfile?.name || currentUser?.displayName || '',
        email: currentUser?.email || userProfile?.email || '',
        phone: userProfile?.phone || userProfile?.phoneNumber || '',
        address: {
          line1: userProfile?.address?.line1 || '',
          line2: userProfile?.address?.line2 || '',
          city: userProfile?.address?.city || '',
          state: userProfile?.address?.state || '',
          postalCode: userProfile?.address?.postalCode || '',
          country: userProfile?.address?.country || 'Pakistan',
        },
        photoURL: photoURLToUse,
      });
      
      // Sync Google photo if needed
      if (isGoogleUser && currentUser?.photoURL) {
        syncGooglePhoto();
      }
    }
  }, [userProfile, currentUser, user, onDataReload]);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    if (name.startsWith('address.')) {
      const addressField = name.split('.')[1];
      setFormData((prev) => ({
        ...prev,
        address: {
          ...prev.address,
          [addressField]: value,
        },
      }));
    } else {
      setFormData((prev) => ({
        ...prev,
        [name]: value,
      }));
    }
    // Clear error for this field
    if (errors[name]) {
      setErrors((prev) => ({ ...prev, [name]: '' }));
    }
  };

  const handleImageUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      toast.error('Please select an image file');
      return;
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast.error('Image size must be less than 5MB');
      return;
    }

    setUploadingImage(true);
    try {
      const imageUrl = await uploadImage(file, 'users/profiles', `${user.uid}_${Date.now()}`);
      setFormData((prev) => ({ ...prev, photoURL: imageUrl }));
      toast.success('Profile image uploaded successfully');
    } catch (error) {
      console.error('Error uploading image:', error);
      toast.error('Failed to upload image');
    } finally {
      setUploadingImage(false);
    }
  };

  const validateForm = () => {
    const newErrors = {};
    if (!formData.displayName.trim()) {
      newErrors.displayName = 'Full name is required';
    }
    if (!formData.email.trim()) {
      newErrors.email = 'Email is required';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = 'Invalid email format';
    }
    if (formData.phone && !/^\+?[\d\s-]{10,15}$/.test(formData.phone)) {
      newErrors.phone = 'Invalid phone number';
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSave = async () => {
    if (!validateForm()) {
      toast.error('Please fix the errors in the form');
      return;
    }

    setSaving(true);
    try {
      const updates = {
        displayName: formData.displayName.trim(),
        phone: formData.phone.trim(),
        address: formData.address,
        photoURL: formData.photoURL,
      };

      await userService.updateProfile(user.uid, updates);

      // Update Firebase Auth profile if photoURL changed
      if (formData.photoURL && currentUser) {
        try {
          await currentUser.updateProfile({
            photoURL: formData.photoURL,
            displayName: formData.displayName,
          });
        } catch (authError) {
          console.error('Error updating auth profile:', authError);
          // Don't fail the whole operation if auth update fails
        }
      }

      toast.success('Profile updated successfully');
      setIsEditing(false);
      if (onDataReload) {
        onDataReload();
      }
    } catch (error) {
      console.error('Error updating profile:', error);
      toast.error(error.message || 'Failed to update profile');
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => {
    // Reset form data to original values
    if (userProfile) {
      setFormData({
        displayName: userProfile.displayName || userProfile.name || '',
        email: currentUser?.email || userProfile.email || '',
        phone: userProfile.phone || userProfile.phoneNumber || '',
        address: {
          line1: userProfile.address?.line1 || '',
          line2: userProfile.address?.line2 || '',
          city: userProfile.address?.city || '',
          state: userProfile.address?.state || '',
          postalCode: userProfile.address?.postalCode || '',
          country: userProfile.address?.country || 'Pakistan',
        },
        photoURL: currentUser?.photoURL || userProfile.photoURL || '',
      });
    }
    setErrors({});
    setIsEditing(false);
  };

  const validatePasswordForm = () => {
    const newErrors = {};
    if (!passwordData.currentPassword) {
      newErrors.currentPassword = 'Current password is required';
    }
    if (!passwordData.newPassword) {
      newErrors.newPassword = 'New password is required';
    } else if (passwordData.newPassword.length < 6) {
      newErrors.newPassword = 'Password must be at least 6 characters';
    }
    if (passwordData.newPassword !== passwordData.confirmPassword) {
      newErrors.confirmPassword = 'Passwords do not match';
    }
    setErrors((prev) => ({ ...prev, ...newErrors }));
    return Object.keys(newErrors).length === 0;
  };

  const handlePasswordUpdate = async () => {
    if (!validatePasswordForm()) {
      toast.error('Please fix the errors in the form');
      return;
    }

    if (!currentUser || !currentUser.email) {
      toast.error('User not authenticated');
      return;
    }

    setSaving(true);
    try {
      // Re-authenticate user
      const credential = EmailAuthProvider.credential(
        currentUser.email,
        passwordData.currentPassword
      );
      await reauthenticateWithCredential(currentUser, credential);

      // Update password
      await updatePassword(currentUser, passwordData.newPassword);

      toast.success('Password updated successfully');
      setShowPasswordModal(false);
      setPasswordData({
        currentPassword: '',
        newPassword: '',
        confirmPassword: '',
      });
      setErrors({});
    } catch (error) {
      console.error('Error updating password:', error);
      let errorMessage = 'Failed to update password';
      if (error.code === 'auth/wrong-password') {
        errorMessage = 'Current password is incorrect';
      } else if (error.code === 'auth/weak-password') {
        errorMessage = 'New password is too weak';
      }
      toast.error(errorMessage);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-display font-bold text-textMain">Profile Details</h1>
          <p className="text-textSecondary mt-2">Manage your personal information</p>
        </div>
        {!isEditing && (
          <Button onClick={() => setIsEditing(true)} variant="primary">
            Edit Profile
          </Button>
        )}
      </div>

      {/* Profile Card */}
      <div className="bg-surface rounded-lg shadow-md p-6 border border-muted">
        {/* Profile Image */}
        <div className="flex items-center space-x-6 mb-8">
          <div className="relative">
            <div className="w-24 h-24 rounded-full bg-muted flex items-center justify-center overflow-hidden">
              {formData.photoURL ? (
                <img
                  src={formData.photoURL}
                  alt="Profile"
                  className="w-full h-full object-cover"
                />
              ) : (
                <User className="w-12 h-12 text-textSecondary" />
              )}
            </div>
            {isEditing && (
              <label className="absolute bottom-0 right-0 bg-primary text-white p-2 rounded-full cursor-pointer hover:bg-primaryDark transition-colors">
                {uploadingImage ? (
                  <LoadingSpinner size="sm" />
                ) : (
                  <Camera className="w-4 h-4" />
                )}
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleImageUpload}
                  className="hidden"
                  disabled={uploadingImage}
                />
              </label>
            )}
          </div>
          <div>
            <h2 className="text-xl font-semibold text-textMain">
              {formData.displayName || 'User'}
            </h2>
            <p className="text-textSecondary">{formData.email}</p>
          </div>
        </div>

        {/* Form Fields */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Full Name */}
          <div>
            <label className="block text-sm font-medium text-textMain mb-2">
              <User className="w-4 h-4 inline mr-2" />
              Full Name
            </label>
            {isEditing ? (
              <Input
                name="displayName"
                value={formData.displayName}
                onChange={handleInputChange}
                error={errors.displayName}
                placeholder="Enter your full name"
              />
            ) : (
              <p className="text-textMain">{formData.displayName || 'Not set'}</p>
            )}
          </div>

          {/* Email */}
          <div>
            <label className="block text-sm font-medium text-textMain mb-2">
              <Mail className="w-4 h-4 inline mr-2" />
              Email
            </label>
            <p className="text-textMain">{formData.email}</p>
            <p className="text-xs text-textSecondary mt-1">
              Email cannot be changed. Contact support if needed.
            </p>
          </div>

          {/* Phone */}
          <div>
            <label className="block text-sm font-medium text-textMain mb-2">
              <Phone className="w-4 h-4 inline mr-2" />
              Phone Number
            </label>
            {isEditing ? (
              <Input
                name="phone"
                value={formData.phone}
                onChange={handleInputChange}
                error={errors.phone}
                placeholder="+92 300 1234567"
              />
            ) : (
              <p className="text-textMain">{formData.phone || 'Not set'}</p>
            )}
          </div>

          {/* Password */}
          <div>
            <label className="block text-sm font-medium text-textMain mb-2">
              <Lock className="w-4 h-4 inline mr-2" />
              Password
            </label>
            <Button
              variant="outline"
              onClick={() => setShowPasswordModal(true)}
              className="w-full"
            >
              Change Password
            </Button>
          </div>

          {/* Address Line 1 */}
          <div>
            <label className="block text-sm font-medium text-textMain mb-2">
              <MapPin className="w-4 h-4 inline mr-2" />
              Address Line 1
            </label>
            {isEditing ? (
              <Input
                name="address.line1"
                value={formData.address.line1}
                onChange={handleInputChange}
                placeholder="Street address"
              />
            ) : (
              <p className="text-textMain">{formData.address.line1 || 'Not set'}</p>
            )}
          </div>

          {/* Address Line 2 */}
          <div>
            <label className="block text-sm font-medium text-textMain mb-2">
              Address Line 2
            </label>
            {isEditing ? (
              <Input
                name="address.line2"
                value={formData.address.line2}
                onChange={handleInputChange}
                placeholder="Apartment, suite, etc. (optional)"
              />
            ) : (
              <p className="text-textMain">{formData.address.line2 || 'Not set'}</p>
            )}
          </div>

          {/* City */}
          <div>
            <label className="block text-sm font-medium text-textMain mb-2">City</label>
            {isEditing ? (
              <Input
                name="address.city"
                value={formData.address.city}
                onChange={handleInputChange}
                placeholder="City"
              />
            ) : (
              <p className="text-textMain">{formData.address.city || 'Not set'}</p>
            )}
          </div>

          {/* State */}
          <div>
            <label className="block text-sm font-medium text-textMain mb-2">State/Province</label>
            {isEditing ? (
              <Input
                name="address.state"
                value={formData.address.state}
                onChange={handleInputChange}
                placeholder="State or Province"
              />
            ) : (
              <p className="text-textMain">{formData.address.state || 'Not set'}</p>
            )}
          </div>

          {/* Postal Code */}
          <div>
            <label className="block text-sm font-medium text-textMain mb-2">Postal Code</label>
            {isEditing ? (
              <Input
                name="address.postalCode"
                value={formData.address.postalCode}
                onChange={handleInputChange}
                placeholder="Postal code"
              />
            ) : (
              <p className="text-textMain">{formData.address.postalCode || 'Not set'}</p>
            )}
          </div>

          {/* Country */}
          <div>
            <label className="block text-sm font-medium text-textMain mb-2">Country</label>
            {isEditing ? (
              <Input
                name="address.country"
                value={formData.address.country}
                onChange={handleInputChange}
                placeholder="Country"
              />
            ) : (
              <p className="text-textMain">{formData.address.country || 'Not set'}</p>
            )}
          </div>
        </div>

        {/* Action Buttons */}
        {isEditing && (
          <div className="flex items-center justify-end gap-3 mt-8 pt-6 border-t border-muted">
            <Button variant="outline" onClick={handleCancel} disabled={saving}>
              <X className="w-4 h-4 mr-2" />
              Cancel
            </Button>
            <Button onClick={handleSave} loading={saving} disabled={saving}>
              <Save className="w-4 h-4 mr-2" />
              Save Changes
            </Button>
          </div>
        )}
      </div>

      {/* Password Update Modal */}
      <Modal
        isOpen={showPasswordModal}
        onClose={() => {
          setShowPasswordModal(false);
          setPasswordData({
            currentPassword: '',
            newPassword: '',
            confirmPassword: '',
          });
          setErrors({});
        }}
        title="Change Password"
        size="md"
      >
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-textMain mb-2">
              Current Password
            </label>
            <Input
              type="password"
              name="currentPassword"
              value={passwordData.currentPassword}
              onChange={(e) =>
                setPasswordData((prev) => ({ ...prev, currentPassword: e.target.value }))
              }
              error={errors.currentPassword}
              placeholder="Enter current password"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-textMain mb-2">New Password</label>
            <Input
              type="password"
              name="newPassword"
              value={passwordData.newPassword}
              onChange={(e) =>
                setPasswordData((prev) => ({ ...prev, newPassword: e.target.value }))
              }
              error={errors.newPassword}
              placeholder="Enter new password (min 6 characters)"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-textMain mb-2">
              Confirm New Password
            </label>
            <Input
              type="password"
              name="confirmPassword"
              value={passwordData.confirmPassword}
              onChange={(e) =>
                setPasswordData((prev) => ({ ...prev, confirmPassword: e.target.value }))
              }
              error={errors.confirmPassword}
              placeholder="Confirm new password"
            />
          </div>
          <div className="flex items-center justify-end gap-3 pt-4">
            <Button
              variant="outline"
              onClick={() => {
                setShowPasswordModal(false);
                setPasswordData({
                  currentPassword: '',
                  newPassword: '',
                  confirmPassword: '',
                });
                setErrors({});
              }}
              disabled={saving}
            >
              Cancel
            </Button>
            <Button onClick={handlePasswordUpdate} loading={saving} disabled={saving}>
              Update Password
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default ProfileDetails;

