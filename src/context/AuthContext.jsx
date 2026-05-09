
import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import supabase from '../SupabaseClient';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [role, setRole] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkUser = async () => {
      const storedUser = localStorage.getItem('user-name');
      const storedRole = localStorage.getItem('role');
      
      if (storedUser) {
        setUser(storedUser);
        setRole(storedRole);
      }
      setLoading(false);
    };

    checkUser();
  }, []);

  const login = useCallback(async (userData, userRole) => {
    localStorage.setItem('user-name', userData.user_name);
    localStorage.setItem('role', userRole);
    localStorage.setItem('email_id', userData.email_id);
    localStorage.setItem('user-id', userData.id);
    setUser(userData.user_name);
    setRole(userRole);
  }, []);

  const logout = useCallback(() => {
    localStorage.clear();
    setUser(null);
    setRole(null);
    window.location.href = '/login';
  }, []);

  return (
    <AuthContext.Provider value={{ user, role, loading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
