import React from 'react';
import Overview from '../sections/Overview';
import MyProperties from '../sections/MyProperties';
import RentalRequests from '../sections/RentalRequests';
import BuySellRequests from '../sections/BuySellRequests';
import Renovation from '../sections/Renovation';
import Construction from '../sections/Construction';
import MyBookings from '../sections/MyBookings';
import Favorites from '../sections/Favorites';
import MyReviews from '../sections/MyReviews';
import Notifications from '../sections/Notifications';
import ProfileDetails from '../sections/ProfileDetails';
import Settings from '../sections/Settings';

const MainContent = ({ activeSection, user, userProfile, onDataReload }) => {
  const renderContent = () => {
    switch (activeSection) {
      case 'overview':
        return <Overview user={user} userProfile={userProfile} />;
      case 'properties':
        return <MyProperties user={user} onDataReload={onDataReload} />;
      case 'rental-requests':
        return <RentalRequests user={user} onDataReload={onDataReload} />;
      case 'buy-sell-requests':
        return <BuySellRequests user={user} onDataReload={onDataReload} />;
      case 'renovation':
        return <Renovation user={user} onDataReload={onDataReload} />;
      case 'construction':
        return <Construction user={user} onDataReload={onDataReload} />;
      case 'bookings':
        return <MyBookings user={user} />;
      case 'favorites':
        return <Favorites user={user} onDataReload={onDataReload} />;
      case 'reviews':
        return <MyReviews user={user} />;
      case 'notifications':
        return <Notifications user={user} onDataReload={onDataReload} />;
      case 'profile':
        return <ProfileDetails user={user} userProfile={userProfile} onDataReload={onDataReload} />;
      case 'settings':
        return <Settings user={user} userProfile={userProfile} />;
      default:
        return <Overview user={user} userProfile={userProfile} />;
    }
  };

  return (
    <div className="flex-1 ml-64 p-8">
      <div className="max-w-7xl mx-auto">
        {renderContent()}
      </div>
    </div>
  );
};

export default MainContent;

