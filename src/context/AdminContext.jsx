import React, { createContext, useContext, useState, useEffect } from 'react';
import { supabase } from '@/lib/customSupabaseClient';

const AdminContext = createContext();

export const useAdmin = () => useContext(AdminContext);

export const AdminProvider = ({ children }) => {
  const [adminUser, setAdminUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Check for existing session from Supabase Auth
    const initializeAdmin = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        
        if (session?.user) {
          // Verify if the authenticated user is an admin
          const { data: adminData } = await supabase
            .from('admin_users')
            .select('*')
            .eq('email', session.user.email)
            .single();
            
          if (adminData) {
            setAdminUser({ ...adminData, auth_id: session.user.id });
          }
        }
      } catch (error) {
        console.error("Admin initialization error:", error);
      } finally {
        setLoading(false);
      }
    };

    initializeAdmin();

    // Listen for auth state changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === 'SIGNED_IN' && session?.user) {
        const { data: adminData } = await supabase
          .from('admin_users')
          .select('*')
          .eq('email', session.user.email)
          .single();
          
        if (adminData) {
          setAdminUser({ ...adminData, auth_id: session.user.id });
        }
      } else if (event === 'SIGNED_OUT') {
        setAdminUser(null);
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const login = async ({ email, password }) => {
    try {
      if (!email || !password) {
        throw new Error('Email and password are required');
      }

      const cleanEmail = email.trim();

      // 1. Authenticate with Supabase Auth to get valid JWT
      // Explicitly mapping fields to ensure correct parameter names for Supabase
      const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
        email: cleanEmail,
        password: password,
      });

      if (authError) throw authError;

      // 2. Verify against admin_users table
      const { data: adminData, error: adminError } = await supabase
        .from('admin_users')
        .select('*')
        .eq('email', cleanEmail)
        .single();

      if (adminError || !adminData) {
        // Valid login but not an admin
        await supabase.auth.signOut();
        throw new Error('Not authorized as admin');
      }

      setAdminUser({ ...adminData, auth_id: authData.user.id });
      return { success: true };
    } catch (error) {
      console.error("Login failed:", error);
      return { success: false, error: error.message };
    }
  };

  const logout = async () => {
    await supabase.auth.signOut();
    setAdminUser(null);
  };

  return (
    <AdminContext.Provider value={{ adminUser, login, logout, loading, isAuthenticated: !!adminUser }}>
      {children}
    </AdminContext.Provider>
  );
};