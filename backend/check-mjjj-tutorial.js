const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

async function main() {
  const user = await prisma.user.findUnique({
    where: { username: "Mjjj" },
    select: { username: true, role: true, hasSeenTutorial: true },
  });
  console.log(user);
}

main().finally(() => prisma.$disconnect());
