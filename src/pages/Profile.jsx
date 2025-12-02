import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { updateUserPassword } from '../firebase/authFunctions';
import { updateDocById } from '../firebase/firestoreFunctions';
import { uploadImage } from '../firebase/storageFunctions';
import Button from '../components/common/Button';
import Input from '../components/common/Input';
import LoadingSpinner from '../components/common/LoadingSpinner';
import { User, Phone, MapPin, Camera, Lock, Calendar, Shield, Mail } from 'lucide-react';
import toast from 'react-hot-toast';

const Profile = () => {
  const { currentUser, userProfile, loading: authLoading, createOrUpdateUserProfile } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('profile'); // 'profile', 'password', 'details'

  // Profile form state
  const [profileData, setProfileData] = useState({
    name: '',
    phone: '',
    address: '',
  });
  const [profileImage, setProfileImage] = useState(null);
  const [profileImagePreview, setProfileImagePreview] = useState(null);
  const [profileErrors, setProfileErrors] = useState({});

  // Password form state
  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });
  const [showPasswords, setShowPasswords] = useState({
    current: false,
    new: false,
    confirm: false,
  });
  const [passwordErrors, setPasswordErrors] = useState({});

  // Initialize profile data
  useEffect(() => {
    if (userProfile) {
      setProfileData({
        name: userProfile.displayName || userProfile.name || '',
        phone: userProfile.phone || '',
        address: userProfile.address || userProfile.addresses?.[0]?.fullAddress || '',
      });
      setProfileImagePreview(userProfile.photoURL || null);
    }
  }, [userProfile]);

  // Handle profile image selection
  const handleImageSelect = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      toast.error('Please select a valid image file');
      return;
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast.error('Image size must be less than 5MB');
      return;
    }

    setProfileImage(file);

    // Create preview
    const reader = new FileReader();
    reader.onloadend = () => {
      setProfileImagePreview(reader.result);
    };
    reader.readAsDataURL(file);
  };

  // Validate profile form
  const validateProfile = () => {
    const errors = {};

    if (!profileData.name || profileData.name.trim().length < 2) {
      errors.name = 'Name must be at least 2 characters';
    }

    if (profileData.phone && !/^[\d\s\-\+\(\)]+$/.test(profileData.phone)) {
      errors.phone = 'Invalid phone number format';
    }

    setProfileErrors(errors);
    return Object.keys(errors).length === 0;
  };

  // Update profile
  const handleUpdateProfile = async (e) => {
    e.preventDefault();

    if (!validateProfile()) {
      return;
    }

    setIsLoading(true);
    try {
      let photoURL = userProfile?.photoURL || null;

      // Upload new image if selected
      if (profileImage) {
        const imagePath = `profile-images/${currentUser.uid}/${Date.now()}-${profileImage.name}`;
        photoURL = await uploadImage(profileImage, imagePath);
        toast.success('Profile picture uploaded');
      }

      // Update user profile in Firestore
      const updates = {
        displayName: profileData.name.trim(),
        name: profileData.name.trim(),
        phone: profileData.phone.trim() || null,
        photoURL: photoURL,
        updatedAt: new Date(),
      };

      // Handle address
      if (profileData.address) {
        if (userProfile?.addresses && userProfile.addresses.length > 0) {
          updates.addresses = [
            {
              ...userProfile.addresses[0],
              fullAddress: profileData.address.trim(),
              updatedAt: new Date(),
            },
          ];
        } else {
          updates.addresses = [
            {
              fullAddress: profileData.address.trim(),
              isDefault: true,
              createdAt: new Date(),
            },
          ];
        }
      }

      await updateDocById('users', currentUser.uid, updates);

      // Update Firebase Auth profile
      if (currentUser && photoURL) {
        await createOrUpdateUserProfile({
          ...currentUser,
          displayName: profileData.name.trim(),
          photoURL: photoURL,
        });
      }

      toast.success('Saved Successfully! Profile updated.');
      setProfileImage(null);
    } catch (error) {
      console.error('Error updating profile:', error);
      toast.error(error.message || 'Failed to update profile');
    } finally {
      setIsLoading(false);
    }
  };

  // Validate password form
  const validatePassword = () => {
    const errors = {};

    if (!passwordData.currentPassword) {
      errors.currentPassword = 'Current password is required';
    }

    if (!passwordData.newPassword) {
      errors.newPassword = 'New password is required';
    } else if (passwordData.newPassword.length < 6) {
      errors.newPassword = 'Password must be at least 6 characters';
    } else if (!/(?=.*[a-z])(?=.*[A-Z])/.test(passwordData.newPassword)) {
      errors.newPassword = 'Password must contain uppercase and lowercase letters';
    }

    if (!passwordData.confirmPassword) {
      errors.confirmPassword = 'Please confirm your password';
    } else if (passwordData.newPassword !== passwordData.confirmPassword) {
      errors.confirmPassword = 'Passwords do not match';
    }

    setPasswordErrors(errors);
    return Object.keys(errors).length === 0;
  };

  // Update password
  const handleUpdatePassword = async (e) => {
    e.preventDefault();

    if (!validatePassword()) {
      return;
    }

    setIsLoading(true);
    try {
      // Update password using auth function
      const result = await updateUserPassword(
        currentUser,
        passwordData.currentPassword,
        passwordData.newPassword
      );

      if (!result.success) {
        toast.error(result.error || 'Failed to update password');
        setPasswordErrors({ currentPassword: result.error });
        setIsLoading(false);
        return;
      }

      // Clear form
      setPasswordData({
        currentPassword: '',
        newPassword: '',
        confirmPassword: '',
      });

      toast.success('Saved Successfully! Password updated.');
    } catch (error) {
      console.error('Error updating password:', error);
      toast.error(error.message || 'Failed to update password');
    } finally {
      setIsLoading(false);
    }
  };

  // Format date
  const formatDate = (timestamp) => {
    if (!timestamp) return 'N/A';
    if (timestamp.toDate) {
      return timestamp.toDate().toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      });
    }
    if (timestamp instanceof Date) {
      return timestamp.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      });
    }
    return new Date(timestamp).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  // Get role display name
  const getRoleDisplayName = (role) => {
    const roleMap = {
      admin: 'Administrator',
      constructor: 'Constructor',
      renovator: 'Renovator',
      provider: 'Service Provider',
      customer: 'Customer',
    };
    return roleMap[role] || role;
  };

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  if (!currentUser || !userProfile) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <p className="text-textSecondary">Please log in to view your profile</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-display font-bold text-textMain mb-8">Profile Settings</h1>

        {/* Tabs */}
        <div className="flex space-x-1 border-b border-muted mb-6">
          <button
            onClick={() => setActiveTab('profile')}
            className={`px-4 py-2 font-medium transition-colors ${
              activeTab === 'profile'
                ? 'text-primary border-b-2 border-primary'
                : 'text-textSecondary hover:text-textMain'
            }`}
          >
            Profile
          </button>
          <button
            onClick={() => setActiveTab('password')}
            className={`px-4 py-2 font-medium transition-colors ${
              activeTab === 'password'
                ? 'text-primary border-b-2 border-primary'
                : 'text-textSecondary hover:text-textMain'
            }`}
          >
            Password
          </button>
          <button
            onClick={() => setActiveTab('details')}
            className={`px-4 py-2 font-medium transition-colors ${
              activeTab === 'details'
                ? 'text-primary border-b-2 border-primary'
                : 'text-textSecondary hover:text-textMain'
            }`}
          >
            Account Details
          </button>
        </div>

        {/* Profile Tab */}
        {activeTab === 'profile' && (
          <div className="bg-surface rounded-base shadow-md p-6 border border-muted">
            <h2 className="text-xl font-semibold text-textMain mb-6">Update Profile</h2>

            <form onSubmit={handleUpdateProfile} className="space-y-6">
              {/* Profile Picture */}
              <div className="flex items-center space-x-6">
                <div className="relative">
                  <div className="w-24 h-24 rounded-full overflow-hidden bg-muted flex items-center justify-center">
                    {profileImagePreview ? (
                      <img
                        src={profileImagePreview}
                        alt="Profile"
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <User className="w-12 h-12 text-textSecondary" />
                    )}
                  </div>
                  <label
                    htmlFor="profile-image"
                    className="absolute bottom-0 right-0 bg-primary text-white rounded-full p-2 cursor-pointer hover:bg-primaryDark transition-colors"
                  >
                    <Camera className="w-4 h-4" />
                    <input
                      type="file"
                      id="profile-image"
                      accept="image/*"
                      onChange={handleImageSelect}
                      className="hidden"
                    />
                  </label>
                </div>
                <div>
                  <p className="text-sm font-medium text-textMain">Profile Picture</p>
                  <p className="text-xs text-textSecondary mt-1">
                    JPG, PNG or GIF. Max size 5MB
                  </p>
                </div>
              </div>

              <Input
                label="Full Name"
                type="text"
                value={profileData.name}
                onChange={(e) => {
                  setProfileData({ ...profileData, name: e.target.value });
                  if (profileErrors.name) {
                    setProfileErrors({ ...profileErrors, name: '' });
                  }
                }}
                error={profileErrors.name}
                leftIcon={<User className="w-4 h-4" />}
                placeholder="Enter your full name"
                required
              />

              <Input
                label="Phone Number"
                type="tel"
                value={profileData.phone}
                onChange={(e) => {
                  setProfileData({ ...profileData, phone: e.target.value });
                  if (profileErrors.phone) {
                    setProfileErrors({ ...profileErrors, phone: '' });
                  }
                }}
                error={profileErrors.phone}
                leftIcon={<Phone className="w-4 h-4" />}
                placeholder="Enter your phone number"
              />

              <div>
                <label className="block text-sm font-medium text-textSecondary mb-1">
                  Address
                </label>
                <textarea
                  value={profileData.address}
                  onChange={(e) => {
                    setProfileData({ ...profileData, address: e.target.value });
                  }}
                  rows={3}
                  className="w-full px-3 py-2 border border-muted rounded-base focus:border-primary focus:ring-primary transition-colors duration-200"
                  placeholder="Enter your address"
                />
              </div>

              <Button type="submit" loading={isLoading} size="lg">
                Update Profile
              </Button>
            </form>
          </div>
        )}

        {/* Password Tab */}
        {activeTab === 'password' && (
          <div className="bg-surface rounded-base shadow-md p-6 border border-muted">
            <h2 className="text-xl font-semibold text-textMain mb-6">Change Password</h2>

            <form onSubmit={handleUpdatePassword} className="space-y-6 max-w-md">
              <Input
                label="Current Password"
                type={showPasswords.current ? 'text' : 'password'}
                value={passwordData.currentPassword}
                onChange={(e) => {
                  setPasswordData({ ...passwordData, currentPassword: e.target.value });
                  if (passwordErrors.currentPassword) {
                    setPasswordErrors({ ...passwordErrors, currentPassword: '' });
                  }
                }}
                error={passwordErrors.currentPassword}
                leftIcon={<Lock className="w-4 h-4" />}
                rightIcon={
                  <button
                    type="button"
                    onClick={() =>
                      setShowPasswords({ ...showPasswords, current: !showPasswords.current })
                    }
                    className="text-textSecondary hover:text-textMain"
                  >
                    {showPasswords.current ? '👁️' : '👁️‍🗨️'}
                  </button>
                }
                placeholder="Enter current password"
                required
              />

              <Input
                label="New Password"
                type={showPasswords.new ? 'text' : 'password'}
                value={passwordData.newPassword}
                onChange={(e) => {
                  setPasswordData({ ...passwordData, newPassword: e.target.value });
                  if (passwordErrors.newPassword) {
                    setPasswordErrors({ ...passwordErrors, newPassword: '' });
                  }
                }}
                error={passwordErrors.newPassword}
                leftIcon={<Lock className="w-4 h-4" />}
                rightIcon={
                  <button
                    type="button"
                    onClick={() =>
                      setShowPasswords({ ...showPasswords, new: !showPasswords.new })
                    }
                    className="text-textSecondary hover:text-textMain"
                  >
                    {showPasswords.new ? '👁️' : '👁️‍🗨️'}
                  </button>
                }
                placeholder="Enter new password"
                required
              />

              <Input
                label="Confirm New Password"
                type={showPasswords.confirm ? 'text' : 'password'}
                value={passwordData.confirmPassword}
                onChange={(e) => {
                  setPasswordData({ ...passwordData, confirmPassword: e.target.value });
                  if (passwordErrors.confirmPassword) {
                    setPasswordErrors({ ...passwordErrors, confirmPassword: '' });
                  }
                }}
                error={passwordErrors.confirmPassword}
                leftIcon={<Lock className="w-4 h-4" />}
                rightIcon={
                  <button
                    type="button"
                    onClick={() =>
                      setShowPasswords({ ...showPasswords, confirm: !showPasswords.confirm })
                    }
                    className="text-textSecondary hover:text-textMain"
                  >
                    {showPasswords.confirm ? '👁️' : '👁️‍🗨️'}
                  </button>
                }
                placeholder="Confirm new password"
                required
              />

              <Button type="submit" loading={isLoading} size="lg">
                Update Password
              </Button>
            </form>
          </div>
        )}

        {/* Account Details Tab */}
        {activeTab === 'details' && (
          <div className="bg-surface rounded-base shadow-md p-6 border border-muted">
            <h2 className="text-xl font-semibold text-textMain mb-6">Account Details</h2>

            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="flex items-start space-x-3">
                  <Mail className="w-5 h-5 text-textSecondary mt-1" />
                  <div>
                    <p className="text-sm font-medium text-textSecondary">Email</p>
                    <p className="text-textMain">{currentUser.email || 'N/A'}</p>
                  </div>
                </div>

                <div className="flex items-start space-x-3">
                  <User className="w-5 h-5 text-textSecondary mt-1" />
                  <div>
                    <p className="text-sm font-medium text-textSecondary">Display Name</p>
                    <p className="text-textMain">
                      {userProfile.displayName || userProfile.name || 'N/A'}
                    </p>
                  </div>
                </div>

                <div className="flex items-start space-x-3">
                  <Phone className="w-5 h-5 text-textSecondary mt-1" />
                  <div>
                    <p className="text-sm font-medium text-textSecondary">Phone</p>
                    <p className="text-textMain">{userProfile.phone || 'Not set'}</p>
                  </div>
                </div>

                <div className="flex items-start space-x-3">
                  <Shield className="w-5 h-5 text-textSecondary mt-1" />
                  <div>
                    <p className="text-sm font-medium text-textSecondary">Role</p>
                    <p className="text-textMain">{getRoleDisplayName(userProfile.role)}</p>
                  </div>
                </div>

                <div className="flex items-start space-x-3">
                  <Calendar className="w-5 h-5 text-textSecondary mt-1" />
                  <div>
                    <p className="text-sm font-medium text-textSecondary">Join Date</p>
                    <p className="text-textMain">
                      {formatDate(userProfile.createdAt || userProfile.joinedAt)}
                    </p>
                  </div>
                </div>

                <div className="flex items-start space-x-3">
                  <Calendar className="w-5 h-5 text-textSecondary mt-1" />
                  <div>
                    <p className="text-sm font-medium text-textSecondary">Last Login</p>
                    <p className="text-textMain">
                      {formatDate(userProfile.lastLogin || userProfile.updatedAt)}
                    </p>
                  </div>
                </div>
              </div>

              {userProfile.role === 'constructor' ||
              userProfile.role === 'renovator' ||
              userProfile.role === 'provider' ? (
                <div className="mt-6 p-4 bg-primary/10 border border-primary/20 rounded-base">
                  <div className="flex items-center space-x-2">
                    <Shield className="w-5 h-5 text-primary" />
                    <p className="font-medium text-textMain">Provider Status</p>
                  </div>
                  <p className="text-sm text-textSecondary mt-2">
                    You are registered as a service provider. You can manage your services from the
                    provider dashboard.
                  </p>
                </div>
              ) : null}

              {userProfile.addresses && userProfile.addresses.length > 0 && (
                <div className="mt-6">
                  <div className="flex items-start space-x-3">
                    <MapPin className="w-5 h-5 text-textSecondary mt-1" />
                    <div>
                      <p className="text-sm font-medium text-textSecondary mb-2">Addresses</p>
                      {userProfile.addresses.map((addr, index) => (
                        <div key={index} className="mb-2 p-3 bg-background rounded-base">
                          <p className="text-textMain">{addr.fullAddress}</p>
                          {addr.isDefault && (
                            <span className="text-xs text-primary mt-1 inline-block">
                              Default
                            </span>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Profile;

