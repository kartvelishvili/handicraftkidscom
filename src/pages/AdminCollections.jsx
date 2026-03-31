import React from 'react';
import { Helmet } from 'react-helmet';

const AdminCollections = () => {
  return (
    <div>
      <Helmet>
        <title>ადმინ პანელი - კოლექციები</title>
      </Helmet>
      <h1 className="text-3xl font-heading font-bold text-gray-800 mb-4">კოლექციების მართვა</h1>
      <p className="text-gray-500">აქ შეძლებთ პოპულარული კოლექციების სექციის რედაქტირებას.</p>
    </div>
  );
};
export default AdminCollections;