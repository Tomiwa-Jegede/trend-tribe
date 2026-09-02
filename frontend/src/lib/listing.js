// ponytail: single source — reuse
export const GHOST_DAYS = 30;
export const isBoosted = (l) => l.boostedUntil && new Date(l.boostedUntil) > new Date();
export const isGhost = (l) => {
  if (!l.isAvailable) return false;
  const age = (Date.now() - new Date(l.createdAt).getTime()) / 864e5;
  const fav = l.favoriteCount ?? l._count?.favorites ?? 0;
  return age > GHOST_DAYS && fav === 0;
};
export const daysLeft = (l) => Math.max(0, Math.ceil((new Date(l.createdAt).getTime() + GHOST_DAYS*864e5 - Date.now())/864e5));
export const boostedHoursLeft = (l) => isBoosted(l) ? Math.max(0, Math.ceil((new Date(l.boostedUntil).getTime() - Date.now())/3600000)) : 0;
