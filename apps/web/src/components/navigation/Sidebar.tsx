"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { UserButton } from "@clerk/nextjs";
import {
  Squares2X2Icon,
  BuildingOffice2Icon,
  UsersIcon,
  DocumentTextIcon,
  BuildingLibraryIcon,
  BanknotesIcon,
  BookOpenIcon,
  ArrowsRightLeftIcon,
  ChevronDownIcon,
  ArrowTrendingUpIcon,
  CalendarDaysIcon,
  ScaleIcon,
  WalletIcon,
  FolderArrowDownIcon,
  ChartBarIcon,
  CurrencyRupeeIcon,
  EllipsisHorizontalCircleIcon,
} from "@heroicons/react/24/outline";
import { cn } from "@/utils/cn";

// ─── Types ────────────────────────────────────────────────────────────────────

interface ChildItem {
  name: string;
  path: string;
  upcoming?: boolean;
  /** true when this child is itself an expandable sub-group */
  subGroup?: boolean;
  children?: Array<{ name: string; path: string; upcoming?: boolean }>;
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

// ─── Nav Structure ────────────────────────────────────────────────────────────

const sections: NavSection[] = [
  {
    id: "master",
    label: "Master",
    icon: BuildingOffice2Icon,
    children: [
      { name: "Broker",    path: "/brokers" },
      { name: "Clients",   path: "/clients" },
      { name: "Scripts",   path: "/scripts" },
      { name: "Exchanges", path: "/exchanges" },
      { name: "Brokerage", path: "/brokerage" },
      { name: "Others",    path: "/account-master" },
    ],
  },
  {
    id: "data",
    label: "Data",
    icon: FolderArrowDownIcon,
    children: [
      { name: "Trades",        path: "/trades" },
      { name: "Closing Rates", path: "/closing-rates" },
      { name: "Expiry Dates",  path: "/expiry-dates" },
      {
        name: "Import Files",
        path: "#",
        subGroup: true,
        children: [
          { name: "Trade Import",          path: "/trades?import=true" },
          { name: "Closing Rates Import",  path: "/closing-rates?import=true" },
          { name: "Margine File Imports",  path: comingSoon("margine-file-imports"), upcoming: true },
        ],
      },
    ],
  },
  {
    id: "reports",
    label: "Reports",
    icon: ChartBarIcon,
    children: [
      { name: "Sattelment Reports",     path: "/settlement" },
      { name: "Brokerage Report",       path: comingSoon("brokerage-report"),        upcoming: true },
      { name: "Cleint wise / Script Wise", path: comingSoon("client-wise-script-wise"), upcoming: true },
      { name: "Broker wise / Script Wise", path: comingSoon("broker-wise-script-wise"), upcoming: true },
      { name: "Script Wise / Cleint",   path: comingSoon("script-wise-client"),      upcoming: true },
      { name: "Script Wise / Broker",   path: comingSoon("script-wise-broker"),      upcoming: true },
    ],
  },
  {
    id: "financial",
    label: "Financial",
    icon: CurrencyRupeeIcon,
    children: [
      { name: "Ledger Report",             path: "/ledger" },
      { name: "Voucher Entry",             path: "/vouchers" },
      { name: "Collection Book",           path: comingSoon("collection-book"),           upcoming: true },
      { name: "Cash Book",                 path: comingSoon("cash-book"),                 upcoming: true },
      { name: "Bank Book",                 path: comingSoon("bank-book"),                 upcoming: true },
      { name: "JV / Contra Register",      path: comingSoon("jv-contra-register"),        upcoming: true },
      { name: "Payment / Receipt Register",path: comingSoon("payment-receipt-register"),  upcoming: true },
      { name: "Margine Report",            path: comingSoon("margine-report"),            upcoming: true },
      { name: "Expance Register",          path: comingSoon("expance-register"),          upcoming: true },
      { name: "Trial Balance",             path: comingSoon("trial-balance"),             upcoming: true },
      { name: "Profit & Loss",             path: comingSoon("profit-loss"),               upcoming: true },
      { name: "Balancesheet",              path: comingSoon("balancesheet"),              upcoming: true },
    ],
  },
];

// ─── Sidebar Component ────────────────────────────────────────────────────────

export function Sidebar() {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  // Track open/closed state per section and sub-group
  const [openSections, setOpenSections] = React.useState<Record<string, boolean>>({
    master: true,
    data: true,
    reports: true,
    financial: true,
    "import-files": true,
  });

  const toggleSection = (id: string) =>
    setOpenSections((prev) => ({ ...prev, [id]: !prev[id] }));

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
      // Handle import query params
      if (path.includes("?import=true")) {
        const base = path.split("?")[0];
        return isImportMode(base);
      }
      // Handle coming-soon: match both pathname AND the feature slug
      if (path.includes("/coming-soon")) {
        if (pathname !== "/coming-soon") return false;
        const pathFeature = new URL(path, "http://x").searchParams.get("feature");
        const currentFeature = searchParams?.get("feature");
        return pathFeature === currentFeature;
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
      // Check sub-groups
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname]);

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <aside className="w-64 h-screen bg-[var(--sidebar-bg)] border-r border-[var(--sidebar-divider)] flex flex-col sticky top-0 shrink-0 select-none">

      {/* Logo */}
      <div className="h-16 flex items-center px-6 border-b border-[var(--sidebar-divider)] shrink-0 gap-3">
        <span className="w-8 h-8 rounded-lg bg-[var(--color-leaf)] flex items-center justify-center text-[var(--color-forest)] font-extrabold text-lg shadow-sm">
          B
        </span>
        <span className="text-[var(--color-white)] font-display font-bold text-lg tracking-tight">
          BizzMate FAS
        </span>
      </div>

      {/* Scroll area */}
      <div className="flex-1 overflow-y-auto py-4 px-3 flex flex-col gap-0.5">

        {/* Dashboard — standalone */}
        <Link
          href="/"
          className={cn(
            "flex items-center gap-3 px-3 py-2.5 rounded-lg font-medium text-sm transition-all duration-150 group mb-1",
            pathname === "/"
              ? "bg-[var(--sidebar-active-bg)] text-[var(--sidebar-active-txt)] shadow-sm"
              : "text-[var(--sidebar-text)] hover:bg-[var(--color-emerald)]/20 hover:text-[var(--sidebar-active-txt)]"
          )}
        >
          <Squares2X2Icon
            className={cn(
              "w-4.5 h-4.5 shrink-0",
              pathname === "/"
                ? "text-[var(--sidebar-active-txt)]"
                : "text-[var(--sidebar-text-muted)] group-hover:text-[var(--sidebar-active-txt)]"
            )}
          />
          <span>Dashboard</span>
        </Link>

        {/* Grouped Sections */}
        {sections.map((section) => {
          const sectionOpen = openSections[section.id];
          const sectionActive = isSectionActive(section);

          return (
            <div key={section.id} className="flex flex-col mt-2">
              {/* Section Header */}
              <button
                onClick={() => toggleSection(section.id)}
                className={cn(
                  "w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs font-semibold tracking-widest uppercase transition-all duration-150 mt-1 group",
                  sectionActive
                    ? "text-[var(--color-leaf)] bg-[var(--color-leaf)]/5"
                    : "text-[var(--sidebar-text-muted)] hover:text-[var(--color-leaf)] hover:bg-[var(--color-leaf)]/5"
                )}
              >
                <div className="flex items-center gap-2">
                  <section.icon className="w-3.5 h-3.5 shrink-0" />
                  <span>{section.label}</span>
                </div>
                <ChevronDownIcon
                  className={cn(
                    "w-3.5 h-3.5 transition-transform duration-200",
                    sectionOpen ? "rotate-180" : "rotate-0"
                  )}
                />
              </button>

              {/* Section Children */}
              {sectionOpen && (
                <div className="flex flex-col gap-1 mt-1 ml-3 pl-3 border-l border-[var(--sidebar-divider)]/60">
                  {section.children.map((child) => {
                    // ── Sub-group (Import Files) ──────────────────────────
                    if (child.subGroup && child.children) {
                      const subKey = child.name.toLowerCase().replace(/\s+/g, "-");
                      const subOpen = openSections[subKey];
                      const subGroupActive = child.children.some((c) => isActive(c.path));

                      return (
                        <div key={child.name} className="flex flex-col gap-1">
                          <button
                            onClick={() => toggleSection(subKey)}
                            className={cn(
                              "w-full flex items-center justify-between px-2.5 py-2.5 rounded-lg text-xs font-semibold transition-all duration-150 group",
                              subGroupActive
                                ? "text-[var(--sidebar-active-txt)] bg-[var(--sidebar-active-bg)]"
                                : "text-[var(--sidebar-text)] hover:bg-[var(--color-emerald)]/15 hover:text-[var(--sidebar-active-txt)]"
                            )}
                          >
                            <div className="flex items-center gap-2">
                              <FolderArrowDownIcon className="w-3.5 h-3.5 shrink-0" />
                              <span>{child.name}</span>
                            </div>
                            <ChevronDownIcon
                              className={cn(
                                "w-3 h-3 transition-transform duration-200",
                                subOpen ? "rotate-180" : "rotate-0"
                              )}
                            />
                          </button>

                          {subOpen && (
                            <div className="flex flex-col gap-1 mt-0.5 ml-3 pl-3 border-l border-[var(--sidebar-divider)]/40">
                              {child.children.map((sub) => {
                                const subActive = isActive(sub.path);
                                return (
                                  <Link
                                    key={sub.path}
                                    href={sub.path}
                                    className={cn(
                                      "flex items-center justify-between gap-2 px-2.5 py-2 rounded-lg text-xs font-medium transition-all duration-150",
                                      subActive
                                        ? "bg-[var(--sidebar-active-bg)] text-[var(--sidebar-active-txt)] shadow-sm"
                                        : "text-[var(--sidebar-text-muted)] hover:bg-[var(--color-emerald)]/10 hover:text-[var(--sidebar-active-txt)]"
                                    )}
                                  >
                                    <span>{sub.name}</span>
                                    {sub.upcoming && (
                                      <span className="shrink-0 text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-[var(--color-leaf)]/15 text-[var(--color-leaf)] tracking-wide uppercase">
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

                    // ── Regular child link ────────────────────────────────
                    const active = isActive(child.path);
                    return (
                      <Link
                        key={child.path + child.name}
                        href={child.path}
                        className={cn(
                          "flex items-center justify-between gap-2 px-2.5 py-2.5 rounded-lg text-sm font-medium transition-all duration-150",
                          active
                            ? "bg-[var(--sidebar-active-bg)] text-[var(--sidebar-active-txt)] shadow-sm"
                            : "text-[var(--sidebar-text)] hover:bg-[var(--color-emerald)]/15 hover:text-[var(--sidebar-active-txt)]"
                        )}
                      >
                        <span>{child.name}</span>
                        {child.upcoming && (
                          <span className="shrink-0 text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-[var(--color-leaf)]/15 text-[var(--color-leaf)] tracking-wide uppercase">
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

      {/* Footer */}
      <div className="p-4 border-t border-[var(--sidebar-divider)] mt-auto flex items-center gap-3 bg-[var(--sidebar-bg)] shrink-0">
        <UserButton
          appearance={{
            elements: {
              avatarBox: "w-9 h-9 border border-[var(--sidebar-divider)] shadow-sm",
            },
          }}
        />
        <div className="flex flex-col min-w-0">
          <span className="text-sm font-semibold text-[var(--sidebar-active-txt)] truncate">
            My Account
          </span>
          <span className="text-xs text-[var(--sidebar-text-muted)] truncate">
            Settings & Profile
          </span>
        </div>
      </div>
    </aside>
  );
}
