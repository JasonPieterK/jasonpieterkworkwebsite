import type { Metadata } from "next";
import { Bagel_Fat_One, Unbounded, DM_Sans, Caveat, JetBrains_Mono } from "next/font/google";
import "./mmm-tokens.css";
import "./globals.css";
import Header from "@/components/Header";
import Footer from "@/components/Footer";

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

export const metadata: Metadata = {
  title: "jasonpieterkwork",
  description: "Grade 9.1 course materials, always up to date.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${bagel.variable} ${unbounded.variable} ${dmSans.variable} ${caveat.variable} ${jetbrainsMono.variable}`}
    >
      <body>
        <Header />
        {children}
        <Footer />
      </body>
    </html>
  );
}
