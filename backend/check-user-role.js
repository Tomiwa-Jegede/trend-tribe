const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

async function main() {
  const users = await prisma.user.findMany({
    select: { id: true, username: true, role: true, email: true },
    orderBy: { id: "desc" },
    take: 5,
  });
  console.log(users);
}

main().finally(() => prisma.$disconnect());
