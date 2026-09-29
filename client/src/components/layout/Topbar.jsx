import {
  Bell,
  Menu,
  Search,
  UserCircle,
} from "lucide-react";

import { useAuth } from "../../context/AuthContext";

const Topbar = ({ onMenuClick }) => {
  const { user, business } = useAuth();

  const firstName = user?.name?.split(" ")[0] || "User";

  return (
    <header className="sticky top-0 z-30 flex h-20 items-center justify-between border-b border-slate-200 bg-white/95 px-4 backdrop-blur sm:px-6 lg:px-8">
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={onMenuClick}
          className="rounded-xl p-2.5 text-slate-600 hover:bg-slate-100 lg:hidden"
          aria-label="Open menu"
        >
          <Menu size={22} />
        </button>

        {/* Search */}
        <button
          type="button"
          className="hidden h-11 w-72 items-center gap-3 rounded-xl border border-slate-200 bg-slate-50 px-4 text-left text-sm text-slate-400 transition hover:border-slate-300 md:flex"
        >
          <Search size={18} />

          <span>Search anything...</span>

          <span className="ml-auto rounded-md border border-slate-200 bg-white px-2 py-1 text-[10px] font-bold text-slate-400">
            Ctrl K
          </span>
        </button>
      </div>

      <div className="flex items-center gap-2 sm:gap-4">
        {/* Mobile search */}
        <button
          type="button"
          className="rounded-xl p-2.5 text-slate-500 hover:bg-slate-100 md:hidden"
          aria-label="Search"
        >
          <Search size={20} />
        </button>

        {/* Notifications */}
        <button
          type="button"
          className="relative rounded-xl p-2.5 text-slate-500 hover:bg-slate-100"
          aria-label="Notifications"
        >
          <Bell size={20} />

          <span className="absolute right-2 top-2 h-2 w-2 rounded-full bg-blue-600 ring-2 ring-white" />
        </button>

        <div className="hidden h-8 w-px bg-slate-200 sm:block" />

        {/* User */}
        <div className="flex items-center gap-3">
          <div className="hidden text-right sm:block">
            <p className="text-sm font-bold text-slate-900">
              {firstName}
            </p>

            <p className="text-xs text-slate-400">
              {business?.name || "MOVA Business"}
            </p>
          </div>

          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-50 text-blue-600">
            <UserCircle size={24} />
          </div>
        </div>
      </div>
    </header>
  );
};

export default Topbar;