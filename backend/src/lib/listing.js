// ponytail: single source for ghost/boost logic, reuse don't copy
const GHOST_DAYS = 30;
const isBoosted = (l) => l.boostedUntil && new Date(l.boostedUntil) > new Date();
const isGhost = (l) => {
  if (!l.isAvailable) return false;
  const ageDays = (Date.now() - new Date(l.createdAt).getTime()) / 864e5;
  const fav = l.favoriteCount ?? l._count?.favorites ?? 0;
  return ageDays > GHOST_DAYS && fav === 0;
};
const daysLeft = (l) => {
  const left = Math.ceil((new Date(l.createdAt).getTime() + GHOST_DAYS*864e5 - Date.now())/864e5);
  return Math.max(0, left);
};
const boostedHoursLeft = (l) => isBoosted(l) ? Math.max(0, Math.ceil((new Date(l.boostedUntil).getTime() - Date.now())/3600000)) : 0;
module.exports = { GHOST_DAYS, isGhost, isBoosted, daysLeft, boostedHoursLeft };
