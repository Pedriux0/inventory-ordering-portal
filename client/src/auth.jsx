import { createContext, useContext, useEffect, useState } from 'react'
import { api, getToken, setToken, setUnauthorizedHandler } from './api'

// keeps "who is logged in" in one place so every page can read it with useAuth()

const USER_KEY = 'portal_user';
const AuthContext = createContext(null);

function loadSavedUser() {
  // only trust the saved user if the token is also still there
  const saved = sessionStorage.getItem(USER_KEY);
  return saved && getToken() ? JSON.parse(saved) : null;
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(loadSavedUser);

  function clearSession() {
    setToken(null);
    sessionStorage.removeItem(USER_KEY);
    setUser(null);
  }

  // if any api call comes back 401 (token expired), send the user back to the login page
  useEffect(() => {
    setUnauthorizedHandler(clearSession);
  }, []);

  // POST /api/auth/login (req 2.1.1), the api answers { token, user }
  async function login(email, password) {
    const data = await api.post('/auth/login', { email, password });
    setToken(data.token);
    sessionStorage.setItem(USER_KEY, JSON.stringify(data.user));
    setUser(data.user);
  }

  // POST /api/auth/logout (req 2.1.4), then we throw the token away
  async function logout() {
    try {
      await api.post('/auth/logout');
    } finally {
      clearSession();
    }
  }

  // role checks for showing/hiding buttons, the api still enforces the real rule
  const canManageSuppliers = user && ['Manager', 'Admin'].includes(user.role);

  return (
    <AuthContext.Provider value={{ user, login, logout, canManageSuppliers }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
