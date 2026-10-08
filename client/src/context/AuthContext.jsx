import {
  createContext,
  useContext,
  useEffect,
  useState,
} from "react";

import api from "../services/api";

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [business, setBusiness] = useState(null);
  const [branch, setBranch] = useState(null);
  const [branches, setBranches] = useState([]);
  const [loading, setLoading] = useState(true);

  // ============================================================
  // SAVE SESSION
  // ============================================================

  const saveSession = ({
    token,
    user: userData,
    business: businessData,
    branch: branchData,
    branches: branchList = [],
  }) => {
    if (token) {
      localStorage.setItem(
        "mova_token",
        token
      );
    }

    if (userData) {
      localStorage.setItem(
        "mova_user",
        JSON.stringify(userData)
      );

      setUser(userData);
    }

    if (businessData) {
      localStorage.setItem(
        "mova_business",
        JSON.stringify(businessData)
      );

      setBusiness(businessData);
    }

    if (branchData) {
      localStorage.setItem(
        "mova_branch",
        JSON.stringify(branchData)
      );

      setBranch(branchData);
    }

    const safeBranches =
      Array.isArray(branchList) &&
      branchList.length > 0
        ? branchList
        : branchData
        ? [branchData]
        : [];

    localStorage.setItem(
      "mova_branches",
      JSON.stringify(safeBranches)
    );

    setBranches(safeBranches);
  };

  // ============================================================
  // CLEAR SESSION
  // ============================================================

  const clearSession = () => {
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

    localStorage.removeItem(
      "mova_branches"
    );

    setUser(null);
    setBusiness(null);
    setBranch(null);
    setBranches([]);
  };

  // ============================================================
  // RESTORE SESSION
  // ============================================================

  useEffect(() => {
    let mounted = true;

    const restoreSession = async () => {
      const token =
        localStorage.getItem(
          "mova_token"
        );

      // No authenticated session.
      if (!token) {
        if (mounted) {
          setLoading(false);
        }

        return;
      }

      /*
       * ----------------------------------------------------------
       * RESTORE LOCAL SESSION FIRST
       * ----------------------------------------------------------
       *
       * This keeps the UI aware of the last authenticated
       * session even if the API is temporarily unavailable.
       */

      try {
        const storedUser =
          localStorage.getItem(
            "mova_user"
          );

        const storedBusiness =
          localStorage.getItem(
            "mova_business"
          );

        const storedBranch =
          localStorage.getItem(
            "mova_branch"
          );

        const storedBranches =
          localStorage.getItem(
            "mova_branches"
          );

        if (storedUser) {
          const parsedUser =
            JSON.parse(storedUser);

          if (mounted) {
            setUser(parsedUser);
          }
        }

        if (storedBusiness) {
          const parsedBusiness =
            JSON.parse(
              storedBusiness
            );

          if (mounted) {
            setBusiness(
              parsedBusiness
            );
          }
        }

        if (storedBranch) {
          const parsedBranch =
            JSON.parse(
              storedBranch
            );

          if (mounted) {
            setBranch(
              parsedBranch
            );
          }
        }

        if (storedBranches) {
          const parsedBranches =
            JSON.parse(
              storedBranches
            );

          if (
            mounted &&
            Array.isArray(
              parsedBranches
            )
          ) {
            setBranches(
              parsedBranches
            );
          }
        }
      } catch (error) {
        console.error(
          "Failed to restore local MOVA session:",
          error
        );
      }

      /*
       * ----------------------------------------------------------
       * VERIFY SESSION WITH BACKEND
       * ----------------------------------------------------------
       */

      try {
        const response =
          await api.get(
            "/auth/me"
          );

        if (!mounted) {
          return;
        }

        const data =
          response?.data || {};

        const userData =
          data?.user || null;

        const businessData =
          data?.business || null;

        const branchData =
          data?.branch || null;

        const branchList =
          Array.isArray(
            data?.branches
          )
            ? data.branches
            : branchData
            ? [branchData]
            : [];

        setUser(userData);
        setBusiness(
          businessData
        );
        setBranch(branchData);
        setBranches(
          branchList
        );

        /*
         * Persist the server-confirmed session.
         */

        if (userData) {
          localStorage.setItem(
            "mova_user",
            JSON.stringify(
              userData
            )
          );
        }

        if (businessData) {
          localStorage.setItem(
            "mova_business",
            JSON.stringify(
              businessData
            )
          );
        } else {
          localStorage.removeItem(
            "mova_business"
          );
        }

        if (branchData) {
          localStorage.setItem(
            "mova_branch",
            JSON.stringify(
              branchData
            )
          );
        } else {
          localStorage.removeItem(
            "mova_branch"
          );
        }

        localStorage.setItem(
          "mova_branches",
          JSON.stringify(
            branchList
          )
        );
      } catch (error) {
        /*
         * Do NOT immediately delete the session.
         *
         * The user may temporarily be offline.
         */
        console.warn(
          "Could not verify MOVA session with server. Keeping local session.",
          error?.message
        );
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    };

    restoreSession();

    return () => {
      mounted = false;
    };
  }, []);

  // ============================================================
  // REGISTER BUSINESS
  // ============================================================

  const register = async (
    registrationData
  ) => {
    try {
      const response =
        await api.post(
          "/auth/register",
          registrationData
        );

      const data =
        response?.data || {};

      if (!data?.token) {
        throw new Error(
          "Registration succeeded but no authentication token was returned."
        );
      }

      const userData =
        data?.user || null;

      const businessData =
        data?.business || null;

      const branchData =
        data?.branch || null;

      const branchList =
        Array.isArray(
          data?.branches
        ) &&
        data.branches.length > 0
          ? data.branches
          : branchData
          ? [branchData]
          : [];

      saveSession({
        token: data.token,
        user: userData,
        business: businessData,
        branch: branchData,
        branches: branchList,
      });

      return data;
    } catch (error) {
      console.error(
        "Business registration failed:",
        error
      );

      const message =
        error?.response?.data
          ?.message ||
        error?.message ||
        "Unable to create your business account.";

      throw new Error(
        message
      );
    }
  };

  // ============================================================
  // LOGIN
  // ============================================================

  const login = async (
    email,
    password
  ) => {
    try {
      const response =
        await api.post(
          "/auth/login",
          {
            email,
            password,
          }
        );

      const data =
        response?.data || {};

      if (!data?.token) {
        throw new Error(
          "Login succeeded but no authentication token was returned."
        );
      }

      const userData =
        data?.user || null;

      const businessData =
        data?.business || null;

      const branchData =
        data?.branch || null;

      const branchList =
        Array.isArray(
          data?.branches
        ) &&
        data.branches.length > 0
          ? data.branches
          : branchData
          ? [branchData]
          : [];

      saveSession({
        token: data.token,
        user: userData,
        business: businessData,
        branch: branchData,
        branches: branchList,
      });

      return data;
    } catch (error) {
      console.error(
        "Login failed:",
        error
      );

      const message =
        error?.response?.data
          ?.message ||
        error?.message ||
        "Unable to login.";

      throw new Error(
        message
      );
    }
  };

  // ============================================================
  // SWITCH BRANCH
  // ============================================================

  const switchBranch = async (
    branchId
  ) => {
    if (!branchId) {
      throw new Error(
        "A branch ID is required."
      );
    }

    const selectedBranch =
      branches.find(
        (item) =>
          item?._id === branchId ||
          item?.id === branchId
      );

    if (!selectedBranch) {
      throw new Error(
        "Selected branch was not found."
      );
    }

    /*
     * Update the UI immediately.
     */

    setBranch(
      selectedBranch
    );

    localStorage.setItem(
      "mova_branch",
      JSON.stringify(
        selectedBranch
      )
    );

    /*
     * Tell the backend about the active branch
     * if the endpoint exists.
     *
     * We intentionally do not make a failed branch
     * switch destroy the local session.
     */

    try {
      const response =
        await api.patch(
          "/branches/switch",
          {
            branchId,
          }
        );

      const serverBranch =
        response?.data?.branch;

      if (serverBranch) {
        setBranch(
          serverBranch
        );

        localStorage.setItem(
          "mova_branch",
          JSON.stringify(
            serverBranch
          )
        );

        return serverBranch;
      }
    } catch (error) {
      console.warn(
        "Backend branch switch was not completed. Keeping selected branch locally.",
        error?.response?.data
          ?.message ||
          error?.message
      );
    }

    return selectedBranch;
  };

  // ============================================================
  // LOGOUT
  // ============================================================

  const logout = () => {
    clearSession();
  };

  // ============================================================
  // AUTH STATUS
  // ============================================================

  const isAuthenticated =
    Boolean(user);

  // ============================================================
  // CONTEXT
  // ============================================================

  return (
    <AuthContext.Provider
      value={{
        user,
        business,
        branch,
        branches,

        loading,
        isAuthenticated,

        setUser,
        setBusiness,
        setBranch,
        setBranches,

        register,
        login,
        switchBranch,
        logout,

        saveSession,
        clearSession,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

// ============================================================
// useAuth
// ============================================================

export const useAuth = () => {
  const context =
    useContext(
      AuthContext
    );

  if (!context) {
    throw new Error(
      "useAuth must be used inside AuthProvider."
    );
  }

  return context;
};

export default AuthContext;