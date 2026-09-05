// prisma/seed.js — idempotent seed for CI / local dev
// Ensures TEST_USER exists as SELLER/ADMIN and owns at least one listing so
// `tests/edit-listing.spec.js` (dynamic owned lookup) never flakes on fresh DB.
// Run: `npx prisma db seed` or `node prisma/seed.js`

const { PrismaClient } = require("@prisma/client");
const bcrypt = require("bcryptjs");

const prisma = new PrismaClient();

async function main() {
  const username = process.env.TEST_USER_USERNAME || "Jegede01";
  const password = process.env.TEST_USER_PASSWORD || "T 23 65 89a@";
  const email = process.env.TEST_USER_EMAIL || "jegede17209@run.edu.ng";

  // 1) ensure user exists
  let user = await prisma.user.findFirst({
    where: { OR: [{ username }, { email }] },
  });

  if (!user) {
    const hashed = await bcrypt.hash(password, 12);
    const slug = `${username.toLowerCase()}-${Date.now().toString(36)}`;
    user = await prisma.user.create({
      data: {
        slug,
        username,
        email,
        password: hashed,
        fullName: "Tomiwa Jegede",
        school: "Redeemer's University",
        bio: "Seeded test account",
        role: "ADMIN",
        isVerified: true,
        matricNumber: `RUN/CMP/24/17209-${Date.now().toString(36)}`,
        whatsapp: "2349166635320",
        tokenBalance: 10,
      },
    });
    console.log(`[seed] created user ${user.username} id=${user.id}`);
  } else {
    // ensure role/isVerified/tokenBalance are test-friendly
    if (user.role === "BUYER" || !user.isVerified || user.tokenBalance < 5) {
      user = await prisma.user.update({
        where: { id: user.id },
        data: { role: "ADMIN", isVerified: true, tokenBalance: 10 },
      });
      console.log(`[seed] upgraded user ${user.username} to ADMIN/verified`);
    } else {
      console.log(`[seed] user ${user.username} id=${user.id} already ok`);
    }
    // ensure password matches .env.test (so login works after DB reset)
    const ok = await bcrypt.compare(password, user.password);
    if (!ok) {
      const hashed = await bcrypt.hash(password, 12);
      await prisma.user.update({ where: { id: user.id }, data: { password: hashed } });
      console.log(`[seed] reset password for ${username}`);
    }
  }

  // 2) ensure at least one owned listing
  const owned = await prisma.listing.findFirst({ where: { sellerId: user.id } });
  if (!owned) {
    const slug = `seed-playwright-${Date.now().toString(36)}`;
    const listing = await prisma.listing.create({
      data: {
        slug,
        title: "Seed For Playwright",
        description: "Seeded for edit test, safe to update — created by prisma/seed.js",
        price: 2500,
        category: "OTHERS",
        condition: "GOOD",
        images: [],
        imagePublicIds: [],
        sellerId: user.id,
        isAvailable: true,
      },
    });
    console.log(`[seed] created listing id=${listing.id} slug=${listing.slug} for ${username}`);
  } else {
    console.log(`[seed] owned listing exists id=${owned.id} slug=${owned.slug}`);
  }
}

main()
  .catch((e) => {
    console.error("[seed] failed", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
