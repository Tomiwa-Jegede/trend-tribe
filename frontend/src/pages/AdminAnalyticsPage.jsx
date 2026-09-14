// src/pages/AdminAnalyticsPage.jsx — Full analytics dashboard
import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import AdminLayout from "../components/admin/AdminLayout";
import { MiniSpinner } from "../components/ui/LoadingSpinner";
import { getMoneyAnalytics, getFunnelAnalytics, getSearchAnalytics, getAiAnalytics, getPostHogAnalytics, getPostHogReplays } from "../services/analyticsService";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";

const TABS = [
  { id: "overview", label: "Overview" },
  { id: "money", label: "Money" },
  { id: "funnel", label: "Funnel" },
  { id: "search", label: "Search" },
  { id: "ai", label: "AI" },
  { id: "posthog", label: "PostHog" },
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
  const [posthog, setPosthog] = useState(null);
  const [replays, setReplays] = useState(null);
  const [replayId, setReplayId] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const [m, f, se, a, ph, rp] = await Promise.all([
          getMoneyAnalytics(30).catch(() => null),
          getFunnelAnalytics().catch(() => null),
          getSearchAnalytics().catch(() => null),
          getAiAnalytics().catch(() => null),
          getPostHogAnalytics().catch(() => null),
          getPostHogReplays(10).catch(() => null),
        ]);
        setMoney(m); setFunnel(f); setSearch(se); setAi(a); setPosthog(ph); setReplays(rp);
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
                <a key={l.id} href={`/listings/${l.slug || l.id}`} className="grid grid-cols-[1fr_auto] gap-2 items-center min-w-0 overflow-hidden text-sm border-b border-sage-50 py-2 hover:text-primary-600">
                  <span className="truncate min-w-0 block">{l.title}</span><span className="font-bold whitespace-nowrap flex-shrink-0 text-right">👁 {l.contactViews} · ♥ {l._count.favorites}</span>
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
            <Card title="Gemini today" value={`${ai.gemini.usedToday} / ${ai.gemini.dailyLimit}`} sub={`${ai.gemini.remaining} left · ${ai.gemini.percentUsed}% used`} />
            <Card title="Free help today" value={ai.free.usedToday} sub={`${ai.free.limitGuest} guest / ${ai.free.limitUser} user`} />
            <Card title="Paid shopping" value={ai.paid.sessions} sub={`${ai.paid.tokensSpent} tokens spent`} />
            <Card title="Gemini key" value={ai.gemini.keySet ? "Set ✅" : "Missing ❌"} sub={ai.free.note} />
          </div>
          <div className="bg-white border border-sage-100 rounded-xl p-4">
            <p className="text-xs font-bold uppercase tracking-widest text-gray-400 mb-3">Gemini free tier</p>
            <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden mb-3">
              <div className={`h-full ${ai.gemini.percentUsed > 90 ? "bg-red-500" : ai.gemini.percentUsed > 70 ? "bg-amber-400" : "bg-primary-600"}`} style={{ width: `${Math.min(100, ai.gemini.percentUsed)}%` }} />
            </div>
            <p className="text-sm text-gray-600">Gemini 2.0 Flash free: <span className="font-bold">1500/day, 60/min, 1M tokens/day</span> — resets midnight Pacific. Used <span className="font-bold">{ai.gemini.usedToday}</span> today, <span className="font-bold">{ai.gemini.remaining}</span> left.</p>
            <p className="text-xs text-gray-500 mt-2">{ai.gemini.note}</p>
            <p className="text-xs text-gray-500 mt-1">Each user/IP has own free limit (10 guest / 20 user per day) — one user's use does not affect another. Shopping always 1 token/session.</p>
          </div>
          <div className="bg-white border border-sage-100 rounded-xl p-4">
            <p className="text-xs font-bold uppercase tracking-widest text-gray-400 mb-3">Recent free uses (per user/IP)</p>
            {ai.free.recentFree?.length ? ai.free.recentFree.map((r) => (
              <div key={r.id} className="flex justify-between text-sm py-1 border-b border-sage-50 last:border-0"><span className="truncate pr-4">{r.identifier}</span><span className="font-bold">{r.count} on {r.date}</span></div>
            )) : <p className="text-sm text-gray-400">No free uses yet</p>}
          </div>
        </div>
      )}

      {tab === "posthog" && (
        <div className="space-y-6">
          {!posthog ? <p className="text-sm text-gray-400">No PostHog data yet</p> : !posthog.configured ? (
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
              <p className="text-sm font-bold text-amber-800">PostHog not configured</p>
              <p className="text-xs text-amber-700 mt-1">{posthog.message}</p>
              <p className="text-xs text-gray-600 mt-2">Add to <code className="bg-white px-1 rounded">backend/.env</code>: <code className="bg-white px-1 rounded">POSTHOG_API_KEY=phx_xxx</code> (Personal API key from PostHog → Project Settings → Project API keys → Create personal API key) + <code className="bg-white px-1 rounded">POSTHOG_PROJECT_ID=609560</code>. Host: <code className="bg-white px-1 rounded">{posthog.host}</code></p>
              <a href="https://us.posthog.com/project/609560" target="_blank" rel="noreferrer" className="text-xs text-primary-600 hover:underline mt-2 inline-block">Open PostHog →</a>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                <Card title="Pageviews 7d" value={posthog.pageviews7d} sub={`${posthog.pageviews30d} in 30d`} />
                <Card title="Users 30d" value={posthog.distinctUsers30d} sub="distinct person_id" />
                <Card title="Events tracked" value={posthog.topEvents?.length || 0} sub="top event types" />
                <Card title="Project" value={posthog.projectId} sub={posthog.host} />
              </div>
              {posthog._warning && <p className="text-xs text-amber-600 bg-amber-50 border border-amber-200 rounded p-2">{posthog._warning}: {posthog._errors?.join("; ")}</p>}
              <div className="bg-white border border-sage-100 rounded-xl p-4">
                <p className="text-xs font-bold uppercase tracking-widest text-gray-400 mb-3">Pageviews last 14 days</p>
                <div style={{ height: 200 }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={posthog.daily || []}>
                      <XAxis dataKey="day" tick={{ fontSize: 10 }} />
                      <YAxis tick={{ fontSize: 10 }} />
                      <Tooltip />
                      <Bar dataKey="count" fill="#1340B8" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="bg-white border border-sage-100 rounded-xl p-4">
                  <p className="text-xs font-bold uppercase tracking-widest text-gray-400 mb-3">Top pages 7d</p>
                  {posthog.topPages?.length ? posthog.topPages.map((p) => (
                    <div key={p.url} className="flex justify-between text-sm py-1 border-b border-sage-50 last:border-0"><span className="truncate pr-4">{p.url || "(no url)"}</span><span className="font-bold">{p.count}</span></div>
                  )) : <p className="text-sm text-gray-400">No pageviews yet</p>}
                </div>
                <div className="bg-white border border-sage-100 rounded-xl p-4">
                  <p className="text-xs font-bold uppercase tracking-widest text-gray-400 mb-3">Top events 7d</p>
                  {posthog.topEvents?.length ? posthog.topEvents.map((e) => (
                    <div key={e.event} className="flex justify-between text-sm py-1 border-b border-sage-50 last:border-0"><span className="truncate pr-4">{e.event}</span><span className="font-bold">{e.count}</span></div>
                  )) : <p className="text-sm text-gray-400">No events yet</p>}
                </div>
              </div>
              <div className="bg-white border border-sage-100 rounded-xl p-4">
                <p className="text-xs font-bold uppercase tracking-widest text-gray-400 mb-3">Recent session replays</p>
                {!replays ? <p className="text-sm text-gray-400">Loading…</p> : !replays.configured ? (
                  <p className="text-xs text-amber-700">{replays.message} — add <code className="bg-gray-100 px-1 rounded">POSTHOG_API_KEY</code> then refresh.</p>
                ) : replays.replays?.length ? (
                  <div className="space-y-2">
                    {replays.replays.map((r) => (
                      <button key={r.id} onClick={() => setReplayId(r.id)} className={`w-full text-left flex justify-between items-center text-sm py-2 px-3 rounded border ${replayId === r.id ? "bg-navy-900 text-white border-navy-900" : "bg-white border-sage-100 hover:bg-sage-50"}`}>
                        <span className="truncate pr-3">{r.start_url || r.id.slice(0, 8)} · {r.distinct_id?.slice(0, 12) || "anon"}</span>
                        <span className="text-xs whitespace-nowrap">{r.duration ? `${Math.round(r.duration / 1000)}s` : ""} {new Date(r.start_time).toLocaleDateString()}</span>
                      </button>
                    ))}
                  </div>
                ) : <p className="text-sm text-gray-400">No replays yet — enable session recording in PostHog project settings.</p>}
                {replayId && replays?.configured && (
                  <div className="mt-4">
                    <p className="text-xs font-bold text-gray-500 mb-2">Playing {replayId.slice(0, 8)} — <a href={`https://us.posthog.com/project/${posthog.projectId}/replay/${replayId}`} target="_blank" rel="noreferrer" className="text-primary-600 hover:underline">open in PostHog →</a> <button onClick={() => setReplayId(null)} className="ml-2 text-xs underline">close</button></p>
                    <div className="rounded-xl overflow-hidden border border-sage-100 bg-black" style={{ height: 480 }}>
                      <iframe title="PostHog replay" src={`https://us.posthog.com/project/${posthog.projectId}/replay/${replayId}`} style={{ width: "100%", height: "100%", border: 0 }} allow="fullscreen" />
                    </div>
                    <p className="text-xs text-gray-400 mt-1">If iframe shows login, open in new tab — PostHog replays require PostHog auth (admin only, proxied via backend, no key in browser).</p>
                  </div>
                )}
              </div>
              <a href={`https://us.posthog.com/project/${posthog.projectId}`} target="_blank" rel="noreferrer" className="text-xs text-primary-600 hover:underline">Open in PostHog →</a>
            </>
          )}
        </div>
      )}
    </AdminLayout>
  );
};

export default AdminAnalyticsPage;
