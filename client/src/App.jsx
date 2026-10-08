import {
  Navigate,
  Route,
  Routes,
} from "react-router-dom";

import ProtectedRoute from "./components/ProtectedRoute";
import SetupGuard from "./components/SetupGuard";
import NetworkStatus from "./components/NetworkStatus";
import Users from "./pages/users/Users";
import AuditLogs from "./pages/audit/AuditLogs";

import DashboardLayout from "./layouts/DashboardLayout";
import AuthLayout from "./layouts/AuthLayout";

import Login from "./pages/auth/Login";
import Register from "./pages/auth/Register";
import ForgotPassword from "./pages/auth/ForgotPassword";
import ResetPassword from "./pages/auth/ResetPassword";

import Dashboard from "./pages/dashboard/Dashboard";

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

import BusinessSetup from "./pages/setup/BusinessSetup";
import BranchSetup from "./pages/setup/BranchSetup";
import ReceiptSetup from "./pages/setup/ReceiptSetup";

const App = () => {
  return (
    <>
      <Routes>
        {/* ============================================================
            AUTHENTICATION
        ============================================================ */}

        <Route element={<AuthLayout />}>
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

          <Route
            path="/reset-password/:token"
            element={<ResetPassword />}
          />
        </Route>

        {/* ============================================================
            BUSINESS SETUP
        ============================================================ */}

        <Route
          path="/setup/business"
          element={
            <ProtectedRoute>
              <BusinessSetup />
            </ProtectedRoute>
          }
        />

        {/* ============================================================
            BRANCH SETUP
        ============================================================ */}

        <Route
          path="/setup/branch"
          element={
            <ProtectedRoute>
              <BranchSetup />
            </ProtectedRoute>
          }
        />

        {/* ============================================================
            RECEIPT SETUP
        ============================================================ */}

        <Route
          path="/setup/receipt"
          element={
            <ProtectedRoute>
              <ReceiptSetup />
            </ProtectedRoute>
          }
        />

        {/* ============================================================
            MAIN APPLICATION
        ============================================================ */}

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
          {/* Dashboard */}
          <Route
            index
            element={<Dashboard />}
          />

          {/* POS */}
          <Route
            path="pos"
            element={<POS />}
          />

          {/* Products */}
          <Route
            path="products"
            element={<Products />}
          />

          <Route
            path="products/categories"
            element={<Categories />}
          />

          {/* Inventory */}
          <Route
            path="inventory"
            element={<Inventory />}
          />

          {/* Suppliers */}
          <Route
            path="suppliers"
            element={<Suppliers />}
          />

          {/* Purchases */}
          <Route
            path="purchases"
            element={<Purchases />}
          />

          {/* Expenses */}
          <Route
            path="expenses"
            element={<Expenses />}
          />

          {/* Payments */}
          <Route
            path="payments"
            element={<Payments />}
          />

          {/* Sales */}
          <Route
            path="sales"
            element={<Sales />}
          />

          {/* Receipts */}
          <Route
            path="receipts"
            element={<Receipts />}
          />


          <Route path="/users" element={<Users />} />
          {/* Customers */}
          <Route
            path="customers"
            element={<Customers />}
          />

          {/* Users */} 
            <Route path="/audit-logs" element={<AuditLogs />} />
          {/* Reports */}
          <Route
            path="reports"
            element={<Reports />}
          />

          {/* Settings */}
          <Route
            path="settings"
            element={<Settings />}
          />
        </Route>

        {/* ============================================================
            DEFAULT ROUTES
        ============================================================ */}

        <Route
          path="/"
          element={
            <Navigate
              to="/app"
              replace
            />
          }
        />

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

      {/* Network status remains useful for MOVA. */}
      <NetworkStatus />
    </>
  );
};

export default App;