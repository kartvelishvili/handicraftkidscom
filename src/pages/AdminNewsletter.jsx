import React from 'react';
import { Helmet } from 'react-helmet';
import { Download } from 'lucide-react';
import { Button } from '@/components/ui/button';

const AdminNewsletter = () => {
  return (
    <div>
      <Helmet>
        <title>ადმინ პანელი - მეილები</title>
      </Helmet>
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-heading font-bold text-gray-800">გამოწერილი მეილები</h1>
        <Button variant="outline" className="gap-2">
          <Download className="w-4 h-4" /> CSV ექსპორტი
        </Button>
      </div>
      <div className="bg-white rounded-3xl shadow-sm border border-gray-100 p-8 text-center text-gray-500">
        მეილების სია ცარიელია
      </div>
    </div>
  );
};
export default AdminNewsletter;