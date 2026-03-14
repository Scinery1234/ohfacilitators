import { createContext, useContext, useState, useEffect } from 'react';
import { login as apiLogin, register as apiRegister, getMe, updateProfile } from '@/api/auth';
import { isDemoToken, getDemoUserFromToken, DEMO_USERS } from '@/mocks/users';

const DEMO_USER_KEY = 'demoUser';

const AuthContext = createContext();

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isDemoUser, setIsDemoUser] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) {
      setLoading(false);
      return;
    }
    // Demo mode: restore user from token/localStorage without calling API
    if (isDemoToken(token)) {
      const stored = localStorage.getItem(DEMO_USER_KEY);
      const demoUser = stored ? (() => { try { return JSON.parse(stored); } catch { return getDemoUserFromToken(token); } })() : getDemoUserFromToken(token);
      setUser(demoUser || null);
      setIsDemoUser(!!demoUser);
      setLoading(false);
      return;
    }
    // Real API: fetch current user
    getMe()
      .then((data) => {
        setUser(data?.user ?? data);
      })
      .catch(() => {
        localStorage.removeItem('token');
      })
      .finally(() => {
        setLoading(false);
      });
  }, []);

  const login = async (credentials) => {
    const data = await apiLogin(credentials);
    const { token, user: loggedInUser } = data;
    localStorage.setItem('token', token);
    localStorage.removeItem(DEMO_USER_KEY);
    setIsDemoUser(false);
    setUser(loggedInUser);
    return { data };
  };

  const register = async (userData) => {
    const data = await apiRegister(userData);
    const { token, user: newUser } = data;
    localStorage.setItem('token', token);
    localStorage.removeItem(DEMO_USER_KEY);
    setIsDemoUser(false);
    setUser(newUser);
    return { data };
  };

  /** Log in as demo user without backend. role: 'user' | 'host' */
  const loginAsDemo = (role) => {
    const demoUser = DEMO_USERS[role] || DEMO_USERS.user;
    const token = `demo:${role}`;
    localStorage.setItem('token', token);
    localStorage.setItem(DEMO_USER_KEY, JSON.stringify(demoUser));
    setIsDemoUser(true);
    setUser(demoUser);
    return { data: { token, user: demoUser } };
  };

  const logout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem(DEMO_USER_KEY);
    setIsDemoUser(false);
    setUser(null);
  };

  const refreshUser = async () => {
    const token = localStorage.getItem('token');
    if (isDemoToken(token)) {
      const stored = localStorage.getItem(DEMO_USER_KEY);
      if (stored) {
        try {
          setUser(JSON.parse(stored));
        } catch {
          setUser(getDemoUserFromToken(token));
        }
      }
      return;
    }
    const data = await getMe();
    setUser(data?.user ?? data);
  };

  const updateUserProfile = async (profileData) => {
    const token = localStorage.getItem('token');
    if (isDemoToken(token)) {
      const stored = localStorage.getItem(DEMO_USER_KEY);
      const current = stored ? (() => { try { return JSON.parse(stored); } catch { return user; } })() : user;
      const updated = { ...current, ...profileData };
      localStorage.setItem(DEMO_USER_KEY, JSON.stringify(updated));
      setUser(updated);
      return { user: updated };
    }
    const data = await updateProfile(profileData);
    const updated = data?.user ?? data;
    if (updated) setUser(updated);
    return data;
  };

  return (
    <AuthContext.Provider value={{ user, login, register, logout, loginAsDemo, isDemoUser, loading, refreshUser, updateUserProfile }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
