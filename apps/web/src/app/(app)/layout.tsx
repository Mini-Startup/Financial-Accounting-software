import { Suspense } from "react";
import { Sidebar } from "@/components/navigation/Sidebar";
import { TopBar } from "@/components/navigation/TopBar";
import { UniversalSearch } from "@/components/navigation/UniversalSearch";
import { RouteScrollReset } from "@/components/navigation/RouteScrollReset";
import { TradeImportProvider } from "@/components/trades/TradeImportContext";
import { TopBarProvider } from "@/context/TopBarContext";
import { TableSearchProvider } from "@/context/TableSearchContext";

export default function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <TradeImportProvider>
      <TopBarProvider>
        <TableSearchProvider>
          {/* Floating Island Layout Shell: Background is Brand Gradient, Sidebar is 0-margin flush, Right Section is Floating Island */}
          <div className="flex h-screen w-screen overflow-hidden bg-gradient-to-b from-[#0A1A4A] via-[#102E7A] to-[#1D4ED8] pl-0 p-3 sm:p-3.5">
            {/* Left Sidebar: Flush to edge (0 margin, rounded-none), Transparent over Brand Gradient */}
            <Suspense fallback={<div className="w-64 h-screen bg-transparent shrink-0" />}>
              <Sidebar />
            </Suspense>

            {/* Right Section: Floating Island with rounded-2xl, 10px margin from edge and gap from sidebar */}
            <div className="flex-1 flex flex-col h-full min-w-0 bg-white rounded-2xl shadow-2xl border border-white/20 overflow-hidden relative ml-2">
              <TopBar />
              <main id="main-content-scroll" className="flex-1 p-3.5 md:p-5 lg:p-6 overflow-y-auto bg-slate-50/50">
                <div className="max-w-425 w-full mx-auto">
                  {children}
                </div>
              </main>
            </div>
          </div>
          <Suspense fallback={null}>
            <RouteScrollReset />
          </Suspense>
          <UniversalSearch />
        </TableSearchProvider>
      </TopBarProvider>
    </TradeImportProvider>
  );
}
