import React, { useEffect, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { User, LogOut, Save, Edit2, Building2, CheckCircle, Wrench } from 'lucide-react';
import { motion } from 'framer-motion';
import { useAuth } from '../context/AuthContext';
import userService from '../services/userService';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { db, auth } from '../firebase';
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
    const [isRegisteredAsConstructor, setIsRegisteredAsConstructor] = useState(false);
    const [checkingConstructorStatus, setCheckingConstructorStatus] = useState(true);
    const [isRegisteredAsRenovator, setIsRegisteredAsRenovator] = useState(false);
    const [checkingRenovatorStatus, setCheckingRenovatorStatus] = useState(true);

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

    /**
     * Check if user is already registered as a construction service provider
     * Queries Firestore "serviceProviders" collection where userId == currentUser.uid and serviceType == "Construction"
     */
    useEffect(() => {
        const checkConstructorRegistration = async () => {
            if (authLoading || !user) {
                setCheckingConstructorStatus(false);
                return;
            }

            try {
                setCheckingConstructorStatus(true);
                const currentUser = auth.currentUser || user;

                if (!currentUser || !currentUser.uid) {
                    setIsRegisteredAsConstructor(false);
                    setCheckingConstructorStatus(false);
                    return;
                }

                console.log('Checking constructor registration for user:', currentUser.uid);

                // Query serviceProviders collection filtered by userId and serviceType
                const providersQuery = query(
                    collection(db, 'serviceProviders'),
                    where('userId', '==', currentUser.uid),
                    where('serviceType', '==', 'Construction')
                );

                const snapshot = await getDocs(providersQuery);

                // If document exists, user is already registered
                if (!snapshot.empty) {
                    setIsRegisteredAsConstructor(true);
                    console.log('User is already registered as constructor');
                } else {
                    setIsRegisteredAsConstructor(false);
                    console.log('User is not registered as constructor');
                }
            } catch (error) {
                console.error('Error checking constructor registration:', error);
                // Don't show error toast, just assume not registered
                setIsRegisteredAsConstructor(false);
            } finally {
                setCheckingConstructorStatus(false);
            }
        };

        checkConstructorRegistration();
    }, [authLoading, user]);

    /**
     * Check if user is already registered as a renovation service provider
     * Queries Firestore "serviceProviders" collection where userId == currentUser.uid and serviceType == "Renovation"
     */
    useEffect(() => {
        const checkRenovatorRegistration = async () => {
            if (authLoading || !user) {
                setCheckingRenovatorStatus(false);
                return;
            }

            try {
                setCheckingRenovatorStatus(true);
                const currentUser = auth.currentUser || user;

                if (!currentUser || !currentUser.uid) {
                    setIsRegisteredAsRenovator(false);
                    setCheckingRenovatorStatus(false);
                    return;
                }

                console.log('Checking renovator registration for user:', currentUser.uid);

                // Query serviceProviders collection filtered by userId and serviceType == "Renovation"
                const providersQuery = query(
                    collection(db, 'serviceProviders'),
                    where('userId', '==', currentUser.uid),
                    where('serviceType', '==', 'Renovation')
                );

                const snapshot = await getDocs(providersQuery);

                // If document exists, user is already registered
                if (!snapshot.empty) {
                    setIsRegisteredAsRenovator(true);
                    console.log('User is already registered as renovator');
                } else {
                    setIsRegisteredAsRenovator(false);
                    console.log('User is not registered as renovator');
                }
            } catch (error) {
                console.error('Error checking renovator registration:', error);
                // Don't show error toast, just assume not registered
                setIsRegisteredAsRenovator(false);
            } finally {
                setCheckingRenovatorStatus(false);
            }
        };

        checkRenovatorRegistration();
    }, [authLoading, user]);

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

                {/* Provider Options Section */}
                <motion.div
                    className="mt-8 bg-white rounded-xl shadow-xl p-6"
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.8, delay: 0.6 }}
                >
                    <h2 className="text-2xl font-display font-bold text-charcoal mb-6 flex items-center">
                        <Building2 className="w-6 h-6 mr-2 text-luxury-gold" />
                        🏗️ Provider Options
                    </h2>

                    {checkingConstructorStatus ? (
                        <div className="flex items-center justify-center py-8">
                            <LoadingSpinner size="md" />
                            <span className="ml-3 text-gray-600 font-inter">Checking registration status...</span>
                        </div>
                    ) : isRegisteredAsConstructor ? (
                        // User is already registered as constructor
                        <div className="text-center py-6">
                            <div className="flex items-center justify-center mb-4">
                                <CheckCircle className="w-12 h-12 text-green-500" />
                            </div>
                            <p className="text-lg font-inter text-gray-700 mb-2">
                                ✅ You are already registered as a Construction Service Provider.
                            </p>
                            <p className="text-sm font-inter text-gray-500">
                                You can manage your provider profile and view assigned projects.
                            </p>
                            <div className="mt-6 flex justify-center gap-4">
                                <Link to="/provider-construction">
                                    <Button
                                        variant="primary"
                                        className="bg-luxury-gold text-charcoal hover:bg-yellow-500 font-inter"
                                    >
                                        View Provider Panel
                                    </Button>
                                </Link>
                                <Link to="/construction-list">
                                    <Button
                                        variant="outline"
                                        className="text-charcoal border-luxury-gold hover:bg-luxury-gold hover:text-charcoal font-inter"
                                    >
                                        View All Providers
                                    </Button>
                                </Link>
                            </div>
                        </div>
                    ) : (
                        // User is not registered as constructor
                        <div className="text-center py-6">
                            <p className="text-lg font-inter text-gray-700 mb-6">
                                Want to offer your services as a constructor?
                            </p>
                            <p className="text-sm font-inter text-gray-500 mb-6">
                                Register as a Construction Service Provider to start receiving project requests from property owners.
                            </p>
                            <Link to="/register-constructor">
                                <Button
                                    variant="primary"
                                    className="bg-luxury-gold text-charcoal hover:bg-yellow-500 font-inter px-8 py-3"
                                >
                                    <Building2 className="w-5 h-5 mr-2" />
                                    Register as Constructor
                                </Button>
                            </Link>
                        </div>
                    )}
                </motion.div>

                {/* Renovation Provider Options Section */}
                <motion.div
                    className="mt-8 bg-white rounded-xl shadow-xl p-6"
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.8, delay: 0.8 }}
                >
                    <h2 className="text-2xl font-display font-bold text-charcoal mb-6 flex items-center">
                        <Wrench className="w-6 h-6 mr-2 text-luxury-gold" />
                        🔧 Renovation Provider Options
                    </h2>

                    {checkingRenovatorStatus ? (
                        <div className="flex items-center justify-center py-8">
                            <LoadingSpinner size="md" />
                            <span className="ml-3 text-gray-600 font-inter">Checking registration status...</span>
                        </div>
                    ) : isRegisteredAsRenovator ? (
                        // User is already registered as renovator
                        <div className="text-center py-6">
                            <div className="flex items-center justify-center mb-4">
                                <CheckCircle className="w-12 h-12 text-green-500" />
                            </div>
                            <p className="text-lg font-inter text-gray-700 mb-2">
                                ✅ Registered as Renovation Provider
                            </p>
                            <p className="text-sm font-inter text-gray-500">
                                You can manage your provider profile and view assigned projects.
                            </p>
                            <div className="mt-6 flex justify-center gap-4">
                                <Link to="/provider-renovation">
                                    <Button
                                        variant="primary"
                                        className="bg-luxury-gold text-charcoal hover:bg-yellow-500 font-inter"
                                    >
                                        View Provider Panel
                                    </Button>
                                </Link>
                                <Link to="/renovation-list">
                                    <Button
                                        variant="outline"
                                        className="text-charcoal border-luxury-gold hover:bg-luxury-gold hover:text-charcoal font-inter"
                                    >
                                        View All Providers
                                    </Button>
                                </Link>
                            </div>
                        </div>
                    ) : (
                        // User is not registered as renovator
                        <div className="text-center py-6">
                            <p className="text-lg font-inter text-gray-700 mb-6">
                                Want to offer your services as a renovator?
                            </p>
                            <p className="text-sm font-inter text-gray-500 mb-6">
                                Register as a Renovation Service Provider to start receiving project requests from property owners.
                            </p>
                            <Link to="/register-renovator">
                                <Button
                                    variant="primary"
                                    className="bg-luxury-gold text-charcoal hover:bg-yellow-500 font-inter px-8 py-3"
                                >
                                    <Wrench className="w-5 h-5 mr-2" />
                                    Register as Renovator
                                </Button>
                            </Link>
                        </div>
                    )}
                </motion.div>
            </motion.div>
        </div>
    );
};

export default MyAccount;