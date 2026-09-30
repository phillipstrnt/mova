import {
  createContext,
  useContext,
  useEffect,
  useState,
} from "react";

import api from "../services/api";

const AuthContext =
  createContext(null);

export const AuthProvider = ({
  children,
}) => {
  const [user, setUser] =
    useState(null);

  const [business, setBusiness] =
    useState(null);

  const [branch, setBranch] =
    useState(null);

  const [loading, setLoading] =
    useState(true);

  useEffect(() => {
    const loadStoredUser =
      async () => {
        const token =
          localStorage.getItem(
            "mova_token"
          );

        if (!token) {
          setLoading(false);
          return;
        }

        try {
          const response =
            await api.get(
              "/auth/me"
            );

          const data =
            response.data;

          const currentUser =
            data.user ||
            data.data?.user ||
            null;

          const currentBusiness =
            data.business ||
            data.data?.business ||
            null;

          const currentBranch =
            data.branch ||
            data.data?.branch ||
            null;

          setUser(currentUser);
          setBusiness(
            currentBusiness
          );
          setBranch(currentBranch);

          if (currentUser) {
            localStorage.setItem(
              "mova_user",
              JSON.stringify(
                currentUser
              )
            );
          }

          if (currentBusiness) {
            localStorage.setItem(
              "mova_business",
              JSON.stringify(
                currentBusiness
              )
            );
          }

          if (currentBranch) {
            localStorage.setItem(
              "mova_branch",
              JSON.stringify(
                currentBranch
              )
            );
          }
        } catch (error) {
          console.error(
            "Failed to restore MOVA session:",
            error
          );

          localStorage.removeItem(
            "mova_token"
          );

          localStorage.removeItem(
            "mova_user"
          );

          localStorage.removeItem(
            "mova_business"
          );

          localStorage.removeItem(
            "mova_branch"
          );

          setUser(null);
          setBusiness(null);
          setBranch(null);
        } finally {
          setLoading(false);
        }
      };

    loadStoredUser();
  }, []);

  const login = async (
    email,
    password
  ) => {
    try {
      const response =
        await api.post(
          "/auth/login",
          {
            email:
              email.trim(),
            password,
          }
        );

      const data =
        response.data;

      /*
        Support common backend response
        structures.
      */
      const token =
        data.token ||
        data.data?.token;

      const loggedInUser =
        data.user ||
        data.data?.user ||
        null;

      const loggedInBusiness =
        data.business ||
        data.data?.business ||
        null;

      const loggedInBranch =
        data.branch ||
        data.data?.branch ||
        null;

      if (!token) {
        throw new Error(
          "Login succeeded but the server did not return an authentication token."
        );
      }

      localStorage.setItem(
        "mova_token",
        token
      );

      if (loggedInUser) {
        localStorage.setItem(
          "mova_user",
          JSON.stringify(
            loggedInUser
          )
        );
      }

      if (loggedInBusiness) {
        localStorage.setItem(
          "mova_business",
          JSON.stringify(
            loggedInBusiness
          )
        );
      }

      if (loggedInBranch) {
        localStorage.setItem(
          "mova_branch",
          JSON.stringify(
            loggedInBranch
          )
        );
      }

      setUser(loggedInUser);
      setBusiness(
        loggedInBusiness
      );
      setBranch(loggedInBranch);

      return {
        success: true,
        user: loggedInUser,
        business:
          loggedInBusiness,
        branch:
          loggedInBranch,
      };
    } catch (error) {
      console.error(
        "MOVA login error:",
        error
      );

      /*
        IMPORTANT:
        Return the backend's actual message.
        This makes debugging much easier.
      */
      const message =
        error.response?.data
          ?.message ||
        error.response?.data
          ?.error ||
        error.message ||
        "Unable to sign in.";

      throw new Error(message);
    }
  };

  const logout = () => {
    localStorage.removeItem(
      "mova_token"
    );

    localStorage.removeItem(
      "mova_user"
    );

    localStorage.removeItem(
      "mova_business"
    );

    localStorage.removeItem(
      "mova_branch"
    );

    setUser(null);
    setBusiness(null);
    setBranch(null);
  };

  const value = {
    user,
    business,
    branch,
    loading,
    isAuthenticated:
      Boolean(user),
    login,
    logout,
  };

  return (
    <AuthContext.Provider
      value={value}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context =
    useContext(AuthContext);

  if (!context) {
    throw new Error(
      "useAuth must be used inside AuthProvider."
    );
  }

  return context;
};