import type { Metadata, Viewport } from "next";
import { ClerkProvider } from "@clerk/nextjs";
import { dark } from "@clerk/themes";
import "./globals.css";

export const metadata: Metadata = {
  title: "S-Rank Agent — Ton PC cloud piloté par l'IA",
  description: "Demande, il exécute. Code, fichiers, déploiements, APIs — Claude pilote ton serveur cloud. Zéro config, toute la puissance.",
  manifest: "/manifest.json",
  metadataBase: new URL("https://web-phi-three-57.vercel.app"),
  openGraph: {
    title: "S-Rank Agent — Ton PC cloud piloté par l'IA",
    description: "Demande, il exécute. Code, fichiers, déploiements, APIs — Claude pilote ton serveur cloud.",
    siteName: "S-Rank Agent",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "S-Rank Agent — Ton PC cloud piloté par l'IA",
    description: "Demande, il exécute. Code, fichiers, déploiements, APIs — Claude pilote ton serveur cloud.",
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "S-Rank Agent",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: "#09090b",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <ClerkProvider appearance={{ baseTheme: dark }}>
      <html lang="fr" className="dark">
        <head>
          <link rel="apple-touch-icon" href="/icon-192.png" />
        </head>
        <body className="min-h-[100dvh] bg-zinc-950 text-white antialiased overflow-hidden">
          {children}
        </body>
      </html>
    </ClerkProvider>
  );
}
