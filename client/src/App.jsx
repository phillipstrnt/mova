import { Navigate, Route, Routes } from "react-router-dom";
import Sales from "./pages/sales/Sales";
import ProtectedRoute from "./components/common/ProtectedRoute";
import DashboardLayout from "./layouts/DashboardLayout";
import Customers from "./pages/customers/Customers";

import Dashboard from "./pages/dashboard/Dashboard";
import POS from "./pages/pos/POS";
import Products from "./pages/products/Products";
import Categories from "./pages/products/Categories";
import Inventory from "./pages/inventory/Inventory";

import Login from "./pages/auth/Login";
import Register from "./pages/auth/Register";
import ForgotPassword from "./pages/auth/ForgotPassword";

const PlaceholderPage = ({ title }) => {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-8">
      <h1 className="text-2xl font-black text-slate-900">
        {title}
      </h1>

      <p className="mt-2 text-slate-500">
        This MOVA module is coming next.
      </p>
    </div>
  );
};

const App = () => {
  return (
    <Routes>
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
        path="/"
        element={
          <Navigate
            to="/app"
            replace
          />
        }
      />

      <Route element={<ProtectedRoute />}>
        <Route
          path="/app"
          element={<DashboardLayout />}
        >
          <Route
            index
            element={<Dashboard />}
          />

          <Route
            path="pos"
            element={<POS />}
          />

          <Route
            path="products"
            element={<Products />}
          />

          <Route
            path="products/categories"
            element={<Categories />}
          />

          <Route
            path="inventory"
            element={<Inventory />}
          />

          <Route
            path="sales"
            element={<Sales />}
          />

          <Route
            path="customers"
            element={<Customers />}
          />

          <Route
            path="reports"
            element={
              <PlaceholderPage title="Reports" />
            }
          />

          <Route
            path="settings"
            element={
              <PlaceholderPage title="Settings" />
            }
          />
        </Route>
      </Route>

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