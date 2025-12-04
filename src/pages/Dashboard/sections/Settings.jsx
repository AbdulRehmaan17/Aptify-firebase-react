import React from 'react';
import { Settings as SettingsIcon } from 'lucide-react';

const Settings = ({ user, userProfile }) => {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-display font-bold text-textMain">Settings</h1>
        <p className="text-textSecondary mt-2">Manage your account settings and preferences</p>
      </div>

      <div className="bg-surface rounded-lg shadow-md p-12 text-center border border-muted">
        <SettingsIcon className="w-16 h-16 text-muted mx-auto mb-4" />
        <h3 className="text-lg font-medium text-textMain mb-2">Settings Coming Soon</h3>
        <p className="text-textSecondary">This section will be available in a future update</p>
      </div>
    </div>
  );
};

export default Settings;


