"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { UserButton } from "@clerk/nextjs";
import {
  LayoutDashboard,
  Users,
  ScrollText,
  Globe,
  Percent,
  Layers,
  ArrowUpDown,
  TrendingUp,
  FileSpreadsheet,
  FolderOpen,
  Scale,
  Coins,
  GitFork,
  Shuffle,
  Filter,
  Wallet,
  Receipt,
  BookText,
  CircleDollarSign,
  Building2,
  GitCompare,
  AlertTriangle,
  PieChart,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  Sliders,
  DollarSign
} from "lucide-react";
import { cn } from "@/utils/cn";

// ─── Types ────────────────────────────────────────────────────────────────────

interface ChildItem {
  name: string;
  path: string;
  upcoming?: boolean;
  icon: React.ComponentType<any>;
  /** true when this child is itself an expandable sub-group */
  subGroup?: boolean;
  children?: Array<{ name: string; path: string; upcoming?: boolean; icon: React.ComponentType<any> }>;
}

interface NavSection {
  id: string;
  label: string;
  icon: React.ComponentType<any>;
  children: ChildItem[];
}

// ─── Upcoming helper ──────────────────────────────────────────────────────────

function comingSoon(feature: string) {
  return `/coming-soon?feature=${feature}`;
}

// ─── Nav Structure with Custom Icons ──────────────────────────────────────────

const sections: NavSection[] = [
  {
    id: "master",
    label: "Master",
    icon: Sliders,
    children: [
      { name: "Broker",    path: "/brokers",       icon: ShieldCheckIcon },
      { name: "Clients",   path: "/clients",       icon: Users },
      { name: "Scripts",   path: "/scripts",       icon: ScrollText },
      { name: "Exchanges", path: "/exchanges",     icon: Globe },
      { name: "Currencies", path: "/currencies",   icon: Coins },
      { name: "Brokerage", path: "/brokerage",     icon: Percent },
      { name: "Others",    path: "/account-master", icon: Layers },
    ],
  },
  {
    id: "data",
    label: "Data",
    icon: FolderOpen,
    children: [
      { name: "Trades",        path: "/trades",        icon: ArrowUpDown },
      { name: "Closing Rates", path: "/closing-rates",  icon: TrendingUp },
      {
        name: "Import Files",
        path: "#",
        icon: FileSpreadsheet,
        subGroup: true,
        children: [
          { name: "Trade Import",          path: "/trades?import=true",                 icon: FileSpreadsheet },
          { name: "Open Position Import",  path: "/closing-rates?import=true",          icon: TrendingUp },
          { name: "Margine File Imports",  path: comingSoon("margine-file-imports"),  icon: DollarSign, upcoming: true },
        ],
      },
    ],
  },
  {
    id: "reports",
    label: "Reports",
    icon: Coins,
    children: [
      { name: "Sattelment Reports",     path: "/settlement",                         icon: Scale },
      { name: "Brokerage Report",       path: comingSoon("brokerage-report"),        icon: Coins, upcoming: true },
      { name: "Cleint wise / Script Wise", path: comingSoon("client-wise-script-wise"), icon: GitFork, upcoming: true },
      { name: "Broker wise / Script Wise", path: comingSoon("broker-wise-script-wise"), icon: Shuffle, upcoming: true },
      { name: "Script Wise / Cleint",   path: comingSoon("script-wise-client"),      icon: Filter, upcoming: true },
      { name: "Script Wise / Broker",   path: comingSoon("script-wise-broker"),      icon: FolderOpen, upcoming: true },
    ],
  },
  {
    id: "financial",
    label: "Financial",
    icon: Wallet,
    children: [
      { name: "Ledger Report",             path: "/ledger",                               icon: BookText },
      { name: "Voucher Entry",             path: "/vouchers",                             icon: Receipt },
      { name: "Trial Balance",             path: "/trial-balance",                        icon: Scale },
      { name: "Collection Book",           path: comingSoon("collection-book"),           icon: BookText, upcoming: true },
      { name: "Cash Book",                 path: comingSoon("cash-book"),                 icon: CircleDollarSign, upcoming: true },
      { name: "Bank Book",                 path: comingSoon("bank-book"),                 icon: Building2, upcoming: true },
      { name: "JV / Contra Register",      path: comingSoon("jv-contra-register"),        icon: GitCompare, upcoming: true },
      { name: "Payment / Receipt Register",path: comingSoon("payment-receipt-register"),  icon: Scale, upcoming: true },
      { name: "Margine Report",            path: comingSoon("margine-report"),            icon: AlertTriangle, upcoming: true },
      { name: "Expance Register",          path: comingSoon("expance-register"),          icon: Receipt, upcoming: true },
      { name: "Profit & Loss",             path: comingSoon("profit-loss"),               icon: Percent, upcoming: true },
      { name: "Balancesheet",              path: comingSoon("balancesheet"),              icon: PieChart, upcoming: true },
    ],
  },
];

// Helper icon to avoid dynamic Lucide imports
function ShieldCheckIcon(props: React.ComponentProps<"svg">) {
  return (
    <svg
      fill="none"
      viewBox="0 0 24 24"
      strokeWidth={1.5}
      stroke="currentColor"
      {...props}
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M9 12.75L11.25 15 15 9.75M21 12c0 1.268-.63 2.39-1.593 3.068a3.745 3.745 0 01-1.043 3.296 3.745 3.745 0 01-3.296 1.043A3.745 3.745 0 0112 21c-1.268 0-2.39-.63-3.068-1.593a3.746 3.746 0 01-3.296-1.043 3.745 3.745 0 01-1.043-3.296A3.745 3.745 0 013 12c0-1.268.63-2.39 1.593-3.068a3.745 3.745 0 011.043-3.296 3.746 3.746 0 013.296-1.043A3.746 3.746 0 0112 3c1.268 0 2.39.63 3.068 1.593a3.746 3.746 0 013.296 1.043 3.746 3.746 0 011.043 3.296A3.745 3.745 0 0121 12z"
      />
    </svg>
  );
}

// ─── Sidebar Component ────────────────────────────────────────────────────────

export function Sidebar() {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  // Collapsible logic state
  const [isLocked, setIsLocked] = React.useState(true);
  const [isHovered, setIsHovered] = React.useState(false);
  const [mounted, setMounted] = React.useState(false);

  // Track open/closed state per section and sub-group
  const [openSections, setOpenSections] = React.useState<Record<string, boolean>>({
    master: true,
    data: true,
    reports: true,
    financial: true,
    "import-files": true,
  });

  React.useEffect(() => {
    const saved = localStorage.getItem("sidebar-locked");
    if (saved !== null) {
      setIsLocked(saved === "true");
    }
    setMounted(true);
  }, []);

  const toggleLock = () => {
    const nextVal = !isLocked;
    setIsLocked(nextVal);
    localStorage.setItem("sidebar-locked", String(nextVal));
  };

  const toggleSection = (id: string) => {
    setOpenSections((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  // Sidebar is fully expanded if locked OR hovered (overlay mode)
  const isExpanded = isLocked || isHovered;

  // ── Active detection helpers ──────────────────────────────────────────────

  const isImportMode = React.useCallback(
    (basePath: string) => {
      const base = pathname === basePath;
      const importParam = searchParams?.get("import") === "true";
      return base && importParam;
    },
    [pathname, searchParams]
  );

  const isActive = React.useCallback(
    (path: string): boolean => {
      if (!path || path === "#") return false;
      if (path.includes("?import=true")) {
        const base = path.split("?")[0];
        return isImportMode(base);
      }
      if (path.includes("/coming-soon")) {
        if (pathname !== "/coming-soon") return false;
        const pathFeature = new URL(path, "http://x").searchParams.get("feature");
        const currentFeature = searchParams?.get("feature");
        return pathFeature === currentFeature;
      }
      const importParam = searchParams?.get("import") === "true";
      if (importParam && (path === "/trades" || path === "/closing-rates")) {
        return false;
      }
      if (path === "/") return pathname === "/";
      return pathname === path || pathname?.startsWith(path + "/");
    },
    [pathname, searchParams, isImportMode]
  );

  const isSectionActive = React.useCallback(
    (section: NavSection): boolean => {
      return section.children.some((child) => {
        if (child.subGroup && child.children) {
          return child.children.some((c) => isActive(c.path));
        }
        return isActive(child.path);
      });
    },
    [isActive]
  );

  // Auto-open section if a child is active
  React.useEffect(() => {
    const updates: Record<string, boolean> = {};
    sections.forEach((sec) => {
      if (isSectionActive(sec)) updates[sec.id] = true;
      sec.children.forEach((child) => {
        if (child.subGroup && child.children) {
          const key = child.name.toLowerCase().replace(/\s+/g, "-");
          if (child.children.some((c) => isActive(c.path))) {
            updates[key] = true;
          }
        }
      });
    });
    if (Object.keys(updates).length > 0) {
      setOpenSections((prev) => ({ ...prev, ...updates }));
    }
  }, [pathname, isSectionActive, isActive]);

  if (!mounted) {
    return (
      <div className="w-64 h-screen bg-[var(--sidebar-bg)] border-r border-[var(--sidebar-divider)] shrink-0" />
    );
  }

  return (
    <>
      {/* Space holder: sits in layout grid/flex, matches width of current locked/collapsed state */}
      <div
        className={cn(
          "h-screen shrink-0 hidden md:block transition-all duration-300 ease-in-out",
          isLocked ? "w-64" : "w-16"
        )}
      />

      {/* Floating Panel Sidebar */}
      <aside
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        className={cn(
          "h-screen fixed top-0 left-0 bottom-0 z-50 flex flex-col bg-[var(--sidebar-bg)] border-r border-[var(--sidebar-divider)] select-none transition-all duration-300 ease-in-out",
          isExpanded ? "w-64 shadow-2xl" : "w-16"
        )}
      >
        {/* Top Header / Logo Area */}
        <div className="h-16 flex items-center justify-between px-4 border-b border-[var(--sidebar-divider)] shrink-0 overflow-hidden">
          <div className="flex items-center gap-3 shrink-0">
            <span className="w-8 h-8 rounded-lg bg-[var(--color-leaf)] flex items-center justify-center text-[var(--color-forest)] font-extrabold text-lg shadow-sm shrink-0">
              B
            </span>
            {isExpanded && (
              <span className="text-[var(--color-white)] font-display font-black text-lg tracking-tight transition-all duration-200">
                BizzMate FAS
              </span>
            )}
          </div>
          
          {/* Lock / Toggle button */}
          {isExpanded && (
            <button
              onClick={toggleLock}
              className="p-1.5 rounded-lg text-[var(--sidebar-text-muted)] hover:text-white hover:bg-[var(--color-emerald)]/30 transition-all shrink-0"
              title={isLocked ? "Collapse sidebar" : "Pin/Lock sidebar"}
            >
              {isLocked ? (
                <ChevronLeft className="w-4 h-4 stroke-[2]" />
              ) : (
                <ChevronRight className="w-4 h-4 stroke-[2]" />
              )}
            </button>
          )}
        </div>

        {/* Scrollable Navigation links */}
        <div className="flex-1 overflow-y-auto py-4 px-3 flex flex-col gap-0.5 scrollbar-thin">
          
          {/* Standalone Dashboard */}
          <Link
            href="/"
            className={cn(
              "flex items-center gap-3 px-3 py-2.5 rounded-xl font-medium text-sm transition-all duration-150 group mb-1 shrink-0",
              pathname === "/"
                ? "bg-[var(--sidebar-active-bg)] text-[var(--sidebar-active-txt)] shadow-sm font-semibold"
                : "text-[var(--sidebar-text)] hover:bg-[var(--color-emerald)]/20 hover:text-[var(--sidebar-active-txt)]"
            )}
          >
            <LayoutDashboard
              className={cn(
                "w-[18px] h-[18px] shrink-0 stroke-[1.75] transition-colors",
                pathname === "/"
                  ? "text-[var(--sidebar-active-txt)]"
                  : "text-[var(--sidebar-text-muted)] group-hover:text-[var(--sidebar-active-txt)]"
              )}
            />
            {isExpanded && (
              <span className="transition-all duration-200">Dashboard</span>
            )}
          </Link>

          {/* Collapsible Sections */}
          {sections.map((section) => {
            const sectionOpen = openSections[section.id];
            const sectionActive = isSectionActive(section);

            return (
              <div key={section.id} className="flex flex-col mt-2.5 shrink-0">
                
                {/* Section Header Title */}
                <button
                  onClick={() => isExpanded && toggleSection(section.id)}
                  className={cn(
                    "w-full flex items-center justify-between rounded-lg transition-all duration-150 shrink-0",
                    isExpanded ? "px-3 py-2 text-[10px] font-bold tracking-widest uppercase" : "px-3 py-2 text-center",
                    sectionActive
                      ? "text-[var(--color-leaf)] bg-[var(--color-leaf)]/5"
                      : "text-[var(--sidebar-text-muted)] hover:text-[var(--color-leaf)] hover:bg-[var(--color-leaf)]/5"
                  )}
                  disabled={!isExpanded}
                >
                  <div className={cn("flex items-center gap-2", !isExpanded && "mx-auto")}>
                    <section.icon className="w-4 h-4 shrink-0 stroke-[2]" />
                    {isExpanded && <span>{section.label}</span>}
                  </div>
                  {isExpanded && (
                    <ChevronDown
                      className={cn(
                        "w-3 h-3 transition-transform duration-200",
                        sectionOpen ? "rotate-180" : "rotate-0"
                      )}
                    />
                  )}
                </button>

                {/* Section Children list */}
                {isExpanded && sectionOpen && (
                  <div className="flex flex-col gap-1 mt-1 ml-3.5 pl-3.5 border-l border-[var(--sidebar-divider)]/40">
                    {section.children.map((child) => {
                      
                      // ── Sub-group element (Import Files) ────────────────
                      if (child.subGroup && child.children) {
                        const subKey = child.name.toLowerCase().replace(/\s+/g, "-");
                        const subOpen = openSections[subKey];
                        const subGroupActive = child.children.some((c) => isActive(c.path));

                        return (
                          <div key={child.name} className="flex flex-col gap-1">
                            <button
                              onClick={() => toggleSection(subKey)}
                              className={cn(
                                "w-full flex items-center justify-between px-2.5 py-2.5 rounded-lg text-xs font-semibold transition-all duration-150 group shrink-0",
                                subGroupActive
                                  ? "text-[var(--sidebar-active-txt)] bg-[var(--sidebar-active-bg)]"
                                  : "text-[var(--sidebar-text)] hover:bg-[var(--color-emerald)]/15 hover:text-[var(--sidebar-active-txt)]"
                              )}
                            >
                              <div className="flex items-center gap-2">
                                <child.icon className="w-4 h-4 shrink-0 stroke-[1.75]" />
                                <span>{child.name}</span>
                              </div>
                              <ChevronDown
                                className={cn(
                                  "w-3.5 h-3.5 transition-transform duration-200",
                                  subOpen ? "rotate-180" : "rotate-0"
                                )}
                              />
                            </button>

                            {subOpen && (
                              <div className="flex flex-col gap-1 mt-0.5 ml-3 pl-3 border-l border-[var(--sidebar-divider)]/30">
                                {child.children.map((sub) => {
                                  const subActive = isActive(sub.path);
                                  return (
                                    <Link
                                      key={sub.path}
                                      href={sub.path}
                                      className={cn(
                                        "flex items-center justify-between gap-2 px-2.5 py-2 rounded-lg text-xs font-medium transition-all duration-150 shrink-0",
                                        subActive
                                          ? "bg-[var(--sidebar-active-bg)] text-[var(--sidebar-active-txt)] shadow-sm font-semibold"
                                          : "text-[var(--sidebar-text-muted)] hover:bg-[var(--color-emerald)]/10 hover:text-[var(--sidebar-active-txt)]"
                                      )}
                                    >
                                      <div className="flex items-center gap-2">
                                        <sub.icon className="w-3.5 h-3.5 shrink-0 stroke-[1.75]" />
                                        <span>{sub.name}</span>
                                      </div>
                                      {sub.upcoming && (
                                        <span className="shrink-0 text-[8px] font-bold px-1.5 py-0.5 rounded-full bg-[var(--color-leaf)]/10 text-[var(--color-leaf)] tracking-wider uppercase border border-[var(--color-leaf)]/20">
                                          Soon
                                        </span>
                                      )}
                                    </Link>
                                  );
                                })}
                              </div>
                            )}
                          </div>
                        );
                      }

                      // ── Regular child link element ──────────────────────
                      const active = isActive(child.path);
                      return (
                        <Link
                          key={child.path + child.name}
                          href={child.path}
                          className={cn(
                            "flex items-center justify-between gap-2 px-2.5 py-2.5 rounded-lg text-sm font-medium transition-all duration-150 shrink-0",
                            active
                              ? "bg-[var(--sidebar-active-bg)] text-[var(--sidebar-active-txt)] shadow-sm font-semibold"
                              : "text-[var(--sidebar-text)] hover:bg-[var(--color-emerald)]/15 hover:text-[var(--sidebar-active-txt)]"
                          )}
                        >
                          <div className="flex items-center gap-2.5">
                            <child.icon className="w-4 h-4 shrink-0 stroke-[1.75]" />
                            <span>{child.name}</span>
                          </div>
                          {child.upcoming && (
                            <span className="shrink-0 text-[8px] font-bold px-1.5 py-0.5 rounded-full bg-[var(--color-leaf)]/10 text-[var(--color-leaf)] tracking-wider uppercase border border-[var(--color-leaf)]/20">
                              Soon
                            </span>
                          )}
                        </Link>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Footer Area with User Profile info */}
        <div className="p-3 border-t border-[var(--sidebar-divider)] mt-auto flex items-center gap-3 bg-[var(--sidebar-bg)] shrink-0 overflow-hidden">
          <div className="shrink-0">
            <UserButton
              appearance={{
                elements: {
                  avatarBox: "w-9 h-9 border border-[var(--sidebar-divider)] shadow-sm",
                },
              }}
            />
          </div>
          {isExpanded && (
            <div className="flex flex-col min-w-0 transition-all duration-200">
              <span className="text-sm font-semibold text-[var(--sidebar-active-txt)] truncate">
                My Account
              </span>
              <span className="text-xs text-[var(--sidebar-text-muted)] truncate">
                Settings & Profile
              </span>
            </div>
          )}
        </div>
      </aside>
    </>
  );
}
