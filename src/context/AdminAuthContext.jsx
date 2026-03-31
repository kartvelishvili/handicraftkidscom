// DEPRECATED - This file has been replaced by SimplePasswordAuthContext.jsx
// Keeping file to prevent import errors in untracked files, but it should not be used.

import React, { createContext, useContext } from 'react';
import { useSimplePasswordAuth } from './SimplePasswordAuthContext';

const AdminAuthContext = createContext();

export const useAdminAuth = () => {
  // Redirect to new hook if this old hook is still called
  return useSimplePasswordAuth();
};

export const AdminAuthProvider = ({ children }) => {
  console.warn('AdminAuthProvider is deprecated. Use SimplePasswordAuthProvider instead.');
  return <>{children}</>;
};