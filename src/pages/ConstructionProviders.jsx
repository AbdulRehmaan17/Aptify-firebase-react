import React from 'react';
import ProvidersList from '../components/providers/ProvidersList';

/**
 * ConstructionProviders - Wrapper page for construction providers
 * Uses the reusable ProvidersList component with type="construction"
 */
const ConstructionProviders = () => {
  return (
    <ProvidersList
      type="construction"
      title="Construction Providers"
      description="Browse verified construction professionals for your project"
    />
  );
};

export default ConstructionProviders;
