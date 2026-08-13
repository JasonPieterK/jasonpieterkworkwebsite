import type { Metadata } from "next";
import { Bagel_Fat_One, Unbounded, DM_Sans, Caveat, JetBrains_Mono } from "next/font/google";
import "./mmm-tokens.css";
import "./globals.css";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import PullToRefresh from "@/components/PullToRefresh";

const bagel = Bagel_Fat_One({ weight: "400", subsets: ["latin"], variable: "--font-hero-family" });
const unbounded = Unbounded({
  weight: ["400", "500", "700", "800", "900"],
  subsets: ["latin"],
  variable: "--font-display-family",
});
const dmSans = DM_Sans({ weight: ["400", "500", "700"], subsets: ["latin"], variable: "--font-body-family" });
const caveat = Caveat({ weight: ["400", "600", "700"], subsets: ["latin"], variable: "--font-hand-family" });
const jetbrainsMono = JetBrains_Mono({
  weight: ["400", "500", "700"],
  subsets: ["latin"],
  variable: "--font-mono-family",
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
        <PullToRefresh />
        <Header />
        {children}
        <Footer />
      </body>
    </html>
  );
}
