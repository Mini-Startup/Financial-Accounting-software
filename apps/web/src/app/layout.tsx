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
    <html lang="en" className={`${outfit.variable} antialiased bg-[#eff4f9]`}>
      <body className="h-screen w-screen overflow-hidden flex flex-col font-sans text-gray-800 bg-[#7ba0cd]">
        <ClerkProvider>
          {/* Top Application Ribbon (Simulating Xcalibur Toolbar) */}
          <header className="flex-none bg-[#e8ecf1] border-b border-gray-300 shadow-sm z-10 select-none">
            {/* Title Bar Area */}
            <div className="bg-[#bbd2eb] px-3 py-1 text-xs text-gray-800 font-semibold flex items-center justify-between border-b border-gray-300">
              <div className="flex items-center gap-2">
                <span className="w-4 h-4 bg-blue-600 rounded-sm inline-block shadow-sm"></span>
                BizzMate Financial Workspace *** 2025-2026 *** Cloud.zdp
              </div>
            </div>
            
            {/* Ribbon Tabs Level */}
            <div className="flex text-xs border-b border-gray-200">
              <div className="px-3 py-1 cursor-default text-gray-600">File</div>
              <div className="px-3 py-1 cursor-default text-gray-600">Edit</div>
              <div className="px-3 py-1 cursor-default text-gray-600">Trades</div>
              <div className="px-3 py-1 cursor-default text-gray-600">FAS</div>
              <div className="px-3 py-1 cursor-default text-gray-600">Tools</div>
              <div className="px-3 py-1 cursor-default text-gray-600">Reports</div>
              <div className="px-3 py-1 cursor-default text-gray-600">FnO</div>
            </div>

            {/* Main Action Icons Array */}
            <div className="flex bg-white px-2 py-1 gap-1 overflow-x-auto">
              <a href="/brokers" className="flex flex-col items-center justify-center p-2 min-w-[64px] hover:bg-blue-50 hover:ring-1 ring-blue-200 rounded cursor-pointer transition-all">
                <div className="text-xl mb-1">🏦</div>
                <span className="text-[10px] text-gray-700 leading-tight">Broker</span>
              </a>
              <a href="/clients" className="flex flex-col items-center justify-center p-2 min-w-[64px] hover:bg-blue-50 hover:ring-1 ring-blue-200 rounded cursor-pointer transition-all">
                <div className="text-xl mb-1">👥</div>
                <span className="text-[10px] text-gray-700 leading-tight">Client</span>
              </a>
              <a href="/scripts" className="flex flex-col items-center justify-center p-2 min-w-[64px] hover:bg-blue-50 hover:ring-1 ring-blue-200 rounded cursor-pointer transition-all">
                <div className="text-xl mb-1">📄</div>
                <span className="text-[10px] text-gray-700 leading-tight">Scrip</span>
              </a>
              <div className="w-px h-10 bg-gray-300 mx-1 self-center"></div>
              <a href="/ledger" className="flex flex-col items-center justify-center p-2 min-w-[64px] hover:bg-blue-50 hover:ring-1 ring-blue-200 rounded cursor-pointer transition-all">
                <div className="text-xl mb-1">📒</div>
                <span className="text-[10px] text-gray-700 leading-tight">Ledger<br/>Account</span>
              </a>
            </div>
            
            {/* Status array below icons */}
            <div className="bg-[#e8ecf1] px-2 py-0.5 text-[10px] text-gray-500 border-t border-gray-200 flex gap-4">
              <span>Masters are copied to new year, every year</span>
              <span className="text-blue-500">System Connected</span>
            </div>
          </header>

          {/* MDI Workspace Area - Takes remaining height, scrolling inside */}
          <main className="flex-1 w-full overflow-hidden relative shadow-inner">
            <div className="absolute inset-0 overflow-auto bg-[#7ba0cd] p-4">
              {children}
            </div>
          </main>
        </ClerkProvider>
      </body>
    </html>
  );
}
