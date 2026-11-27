import type { Metadata } from "next";
import { cookies, headers } from "next/headers";
import { DM_Sans, Inter, JetBrains_Mono } from "next/font/google";
import { ClerkProvider, SignIn, SignOutButton } from "@clerk/nextjs";
import { auth } from "@clerk/nextjs/server";
import { syncUser } from "../utils/syncUser";
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
  const cookieStore = await cookies();
  const headerStore = await headers();
  const isDevBypass =
    process.env.NODE_ENV === "development" &&
    (cookieStore.get("__dev_bypass")?.value === "true" || headerStore.get("x-dev-bypass") === "true");

  let clerkUserId: string | null = null;
  if (!isDevBypass) {
    try {
      const session = await auth();
      clerkUserId = session?.userId || null;
    } catch {}
  }
  const userId = clerkUserId || (isDevBypass ? "dev_admin_user" : null);
  const syncResult = isDevBypass
    ? { isWhitelisted: true, email: "admin@bizzmate.com", user: { id: "dev_admin_user", name: "Dev Administrator", role: { name: "Owner", isOwner: true } } }
    : await syncUser();

  return (
    <html lang="en" className={`${dmSans.variable} ${inter.variable} ${jetbrainsMono.variable} antialiased`}>
      <body className="font-body text-slate-900 min-h-screen antialiased bg-slate-100">
        <ClerkProvider>
          {!userId ? (
            <div className="min-h-screen flex items-center justify-center bg-[#F1F5F9] p-4">
              <div className="max-w-md w-full space-y-8">
                <div className="text-center">
                  <div className="w-16 h-16 bg-[#2652C8] rounded-2xl shadow-lg flex items-center justify-center mx-auto mb-6">
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
            <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-[#0A1A4A] via-[#102E7A] to-[#1D4ED8] p-4">
              {/* Security / Whitelist Restriction Card */}
              <div className="max-w-md w-full bg-white rounded-3xl border border-white/40 shadow-2xl p-8 text-center relative overflow-hidden animate-in zoom-in-95 duration-200">
                <div className="absolute -top-12 left-1/2 -translate-x-1/2 w-72 h-44 rounded-full blur-2xl pointer-events-none bg-gradient-to-b from-purple-300/60 via-indigo-100/30 to-transparent" />
                <div className="w-14 h-14 rounded-2xl bg-white shadow-md border border-slate-100 flex items-center justify-center mx-auto mb-4 relative z-1">
                  <div className="w-10 h-10 rounded-xl bg-purple-50 border border-purple-100 flex items-center justify-center text-purple-700">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                    </svg>
                  </div>
                </div>
                <div className="relative z-1 space-y-2">
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-md text-[11px] font-bold bg-purple-100 text-purple-800 tracking-wide uppercase">
                    Access Restricted
                  </span>
                  <h2 className="text-xl font-bold text-slate-900 tracking-tight">Organization Whitelist Required</h2>
                  <p className="text-sm text-slate-500 mt-2 leading-relaxed">
                    Your account <span className="font-semibold text-slate-800 underline">{syncResult.email || 'associated with your session'}</span> is verified, but has not yet been granted platform whitelist access by an administrator.
                  </p>
                </div>
                <div className="pt-6 flex flex-col gap-3 relative z-1">
                  <SignOutButton redirectUrl="/">
                    <button className="w-full py-3 px-4 bg-indigo-950 hover:bg-indigo-900 text-white text-sm font-semibold rounded-xl shadow-md transition duration-150 cursor-pointer">
                      Sign Out / Switch Account
                    </button>
                  </SignOutButton>
                  <a
                    href="mailto:admin@bizzmate.com?subject=BizzMate%20Access%20Request"
                    className="inline-block text-xs font-medium text-slate-500 hover:text-slate-800 underline transition py-1"
                  >
                    Contact Organization Administrator
                  </a>
                </div>
              </div>
            </div>
          ) : (
            <AuthPermissionsProvider isDevBypass={isDevBypass}>
              {children}
            </AuthPermissionsProvider>
          )}
          {/* Executive Notification Toaster */}
          <Toaster
            position="top-right"
            offset={36}
            toastOptions={{
              className: 'rounded-xl border border-slate-200/80 shadow-lg text-sm font-medium',
              duration: 3500,
            }}
          />
          <Agentation />
        </ClerkProvider>
      </body>
    </html>
  );
}
