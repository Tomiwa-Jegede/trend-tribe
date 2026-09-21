// src/pages/ReferralPage.jsx
import { useEffect, useState } from "react";
import api from "../api/axios";
import { useToast } from "../context/ToastContext";
import InfoModal from "../components/ui/InfoModal";

const ReferralPage = () => {
  const { toast } = useToast();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [commissions, setCommissions] = useState([]);
  const [commissionsLoading, setCommissionsLoading] = useState(true);
  const [editCode, setEditCode] = useState("");
  const [savingCode, setSavingCode] = useState(false);
  const [editing, setEditing] = useState(false);

  const load = async () => {
    setLoading(true);
    setError("");
    try {
      const res = await api.get("/referrals/me");
      setData(res.data);
      setEditCode(res.data.referralCode || "");
    } catch (e) { setError(e.response?.data?.error || "Could not load referrals"); }
    finally { setLoading(false); }
  };
  const loadCommissions = async () => {
    setCommissionsLoading(true);
    try {
      const res = await api.get("/referrals/commissions", { params: { limit: 20 } });
      setCommissions(res.data.commissions || []);
    } catch {} finally { setCommissionsLoading(false); }
  };
  useEffect(() => { load(); loadCommissions(); }, []);

  const copyLink = async () => {
    if (!data?.referralLink) return;
    await navigator.clipboard.writeText(data.referralLink);
    toast.success("Link copied");
  };
  const shareLink = async () => {
    if (!data?.referralLink) return;
    if (navigator.share && navigator.canShare?.({ url: data.referralLink })) {
      try { await navigator.share({ title: "Join Trend Tribe", url: data.referralLink }); return; } catch {}
    }
    await copyLink();
  };
  const saveCode = async () => {
    const code = editCode.trim().toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 12);
    if (code.length < 4 || code.length > 12) return toast.error("Code must be 4-12 letters/numbers");
    setSavingCode(true);
    try {
      const res = await api.patch("/referrals/code", { code });
      setData((prev) => ({ ...prev, referralCode: res.data.referralCode, referralLink: res.data.referralLink }));
      setEditing(false);
      toast.success("Referral code updated");
    } catch (e) { toast.error(e.response?.data?.error || "Could not update code"); }
    finally { setSavingCode(false); }
  };

  if (loading) return <div className="max-w-3xl mx-auto p-6"><div className="animate-pulse h-32 bg-gray-100 rounded-xl" /></div>;
  if (error) return <div className="max-w-3xl mx-auto p-6"><p className="text-red-600">{error}</p><button onClick={load} className="mt-2 text-sm underline">Retry</button></div>;
  if (!data) return null;

  const { referralCode, referralLink, stats } = data;
  return (
    <div className="max-w-3xl mx-auto p-4 md:p-6 flex flex-col gap-6">
      <div>
        <div className="flex items-center gap-2">
          <h1 className="text-2xl font-bold">Invite Your Course Mates</h1>
          <InfoModal title="How referrals work">
            <p className="bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 text-sm"><span className="font-bold text-amber-800">New: Both get 1 Showcase Pass</span> — when your course mate signs up with your link and verifies matric, you both get 1 Showcase Pass instantly.</p>
            <p><span className="font-semibold text-gray-900">1. Get your code/link.</span> Everyone has a code like <span className="font-mono bg-gray-100 px-1 rounded">K8P2QX</span> and a link like <span className="font-mono text-xs break-all">trendtribe.app/signup?ref=K8P2QX</span>. You can also set your own code (4–12 letters/numbers, e.g. <span className="font-mono bg-gray-100 px-1 rounded">TOMIWA01</span>) with Edit code.</p>
            <p><span className="font-semibold text-gray-900">2. Share it.</span> Send the link to friends. They must open your link and sign up with it. One person = one referrer forever. You can’t refer yourself and you can’t change who referred you later.</p>
            <p><span className="font-semibold text-gray-900">3. Earn 5% automatically.</span> For the <span className="font-semibold">next 6 months</span> after they sign up, every time they do a real transaction — top up TrendTribe Wallet, buy tokens, complete a Task as claimer, or complete a Service as provider — you automatically get <span className="font-semibold">5% of that amount</span> in your TrendTribe Wallet. No need to claim.</p>
            <p><span className="font-semibold text-gray-900">4. Separate clock per person.</span> If you refer 10 people, each has their own 6-month window. Changing your code later doesn’t remove people you already referred, but old links stop working.</p>
            <p><span className="font-semibold text-gray-900">5. Withdraw anytime.</span> Your earnings go straight to your TrendTribe Wallet. You can withdraw with your normal withdrawal (PIN + bank) whenever you want — you don’t have to wait 6 months.</p>
            <p><span className="font-semibold text-gray-900">6. What doesn’t count:</span> failed/cancelled/expired transactions, money you send to friends, or money you withdraw. If a transaction is refunded after you were paid, that commission is reversed.</p>
            <p className="text-xs text-gray-400 border-t border-gray-100 pt-3 mt-1">Tip: If your code is taken when you try to edit, pick another. Old earnings stay safe.</p>
          </InfoModal>
        </div>
        <p className="text-sm text-gray-500">Invite Your Course Mates — you both get 1 Showcase Pass. Plus 5% for 6 months.</p>
      </div>
      <div className="bg-white border border-gray-200 rounded-2xl p-5 flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <span className="text-xs uppercase tracking-wider text-gray-400 font-semibold">Your referral code</span>
          {!editing ? <button onClick={() => setEditing(true)} className="text-xs text-primary-600 hover:underline">Edit code</button> : <button onClick={() => setEditing(false)} className="text-xs text-gray-500">Cancel</button>}
        </div>
        {!editing ? (
          <>
            <div className="font-mono text-2xl tracking-widest font-bold">{referralCode}</div>
            <div className="text-sm text-gray-600 break-all">{referralLink}</div>
            <div className="flex gap-2">
              <button onClick={copyLink} className="px-4 py-2 bg-black text-white rounded-lg text-sm">Copy link</button>
              <button onClick={shareLink} className="px-4 py-2 border border-gray-200 rounded-lg text-sm">Share</button>
            </div>
          </>
        ) : (
          <>
            <input value={editCode} onChange={(e) => setEditCode(e.target.value.toUpperCase())} placeholder="4-12 letters/numbers" className="border border-gray-200 rounded-lg px-3 py-2 font-mono text-sm" maxLength={12} />
            <p className="text-xs text-amber-600">Changing your code will make old links stop working. People you already referred stay counted.</p>
            <div className="flex gap-2">
              <button onClick={saveCode} disabled={savingCode} className="px-4 py-2 bg-black text-white rounded-lg text-sm disabled:opacity-50">{savingCode ? "Saving..." : "Save code"}</button>
              <button onClick={() => setEditing(false)} className="px-4 py-2 border rounded-lg text-sm">Cancel</button>
            </div>
            <div className="text-xs text-gray-400 break-all">Preview: {(() => { try { const u = new URL(referralLink); const c = editCode.trim().toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0,12) || referralCode; return `${u.origin}/signup?ref=${c}`; } catch { return ""; } })()}</div>
          </>
        )}
      </div>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="bg-white border rounded-xl p-4"><div className="text-xs uppercase text-gray-400">Referred</div><div className="text-xl font-bold">{stats.total}</div></div>
        <div className="bg-white border rounded-xl p-4"><div className="text-xs uppercase text-gray-400">Active</div><div className="text-xl font-bold text-green-600">{stats.active}</div></div>
        <div className="bg-white border rounded-xl p-4"><div className="text-xs uppercase text-gray-400">Expired</div><div className="text-xl font-bold text-gray-500">{stats.expired}</div></div>
        <div className="bg-white border rounded-xl p-4"><div className="text-xs uppercase text-gray-400">Total earned</div><div className="text-xl font-bold">₦{(stats.totalEarnedKobo/100).toLocaleString()}</div></div>
      </div>
      <div className="bg-white border rounded-2xl p-5">
        <h2 className="font-semibold mb-3">People you referred</h2>
        {data.referrals.length === 0 ? <p className="text-sm text-gray-500">No referrals yet — share your link.</p> : (
          <div className="flex flex-col gap-2">
            {data.referrals.map((r) => {
              const isActive = r.status === "ACTIVE";
              const daysLeft = Math.ceil((new Date(r.commissionEndAt) - new Date()) / (1000*60*60*24));
              return (
                <div key={r.id} className="flex items-center justify-between border border-gray-100 rounded-xl px-4 py-3">
                  <div>
                    <div className="text-sm font-medium">@{r.referredUser.username}</div>
                    <div className="text-xs text-gray-400">expires {new Date(r.commissionEndAt).toLocaleDateString()} · {isActive ? `${daysLeft} days left` : "expired"}</div>
                  </div>
                  <div className="text-right">
                    <span className={`text-xs px-2 py-0.5 rounded-full ${isActive ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-600"}`}>{r.status}</span>
                    <div className="text-xs text-gray-500 mt-1">₦{(r.earningsKobo/100).toLocaleString()} · {r.commissionCount} commissions</div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
      <div className="bg-white border rounded-2xl p-5">
        <h2 className="font-semibold mb-3">Earnings history</h2>
        {commissionsLoading ? <div className="animate-pulse h-20 bg-gray-100 rounded-xl" /> : commissions.length === 0 ? <p className="text-sm text-gray-500">No commissions yet.</p> : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-xs text-gray-400 uppercase"><tr><th className="text-left py-2">Date</th><th className="text-left">User</th><th className="text-left">Transaction</th><th className="text-right">Amount</th><th className="text-right">Commission</th><th className="text-left">Status</th></tr></thead>
              <tbody>
                {commissions.map((c) => (
                  <tr key={c.id} className="border-t border-gray-100">
                    <td className="py-2 text-xs text-gray-500">{new Date(c.createdAt).toLocaleDateString()}</td>
                    <td className="text-xs">@{c.referred?.username || c.referredId}</td>
                    <td className="text-xs font-mono">{c.transactionType} {c.transactionId.slice(0,12)}</td>
                    <td className="text-right text-xs">₦{(c.amountKobo/100).toLocaleString()}</td>
                    <td className="text-right text-xs font-medium">₦{(c.commissionAmount/100).toLocaleString()}</td>
                    <td className="text-xs"><span className={`px-2 py-0.5 rounded-full text-xs ${c.status==="CREDITED"?"bg-green-100 text-green-700":"bg-red-100 text-red-600"}`}>{c.status}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
export default ReferralPage;
