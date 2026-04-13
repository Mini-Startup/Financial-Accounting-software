import { currentUser } from '@clerk/nextjs/server';
import { prisma } from 'database';

export async function syncUser(): Promise<void> {
  const user = await currentUser();
  if (!user) return;

  // Look up user to avoid writing to DB on every single page load
  const existingUser = await prisma.user.findUnique({
    where: { id: user.id },
    select: { id: true }
  });

  if (!existingUser) {
    const email = user.emailAddresses[0]?.emailAddress;
    const name = `${user.firstName || ''} ${user.lastName || ''}`.trim() || undefined;

    if (email) {
      try {
        const defaultRole = await prisma.role.upsert({
          where: { name: 'User' },
          update: {},
          create: { name: 'User' },
        });

        await prisma.user.create({
          data: {
            id: user.id,
            email,
            name,
            roleId: defaultRole.id,
          },
        });
        console.log(`Clerk User ${user.id} dynamically synced into Prisma DB.`);
      } catch (e) {
        console.error("Failed to sync Clerk User to DB:", e);
      }
    }
  }
}
