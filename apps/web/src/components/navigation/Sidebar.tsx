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
  Wallet,
  Receipt,
  BookText,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  Sliders,
  Calendar,
} from "lucide-react";
import { cn } from "@/utils/cn";
import { usePermissions } from "@/context/AuthPermissionsContext";

// ─── Types ────────────────────────────────────────────────────────────────────

interface ChildItem {
  name: string;
  path: string;
  upcoming?: boolean;
  feature?: string;
  permission?: { feature: string; action: string };
  icon: React.ComponentType<any>;
  /** true when this child is itself an expandable sub-group */
  subGroup?: boolean;
  children?: Array<{
    name: string;
    path: string;
    upcoming?: boolean;
    feature?: string;
    permission?: { feature: string; action: string };
    icon: React.ComponentType<any>;
  }>;
}

interface NavSection {
  id: string;
  label: string;
  icon: React.ComponentType<any>;
  children: ChildItem[];
}

// ─── Upcoming helper ──────────────────────────────────────────────────────────

function _comingSoon(feature: string) {
  return `/coming-soon?feature=${feature}`;
}

// ─── Nav Structure with Custom Icons ──────────────────────────────────────────

const sections: NavSection[] = [
  {
    id: "master",
    label: "Master",
    icon: Sliders,
    children: [
      { name: "Broker",    path: "/brokers",       icon: ShieldCheckIcon, feature: "BROKERS" },
      { name: "Clients",   path: "/clients",       icon: Users,           feature: "CLIENTS" },
      { name: "Scripts",   path: "/scripts",       icon: ScrollText,      feature: "SCRIPTS" },
      { name: "Exchanges", path: "/exchanges",     icon: Globe,           feature: "EXCHANGES" },
      { name: "Currencies", path: "/currencies",   icon: Coins,           feature: "CURRENCIES" },
      { name: "Expiry Dates", path: "/expiry-dates", icon: Calendar,       feature: "SCRIPTS" },
      { name: "Brokerage", path: "/brokerage",     icon: Percent,         feature: "BROKERAGE" },
      { name: "Others",    path: "/account-master", icon: Layers,          feature: "ACCOUNT_MASTER" },
    ],
  },
  {
    id: "data",
    label: "Data",
    icon: FolderOpen,
    children: [
      { name: "Trades",        path: "/trades",        icon: ArrowUpDown,  feature: "TRADES" },
      { name: "Closing Rates", path: "/closing-rates",  icon: TrendingUp,   feature: "CLOSING_RATES" },
    ],
  },
  {
    id: "reports",
    label: "Reports",
    icon: FileSpreadsheet,
    children: [
      {
        name: "Invoice Report",
        path: "/reports/invoice",
        icon: FileSpreadsheet,
        feature: "REPORTS",
        permission: { feature: "REPORTS", action: "VIEW" },
      },
      {
        name: "Open Position Report",
        path: "/reports/open-position",
        icon: TrendingUp,
        feature: "REPORTS",
        permission: { feature: "REPORTS", action: "VIEW" },
      },
      {
        name: "Settlement Report",
        path: "/reports/settlement",
        icon: ScrollText,
        feature: "REPORTS",
        permission: { feature: "REPORTS", action: "VIEW" },
      },
      {
        name: "Settlement Summary",
        path: "/reports/settlement-summary",
        icon: BookText,
        feature: "REPORTS",
        permission: { feature: "REPORTS", action: "VIEW" },
      },
      {
        name: "Settlement Operations",
        path: "/settlement",
        icon: Scale,
        feature: "SETTLEMENT",
        permission: { feature: "SETTLEMENT", action: "VIEW" },
      },
    ],
  },
  {
    id: "financial",
    label: "Financial",
    icon: Wallet,
    children: [
      { name: "Ledger Report", path: "/ledger",        icon: BookText, feature: "LEDGER" },
      { name: "Voucher Entry", path: "/vouchers",      icon: Receipt,  feature: "VOUCHERS" },
      { name: "Trial Balance", path: "/trial-balance", icon: Scale,    feature: "TRIAL_BALANCE" },
    ],
  },
  {
    id: "admin",
    label: "Administration",
    icon: ShieldCheckIcon,
    children: [
      { name: "Users & Roles", path: "/users", icon: Users, feature: "USER_MANAGEMENT" },
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
  const { hasFeature, hasPermission, roleName, userName, userId } = usePermissions();

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
    admin: true,
    "import-files": true,
  });

  const filteredSections = React.useMemo(() => {
    return sections
      .map((sec) => {
        const filteredChildren = sec.children
          .map((child) => {
            if (child.subGroup && child.children) {
              const validSub = child.children.filter((sub) => {
                if (sub.permission) {
                  return hasPermission(sub.permission.feature, sub.permission.action);
                }
                if (sub.feature) {
                  return hasFeature(sub.feature);
                }
                return true;
              });
              if (validSub.length === 0) return null;
              return { ...child, children: validSub };
            }

            if (child.permission) {
              if (!hasPermission(child.permission.feature, child.permission.action)) return null;
            } else if (child.feature) {
              if (!hasFeature(child.feature)) return null;
            }
            return child;
          })
          .filter(Boolean) as ChildItem[];

        if (filteredChildren.length === 0) return null;
        return { ...sec, children: filteredChildren };
      })
      .filter(Boolean) as NavSection[];
  }, [hasFeature, hasPermission]);

  React.useEffect(() => {
    const saved = localStorage.getItem("sidebar-locked");
    if (saved !== null) {
      setIsLocked(saved === "true");
    }
    setMounted(true);
  }, []);

  const toggleLock = React.useCallback(() => {
    setIsLocked((prev) => {
      const nextVal = !prev;
      localStorage.setItem("sidebar-locked", String(nextVal));
      return nextVal;
    });
  }, []);

  // Listen for global shortcut '[' and universal search custom trigger
  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't trigger if user is typing in an input or textarea
      const tag = (e.target as HTMLElement)?.tagName?.toLowerCase();
      if (tag === 'input' || tag === 'textarea' || (e.target as HTMLElement)?.isContentEditable) {
        return;
      }
      if (e.key === '[') {
        e.preventDefault();
        toggleLock();
      }
    };

    const handleCustomToggle = () => {
      toggleLock();
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('bizzmate-toggle-sidebar', handleCustomToggle);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('bizzmate-toggle-sidebar', handleCustomToggle);
    };
  }, [toggleLock]);

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
      <div className="w-64 h-screen bg-transparent shrink-0 rounded-none m-0" />
    );
  }

  return (
    <>
      {/* Space holder: sits in layout grid/flex, matches width of current locked/collapsed state */}
      <div
        className={cn(
          "h-screen shrink-0 hidden md:block transition-[width] duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] rounded-none m-0",
          isLocked ? "w-64" : "w-16"
        )}
      />

      {/* Panel Sidebar (Flush to edge, 0 margin, NOT rounded, Transparent on Primary Gradient) */}
      <aside
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        className={cn(
          "h-screen fixed top-0 left-0 bottom-0 z-50 flex flex-col text-blue-100 select-none overflow-hidden rounded-none m-0 border-0",
          "transition-[width,background-color,backdrop-filter,box-shadow] duration-300 ease-[cubic-bezier(0.16,1,0.3,1)]",
          isExpanded ? "w-64" : "w-16",
          isHovered && !isLocked
            ? "bg-[#061438]/85 backdrop-blur-2xl shadow-[16px_0_48px_rgba(2,8,24,0.55)]"
            : "bg-transparent shadow-none"
        )}
      >
        {/* Top Header / Logo Area (56px) */}
        <div className="h-14 flex items-center justify-between px-4 border-b border-white/10 shrink-0 overflow-hidden bg-transparent rounded-none">
          <div className="flex items-center gap-2.5 shrink-0">
            <span className="w-7 h-7 rounded-lg bg-white/20 border border-white/30 flex items-center justify-center text-white font-bold text-sm shadow-sm shrink-0">
              B
            </span>
            {isExpanded && (
              <span className="text-white font-bold text-base tracking-tight whitespace-nowrap animate-in fade-in duration-200">
                BizzMate FAS
              </span>
            )}
          </div>
          
          {/* Lock / Toggle button */}
          {isExpanded && (
            <button
              onClick={toggleLock}
              className="p-1.5 rounded-lg text-blue-200 hover:text-white hover:bg-white/10 transition-colors shrink-0 cursor-pointer"
              title={isLocked ? "Collapse sidebar ([)" : "Pin/Lock sidebar ([)"}
            >
              {isLocked ? (
                <ChevronLeft className="w-4 h-4 stroke-[1.75]" />
              ) : (
                <ChevronRight className="w-4 h-4 stroke-[1.75]" />
              )}
            </button>
          )}
        </div>

        {/* Scrollable Navigation links (scrollbar hidden) */}
        <div className="flex-1 overflow-y-auto py-3 px-2 flex flex-col gap-0.5 scrollbar-none [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
          
          {/* Standalone Dashboard */}
          <Link
            href="/"
            className={cn(
              "flex items-center gap-2.5 px-3 py-2 rounded-lg font-medium text-sm transition-all duration-120 group mb-1 shrink-0",
              pathname === "/"
                ? "bg-white text-[#0A1B4D] font-bold shadow-md"
                : "text-blue-100/80 hover:bg-white/10 hover:text-white"
            )}
          >
            <LayoutDashboard
              className={cn(
                "w-4 h-4 shrink-0 stroke-[1.75] transition-colors",
                pathname === "/"
                  ? "text-[#0A1B4D]"
                  : "text-blue-200 group-hover:text-white"
              )}
            />
            {isExpanded && (
              <span className="transition-all duration-150">Dashboard</span>
            )}
          </Link>

          {/* Collapsible Sections */}
          {filteredSections.map((section) => {
            const sectionOpen = openSections[section.id];
            const sectionActive = isSectionActive(section);

            return (
              <div key={section.id} className="flex flex-col mt-2 shrink-0">
                
                {/* Section Header Title */}
                <button
                  onClick={() => isExpanded && toggleSection(section.id)}
                  className={cn(
                    "w-full flex items-center justify-between rounded-lg transition-all duration-120 shrink-0 cursor-pointer",
                    isExpanded ? "px-2.5 py-1.5 text-[11px] font-bold tracking-wider uppercase" : "px-2 py-1.5 text-center",
                    sectionActive
                      ? "text-white font-bold"
                      : "text-blue-200/70 hover:text-white hover:bg-white/5"
                  )}
                  disabled={!isExpanded}
                >
                  <div className={cn("flex items-center gap-2", !isExpanded && "mx-auto")}>
                    {isExpanded ? (
                      <span className="text-[11px] font-bold tracking-wider uppercase text-blue-200/70 select-none">
                        {section.label}
                      </span>
                    ) : (
                      <section.icon className="w-4 h-4 shrink-0 stroke-[1.75] text-blue-200/80" />
                    )}
                  </div>
                  {isExpanded && (
                    <ChevronDown
                      className={cn(
                        "w-3.5 h-3.5 transition-transform duration-200 text-blue-300/70",
                        sectionOpen ? "rotate-180" : "rotate-0"
                      )}
                    />
                  )}
                </button>

                {/* Section Children list */}
                {isExpanded && sectionOpen && (
                  <div className="flex flex-col gap-1 mt-1">
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
                                "w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs font-semibold transition-all duration-120 group shrink-0 cursor-pointer",
                                subGroupActive || subOpen
                                  ? "text-white bg-[#0D2460]/80 border border-blue-400/25 shadow-xs"
                                  : "text-blue-100/80 hover:bg-white/10 hover:text-white"
                              )}
                            >
                              <div className="flex items-center gap-2.5">
                                <child.icon className={cn("w-4 h-4 shrink-0 stroke-[1.75]", subGroupActive ? "text-white" : "text-blue-200 group-hover:text-white")} />
                                <span className="font-medium text-sm">{child.name}</span>
                              </div>
                              <ChevronDown
                                className={cn(
                                  "w-3.5 h-3.5 transition-transform duration-200 text-blue-200",
                                  subOpen ? "rotate-180" : "rotate-0"
                                )}
                              />
                            </button>

                            {subOpen && (
                              <div className="flex flex-col gap-1 mt-0.5 ml-4 pl-2.5 border-l border-white/20">
                                {child.children.map((sub) => {
                                  const subActive = isActive(sub.path);
                                  return (
                                    <Link
                                      key={sub.path}
                                      href={sub.path}
                                      className={cn(
                                        "flex items-center justify-between gap-2 px-3 py-1.5 rounded-lg text-xs font-medium transition-all duration-120 shrink-0",
                                        subActive
                                          ? "bg-white text-[#0A1B4D] font-bold shadow-sm"
                                          : "text-blue-100/80 hover:bg-white/10 hover:text-white"
                                      )}
                                    >
                                      <div className="flex items-center gap-2">
                                        <sub.icon className={cn("w-3.5 h-3.5 shrink-0 stroke-[1.75]", subActive ? "text-[#0A1B4D]" : "text-blue-200")} />
                                        <span>{sub.name}</span>
                                      </div>
                                      {sub.upcoming && (
                                        <span className="shrink-0 text-[9px] font-bold px-1.5 py-0.2 rounded bg-amber-400 text-amber-950 tracking-wider uppercase">
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
                            "flex items-center justify-between gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-all duration-120 shrink-0 group",
                            active
                              ? "bg-white text-[#0A1B4D] font-bold shadow-md"
                              : "text-blue-100/80 hover:bg-white/10 hover:text-white"
                          )}
                        >
                          <div className="flex items-center gap-2.5">
                            <child.icon
                              className={cn(
                                "w-4 h-4 shrink-0 stroke-[1.75]",
                                active ? "text-[#0A1B4D]" : "text-blue-200 group-hover:text-white"
                              )}
                            />
                            <span>{child.name}</span>
                          </div>
                          {child.upcoming && (
                            <span className="shrink-0 text-[9px] font-bold px-1.5 py-0.2 rounded bg-amber-400 text-amber-950 tracking-wider uppercase font-sans">
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
        <div className="p-3.5 border-t border-white/10 mt-auto flex items-center gap-3 bg-transparent rounded-none m-0 shrink-0 overflow-hidden">
          <div className="shrink-0">
            <UserButton
              appearance={{
                elements: {
                  avatarBox: "w-8 h-8 border border-white/20 shadow-xs",
                },
              }}
            />
          </div>
          {isExpanded && (
            <div className="flex flex-col min-w-0 transition-all duration-150">
              <span className="text-sm font-semibold text-white truncate">
                {userName || "My Account"}
              </span>
              <div className="flex items-center gap-1.5 mt-0.5">
                <span className="w-1.5 h-1.5 rounded-xs bg-blue-400 shrink-0" />
                <span className="text-[11px] font-medium uppercase tracking-wider text-blue-200 truncate">
                  {roleName}
                </span>
              </div>
            </div>
          )}
        </div>
      </aside>
    </>
  );
}
