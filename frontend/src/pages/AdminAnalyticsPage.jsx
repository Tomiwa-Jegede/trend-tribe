// src/pages/AdminAnalyticsPage.jsx — Full analytics dashboard
import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import AdminLayout from "../components/admin/AdminLayout";
import { MiniSpinner } from "../components/ui/LoadingSpinner";
import { getMoneyAnalytics, getFunnelAnalytics, getSupplyAnalytics, getGrowthAnalytics, getSearchAnalytics, getTrustAnalytics } from "../services/analyticsService";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, LineChart, Line, PieChart, Pie, Cell } from "recharts";

const TABS = [
  { id: "overview", label: "Overview" },
  { id: "money", label: "Money" },
  { id: "funnel", label: "Funnel" },
  { id: "supply", label: "Supply" },
  { id: "growth", label: "Growth" },
  { id: "search", label: "Search" },
  { id: "trust", label: "Trust" },
];

const COLORS = ["#1340B8", "#F5C518", "#10b981", "#ef4444", "#8b5cf6", "#ec4899"];

const Card = ({ title, value, sub }) => (
  <div className="bg-white border border-sage-100 rounded-xl p-4">
    <p className="text-xs font-semibold uppercase tracking-widest text-gray-400">{title}</p>
    <p className="text-2xl font-bold text-navy-900 mt-1">{value}</p>
    {sub && <p className="text-xs text-gray-500 mt-1">{sub}</p>}
  </div>
);

const AdminAnalyticsPage = () => {
  const [tab, setTab] = useState("overview");
  const [money, setMoney] = useState(null);
  const [funnel, setFunnel] = useState(null);
  const [supply, setSupply] = useState(null);
  const [growth, setGrowth] = useState(null);
  const [search, setSearch] = useState(null);
  const [trust, setTrust] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const [m, f, s, g, se, t] = await Promise.all([
          getMoneyAnalytics(30).catch(() => null),
          getFunnelAnalytics().catch(() => null),
          getSupplyAnalytics().catch(() => null),
          getGrowthAnalytics().catch(() => null),
          getSearchAnalytics().catch(() => null),
          getTrustAnalytics().catch(() => null),
        ]);
        setMoney(m); setFunnel(f); setSupply(s); setGrowth(g); setSearch(se); setTrust(t);
      } finally { setLoading(false); }
    };
    load();
  }, []);

  if (loading) return <AdminLayout><div className="flex items-center gap-2 py-10 text-gray-500"><MiniSpinner size={20} /> Loading analytics…</div></AdminLayout>;

  return (
    <AdminLayout>
      <h1 className="text-xl font-bold text-navy-900">Analytics</h1>
      <p className="text-sm text-gray-500 mb-4">Simple view of how Trend Tribe is doing. Tap a tab to see details.</p>

      <div className="flex gap-2 mb-6 flex-wrap">
        {TABS.map((t) => (
          <button key={t.id} onClick={() => setTab(t.id)} className={`px-3 py-1.5 rounded-full text-xs font-bold border ${tab === t.id ? "bg-navy-900 text-white border-navy-900" : "bg-white text-gray-600 border-sage-100"}`}>{t.label}</button>
        ))}
        <Link to="/admin" className="ml-auto text-xs text-primary-600 hover:underline">← Dashboard</Link>
      </div>

      {tab === "overview" && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Card title="Revenue (30d)" value={`₦${Number(money?.revenueNaira || 0).toLocaleString()}`} sub={`${money?.tokensSold || 0} tokens sold`} />
          <Card title="Active Listings" value={supply ? supply.ghost + (supply.byCategory?.reduce((a,c)=>a+c._count,0) - supply.ghost) : "—"} sub={`${supply?.ghost || 0} ghost (0 fav)`} />
          <Card title="DAU" value={growth?.dau ?? 0} sub={`WAU ${growth?.wau ?? 0} · MAU ${growth?.mau ?? 0}`} />
          <Card title="Favorites" value={funnel?.funnel?.[1]?.count ?? 0} sub="Hearts total" />
          <Card title="Contact Views" value={funnel?.funnel?.[2]?.count ?? 0} sub="WhatsApp taps" />
          <Card title="Zero-result searches" value={search?.zeroResults?.length ?? 0} sub="What users can't find" />
        </div>
      )}

      {tab === "money" && money && (
        <div className="space-y-6">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <Card title="Revenue" value={`₦${Number(money.revenueNaira).toLocaleString()}`} sub={`${money.tokensSold} tokens`} />
            <Card title="Purchases" value={money.successfulPurchases} sub={`${money.failedPurchases} failed`} />
            <Card title="Avg per purchase" value={money.avgTokensPerPurchase} sub="tokens" />
            <Card title="Total balance" value={Number(money.totalTokenBalance).toFixed(0)} sub={`avg ${money.avgBalance} per user`} />
          </div>
          <div className="bg-white border border-sage-100 rounded-xl p-4">
            <p className="text-xs font-bold uppercase tracking-widest text-gray-400 mb-3">Revenue last {money.daily?.length || 0} days</p>
            <div style={{ height: 200 }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={money.daily || []}>
                  <XAxis dataKey="day" tick={{ fontSize: 10 }} />
                  <YAxis tick={{ fontSize: 10 }} />
                  <Tooltip />
                  <Bar dataKey="revenue" fill="#1340B8" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      )}

      {tab === "funnel" && funnel && (
        <div className="space-y-6">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {funnel.funnel.map((s) => <Card key={s.step} title={s.step} value={s.count} />)}
          </div>
          <div className="bg-white border border-sage-100 rounded-xl p-4">
            <p className="text-xs font-bold uppercase tracking-widest text-gray-400 mb-3">Top by contact views (what buyers actually tap)</p>
            <div className="flex flex-col gap-2">
              {funnel.topByFunnel?.map((l) => (
                <a key={l.id} href={`/listings/${l.slug || l.id}`} className="flex justify-between text-sm border-b border-sage-50 py-2 hover:text-primary-600">
                  <span className="truncate pr-4">{l.title}</span><span className="font-bold">👁 {l.contactViews} · ♥ {l._count.favorites}</span>
                </a>
              ))}
            </div>
          </div>
        </div>
      )}

      {tab === "supply" && supply && (
        <div className="space-y-6">
          <div className="bg-white border border-sage-100 rounded-xl p-4">
            <p className="text-xs font-bold uppercase tracking-widest text-gray-400 mb-3">Listings by category</p>
            <div style={{ height: 200 }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={supply.byCategory?.map((c) => ({ name: c.category, count: c._count })) || []}>
                  <XAxis dataKey="name" tick={{ fontSize: 10 }} interval={0} angle={-15} dy={10} height={50} />
                  <YAxis />
                  <Tooltip />
                  <Bar dataKey="count" fill="#F5C518" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="bg-white border border-sage-100 rounded-xl p-4">
              <p className="text-xs font-bold uppercase tracking-widest text-gray-400 mb-3">By condition</p>
              <div style={{ height: 180 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={supply.byCondition?.map((c) => ({ name: c.condition, value: c._count })) || []} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={70}>
                      {(supply.byCondition || []).map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>
            <div className="bg-white border border-sage-100 rounded-xl p-4">
              <p className="text-xs font-bold uppercase tracking-widest text-gray-400 mb-3">Price buckets</p>
              {supply.priceBuckets?.map((b) => (
                <div key={b.bucket} className="flex justify-between text-sm py-1 border-b border-sage-50 last:border-0"><span>{b.bucket}</span><span className="font-bold">{b.count}</span></div>
              ))}
              <p className="text-xs text-gray-500 mt-3">Ghost: {supply.ghost} (0 fav, active) · Boosted: {supply.boosted}</p>
            </div>
          </div>
        </div>
      )}

      {tab === "growth" && growth && (
        <div className="space-y-6">
          <div className="grid grid-cols-3 gap-4">
            <Card title="DAU" value={growth.dau} sub="Contact viewers today" />
            <Card title="WAU" value={growth.wau} sub="Last 7 days" />
            <Card title="MAU" value={growth.mau} sub="Last 30 days" />
          </div>
          <div className="bg-white border border-sage-100 rounded-xl p-4">
            <p className="text-xs font-bold uppercase tracking-widest text-gray-400 mb-3">Signups last 14 days</p>
            <div style={{ height: 180 }}>
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={growth.signups || []}>
                  <XAxis dataKey="day" tick={{ fontSize: 10 }} />
                  <YAxis tick={{ fontSize: 10 }} />
                  <Tooltip />
                  <Line type="monotone" dataKey="count" stroke="#1340B8" strokeWidth={2} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
          <div className="bg-white border border-sage-100 rounded-xl p-4">
            <p className="text-xs font-bold uppercase tracking-widest text-gray-400 mb-3">Top schools</p>
            {growth.bySchool?.map((s) => <div key={s.school} className="flex justify-between text-sm py-1 border-b border-sage-50 last:border-0"><span className="truncate pr-4">{s.school || "—"}</span><span className="font-bold">{s._count}</span></div>)}
          </div>
        </div>
      )}

      {tab === "search" && search && (
        <div className="space-y-6">
          <div className="bg-white border border-sage-100 rounded-xl p-4">
            <p className="text-xs font-bold uppercase tracking-widest text-gray-400 mb-3">Top searches</p>
            {search.topQueries?.length ? search.topQueries.map((q) => (
              <div key={q.query} className="flex justify-between text-sm py-1 border-b border-sage-50 last:border-0"><span className="truncate pr-4">{q.query}</span><span className="font-bold">{q._count} · avg {Number(q._avg.results || 0).toFixed(0)} results</span></div>
            )) : <p className="text-sm text-gray-400">No searches yet</p>}
          </div>
          <div className="bg-white border border-sage-100 rounded-xl p-4">
            <p className="text-xs font-bold uppercase tracking-widest text-gray-400 mb-3">Zero-result searches (what users want but can't find)</p>
            {search.zeroResults?.length ? search.zeroResults.map((r) => (
              <div key={r.id} className="flex justify-between text-sm py-1 border-b border-sage-50 last:border-0"><span className="truncate pr-4">{r.query} {r.category ? `· ${r.category}` : ""}</span><span className="text-gray-400 text-xs">{new Date(r.createdAt).toLocaleDateString()}</span></div>
            )) : <p className="text-sm text-gray-400">No zero-result searches</p>}
          </div>
        </div>
      )}

      {tab === "trust" && trust && (
        <div className="space-y-6">
          <div className="grid grid-cols-3 gap-4">
            <Card title="Pending reports" value={trust.pending} />
            <Card title="Ignored" value={trust.ignored} />
            <Card title="Total" value={trust.pending + trust.ignored} />
          </div>
          <div className="bg-white border border-sage-100 rounded-xl p-4">
            <p className="text-xs font-bold uppercase tracking-widest text-gray-400 mb-3">Reports by reason</p>
            {trust.byReason?.map((r) => <div key={r.reason} className="flex justify-between text-sm py-1 border-b border-sage-50 last:border-0"><span>{r.reason}</span><span className="font-bold">{r._count}</span></div>)}
          </div>
        </div>
      )}
    </AdminLayout>
  );
};

export default AdminAnalyticsPage;
