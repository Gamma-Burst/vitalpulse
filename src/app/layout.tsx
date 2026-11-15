import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL("https://followeight.com"),
  title: "FolloWeight · Coach Nutrition, Sport & Métabolisme IA sans pub",
  description:
    "FolloWeight (followeight.com) : photo de plat & frigo IA, scanner code-barres EAN, coach FW AI, vrai bilan IMC/BRI/TDEE, courbe lissée EMA, jeûne OMAD, objectifs personnalisés et 44 exercices 3D sans publicité.",
  alternates: {
    canonical: "https://followeight.com",
  },
  keywords: [
    "FolloWeight",
    "application nutrition sans pub",
    "scan assiette calories IA",
    "scanner code-barres OpenFoodFacts",
    "courbe poids EMA",
    "jeûne intermittent OMAD",
    "calcul TDEE IMC BRI",
    "coach sportif 3D",
  ],
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-snippet": -1,
      "max-image-preview": "large",
      "max-video-preview": -1,
    },
  },
  openGraph: {
    type: "website",
    locale: "fr_FR",
    url: "https://followeight.com",
    siteName: "FolloWeight",
    title: "FolloWeight · Coach Nutrition, Sport & Métabolisme IA",
    description:
      "Analysez vos repas en photo, scannez vos codes-barres, suivez votre poids lissé EMA, votre jeûne intermittent et vos objectifs personnels sans aucune publicité.",
    images: [
      {
        url: "/icons/icon-512.png",
        width: 512,
        height: 512,
        alt: "FolloWeight — Coach Nutrition, Sport & Métabolisme IA",
      },
    ],
  },
  twitter: {
    card: "summary",
    title: "FolloWeight · Coach Nutrition, Sport & Métabolisme IA",
    description:
      "Photo plat & frigo IA, code-barres EAN, poids lissé EMA, jeûne OMAD et objectifs avec félicitations — 100 % sans publicité.",
    images: ["/icons/icon-512.png"],
  },
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

const STRUCTURED_DATA_JSON = JSON.stringify({
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "Organization",
      "@id": "https://followeight.com/#organization",
      name: "Maison Mercier",
      url: "https://followeight.com",
      logo: "https://followeight.com/icons/icon-512.png",
    },
    {
      "@type": "WebApplication",
      "@id": "https://followeight.com/#app",
      name: "FolloWeight",
      url: "https://followeight.com",
      applicationCategory: "HealthApplication",
      operatingSystem: "Web, Android, iOS",
      inLanguage: "fr-FR",
      publisher: { "@id": "https://followeight.com/#organization" },
      description:
        "Application française de nutrition, métabolisme et sport sans publicité : analyse photo de plat et frigo IA, code-barres OpenFoodFacts, courbe de poids lissée EMA, jeûne intermittent, bilans sanguins et objectifs personnalisés.",
      offers: [
        {
          "@type": "Offer",
          name: "FolloWeight Essentiel (sans publicité)",
          price: "0",
          priceCurrency: "EUR",
        },
        {
          "@type": "Offer",
          name: "FolloWeight Plus (FW+) Annuel",
          price: "29.99",
          priceCurrency: "EUR",
        },
      ],
    },
    {
      "@type": "FAQPage",
      mainEntity: [
        {
          "@type": "Question",
          name: "FolloWeight affiche-t-il de la publicité ?",
          acceptedAnswer: {
            "@type": "Answer",
            text: "Non. FolloWeight est 100 % sans publicité tierce, y compris dans sa version gratuite Essentiel (0 €) qui inclut le suivi métabolique, le jeûne intermittent, la saisie manuelle EAN, les 44 exercices 3D et les objectifs personnalisés avec notifications.",
          },
        },
        {
          "@type": "Question",
          name: "Comment fonctionne l'analyse de repas et de code-barres sur FolloWeight ?",
          acceptedAnswer: {
            "@type": "Answer",
            text: "Vous pouvez saisir gratuitement la description d'un plat (ancrée ANSES Ciqual) ou un code EAN manuellement, ou utiliser l'appareil photo pour analyser une assiette, votre frigo (Pack Découverte de 5 scans offerts puis FolloWeight Plus) et détecter l'enseigne d'un code-barres.",
          },
        },
        {
          "@type": "Question",
          name: "Pourquoi utiliser une courbe de poids lissée EMA plutôt que la pesée brute ?",
          acceptedAnswer: {
            "@type": "Answer",
            text: "La moyenne mobile exponentielle (EMA) filtre les fluctuations quotidiennes d'eau liées au sodium ou au glycogène afin de révéler la vraie tendance métabolique sans découragement.",
          },
        },
        {
          "@type": "Question",
          name: "Peut-on définir ses propres objectifs et recevoir des encouragements ?",
          acceptedAnswer: {
            "@type": "Answer",
            text: "Oui. Le module Mes Objectifs permet de créer gratuitement des objectifs de pas, hydratation, protéines, poids cible, séances hebdomadaires ou habitudes libres et déclenche des notifications de félicitations dès qu'ils sont atteints.",
          },
        },
      ],
    },
  ],
});

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
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: STRUCTURED_DATA_JSON }}
        />
        {children}
      </body>
    </html>
  );
}
