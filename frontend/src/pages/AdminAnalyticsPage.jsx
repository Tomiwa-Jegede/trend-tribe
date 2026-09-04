// src/pages/AdminAnalyticsPage.jsx — Full analytics dashboard
import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import AdminLayout from "../components/admin/AdminLayout";
import { MiniSpinner } from "../components/ui/LoadingSpinner";
import { getMoneyAnalytics, getFunnelAnalytics, getSearchAnalytics, getAiAnalytics } from "../services/analyticsService";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";

const TABS = [
  { id: "overview", label: "Overview" },
  { id: "money", label: "Money" },
  { id: "funnel", label: "Funnel" },
  { id: "search", label: "Search" },
  { id: "ai", label: "AI" },
];

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
  const [search, setSearch] = useState(null);
  const [ai, setAi] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const [m, f, se, a] = await Promise.all([
          getMoneyAnalytics(30).catch(() => null),
          getFunnelAnalytics().catch(() => null),
          getSearchAnalytics().catch(() => null),
          getAiAnalytics().catch(() => null),
        ]);
        setMoney(m); setFunnel(f); setSearch(se); setAi(a);
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
          <Card title="Favorites" value={funnel?.funnel?.[1]?.count ?? 0} sub="Hearts total" />
          <Card title="Contact Views" value={funnel?.funnel?.[2]?.count ?? 0} sub="WhatsApp taps" />
          <Card title="Zero-result searches" value={search?.zeroResults?.length ?? 0} sub="What users can't find" />
          <Card title="Messages" value={funnel?.funnel?.[3]?.count ?? 0} sub="Inbox messages" />
          <Card title="AI Free today" value={ai?.free?.usedToday ?? 0} sub={`${ai?.free?.limitUser || 20}/user · ${ai?.free?.limitGuest || 10}/guest`} />
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

      {tab === "ai" && ai && (
        <div className="space-y-6">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <Card title="Free used today" value={ai.free.usedToday} sub={`${ai.free.limitGuest} guest / ${ai.free.limitUser} user`} />
            <Card title="Total free" value={ai.free.totalFree} sub="All time" />
            <Card title="Paid sessions" value={ai.paid.sessions} sub={`${ai.paid.tokensSpent} tokens spent`} />
            <Card title="Gemini key" value={ai.gemini.keySet ? "Set ✅" : "Missing ❌"} sub={ai.gemini.keySet ? "Ready" : "Add GEMINI_API_KEY"} />
          </div>
          <div className="bg-white border border-sage-100 rounded-xl p-4">
            <p className="text-xs font-bold uppercase tracking-widest text-gray-400 mb-3">Free help limits</p>
            <p className="text-sm text-gray-600">Guest: <span className="font-bold">{ai.free.limitGuest}/day</span> per IP · User: <span className="font-bold">{ai.free.limitUser}/day</span> per user. Shopping uses <span className="font-bold">1 token/session</span>.</p>
            <p className="text-xs text-gray-500 mt-2">{ai.gemini.note}</p>
          </div>
          <div className="bg-white border border-sage-100 rounded-xl p-4">
            <p className="text-xs font-bold uppercase tracking-widest text-gray-400 mb-3">Recent free uses</p>
            {ai.free.recentFree?.length ? ai.free.recentFree.map((r) => (
              <div key={r.id} className="flex justify-between text-sm py-1 border-b border-sage-50 last:border-0"><span className="truncate pr-4">{r.identifier}</span><span className="font-bold">{r.count} on {r.date}</span></div>
            )) : <p className="text-sm text-gray-400">No free uses yet</p>}
          </div>
        </div>
      )}
    </AdminLayout>
  );
};

export default AdminAnalyticsPage;
