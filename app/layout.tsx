import type { Metadata } from "next";
import { Suspense } from "react";
import { Bagel_Fat_One, Unbounded, DM_Sans, Caveat, JetBrains_Mono } from "next/font/google";
import "./mmm-tokens.css";
import "./globals.css";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import PullToRefresh from "@/components/PullToRefresh";
import TopProgress from "@/components/TopProgress";

const bagel = Bagel_Fat_One({ weight: "400", subsets: ["latin"], variable: "--font-hero-family" });
const unbounded = Unbounded({
  weight: ["400", "500", "700", "800"],
  subsets: ["latin"],
  variable: "--font-display-family",
  display: "swap",
});
const dmSans = DM_Sans({
  weight: ["400", "500", "700"],
  subsets: ["latin"],
  variable: "--font-body-family",
  display: "swap",
});
const caveat = Caveat({
  weight: ["400", "700"],
  subsets: ["latin"],
  variable: "--font-hand-family",
  display: "swap",
});
const jetbrainsMono = JetBrains_Mono({
  weight: ["400", "500"],
  subsets: ["latin"],
  variable: "--font-mono-family",
  display: "swap",
});

const SITE_URL = "https://jasonpieterkwork.vercel.app";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: "jasonpieterkwork — Grade 9.1 course materials",
    template: "%s · jasonpieterkwork",
  },
  description:
    "Grade 9.1 class materials by subject and semester — notes, worksheets, and assignments, synced live from GitHub.",
  openGraph: {
    title: "jasonpieterkwork — Grade 9.1 course materials",
    description: "Grade 9.1 class materials by subject and semester, synced live from GitHub.",
    url: SITE_URL,
    siteName: "jasonpieterkwork",
    type: "website",
  },
  robots: { index: true, follow: true },
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${bagel.variable} ${unbounded.variable} ${dmSans.variable} ${caveat.variable} ${jetbrainsMono.variable}`}
    >
      <body>
        <Suspense fallback={null}>
          <TopProgress />
        </Suspense>
        <PullToRefresh />
        <Header />
        {children}
        <Footer />
      </body>
    </html>
  );
}
