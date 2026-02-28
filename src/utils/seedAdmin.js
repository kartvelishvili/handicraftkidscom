import { supabase } from '@/lib/customSupabaseClient';

/**
 * Helper function to seed the initial admin user.
 * Call this function from the browser console or a temporary UI button to create the user.
 * 
 * Usage:
 * import { seedInitialAdmin } from '@/utils/seedAdmin';
 * seedInitialAdmin();
 */
export const seedInitialAdmin = async () => {
  console.log('Attempting to create initial admin user...');
  
  try {
    const { data, error } = await supabase.functions.invoke('create-admin-user', {
      body: {
        email: "admin@smarketer.ge",
        password: "admin123",
        full_name: "Super Admin"
      }
    });

    if (error) {
      console.error('Error invoking function:', error);
      return { success: false, error };
    }

    if (!data.success) {
      console.error('Failed to create admin:', data.error);
      return { success: false, error: data.error };
    }

    console.log('SUCCESS: Admin user created!', data);
    return { success: true, user: data.user };
  } catch (err) {
    console.error('Unexpected error:', err);
    return { success: false, error: err.message };
  }
};