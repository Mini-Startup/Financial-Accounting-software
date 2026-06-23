"use client";

import { Suspense } from "react";
import { useSearchParams } from "next/navigation";

function formatFeatureName(slug: string): string {
  return slug
    .split("-")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

function ComingSoonContent() {
  const searchParams = useSearchParams();
  const featureSlug = searchParams?.get("feature") ?? "";
  const featureName = featureSlug ? formatFeatureName(featureSlug) : "This Feature";

  return (
    <div className="min-h-[80vh] flex items-center justify-center px-4">
      <div className="max-w-lg w-full text-center">

        {/* Animated Icon */}
        <div className="relative flex items-center justify-center mx-auto mb-10 w-28 h-28">
          {/* Outer pulse rings */}
          <span className="absolute inset-0 rounded-full bg-[var(--color-leaf)]/10 animate-ping" style={{ animationDuration: "2.4s" }} />
          <span className="absolute inset-3 rounded-full bg-[var(--color-leaf)]/15 animate-ping" style={{ animationDuration: "2s", animationDelay: "0.3s" }} />
          {/* Core circle */}
          <span className="relative w-20 h-20 rounded-full bg-gradient-to-br from-[var(--color-forest)] to-[var(--color-emerald)] flex items-center justify-center shadow-lg shadow-[var(--color-leaf)]/25">
            <svg
              className="w-9 h-9 text-[var(--color-mint)]"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={1.5}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M12 6v6l4 2m6-2a10 10 0 11-20 0 10 10 0 0120 0z"
              />
            </svg>
          </span>
        </div>

        {/* Badge */}
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-[var(--color-leaf)]/10 border border-[var(--color-leaf)]/25 mb-6">
          <span className="w-1.5 h-1.5 rounded-full bg-[var(--color-leaf)] animate-pulse" />
          <span className="text-xs font-semibold tracking-widest uppercase text-[var(--color-leaf)]">
            In Development
          </span>
        </div>

        {/* Heading */}
        <h1 className="text-3xl font-bold text-[var(--color-charcoal)] mb-3 leading-tight tracking-tight">
          {featureName}
        </h1>

        {/* Subheading */}
        <p className="text-[var(--color-slate)] text-base leading-relaxed mb-8 max-w-sm mx-auto">
          This feature is currently being crafted with great care.
          <br />
          Stay tuned — it will be available in the coming days.
        </p>

        {/* Progress bar decoration */}
        <div className="mx-auto max-w-xs mb-10">
          <div className="flex justify-between text-xs text-[var(--color-fog)] mb-2">
            <span>Progress</span>
            <span>Coming Soon</span>
          </div>
          <div className="h-1.5 w-full rounded-full bg-[var(--color-cloud)] overflow-hidden">
            <div
              className="h-full rounded-full bg-gradient-to-r from-[var(--color-emerald)] to-[var(--color-leaf)] animate-pulse"
              style={{ width: "45%" }}
            />
          </div>
        </div>

        {/* Divider */}
        <div className="flex items-center gap-4 mb-8">
          <div className="flex-1 h-px bg-[var(--color-border-light)]" />
          <span className="text-[var(--color-fog)] text-xs tracking-wide">BizzMate FAS</span>
          <div className="flex-1 h-px bg-[var(--color-border-light)]" />
        </div>

        {/* Info cards */}
        <div className="grid grid-cols-3 gap-3 text-left">
          {[
            {
              icon: (
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9.75 9.75l4.5 4.5m0-4.5l-4.5 4.5M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              ),
              label: "No Disruption",
              desc: "Other features work normally",
            },
            {
              icon: (
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z" />
                </svg>
              ),
              label: "Secure Build",
              desc: "Enterprise-grade quality",
            },
            {
              icon: (
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 13.5l10.5-11.25L12 10.5h8.25L9.75 21.75 12 13.5H3.75z" />
                </svg>
              ),
              label: "Fast Release",
              desc: "Launching soon",
            },
          ].map((card) => (
            <div
              key={card.label}
              className="flex flex-col gap-2 p-3 rounded-xl bg-[var(--color-snow)] border border-[var(--color-border-light)]"
            >
              <span className="text-[var(--color-emerald)]">{card.icon}</span>
              <span className="text-xs font-semibold text-[var(--color-charcoal)]">{card.label}</span>
              <span className="text-xs text-[var(--color-slate)] leading-snug">{card.desc}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default function ComingSoonPage() {
  return (
    <Suspense fallback={
      <div className="min-h-[80vh] flex items-center justify-center">
        <div className="w-8 h-8 rounded-full border-2 border-[var(--color-leaf)] border-t-transparent animate-spin" />
      </div>
    }>
      <ComingSoonContent />
    </Suspense>
  );
}
