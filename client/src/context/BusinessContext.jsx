
import {
  createContext,
  useContext,
  useMemo,
  useState,
} from "react";

import api from "../services/api";
import { useAuth } from "./AuthContext";

const BusinessContext = createContext(null);

/*
|--------------------------------------------------------------------------
| Helpers
|--------------------------------------------------------------------------
*/

const getId = (value) => {
  if (!value) return null;

  if (typeof value === "string") {
    return value;
  }

  if (typeof value === "object") {
    if (value._id) return String(value._id);
    if (value.id) return String(value.id);
    if (value.$oid) return String(value.$oid);
  }

  return null;
};

const sameId = (a, b) => {
  const first = getId(a);
  const second = getId(b);

  return Boolean(
    first &&
      second &&
      String(first) === String(second)
  );
};

const isPrivilegedRole = (role) => {
  const normalizedRole = String(role || "")
    .trim()
    .toUpperCase();

  return (
    normalizedRole === "OWNER" ||
    normalizedRole === "ADMIN"
  );
};

export const BusinessProvider = ({
  children,
}) => {
  /*
   * AuthContext remains the single source of truth
   * for authenticated business/user information.
   */
  const {
    business,
    branch,
    branches,

    setBusiness,
    setBranch,
    setBranches,

    user,
  } = useAuth();

  const [loading, setLoading] =
    useState(false);

  const [error, setError] =
    useState("");

  /*
  |--------------------------------------------------------------------------
  | Resolve the user's authorized branch
  |--------------------------------------------------------------------------
  |
  | For OWNER/ADMIN:
  |   - They can work with any branch returned by the server.
  |
  | For other roles:
  |   - activeBranchId has priority.
  |   - branchId is the fallback.
  |   - branchIds determines what they are actually allowed to use.
  |
  */

  const resolveAuthorizedBranch = (
    availableBranches = branches,
    currentUser = user,
    currentBranch = branch
  ) => {
    const list = Array.isArray(
      availableBranches
    )
      ? availableBranches
      : [];

    if (list.length === 0) {
      return null;
    }

    const role =
      currentUser?.role || "";

    const userActiveBranchId =
      getId(
        currentUser?.activeBranchId
      );

    const userBranchId =
      getId(
        currentUser?.branchId
      );

    const currentBranchId =
      getId(currentBranch);

    /*
     * OWNER and ADMIN may use any active branch
     * returned by the backend.
     */
    if (isPrivilegedRole(role)) {
      if (userActiveBranchId) {
        const activeBranch =
          list.find((item) =>
            sameId(
              item,
              userActiveBranchId
            )
          );

        if (activeBranch) {
          return activeBranch;
        }
      }

      if (currentBranchId) {
        const existingBranch =
          list.find((item) =>
            sameId(
              item,
              currentBranchId
            )
          );

        if (existingBranch) {
          return existingBranch;
        }
      }

      if (userBranchId) {
        const userBranch =
          list.find((item) =>
            sameId(
              item,
              userBranchId
            )
          );

        if (userBranch) {
          return userBranch;
        }
      }

      return list[0] || null;
    }

    /*
     * Lower roles must remain inside their
     * assigned branchIds.
     */
    const assignedBranchIds =
      Array.isArray(
        currentUser?.branchIds
      )
        ? currentUser.branchIds
            .map(getId)
            .filter(Boolean)
        : [];

    const legacyBranchId = getId(
      currentUser?.branchId
    );

    if (
      legacyBranchId &&
      !assignedBranchIds.includes(legacyBranchId)
    ) {
      assignedBranchIds.push(legacyBranchId);
    }

    /*
     * First priority:
     * authenticated activeBranchId.
     */
    if (userActiveBranchId) {
      const activeIsAssigned =
        assignedBranchIds.length === 0 ||
        assignedBranchIds.includes(
          userActiveBranchId
        );

      if (activeIsAssigned) {
        const activeBranch =
          list.find((item) =>
            sameId(
              item,
              userActiveBranchId
            )
          );

        if (activeBranch) {
          return activeBranch;
        }
      }
    }

    /*
     * Second priority:
     * authenticated branchId.
     */
    if (userBranchId) {
      const branchIsAssigned =
        assignedBranchIds.length === 0 ||
        assignedBranchIds.includes(
          userBranchId
        );

      if (branchIsAssigned) {
        const userBranch =
          list.find((item) =>
            sameId(
              item,
              userBranchId
            )
          );

        if (userBranch) {
          return userBranch;
        }
      }
    }

    /*
     * Third priority:
     * current frontend branch, but only if
     * it belongs to the user's assigned branches.
     */
    if (currentBranchId) {
      const currentIsAssigned =
        assignedBranchIds.length === 0 ||
        assignedBranchIds.includes(
          currentBranchId
        );

      if (currentIsAssigned) {
        const existingBranch =
          list.find((item) =>
            sameId(
              item,
              currentBranchId
            )
          );

        if (existingBranch) {
          return existingBranch;
        }
      }
    }

    /*
     * Final fallback:
     * first branch that the user is authorized
     * to access.
     */
    const firstAuthorizedBranch =
      list.find((item) => {
        const id = getId(item);

        if (!id) {
          return false;
        }

        if (
          assignedBranchIds.length === 0
        ) {
          return false;
        }

        return assignedBranchIds.includes(
          id
        );
      });

    return (
      firstAuthorizedBranch ||
      null
    );
  };

  // ============================================================
  // LOAD BUSINESS
  // ============================================================

  const loadBusiness = async () => {
    try {
      setLoading(true);
      setError("");

      const response =
        await api.get(
          "/business/profile"
        );

      const loadedBusiness =
        response?.data?.business ||
        null;

      if (loadedBusiness) {
        setBusiness(
          loadedBusiness
        );

        localStorage.setItem(
          "mova_business",
          JSON.stringify(
            loadedBusiness
          )
        );
      }

      return loadedBusiness;
    } catch (requestError) {
      console.error(
        "Unable to load business:",
        requestError
      );

      const message =
        requestError?.response?.data
          ?.message ||
        "Unable to load business.";

      setError(message);

      throw requestError;
    } finally {
      setLoading(false);
    }
  };

  // ============================================================
  // LOAD BRANCHES
  // ============================================================

  const loadBranches = async () => {
    try {
      setLoading(true);
      setError("");

      const response =
        await api.get(
          "/branches"
        );

      const loadedBranches =
        Array.isArray(
          response?.data?.branches
        )
          ? response.data.branches
          : Array.isArray(
              response?.data?.data?.branches
            )
          ? response.data.data.branches
          : [];

      /*
       * Only keep active branches if the backend
       * provides the isActive property.
       *
       * If the backend does not include isActive,
       * retain the branch rather than accidentally
       * removing it from the frontend.
       */
      const activeBranches =
        loadedBranches.filter(
          (item) =>
            item?.isActive === undefined ||
            item?.isActive === true
        );

      setBranches(
        activeBranches
      );

      /*
       * Resolve the branch using the authenticated
       * user's branch information instead of blindly
       * selecting the first branch.
       */
      const resolvedBranch =
        resolveAuthorizedBranch(
          activeBranches,
          user,
          branch
        );

      if (resolvedBranch) {
        setBranch(
          resolvedBranch
        );

        /*
         * Keep a local copy for components that
         * need to initialize before AuthContext
         * finishes restoring state.
         */
        localStorage.setItem(
          "mova_branch",
          JSON.stringify(
            resolvedBranch
          )
        );
      } else {
        setBranch(null);

        localStorage.removeItem(
          "mova_branch"
        );
      }

      localStorage.setItem(
        "mova_branches",
        JSON.stringify(
          activeBranches
        )
      );

      return activeBranches;
    } catch (requestError) {
      console.error(
        "Unable to load branches:",
        requestError
      );

      const message =
        requestError?.response?.data
          ?.message ||
        "Unable to load branches.";

      setError(message);

      throw requestError;
    } finally {
      setLoading(false);
    }
  };

  // ============================================================
  // SWITCH BRANCH
  // ============================================================

  const switchBranch = async (
    branchId
  ) => {
    const normalizedBranchId =
      getId(branchId);

    if (!normalizedBranchId) {
      throw new Error(
        "A valid branch ID is required."
      );
    }

    const selectedBranch =
      branches.find((item) =>
        sameId(
          item,
          normalizedBranchId
        )
      );

    if (!selectedBranch) {
      throw new Error(
        "Selected branch was not found."
      );
    }

    /*
     * Lower-level users can only switch to
     * branches assigned to them.
     */
    if (
      !isPrivilegedRole(
        user?.role
      )
    ) {
      const assignedBranchIds =
        Array.isArray(
          user?.branchIds
        )
          ? user.branchIds
              .map(getId)
              .filter(Boolean)
          : [];

      if (
        !assignedBranchIds.includes(
          normalizedBranchId
        )
      ) {
        throw new Error(
          "You are not authorized to switch to this branch."
        );
      }
    }

    try {
      setLoading(true);
      setError("");

      /*
       * Ask the backend to make this the user's
       * active branch.
       */
      const response =
        await api.patch(
          "/branches/switch",
          {
            branchId:
              normalizedBranchId,
          }
        );

      const serverBranch =
        response?.data?.branch ||
        selectedBranch;

      /*
       * Update frontend state only after the
       * backend accepts the branch switch.
       */
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
    } catch (requestError) {
      console.error(
        "Unable to switch branch:",
        requestError
      );

      const message =
        requestError?.response?.data
          ?.message ||
        requestError?.message ||
        "Unable to switch branch.";

      setError(message);

      /*
       * Do not silently keep an unconfirmed
       * branch selection.
       */
      throw requestError;
    } finally {
      setLoading(false);
    }
  };

  // ============================================================
  // CLEAR BUSINESS CONTEXT
  // ============================================================

  const clearBusinessContext = () => {
    setBusiness(null);
    setBranches([]);
    setBranch(null);

    localStorage.removeItem(
      "mova_business"
    );

    localStorage.removeItem(
      "mova_branches"
    );

    localStorage.removeItem(
      "mova_branch"
    );
  };

  // ============================================================
  // CURRENT BRANCH ID
  // ============================================================

  const activeBranchId = useMemo(() => {
    return (
      getId(
        user?.activeBranchId
      ) ||
      getId(user?.branchId) ||
      getId(branch)
    );
  }, [
    user?.activeBranchId,
    user?.branchId,
    branch,
  ]);

  // ============================================================
  // CONTEXT VALUE
  // ============================================================

  const value = useMemo(
    () => ({
      business,
      branch,
      branches,

      user,

      /*
       * Components such as Sales, Receipts,
       * POS and Dashboard can use this directly.
       */
      activeBranchId,

      loading,
      error,

      setBusiness,
      setBranch,
      setBranches,

      loadBusiness,
      loadBranches,

      switchBranch,

      clearBusinessContext,

      resolveAuthorizedBranch,
    }),
    [
      business,
      branch,
      branches,
      user,
      activeBranchId,
      loading,
      error,
    ]
  );

  return (
    <BusinessContext.Provider
      value={value}
    >
      {children}
    </BusinessContext.Provider>
  );
};

// ============================================================
// useBusiness
// ============================================================

export const useBusiness = () => {
  const context =
    useContext(
      BusinessContext
    );

  if (!context) {
    throw new Error(
      "useBusiness must be used inside BusinessProvider."
    );
  }

  return context;
};

export default BusinessContext;
