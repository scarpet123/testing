import { createContext, useState, useContext, useEffect } from 'react';
import axios from 'axios';

const AuthContext = createContext();

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [currentUser, setCurrentUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    axios.defaults.baseURL = 'http://localhost:5000';
    
    const token = localStorage.getItem('token');
    if (token) {
      axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
      fetchCurrentUser();
    } else {
      setLoading(false);
    }
  }, []);

  const fetchCurrentUser = async () => {
    try {
      console.log('🔄 Fetching current user...');
      const response = await axios.get('/api/auth/me');
      if (response.data.success) {
        const user = response.data.user;
        const firstLogin = localStorage.getItem(`user_${user._id}_first_login`) === null;
        if (firstLogin) {
          localStorage.setItem(`user_${user._id}_first_login`, 'false');
        }
        setCurrentUser({ ...user, firstLogin });
        console.log('✅ User fetched successfully:', user.email);
      }
    } catch (error) {
      console.error('❌ Error fetching current user:', error.response?.data?.message || error.message);
      localStorage.removeItem('token');
      delete axios.defaults.headers.common['Authorization'];
    } finally {
      setLoading(false);
    }
  };

  const login = async (email, password) => {
    try {
      console.log('🔄 Attempting login...');
      const response = await axios.post('/api/auth/login', {
        email,
        password
      });
      
      if (response.data.success) {
        const { token, user } = response.data;
        localStorage.setItem('token', token);
        axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
        
        const firstLogin = localStorage.getItem(`user_${user._id}_first_login`) === null;
        if (firstLogin) {
          localStorage.setItem(`user_${user._id}_first_login`, 'false');
        }
        
        setCurrentUser({ ...user, firstLogin });
        console.log('✅ Login successful:', user.email);
        return { success: true, user };
      } else {
        return { 
          success: false, 
          message: response.data.message || 'Login failed' 
        };
      }
    } catch (error) {
      console.error('❌ Login error:', error.response?.data?.message || error.message);
      const errorMessage = error.response?.data?.message || 
                          error.message || 
                          'Unable to connect to server. Please try again.';
      return { 
        success: false, 
        message: errorMessage 
      };
    }
  };

  const register = async (userData) => {
    try {
      console.log('🔄 Attempting registration...', userData);
      const response = await axios.post('/api/auth/register', userData);
      
      if (response.data.success) {
        const { token, user } = response.data;
        localStorage.setItem('token', token);
        axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
        
        localStorage.setItem(`user_${user._id}_first_login`, 'true');
        
        setCurrentUser({ ...user, firstLogin: true });
        console.log('✅ Registration successful:', user.email);
        return { success: true, user };
      } else {
        return { 
          success: false, 
          message: response.data.message || 'Registration failed' 
        };
      }
    } catch (error) {
      console.error('❌ Registration error:', error.response?.data?.message || error.message);
      const errorMessage = error.response?.data?.message || 
                          error.message || 
                          'Unable to connect to server. Please try again.';
      return { 
        success: false, 
        message: errorMessage 
      };
    }
  };

  const logout = () => {
    console.log('👋 Logging out user...');
    localStorage.removeItem('token');
    delete axios.defaults.headers.common['Authorization'];
    setCurrentUser(null);
  };

  const value = {
    currentUser,
    login,
    register,
    logout,
    loading
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};