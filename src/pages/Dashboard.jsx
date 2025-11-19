import React from 'react';
import { useAuth } from '../context/AuthContext';
import { Link } from 'react-router-dom';
import LoadingSpinner from '../components/common/LoadingSpinner';

const Dashboard = () => {
  const { user, userProfile, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-8">Dashboard</h1>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <Link
            to="/post-property"
            className="bg-white p-6 rounded-lg shadow-md hover:shadow-lg transition-shadow"
          >
            <h2 className="text-xl font-semibold mb-2">Post Property</h2>
            <p className="text-gray-600">List a new property for sale or rent</p>
          </Link>

          <Link
            to="/construction-dashboard"
            className="bg-white p-6 rounded-lg shadow-md hover:shadow-lg transition-shadow"
          >
            <h2 className="text-xl font-semibold mb-2">Construction Projects</h2>
            <p className="text-gray-600">View your construction projects</p>
          </Link>

          <Link
            to="/renovation-dashboard"
            className="bg-white p-6 rounded-lg shadow-md hover:shadow-lg transition-shadow"
          >
            <h2 className="text-xl font-semibold mb-2">Renovation Projects</h2>
            <p className="text-gray-600">View your renovation projects</p>
          </Link>

          <Link
            to="/account"
            className="bg-white p-6 rounded-lg shadow-md hover:shadow-lg transition-shadow"
          >
            <h2 className="text-xl font-semibold mb-2">My Account</h2>
            <p className="text-gray-600">Manage your account settings</p>
          </Link>

          {userProfile?.role === 'admin' && (
            <Link
              to="/admin"
              className="bg-white p-6 rounded-lg shadow-md hover:shadow-lg transition-shadow"
            >
              <h2 className="text-xl font-semibold mb-2">Admin Panel</h2>
              <p className="text-gray-600">Administrative controls</p>
            </Link>
          )}
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
