// src/controllers/referral.controller.js
const prisma = require("../db");
const config = require("../config/env");
const { normalizeReferralCode, setReferralCode, generateReferralCode } = require("../utils/referral");

const getMyReferral = async (req, res) => {
  try {
    let user = await prisma.user.findUnique({ where: { id: req.user.id }, select: { referralCode: true, username: true } });
    if (!user.referralCode) {
      try {
        const code = await generateReferralCode();
        const upd = await prisma.user.updateMany({ where: { id: req.user.id, referralCode: null }, data: { referralCode: code } });
        if (upd.count === 1) user.referralCode = code;
        else {
          const fresh = await prisma.user.findUnique({ where: { id: req.user.id }, select: { referralCode: true, username: true } });
          user = fresh;
        }
      } catch {}
    }
    const referralCode = user.referralCode;
    const referralLink = `${config.clientUrl}/signup?ref=${referralCode}`;
    const referrals = await prisma.referral.findMany({
      where: { referrerId: req.user.id },
      orderBy: { createdAt: "desc" },
      include: { referred: { select: { id: true, username: true, fullName: true, avatar: true } } },
    });
    const now = new Date();
    let active = 0, expired = 0;
    const enriched = await Promise.all(referrals.map(async (r) => {
      const isExpired = r.commissionEndAt < now || r.status === "EXPIRED";
      if (isExpired) expired++; else active++;
      const agg = await prisma.referralCommission.aggregate({ where: { referralId: r.id, status: "CREDITED" }, _sum: { commissionAmount: true }, _count: { id: true } });
      const rev = await prisma.referralCommission.aggregate({ where: { referralId: r.id, status: "REVERSED" }, _sum: { commissionAmount: true } });
      const earningsKobo = (agg._sum.commissionAmount || 0) - (rev._sum.commissionAmount || 0);
      return {
        id: r.id,
        referredUser: r.referred,
        referralCode: r.referralCode,
        status: isExpired ? "EXPIRED" : "ACTIVE",
        commissionStartAt: r.commissionStartAt,
        commissionEndAt: r.commissionEndAt,
        createdAt: r.createdAt,
        earningsKobo,
        commissionCount: agg._count.id || 0,
      };
    }));
    const allCommissions = await prisma.referralCommission.aggregate({ where: { referrerId: req.user.id, status: "CREDITED" }, _sum: { commissionAmount: true } });
    const revAll = await prisma.referralCommission.aggregate({ where: { referrerId: req.user.id, status: "REVERSED" }, _sum: { commissionAmount: true } });
    const totalEarnedKobo = (allCommissions._sum.commissionAmount || 0) - (revAll._sum.commissionAmount || 0);
    return res.json({
      referralCode,
      referralLink,
      canEditCode: true,
      stats: { total: referrals.length, active, expired, totalEarnedKobo },
      referrals: enriched,
    });
  } catch (err) {
    console.error("[GET MY REFERRAL ERROR]", err.message);
    return res.status(500).json({ error: "Could not load referral" });
  }
};

const getMyCommissions = async (req, res) => {
  try {
    const { page = 1, limit = 20 } = req.query;
    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const limitNum = Math.min(50, Math.max(1, parseInt(limit, 10) || 20));
    const skip = (pageNum - 1) * limitNum;
    const where = { referrerId: req.user.id };
    const [commissions, totalCount] = await Promise.all([
      prisma.referralCommission.findMany({ where, orderBy: { createdAt: "desc" }, skip, take: limitNum, include: { referred: { select: { id: true, username: true } } } }),
      prisma.referralCommission.count({ where }),
    ]);
    const totalEarned = await prisma.referralCommission.aggregate({ where: { referrerId: req.user.id, status: "CREDITED" }, _sum: { commissionAmount: true } });
    const totalReversed = await prisma.referralCommission.aggregate({ where: { referrerId: req.user.id, status: "REVERSED" }, _sum: { commissionAmount: true } });
    const net = (totalEarned._sum.commissionAmount || 0) - (totalReversed._sum.commissionAmount || 0);
    return res.json({
      commissions,
      pagination: { totalCount, totalPages: Math.ceil(totalCount / limitNum), currentPage: pageNum, limit: limitNum },
      totals: { totalEarnedKobo: net, totalCount },
    });
  } catch (err) {
    console.error("[GET COMMISSIONS ERROR]", err.message);
    return res.status(500).json({ error: "Could not load commissions" });
  }
};

const updateMyReferralCode = async (req, res) => {
  try {
    const { code } = req.body;
    if (!code) return res.status(400).json({ error: "Code is required" });
    const normalized = normalizeReferralCode(code);
    if (!normalized) return res.status(400).json({ error: "Code must be 4-12 letters/numbers" });
    try {
      const updated = await setReferralCode(req.user.id, normalized);
      const referralLink = `${config.clientUrl}/signup?ref=${updated.referralCode}`;
      return res.json({ referralCode: updated.referralCode, referralLink, message: "Referral code updated" });
    } catch (e) {
      if (e.status === 409) return res.status(409).json({ error: e.message });
      if (e.status === 400) return res.status(400).json({ error: e.message });
      throw e;
    }
  } catch (err) {
    console.error("[UPDATE REFERRAL CODE ERROR]", err.message);
    return res.status(500).json({ error: "Could not update code" });
  }
};

module.exports = { getMyReferral, getMyCommissions, updateMyReferralCode };
