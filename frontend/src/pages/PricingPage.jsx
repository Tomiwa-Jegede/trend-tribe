// src/pages/PricingPage.jsx — Simple pricing
import { useState } from "react";
import { Helmet } from "react-helmet-async";
import { FiCreditCard } from "react-icons/fi";
import api from "../api/axios";
import { useAuth } from "../context/AuthContext";

const PACKAGES = [
  { qty: 1, label: "1 Token", price: 200, popular: false },
  { qty: 5, label: "5 Tokens", price: 1000, popular: true },
  { qty: 10, label: "10 Tokens", price: 2000, popular: false },
  { qty: 20, label: "20 Tokens", price: 4000, popular: false },
];

const PricingPage = () => {
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
        <title>Pricing — Trend Tribe</title>
        <meta name="description" content="1 token = ₦200. Use tokens to sell more on Trend Tribe." />
      </Helmet>

      {/* Top */}
      <section className="text-white" style={{ background: "#0F1F3D", paddingTop: "72px", paddingBottom: "56px" }}>
        <div className="container-app">
          <h1 className="text-4xl font-extrabold">Pricing is simple</h1>
          <p className="text-white/70 text-lg mt-3 max-w-xl">1 token = ₦200. Pay with Flutterwave. Tokens go to your account right after payment.</p>
          {isAuthenticated && user && (
            <p className="text-white/90 text-sm mt-4">You have: <span className="font-bold">{user.tokenBalance || 0} tokens</span></p>
          )}
          <p className="text-white/60 text-sm mt-2">You get 3 free items at a time. Tokens are only for extra.</p>
        </div>
      </section>

      {/* Buy */}
      <section className="container-app py-10">
        <h2 className="text-gray-900 text-center">Buy tokens</h2>
        {err && <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl mt-4 text-sm text-center">{err}</div>}
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4 max-w-5xl mx-auto mt-6">
          {PACKAGES.map((p) => (
            <div key={p.qty} className={`card p-6 text-center relative ${p.popular ? "ring-2 ring-amber-400" : ""}`}>
              {p.popular && <span className="absolute -top-3 left-1/2 -translate-x-1/2 bg-amber-400 text-amber-900 text-xs font-bold px-3 py-1 rounded-full">Most popular</span>}
              <h3 className="font-bold text-gray-900">{p.label}</h3>
              <p className="text-2xl font-extrabold text-primary-600 mt-1">₦{p.price.toLocaleString()}</p>
              <button
                onClick={() => handleBuy(p.qty)}
                disabled={buying !== null}
                className="mt-4 w-full font-bold px-4 py-3 rounded-2xl text-sm flex items-center justify-center gap-2 disabled:opacity-60"
                style={{ background: p.popular ? "#F5C518" : "#0F1F3D", color: p.popular ? "#0F1F3D" : "white" }}
              >
                <FiCreditCard className="w-4 h-4" />
                {buying === p.qty ? "Please wait..." : "Buy now"}
              </button>
            </div>
          ))}
        </div>
      </section>

      {/* What tokens do */}
      <section className="py-10" style={{ background: "#EEF4FF" }}>
        <div className="container-app">
          <h2 className="text-gray-900 text-center">What can you do with tokens?</h2>
          <div className="grid md:grid-cols-2 gap-4 max-w-4xl mx-auto mt-6">
            <div className="card p-5">
              <h4 className="font-bold text-gray-900">Sell a 4th item at the same time</h4>
              <p className="text-sm text-gray-500 mt-1"><span className="font-bold text-amber-600">1 token</span> — You get 3 items free at the same time. To add a 4th, use 1 token.</p>
            </div>
            <div className="card p-5">
              <h4 className="font-bold text-gray-900">Make your item Featured</h4>
              <p className="text-sm text-gray-500 mt-1"><span className="font-bold text-amber-600">1 token</span> — Shows your card at the top of Marketplace for 24 hours.</p>
            </div>
            <div className="card p-5">
              <h4 className="font-bold text-gray-900">Bring back a hidden item</h4>
              <p className="text-sm text-gray-500 mt-1"><span className="font-bold text-amber-600">1 token</span> — If you already have 3 items, bringing back a hidden one costs 1 token.</p>
            </div>
            <div className="card p-5">
              <h4 className="font-bold text-gray-900">Keep your item longer</h4>
              <p className="text-sm text-gray-500 mt-1"><span className="font-bold text-amber-600">1 token</span> — Adds 14 more days before it hides.</p>
            </div>
            <div className="card p-5">
              <h4 className="font-bold text-gray-900">Ask Frederick for help</h4>
              <p className="text-sm text-gray-500 mt-1"><span className="font-bold text-amber-600">Less than 1 token</span> — Small fee for AI help.</p>
            </div>
            <div className="card p-5">
              <h4 className="font-bold text-gray-900">Everything else is free</h4>
              <p className="text-sm text-gray-500 mt-1"><span className="font-bold text-amber-600">Free</span> — Look around, search, save items, chat on WhatsApp.</p>
            </div>
          </div>
        </div>
      </section>

      {/* Simple answers */}
      <section className="container-app py-10">
        <div className="max-w-3xl mx-auto grid gap-4 text-sm">
          <div className="card p-4">
            <p className="font-bold text-gray-900">Do I lose my 3 free items?</p>
            <p className="text-gray-500">No. Hide or delete one and you get the free space back.</p>
          </div>
          <div className="card p-4">
            <p className="font-bold text-gray-900">Can I hide then show again to get 4 free?</p>
            <p className="text-gray-500">No. Showing the 4th item again will ask for 1 token.</p>
          </div>
          <div className="card p-4">
            <p className="font-bold text-gray-900">Do buyers need tokens?</p>
            <p className="text-gray-500">No. Only sellers use tokens.</p>
          </div>
        </div>
      </section>
    </div>
  );
};

export default PricingPage;
