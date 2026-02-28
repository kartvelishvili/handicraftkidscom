import React from 'react';
import { BrowserRouter as Router, Routes, Route, useLocation, Navigate } from 'react-router-dom';
import { Helmet } from 'react-helmet';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import Home from '@/pages/Home';
import ProductDetail from '@/pages/ProductDetail';
import CategoryPage from '@/pages/CategoryPage';
import Contact from '@/pages/Contact';
import Cart from '@/pages/Cart';
import Checkout from '@/pages/Checkout';
import SearchResults from '@/pages/SearchResults';
import GenericPage from '@/pages/GenericPage';
import AboutUs from '@/pages/AboutUs';
import UserProfile from '@/pages/UserProfile';
import PaymentFlittResponse from '@/pages/PaymentFlittResponse';
import DotsPage from '@/pages/DotsPage';

// Admin Imports
import AdminLoginPage from '@/pages/AdminLoginPage';
import AdminDashboard from '@/pages/AdminDashboard';
import AdminSettings from '@/pages/AdminSettings';
import AdminProducts from '@/pages/AdminProducts';
import AdminProductEdit from '@/pages/AdminProductEdit';
import AdminProductMigration from '@/pages/AdminProductMigration';
import AdminCategories from '@/pages/AdminCategories';
import AdminCategoryAttributes from '@/pages/AdminCategoryAttributes'; // Added
import AdminHero from '@/pages/AdminHero';
import AdminCollections from '@/pages/AdminCollections';
import AdminFooter from '@/pages/AdminFooter';
import AdminNewsletter from '@/pages/AdminNewsletter';
import AdminSections from '@/pages/AdminSections';
import AdminPages from '@/pages/AdminPages';
import AdminFlittSettings from '@/pages/AdminFlittSettings';
import AdminSMS from '@/pages/AdminSMS';
import AdminOrders from '@/pages/AdminOrders';
import AdminImport from '@/pages/AdminImport';
import AdminNotificationSettings from '@/pages/AdminNotificationSettings';
import AdminNotificationHistory from '@/pages/AdminNotificationHistory';
import AdminSmsSettings from '@/pages/AdminSmsSettings';
import AdminLayout from '@/components/AdminLayout';
import AdminErrorBoundary from '@/components/AdminErrorBoundary';
import ProtectedAdminRoute from '@/components/ProtectedAdminRoute';
import ErrorBoundary from '@/components/ErrorBoundary';

import { CartProvider } from '@/context/CartContext';
import { LanguageProvider } from '@/context/LanguageContext';
import { SimplePasswordAuthProvider } from '@/context/SimplePasswordAuthContext';

const LayoutWrapper = ({ children }) => {
  const location = useLocation();
  const isAdmin = location.pathname.startsWith('/admin') || location.pathname === '/paneli' || location.pathname === '/admin-login';
  
  return (
    <>
      {!isAdmin && <Header />}
      <main className={`flex-grow ${isAdmin ? 'bg-gray-50' : ''}`}>
        {children}
      </main>
      {!isAdmin && <Footer />}
    </>
  );
};

function App() {
  return (
    <ErrorBoundary>
    <LanguageProvider>
      <SimplePasswordAuthProvider>
        <CartProvider>
          <Router>
            <div className="min-h-screen bg-white flex flex-col">
              <Helmet>
                <title>Handicraft - პრემიუმ ხელნაკეთი ნივთები</title>
              </Helmet>
              
              <LayoutWrapper>
                <ErrorBoundary>
                <Routes>
                  {/* Public Routes */}
                  <Route path="/" element={<Home />} />
                  <Route path="/product/:id" element={<ProductDetail />} />
                  <Route path="/category/:categoryName" element={<CategoryPage />} />
                  <Route path="/cart" element={<Cart />} />
                  <Route path="/checkout" element={<Checkout />} />
                  <Route path="/search" element={<SearchResults />} />
                  <Route path="/dot" element={<DotsPage />} />
                  
                  {/* User Profile & Payment */}
                  <Route path="/profile" element={<UserProfile />} />
                  <Route path="/payment/flitt/response" element={<PaymentFlittResponse />} />
                  
                  {/* Dynamic Pages */}
                  <Route path="/about" element={<AboutUs />} />
                  <Route path="/contact" element={<Contact />} />
                  <Route path="/privacy" element={<GenericPage slug="privacy" />} />
                  <Route path="/terms" element={<GenericPage slug="terms" />} />
                  <Route path="/faq" element={<GenericPage slug="faq" />} />

                  {/* Admin Auth Routes */}
                  <Route path="/paneli" element={<Navigate to="/admin-login" replace />} />
                  <Route path="/admin-login" element={<AdminLoginPage />} />
                  {/* Kept for backward compatibility but redirecting */}
                  <Route path="/admin/login" element={<Navigate to="/admin-login" replace />} />

                  {/* Protected Admin Routes */}
                  <Route path="/admin" element={
                    <ProtectedAdminRoute>
                      <AdminErrorBoundary>
                        <AdminLayout />
                      </AdminErrorBoundary>
                    </ProtectedAdminRoute>
                  }>
                    <Route index element={<Navigate to="/admin/dashboard" replace />} />
                    <Route path="dashboard" element={<AdminDashboard />} />
                    <Route path="orders" element={<AdminOrders />} />
                    <Route path="sections" element={<AdminSections />} />
                    <Route path="settings" element={<AdminSettings />} />
                    <Route path="products" element={<AdminProducts />} />
                    <Route path="products/new" element={<AdminProductEdit />} />
                    <Route path="products/:id" element={<AdminProductEdit />} />
                    <Route path="import" element={<AdminImport />} />
                    <Route path="migration" element={<AdminProductMigration />} />
                    <Route path="categories" element={<AdminCategories />} />
                    <Route path="category-attributes" element={<AdminCategoryAttributes />} />
                    <Route path="hero" element={<AdminHero />} />
                    <Route path="collections" element={<AdminCollections />} />
                    <Route path="footer" element={<AdminFooter />} />
                    <Route path="pages" element={<AdminPages />} />
                    <Route path="newsletter" element={<AdminNewsletter />} />
                    <Route path="sms" element={<AdminSMS />} />
                    <Route path="sms-settings" element={<AdminSmsSettings />} />
                    <Route path="flitt-settings" element={<AdminFlittSettings />} />
                    <Route path="notifications-settings" element={<AdminNotificationSettings />} />
                    <Route path="notifications" element={<AdminNotificationHistory />} />
                  </Route>
                </Routes>
                </ErrorBoundary>
              </LayoutWrapper>
              
            </div>
          </Router>
        </CartProvider>
      </SimplePasswordAuthProvider>
    </LanguageProvider>
    </ErrorBoundary>
  );
}

export default App;