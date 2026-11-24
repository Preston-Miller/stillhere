"use client";

import { usePathname } from "next/navigation";
import { useEffect } from "react";

/*
 * Ad platform tags (Meta Pixel, Google Ads). Each is off until its ID is set in the environment.
 *
 * They never load on /download: its address holds the Checkout Session ID, which is the buyer's
 * receipt and download entitlement, and both tags report the page address. Purchases are reported
 * without it: Meta from the server (lib/ads.ts), Google from the small /ads-purchase page, which
 * /download loads in a hidden frame with only an opaque order ID in its address.
 */

const META_PIXEL_ID = process.env.NEXT_PUBLIC_META_PIXEL_ID;
const GOOGLE_ADS_ID = process.env.NEXT_PUBLIC_GOOGLE_ADS_ID; // "AW-123456789"
const GOOGLE_ADS_PURCHASE_LABEL = process.env.NEXT_PUBLIC_GOOGLE_ADS_PURCHASE_LABEL;

const NO_TAGS = ["/download", "/ads-purchase"];

type Queue = ((...args: unknown[]) => void) & { queue?: unknown[]; callMethod?: (...a: unknown[]) => void };
declare global {
  interface Window {
    fbq?: Queue & { push?: Queue; loaded?: boolean; version?: string; disablePushState?: boolean };
    _fbq?: Window["fbq"];
    dataLayer?: unknown[];
    gtag?: (...args: unknown[]) => void;
  }
}

function addScript(src: string) {
  const s = document.createElement("script");
  s.async = true;
  s.src = src;
  document.head.appendChild(s);
}

/** Meta's standard loader, written out: queues calls until fbevents.js arrives. */
function loadMeta(id: string) {
  if (window.fbq) return;
  const fbq: NonNullable<Window["fbq"]> = function (...args: unknown[]) {
    if (fbq.callMethod) fbq.callMethod(...args);
    else fbq.queue!.push(args);
  };
  fbq.push = fbq;
  fbq.loaded = true;
  fbq.version = "2.0";
  fbq.queue = [];
  // Page views are sent here, per route, instead of by the pixel watching the address bar.
  fbq.disablePushState = true;
  window.fbq = window._fbq = fbq;
  addScript("https://connect.facebook.net/en_US/fbevents.js");
  fbq("init", id);
}

function loadGtag(id: string) {
  if (window.gtag) return;
  window.dataLayer = window.dataLayer ?? [];
  window.gtag = function () {
    // gtag expects the arguments object itself, not an array
    // eslint-disable-next-line prefer-rest-params
    window.dataLayer!.push(arguments);
  };
  addScript(`https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(id)}`);
  window.gtag("js", new Date());
  window.gtag("config", id);
}

/** Site-wide tags: page views, plus a checkout-started signal on /checkout. */
export function AdTags() {
  const path = usePathname();
  useEffect(() => {
    if (NO_TAGS.some((p) => path === p || path.startsWith(`${p}/`))) return;
    if (META_PIXEL_ID) {
      loadMeta(META_PIXEL_ID);
      window.fbq!("track", "PageView");
      if (path === "/checkout") window.fbq!("track", "InitiateCheckout");
    }
    if (GOOGLE_ADS_ID) loadGtag(GOOGLE_ADS_ID);
  }, [path]);
  return null;
}

/** Runs inside the hidden /ads-purchase frame: reports one purchase to Google Ads. */
export function GooglePurchasePing() {
  useEffect(() => {
    if (!GOOGLE_ADS_ID || !GOOGLE_ADS_PURCHASE_LABEL) return;
    const q = new URLSearchParams(window.location.search);
    const order = q.get("o");
    const value = Number(q.get("v"));
    const currency = q.get("c") ?? "USD";
    if (!order || !(value > 0)) return;
    // A second guard against counting the same order twice in this browser (Google also de-duplicates
    // on transaction_id).
    const key = `ads-purchase:${order}`;
    try {
      if (localStorage.getItem(key)) return;
      localStorage.setItem(key, "1");
    } catch {}
    loadGtag(GOOGLE_ADS_ID);
    window.gtag!("event", "conversion", {
      send_to: `${GOOGLE_ADS_ID}/${GOOGLE_ADS_PURCHASE_LABEL}`,
      value,
      currency,
      transaction_id: order,
    });
  }, []);
  return null;
}

export const GOOGLE_PURCHASE_ON = Boolean(GOOGLE_ADS_ID && GOOGLE_ADS_PURCHASE_LABEL);
