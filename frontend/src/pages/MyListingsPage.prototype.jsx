// PROTOTYPE — My Listings seller home (Wayfinder #6)
// Link as asset for https://github.com/Tomiwa-Jegede/trend-tribe/issues/6
// This is a cheap, non-shipped prototype to react to — not the final page.
// Replaces ComingSoonPage at /my-listings. Uses GET /api/listings/me.

/*
Layout (mobile-first, reuses MarketplacePage card):

Header: "My Listings  —  2 free slots left / 1 token"  [tokenBalance + freeSlot count from GET /api/auth/me]

Table/cards per listing:
- thumb (images[0], coverPosition)
- title — price — isAvailable toggle (immediate PATCH /api/listings/:id {isAvailable})
- meta: createdAt (e.g., "21d ago — will hide in 9d"), favorites count, reports count
- actions: Edit (→ /listings/:id/edit) | Delete (with Cloudinary cleanup) | Mark Sold (= isAvailable false + archive)
- badge: GHOST if isAvailable=true && createdAt < now-30d && favorites=0

Footer hint: "Sold & deleted → next listing costs 1 token. Ghost pruned listings don't count after 30d."

Data:
- GET /api/listings/me?available=&sort=createdAt  (new, protected, returns only sellerId=me, no public filter rebuild)
- GET /api/auth/me for tokenBalance/freeSlots

What we deliberately DON'T show this bet:
- No inbox, no messages, no notifications, no bulk edit, no drafts
*/

export default function MyListingsPagePrototype() {
  return (
    <div className="container-app py-8">
      <h1 className="text-2xl font-bold">My Listings — Prototype</h1>
      <p className="text-sm text-gray-500">2 free slots left · tokenBalance: 8 units (2 tokens)</p>
      {/* ghost example */}
      <div className="card p-4 mt-6 opacity-70">
        <p>Example: Vintage Jersey — ₦4500 — GHOST (32d, 0 saves) — [Mark Sold] [Delete] [Edit]</p>
      </div>
    </div>
  );
}
