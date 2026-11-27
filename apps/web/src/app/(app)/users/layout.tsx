import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Users & Roles Management | BizzMate Accounting',
  description: 'Manage users, assign operational roles, and customize granular feature-function access permissions.',
};

export default function UsersLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <div className="space-y-6">{children}</div>;
}

