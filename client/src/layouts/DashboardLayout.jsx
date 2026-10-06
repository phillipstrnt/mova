import { useState } from "react";
import { Outlet } from "react-router-dom";

import Sidebar from "../components/layout/Sidebar";
import Topbar from "../components/layout/Topbar";
import BranchSelector from "../components/BranchSelector";

const DashboardLayout = () => {
  const [sidebarOpen, setSidebarOpen] =
    useState(false);

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="flex min-h-screen">

        {/* Sidebar */}
        <Sidebar
          open={sidebarOpen}
          onClose={() =>
            setSidebarOpen(false)
          }
        />

        <div className="flex min-w-0 flex-1 flex-col">

          {/* Topbar */}
          <Topbar
            onMenuClick={() =>
              setSidebarOpen(true)
            }
          />

          {/* Branch Selector */}
          <div className="border-b border-slate-200 bg-white px-4 py-3 sm:px-6 lg:px-8">
            <div className="mx-auto max-w-screen-2xl">
              <BranchSelector />
            </div>
          </div>

          {/* Page */}
          <main className="flex-1 p-4 sm:p-6 lg:p-8">
            <Outlet />
          </main>

        </div>
      </div>
    </div>
  );
};

export default DashboardLayout;