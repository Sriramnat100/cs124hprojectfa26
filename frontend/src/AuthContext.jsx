import { createContext, useContext, useEffect, useState } from "react";
import { api, getToken, setToken } from "./api.js";

const AuthContext = createContext(null);

// Any component can call useAuth() to get { user, login, signup, logout }.
export function useAuth() {
  return useContext(AuthContext);
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(Boolean(getToken()));

  // If we already have a token from last time, ask the backend who we are.
  useEffect(() => {
    if (!getToken()) return;
    api("/auth/me")
      .then(setUser)
      .catch(() => setToken(null))
      .finally(() => setLoading(false));
  }, []);

  async function authenticate(path, email, password) {
    const data = await api(path, { method: "POST", body: { email, password } });
    setToken(data.token);
    setUser(data.user);
  }

  async function logout() {
    await api("/auth/logout", { method: "POST" }).catch(() => {});
    setToken(null);
    setUser(null);
  }

  const value = {
    user,
    loading,
    login: (email, password) => authenticate("/auth/login", email, password),
    signup: (email, password) => authenticate("/auth/signup", email, password),
    logout,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
