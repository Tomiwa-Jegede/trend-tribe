const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

async function main() {
  const user = await prisma.user.findFirst({
    where: { email: { contains: "PASTE_EMAIL_OR_PART_HERE" } },
    select: { id: true, username: true, email: true, role: true, matricNumber: true, createdAt: true },
  });
  console.log(user);
}

main().finally(() => prisma.$disconnect());
