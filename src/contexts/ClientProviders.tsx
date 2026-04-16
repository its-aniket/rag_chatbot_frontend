'use client';

import React from 'react';
import { AuthProvider } from './AuthProvider';

// Composes all client-side providers.
// WebSocketProvider can be added here when real-time features are implemented.
export const ClientProviders: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  return <AuthProvider>{children}</AuthProvider>;
};
