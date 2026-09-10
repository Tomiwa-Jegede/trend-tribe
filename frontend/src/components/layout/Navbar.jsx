// src/components/layout/Navbar.jsx

import { useState, useEffect, useRef, useCallback } from "react";
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
  FiHelpCircle,
  FiHeart,
  FiMail,
  FiMessageCircle,
  FiChevronDown,
} from "react-icons/fi";
import NotificationBell from "../notifications/NotificationBell";
import PWAInstallButton from "../pwa/PWAInstallButton";
import TokenIcon from "../ui/TokenIcon";
import api from "../../api/axios";
import useRealtime from "../../hooks/useRealtime";
import { getGigs } from "../../services/gigService";

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
  const { isAuthenticated, user, token, logout } = useAuth();

  const navigate = useNavigate();
  const location = useLocation();
  const reducedMotion = useReducedMotion();

  const [menuOpen, setMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [showLogoutModal, setShowLogoutModal] = useState(false);
  const [inboxUnread, setInboxUnread] = useState(0);
  const [showMore, setShowMore] = useState(false);
  const moreRef = useRef(null);
  const [showMoreMobile, setShowMoreMobile] = useState(false);
  const moreMobileRef = useRef(null);
  const [showGigsMenu, setShowGigsMenu] = useState(false);
  const gigsMenuRef = useRef(null);
  const [showGigsMenuMobile, setShowGigsMenuMobile] = useState(false);
  const gigsMenuMobileRef = useRef(null);
  const [availableGigsCount, setAvailableGigsCount] = useState(0);
  const [showBookingsMenu, setShowBookingsMenu] = useState(false);
  const bookingsMenuRef = useRef(null);
  const [showBookingsMenuMobile, setShowBookingsMenuMobile] = useState(false);
  const [showAccountMenu, setShowAccountMenu] = useState(false);
  const accountMenuRef = useRef(null);
  const bookingsMenuMobileRef = useRef(null);
  const [hasActiveService, setHasActiveService] = useState(false);

  const fetchInbox = useCallback(async () => {
    if (!isAuthenticated || !token) { setInboxUnread(0); return; }
    try { const { data } = await api.get("/messages/unread-count"); setInboxUnread(data.unreadCount); } catch (err) { if (import.meta.env.DEV) console.warn("[Navbar inbox unread]", err?.response?.data || err.message); }
  }, [isAuthenticated, token]);

  useRealtime("message", fetchInbox, { enabled: isAuthenticated && !!token });
  useRealtime("message:unread", fetchInbox, { enabled: isAuthenticated && !!token });

  useEffect(() => {
    if (!isAuthenticated || !token || !user?.id) {
      setInboxUnread(0);
      return;
    }
    setInboxUnread(0);
    fetchInbox();
  }, [isAuthenticated, token, user?.id, fetchInbox, location.pathname]);



  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 10);
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);
  useEffect(() => {
    let cancelled = false;
    getGigs({ limit: 50 })
      .then((data) => {
        if (cancelled) return;
        const openCount = (data.gigs || []).filter((g) => g.status === "OPEN").length;
        setAvailableGigsCount(openCount);
      })
      .catch(() => {
        if (!cancelled) setAvailableGigsCount(0);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  // Hide "As Provider" unless user has at least one active SERVICES listing
  useEffect(() => {
    if (!isAuthenticated || !user?.id) { setHasActiveService(false); return; }
    let cancelled = false;
    (async () => {
      try {
        const { data } = await api.get("/listings/me", { params: { limit: 50 } });
        const has = (data.listings || []).some((l) => l.category === "SERVICES" && l.isAvailable);
        if (!cancelled) setHasActiveService(has);
      } catch { if (!cancelled) setHasActiveService(false); }
    })();
    return () => { cancelled = true; };
  }, [isAuthenticated, user?.id, location.pathname]);

  useEffect(() => {
    setMenuOpen(false);
    setShowMore(false);
    setShowMoreMobile(false);
    setShowGigsMenu(false);
    setShowGigsMenuMobile(false);
    setShowBookingsMenu(false);
    setShowBookingsMenuMobile(false);
  }, [location.pathname]);

  useEffect(() => {
    const h = (e) => {
      if (moreRef.current && !moreRef.current.contains(e.target)) setShowMore(false);
      if (moreMobileRef.current && !moreMobileRef.current.contains(e.target)) setShowMoreMobile(false);
      if (gigsMenuRef.current && !gigsMenuRef.current.contains(e.target)) setShowGigsMenu(false);
      if (gigsMenuMobileRef.current && !gigsMenuMobileRef.current.contains(e.target)) setShowGigsMenuMobile(false);
      if (bookingsMenuRef.current && !bookingsMenuRef.current.contains(e.target)) setShowBookingsMenu(false);
      if (accountMenuRef.current && !accountMenuRef.current.contains(e.target)) setShowAccountMenu(false);
      if (bookingsMenuMobileRef.current && !bookingsMenuMobileRef.current.contains(e.target)) setShowBookingsMenuMobile(false);
    };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, []);

  // Lock scroll when mobile menu is open
  useEffect(() => {
    if (menuOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [menuOpen]);

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
        className="bg-white border-b border-sage-100 sticky top-0 z-50 backdrop-blur-md"
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
                className="w-8 h-8 rounded-lg flex items-center justify-center"
                whileHover={reducedMotion ? {} : { scale: 1.08, rotate: -6 }}
                whileTap={reducedMotion ? {} : { scale: 0.95 }}
                transition={{ type: "spring", stiffness: 400, damping: 20 }}
              >
                <img src="/trendtribe_logo.png" alt="TrendTribe" className="w-full h-full object-contain rounded-lg" />
              </motion.div>
              <span className="font-bold text-lg text-navy-900">
                Trend<span className="text-accent-400">Tribe</span>
              </span>
            </Link>

            {/* ── Desktop Nav Links — 4 primary + overflow ───── */}
            <div className="hidden md:flex items-center gap-6">
              <NavLink path="/" label="Home" />
              <NavLink path="/marketplace" label="Marketplace" />
              <div className="relative" ref={gigsMenuRef}>
                <button
                  onClick={() => setShowGigsMenu((v) => !v)}
                  className={`flex items-center gap-1 text-sm font-medium pb-1 ${
                    location.pathname.startsWith("/gigs") ? "text-primary-600" : "text-gray-600 hover:text-primary-600"
                  }`}
                >
                  Gigs
                  {availableGigsCount > 0 && (
                    <span className="ml-0.5 bg-accent-400 text-navy-900 text-[10px] font-bold rounded-full min-w-[16px] h-[16px] flex items-center justify-center px-1">
                      {availableGigsCount > 99 ? "99+" : availableGigsCount}
                    </span>
                  )}
                  <FiChevronDown className={`w-3.5 h-3.5 transition-transform ${showGigsMenu ? "rotate-180" : ""}`} />
                </button>
                <AnimatePresence>
                  {showGigsMenu && (
                    <motion.div
                      initial={{ opacity: 0, y: -6 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -6 }}
                      transition={{ duration: 0.18 }}
                      className="absolute top-8 left-0 bg-white border border-sage-100 rounded-xl shadow-lg py-2 w-52 z-50"
                    >
                      <Link to="/gigs?view=post" onClick={() => setShowGigsMenu(false)} className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-50">
                        Post Gig
                      </Link>
                      <Link to="/gigs/available" onClick={() => setShowGigsMenu(false)} className="flex items-center justify-between px-4 py-2 text-sm text-gray-700 hover:bg-gray-50">
                        <span>Available Gigs</span>
                        {availableGigsCount > 0 && (
                          <span className="bg-accent-400 text-navy-900 text-[10px] font-bold rounded-full min-w-[18px] h-[18px] flex items-center justify-center px-1">
                            {availableGigsCount > 99 ? "99+" : availableGigsCount}
                          </span>
                        )}
                      </Link>
                      <Link to="/gigs/wallet" onClick={() => setShowGigsMenu(false)} className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-50">
                        Wallet
                      </Link>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
              <NavLink path="/chat" label="Chats" />
              <div className="relative" ref={moreRef}>
                <button
                  onClick={() => setShowMore((v) => !v)}
                  className="flex items-center gap-1 text-sm font-medium pb-1 text-gray-600 hover:text-primary-600"
                >
                  Menu <FiChevronDown className={`w-3.5 h-3.5 transition-transform ${showMore ? "rotate-180" : ""}`} />
                </button>
                <AnimatePresence>
                  {showMore && (
                    <motion.div
                      initial={{ opacity: 0, y: -6 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -6 }}
                      transition={{ duration: 0.18 }}
                      className="absolute top-8 right-0 bg-white border border-sage-100 rounded-xl shadow-lg py-2 w-56 z-50"
                    >
                      <Link to="/bookings/mine" onClick={() => setShowMore(false)} className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-50">My Bookings</Link>
                      {hasActiveService && <Link to="/bookings/provider" onClick={() => setShowMore(false)} className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-50">As Provider</Link>}
                      <Link to={`/profile/${user?.slug || user?.id}`} onClick={() => setShowMore(false)} className={`block px-4 py-2 text-sm ${isAuthenticated ? "text-gray-700 hover:bg-gray-50" : "text-gray-400"}`}>My Profile</Link>
                      {user?.role === "ADMIN" && <Link to="/admin" onClick={() => setShowMore(false)} className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-50">Admin</Link>}
                      <div className="border-t border-gray-100 my-1" />
                      <Link to="/features" onClick={() => setShowMore(false)} className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-50">Features</Link>
                      <Link to="/pricing" onClick={() => setShowMore(false)} className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-50">Pricing</Link>
                      <Link to="/about" onClick={() => setShowMore(false)} className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-50">About</Link>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </div>

            {/* ── Desktop Auth Buttons ──────────────────────── */}
            <div className="hidden md:flex items-center gap-3">
              {isAuthenticated ? (
                <>

                  <div className="flex items-center gap-1 pl-3 border-l border-sage-100">
                    <Link to="/saved" className="relative p-2 rounded-full hover:bg-gray-100 transition-colors" aria-label="Favorites">
                      <FiHeart className={`w-5 h-5 ${location.pathname === "/saved" ? "text-primary-600 fill-primary-600" : "text-gray-600"}`} />
                    </Link>
                    <Link to="/inbox" className="relative p-2 rounded-full hover:bg-gray-100 transition-colors" aria-label="Inbox">
                      <FiMail className={`w-5 h-5 ${location.pathname === "/inbox" ? "text-primary-600" : "text-gray-600"}`} />
                      {inboxUnread > 0 && (
                        <span className="absolute -top-0.5 -right-0.5 bg-primary-600 text-white text-[10px] font-bold rounded-full min-w-[18px] h-[18px] flex items-center justify-center px-1">
                          {inboxUnread > 99 ? "99+" : inboxUnread}
                        </span>
                      )}
                    </Link>
                    <Link to="/chat" className="relative p-2 rounded-full hover:bg-gray-100 transition-colors" aria-label="Chats">
                      <FiMessageCircle className={`w-5 h-5 ${location.pathname === "/chat" ? "text-primary-600" : "text-gray-600"}`} />
                      {inboxUnread > 0 && (
                        <span className="absolute -top-0.5 -right-0.5 bg-primary-600 text-white text-[10px] font-bold rounded-full min-w-[18px] h-[18px] flex items-center justify-center px-1">
                          {inboxUnread > 99 ? "99+" : inboxUnread}
                        </span>
                      )}
                    </Link>
                    <NotificationBell />
                    <div className="relative" ref={accountMenuRef}>
                      <button
                        onClick={() => setShowAccountMenu((v) => !v)}
                        className="flex items-center gap-2 text-sm text-gray-700 hover:text-primary-600 transition-colors pl-1"
                      >
                        <motion.div
                          className="w-8 h-8 bg-sage-100 rounded-full overflow-hidden flex items-center justify-center"
                          whileHover={reducedMotion ? {} : { scale: 1.1 }}
                          transition={{ type: "spring", stiffness: 400, damping: 20 }}
                        >
                          {user?.avatar ? (
                            <img src={user.avatar} alt={user.username} className="w-full h-full object-cover" />
                          ) : (
                            <FiUser className="w-4 h-4 text-primary-600" />
                          )}
                        </motion.div>
                        <span className="font-medium">{user?.username}</span>
                        <FiChevronDown className={`w-3.5 h-3.5 transition-transform ${showAccountMenu ? "rotate-180" : ""}`} />
                      </button>
                      {showAccountMenu && (
                        <div className="absolute right-0 mt-2 w-56 bg-white rounded-xl shadow-lg border border-gray-100 py-2 z-50">
                          <Link to={`/profile/${user?.slug || user?.id}`} onClick={() => setShowAccountMenu(false)} className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-50">
                            My Profile
                          </Link>
                          {user?.role !== "ADMIN" && typeof user?.tokenBalance === "number" && (
                            <div className="flex items-center gap-1.5 px-4 py-2 text-sm text-primary-700">
                              <TokenIcon size={14} /> {user.tokenBalance} tokens
                            </div>
                          )}
                          {user?.role === "ADMIN" && (
                            <Link to="/admin" onClick={() => setShowAccountMenu(false)} className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-50">
                              Admin
                            </Link>
                          )}
                          <button
                            onClick={handleLogout}
                            className="w-full text-left flex items-center gap-2 px-4 py-2 text-sm text-red-500 hover:bg-red-50 border-t border-gray-100 mt-1 pt-2"
                          >
                            <FiLogOut className="w-4 h-4" /> Logout
                          </button>
                        </div>
                      )}
                    </div>
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

            {/* ── Mobile Bell + Menu Toggle (outside hamburger) ── */}
            <div className="md:hidden flex items-center gap-1">
              {isAuthenticated && (
                <Link to="/saved" className="relative p-2 rounded-full hover:bg-gray-100 transition-colors" aria-label="Favorites">
                  <FiHeart className="w-5 h-5 text-gray-600" />
                </Link>
              )}
              <Link to="/inbox" className="relative p-2 rounded-full hover:bg-gray-100 transition-colors" aria-label="Inbox">
                <FiMail className="w-5 h-5 text-gray-600" />
                {inboxUnread > 0 && (
                  <span className="absolute -top-0.5 -right-0.5 bg-primary-600 text-white text-[10px] font-bold rounded-full min-w-[16px] h-[16px] flex items-center justify-center px-1">
                    {inboxUnread > 99 ? "99+" : inboxUnread}
                  </span>
                )}
              </Link>
              <Link to="/chat" className="relative p-2 rounded-full hover:bg-gray-100 transition-colors" aria-label="Chats">
                <FiMessageCircle className="w-5 h-5 text-gray-600" />
                {inboxUnread > 0 && (
                  <span className="absolute -top-0.5 -right-0.5 bg-primary-600 text-white text-[10px] font-bold rounded-full min-w-[16px] h-[16px] flex items-center justify-center px-1">
                    {inboxUnread > 99 ? "99+" : inboxUnread}
                  </span>
                )}
              </Link>
              <NotificationBell />
              <motion.button
                className="p-2 rounded-lg text-gray-600 hover:bg-sage-50 transition-colors"
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
              <MobileNavLink path="/marketplace" label="Marketplace" index={1} />
              <div ref={gigsMenuMobileRef}>
                <motion.div custom={1} variants={reducedMotion ? {} : mobileItemVariants} initial="hidden" animate="visible">
                  <button
                    onClick={() => setShowGigsMenuMobile((v) => !v)}
                    className="flex items-center justify-between w-full text-sm font-medium py-1 text-gray-600 hover:text-primary-600"
                  >
                    <span className="flex items-center gap-1.5">
                      Gigs
                      {availableGigsCount > 0 && (
                        <span className="bg-accent-400 text-navy-900 text-[10px] font-bold rounded-full min-w-[16px] h-[16px] flex items-center justify-center px-1">
                          {availableGigsCount > 99 ? "99+" : availableGigsCount}
                        </span>
                      )}
                    </span>
                    <FiChevronDown className={`w-3.5 h-3.5 transition-transform ${showGigsMenuMobile ? "rotate-180" : ""}`} />
                  </button>
                </motion.div>
                <AnimatePresence>
                  {showGigsMenuMobile && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: "auto" }}
                      exit={{ opacity: 0, height: 0 }}
                      className="pl-4 flex flex-col gap-2 border-l border-sage-100 ml-1 overflow-hidden mt-2"
                    >
                      <MobileNavLink path="/gigs?view=post" label="Post Gig" index={2} />
                      <MobileNavLink path="/gigs/available" label="Available Gigs" index={2} />
                      <MobileNavLink path="/gigs/wallet" label="Wallet" index={2} />
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
              <div ref={bookingsMenuMobileRef}>
                <motion.div custom={1} variants={reducedMotion ? {} : mobileItemVariants} initial="hidden" animate="visible">
                  <button
                    onClick={() => setShowBookingsMenuMobile((v) => !v)}
                    className="flex items-center justify-between w-full text-sm font-medium py-1 text-gray-600 hover:text-primary-600"
                  >
                    <span>Bookings</span>
                    <FiChevronDown className={`w-3.5 h-3.5 transition-transform ${showBookingsMenuMobile ? "rotate-180" : ""}`} />
                  </button>
                </motion.div>
                <AnimatePresence>
                  {showBookingsMenuMobile && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: "auto" }}
                      exit={{ opacity: 0, height: 0 }}
                      className="pl-4 flex flex-col gap-2 border-l border-sage-100 ml-1 overflow-hidden mt-2"
                    >
                      {hasActiveService && <MobileNavLink path="/bookings/provider" label="As Provider" index={2} />}
                      <MobileNavLink path="/bookings/mine" label="My Bookings" index={2} />
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
              <div ref={moreMobileRef}>
                <motion.div custom={2} variants={reducedMotion ? {} : mobileItemVariants} initial="hidden" animate="visible">
                  <button
                    onClick={() => setShowMoreMobile((v) => !v)}
                    className="flex items-center justify-between w-full text-sm font-medium py-1 text-gray-600 hover:text-primary-600"
                  >
                    <span>More</span> <FiChevronDown className={`w-3.5 h-3.5 transition-transform ${showMoreMobile ? "rotate-180" : ""}`} />
                  </button>
                </motion.div>
                <AnimatePresence>
                  {showMoreMobile && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: "auto" }}
                      exit={{ opacity: 0, height: 0 }}
                      className="pl-4 flex flex-col gap-2 border-l border-sage-100 ml-1 overflow-hidden mt-2"
                    >
                      <MobileNavLink path="/features" label="Features" index={3} />
                      <MobileNavLink path="/pricing" label="Pricing" index={3} />
                      <MobileNavLink path="/about" label="About" index={3} />
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>


                             {isAuthenticated && (
                  <MobileNavLink
                    path={`/profile/${user?.slug || user?.id}`}
                    label="My Profile"
                    index={3}

                  />
                )}
              {isAuthenticated && user?.role !== "ADMIN" && typeof user?.tokenBalance === "number" && (
                <div className="flex items-center gap-1 text-xs font-semibold text-primary-700 bg-primary-50 rounded-full px-2.5 py-1 w-fit">
                  <TokenIcon size={14} /> {user.tokenBalance} tokens
                </div>
              )}
              {user?.role === "ADMIN" && (
                <MobileNavLink path="/admin" label="Admin" index={4} />
              )}

              <div className="border-t border-sage-100 pt-4 flex flex-col gap-3">
                <PWAInstallButton variant="accent" className="w-full justify-center" />
                {isAuthenticated ? (
                  <>
                    {user?.role !== "BUYER" && (
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
                    )}



                    <motion.div
                      custom={5}
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

      {/* ── Mobile Bottom Bar — 4+1 clean ── */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-sage-100 flex justify-around items-center h-16 z-40 pb-safe">
        <Link to="/" className={`flex flex-col items-center gap-1 p-2 ${location.pathname === "/" ? "text-primary-600" : "text-gray-500"}`}>
          <FiShoppingBag className="w-5 h-5" />
          <span className="text-[10px]">Home</span>
        </Link>
        <Link to="/marketplace" className={`flex flex-col items-center gap-1 p-2 ${location.pathname === "/marketplace" ? "text-primary-600" : "text-gray-500"}`}>
          <FiHeart className="w-5 h-5" />
          <span className="text-[10px]">Market</span>
        </Link>
        <Link to="/gigs/available" className={`flex flex-col items-center gap-1 p-2 ${location.pathname.startsWith("/gigs") ? "text-primary-600" : "text-gray-500"}`}>
          <span className="text-[10px] font-bold">Gigs</span>
          {availableGigsCount > 0 && <span className="absolute top-1 bg-accent-400 text-navy-900 text-[9px] px-1 rounded-full">{availableGigsCount}</span>}
        </Link>
        <Link to="/chat" className={`flex flex-col items-center gap-1 p-2 ${location.pathname === "/chat" ? "text-primary-600" : "text-gray-500"}`}>
          <FiMessageCircle className="w-5 h-5" />
          <span className="text-[10px]">Chats</span>
          {inboxUnread > 0 && <span className="absolute top-1 bg-primary-600 text-white text-[9px] px-1 rounded-full">{inboxUnread}</span>}
        </Link>
        <button onClick={() => setMenuOpen((v) => !v)} className="flex flex-col items-center gap-1 p-2 text-gray-500">
          <FiMenu className="w-5 h-5" />
          <span className="text-[10px]">Menu</span>
        </button>
      </div>

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
