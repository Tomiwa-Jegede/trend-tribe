// prisma/migrations/migrate-users-to-seller.js
// One-time migration: set all existing USER role accounts to SELLER.
// Run once after deploying the schema change:
//   node prisma/migrations/migrate-users-to-seller.js

const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

async function main() {
  const result = await prisma.user.updateMany({
    where: { role: "USER" },
    data: { role: "SELLER" },
  });
  console.log(`✅ Migrated ${result.count} existing user(s) to SELLER role.`);
}

main()
  .catch((err) => {
    console.error("❌ Migration failed:", err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
