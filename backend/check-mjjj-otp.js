const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

async function main() {
  const user = await prisma.user.findUnique({
    where: { username: "Mjjj" },
    select: { id: true, username: true, otpCode: true, otpExpiresAt: true, role: true },
  });
  console.log(user);
}

main().finally(() => prisma.$disconnect());
