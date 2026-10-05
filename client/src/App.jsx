
import {
  Navigate,
  Route,
  Routes,
} from "react-router-dom";

import ProtectedRoute from "./components/ProtectedRoute";
import SetupGuard from "./components/SetupGuard";
import ForgotPassword from "./pages/auth/ForgotPassword";
import ResetPassword from "./pages/auth/ResetPassword";

import PWAInstallPrompt from "./components/PWAInstallPrompt";
import NetworkStatus from "./components/NetworkStatus";

import DashboardLayout from "./layouts/DashboardLayout";
import AuthLayout from "./layouts/AuthLayout";

// ============================================================
// AUTHENTICATION
// ============================================================

import Login from "./pages/auth/Login";
import Register from "./pages/auth/Register";

// ============================================================
// DASHBOARD
// ============================================================

import Dashboard from "./pages/dashboard/Dashboard";

// ============================================================
// BUSINESS MODULES
// ============================================================

import POS from "./pages/pos/POS";
import Products from "./pages/products/Products";
import Categories from "./pages/products/Categories";
import Inventory from "./pages/inventory/Inventory";

import Suppliers from "./pages/suppliers/Suppliers";
import Purchases from "./pages/purchases/Purchases";
import Expenses from "./pages/expenses/Expenses";

import Payments from "./pages/payments/Payments";
import Sales from "./pages/sales/Sales";
import Receipts from "./pages/receipts/Receipts";
import Customers from "./pages/customers/Customers";

import Reports from "./pages/reports/Reports";
import Settings from "./pages/settings/Settings";

// ============================================================
// SETUP
// ============================================================

import BusinessSetup from "./pages/setup/BusinessSetup";
import BranchSetup from "./pages/setup/BranchSetup";
import ReceiptSetup from "./pages/setup/ReceiptSetup";

const App = () => {
  return (
    <>
      <Routes>

        {/* =====================================================
            AUTHENTICATION ROUTES
        ===================================================== */}

        <Route element={<AuthLayout />}>

          <Route
            path="/login"
            element={<Login />}
          />

          <Route
            path="/register"
            element={<Register />}
          />

        </Route>


        {/* =====================================================
            SETUP ROUTES
        ===================================================== */}

        <Route
          element={
            <ProtectedRoute>
              <SetupGuard />
            </ProtectedRoute>
          }
        >

          <Route
            path="/setup/business"
            element={<BusinessSetup />}
          />

          <Route
            path="/setup/branch"
            element={<BranchSetup />}
          />

          <Route
            path="/setup/receipt"
            element={<ReceiptSetup />}
          />
          <Route element={<AuthLayout />}>
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
            <Route
              path="/forgot-password"
              element={<ForgotPassword />}
            />
            <Route
              path="/reset-password/:token"
              element={<ResetPassword />}
            />
          </Route>

        </Route>


        {/* =====================================================
            MAIN MOVA APPLICATION
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

          {/* ===================================================
              DASHBOARD
          =================================================== */}

          <Route
            index
            element={<Dashboard />}
          />


          {/* ===================================================
              POINT OF SALE
          =================================================== */}

          <Route
            path="pos"
            element={<POS />}
          />


          {/* ===================================================
              PRODUCTS
          =================================================== */}

          <Route
            path="products"
            element={<Products />}
          />

          <Route
            path="products/categories"
            element={<Categories />}
          />


          {/* ===================================================
              INVENTORY
          =================================================== */}

          <Route
            path="inventory"
            element={<Inventory />}
          />


          {/* ===================================================
              SUPPLIERS
          =================================================== */}

          <Route
            path="suppliers"
            element={<Suppliers />}
          />


          {/* ===================================================
              PURCHASES
          =================================================== */}

          <Route
            path="purchases"
            element={<Purchases />}
          />


          {/* ===================================================
              EXPENSES
          =================================================== */}

          <Route
            path="expenses"
            element={<Expenses />}
          />


          {/* ===================================================
              PAYMENTS
          =================================================== */}

          <Route
            path="payments"
            element={<Payments />}
          />


          {/* ===================================================
              SALES
          =================================================== */}

          <Route
            path="sales"
            element={<Sales />}
          />


          {/* ===================================================
              RECEIPTS
          =================================================== */}

          <Route
            path="receipts"
            element={<Receipts />}
          />


          {/* ===================================================
              CUSTOMERS
          =================================================== */}

          <Route
            path="customers"
            element={<Customers />}
          />


          {/* ===================================================
              REPORTS
          =================================================== */}

          <Route
            path="reports"
            element={<Reports />}
          />


          {/* ===================================================
              SETTINGS
          =================================================== */}

          <Route
            path="settings"
            element={<Settings />}
          />

        </Route>


        {/* =====================================================
            DEFAULT ROUTE
        ===================================================== */}

        <Route
          path="/"
          element={
            <Navigate
              to="/app"
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
              to="/app"
              replace
            />
          }
        />

      </Routes>


      {/* =======================================================
          GLOBAL PWA COMPONENTS
      ======================================================= */}

      <PWAInstallPrompt />

      <NetworkStatus />

    </>
  );
};

export default App;