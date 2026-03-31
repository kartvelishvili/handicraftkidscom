import React from 'react';
import { Navigate } from 'react-router-dom';

// Redirect old component route to new consolidated AdminPages
const AdminFooterPages = () => {
  return <Navigate to="/admin/pages" replace />;
};

export default AdminFooterPages;