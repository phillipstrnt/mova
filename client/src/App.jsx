import {
  Navigate,
  Route,
  Routes,
} from "react-router-dom";

import DashboardLayout from "./layouts/DashboardLayout";
import SetupGuard from "./components/SetupGuard";

// AUTH
import Login from "./pages/auth/Login";
import Register from "./pages/auth/Register";
import ForgotPassword from "./pages/auth/ForgotPassword";

// SETUP
import BusinessSetup from "./pages/setup/BusinessSetup";
import BranchSetup from "./pages/setup/BranchSetup";
import ReceiptSetup from "./pages/setup/ReceiptSetup";

// APP
import Dashboard from "./pages/dashboard/Dashboard";
import POS from "./pages/pos/POS";
import Sales from "./pages/sales/Sales";
import Payments from "./pages/payments/Payments";
import Receipts from "./pages/receipts/Receipts";
import Products from "./pages/products/Products";
import Categories from "./pages/products/Categories";
import Inventory from "./pages/inventory/Inventory";
import Customers from "./pages/customers/Customers";
import Suppliers from "./pages/suppliers/Suppliers";
import Purchases from "./pages/purchases/Purchases";
import Expenses from "./pages/expenses/Expenses";
import Reports from "./pages/reports/Reports";

const ProtectedRoute = ({ children }) => {
  const token = localStorage.getItem("mova_token");

  if (!token) {
    return (
      <Navigate
        to="/login"
        replace
      />
    );
  }

  return children;
};

const ModulePage = ({
  title,
  description,
}) => {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">
          {title}
        </h1>

        <p className="mt-1 text-sm text-slate-500">
          {description}
        </p>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-10 shadow-sm">
        <div className="text-center">
          <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-2xl bg-slate-100">
            <span className="text-2xl font-bold text-slate-700">
              M
            </span>
          </div>

          <h2 className="text-xl font-semibold text-slate-900">
            {title}
          </h2>

          <p className="mx-auto mt-3 max-w-lg text-sm leading-6 text-slate-500">
            {description}
          </p>

          <div className="mt-6 inline-flex rounded-full bg-slate-100 px-4 py-2 text-xs font-medium text-slate-600">
            Module under development
          </div>
        </div>
      </div>
    </div>
  );
};

const App = () => {
  return (
    <Routes>
      {/* =====================================================
          AUTH
      ===================================================== */}

      <Route
        path="/login"
        element={<Login />}
      />

      <Route
        path="/register"
        element={<Register />}
      />

      <Route
        path="/forgot-password"
        element={<ForgotPassword />}
      />

      {/* =====================================================
          BUSINESS SETUP
      ===================================================== */}

      <Route
        path="/setup/business"
        element={
          <ProtectedRoute>
            <BusinessSetup />
          </ProtectedRoute>
        }
      />

      {/* =====================================================
          BRANCH SETUP
      ===================================================== */}

      <Route
        path="/setup/branch"
        element={
          <ProtectedRoute>
            <BranchSetup />
          </ProtectedRoute>
        }
      />

      {/* =====================================================
          RECEIPT SETUP
      ===================================================== */}

      <Route
        path="/setup/receipt"
        element={
          <ProtectedRoute>
            <ReceiptSetup />
          </ProtectedRoute>
        }
      />

      {/* =====================================================
          MAIN APPLICATION
      ===================================================== */}

      <Route
        path="/app"
        element={
          <ProtectedRoute>
            <SetupGuard>
              <DashboardLayout />
            </SetupGuard>
          </ProtectedRoute>
        }
      >
        {/* DASHBOARD */}

        <Route
          index
          element={<Dashboard />}
        />

        {/* POS */}

        <Route
          path="pos"
          element={<POS />}
        />

        {/* SALES */}

        <Route
          path="sales"
          element={<Sales />}
        />

        {/* PAYMENTS */}

        <Route
          path="payments"
          element={<Payments />}
        />

        {/* RECEIPTS */}

        <Route
          path="receipts"
          element={<Receipts />}
        />

        {/* PRODUCTS */}

        <Route
          path="products"
          element={<Products />}
        />

        {/* =================================================
            CATEGORIES

            Official Categories URL:

            /app/products/categories
        ================================================= */}

        <Route
          path="products/categories"
          element={<Categories />}
        />

        {/* INVENTORY */}

        <Route
          path="inventory"
          element={<Inventory />}
        />

        {/* CUSTOMERS */}

        <Route
          path="customers"
          element={<Customers />}
        />

        {/* SUPPLIERS */}

        <Route
          path="suppliers"
          element={<Suppliers />}
        />

        {/* PURCHASES */}

        <Route
          path="purchases"
          element={<Purchases />}
        />

        {/* EXPENSES */}

        <Route
          path="expenses"
          element={<Expenses />}
        />

        {/* REPORTS */}

        <Route
          path="reports"
          element={<Reports />}
        />

        {/* SETTINGS */}

        <Route
          path="settings"
          element={
            <ModulePage
              title="Settings"
              description="Configure your MOVA business, application preferences, users and system settings."
            />
          }
        />

        {/* UNKNOWN APP ROUTES */}

        <Route
          path="*"
          element={
            <Navigate
              to="/app"
              replace
            />
          }
        />
      </Route>

      {/* =====================================================
          DEFAULT
      ===================================================== */}

      <Route
        path="/"
        element={
          <Navigate
            to="/login"
            replace
          />
        }
      />

      {/* =====================================================
          UNKNOWN ROUTES
      ===================================================== */}

      <Route
        path="*"
        element={
          <Navigate
            to="/login"
            replace
          />
        }
      />
    </Routes>
  );
};

export default App;