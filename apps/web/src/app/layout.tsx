import { Suspense } from "react";
import type { Metadata } from "next";
import { DM_Sans, Inter, JetBrains_Mono } from "next/font/google";
import { ClerkProvider, SignIn } from "@clerk/nextjs";
import { auth } from "@clerk/nextjs/server";
import { syncUser } from "../utils/syncUser";
import { Sidebar } from "../components/navigation/Sidebar";
import { TradeImportProvider } from "../components/trades/TradeImportContext";
import { Toaster } from "sonner";
import "./globals.css";

const dmSans = DM_Sans({
  subsets: ["latin"],
  variable: "--font-dm-sans",
});

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-jetbrains-mono",
});

export const metadata: Metadata = {
  title: "BizzMate Financial UI",
  description: "Next Generation Accounting System",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  await syncUser();
  const { userId } = await auth();

  return (
    <html lang="en" className={`${dmSans.variable} ${inter.variable} ${jetbrainsMono.variable} antialiased`}>
      <body className="font-body text-[var(--color-charcoal)] bg-[var(--bg-page)] min-h-screen">
        <ClerkProvider>
          <TradeImportProvider>
            {!userId ? (
              <div className="min-h-screen flex items-center justify-center bg-[var(--bg-page)] p-4">
                <div className="max-w-md w-full space-y-8">
                  <div className="text-center">
                    <div className="w-16 h-16 bg-[var(--color-forest)] rounded-2xl shadow-lg flex items-center justify-center mx-auto mb-6">
                      <span className="text-white font-bold text-3xl">B</span>
                    </div>
                    <h2 className="text-h2 font-display mb-2">Welcome to BizzMate</h2>
                    <p className="text-sm text-slate-500 mb-8">Sign in to access your financial dashboard</p>
                  </div>
                  <div className="flex justify-center">
                    <SignIn routing="hash" />
                  </div>
                </div>
              </div>
            ) : (
              <div className="flex min-h-screen bg-[var(--bg-page)]">
                <Suspense fallback={<div className="w-64 h-screen bg-[var(--sidebar-bg)] border-r border-[var(--sidebar-divider)] shrink-0" />}>
                  <Sidebar />
                </Suspense>
                <div className="flex-1 flex flex-col min-h-screen min-w-0">
                  <main className="flex-1 p-3 md:p-4 lg:p-5 overflow-y-auto">
                    <div className="max-w-[1700px] w-full mx-auto">
                      {children}
                    </div>
                  </main>
                </div>
              </div>
            )}
          </TradeImportProvider>
          <Toaster position="top-right" richColors closeButton />
        </ClerkProvider>
      </body>
    </html>
  );
}
