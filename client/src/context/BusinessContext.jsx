import {
  createContext,
  useContext,
  useMemo,
  useState,
} from "react";

import api from "../services/api";
import { useAuth } from "./AuthContext";

const BusinessContext =
  createContext(null);

export const BusinessProvider = ({
  children,
}) => {
  /*
   * AuthContext is the single source of truth
   * for the authenticated business and branches.
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
          : [];

      setBranches(
        loadedBranches
      );

      /*
       * Keep the current branch if it still exists.
       */
      const currentBranchId =
        branch?._id ||
        branch?.id ||
        null;

      const matchingBranch =
        currentBranchId
          ? loadedBranches.find(
              (item) =>
                item?._id ===
                  currentBranchId ||
                item?.id ===
                  currentBranchId
            )
          : null;

      /*
       * If the current branch is still valid,
       * refresh it with the server version.
       */
      if (matchingBranch) {
        setBranch(
          matchingBranch
        );
      } else if (
        loadedBranches.length > 0
      ) {
        /*
         * Otherwise select the first available branch.
         */
        setBranch(
          loadedBranches[0]
        );
      } else {
        setBranch(null);
      }

      return loadedBranches;
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
     * Select immediately so the UI changes
     * without waiting for the server.
     */
    setBranch(
      selectedBranch
    );

    try {
      setLoading(true);
      setError("");

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

        return serverBranch;
      }

      return selectedBranch;
    } catch (requestError) {
      console.warn(
        "Backend branch switch failed. Keeping selected branch locally.",
        requestError
      );

      /*
       * Do not undo the user's branch selection.
       */
      setBranch(
        selectedBranch
      );

      /*
       * We don't throw here because branch switching
       * should not crash the dashboard when the backend
       * endpoint is unavailable.
       */

      return selectedBranch;
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
  // CONTEXT VALUE
  // ============================================================

  const value = useMemo(
    () => ({
      business,
      branch,
      branches,

      user,

      loading,
      error,

      setBusiness,
      setBranch,
      setBranches,

      loadBusiness,
      loadBranches,

      switchBranch,

      clearBusinessContext,
    }),
    [
      business,
      branch,
      branches,
      user,
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