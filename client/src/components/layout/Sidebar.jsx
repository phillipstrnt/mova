
import {
  Banknote,
  BarChart3,
  ClipboardList,
  LayoutDashboard,
  LogOut,
  ReceiptText,
  ShoppingCart,
  Store,
  Users,
  X,
  Package,
  Boxes,
  Truck,
  Settings,
} from "lucide-react";

import {
  NavLink,
  useNavigate,
} from "react-router-dom";

import { useAuth } from "../../context/AuthContext";

const ROLE_NAVIGATION = {
  OWNER: [
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
    {
      label: "Users",
      icon: Users,
      path: "/app/users",
    },
    {
      label: "Branches",
      icon: Store,
      path: "/app/branches",
    },
    {
      label: "Audit Logs",
      icon: ClipboardList,
      path: "/app/audit-logs",
    },
    {
      label: "Settings",
      icon: Settings,
      path: "/app/settings",
    },
  ],

  ADMIN: [
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
    {
      label: "Users",
      icon: Users,
      path: "/app/users",
    },
    {
      label: "Branches",
      icon: Store,
      path: "/app/branches",
    },
    {
      label: "Audit Logs",
      icon: ClipboardList,
      path: "/app/audit-logs",
    },
    {
      label: "Settings",
      icon: Settings,
      path: "/app/settings",
    },
  ],

  MANAGER: [
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
    {
      label: "Users",
      icon: Users,
      path: "/app/users",
    },
    {
      label: "Branches",
      icon: Store,
      path: "/app/branches",
    },
    {
      label: "Settings",
      icon: Settings,
      path: "/app/settings",
    },
  ],

  INVENTORY_MANAGER: [
    {
      label: "Overview",
      icon: LayoutDashboard,
      path: "/app",
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
      label: "Customers",
      icon: Users,
      path: "/app/customers",
    },
    {
      label: "Sales",
      icon: BarChart3,
      path: "/app/sales",
    },
    {
      label: "Reports",
      icon: BarChart3,
      path: "/app/reports",
    },
  ],

  ACCOUNTANT: [
    {
      label: "Overview",
      icon: LayoutDashboard,
      path: "/app",
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
      label: "Payments",
      icon: Banknote,
      path: "/app/payments",
    },
    {
      label: "Expenses",
      icon: Banknote,
      path: "/app/expenses",
    },
    {
      label: "Customers",
      icon: Users,
      path: "/app/customers",
    },
    {
      label: "Suppliers",
      icon: Truck,
      path: "/app/suppliers",
    },
    {
      label: "Reports",
      icon: BarChart3,
      path: "/app/reports",
    },
  ],

  CASHIER: [
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
      label: "Payments",
      icon: Banknote,
      path: "/app/payments",
    },
  ],
};

const Sidebar = ({
  open,
  onClose,
}) => {
  const navigate = useNavigate();

  const {
    user,
    logout,
  } = useAuth();

  const role =
    user?.role || "CASHIER";

  const navigation =
    ROLE_NAVIGATION[role] ||
    ROLE_NAVIGATION.CASHIER;

  const handleLogout = async () => {
    const confirmed =
      window.confirm(
        "Are you sure you want to log out of MOVA?"
      );

    if (!confirmed) {
      return;
    }

    try {
      if (typeof logout === "function") {
        await logout();
      }
    } catch (error) {
      console.error(
        "MOVA logout error:",
        error
      );
    }

    /*
     * Always clear local authentication.
     */
    localStorage.removeItem(
      "mova_token"
    );

    localStorage.removeItem(
      "mova_user"
    );

    localStorage.removeItem(
      "mova_business"
    );

    localStorage.removeItem(
      "mova_branch"
    );

    localStorage.removeItem(
      "mova_branches"
    );

    if (onClose) {
      onClose();
    }

    navigate(
      "/login",
      {
        replace: true,
      }
    );
  };

  return (
    <>
      {open && (
        <div
          className="fixed inset-0 z-40 bg-black/40 lg:hidden"
          onClick={onClose}
        />
      )}

      <aside
        className={`
          fixed inset-y-0 left-0 z-50
          flex w-72 flex-col
          border-r border-slate-200
          bg-white
          shadow-xl
          transition-transform duration-300
          lg:static lg:z-auto
          lg:translate-x-0
          lg:shadow-none
          ${
            open
              ? "translate-x-0"
              : "-translate-x-full"
          }
        `}
      >
        {/* HEADER */}
        <div className="flex h-20 items-center justify-between border-b border-slate-200 px-5">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-900 text-white">
              <Store size={21} />
            </div>

            <div>
              <h1 className="text-lg font-bold tracking-tight text-slate-900">
                MOVA
              </h1>

              <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-500">
                Business Platform
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 lg:hidden"
            aria-label="Close sidebar"
          >
            <X size={20} />
          </button>
        </div>

        {/* CURRENT ROLE */}
        <div className="border-b border-slate-200 px-4 py-3">
          <div className="rounded-xl bg-slate-50 px-3 py-2">
            <p className="text-[10px] font-bold uppercase tracking-[0.15em] text-slate-400">
              Signed in as
            </p>

            <p className="mt-1 text-sm font-bold text-slate-900">
              {user?.name || "MOVA User"}
            </p>

            <p className="mt-0.5 text-xs font-semibold uppercase text-slate-500">
              {role.replaceAll("_", " ")}
            </p>
          </div>
        </div>

        {/* NAVIGATION */}
        <nav className="flex-1 overflow-y-auto px-3 py-5">
          <div className="space-y-1">
            {navigation.map(
              (item) => {
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
                    onClick={onClose}
                    className={({
                      isActive,
                    }) =>
                      `
                      group flex items-center gap-3
                      rounded-xl px-3 py-3
                      text-sm font-medium
                      transition-all
                      ${
                        isActive
                          ? "bg-slate-900 text-white shadow-sm"
                          : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
                      }
                      `
                    }
                  >
                    {({
                      isActive,
                    }) => (
                      <>
                        <Icon
                          size={19}
                          strokeWidth={
                            isActive
                              ? 2.3
                              : 2
                          }
                          className="shrink-0"
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
              }
            )}
          </div>
        </nav>

        {/* FOOTER */}
        <div className="border-t border-slate-200 p-3">
          <button
            type="button"
            onClick={
              handleLogout
            }
            className="
              flex w-full items-center gap-3
              rounded-xl px-3 py-3
              text-sm font-semibold
              text-red-600
              transition
              hover:bg-red-50
              hover:text-red-700
              focus:outline-none
              focus:ring-2
              focus:ring-red-200
            "
          >
            <LogOut size={19} />

            <span>
              Logout
            </span>
          </button>
        </div>
      </aside>
    </>
  );
};

export default Sidebar;