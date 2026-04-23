import type { Metadata } from "next";
import { Outfit } from "next/font/google";
import { ClerkProvider, SignIn } from "@clerk/nextjs";
import { auth } from "@clerk/nextjs/server";
import { syncUser } from "../utils/syncUser";
import { Sidebar } from "../components/navigation/Sidebar";
import "./globals.css";

const outfit = Outfit({
  subsets: ["latin"],
  variable: "--font-outfit",
});

export const metadata: Metadata = {
  title: "BizzMate Financial UI",
  description: "Next Generation Accounting Ledger",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  await syncUser();
  const { userId } = await auth();

  return (
    <html lang="en" className={`${outfit.variable} antialiased`}>
      <body className="font-sans text-[var(--color-text-main)] bg-[var(--color-background)] min-h-screen">
        <ClerkProvider>
          {!userId ? (
            <div className="min-h-screen flex items-center justify-center bg-[var(--color-background)] p-4">
              <div className="max-w-md w-full space-y-8">
                <div className="text-center">
                  <div className="w-16 h-16 bg-[var(--color-primary)] rounded-2xl shadow-lg flex items-center justify-center mx-auto mb-6">
                    <span className="text-white font-bold text-3xl">B</span>
                  </div>
                  <h2 className="text-heading-2 mb-2">Welcome to BizzMate</h2>
                  <p className="text-body-sm mb-8">Sign in to access your financial dashboard</p>
                </div>
                <div className="flex justify-center">
                  <SignIn routing="hash" />
                </div>
              </div>
            </div>
          ) : (
            <div className="flex min-h-screen">
              <Sidebar />
              <main className="flex-1 ml-64 p-8 overflow-y-auto">
                <div className="max-w-7xl mx-auto">
                  {children}
                </div>
              </main>
            </div>
          )}
        </ClerkProvider>
      </body>
    </html>
  );
}
