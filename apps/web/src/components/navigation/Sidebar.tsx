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
  ChevronUpIcon,
  ArrowTrendingUpIcon,
  CalendarDaysIcon,
  ScaleIcon,
  ClipboardIcon,
  WalletIcon
} from "@heroicons/react/24/outline";
import { cn } from "@/utils/cn";

interface NavItem {
  name: string;
  path?: string;
  icon: React.ComponentType<any>;
  children?: Array<{ name: string; path: string }>;
}

export function Sidebar() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [tradesOpen, setTradesOpen] = React.useState(true);
  const [closingRatesOpen, setClosingRatesOpen] = React.useState(true);

  const isTradesImportMode = (pathname === "/trades" && searchParams?.get("import") === "true") || pathname === "/trades/import";
  const isTradesBase = pathname === "/trades" || pathname?.startsWith("/trades/");
  const isTradesListActive = isTradesBase && !isTradesImportMode;

  const isClosingRatesImportMode = (pathname === "/closing-rates" && searchParams?.get("import") === "true") || pathname === "/closing-rates/import";
  const isClosingRatesBase = pathname === "/closing-rates" || pathname?.startsWith("/closing-rates/");
  const isClosingRatesListActive = isClosingRatesBase && !isClosingRatesImportMode;

  React.useEffect(() => {
    if (isTradesImportMode) {
      setTradesOpen(true);
    }
  }, [isTradesImportMode]);

  React.useEffect(() => {
    if (isClosingRatesImportMode) {
      setClosingRatesOpen(true);
    }
  }, [isClosingRatesImportMode]);

  const navItems: NavItem[] = [
    { name: "Dashboard", path: "/", icon: Squares2X2Icon },
    { name: "Brokers", path: "/brokers", icon: BuildingOffice2Icon },
    { name: "Clients", path: "/clients", icon: UsersIcon },
    { name: "Account Master", path: "/account-master", icon: ClipboardIcon },
    { name: "Voucher Entry", path: "/vouchers", icon: WalletIcon },
    { name: "Ledger Report", path: "/ledger", icon: BookOpenIcon },
    { name: "Scripts", path: "/scripts", icon: DocumentTextIcon },
    { name: "Exchanges", path: "/exchanges", icon: BuildingLibraryIcon },
    { name: "Brokerage", path: "/brokerage", icon: BanknotesIcon },
    { name: "Settlement", path: "/settlement", icon: ScaleIcon },
    {
      name: "Closing Rates",
      path: "/closing-rates",
      icon: ArrowTrendingUpIcon,
      children: [
        { name: "Import File", path: "/closing-rates?import=true" },
      ]
    },
    { name: "Expiry Dates", path: "/expiry-dates", icon: CalendarDaysIcon },
    {
      name: "Trades",
      path: "/trades",
      icon: ArrowsRightLeftIcon,
      children: [
        { name: "Import File", path: "/trades?import=true" },
      ]
    }
  ];

  const isActive = (path?: string) => {
    if (!path) return false;
    if (path === "/") {
      return pathname === "/";
    }
    return pathname === path || pathname?.startsWith(path + "/");
  };

  const isParentActive = (item: NavItem) => {
    if (item.name === "Trades") {
      return isTradesBase;
    }
    if (item.name === "Closing Rates") {
      return isClosingRatesBase;
    }
    if (item.path) return isActive(item.path);
    if (item.children) {
      return item.children.some(child => pathname === child.path);
    }
    return false;
  };

  return (
    <aside className="w-64 h-screen bg-[var(--sidebar-bg)] border-r border-[var(--sidebar-divider)] flex flex-col sticky top-0 shrink-0 select-none">
      {/* Logo Area */}
      <div className="h-16 flex items-center px-6 border-b border-[var(--sidebar-divider)] shrink-0 gap-3">
        <span className="w-8 h-8 rounded-lg bg-[var(--color-leaf)] flex items-center justify-center text-[var(--color-forest)] font-extrabold text-lg shadow-sm">
          B
        </span>
        <span className="text-[var(--color-white)] font-display font-bold text-lg tracking-tight">
          BizzMate FAS
        </span>
      </div>

      {/* Navigation List */}
      <div className="flex-1 overflow-y-auto py-6 px-4 flex flex-col gap-6">
        <div>
          <nav className="flex flex-col gap-1.5">
            {navItems.map((item) => {
              const hasChildren = !!item.children;
              const parentActive = isParentActive(item);
              
              const isOpen = item.name === "Trades" ? tradesOpen : item.name === "Closing Rates" ? closingRatesOpen : false;
              const setOpen = item.name === "Trades" ? setTradesOpen : item.name === "Closing Rates" ? setClosingRatesOpen : () => {};
              
              const isItemImportMode = item.name === "Trades" ? isTradesImportMode : item.name === "Closing Rates" ? isClosingRatesImportMode : false;
              const isItemListActive = item.name === "Trades" ? isTradesListActive : item.name === "Closing Rates" ? isClosingRatesListActive : false;

              if (hasChildren) {
                return (
                  <div key={item.name} className="flex flex-col gap-1">
                    <div
                      className={cn(
                        "w-full flex items-center justify-between rounded-lg font-medium text-sm transition-all duration-150 group text-[var(--sidebar-text)] hover:bg-[var(--color-emerald)]/20 hover:text-[var(--sidebar-active-txt)]",
                        isItemListActive
                          ? "bg-[var(--sidebar-active-bg)] text-[var(--sidebar-active-txt)] shadow-sm"
                          : parentActive && "bg-[var(--sidebar-active-bg)]/10 text-[var(--color-leaf)]"
                      )}
                    >
                      <Link
                        href={item.path || "#"}
                        className="flex-1 flex items-center gap-3 px-3 py-2.5 rounded-l-lg"
                      >
                        <item.icon
                          className={cn(
                            "w-5 h-5 shrink-0 transition-colors",
                            isItemListActive
                              ? "text-[var(--sidebar-active-txt)]"
                              : parentActive
                              ? "text-[var(--color-leaf)]"
                              : "text-[var(--sidebar-text-muted)] group-hover:text-[var(--sidebar-active-txt)]"
                          )}
                        />
                        <span>{item.name}</span>
                      </Link>
                      <button
                        onClick={(e) => {
                          e.preventDefault();
                          setOpen(!isOpen);
                        }}
                        className={cn(
                          "px-3 py-3 rounded-r-lg hover:bg-[var(--color-emerald)]/30 text-[var(--sidebar-text-muted)] hover:text-[var(--sidebar-active-txt)] flex items-center justify-center shrink-0 border-l border-[var(--sidebar-divider)]/40",
                          isItemListActive && "text-[var(--sidebar-active-txt)]/80 hover:bg-[var(--color-emerald)]/30"
                        )}
                      >
                        {isOpen ? (
                          <ChevronUpIcon className="w-4 h-4" />
                        ) : (
                          <ChevronDownIcon className="w-4 h-4" />
                        )}
                      </button>
                    </div>

                    {isOpen && (
                      <div className="pl-6 flex flex-col gap-1 border-l border-[var(--sidebar-divider)] ml-5 mt-1">
                        {item.children!.map((child) => {
                          const childActive = (child.path.includes("import=true") || child.path.endsWith("/import")) ? isItemImportMode : pathname === child.path;
                          return (
                            <Link
                              key={child.path}
                              href={child.path}
                              className={cn(
                                "flex items-center gap-3 px-3 py-2 rounded-lg font-medium text-xs transition-all duration-150",
                                childActive
                                  ? "bg-[var(--sidebar-active-bg)] text-[var(--sidebar-active-txt)] shadow-sm font-semibold"
                                  : "text-[var(--sidebar-text-muted)] hover:bg-[var(--color-emerald)]/10 hover:text-[var(--sidebar-active-txt)]"
                              )}
                            >
                              <span>{child.name}</span>
                            </Link>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              }

              const active = isActive(item.path);
              return (
                <Link
                  key={item.path}
                  href={item.path!}
                  className={cn(
                    "flex items-center gap-3 px-3 py-2.5 rounded-lg font-medium text-sm transition-all duration-150 group",
                    active
                      ? "bg-[var(--sidebar-active-bg)] text-[var(--sidebar-active-txt)] shadow-sm"
                      : "text-[var(--sidebar-text)] hover:bg-[var(--color-emerald)]/20 hover:text-[var(--sidebar-active-txt)]"
                  )}
                >
                  <item.icon
                    className={cn(
                      "w-5 h-5 shrink-0 transition-colors",
                      active
                        ? "text-[var(--color-white)]"
                        : "text-[var(--sidebar-text-muted)] group-hover:text-[var(--sidebar-active-txt)]"
                    )}
                  />
                  <span>{item.name}</span>
                </Link>
              );
            })}
          </nav>
        </div>
      </div>

      {/* Footer / User Profile */}
      <div className="p-4 border-t border-[var(--sidebar-divider)] mt-auto flex items-center gap-3 bg-[var(--sidebar-bg)] shrink-0">
        <UserButton
          appearance={{
            elements: {
              avatarBox: "w-9 h-9 border border-[var(--sidebar-divider)] shadow-sm"
            }
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
