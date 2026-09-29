
import { createContext, useContext, useEffect, useState } from "react";

import {
  getCurrentUser,
  login as loginRequest,
  registerBusiness as registerRequest,
} from "../services/auth";

import { storage } from "../services/storage";

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(storage.getUser());
  const [business, setBusiness] = useState(storage.getBusiness());
  const [branch, setBranch] = useState(storage.getBranch());
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const restoreSession = async () => {
      const token = storage.getToken();

      // No saved token means there is no session to restore.
      if (!token) {
        setLoading(false);
        return;
      }

      try {
        const response = await getCurrentUser();

        if (response?.user) {
          setUser(response.user);
          storage.setUser(response.user);
        }

        if (response?.business) {
          setBusiness(response.business);
          storage.setBusiness(response.business);
        }

        if (response?.branch) {
          setBranch(response.branch);
          storage.setBranch(response.branch);
        }
      } catch (error) {
        console.error("Session restoration failed:", error);

        // Token may have expired or become invalid.
        storage.clear();

        setUser(null);
        setBusiness(null);
        setBranch(null);
      } finally {
        setLoading(false);
      }
    };

    restoreSession();
  }, []);

  const login = async (credentials) => {
    const response = await loginRequest(credentials);

    storage.setToken(response.token);
    storage.setUser(response.user);
    storage.setBusiness(response.business);
    storage.setBranch(response.branch);

    setUser(response.user);
    setBusiness(response.business);
    setBranch(response.branch);

    return response;
  };

  const register = async (businessData) => {
    const response = await registerRequest(businessData);

    storage.setToken(response.token);
    storage.setUser(response.user);
    storage.setBusiness(response.business);
    storage.setBranch(response.branch);

    setUser(response.user);
    setBusiness(response.business);
    setBranch(response.branch);

    return response;
  };

  const logout = () => {
    storage.clear();

    setUser(null);
    setBusiness(null);
    setBranch(null);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        business,
        branch,
        loading,
        isAuthenticated: Boolean(user),
        login,
        register,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error(
      "useAuth must be used inside an AuthProvider"
    );
  }

  return context;
};

export default AuthContext;