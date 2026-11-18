import { Suspense } from "react";
import type { Metadata } from "next";
import { DM_Sans, Inter, JetBrains_Mono } from "next/font/google";
import { ClerkProvider, SignIn, SignOutButton } from "@clerk/nextjs";
import { auth } from "@clerk/nextjs/server";
import { syncUser } from "../utils/syncUser";
import { Sidebar } from "../components/navigation/Sidebar";
import { TradeImportProvider } from "../components/trades/TradeImportContext";
import { AuthPermissionsProvider } from "../context/AuthPermissionsContext";
import { Toaster } from "sonner";
import "./globals.css";
import { Agentation } from "agentation";

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
  const syncResult = await syncUser();
  const { userId } = await auth();

  return (
    <html lang="en" className={`${dmSans.variable} ${inter.variable} ${jetbrainsMono.variable} antialiased`}>
      <body className="font-body text-charcoal bg-(--bg-page) min-h-screen">
        <ClerkProvider>
          <TradeImportProvider>
            {!userId ? (
              <div className="min-h-screen flex items-center justify-center bg-(--bg-page) p-4">
                <div className="max-w-md w-full space-y-8">
                  <div className="text-center">
                    <div className="w-16 h-16 bg-(--color-forest) rounded-2xl shadow-lg flex items-center justify-center mx-auto mb-6">
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
            ) : !syncResult.isWhitelisted ? (
              <div className="min-h-screen flex items-center justify-center bg-(--bg-page) p-4">
                <div className="max-w-md w-full bg-white rounded-2xl border border-slate-200/80 shadow-xl p-8 text-center space-y-6">
                  <div className="w-16 h-16 bg-amber-50 border border-amber-200 text-amber-600 rounded-2xl flex items-center justify-center mx-auto shadow-sm">
                    <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                    </svg>
                  </div>
                  <div>
                    <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-100 text-amber-800 mb-3">
                      Access Restricted
                    </span>
                    <h2 className="text-xl font-bold text-slate-900 tracking-tight">Organization Whitelist Required</h2>
                    <p className="text-sm text-slate-600 mt-2 leading-relaxed">
                      Your email <span className="font-semibold text-slate-800 underline">{syncResult.email || 'associated with your account'}</span> is not authorized to access BizzMate Financial Platform.
                    </p>
                    <p className="text-xs text-slate-500 mt-2">
                      Your identity was verified through Clerk, but an administrator has not yet granted your email permissions.
                    </p>
                  </div>
                  <div className="pt-2 flex flex-col gap-3">
                    <SignOutButton redirectUrl="/">
                      <button className="w-full py-2.5 px-4 bg-slate-900 hover:bg-slate-800 text-white text-sm font-semibold rounded-xl shadow transition duration-150 cursor-pointer">
                        Sign Out / Switch Account
                      </button>
                    </SignOutButton>
                    <a
                      href="mailto:admin@bizzmate.com?subject=BizzMate%20Access%20Request"
                      className="inline-block text-xs font-medium text-slate-600 hover:text-slate-900 underline transition py-1"
                    >
                      Contact Organization Administrator
                    </a>
                  </div>
                </div>
              </div>
            ) : (
              <AuthPermissionsProvider>
                <div className="flex min-h-screen bg-(--bg-page)">
                  <Suspense fallback={<div className="w-64 h-screen bg-(--sidebar-bg) border-r border-(--sidebar-divider) shrink-0" />}>
                    <Sidebar />
                  </Suspense>
                  <div className="flex-1 flex flex-col min-h-screen min-w-0">
                    <main className="flex-1 p-3 md:p-4 lg:p-5 overflow-y-auto">
                      <div className="max-w-425 w-full mx-auto">
                        {children}
                      </div>
                    </main>
                  </div>
                </div>
              </AuthPermissionsProvider>
            )}
          </TradeImportProvider>
          <Toaster position="top-right" richColors closeButton />
        </ClerkProvider>
         <Agentation />
      </body>
    </html>
  );
}
