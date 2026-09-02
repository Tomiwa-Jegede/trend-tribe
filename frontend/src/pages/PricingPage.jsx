// src/pages/PricingPage.jsx — Token pricing + what tokens buy
import { useState } from "react";
import { Link } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { motion, useReducedMotion } from "framer-motion";
import { FiZap, FiStar, FiEye, FiRefreshCw, FiMessageCircle, FiCreditCard, FiCheck, FiArrowRight } from "react-icons/fi";
import api from "../api/axios";
import { useAuth } from "../context/AuthContext";

const PACKAGES = [
  { qty: 1, label: "1 Token", price: 200, desc: "Try one boost or one extra listing", popular: false },
  { qty: 5, label: "5 Tokens", price: 1000, desc: "Most popular — boost week + extra listings", popular: true },
  { qty: 10, label: "10 Tokens", price: 2000, desc: "For power sellers" , popular: false },
  { qty: 20, label: "20 Tokens", price: 4000, desc: "Best value" , popular: false },
];

const USAGE = [
  { icon: <FiStar className="w-4 h-4" />, title: "Boost to Featured (Marketplace top)", cost: "1 token", detail: "24h pinned product card on top of Marketplace (A). Same card, tap → detail. Needs active listing." },
  { icon: <FiEye className="w-4 h-4" />, title: "Post beyond 3 free", cost: "1 token", detail: "First 3 active listings free forever. 4th active at same time costs 1 token (isFreeSlot=false, 2-edit limit)." },
  { icon: <FiRefreshCw className="w-4 h-4" />, title: "Re-activate 4th", cost: "1 token", detail: "Hidden → Active when you already have 3 active (hide → post → unhide trick closed). Same 1 token." },
  { icon: <FiZap className="w-4 h-4" />, title: "Extend ghost (stay alive)", cost: "1 token", detail: "+14 days before 30-day auto-hide. Button appears on GHOST card in My Listings." },
  { icon: <FiMessageCircle className="w-4 h-4" />, title: "Frederick AI helper", cost: "0.25 – 0.5 token", detail: "Text 1 unit (0.25 token), image 2 units (0.5 token) per fresh session; follow-ups free. Single tokenBalance ledger." },
  { icon: <FiCheck className="w-4 h-4" />, title: "Always free", cost: "0 tokens", detail: "Browse, search, favorite, WhatsApp contact, My Listings ghost timer, bell (favorite), admin views — free." },
];

const PricingPage = () => {
  const reduced = useReducedMotion();
  const { isAuthenticated, user } = useAuth();
  const [buying, setBuying] = useState(null);
  const [err, setErr] = useState("");

  const handleBuy = async (qty) => {
    if (!isAuthenticated) {
      window.location.href = "/login";
      return;
    }
    setBuying(qty);
    setErr("");
    try {
      const { data } = await api.post("/payments/init", { quantity: qty });
      window.location.href = data.authorizationUrl;
    } catch (e) {
      setErr(e.response?.data?.error || "Could not start payment.");
      setBuying(null);
    }
  };

  return (
    <div className="flex flex-col">
      <Helmet>
        <title>Pricing — Trend Tribe Tokens</title>
        <meta name="description" content="Buy Trend Tribe tokens — 1 token ₦200. See what tokens buy: boost, extra listings, extend, AI." />
        <link rel="canonical" href="https://trendtribee.netlify.app/pricing" />
      </Helmet>

      {/* Hero */}
      <section className="relative text-white overflow-hidden" style={{ background: "#0F1F3D", paddingTop: "80px", paddingBottom: "72px" }}>
        <div className="absolute inset-0 pointer-events-none" style={{ backgroundImage: "linear-gradient(rgba(255,255,255,0.03) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.03) 1px, transparent 1px)", backgroundSize: "48px 48px" }} />
        <div className="container-app relative z-10">
          <div className="max-w-2xl">
            <div className="inline-flex items-center gap-2 bg-white/10 border border-white/20 rounded-full px-4 py-2 mb-6">
              <span className="w-2 h-2 rounded-full" style={{ background: "#F5C518" }} />
              <span className="text-sm font-semibold text-white/90">1 token = ₦200 · Flutterwave</span>
            </div>
            <h1 className="text-4xl md:text-5xl font-extrabold leading-tight mb-4">
              Tokens that buy <span style={{ color: "#F5C518" }}>attention, not permission</span>
            </h1>
            <p className="text-white/70 text-lg leading-relaxed">
              First 3 active listings are free forever. Tokens only buy extra visibility and time — boost to Featured, extend a ghost, or ask Frederick. Contacting sellers and browsing is always free.
            </p>
            {isAuthenticated && user && (
              <p className="text-white/90 text-sm mt-4">
                Your balance: <span className="font-bold">🪙 {Math.floor(user.tokenBalance || 0)} token{user.tokenBalance===1?"":"s"}</span> <span className="text-white/60">({(user.tokenBalance||0)*4} units)</span>
              </p>
            )}
          </div>
        </div>
      </section>

      {/* Packages */}
      <section className="container-app py-14">
        <h2 className="text-gray-900 mb-2 text-center">Buy tokens</h2>
        <p className="text-gray-500 text-center mb-8">Pay with Flutterwave — you’ll be redirected, then back to <code>/tokens/callback</code>.</p>
        {err && <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl mb-4 text-sm text-center">{err}</div>}
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-5 max-w-5xl mx-auto">
          {PACKAGES.map((p) => (
            <motion.div
              key={p.qty}
              whileHover={reduced ? {} : { y: -4 }}
              className={`card p-6 flex flex-col relative ${p.popular ? "ring-2 ring-amber-400" : ""}`}
            >
              {p.popular && <span className="absolute -top-3 left-1/2 -translate-x-1/2 bg-amber-400 text-amber-900 text-xs font-bold px-3 py-1 rounded-full">Most popular</span>}
              <h3 className="font-bold text-gray-900">{p.label}</h3>
              <p className="text-3xl font-extrabold text-primary-600 mt-2">₦{p.price.toLocaleString()}</p>
              <p className="text-sm text-gray-500 mt-1">{p.desc}</p>
              <p className="text-xs text-gray-400 mt-2">₦{200}/token</p>
              <button
                onClick={() => handleBuy(p.qty)}
                disabled={buying !== null}
                className="mt-6 inline-flex items-center justify-center gap-2 font-bold px-4 py-3 rounded-2xl text-sm w-full disabled:opacity-60"
                style={{ background: p.popular ? "#F5C518" : "#0F1F3D", color: p.popular ? "#0F1F3D" : "white" }}
              >
                <FiCreditCard className="w-4 h-4" />
                {buying === p.qty ? "Redirecting..." : `Buy ${p.qty} token${p.qty>1?"s":""}`}
              </button>
            </motion.div>
          ))}
        </div>
        <p className="text-center text-xs text-gray-400 mt-4">Tokens are added after Flutterwave verifies via <code>POST /api/payments/webhook</code> (hash) or <code>GET /api/payments/verify</code>. 1 token = 4 units internally.</p>
      </section>

      {/* What tokens buy */}
      <section className="py-14" style={{ background: "#EEF4FF" }}>
        <div className="container-app">
          <h2 className="text-gray-900 mb-2 text-center">What tokens buy</h2>
          <p className="text-gray-500 text-center mb-8">Seller-only, always optional. Buyers never need tokens.</p>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-5">
            {USAGE.map(({ icon, title, cost, detail }) => (
              <div key={title} className="card p-6">
                <div className="w-10 h-10 rounded-2xl flex items-center justify-center mb-3" style={{ background: "#DAE8FF" }}>
                  <span className="text-primary-600">{icon}</span>
                </div>
                <h4 className="text-gray-900 mb-1">{title}</h4>
                <p className="text-sm font-bold text-amber-600 mb-1">{cost}</p>
                <p className="text-sm text-gray-500 leading-relaxed">{detail}</p>
              </div>
            ))}
          </div>
          <div className="text-center mt-8">
            <Link to="/features" className="inline-flex items-center gap-2 text-sm font-semibold text-primary-600 hover:underline">See all features <FiArrowRight className="w-4 h-4" /></Link>
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="container-app py-14">
        <h3 className="text-gray-900 font-bold mb-4">Quick answers</h3>
        <div className="grid md:grid-cols-2 gap-6 text-sm leading-relaxed">
          <div>
            <p className="font-semibold text-gray-900">Do my 3 free slots come back?</p>
            <p className="text-gray-500">Yes — free means 3 *active* at once, not lifetime. Hide or delete one (or it auto-hides after 30d) and the slot frees. The 4th active at the same time is what costs 1 token — even via re-activate (the loophole we closed).</p>
          </div>
          <div>
            <p className="font-semibold text-gray-900">Where does Featured show?</p>
            <p className="text-gray-500">Only on top of <code>/marketplace</code> (A) — same product card, click to detail. Not on Home. 24h, then it falls back to normal. You see ★ Featured and hours left in My Listings.</p>
          </div>
          <div>
            <p className="font-semibold text-gray-900">Can I hide then unhide to get 4 for free?</p>
            <p className="text-gray-500">No — re-activating the hidden one when you already have 3 active now asks for 1 token confirm, same as posting the 4th.</p>
          </div>
          <div>
            <p className="font-semibold text-gray-900">Do buyers need tokens?</p>
            <p className="text-gray-500">No. Browsing, searching, favoriting, and Contact Seller (WhatsApp) are free. Seller pays for visibility/time, not buyer for contact.</p>
          </div>
        </div>
      </section>
    </div>
  );
};

export default PricingPage;
