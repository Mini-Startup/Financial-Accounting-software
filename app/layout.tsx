import type { Metadata } from "next";
import { ClerkProvider } from "@clerk/nextjs";
import "./globals.css";

export const metadata: Metadata = {
  title: "Financial Accounting Portal",
  description: "Secure financial accounting and management portal",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <ClerkProvider
      appearance={{
        layout: {
          socialButtonsVariant: "iconButton",
          logoImageUrl: "", 
        },
        variables: {
          colorPrimary: "#0d9488",
          colorBackground: "#020617",
          colorInputBackground: "rgba(30, 41, 59, 0.4)",
          colorInputText: "#f8fafc",
          colorText: "#f8fafc",
          colorTextSecondary: "#94a3b8",
          fontFamily: "var(--font-sans)",
        },
        elements: {
          card: "bg-surface/50 backdrop-blur-xl border border-white/10 shadow-2xl",
          headerTitle: "font-heading text-2xl font-semibold",
          socialButtonsBlockButton: "border-white/10 hover:bg-white/5",
          formButtonPrimary: "bg-teal-600 hover:bg-teal-500",
          footerActionLink: "text-teal-500 hover:text-teal-400",
        }
      }}
    >
      <html lang="en" className="h-full antialiased dark">
        <body className="min-h-full flex flex-col font-sans">{children}</body>
      </html>
    </ClerkProvider>
  );
}
