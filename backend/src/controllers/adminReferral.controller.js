// src/controllers/adminReferral.controller.js
const prisma = require("../db");

const getReferralStats = async (req, res) => {
  try {
    const [totalReferrals, active, expired, totalCommissions, netCommissions] = await Promise.all([
      prisma.referral.count(),
      prisma.referral.count({ where: { status: "ACTIVE", commissionEndAt: { gt: new Date() } } }),
      prisma.referral.count({ where: { OR: [{ status: "EXPIRED" }, { commissionEndAt: { lt: new Date() } }] } }),
      prisma.referralCommission.aggregate({ where: { status: "CREDITED" }, _sum: { commissionAmount: true }, _count: { id: true } }),
      prisma.referralCommission.aggregate({ where: { status: "CREDITED" }, _sum: { commissionAmount: true } }).then(async (cred) => {
        const rev = await prisma.referralCommission.aggregate({ where: { status: "REVERSED" }, _sum: { commissionAmount: true } });
        return (cred._sum.commissionAmount || 0) - (rev._sum.commissionAmount || 0);
      }),
    ]);
    const totalCommissionsKobo = totalCommissions._sum.commissionAmount || 0;
    return res.json({ totalReferrals, active, expired, totalCommissionsKobo, totalCommissionsCount: totalCommissions._count.id, netCommissionsKobo: netCommissions });
  } catch (err) {
    console.error("[ADMIN REFERRAL STATS ERROR]", err.message);
    return res.status(500).json({ error: "Could not load stats" });
  }
};

const listReferrals = async (req, res) => {
  try {
    const { page = 1, limit = 20, status, search } = req.query;
    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const limitNum = Math.min(50, Math.max(1, parseInt(limit, 10) || 20));
    const skip = (pageNum - 1) * limitNum;
    const where = {};
    if (status && status !== "ALL") {
      if (status === "ACTIVE") where.status = "ACTIVE";
      else if (status === "EXPIRED") where.status = "EXPIRED";
    }
    if (search) {
      where.OR = [
        { referralCode: { contains: search, mode: "insensitive" } },
        { referrer: { username: { contains: search, mode: "insensitive" } } },
        { referrer: { email: { contains: search, mode: "insensitive" } } },
        { referred: { username: { contains: search, mode: "insensitive" } } },
      ];
    }
    const [referrals, totalCount] = await Promise.all([
      prisma.referral.findMany({ where, orderBy: { createdAt: "desc" }, skip, take: limitNum, include: { referrer: { select: { id: true, username: true, email: true } }, referred: { select: { id: true, username: true, email: true } } } }),
      prisma.referral.count({ where }),
    ]);
    return res.json({ referrals, pagination: { totalCount, totalPages: Math.ceil(totalCount / limitNum), currentPage: pageNum, limit: limitNum } });
  } catch (err) {
    console.error("[ADMIN LIST REFERRALS ERROR]", err.message);
    return res.status(500).json({ error: "Could not load" });
  }
};

const listAllCommissions = async (req, res) => {
  try {
    const { page = 1, limit = 20, transactionType, status, search } = req.query;
    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const limitNum = Math.min(50, Math.max(1, parseInt(limit, 10) || 20));
    const skip = (pageNum - 1) * limitNum;
    const where = {};
    if (transactionType && transactionType !== "ALL") where.transactionType = transactionType;
    if (status && status !== "ALL") where.status = status;
    if (search) {
      where.OR = [
        { transactionId: { contains: search, mode: "insensitive" } },
        { referrer: { username: { contains: search, mode: "insensitive" } } },
      ];
    }
    const [commissions, totalCount] = await Promise.all([
      prisma.referralCommission.findMany({ where, orderBy: { createdAt: "desc" }, skip, take: limitNum, include: { referrer: { select: { id: true, username: true } }, referred: { select: { id: true, username: true } } } }),
      prisma.referralCommission.count({ where }),
    ]);
    return res.json({ commissions, pagination: { totalCount, totalPages: Math.ceil(totalCount / limitNum), currentPage: pageNum, limit: limitNum } });
  } catch (err) {
    console.error("[ADMIN COMMISSIONS ERROR]", err.message);
    return res.status(500).json({ error: "Could not load" });
  }
};

const getReferralCommissions = async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (isNaN(id)) return res.status(400).json({ error: "Invalid id" });
    const commissions = await prisma.referralCommission.findMany({ where: { referralId: id }, orderBy: { createdAt: "desc" } });
    return res.json({ commissions });
  } catch (err) {
    console.error("[ADMIN REFERRAL COMMISSIONS ERROR]", err.message);
    return res.status(500).json({ error: "Could not load" });
  }
};

module.exports = { getReferralStats, listReferrals, listAllCommissions, getReferralCommissions };
