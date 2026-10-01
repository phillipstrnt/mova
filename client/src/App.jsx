import { Navigate, Route, Routes } from "react-router-dom";

import ProtectedRoute from "./components/common/ProtectedRoute";
import DashboardLayout from "./layouts/DashboardLayout";

import Dashboard from "./pages/dashboard/Dashboard";
import POS from "./pages/pos/POS";
import Sales from "./pages/Sales/Sales";

import Products from "./pages/products/Products";
import Categories from "./pages/products/Categories";

import Inventory from "./pages/inventory/Inventory";
import Customers from "./pages/customers/Customers";

import Suppliers from "./pages/suppliers/Suppliers";
import Purchases from "./pages/purchases/Purchases";

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

      {/* ==================================================
          AUTHENTICATION
      ================================================== */}

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


      {/* ==================================================
          ROOT
      ================================================== */}

      <Route
        path="/"
        element={
          <Navigate
            to="/app"
            replace
          />
        }
      />


      {/* ==================================================
          PROTECTED APPLICATION
      ================================================== */}

      <Route element={<ProtectedRoute />}>

        <Route
          path="/app"
          element={<DashboardLayout />}
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


          {/* PRODUCTS */}

          <Route
            path="products"
            element={<Products />}
          />

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


          {/* REPORTS */}

          <Route
            path="reports"
            element={
              <PlaceholderPage
                title="Reports"
              />
            }
          />


          {/* SETTINGS */}

          <Route
            path="settings"
            element={
              <PlaceholderPage
                title="Settings"
              />
            }
          />

        </Route>

      </Route>


      {/* ==================================================
          UNKNOWN ROUTES
      ================================================== */}

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