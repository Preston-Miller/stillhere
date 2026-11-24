import type { Metadata } from "next";
import { GooglePurchasePing } from "../ad-tags";

// Loaded only in a hidden frame on /download, to report a purchase to Google Ads with an address that
// holds an opaque order ID instead of the receipt. Shows nothing.
export const metadata: Metadata = { robots: { index: false, follow: false } };

export default function AdsPurchasePage() {
  return <GooglePurchasePing />;
}
