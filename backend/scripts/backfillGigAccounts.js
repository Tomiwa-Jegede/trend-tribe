// scripts/backfillGigAccounts.js — create 10-digit gigAccountNumber for every user without one
const prisma = require("../src/db");

const generate = async () => {
  for (let i = 0; i < 10; i++) {
    const num = "80" + Math.floor(10000000 + Math.random() * 90000000).toString() + Math.floor(10 + Math.random() * 90).toString();
    const acc = num.slice(0, 10);
    const exists = await prisma.user.findUnique({ where: { gigAccountNumber: acc } });
    if (!exists) return acc;
  }
  return "80" + Date.now().toString().slice(-8);
};

async function main() {
  const users = await prisma.user.findMany({ where: { gigAccountNumber: null }, select: { id: true, username: true } });
  console.log(`Found ${users.length} users without gigAccountNumber`);
  for (const u of users) {
    const acc = await generate();
    await prisma.user.update({ where: { id: u.id }, data: { gigAccountNumber: acc } });
    console.log(` - ${u.username} (${u.id}) -> ${acc}`);
  }
  console.log("Done");
  await prisma.$disconnect();
}

main().catch((e) => { console.error(e); process.exit(1); });
