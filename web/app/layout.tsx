import type { Metadata } from "next";
import { Barlow_Condensed, Geist, Geist_Mono, Outfit } from "next/font/google";
import { SiteAnalytics } from "./analytics";
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
  title: "stillhere: AI. Maps. Even offline.",
  description:
    "AI, emergency guides and offline maps that run on your computer, so they keep working without internet.",
  openGraph: {
    type: "website",
    url: "/",
    siteName: "stillhere",
    title: "stillhere — AI. Maps. Even offline.",
    description:
      "An AI assistant on your computer, with built-in emergency guides and searchable offline maps. No internet required after setup.",
    images: [{
      url: "/social-preview-v7.png",
      width: 1200,
      height: 630,
      alt: "stillhere: AI. Maps. Even offline. Emergency guides and offline maps on your computer, with utility workers repairing power lines at night.",
    }],
  },
  twitter: {
    card: "summary_large_image",
    title: "stillhere — AI. Maps. Even offline.",
    description:
      "An AI assistant on your computer, with built-in emergency guides and searchable offline maps. No internet required after setup.",
    images: [{
      url: "/social-preview-v7.png",
      alt: "stillhere: AI. Maps. Even offline. Emergency guides and offline maps on your computer.",
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
      </body>
    </html>
  );
}
