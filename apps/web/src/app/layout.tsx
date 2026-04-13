import type { Metadata } from "next";
import { Outfit } from "next/font/google";
import { ClerkProvider } from "@clerk/nextjs";
import { syncUser } from "../utils/syncUser";
import { NavBar } from "../components/navigation/NavBar";
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

  return (
    <html lang="en" className={`${outfit.variable} antialiased bg-gray-50`}>
      <body className="min-h-full flex flex-col pt-24 font-sans text-gray-900">
        <ClerkProvider>
          <NavBar />
          <main className="flex-1 relative z-10 w-full max-w-[1400px] mx-auto px-6 pb-12">
            {children}
          </main>
        </ClerkProvider>
      </body>
    </html>
  );
}
