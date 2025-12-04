import React from 'react';
import {
  LayoutDashboard,
  Home,
  Calendar,
  ShoppingCart,
  Wrench,
  Hammer,
  BookOpen,
  Heart,
  Star,
  Bell,
  User,
  Settings,
} from 'lucide-react';

const Sidebar = ({ activeSection, onSectionChange }) => {
  const menuItems = [
    { key: 'overview', label: 'Overview', icon: LayoutDashboard },
    { key: 'properties', label: 'My Properties', icon: Home },
    { key: 'rental-listings', label: 'Rental Listings', icon: Home },
    { key: 'rental-requests', label: 'My Rental Requests', icon: Calendar },
    { key: 'buy-sell-requests', label: 'Buy/Sell Requests', icon: ShoppingCart },
    { key: 'renovation', label: 'Renovation', icon: Wrench },
    { key: 'construction', label: 'Construction', icon: Hammer },
    { key: 'bookings', label: 'My Bookings', icon: BookOpen },
    { key: 'favorites', label: 'My Favorites', icon: Heart },
    { key: 'reviews', label: 'My Reviews', icon: Star },
    { key: 'notifications', label: 'Notifications', icon: Bell },
    { key: 'profile', label: 'Profile Details', icon: User },
    { key: 'settings', label: 'Settings', icon: Settings },
  ];

  return (
    <div className="w-64 bg-surface border-r border-muted h-screen fixed left-0 top-0 overflow-y-auto">
      <div className="p-6">
        <h2 className="text-xl font-bold text-textMain mb-6">Dashboard</h2>
        <nav className="space-y-1">
          {menuItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeSection === item.key;
            return (
              <button
                key={item.key}
                onClick={() => onSectionChange(item.key)}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
                  isActive
                    ? 'bg-primary text-white'
                    : 'text-textSecondary hover:bg-background hover:text-textMain'
                }`}
              >
                <Icon className="w-5 h-5" />
                <span className="font-medium">{item.label}</span>
              </button>
            );
          })}
        </nav>
      </div>
    </div>
  );
};

export default Sidebar;

