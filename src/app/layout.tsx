import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "FolloWeight · Coach Nutrition, Sport & Métabolisme IA",
  description:
    "FolloWeight (followeight.com) : photo de plat & frigo IA, coach FW AI, vrai bilan IMC/BRI/TDEE, jeûne OMAD, suivi multi-sports & prise de masse propre, bilans sanguins et montres connectées.",
  manifest: "/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "FolloWeight",
  },
  icons: {
    icon: "/icons/icon-192.png",
    apple: "/icons/icon-192.png",
  },
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: dark)", color: "#070C0B" },
    { media: "(prefers-color-scheme: light)", color: "#F7F4EE" },
  ],
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
  viewportFit: "cover",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="fr"
      data-theme="dark"
      suppressHydrationWarning
      className="dark"
    >
      <body className="min-h-screen font-sans antialiased selection:bg-emerald-500/30">
        {children}
      </body>
    </html>
  );
}
