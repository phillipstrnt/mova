
import {
  Navigate,
  Route,
  Routes,
} from "react-router-dom";

import DashboardLayout from "./layouts/DashboardLayout";

// ==========================================
// AUTHENTICATION PAGES
// ==========================================

import Login from "./pages/auth/Login";
import Register from "./pages/auth/Register";
import ForgotPassword from "./pages/auth/ForgotPassword";

// ==========================================
// APPLICATION PAGES
// ==========================================

import Dashboard from "./pages/dashboard/Dashboard";
import POS from "./pages/pos/POS";
import Sales from "./pages/Sales/Sales";
import Payments from "./pages/payments/Payments";
import Receipts from "./pages/receipts/Receipts";
import Products from "./pages/products/Products";
import Inventory from "./pages/inventory/Inventory";
import Customers from "./pages/customers/Customers";
import Suppliers from "./pages/suppliers/Suppliers";
import Purchases from "./pages/purchases/Purchases";
import Expenses from "./pages/expenses/Expenses";
import Reports from "./pages/reports/Reports";

// ==========================================
// TEMPORARY MODULE COMPONENT
// ==========================================

const ModulePage = ({
  title,
  description,
}) => {
  return (
    <div className="space-y-6">

      {/* Header */}

      <div>
        <h1 className="text-2xl font-bold text-slate-900">
          {title}
        </h1>

        <p className="mt-1 text-sm text-slate-500">
          {description}
        </p>
      </div>

      {/* Module Card */}

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

// ==========================================
// PROTECTED ROUTE
// ==========================================

const ProtectedRoute = ({
  children,
}) => {
  const token =
    localStorage.getItem("mova_token");

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

// ==========================================
// APPLICATION
// ==========================================

const App = () => {
  return (
    <Routes>

      {/* ====================================
          PUBLIC ROUTES
      ==================================== */}

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


      {/* ====================================
          PROTECTED APPLICATION
      ==================================== */}

      <Route
        path="/app"
        element={
          <ProtectedRoute>
            <DashboardLayout />
          </ProtectedRoute>
        }
      >

        {/* ==================================
            DASHBOARD
        ================================== */}

        <Route
          index
          element={<Dashboard />}
        />


        {/* ==================================
            POINT OF SALE
        ================================== */}

        <Route
          path="pos"
          element={<POS />}
        />


        {/* ==================================
            SALES
        ================================== */}

        <Route
          path="sales"
          element={<Sales />}
        />


        {/* ==================================
            PAYMENTS
        ================================== */}

        <Route
          path="payments"
          element={<Payments />}
        />


        {/* ==================================
            RECEIPTS
        ================================== */}

        <Route
          path="receipts"
          element={<Receipts />}
        />


        {/* ==================================
            PRODUCTS
        ================================== */}

        <Route
          path="products"
          element={<Products />}
        />


        {/* ==================================
            PRODUCT CATEGORIES
        ================================== */}

        <Route
          path="categories"
          element={
            <ModulePage
              title="Categories"
              description="Create and manage product categories to organize your MOVA inventory."
            />
          }
        />

        <Route
          path="products/categories"
          element={
            <ModulePage
              title="Categories"
              description="Create and manage product categories to organize your MOVA inventory."
            />
          }
        />


        {/* ==================================
            INVENTORY
        ================================== */}

        <Route
          path="inventory"
          element={<Inventory />}
        />


        {/* ==================================
            CUSTOMERS
        ================================== */}

        <Route
          path="customers"
          element={<Customers />}
        />


        {/* ==================================
            SUPPLIERS
        ================================== */}

        <Route
          path="suppliers"
          element={<Suppliers />}
        />


        {/* ==================================
            PURCHASES
        ================================== */}

        <Route
          path="purchases"
          element={<Purchases />}
        />


        {/* ==================================
            EXPENSES
        ================================== */}

        <Route
          path="expenses"
          element={<Expenses />}
        />


        {/* ==================================
            REPORTS
        ================================== */}

        <Route
          path="reports"
          element={<Reports />}
        />


        {/* ==================================
            SETTINGS
        ================================== */}

        <Route
          path="settings"
          element={
            <ModulePage
              title="Settings"
              description="Configure your MOVA business, application preferences, users and system settings."
            />
          }
        />


        {/* ==================================
            UNKNOWN /APP ROUTES
        ================================== */}

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


      {/* ====================================
          ROOT ROUTE
      ==================================== */}

      <Route
        path="/"
        element={
          <Navigate
            to="/app"
            replace
          />
        }
      />


      {/* ====================================
          UNKNOWN ROUTES
      ==================================== */}

      <Route
        path="*"
        element={
          <Navigate
            to="/app"
            replace
          />
        }
      />

    </Routes>
  );
};

export default App;