import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { User, LogOut, Save, Edit2 } from 'lucide-react';
import { motion } from 'framer-motion';
import { useAuth } from '../context/AuthContext';
import userService from '../services/userService';
import toast from 'react-hot-toast';
import LoadingSpinner from '../components/common/LoadingSpinner';
import Button from '../components/common/Button';

const MyAccount = () => {
    const navigate = useNavigate();
    const { user, loading: authLoading, logout } = useAuth();
    const [profile, setProfile] = useState({
        displayName: '',
        email: '',
        phone: '',
        address: '',
    });
    const [isEditing, setIsEditing] = useState(false);
    const [loading, setLoading] = useState(true);
    const [errors, setErrors] = useState({});

    useEffect(() => {
        if (!authLoading) {
            if (!user) {
                toast.error('Please log in to view your account.');
                navigate('/login');
                return;
            }

            const fetchProfile = async () => {
                try {
                    const userProfile = await userService.getProfile(user.uid);
                    console.log('Profile fetched:', userProfile); // Debug log
                    setProfile({
                        displayName: userProfile.displayName || userProfile.name || '',
                        email: userProfile.email || user.email,
                        phone: userProfile.phone || userProfile.phoneNumber || '',
                        address: typeof userProfile.address === 'string' 
                            ? userProfile.address 
                            : userProfile.address?.line1 || '',
                    });
                } catch (error) {
                    console.error('Error fetching profile:', error);
                    toast.error('Failed to load profile.');
                } finally {
                    setLoading(false);
                }
            };

            fetchProfile();
        }
    }, [authLoading, user, navigate]);

    const validateForm = () => {
        const newErrors = {};
        if (!profile.displayName.trim()) {
            newErrors.displayName = 'Name is required';
        }
        if (profile.phone && !/^\+?[\d\s-]{10,15}$/.test(profile.phone)) {
            newErrors.phone = 'Invalid phone number';
        }
        if (!profile.address.trim()) {
            newErrors.address = 'Address is required';
        }
        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setProfile((prev) => ({ ...prev, [name]: value }));
        setErrors((prev) => ({ ...prev, [name]: '' }));
    };

    const handleSave = async () => {
        if (!validateForm()) {
            toast.error('Please fix the errors in the form.');
            return;
        }

        try {
            await userService.updateProfile(user.uid, {
                displayName: profile.displayName,
                phone: profile.phone,
                address: profile.address,
            });
            toast.success('Profile updated successfully!');
            setIsEditing(false);
        } catch (error) {
            console.error('Error updating profile:', error);
            toast.error(error.message || 'Failed to update profile.');
        }
    };

    const handleLogout = async () => {
        try {
            await logout();
            toast.success('Logged out successfully.');
            navigate('/login');
        } catch (error) {
            console.error('Error logging out:', error);
            toast.error('Failed to log out.');
        }
    };

    if (authLoading || loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-ivory">
                <LoadingSpinner size="lg" />
            </div>
        );
    }

    return (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 bg-ivory min-h-screen">
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.8 }}
            >
                <h1 className="text-4xl sm:text-5xl font-display font-bold text-charcoal mb-8 text-center">
                    My Account
                </h1>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    {/* Profile Card */}
                    <motion.div
                        className="lg:col-span-2 bg-white rounded-xl shadow-xl p-6"
                        initial={{ opacity: 0, x: -50 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ duration: 0.8, delay: 0.2 }}
                    >
                        <div className="flex items-center justify-between mb-6">
                            <h2 className="text-2xl font-display font-bold text-charcoal flex items-center">
                                <User className="w-6 h-6 mr-2 text-luxury-gold" />
                                Profile Details
                            </h2>
                            <Button
                                variant="outline"
                                className="text-charcoal border-luxury-gold hover:bg-luxury-gold hover:text-charcoal font-inter"
                                onClick={() => setIsEditing(!isEditing)}
                            >
                                {isEditing ? 'Cancel' : 'Edit'} <Edit2 className="w-4 h-4 ml-2" />
                            </Button>
                        </div>

                        <div className="space-y-4">
                            {/* Display Name */}
                            <div>
                                <label htmlFor="displayName" className="block text-sm font-inter text-gray-600">
                                    Full Name
                                </label>
                                <input
                                    type="text"
                                    id="displayName"
                                    name="displayName"
                                    value={profile.displayName}
                                    onChange={handleInputChange}
                                    disabled={!isEditing}
                                    className={`w-full mt-1 p-2 border rounded-lg font-inter text-sm text-charcoal focus:ring-luxury-gold focus:border-luxury-gold ${errors.displayName ? 'border-red-500' : 'border-gray-300'
                                        } ${!isEditing ? 'bg-gray-100' : ''}`}
                                />
                                {errors.displayName && (
                                    <p className="text-red-500 text-xs mt-1 font-inter">{errors.displayName}</p>
                                )}
                            </div>

                            {/* Email (Read-only) */}
                            <div>
                                <label htmlFor="email" className="block text-sm font-inter text-gray-600">
                                    Email
                                </label>
                                <input
                                    type="email"
                                    id="email"
                                    name="email"
                                    value={profile.email}
                                    disabled
                                    className="w-full mt-1 p-2 border border-gray-300 rounded-lg font-inter text-sm text-charcoal bg-gray-100 cursor-not-allowed"
                                />
                            </div>

                            {/* Phone */}
                            <div>
                                <label htmlFor="phone" className="block text-sm font-inter text-gray-600">
                                    Phone Number
                                </label>
                                <input
                                    type="text"
                                    id="phone"
                                    name="phone"
                                    value={profile.phone}
                                    onChange={handleInputChange}
                                    disabled={!isEditing}
                                    className={`w-full mt-1 p-2 border rounded-lg font-inter text-sm text-charcoal focus:ring-luxury-gold focus:border-luxury-gold ${errors.phone ? 'border-red-500' : 'border-gray-300'
                                        } ${!isEditing ? 'bg-gray-100' : ''}`}
                                    placeholder="+1234567890"
                                />
                                {errors.phone && (
                                    <p className="text-red-500 text-xs mt-1 font-inter">{errors.phone}</p>
                                )}
                            </div>

                            {/* Address */}
                            <div>
                                <label htmlFor="address" className="block text-sm font-inter text-gray-600">
                                    Shipping Address
                                </label>
                                <textarea
                                    id="address"
                                    name="address"
                                    value={profile.address}
                                    onChange={handleInputChange}
                                    disabled={!isEditing}
                                    className={`w-full mt-1 p-2 border rounded-lg font-inter text-sm text-charcoal focus:ring-luxury-gold focus:border-luxury-gold ${errors.address ? 'border-red-500' : 'border-gray-300'
                                        } ${!isEditing ? 'bg-gray-100' : ''}`}
                                    rows="3"
                                    placeholder="123 Luxury Lane, Suite 100, City, Country"
                                />
                                {errors.address && (
                                    <p className="text-red-500 text-xs mt-1 font-inter">{errors.address}</p>
                                )}
                            </div>

                            {isEditing && (
                                <motion.div
                                    whileHover={{ scale: 1.05 }}
                                    whileTap={{ scale: 0.95 }}
                                    className="mt-6"
                                >
                                    <Button
                                        className="w-full bg-gradient-to-r from-luxury-gold to-yellow-600 text-charcoal hover:from-yellow-600 hover:to-luxury-gold transition-all duration-500 font-inter font-medium text-lg py-3 shadow-lg"
                                        onClick={handleSave}
                                    >
                                        Save Changes <Save className="w-5 h-5 ml-2" />
                                    </Button>
                                </motion.div>
                            )}
                        </div>
                    </motion.div>

                    {/* Sidebar Actions */}
                    <motion.div
                        className="lg:col-span-1 bg-white rounded-xl shadow-xl p-6 sticky top-24"
                        initial={{ opacity: 0, x: 50 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ duration: 0.8, delay: 0.4 }}
                    >
                        <h2 className="text-2xl font-display font-bold text-charcoal mb-6">
                            Account Actions
                        </h2>
                        <div className="space-y-4">
                            <Button
                                className="w-full bg-charcoal text-ivory hover:bg-luxury-gold hover:text-charcoal transition-colors duration-300 font-inter"
                                onClick={() => navigate('/order-history')}
                            >
                                View Order History
                            </Button>
                            <Button
                                variant="outline"
                                className="w-full text-charcoal border-luxury-gold hover:bg-luxury-gold hover:text-charcoal font-inter"
                                onClick={handleLogout}
                            >
                                Log Out <LogOut className="w-5 h-5 ml-2" />
                            </Button>
                        </div>
                    </motion.div>
                </div>
            </motion.div>
        </div>
    );
};

export default MyAccount;