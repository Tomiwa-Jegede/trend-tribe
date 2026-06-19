// src/components/layout/Navbar.jsx

import { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { useAuth } from "../../context/AuthContext";
import {
  FiShoppingBag,
  FiMenu,
  FiX,
  FiPlus,
  FiUser,
  FiLogOut,
} from "react-icons/fi";

// ── Reduced-motion helper ──────────────────────────────────────
const useReducedMotion = () => {
  const [reduced, setReduced] = useState(
    () => window.matchMedia("(prefers-reduced-motion: reduce)").matches,
  );
  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const handler = (e) => setReduced(e.matches);
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, []);
  return reduced;
};

// ── Animation variants ─────────────────────────────────────────
const mobileMenuVariants = {
  hidden: { opacity: 0, y: -8 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.2, ease: [0.25, 0.46, 0.45, 0.94] },
  },
  exit: {
    opacity: 0,
    y: -6,
    transition: { duration: 0.15, ease: "easeIn" },
  },
};

const mobileItemVariants = {
  hidden: { opacity: 0, x: -12 },
  visible: (i) => ({
    opacity: 1,
    x: 0,
    transition: { delay: i * 0.05, duration: 0.22, ease: "easeOut" },
  }),
};

const Navbar = () => {
  const { isAuthenticated, user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const reducedMotion = useReducedMotion();

  const [menuOpen, setMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [showLogoutModal, setShowLogoutModal] = useState(false);

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 10);
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  useEffect(() => {
    setMenuOpen(false);
  }, [location.pathname]);

  const handleLogout = () => {
    setShowLogoutModal(true);
    setMenuOpen(false);
  };

  const confirmLogout = () => {
    logout();
    setShowLogoutModal(false);
    navigate("/");
  };

  const isActive = (path) => location.pathname === path;

  const NavLink = ({ path, label }) => (
    <Link
      to={path}
      className="relative text-sm font-medium transition-colors duration-150 pb-1 group"
      style={{
        color: isActive(path) ? "var(--color-primary, #1340B8)" : undefined,
      }}
    >
      <span
        className={`transition-colors duration-150 ${
          isActive(path)
            ? "text-primary-600"
            : "text-gray-600 hover:text-primary-600"
        }`}
      >
        {label}
      </span>
      {isActive(path) ? (
        <motion.span
          layoutId={reducedMotion ? undefined : "nav-underline"}
          className="absolute bottom-0 left-0 right-0 h-0.5 bg-accent-400 rounded-full"
          initial={reducedMotion ? false : { scaleX: 0 }}
          animate={{ scaleX: 1 }}
          transition={{ duration: 0.2, ease: "easeOut" }}
        />
      ) : (
        <span
          className="absolute bottom-0 left-0 right-0 h-0.5 bg-accent-400 rounded-full
                     scale-x-0 group-hover:scale-x-100 transition-transform duration-200 origin-left"
        />
      )}
    </Link>
  );

  const MobileNavLink = ({ path, label, index }) => (
    <motion.div
      custom={index}
      variants={reducedMotion ? {} : mobileItemVariants}
      initial="hidden"
      animate="visible"
    >
      <Link
        to={path}
        onClick={() => setMenuOpen(false)}
        className={`block text-sm font-medium py-1 transition-colors duration-150 ${
          isActive(path)
            ? "text-primary-600"
            : "text-gray-600 hover:text-primary-600"
        }`}
      >
        {label}
      </Link>
    </motion.div>
  );

  return (
    <>
      <motion.nav
        className="bg-white border-b border-sage-100 sticky top-0 z-50"
        animate={
          reducedMotion
            ? {}
            : {
                boxShadow: scrolled
                  ? "0 1px 20px rgba(0,0,0,0.08)"
                  : "0 1px 3px rgba(0,0,0,0.04)",
                backgroundColor: scrolled
                  ? "rgba(255,255,255,0.88)"
                  : "rgba(255,255,255,1)",
              }
        }
        transition={{ duration: 0.25, ease: "easeOut" }}
      >
        <div className="container-app">
          <div className="flex items-center justify-between h-16">
            {/* ── Logo ─────────────────────────────────────── */}
            <Link to="/" className="flex items-center gap-2 group">
              <motion.div
                className="w-8 h-8 bg-primary-600 rounded-lg flex items-center justify-center"
                whileHover={reducedMotion ? {} : { scale: 1.08, rotate: -6 }}
                whileTap={reducedMotion ? {} : { scale: 0.95 }}
                transition={{ type: "spring", stiffness: 400, damping: 20 }}
              >
                <FiShoppingBag className="text-white w-4 h-4" />
              </motion.div>
              <span className="font-bold text-lg text-navy-900">
                Trend<span className="text-accent-400">Tribe</span>
              </span>
            </Link>

            {/* ── Desktop Nav Links ─────────────────────────── */}
            <div className="hidden md:flex items-center gap-8">
              <NavLink path="/" label="Home" />
              <NavLink path="/marketplace" label="Marketplace" />
              <NavLink path="/features" label="Features" />
              <NavLink path="/about" label="About" />

              {isAuthenticated && (
                <NavLink path={`/profile/${user?.id}`} label="My Profile" />
              )}
            </div>

            {/* ── Desktop Auth Buttons ──────────────────────── */}
            <div className="hidden md:flex items-center gap-3">
              {isAuthenticated ? (
                <>
                  <motion.div
                    whileHover={reducedMotion ? {} : { scale: 1.03 }}
                    whileTap={reducedMotion ? {} : { scale: 0.97 }}
                  >
                    <Link
                      to="/create-listing"
                      className="btn-primary flex items-center gap-2 text-sm py-2 px-4"
                    >
                      <FiPlus className="w-4 h-4" />
                      Sell Item
                    </Link>
                  </motion.div>

                  <div className="flex items-center gap-2 pl-3 border-l border-sage-100">
                    <Link
                      to={`/profile/${user?.id}`}
                      className="flex items-center gap-2 text-sm text-gray-700
                                 hover:text-primary-600 transition-colors"
                    >
                      <motion.div
                        className="w-8 h-8 bg-sage-100 rounded-full overflow-hidden flex items-center justify-center"
                        whileHover={reducedMotion ? {} : { scale: 1.1 }}
                        transition={{
                          type: "spring",
                          stiffness: 400,
                          damping: 20,
                        }}
                      >
                        {user?.avatar ? (
                          <img
                            src={user.avatar}
                            alt={user.username}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <FiUser className="w-4 h-4 text-primary-600" />
                        )}
                      </motion.div>
                      <span className="font-medium">{user?.username}</span>
                    </Link>

                    <motion.button
                      onClick={handleLogout}
                      className="p-2 text-gray-400 hover:text-red-500
                                 transition-colors rounded-lg hover:bg-accent-50"
                      title="Logout"
                      whileHover={reducedMotion ? {} : { scale: 1.1 }}
                      whileTap={reducedMotion ? {} : { scale: 0.9 }}
                      transition={{
                        type: "spring",
                        stiffness: 400,
                        damping: 20,
                      }}
                    >
                      <FiLogOut className="w-4 h-4" />
                    </motion.button>
                  </div>
                </>
              ) : (
                <>
                  <motion.div
                    whileHover={reducedMotion ? {} : { scale: 1.03 }}
                    whileTap={reducedMotion ? {} : { scale: 0.97 }}
                  >
                    <Link
                      to="/login"
                      className="btn-secondary text-sm py-2 px-4"
                    >
                      Log In
                    </Link>
                  </motion.div>
                  <motion.div
                    whileHover={reducedMotion ? {} : { scale: 1.03 }}
                    whileTap={reducedMotion ? {} : { scale: 0.97 }}
                  >
                    <Link
                      to="/register"
                      className="btn-primary text-sm py-2 px-4"
                    >
                      Sign Up
                    </Link>
                  </motion.div>
                </>
              )}
            </div>

            {/* ── Mobile Menu Toggle ────────────────────────── */}
            <motion.button
              className="md:hidden p-2 rounded-lg text-gray-600
                         hover:bg-sage-50 transition-colors"
              onClick={() => setMenuOpen((prev) => !prev)}
              whileTap={reducedMotion ? {} : { scale: 0.9 }}
              aria-label={menuOpen ? "Close menu" : "Open menu"}
              aria-expanded={menuOpen}
            >
              {menuOpen ? (
                <FiX className="w-5 h-5" />
              ) : (
                <FiMenu className="w-5 h-5" />
              )}
            </motion.button>
          </div>
        </div>

        {/* ── Mobile Dropdown Menu ──────────────────────────── */}
        <AnimatePresence>
          {menuOpen && (
            <motion.div
              key="mobile-menu"
              variants={reducedMotion ? {} : mobileMenuVariants}
              initial="hidden"
              animate="visible"
              exit="exit"
              className="md:hidden border-t border-sage-100 bg-white px-4 py-4
                         flex flex-col gap-4 overflow-hidden"
              style={{ originY: 0 }}
            >
              <MobileNavLink path="/" label="Home" index={0} />
              <MobileNavLink
                path="/marketplace"
                label="Marketplace"
                index={1}
              />
              <MobileNavLink path="/features" label="Features" index={2} />
              <MobileNavLink path="/about" label="About" index={3} />
              {isAuthenticated && (
                <MobileNavLink
                  path={`/profile/${user?.id}`}
                  label="My Profile"
                  index={3}
                />
              )}
              <div className="border-t border-sage-100 pt-4 flex flex-col gap-3">
                {isAuthenticated ? (
                  <>
                    <motion.div
                      custom={3}
                      variants={reducedMotion ? {} : mobileItemVariants}
                      initial="hidden"
                      animate="visible"
                    >
                      <Link
                        to="/create-listing"
                        onClick={() => setMenuOpen(false)}
                        className="btn-primary flex items-center justify-center gap-2"
                      >
                        <FiPlus className="w-4 h-4" />
                        Sell Item
                      </Link>
                    </motion.div>

                    <motion.div
                      custom={4}
                      variants={reducedMotion ? {} : mobileItemVariants}
                      initial="hidden"
                      animate="visible"
                    >
                      <button
                        onClick={handleLogout}
                        className="w-full btn-secondary flex items-center justify-center gap-2
                                   text-red-500 border-red-200 hover:bg-red-50"
                      >
                        <FiLogOut className="w-4 h-4" />
                        Logout
                      </button>
                    </motion.div>
                  </>
                ) : (
                  <>
                    <motion.div
                      custom={3}
                      variants={reducedMotion ? {} : mobileItemVariants}
                      initial="hidden"
                      animate="visible"
                    >
                      <Link
                        to="/login"
                        onClick={() => setMenuOpen(false)}
                        className="btn-secondary text-center block"
                      >
                        Log In
                      </Link>
                    </motion.div>

                    <motion.div
                      custom={4}
                      variants={reducedMotion ? {} : mobileItemVariants}
                      initial="hidden"
                      animate="visible"
                    >
                      <Link
                        to="/register"
                        onClick={() => setMenuOpen(false)}
                        className="btn-primary text-center block"
                      >
                        Sign Up Free
                      </Link>
                    </motion.div>
                  </>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.nav>

      {/* ── Logout Modal (Portal — renders outside nav to avoid stacking context) ── */}
      {createPortal(
        <AnimatePresence>
          {showLogoutModal && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.15 }}
              style={{
                position: "fixed",
                inset: 0,
                zIndex: 9999,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                backgroundColor: "rgba(0,0,0,0.45)",
              }}
              onClick={() => setShowLogoutModal(false)}
            >
              <motion.div
                initial={{ opacity: 0, scale: 0.92 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.92 }}
                transition={{ duration: 0.18, ease: "easeOut" }}
                style={{
                  background: "white",
                  borderRadius: "1rem",
                  padding: "1.5rem",
                  width: "90vw",
                  maxWidth: "360px",
                  textAlign: "center",
                  boxShadow: "0 20px 60px rgba(0,0,0,0.15)",
                }}
                onClick={(e) => e.stopPropagation()}
              >
                <div
                  style={{
                    width: 48,
                    height: 48,
                    borderRadius: "50%",
                    background: "#fef2f2",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    margin: "0 auto 1rem",
                  }}
                >
                  <FiLogOut
                    style={{ width: 20, height: 20, color: "#ef4444" }}
                  />
                </div>
                <h3
                  style={{
                    fontSize: 16,
                    fontWeight: 600,
                    color: "#111827",
                    margin: "0 0 6px",
                  }}
                >
                  Log out?
                </h3>
                <p
                  style={{
                    fontSize: 14,
                    color: "#6b7280",
                    margin: "0 0 1.25rem",
                    lineHeight: 1.5,
                  }}
                >
                  Are you sure you want to log out of your account?
                </p>
                <div style={{ display: "flex", gap: 10 }}>
                  <button
                    onClick={() => setShowLogoutModal(false)}
                    style={{
                      flex: 1,
                      padding: "10px 16px",
                      borderRadius: 8,
                      border: "1px solid #e5e7eb",
                      background: "white",
                      fontSize: 14,
                      fontWeight: 500,
                      color: "#374151",
                      cursor: "pointer",
                    }}
                  >
                    Cancel
                  </button>
                  <button
                    onClick={confirmLogout}
                    style={{
                      flex: 1,
                      padding: "10px 16px",
                      borderRadius: 8,
                      border: "none",
                      background: "#ef4444",
                      fontSize: 14,
                      fontWeight: 500,
                      color: "white",
                      cursor: "pointer",
                    }}
                  >
                    Log out
                  </button>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>,
        document.body,
      )}
    </>
  );
};

export default Navbar;
