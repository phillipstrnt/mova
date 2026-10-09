
import { useMemo } from "react";
import { useAuth } from "../context/AuthContext";

const getId = (value) => {
  if (value === null || value === undefined) return "";

  if (typeof value === "string" || typeof value === "number") {
    return String(value);
  }

  if (typeof value === "object") {
    return String(value._id || value.id || value.$oid || "");
  }

  return "";
};

const BranchSelector = () => {
  const {
    user,
    branch,
    branches,
    switchBranch,
    loading,
  } = useAuth();

  const role = String(user?.role || "")
    .trim()
    .toUpperCase();

  /*
   * Cashiers must remain in their assigned branch.
   *
   * OWNER / ADMIN / MANAGER may need to switch branches.
   * Other roles only see their assigned branch as well.
   */
  const canSwitchBranches =
    role === "OWNER" ||
    role === "ADMIN" ||
    role === "MANAGER";

  const availableBranches = useMemo(() => {
    if (!Array.isArray(branches)) {
      return [];
    }

    /*
     * OWNER and ADMIN can see all branches supplied by AuthContext.
     */
    if (role === "OWNER" || role === "ADMIN") {
      return branches;
    }

    /*
     * Other users should only see branches assigned to them.
     */
    const assignedBranchIds = Array.isArray(user?.branchIds)
      ? user.branchIds.map(getId).filter(Boolean)
      : [];

    const legacyBranchId = getId(user?.branchId);

    if (legacyBranchId && !assignedBranchIds.includes(legacyBranchId)) {
      assignedBranchIds.push(legacyBranchId);
    }

    return branches.filter((item) =>
      assignedBranchIds.includes(getId(item))
    );
  }, [branches, role, user?.branchIds, user?.branchId]);

  const handleChange = async (event) => {
    const branchId = event.target.value;

    if (!branchId) {
      return;
    }

    if (!canSwitchBranches) {
      return;
    }

    if (String(branchId) === getId(branch)) {
      return;
    }

    try {
      await switchBranch(branchId);
    } catch (error) {
      console.error("Branch switch failed:", error);
    }
  };

  /*
   * No selector is necessary if the user has only one branch.
   */
  if (availableBranches.length <= 1) {
    return (
      <div className="flex items-center gap-2">
        <div className="min-w-0">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">
            Branch
          </p>

          <p className="truncate text-sm font-medium text-slate-700 dark:text-slate-200">
            {branch?.name || "No branch assigned"}
          </p>
        </div>
      </div>
    );
  }

  /*
   * Cashiers and restricted users should not receive a branch switcher.
   */
  if (!canSwitchBranches) {
    return (
      <div className="flex items-center gap-2">
        <div className="min-w-0">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">
            Branch
          </p>

          <p className="truncate text-sm font-medium text-slate-700 dark:text-slate-200">
            {branch?.name || "No branch assigned"}
          </p>

          {role === "CASHIER" && (
            <p className="text-[10px] text-slate-400">
              Assigned branch
            </p>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2">
      <div className="min-w-0">
        <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">
          Branch
        </p>

        <select
          value={getId(branch)}
          onChange={handleChange}
          disabled={loading || availableBranches.length === 0}
          className="max-w-[220px] rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 outline-none transition focus:border-slate-400 focus:ring-2 focus:ring-slate-200 disabled:cursor-not-allowed disabled:opacity-60 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:focus:border-slate-500 dark:focus:ring-slate-700"
        >
          {availableBranches.length === 0 ? (
            <option value="">No branches</option>
          ) : (
            availableBranches.map((item) => (
              <option
                key={getId(item)}
                value={getId(item)}
              >
                {item.name}
                {item.code ? ` (${item.code})` : ""}
              </option>
            ))
          )}
        </select>
      </div>
    </div>
  );
};

export default BranchSelector;
