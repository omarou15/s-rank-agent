import type { Metadata } from "next";
import { ClerkProvider } from "@clerk/nextjs";
import { dark } from "@clerk/themes";
import { AuthSync } from "@/components/shared/auth-sync";
import "./globals.css";

export const metadata: Metadata = {
  title: "S-Rank Agent — AI-Powered Cloud PC",
  description: "Your AI-powered cloud PC. Ask, it executes.",
  icons: { icon: "/favicon.ico" },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <ClerkProvider appearance={{ baseTheme: dark }}>
      <html lang="en" className="dark">
        <body className="min-h-screen bg-srank-bg text-srank-text-primary antialiased">
          <AuthSync>{children}</AuthSync>
        </body>
      </html>
    </ClerkProvider>
  );
}
