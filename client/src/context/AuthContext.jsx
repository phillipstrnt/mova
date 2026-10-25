
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";

import api from "../api";

const AuthContext = createContext(null);

const STORAGE_KEYS = {
  TOKEN: "mova_token",
  USER: "mova_user",
  BUSINESS: "mova_business",
  BRANCH: "mova_branch",
  BRANCHES: "mova_branches",
};

/*
|--------------------------------------------------------------------------
| Helpers
|--------------------------------------------------------------------------
*/

const getStoredJson = (key, fallback = null) => {
  try {
    const value = localStorage.getItem(key);

    if (!value) {
      return fallback;
    }

    return JSON.parse(value);
  } catch (error) {
    console.error(
      `Failed to read ${key} from localStorage:`,
      error
    );

    return fallback;
  }
};

const setStoredJson = (key, value) => {
  try {
    if (value === null || value === undefined) {
      localStorage.removeItem(key);
      return;
    }

    localStorage.setItem(
      key,
      JSON.stringify(value)
    );
  } catch (error) {
    console.error(
      `Failed to save ${key} to localStorage:`,
      error
    );
  }
};

const removeAuthStorage = () => {
  Object.values(STORAGE_KEYS).forEach((key) => {
    localStorage.removeItem(key);
  });
};

const normalizeRole = (role) => {
  return String(role || "")
    .trim()
    .toUpperCase();
};

const getBranchId = (value) => {
  if (value === null || value === undefined) {
    return "";
  }

  if (typeof value === "string" || typeof value === "number") {
    return String(value);
  }

  if (typeof value === "object") {
    return String(
      value._id ||
        value.id ||
        value.$oid ||
        ""
    );
  }

  return "";
};

const canSwitchBranches = (role) => {
  const normalizedRole =
    normalizeRole(role);

  return (
    normalizedRole === "OWNER" ||
    normalizedRole === "ADMIN" ||
    normalizedRole === "MANAGER"
  );
};

/*
|--------------------------------------------------------------------------
| Extract useful backend error message
|--------------------------------------------------------------------------
|
| Axios normally gives:
|
|   "Request failed with status code 400"
|
| But MOVA's backend normally sends:
|
|   {
|     success: false,
|     message: "Email and password are required"
|   }
|
| This helper makes sure the useful message reaches the UI.
|--------------------------------------------------------------------------
*/

const getApiErrorMessage = (
  error,
  fallback = "Something went wrong."
) => {
  return (
    error?.response?.data?.message ||
    error?.response?.data?.error ||
    error?.message ||
    fallback
  );
};

/*
|--------------------------------------------------------------------------
| Provider
|--------------------------------------------------------------------------
*/

export const AuthProvider = ({
  children,
}) => {
  const [user, setUser] = useState(() =>
    getStoredJson(
      STORAGE_KEYS.USER,
      null
    )
  );

  const [business, setBusiness] =
    useState(() =>
      getStoredJson(
        STORAGE_KEYS.BUSINESS,
        null
      )
    );

  const [branch, setBranch] =
    useState(() =>
      getStoredJson(
        STORAGE_KEYS.BRANCH,
        null
      )
    );

  const [branches, setBranches] =
    useState(() =>
      getStoredJson(
        STORAGE_KEYS.BRANCHES,
        []
      )
    );

  const [loading, setLoading] =
    useState(true);

  /*
  |--------------------------------------------------------------------------
  | Persist user
  |--------------------------------------------------------------------------
  */

  useEffect(() => {
    if (user) {
      setStoredJson(
        STORAGE_KEYS.USER,
        user
      );
    } else {
      localStorage.removeItem(
        STORAGE_KEYS.USER
      );
    }
  }, [user]);

  /*
  |--------------------------------------------------------------------------
  | Persist business
  |--------------------------------------------------------------------------
  */

  useEffect(() => {
    if (business) {
      setStoredJson(
        STORAGE_KEYS.BUSINESS,
        business
      );
    } else {
      localStorage.removeItem(
        STORAGE_KEYS.BUSINESS
      );
    }
  }, [business]);

  /*
  |--------------------------------------------------------------------------
  | Persist branch
  |--------------------------------------------------------------------------
  */

  useEffect(() => {
    if (branch) {
      setStoredJson(
        STORAGE_KEYS.BRANCH,
        branch
      );
    } else {
      localStorage.removeItem(
        STORAGE_KEYS.BRANCH
      );
    }
  }, [branch]);

  /*
  |--------------------------------------------------------------------------
  | Persist branches
  |--------------------------------------------------------------------------
  */

  useEffect(() => {
    if (Array.isArray(branches)) {
      setStoredJson(
        STORAGE_KEYS.BRANCHES,
        branches
      );
    }
  }, [branches]);

  /*
  |--------------------------------------------------------------------------
  | Clear authentication
  |--------------------------------------------------------------------------
  */

  const clearAuth = useCallback(() => {
    setUser(null);
    setBusiness(null);
    setBranch(null);
    setBranches([]);

    removeAuthStorage();
  }, []);

  useEffect(() => {
    const handleExpiredSession = () => clearAuth();
    window.addEventListener("mova:auth-expired", handleExpiredSession);
    return () => window.removeEventListener("mova:auth-expired", handleExpiredSession);
  }, [clearAuth]);

  /*
  |--------------------------------------------------------------------------
  | Normalize authenticated user
  |--------------------------------------------------------------------------
  */

  const normalizeUser = useCallback(
    (authenticatedUser) => {
      if (!authenticatedUser) {
        return null;
      }

      const normalizedBranchIds =
        Array.isArray(
          authenticatedUser.branchIds
        )
          ? authenticatedUser.branchIds
              .map(getBranchId)
              .filter(Boolean)
          : [];

      const legacyBranchId = getBranchId(
        authenticatedUser.branchId
      );

      if (
        legacyBranchId &&
        !normalizedBranchIds.includes(legacyBranchId)
      ) {
        normalizedBranchIds.push(legacyBranchId);
      }

      return {
        ...authenticatedUser,
        branchIds:
          normalizedBranchIds,
      };
    },
    []
  );

  /*
  |--------------------------------------------------------------------------
  | Resolve branch information
  |--------------------------------------------------------------------------
  */

  const resolveBranchData =
    useCallback(
      ({
        authenticatedUser,
        authenticatedBranch,
        authenticatedBranches,
      }) => {
        const role = normalizeRole(
          authenticatedUser?.role
        );

        const normalizedBranchIds =
          Array.isArray(
            authenticatedUser?.branchIds
          )
            ? authenticatedUser.branchIds
                .map(getBranchId)
                .filter(Boolean)
            : [];

        const legacyBranchId = getBranchId(
          authenticatedUser?.branchId
        );

        if (
          legacyBranchId &&
          !normalizedBranchIds.includes(legacyBranchId)
        ) {
          normalizedBranchIds.push(legacyBranchId);
        }

        let resolvedBranch =
          authenticatedBranch || null;

        let resolvedBranches =
          Array.isArray(
            authenticatedBranches
          )
            ? authenticatedBranches
            : [];

        /*
         * Determine requested active branch.
         */
        const activeBranchId =
          getBranchId(authenticatedUser?.activeBranchId) ||
          getBranchId(authenticatedUser?.branchId) ||
          normalizedBranchIds[0] ||
          null;

        /*
         * If no branch object was supplied, resolve it from
         * the returned branch list.
         */
        if (
          !resolvedBranch &&
          activeBranchId &&
          resolvedBranches.length > 0
        ) {
          resolvedBranch =
            resolvedBranches.find(
              (item) =>
                getBranchId(item) ===
                String(activeBranchId)
            ) || null;
        }

        /*
         * Restricted users must never be placed into a branch
         * they are not assigned to.
         */
        if (
          role !== "OWNER" &&
          role !== "ADMIN" &&
          resolvedBranch
        ) {
          const hasAccess =
            normalizedBranchIds.includes(
              getBranchId(resolvedBranch)
            );

          if (!hasAccess) {
            console.warn(
              "MOVA Auth: current branch is not assigned to this user."
            );

            resolvedBranch = null;
          }
        }

        /*
         * Restricted users cannot switch branches.
         *
         * Resolve their first assigned branch if necessary.
         */
        if (
          !canSwitchBranches(role) &&
          role !== "OWNER" &&
          role !== "ADMIN" &&
          !resolvedBranch &&
          normalizedBranchIds.length > 0
        ) {
          resolvedBranch =
            resolvedBranches.find(
              (item) =>
                normalizedBranchIds.includes(
                  String(item._id)
                )
            ) || null;
        }

        /*
         * If a branch list wasn't returned but we have a
         * valid branch object, make sure it is included.
         */
        if (
          resolvedBranch &&
          !resolvedBranches.some(
            (item) =>
              getBranchId(item) ===
              getBranchId(resolvedBranch)
          )
        ) {
          resolvedBranches = [
            resolvedBranch,
            ...resolvedBranches,
          ];
        }

        return {
          branch: resolvedBranch,
          branches: resolvedBranches,
        };
      },
      []
    );

  const establishSession = useCallback(
    (payload) => {
      const token = payload?.token;
      const authenticatedUser = payload?.user;
      if (!token || !authenticatedUser) {
        throw new Error("Authentication response was incomplete. Please try again.");
      }

      localStorage.setItem(STORAGE_KEYS.TOKEN, token);
      const normalizedUser = normalizeUser(authenticatedUser);
      const resolved = resolveBranchData({
        authenticatedUser: normalizedUser,
        authenticatedBranch: payload.branch || null,
        authenticatedBranches: Array.isArray(payload.branches) ? payload.branches : [],
      });

      setUser(normalizedUser);
      setBusiness(payload.business || null);
      setBranch(resolved.branch);
      setBranches(resolved.branches);
      setStoredJson(STORAGE_KEYS.USER, normalizedUser);
      setStoredJson(STORAGE_KEYS.BUSINESS, payload.business || null);
      setStoredJson(STORAGE_KEYS.BRANCH, resolved.branch);
      setStoredJson(STORAGE_KEYS.BRANCHES, resolved.branches);

      return {
        token,
        user: normalizedUser,
        business: payload.business || null,
        branch: resolved.branch,
        branches: resolved.branches,
      };
    },
    [normalizeUser, resolveBranchData]
  );

  const register = useCallback(
    async (registrationData) => {
      setLoading(true);
      try {
        const response = await api.post("/auth/register", registrationData);
        return establishSession(response.data?.data || response.data || {});
      } catch (error) {
        const message = getApiErrorMessage(error, "Unable to create your account.");
        throw Object.assign(new Error(message), {
          status: error?.response?.status,
          response: error?.response,
        });
      } finally {
        setLoading(false);
      }
    },
    [establishSession]
  );

  const googleSignIn = useCallback(
    async (credential, businessDetails = {}) => {
      setLoading(true);
      try {
        const response = await api.post("/auth/google", {
          credential,
          ...businessDetails,
        });
        const payload = response.data?.data || response.data || {};
        return establishSession(payload);
      } catch (error) {
        const apiData = error?.response?.data || {};
        throw Object.assign(
          new Error(getApiErrorMessage(error, "Google sign-in could not be completed.")),
          {
            status: error?.response?.status,
            code: apiData.code,
            profile: apiData.profile,
            response: error?.response,
          }
        );
      } finally {
        setLoading(false);
      }
    },
    [establishSession]
  );

  /*
  |--------------------------------------------------------------------------
  | Load authenticated user
  |--------------------------------------------------------------------------
  */

  const loadCurrentUser =
    useCallback(async () => {
      const token =
        localStorage.getItem(
          STORAGE_KEYS.TOKEN
        );

      if (!token) {
        setLoading(false);
        return null;
      }

      try {
        const response =
          await api.get("/auth/me");

        const payload =
          response.data?.data ||
          response.data ||
          {};

        const authenticatedUser =
          payload.user ||
          payload.currentUser ||
          null;

        const authenticatedBusiness =
          payload.business ||
          authenticatedUser?.business ||
          null;

        const rawBranch =
          payload.branch ||
          authenticatedUser?.activeBranch ||
          null;

        let authenticatedBranches =
          Array.isArray(
            payload.branches
          )
            ? payload.branches
            : [];

        if (
          authenticatedBranches.length ===
            0 &&
          Array.isArray(
            payload.branchList
          )
        ) {
          authenticatedBranches =
            payload.branchList;
        }

        if (!authenticatedUser) {
          throw new Error(
            "Authenticated user was not returned."
          );
        }

        const normalizedUser =
          normalizeUser(
            authenticatedUser
          );

        const resolved =
          resolveBranchData({
            authenticatedUser:
              normalizedUser,
            authenticatedBranch:
              rawBranch,
            authenticatedBranches,
          });

        setUser(normalizedUser);
        setBusiness(
          authenticatedBusiness
        );
        setBranch(resolved.branch);
        setBranches(
          resolved.branches
        );

        setStoredJson(
          STORAGE_KEYS.USER,
          normalizedUser
        );

        setStoredJson(
          STORAGE_KEYS.BUSINESS,
          authenticatedBusiness
        );

        setStoredJson(
          STORAGE_KEYS.BRANCH,
          resolved.branch
        );

        setStoredJson(
          STORAGE_KEYS.BRANCHES,
          resolved.branches
        );

        return {
          user: normalizedUser,
          business:
            authenticatedBusiness,
          branch:
            resolved.branch,
          branches:
            resolved.branches,
        };
      } catch (error) {
        console.error(
          "MOVA Auth: failed to restore authenticated session.",
          error
        );

        if (
          error?.response?.status ===
          401
        ) {
          clearAuth();
        }

        return null;
      } finally {
        setLoading(false);
      }
    }, [
      clearAuth,
      normalizeUser,
      resolveBranchData,
    ]);

  /*
  |--------------------------------------------------------------------------
  | Restore session on application start
  |--------------------------------------------------------------------------
  */

  useEffect(() => {
    let mounted = true;

    const restoreSession =
      async () => {
        if (!mounted) {
          return;
        }

        await loadCurrentUser();
      };

    restoreSession();

    return () => {
      mounted = false;
    };
  }, [loadCurrentUser]);

  /*
  |--------------------------------------------------------------------------
  | LOGIN
  |--------------------------------------------------------------------------
  |
  | IMPORTANT FIX:
  |
  | Login.jsx calls:
  |
  |     login(email, password)
  |
  | Therefore this function accepts TWO arguments.
  |
  | It also supports:
  |
  |     login({ email, password })
  |
  | so older MOVA components remain compatible.
  |--------------------------------------------------------------------------
  */

  const login = useCallback(
    async (
      emailOrCredentials,
      passwordArgument
    ) => {
      setLoading(true);

      try {
        let credentials;

        /*
         * Support:
         *
         * login(email, password)
         *
         * AND
         *
         * login({ email, password })
         */
        if (
          typeof emailOrCredentials ===
          "object"
        ) {
          credentials = {
            email:
              emailOrCredentials?.email
                ?.trim() || "",
            password:
              emailOrCredentials?.password ||
              "",
          };
        } else {
          credentials = {
            email:
              String(
                emailOrCredentials || ""
              ).trim(),
            password:
              passwordArgument || "",
          };
        }

        /*
         * Frontend validation.
         */
        if (!credentials.email) {
          throw new Error(
            "Email address is required."
          );
        }

        if (!credentials.password) {
          throw new Error(
            "Password is required."
          );
        }

        /*
         * Send the exact object expected by authController.js:
         *
         * {
         *   email,
         *   password
         * }
         */
        const response =
          await api.post(
            "/auth/login",
            credentials
          );

        const payload =
          response.data?.data ||
          response.data ||
          {};

        const token =
          payload.token ||
          response.data?.token;

        const loggedInUser =
          payload.user || null;

        const loggedInBusiness =
          payload.business ||
          loggedInUser?.business ||
          null;

        const rawBranch =
          payload.branch ||
          loggedInUser?.activeBranch ||
          null;

        let loggedInBranches =
          Array.isArray(
            payload.branches
          )
            ? payload.branches
            : [];

        /*
         * Token must exist.
         */
        if (!token) {
          throw new Error(
            "Login succeeded but no authentication token was returned."
          );
        }

        /*
         * User must exist.
         */
        if (!loggedInUser) {
          throw new Error(
            "Login succeeded but user information was not returned."
          );
        }

        /*
         * Save token immediately.
         */
        localStorage.setItem(
          STORAGE_KEYS.TOKEN,
          token
        );

        const normalizedUser =
          normalizeUser(
            loggedInUser
          );

        /*
         * Resolve branch.
         */
        let resolved =
          resolveBranchData({
            authenticatedUser:
              normalizedUser,
            authenticatedBranch:
              rawBranch,
            authenticatedBranches:
              loggedInBranches,
          });

        /*
         * If the login response did not provide a branch,
         * ask the backend for the authoritative current user.
         */
        if (
          !resolved.branch
        ) {
          try {
            const meResponse =
              await api.get(
                "/auth/me"
              );

            const mePayload =
              meResponse.data?.data ||
              meResponse.data ||
              {};

            const meUser =
              mePayload.user ||
              normalizedUser;

            const meBranches =
              Array.isArray(
                mePayload.branches
              )
                ? mePayload.branches
                : loggedInBranches;

            resolved =
              resolveBranchData({
                authenticatedUser:
                  normalizeUser(
                    meUser
                  ),
                authenticatedBranch:
                  mePayload.branch ||
                  null,
                authenticatedBranches:
                  meBranches,
              });
          } catch (meError) {
            /*
             * Login itself already succeeded, so don't
             * fail the whole login just because branch
             * information could not be refreshed.
             */
            console.warn(
              "MOVA Auth: unable to retrieve branch after login.",
              meError
            );
          }
        }

        setUser(normalizedUser);
        setBusiness(
          loggedInBusiness
        );
        setBranch(resolved.branch);
        setBranches(
          resolved.branches
        );

        setStoredJson(
          STORAGE_KEYS.USER,
          normalizedUser
        );

        setStoredJson(
          STORAGE_KEYS.BUSINESS,
          loggedInBusiness
        );

        setStoredJson(
          STORAGE_KEYS.BRANCH,
          resolved.branch
        );

        setStoredJson(
          STORAGE_KEYS.BRANCHES,
          resolved.branches
        );

        return {
          token,
          user: normalizedUser,
          business:
            loggedInBusiness,
          branch:
            resolved.branch,
          branches:
            resolved.branches,
        };
      } catch (error) {
        const message =
          getApiErrorMessage(
            error,
            "Unable to sign in."
          );

        console.error(
          "MOVA login failed:",
          {
            message,
            status:
              error?.response?.status,
            response:
              error?.response?.data,
            error,
          }
        );

        /*
         * Don't leave an invalid token behind.
         */
        if (
          error?.response?.status ===
            401 ||
          error?.response?.status ===
            400
        ) {
          localStorage.removeItem(
            STORAGE_KEYS.TOKEN
          );
        }

        /*
         * Create a normal Error with the
         * backend's useful message.
         */
        const authError =
          new Error(message);

        authError.status =
          error?.response?.status;

        authError.response =
          error?.response;

        throw authError;
      } finally {
        setLoading(false);
      }
    },
    [
      normalizeUser,
      resolveBranchData,
    ]
  );

  /*
  |--------------------------------------------------------------------------
  | LOGOUT
  |--------------------------------------------------------------------------
  */

  const logout = useCallback(() => {
    clearAuth();
  }, [clearAuth]);

  /*
  |--------------------------------------------------------------------------
  | SWITCH BRANCH
  |--------------------------------------------------------------------------
  */

  const switchBranch =
    useCallback(
      async (branchId) => {
        if (!branchId) {
          throw new Error(
            "A branch ID is required."
          );
        }

        if (!user) {
          throw new Error(
            "You must be logged in to switch branches."
          );
        }

        const role =
          normalizeRole(user.role);

        /*
         * CASHIER / INVENTORY_MANAGER /
         * ACCOUNTANT cannot switch.
         */
        if (!canSwitchBranches(role)) {
          throw new Error(
            "You are not authorized to switch branches."
          );
        }

        const selectedBranch =
          branches.find(
            (item) =>
              String(item._id) ===
              String(branchId)
          );

        if (!selectedBranch) {
          throw new Error(
            "The selected branch is not available to this user."
          );
        }

        try {
          const response =
            await api.patch(
              "/branches/switch",
              {
                branchId,
              }
            );

          const payload =
            response.data?.data ||
            response.data ||
            {};

          const nextBranch =
            payload.branch ||
            selectedBranch;

          const updatedUser = {
            ...user,
            activeBranchId:
              nextBranch._id,
            branchId:
              nextBranch._id,
          };

          setUser(updatedUser);
          setBranch(nextBranch);

          setStoredJson(
            STORAGE_KEYS.USER,
            updatedUser
          );

          setStoredJson(
            STORAGE_KEYS.BRANCH,
            nextBranch
          );

          return nextBranch;
        } catch (error) {
          const message =
            getApiErrorMessage(
              error,
              "Unable to switch branches."
            );

          console.error(
            "MOVA branch switch failed:",
            error
          );

          throw new Error(message);
        }
      },
      [branches, user]
    );

  /*
  |--------------------------------------------------------------------------
  | Permission helpers
  |--------------------------------------------------------------------------
  */

  const role =
    normalizeRole(user?.role);

  const isOwner =
    role === "OWNER";

  const isAdmin =
    role === "ADMIN";

  const isManager =
    role === "MANAGER";

  const isCashier =
    role === "CASHIER";

  const isInventoryManager =
    role === "INVENTORY_MANAGER";

  const isAccountant =
    role === "ACCOUNTANT";

  /*
  |--------------------------------------------------------------------------
  | Frontend permission helper
  |--------------------------------------------------------------------------
  |
  | Backend permissions remain the real security layer.
  |--------------------------------------------------------------------------
  */

  const hasPermission =
    useCallback(
      (permission) => {
        if (!permission || !user) {
          return false;
        }

        /*
         * OWNER has everything.
         */
        if (role === "OWNER") {
          return true;
        }

        const permissions =
          Array.isArray(
            user.permissions
          )
            ? user.permissions
            : [];

        return permissions.includes(
          permission
        );
      },
      [role, user]
    );

  /*
  |--------------------------------------------------------------------------
  | Branch access helper
  |--------------------------------------------------------------------------
  */

  const hasBranchAccess =
    useCallback(
      (branchId) => {
        if (!user || !branchId) {
          return false;
        }

        if (
          role === "OWNER" ||
          role === "ADMIN"
        ) {
          return true;
        }

        const assignedBranchIds =
          Array.isArray(
            user.branchIds
          )
            ? user.branchIds
            : [];

        return assignedBranchIds.includes(
          String(branchId)
        );
      },
      [role, user]
    );

  /*
  |--------------------------------------------------------------------------
  | Context value
  |--------------------------------------------------------------------------
  */

  const value = useMemo(
    () => ({
      user,
      setUser,

      business,
      setBusiness,

      branch,
      setBranch,

      branches,
      setBranches,

      loading,
      isAuthenticated: Boolean(user),

      login,
      register,
      googleSignIn,
      logout,
      clearAuth,

      switchBranch,

      hasPermission,
      hasBranchAccess,

      role,

      isOwner,
      isAdmin,
      isManager,
      isCashier,
      isInventoryManager,
      isAccountant,

      canSwitchBranches:
        canSwitchBranches(role),
    }),
    [
      user,
      business,
      branch,
      branches,
      loading,
      login,
      register,
      googleSignIn,
      logout,
      clearAuth,
      switchBranch,
      hasPermission,
      hasBranchAccess,
      role,
      isOwner,
      isAdmin,
      isManager,
      isCashier,
      isInventoryManager,
      isAccountant,
    ]
  );

  return (
    <AuthContext.Provider
      value={value}
    >
      {children}
    </AuthContext.Provider>
  );
};

/*
|--------------------------------------------------------------------------
| useAuth Hook
|--------------------------------------------------------------------------
*/

export const useAuth = () => {
  const context =
    useContext(AuthContext);

  if (!context) {
    throw new Error(
      "useAuth must be used inside an AuthProvider."
    );
  }

  return context;
};

export default AuthContext;
