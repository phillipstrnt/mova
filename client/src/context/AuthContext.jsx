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

  // --------------------------------------------------
  // SAVE SESSION
  // --------------------------------------------------
  const saveSession = ({
    token,
    user: userData,
    business: businessData,
    branch: branchData,
    branches: branchList = [],
  }) => {
    if (token) {
      localStorage.setItem("mova_token", token);
    }

    if (userData) {
      localStorage.setItem("mova_user", JSON.stringify(userData));
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
      Array.isArray(branchList) && branchList.length > 0
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

  // --------------------------------------------------
  // CLEAR SESSION
  // --------------------------------------------------
  const clearSession = () => {
    localStorage.removeItem("mova_token");
    localStorage.removeItem("mova_user");
    localStorage.removeItem("mova_business");
    localStorage.removeItem("mova_branch");
    localStorage.removeItem("mova_branches");

    setUser(null);
    setBusiness(null);
    setBranch(null);
    setBranches([]);
  };

  // --------------------------------------------------
  // RESTORE SESSION
  // --------------------------------------------------
  useEffect(() => {
    const restoreSession = async () => {
      const token = localStorage.getItem("mova_token");

      if (!token) {
        setLoading(false);
        return;
      }

      // Load local session first.
      // This is important for our future offline/PWA support.
      try {
        const storedUser = localStorage.getItem("mova_user");
        const storedBusiness =
          localStorage.getItem("mova_business");
        const storedBranch =
          localStorage.getItem("mova_branch");
        const storedBranches =
          localStorage.getItem("mova_branches");

        if (storedUser) {
          setUser(JSON.parse(storedUser));
        }

        if (storedBusiness) {
          setBusiness(JSON.parse(storedBusiness));
        }

        if (storedBranch) {
          setBranch(JSON.parse(storedBranch));
        }

        if (storedBranches) {
          setBranches(JSON.parse(storedBranches));
        }
      } catch (error) {
        console.error(
          "Failed to restore local session:",
          error
        );
      }

      // Verify with backend when internet/server is available.
      try {
        const response = await api.get("/auth/me");

        const data = response.data;

        const userData = data?.user || null;
        const businessData = data?.business || null;
        const branchData = data?.branch || null;

        const branchList =
          Array.isArray(data?.branches) && data.branches.length > 0
            ? data.branches
            : branchData
            ? [branchData]
            : [];

        setUser(userData);
        setBusiness(businessData);
        setBranch(branchData);
        setBranches(branchList);

        if (userData) {
          localStorage.setItem(
            "mova_user",
            JSON.stringify(userData)
          );
        }

        if (businessData) {
          localStorage.setItem(
            "mova_business",
            JSON.stringify(businessData)
          );
        }

        if (branchData) {
          localStorage.setItem(
            "mova_branch",
            JSON.stringify(branchData)
          );
        }

        localStorage.setItem(
          "mova_branches",
          JSON.stringify(branchList)
        );
      } catch (error) {
        // Do NOT delete the local session here.
        //
        // Later, this will allow MOVA to continue working
        // offline and synchronize when internet returns.
        console.warn(
          "Could not verify session with server. Keeping local session.",
          error?.message
        );
      } finally {
        setLoading(false);
      }
    };

    restoreSession();
  }, []);

  // --------------------------------------------------
  // REGISTER BUSINESS
  // --------------------------------------------------
  const register = async (registrationData) => {
    try {
      const response = await api.post(
        "/auth/register",
        registrationData
      );

      const data = response.data;

      if (!data?.token) {
        throw new Error(
          "Registration succeeded but no authentication token was returned."
        );
      }

      const userData = data?.user || null;
      const businessData = data?.business || null;
      const branchData = data?.branch || null;

      const branchList =
        Array.isArray(data?.branches) && data.branches.length > 0
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
        error?.response?.data?.message ||
        error?.message ||
        "Unable to create your business account.";

      throw new Error(message);
    }
  };

  // --------------------------------------------------
  // LOGIN
  // --------------------------------------------------
  const login = async (email, password) => {
    try {
      const response = await api.post("/auth/login", {
        email,
        password,
      });

      const data = response.data;

      if (!data?.token) {
        throw new Error(
          "Login succeeded but no authentication token was returned."
        );
      }

      const userData = data?.user || null;
      const businessData = data?.business || null;
      const branchData = data?.branch || null;

      const branchList =
        Array.isArray(data?.branches) && data.branches.length > 0
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
      console.error("Login failed:", error);

      const message =
        error?.response?.data?.message ||
        error?.message ||
        "Unable to login.";

      throw new Error(message);
    }
  };

  // --------------------------------------------------
  // SWITCH BRANCH
  // --------------------------------------------------
  const switchBranch = (branchId) => {
    const selectedBranch = branches.find(
      (item) => item._id === branchId || item.id === branchId
    );

    if (!selectedBranch) {
      throw new Error("Selected branch was not found.");
    }

    setBranch(selectedBranch);

    localStorage.setItem(
      "mova_branch",
      JSON.stringify(selectedBranch)
    );

    return selectedBranch;
  };

  // --------------------------------------------------
  // LOGOUT
  // --------------------------------------------------
  const logout = () => {
    clearSession();
  };

  // --------------------------------------------------
  // AUTH STATUS
  // --------------------------------------------------
  const isAuthenticated = Boolean(user);

  return (
    <AuthContext.Provider
      value={{
        user,
        business,
        branch,
        branches,
        loading,
        isAuthenticated,

        register,
        login,
        switchBranch,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

// --------------------------------------------------
// useAuth HOOK
// --------------------------------------------------
export const useAuth = () => {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error(
      "useAuth must be used inside an AuthProvider."
    );
  }

  return context;
};

export default AuthContext;