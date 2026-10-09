
import { Routes, Route, Navigate } from "react-router-dom";

import ProtectedRoute from "./components/ProtectedRoute";
import SetupGuard from "./components/SetupGuard";

import DashboardLayout from "./layouts/DashboardLayout";

import Login from "./pages/auth/Login";
import Branches from "./pages/branches/Branches";

import Dashboard from "./pages/dashboard/Dashboard";
import POS from "./pages/pos/POS";
import Sales from "./pages/sales/Sales";
import Payments from "./pages/payments/Payments";
import Receipts from "./pages/receipts/Receipts";

import Products from "./pages/products/Products";
import Inventory from "./pages/inventory/Inventory";
import Categories from "./pages/products/Categories";

import Customers from "./pages/customers/Customers";
import Suppliers from "./pages/suppliers/Suppliers";

import Purchases from "./pages/purchases/Purchases";
import Expenses from "./pages/expenses/Expenses";

import Reports from "./pages/reports/Reports";

import Users from "./pages/users/Users";
import Shifts from "./pages/shifts/Shifts";
import AuditLogs from "./pages/audit/AuditLogs";

import Settings from "./pages/settings/Settings";

import BusinessSetup from "./pages/setup/BusinessSetup";
import BranchSetup from "./pages/setup/BranchSetup";
import ReceiptSetup from "./pages/setup/ReceiptSetup";


function App() {
  return (
    <Routes>

      {/* =========================================================
          PUBLIC ROUTES
      ========================================================= */}

      <Route
        path="/login"
        element={<Login />}
      />


      {/* =========================================================
          BUSINESS SETUP
      ========================================================= */}

      <Route
        path="/setup"
        element={
          <ProtectedRoute>
            <BusinessSetup />
          </ProtectedRoute>
        }
      />


      {/* =========================================================
          MAIN APPLICATION
      ========================================================= */}

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


        {/* =======================================================
            POINT OF SALE
        ======================================================= */}

        <Route
          path="pos"
          element={<POS />}
        />


        {/* =======================================================
            SALES
        ======================================================= */}

        <Route
          path="sales"
          element={<Sales />}
        />


        {/* =======================================================
            PAYMENTS
        ======================================================= */}

        <Route
          path="payments"
          element={<Payments />}
        />


        {/* =======================================================
            RECEIPTS
        ======================================================= */}

        <Route
          path="receipts"
          element={<Receipts />}
        />


        {/* =======================================================
            PRODUCTS
        ======================================================= */}

        <Route
          path="products"
          element={<Products />}
        />

        <Route
          path="categories"
          element={<Categories />}
        />


        {/* =======================================================
            INVENTORY
        ======================================================= */}

        <Route
          path="inventory"
          element={<Inventory />}
        />

          <Route
            path="branches"
            element={<Branches />}
          />
        {/* =======================================================
            CUSTOMERS
        ======================================================= */}

        <Route
          path="customers"
          element={<Customers />}
        />


        {/* =======================================================
            SUPPLIERS
        ======================================================= */}

        <Route
          path="suppliers"
          element={<Suppliers />}
        />


        {/* =======================================================
            PURCHASES
        ======================================================= */}

        <Route
          path="purchases"
          element={<Purchases />}
        />


        {/* =======================================================
            EXPENSES
        ======================================================= */}

        <Route
          path="expenses"
          element={<Expenses />}
        />


        {/* =======================================================
            REPORTS
        ======================================================= */}

        <Route
          path="reports"
          element={<Reports />}
        />


        {/* =======================================================
            USER MANAGEMENT
        ======================================================= */}

        <Route
          path="users"
          element={<Users />}
        />

        <Route
          path="shifts"
          element={<Shifts />}
        />


        {/* =======================================================
            AUDIT LOGS
        ======================================================= */}

        <Route
          path="audit-logs"
          element={<AuditLogs />}
        />


        {/* =======================================================
            SETTINGS
        ======================================================= */}

        <Route
          path="settings"
          element={<Settings />}
        />


        {/* =======================================================
            SETUP SUB-PAGES
        ======================================================= */}

        <Route
          path="setup/business"
          element={<BusinessSetup />}
        />

        <Route
          path="setup/branch"
          element={<BranchSetup />}
        />

        <Route
          path="setup/receipt"
          element={<ReceiptSetup />}
        />

      </Route>


      {/* =========================================================
          ROOT
      ========================================================= */}

      <Route
        path="/"
        element={
          <Navigate
            to="/app"
            replace
          />
        }
      />


      {/* =========================================================
          UNKNOWN ROUTES
      ========================================================= */}

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
}


export default App;
