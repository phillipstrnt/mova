import { Navigate, Route, Routes } from "react-router-dom";

// Layout
import DashboardLayout from "./layouts/DashboardLayout";

// Auth pages
import Login from "./pages/auth/Login";
import Register from "./pages/auth/Register";
import ForgotPassword from "./pages/auth/ForgotPassword";

// Protected pages
import Dashboard from "./pages/dashboard/Dashboard";
import POS from "./pages/pos/POS";
import Sales from "./pages/Sales/Sales";
import Payments from "./pages/payments/Payments";
import Products from "./pages/products/Products";
import Categories from "./pages/categories/Categories";
import Inventory from "./pages/inventory/Inventory";
import Customers from "./pages/customers/Customers";
import Suppliers from "./pages/suppliers/Suppliers";
import Purchases from "./pages/purchases/Purchases";
import Expenses from "./pages/expenses/Expenses";
import Reports from "./pages/reports/Reports";
import Settings from "./pages/settings/Settings";

// Protected route
const ProtectedRoute = ({ children }) => {
  const token = localStorage.getItem("mova_token");

  if (!token) {
    return <Navigate to="/login" replace />;
  }

  return children;
};

const App = () => {
  return (
    <Routes>
      {/* =========================
          PUBLIC ROUTES
      ========================== */}

      <Route path="/login" element={<Login />} />

      <Route path="/register" element={<Register />} />

      <Route
        path="/forgot-password"
        element={<ForgotPassword />}
      />

      {/* =========================
          PROTECTED APPLICATION
      ========================== */}

      <Route
        path="/app"
        element={
          <ProtectedRoute>
            <DashboardLayout />
          </ProtectedRoute>
        }
      >
        {/* Dashboard */}
        <Route index element={<Dashboard />} />

        {/* POS */}
        <Route path="pos" element={<POS />} />

        {/* Sales */}
        <Route path="sales" element={<Sales />} />

        {/* Payments */}
        <Route path="payments" element={<Payments />} />

        {/* Products */}
        <Route path="products" element={<Products />} />

        {/* Categories */}
        <Route
          path="products/categories"
          element={<Categories />}
        />

        {/* Inventory */}
        <Route path="inventory" element={<Inventory />} />

        {/* Customers */}
        <Route path="customers" element={<Customers />} />

        {/* Suppliers */}
        <Route path="suppliers" element={<Suppliers />} />

        {/* Purchases */}
        <Route path="purchases" element={<Purchases />} />

        {/* Expenses */}
        <Route path="expenses" element={<Expenses />} />

        {/* Reports */}
        <Route path="reports" element={<Reports />} />

        {/* Settings */}
        <Route path="settings" element={<Settings />} />

        {/* Unknown /app route */}
        <Route
          path="*"
          element={<Navigate to="/app" replace />}
        />
      </Route>

      {/* =========================
          ROOT ROUTE
      ========================== */}

      <Route
        path="/"
        element={<Navigate to="/app" replace />}
      />

      {/* =========================
          UNKNOWN ROUTES
      ========================== */}

      <Route
        path="*"
        element={<Navigate to="/app" replace />}
      />
    </Routes>
  );
};

export default App;