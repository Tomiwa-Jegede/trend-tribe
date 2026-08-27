const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

async function main() {
  const users = await prisma.user.findMany({
    select: { id: true, username: true, email: true, role: true, matricNumber: true, createdAt: true },
    orderBy: { id: "asc" },
  });
  console.log(users);
}

main().finally(() => prisma.$disconnect());
