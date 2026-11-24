import type { Metadata } from "next";
import { Barlow_Condensed, Geist, Geist_Mono, Outfit } from "next/font/google";
import { Suspense } from "react";
import { AdTags } from "./ad-tags";
import { SiteAnalytics } from "./analytics";
import { PRICE_DISPLAY } from "@/lib/content";
import "./globals.css";

const geistSans = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });
const geistMono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"] });
const display = Barlow_Condensed({
  variable: "--font-display",
  subsets: ["latin"],
  weight: ["600", "700"],
});
const brand = Outfit({ variable: "--font-brand", subsets: ["latin"], weight: ["300", "600"] });

export const metadata: Metadata = {
  metadataBase: new URL("https://www.stillhereoffline.com"),
  title: "stillhere: Ai Chat. Safety Guides. Maps. No internet.",
  description:
    `Ai chat, safety guides and maps that run on your computer, so they keep working with no internet. ${PRICE_DISPLAY} once, for Mac and Windows.`,
  openGraph: {
    type: "website",
    url: "/",
    siteName: "stillhere",
    title: "stillhere: Ai Chat. Safety Guides. Maps. No internet.",
    description:
      "Ai chat, safety guides and maps on your computer. Set it up once; it works with no internet after that.",
    images: [{
      url: "/social-preview-v9.png",
      width: 1200,
      height: 630,
      alt: "stillhere: Ai chat, safety guides and maps that work with no internet. Utility workers repairing power lines at night.",
    }],
  },
  twitter: {
    card: "summary_large_image",
    title: "stillhere: Ai Chat. Safety Guides. Maps. No internet.",
    description:
      "Ai chat, safety guides and maps on your computer. Set it up once; it works with no internet after that.",
    images: [{
      url: "/social-preview-v9.png",
      alt: "stillhere: Ai chat, safety guides and maps that work with no internet.",
    }],
  },
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} ${display.variable} ${brand.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col font-sans">
        {children}
        <SiteAnalytics />
        <Suspense fallback={null}>
          <AdTags />
        </Suspense>
      </body>
    </html>
  );
}
