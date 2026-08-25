import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const wechatCount = await prisma.wechatUser.count();
  const chatCount = await prisma.chatMessage.count();
  const groups = await prisma.chatMessage.groupBy({
    by: ['userId'],
    _count: { _all: true },
  });
  console.log('wechatUsers:', wechatCount, '| chatMessages:', chatCount, '| userGroups:', groups.length);
  const users = await prisma.wechatUser.findMany({
    take: 3,
    orderBy: { createdAt: 'desc' },
  });
  console.log(JSON.stringify(users, null, 1));
  console.log('sample group:', JSON.stringify(groups.slice(0, 3)));
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
