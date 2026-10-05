import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";

import PWAInstallPrompt from "./components/PWAInstallPrompt";
import NetworkStatus from "./components/NetworkStatus";

/*
|--------------------------------------------------------------------------
| Authentication
|--------------------------------------------------------------------------
*/

import Login from "./pages/auth/Login";
import Register from "./pages/auth/Register";

/*
|--------------------------------------------------------------------------
| Main Pages
|--------------------------------------------------------------------------
*/

import Dashboard from "./pages/Dashboard/Dashboard";
import POS from "./pages/pos/POS";
import Products from "./pages/products/Products";
import Inventory from "./pages/inventory/Inventory";
import Sales from "./pages/sales/Sales";
import Customers from "./pages/customers/Customers";
import Suppliers from "./pages/suppliers/Suppliers";
import Purchases from "./pages/purchases/Purchases";
import Expenses from "./pages/expenses/Expenses";
import Employees from "./pages/employees/Employees";
import Reports from "./pages/reports/Reports";
import Intelligence from "./pages/intelligence/Intelligence";
import OnlineStore from "./pages/online-store/OnlineStore";
import Settings from "./pages/settings/Settings";

/*
|--------------------------------------------------------------------------
| Setup
|--------------------------------------------------------------------------
*/

import BusinessSetup from "./pages/setup/BusinessSetup";

/*
|--------------------------------------------------------------------------
| Protected Route
|--------------------------------------------------------------------------
*/

import ProtectedRoute from "./components/ProtectedRoute";


function App() {
  return (
    <BrowserRouter>
      <Routes>

        {/* ============================================================
            PUBLIC ROUTES
        ============================================================ */}

        <Route
          path="/login"
          element={<Login />}
        />

        <Route
          path="/register"
          element={<Register />}
        />


        {/* ============================================================
            BUSINESS SETUP
        ============================================================ */}

        <Route
          path="/setup"
          element={
            <ProtectedRoute>
              <BusinessSetup />
            </ProtectedRoute>
          }
        />


        {/* ============================================================
            PROTECTED MOVA APPLICATION
        ============================================================ */}

        <Route
          path="/dashboard"
          element={
            <ProtectedRoute>
              <Dashboard />
            </ProtectedRoute>
          }
        />

        <Route
          path="/pos"
          element={
            <ProtectedRoute>
              <POS />
            </ProtectedRoute>
          }
        />

        <Route
          path="/products"
          element={
            <ProtectedRoute>
              <Products />
            </ProtectedRoute>
          }
        />

        <Route
          path="/inventory"
          element={
            <ProtectedRoute>
              <Inventory />
            </ProtectedRoute>
          }
        />

        <Route
          path="/sales"
          element={
            <ProtectedRoute>
              <Sales />
            </ProtectedRoute>
          }
        />

        <Route
          path="/customers"
          element={
            <ProtectedRoute>
              <Customers />
            </ProtectedRoute>
          }
        />

        <Route
          path="/suppliers"
          element={
            <ProtectedRoute>
              <Suppliers />
            </ProtectedRoute>
          }
        />

        <Route
          path="/purchases"
          element={
            <ProtectedRoute>
              <Purchases />
            </ProtectedRoute>
          }
        />

        <Route
          path="/expenses"
          element={
            <ProtectedRoute>
              <Expenses />
            </ProtectedRoute>
          }
        />

        <Route
          path="/employees"
          element={
            <ProtectedRoute>
              <Employees />
            </ProtectedRoute>
          }
        />

        <Route
          path="/reports"
          element={
            <ProtectedRoute>
              <Reports />
            </ProtectedRoute>
          }
        />

        <Route
          path="/intelligence"
          element={
            <ProtectedRoute>
              <Intelligence />
            </ProtectedRoute>
          }
        />

        <Route
          path="/online-store"
          element={
            <ProtectedRoute>
              <OnlineStore />
            </ProtectedRoute>
          }
        />

        <Route
          path="/settings"
          element={
            <ProtectedRoute>
              <Settings />
            </ProtectedRoute>
          }
        />


        {/* ============================================================
            DEFAULT ROUTE
        ============================================================ */}

        <Route
          path="/"
          element={
            <Navigate
              to="/dashboard"
              replace
            />
          }
        />


        {/* ============================================================
            FALLBACK
        ============================================================ */}

        <Route
          path="*"
          element={
            <Navigate
              to="/dashboard"
              replace
            />
          }
        />

      </Routes>


      {/* ==============================================================
          PWA UI
      ============================================================== */}

      <PWAInstallPrompt />

      <NetworkStatus />

    </BrowserRouter>
  );
}

export default App;