import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "VitalPulse · Coach Nutrition, Métabolisme & Forme",
  description:
    "Photo de plat & frigo avec notes texte, vrai bilan IMC/BRI/TDEE, suivi des pas sans double comptage, exercices anti-démotivation, notifications Push et veille médicale PubMed/ANSES.",
  manifest: "/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "VitalPulse",
  },
  icons: {
    icon: "/icons/icon-192.png",
    apple: "/icons/icon-192.png",
  },
};

export const viewport: Viewport = {
  themeColor: "#0B1215",
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="fr" className="dark">
      <body className="min-h-screen bg-[#0B1215] text-slate-100 antialiased selection:bg-emerald-500/30">
        {children}
      </body>
    </html>
  );
}
