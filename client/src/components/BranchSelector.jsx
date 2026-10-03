import { useEffect, useRef, useState } from "react";
import {
  Check,
  ChevronDown,
  GitBranch,
  Loader2,
} from "lucide-react";

import { useAuth } from "../context/AuthContext";

const BranchSelector = () => {
  const {
    branch,
    branches,
    switchBranch,
  } = useAuth();

  const [open, setOpen] =
    useState(false);

  const [switchingId, setSwitchingId] =
    useState(null);

  const [error, setError] =
    useState("");

  const containerRef =
    useRef(null);

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
  | CURRENT BRANCH
  |--------------------------------------------------------------------------
  */

  const currentBranch =
    branch ||
    branches?.[0] ||
    null;

  /*
  |--------------------------------------------------------------------------
  | SWITCH BRANCH
  |--------------------------------------------------------------------------
  */

  const handleSwitch = async (
    branchId
  ) => {
    if (!branchId) {
      return;
    }

    if (
      currentBranch?._id ===
      branchId
    ) {
      setOpen(false);
      return;
    }

    try {
      setError("");
      setSwitchingId(branchId);

      await switchBranch(
        branchId
      );

      setOpen(false);
    } catch (error) {
      console.error(
        "Branch selector error:",
        error
      );

      setError(
        error?.message ||
          "Unable to switch branch."
      );
    } finally {
      setSwitchingId(null);
    }
  };

  /*
  |--------------------------------------------------------------------------
  | NO BRANCH
  |--------------------------------------------------------------------------
  */

  if (!currentBranch) {
    return (
      <div className="flex items-center gap-2 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-amber-700">
        <GitBranch
          size={16}
        />

        <span className="text-xs font-medium">
          No branch selected
        </span>
      </div>
    );
  }

  /*
  |--------------------------------------------------------------------------
  | SINGLE BRANCH
  |--------------------------------------------------------------------------
  */

  if (
    !branches ||
    branches.length <= 1
  ) {
    return (
      <div className="flex min-w-0 items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2">
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-slate-100">
          <GitBranch
            size={16}
            className="text-slate-600"
          />
        </div>

        <div className="min-w-0">
          <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">
            Branch
          </p>

          <p className="truncate text-sm font-semibold text-slate-800">
            {currentBranch.name}
          </p>
        </div>
      </div>
    );
  }

  /*
  |--------------------------------------------------------------------------
  | MULTI-BRANCH SELECTOR
  |--------------------------------------------------------------------------
  */

  return (
    <div
      ref={containerRef}
      className="relative"
    >
      <button
        type="button"
        onClick={() =>
          setOpen(
            (current) =>
              !current
          )
        }
        className="flex min-w-0 max-w-[260px] items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-left transition hover:border-slate-300 hover:bg-slate-50"
        aria-haspopup="listbox"
        aria-expanded={open}
      >
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-slate-100">
          <GitBranch
            size={16}
            className="text-slate-600"
          />
        </div>

        <div className="min-w-0 flex-1">
          <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">
            Branch
          </p>

          <p className="truncate text-sm font-semibold text-slate-800">
            {currentBranch.name}
          </p>
        </div>

        <ChevronDown
          size={16}
          className={`shrink-0 text-slate-400 transition-transform ${
            open
              ? "rotate-180"
              : ""
          }`}
        />
      </button>

      {open && (
        <div className="absolute right-0 z-50 mt-2 w-80 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xl">
          <div className="border-b border-slate-100 px-4 py-3">
            <p className="text-sm font-semibold text-slate-900">
              Switch branch
            </p>

            <p className="mt-1 text-xs leading-5 text-slate-500">
              Choose the branch you want to
              work with. Your access is
              checked by MOVA.
            </p>
          </div>

          {error && (
            <div className="mx-3 mt-3 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-xs leading-5 text-red-700">
              {error}
            </div>
          )}

          <div
            className="max-h-80 overflow-y-auto p-2"
            role="listbox"
          >
            {branches.map(
              (item) => {
                const id =
                  item._id ||
                  item.id;

                const isActive =
                  id ===
                  currentBranch._id;

                const isSwitching =
                  switchingId ===
                  id;

                return (
                  <button
                    key={id}
                    type="button"
                    role="option"
                    aria-selected={
                      isActive
                    }
                    disabled={
                      switchingId !==
                        null
                    }
                    onClick={() =>
                      handleSwitch(
                        id
                      )
                    }
                    className={`flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left transition ${
                      isActive
                        ? "bg-slate-100"
                        : "hover:bg-slate-50"
                    } ${
                      switchingId !==
                      null
                        ? "cursor-not-allowed opacity-70"
                        : ""
                    }`}
                  >
                    <div
                      className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${
                        isActive
                          ? "bg-slate-900 text-white"
                          : "bg-slate-100 text-slate-500"
                      }`}
                    >
                      {isSwitching ? (
                        <Loader2
                          size={17}
                          className="animate-spin"
                        />
                      ) : (
                        <GitBranch
                          size={17}
                        />
                      )}
                    </div>

                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <p className="truncate text-sm font-semibold text-slate-800">
                          {item.name}
                        </p>

                        {item.code && (
                          <span className="shrink-0 rounded-md bg-slate-100 px-1.5 py-0.5 text-[10px] font-bold uppercase text-slate-500">
                            {item.code}
                          </span>
                        )}
                      </div>

                      {item.address && (
                        <p className="mt-0.5 truncate text-xs text-slate-400">
                          {item.address}
                        </p>
                      )}
                    </div>

                    {isActive && (
                      <Check
                        size={17}
                        className="shrink-0 text-emerald-600"
                      />
                    )}
                  </button>
                );
              }
            )}
          </div>

          <div className="border-t border-slate-100 bg-slate-50 px-4 py-3">
            <p className="text-[11px] leading-5 text-slate-500">
              Sales, inventory and other
              branch operations will use the
              selected branch.
            </p>
          </div>
        </div>
      )}
    </div>
  );
};

export default BranchSelector;