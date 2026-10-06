import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";

import api from "../services/api";

const BusinessContext = createContext(null);

export const BusinessProvider = ({ children }) => {
  const [business, setBusinessState] =
    useState(() => {
      try {
        const stored =
          localStorage.getItem(
            "mova_business"
          );

        return stored
          ? JSON.parse(stored)
          : null;
      } catch (error) {
        console.error(
          "Unable to restore MOVA business:",
          error
        );

        return null;
      }
    });

  const [branches, setBranchesState] =
    useState(() => {
      try {
        const stored =
          localStorage.getItem(
            "mova_branches"
          );

        return stored
          ? JSON.parse(stored)
          : [];
      } catch (error) {
        console.error(
          "Unable to restore MOVA branches:",
          error
        );

        return [];
      }
    });

  const [branch, setBranchState] =
    useState(() => {
      try {
        const stored =
          localStorage.getItem(
            "mova_branch"
          );

        return stored
          ? JSON.parse(stored)
          : null;
      } catch (error) {
        console.error(
          "Unable to restore MOVA active branch:",
          error
        );

        return null;
      }
    });

  const [loading, setLoading] =
    useState(false);

  const [error, setError] =
    useState("");

  /*
  |--------------------------------------------------------------------------
  | SAVE BUSINESS
  |--------------------------------------------------------------------------
  */

  const setBusiness = (value) => {
    setBusinessState(value);

    if (value) {
      localStorage.setItem(
        "mova_business",
        JSON.stringify(value)
      );
    } else {
      localStorage.removeItem(
        "mova_business"
      );
    }
  };

  /*
  |--------------------------------------------------------------------------
  | SAVE BRANCHES
  |--------------------------------------------------------------------------
  */

  const setBranches = (value) => {
    const nextBranches =
      Array.isArray(value)
        ? value
        : [];

    setBranchesState(nextBranches);

    localStorage.setItem(
      "mova_branches",
      JSON.stringify(nextBranches)
    );
  };

  /*
  |--------------------------------------------------------------------------
  | SAVE ACTIVE BRANCH
  |--------------------------------------------------------------------------
  */

  const setBranch = (value) => {
    setBranchState(value);

    if (value) {
      localStorage.setItem(
        "mova_branch",
        JSON.stringify(value)
      );
    } else {
      localStorage.removeItem(
        "mova_branch"
      );
    }
  };

  /*
  |--------------------------------------------------------------------------
  | LOAD BUSINESS
  |--------------------------------------------------------------------------
  */

  const loadBusiness = async () => {
    try {
      setLoading(true);
      setError("");

      const response =
        await api.get(
          "/business/profile"
        );

      const loadedBusiness =
        response?.data?.business;

      if (loadedBusiness) {
        setBusiness(
          loadedBusiness
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

  /*
  |--------------------------------------------------------------------------
  | LOAD BRANCHES
  |--------------------------------------------------------------------------
  */

  const loadBranches = async () => {
    try {
      setLoading(true);
      setError("");

      const response =
        await api.get("/branches");

      const loadedBranches =
        response?.data?.branches || [];

      setBranches(
        loadedBranches
      );

      /*
       * If there is no active branch,
       * use the first available branch.
       */
      if (
        loadedBranches.length > 0 &&
        !branch
      ) {
        setBranch(
          loadedBranches[0]
        );
      }

      /*
       * If the current branch no longer
       * exists, select the first valid branch.
       */
      if (
        branch?._id &&
        !loadedBranches.some(
          (item) =>
            item._id === branch._id
        )
      ) {
        setBranch(
          loadedBranches[0] || null
        );
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

  /*
  |--------------------------------------------------------------------------
  | SWITCH BRANCH
  |--------------------------------------------------------------------------
  */

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
          item._id === branchId
      );

    /*
     * If the branch is already available
     * locally, update the UI immediately.
     */
    if (selectedBranch) {
      setBranch(
        selectedBranch
      );
    }

    try {
      setLoading(true);
      setError("");

      /*
       * Notify the backend about the active branch.
       *
       * If your backend already has this endpoint,
       * it will update the authenticated user's
       * active branch.
       */
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
      } else if (selectedBranch) {
        setBranch(
          selectedBranch
        );
      }

      return (
        serverBranch ||
        selectedBranch ||
        null
      );
    } catch (requestError) {
      console.error(
        "Branch switch request failed:",
        requestError
      );

      /*
       * Keep the local branch selected if
       * the server endpoint isn't available yet.
       *
       * This makes the UI usable while we
       * finish the backend branch switching.
       */
      if (selectedBranch) {
        setBranch(
          selectedBranch
        );
      }

      const message =
        requestError?.response?.data
          ?.message ||
        "Unable to switch branch.";

      setError(message);

      throw requestError;
    } finally {
      setLoading(false);
    }
  };

  /*
  |--------------------------------------------------------------------------
  | CLEAR BUSINESS CONTEXT
  |--------------------------------------------------------------------------
  */

  const clearBusinessContext = () => {
    setBusinessState(null);
    setBranchesState([]);
    setBranchState(null);

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

  /*
  |--------------------------------------------------------------------------
  | VALUE
  |--------------------------------------------------------------------------
  */

  const value = useMemo(
    () => ({
      business,
      branch,
      branches,

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