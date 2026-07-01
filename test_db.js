const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
async function main() {
  const stats = await prisma.dailyUserStat.findMany();
  console.log(JSON.stringify(stats, null, 2));
}
main().catch(console.error).finally(() => prisma.$disconnect());
