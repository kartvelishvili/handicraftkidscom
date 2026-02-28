import React, { createContext, useContext, useState, useEffect } from 'react';
import { useToast } from '@/components/ui/use-toast';
import { safeStorage } from '@/utils/safeStorage';

const SimplePasswordAuthContext = createContext();

export const useSimplePasswordAuth = () => useContext(SimplePasswordAuthContext);

// Admin credentials - username and password
const ADMIN_CREDENTIALS = {
  username: 'admin',
  password: 'admin123',
};

export const SimplePasswordAuthProvider = ({ children }) => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [adminUser, setAdminUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    // Check for existing session
    const token = safeStorage.getItem('simple_admin_token');
    const savedUser = safeStorage.getItem('simple_admin_user');
    if (token === 'valid_session' && savedUser) {
      setIsAuthenticated(true);
      setAdminUser(savedUser);
    }
    setLoading(false);
  }, []);

  const login = (username, password) => {
    // Support legacy single-password calls for backward compatibility
    if (password === undefined) {
      password = username;
      username = ADMIN_CREDENTIALS.username;
    }

    if (username === ADMIN_CREDENTIALS.username && password === ADMIN_CREDENTIALS.password) {
      safeStorage.setItem('simple_admin_token', 'valid_session');
      safeStorage.setItem('simple_admin_user', username);
      setIsAuthenticated(true);
      setAdminUser(username);
      toast({
        title: "ავტორიზაცია წარმატებულია",
        description: `მოგესალმებით, ${username}!`,
        className: "bg-[#57c5cf] text-white"
      });
      return true;
    } else {
      toast({
        variant: "destructive",
        title: "შეცდომა",
        description: "მომხმარებლის სახელი ან პაროლი არასწორია"
      });
      return false;
    }
  };

  const logout = () => {
    safeStorage.removeItem('simple_admin_token');
    safeStorage.removeItem('simple_admin_user');
    setIsAuthenticated(false);
    setAdminUser(null);
    toast({
      title: "სისტემიდან გასვლა",
      description: "თქვენ წარმატებით გამოხვედით სისტემიდან",
    });
  };

  return (
    <SimplePasswordAuthContext.Provider value={{ 
      isAuthenticated, 
      adminUser,
      loading, 
      login, 
      logout 
    }}>
      {children}
    </SimplePasswordAuthContext.Provider>
  );
};