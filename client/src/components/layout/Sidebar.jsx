
import {
  Banknote,
  BarChart3,
  Boxes,
  Building2,
  ClipboardList,
  FileClock,
  LayoutDashboard,
  Package,
  ReceiptText,
  Settings,
  ShoppingCart,
  Store,
  Truck,
  UserCog,
  Users,
  X,
} from "lucide-react";

import {
  NavLink,
} from "react-router-dom";

import {
  useAuth,
} from "../../context/AuthContext";


const Sidebar = ({
  open,
  onClose,
}) => {

  const {
    user,
  } = useAuth();


  /*
  |--------------------------------------------------------------------------
  | ROLE
  |--------------------------------------------------------------------------
  */

  const role =
    String(
      user?.role || ""
    ).toUpperCase();


  /*
  |--------------------------------------------------------------------------
  | ACCESS HELPERS
  |--------------------------------------------------------------------------
  */

  const canManageBranches =
    [
      "OWNER",
      "ADMIN",
      "MANAGER",
    ].includes(role);


  const canViewUsers =
    [
      "OWNER",
      "ADMIN",
      "MANAGER",
    ].includes(role);


  const canViewAudit =
    [
      "OWNER",
      "ADMIN",
    ].includes(role);


  /*
  |--------------------------------------------------------------------------
  | MAIN NAVIGATION
  |--------------------------------------------------------------------------
  */

  const navigation = [
    {
      label: "Overview",
      icon: LayoutDashboard,
      path: "/app",
    },

    {
      label: "Point of Sale",
      icon: ShoppingCart,
      path: "/app/pos",
    },

    {
      label: "Products",
      icon: Package,
      path: "/app/products",
    },

    {
      label: "Categories",
      icon: Boxes,
      path: "/app/products/categories",
    },

    {
      label: "Inventory",
      icon: ClipboardList,
      path: "/app/inventory",
    },

    {
      label: "Suppliers",
      icon: Truck,
      path: "/app/suppliers",
    },

    {
      label: "Purchases",
      icon: ShoppingCart,
      path: "/app/purchases",
    },

    {
      label: "Expenses",
      icon: Banknote,
      path: "/app/expenses",
    },

    {
      label: "Payments",
      icon: Banknote,
      path: "/app/payments",
    },

    {
      label: "Sales",
      icon: BarChart3,
      path: "/app/sales",
    },

    {
      label: "Receipts",
      icon: ReceiptText,
      path: "/app/receipts",
    },

    {
      label: "Customers",
      icon: Users,
      path: "/app/customers",
    },

    {
      label: "Reports",
      icon: BarChart3,
      path: "/app/reports",
    },
  ];


  /*
  |--------------------------------------------------------------------------
  | MANAGEMENT NAVIGATION
  |--------------------------------------------------------------------------
  */

  const managementNavigation = [];


  if (canManageBranches) {
    managementNavigation.push({
      label: "Branches",
      icon: Building2,
      path: "/app/branches",
    });
  }


  if (canViewUsers) {
    managementNavigation.push({
      label: "Users",
      icon: UserCog,
      path: "/app/users",
    });
  }


  if (canViewAudit) {
    managementNavigation.push({
      label: "Audit Logs",
      icon: FileClock,
      path: "/app/audit-logs",
    });
  }


  /*
  |--------------------------------------------------------------------------
  | RENDER NAVIGATION ITEM
  |--------------------------------------------------------------------------
  */

  const renderItem = (
    item
  ) => {
    const Icon =
      item.icon;

    return (
      <NavLink
        key={item.path}
        to={item.path}
        end={
          item.path ===
          "/app"
        }
        onClick={
          onClose
        }
        className={({ isActive }) =>
          `group flex items-center gap-3 rounded-xl px-3 py-3 text-sm font-bold transition ${
            isActive
              ? "bg-blue-50 text-blue-700"
              : "text-slate-600 hover:bg-slate-50 hover:text-slate-950"
          }`
        }
      >
        {({
          isActive,
        }) => (
          <>
            <Icon
              size={19}
              className={
                isActive
                  ? "text-blue-600"
                  : "text-slate-400 group-hover:text-slate-600"
              }
            />

            <span>
              {
                item.label
              }
            </span>
          </>
        )}
      </NavLink>
    );
  };


  return (
    <>
      {/* MOBILE OVERLAY */}

      {open && (
        <button
          type="button"
          aria-label="Close sidebar"
          onClick={
            onClose
          }
          className="fixed inset-0 z-40 bg-slate-950/40 lg:hidden"
        />
      )}


      {/* SIDEBAR */}

      <aside
        className={`fixed inset-y-0 left-0 z-50 flex w-72 flex-col border-r border-slate-200 bg-white transition-transform duration-300 lg:static lg:translate-x-0 ${
          open
            ? "translate-x-0"
            : "-translate-x-full"
        }`}
      >

        {/* BRAND */}

        <div className="flex h-20 items-center justify-between border-b border-slate-100 px-6">

          <div className="flex items-center gap-3">

            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-600 text-white shadow-lg shadow-blue-600/20">
              <Store
                size={21}
              />
            </div>

            <div>

              <p className="text-xl font-black tracking-tight text-slate-950">
                MOVA
              </p>

              <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-slate-400">
                Business OS
              </p>

            </div>

          </div>


          <button
            type="button"
            onClick={
              onClose
            }
            aria-label="Close sidebar"
            className="rounded-lg p-2 text-slate-400 transition hover:bg-slate-100 lg:hidden"
          >
            <X
              size={19}
            />
          </button>

        </div>


        {/* NAVIGATION */}

        <nav className="flex-1 space-y-1 overflow-y-auto px-4 py-5">

          {/* WORKSPACE */}

          <p className="mb-3 px-3 text-[10px] font-black uppercase tracking-[0.18em] text-slate-400">
            Workspace
          </p>

          {navigation.map(
            renderItem
          )}


          {/* MANAGEMENT */}

          {managementNavigation.length >
            0 && (
            <div className="mt-7">

              <p className="mb-3 px-3 text-[10px] font-black uppercase tracking-[0.18em] text-slate-400">
                Management
              </p>

              <div className="space-y-1">
                {managementNavigation.map(
                  renderItem
                )}
              </div>

            </div>
          )}


          {/* SETTINGS */}

          <div className="mt-7">

            <p className="mb-3 px-3 text-[10px] font-black uppercase tracking-[0.18em] text-slate-400">
              System
            </p>

            {renderItem({
              label: "Settings",
              icon: Settings,
              path: "/app/settings",
            })}

          </div>

        </nav>


        {/* FOOTER */}

        <div className="border-t border-slate-100 p-4">

          <div className="rounded-2xl bg-slate-50 p-4">

            <p className="text-xs font-bold text-slate-700">
              MOVA
            </p>

            <p className="mt-1 text-xs leading-5 text-slate-400">
              Sell smart. Know more.
              Grow faster.
            </p>

          </div>

        </div>

      </aside>
    </>
  );
};


export default Sidebar;