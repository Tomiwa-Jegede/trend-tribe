// src/components/admin/AdminLayout.jsx — Admin Shell (responsive: collapsible sidebar on mobile)

import { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import { useAuth } from "../../context/AuthContext";
import {
  FiGrid,
  FiUsers,
  FiShoppingBag,
  FiFlag,
  FiLogOut,
  FiMenu,
  FiX,
} from "react-icons/fi";

const navItems = [
  { label: "Dashboard", path: "/admin", icon: FiGrid },
  { label: "Users", path: "/admin/users", icon: FiUsers },
  { label: "Listings", path: "/admin/listings", icon: FiShoppingBag },
  { label: "Reports", path: "/admin/reports", icon: FiFlag },
];

const SidebarContent = ({ location, onNavigate }) => (
  <>
    <div className="h-16 flex items-center px-6 border-b border-sage-100">
      <span className="font-bold text-lg text-navy-900">
        Trend<span className="text-accent-400">Tribe</span>
        <span className="text-gray-400 font-medium"> Admin</span>
      </span>
    </div>

    <nav className="flex-1 px-3 py-4 flex flex-col gap-1">
      {navItems.map(({ label, path, icon: Icon }) => {
        const active = location.pathname === path;
        return (
          <Link
            key={path}
            to={path}
            onClick={onNavigate}
            className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors duration-150 ${
              active
                ? "bg-primary-600 text-white"
                : "text-gray-600 hover:bg-sage-50 hover:text-primary-600"
            }`}
          >
            <Icon className="w-4 h-4" />
            {label}
          </Link>
        );
      })}
    </nav>
  </>
);

const AdminLayout = ({ children }) => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const handleLogout = () => {
    logout();
    navigate("/");
  };

  return (
    <div className="min-h-screen flex bg-sage-50">
      {/* ── Desktop Sidebar (always visible md+) ──────────── */}
      <aside className="hidden md:flex w-60 bg-white border-r border-sage-100 flex-col">
        <SidebarContent location={location} />
      </aside>

      {/* ── Mobile Sidebar (off-canvas, toggled) ───────────── */}
      <AnimatePresence>
        {sidebarOpen && (
          <>
            <motion.div
              key="sidebar-backdrop"
              className="fixed inset-0 bg-black/50 z-40 md:hidden"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              onClick={() => setSidebarOpen(false)}
            />
            <motion.aside
              key="sidebar-panel"
              className="fixed top-0 left-0 h-full w-64 bg-white border-r border-sage-100 flex flex-col z-50 md:hidden"
              initial={{ x: "-100%" }}
              animate={{ x: 0 }}
              exit={{ x: "-100%" }}
              transition={{ duration: 0.25, ease: "easeOut" }}
            >
              <SidebarContent
                location={location}
                onNavigate={() => setSidebarOpen(false)}
              />
            </motion.aside>
          </>
        )}
      </AnimatePresence>

      {/* ── Main column ─────────────────────────────────── */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Topbar */}
        <header className="h-16 bg-white border-b border-sage-100 flex items-center justify-between px-4 md:px-6">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setSidebarOpen(true)}
              className="md:hidden p-2 text-gray-500 hover:text-primary-600 hover:bg-sage-50 rounded-lg transition-colors"
              aria-label="Open menu"
            >
              <FiMenu className="w-5 h-5" />
            </button>
            <span className="text-sm text-gray-500 hidden sm:inline">
              Admin Panel
            </span>
          </div>

          <div className="flex items-center gap-3">
            <span className="text-sm font-medium text-gray-700 truncate max-w-[120px] sm:max-w-none">
              {user?.username}
            </span>
            <button
              onClick={handleLogout}
              className="p-2 text-gray-400 hover:text-red-500 transition-colors rounded-lg hover:bg-accent-50"
              title="Logout"
            >
              <FiLogOut className="w-4 h-4" />
            </button>
          </div>
        </header>

        {/* Content area — pages render here */}
        <main className="flex-1 p-4 md:p-6 overflow-x-hidden">{children}</main>
      </div>
    </div>
  );
};

export default AdminLayout;
