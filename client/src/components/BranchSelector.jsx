import {
  Building2,
  Check,
  ChevronDown,
  Loader2,
} from "lucide-react";
import {
  useEffect,
  useRef,
  useState,
} from "react";

import {
  useBusiness,
} from "../context/BusinessContext";

const BranchSelector = () => {
  const {
    branch,
    branches,
    switchBranch,
    loadBranches,
    loading,
  } = useBusiness();

  const [open, setOpen] =
    useState(false);

  const [switching, setSwitching] =
    useState(false);

  const containerRef =
    useRef(null);

  /*
  |--------------------------------------------------------------------------
  | LOAD BRANCHES
  |--------------------------------------------------------------------------
  */

  useEffect(() => {
    if (!branches.length) {
      loadBranches().catch(() => {
        // Error is already handled
        // by BusinessContext.
      });
    }
  }, []);

  /*
  |--------------------------------------------------------------------------
  | CLOSE DROPDOWN WHEN CLICKING OUTSIDE
  |--------------------------------------------------------------------------
  */

  useEffect(() => {
    const handleClickOutside = (
      event
    ) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(
          event.target
        )
      ) {
        setOpen(false);
      }
    };

    document.addEventListener(
      "mousedown",
      handleClickOutside
    );

    return () => {
      document.removeEventListener(
        "mousedown",
        handleClickOutside
      );
    };
  }, []);

  /*
  |--------------------------------------------------------------------------
  | SELECT BRANCH
  |--------------------------------------------------------------------------
  */

  const handleSelect = async (
    selectedBranch
  ) => {
    if (
      !selectedBranch?._id ||
      selectedBranch._id === branch?._id
    ) {
      setOpen(false);
      return;
    }

    try {
      setSwitching(true);

      await switchBranch(
        selectedBranch._id
      );

      setOpen(false);

      /*
       * Reload the page data so that
       * branch-dependent modules such as
       * dashboard, POS and inventory refresh.
       */
      window.dispatchEvent(
        new CustomEvent(
          "mova:branch-changed",
          {
            detail: {
              branch:
                selectedBranch,
            },
          }
        )
      );
    } catch (error) {
      console.error(
        "Unable to switch branch:",
        error
      );
    } finally {
      setSwitching(false);
    }
  };

  return (
    <div
      ref={containerRef}
      className="relative w-full"
    >
      <button
        type="button"
        onClick={() =>
          setOpen((value) => !value)
        }
        disabled={
          loading ||
          switching
        }
        className="flex w-full items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white px-4 py-3 text-left shadow-sm transition hover:border-slate-300 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-70"
      >
        <div className="flex min-w-0 items-center gap-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-700">
            {switching ? (
              <Loader2
                size={18}
                className="animate-spin"
              />
            ) : (
              <Building2 size={18} />
            )}
          </div>

          <div className="min-w-0">
            <p className="text-[11px] font-medium uppercase tracking-wide text-slate-400">
              Active branch
            </p>

            <p className="truncate text-sm font-semibold text-slate-900">
              {branch?.name ||
                "Select branch"}
            </p>
          </div>
        </div>

        <ChevronDown
          size={18}
          className={`shrink-0 text-slate-400 transition-transform ${
            open
              ? "rotate-180"
              : ""
          }`}
        />
      </button>

      {open && (
        <div className="absolute left-0 right-0 top-full z-50 mt-2 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xl">
          <div className="border-b border-slate-100 px-4 py-3">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
              Your branches
            </p>
          </div>

          <div className="max-h-72 overflow-y-auto p-2">
            {branches.length === 0 ? (
              <div className="px-3 py-6 text-center">
                <Building2
                  size={24}
                  className="mx-auto mb-2 text-slate-300"
                />

                <p className="text-sm font-medium text-slate-600">
                  No branches found
                </p>

                <p className="mt-1 text-xs text-slate-400">
                  Create a branch to continue.
                </p>
              </div>
            ) : (
              branches.map(
                (item) => {
                  const active =
                    item._id ===
                    branch?._id;

                  return (
                    <button
                      key={item._id}
                      type="button"
                      onClick={() =>
                        handleSelect(
                          item
                        )
                      }
                      className={`flex w-full items-center justify-between rounded-lg px-3 py-3 text-left transition ${
                        active
                          ? "bg-slate-100"
                          : "hover:bg-slate-50"
                      }`}
                    >
                      <div className="flex min-w-0 items-center gap-3">
                        <div
                          className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${
                            active
                              ? "bg-slate-900 text-white"
                              : "bg-slate-100 text-slate-500"
                          }`}
                        >
                          <Building2
                            size={17}
                          />
                        </div>

                        <div className="min-w-0">
                          <p className="truncate text-sm font-semibold text-slate-800">
                            {item.name ||
                              "Unnamed Branch"}
                          </p>

                          {item.code && (
                            <p className="mt-0.5 text-xs text-slate-400">
                              {item.code}
                            </p>
                          )}
                        </div>
                      </div>

                      {active && (
                        <Check
                          size={18}
                          className="shrink-0 text-emerald-600"
                        />
                      )}
                    </button>
                  );
                }
              )
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default BranchSelector;