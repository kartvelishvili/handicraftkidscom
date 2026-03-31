import { useAdminAuth } from '@/context/AdminAuthContext';

export const useAuth = () => {
  return useAdminAuth();
};

export default useAuth;