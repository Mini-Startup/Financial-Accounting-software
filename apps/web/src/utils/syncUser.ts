import { currentUser } from '@clerk/nextjs/server';
import { prisma } from '@/database';

export interface SyncUserResult {
  isWhitelisted: boolean;
  email?: string;
  user?: any;
}

/**
 * Pure helper function to verify email against a whitelist list.
 * Performs case-insensitive, whitespace-trimmed comparison.
 */
export function isEmailWhitelisted(email?: string | null, allowedEmails: string[] = []): boolean {
  if (!email || typeof email !== 'string') return false;
  const normalized = email.trim().toLowerCase();
  if (!normalized) return false;
  return allowedEmails.some((allowed) => allowed && typeof allowed === 'string' && allowed.trim().toLowerCase() === normalized);
}

/**
 * Verify whether authenticated Clerk user is pre-whitelisted in database.
 * Does NOT auto-create arbitrary users with Employee role.
 */
export async function syncUser(): Promise<SyncUserResult> {
  const user = await currentUser();
  if (!user) {
    return { isWhitelisted: false };
  }

  const email = user.emailAddresses?.[0]?.emailAddress?.toLowerCase().trim();
  if (!email) {
    return { isWhitelisted: false };
  }

  // 1. Check if user already exists by Clerk ID
  let dbUser = await prisma.user.findUnique({
    where: { id: user.id },
    include: { role: true },
  });

  if (!dbUser) {
    // 2. Check if pre-whitelisted by email
    dbUser = await prisma.user.findFirst({
      where: {
        email: {
          equals: email,
          mode: 'insensitive',
        },
      },
      include: { role: true },
    });

    if (!dbUser) {
      // User is not whitelisted by Admin/Owner! Block auto-creation
      console.warn(`[Clerk Whitelist Guard] Denied access to non-whitelisted email: ${email} (Clerk ID: ${user.id})`);
      return { isWhitelisted: false, email };
    }

    // Link clerk user id and update name if needed
    if (dbUser.id !== user.id) {
      try {
        dbUser = await prisma.user.update({
          where: { id: dbUser.id },
          data: {
            id: user.id,
            name: `${user.firstName || ''} ${user.lastName || ''}`.trim() || dbUser.name,
          },
          include: { role: true },
        });
      } catch {
        // If ID update has FK conflicts or unique constraints, dbUser is still valid
      }
    }
  }

  return {
    isWhitelisted: true,
    email,
    user: dbUser,
  };
}
