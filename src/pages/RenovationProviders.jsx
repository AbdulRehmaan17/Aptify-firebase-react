import React from 'react';
import ProvidersList from '../components/providers/ProvidersList';

/**
 * RenovationProviders - Wrapper page for renovation providers
 * Uses the reusable ProvidersList component with type="renovation"
 */
const RenovationProviders = () => {
  return (
    <ProvidersList
      type="renovation"
      title="Renovation Providers"
      description="Browse verified renovation professionals for your project"
    />
  );
};

export default RenovationProviders;
