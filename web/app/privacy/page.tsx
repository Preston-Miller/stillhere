import type { Metadata } from "next";
import { LegalPage } from "../legal";
import { SUPPORT_EMAIL } from "@/lib/content";

export const metadata: Metadata = {
  title: "Privacy policy — stillhere",
  description: "What stillhere collects, why, and who it is shared with.",
};

export default function PrivacyPage() {
  const mail = <a href={`mailto:${SUPPORT_EMAIL}`}>{SUPPORT_EMAIL}</a>;
  return (
    <LegalPage title="Privacy policy">
      <p>
        stillhere is run by Preston Miller, an individual in Utah, USA, doing business as stillhere (&quot;we&quot;,
        &quot;us&quot;). We sell a desktop app that runs on your own computer. This policy covers
        this website, www.stillhereoffline.com, and the stillhere app. The short version: the app keeps what you do
        on your computer, and the website collects only what it needs to sell you the app and deliver it.
      </p>

      <h2>The app</h2>
      <p>
        Your chats, saved map pins, notes and settings are stored on your computer and are never sent to us. The app
        has no account, no tracking and no usage reporting. It goes online only to download things you ask for:
      </p>
      <ul>
        <li>The AI model, downloaded once at first launch from Ollama&apos;s servers, which see a normal download request (such as your IP address).</li>
        <li>Map files for the states you choose, downloaded from our file storage (Cloudflare R2), which sees the same kind of request.</li>
      </ul>
      <p>After setup it works with no internet at all.</p>

      <h2>What the website collects</h2>
      <ul>
        <li>
          <strong>Purchase details.</strong> When you buy, Stripe collects your email address, name, billing details
          and payment information. We never see or store your full card number. We receive your email, name, country
          and the purchase record so we can deliver the app, give refunds and answer questions.
        </li>
        <li>
          <strong>Download email.</strong> We send your download link to your email address through Resend, an email
          delivery service.
        </li>
        <li>
          <strong>Visit statistics.</strong> We use Vercel Web Analytics to count page views. It uses no cookies, does
          not follow you across other sites and does not identify you. We remove the address bar&apos;s query string
          before it is recorded, so purchase links are not logged.
        </li>
        <li>
          <strong>Emails you send us.</strong> If you write to {mail}, we keep the conversation to help you.
        </li>
        <li>
          <strong>Server logs.</strong> Our hosting provider, Vercel, keeps standard technical logs (such as IP address
          and browser type) for a short time for security and troubleshooting.
        </li>
        <li>
          <strong>Earlier waitlist.</strong> Before launch, some visitors gave us their email address to hear when
          stillhere was available. We keep those addresses only for that purpose.
        </li>
      </ul>

      <h2>Advertising</h2>
      <p>
        We advertise on Meta (Facebook and Instagram) and Google, and use their tools to measure whether an ad led to
        a visit or a purchase:
      </p>
      <ul>
        <li>
          <strong>Meta Pixel and Google Ads tag.</strong> On most pages of this site, these load code from Meta and
          Google that sets cookies and tells them which pages you viewed and, if you arrived from one of their ads,
          that the visit came from it. They do not run on your download page.
        </li>
        <li>
          <strong>Purchase reports.</strong> When you buy, we tell Meta and Google that a purchase happened, with its
          amount and an order number that can&apos;t be used to find your purchase. We also send Meta your email
          address and country in hashed (scrambled) form, along with your IP address and browser type, so it can match
          the purchase to an ad you saw. We never send your download link or payment details.
        </li>
      </ul>
      <p>
        Meta and Google handle this under their own privacy policies. You can limit it with your browser&apos;s
        privacy settings or an ad blocker, and through your ad settings at Meta and Google. Under some US state laws
        this may count as &quot;sharing&quot; for targeted advertising; to opt out, email us and we will stop
        reporting your purchase.
      </p>

      <h2>How we use it</h2>
      <p>
        To process your payment, send you your download, give refunds, answer support requests, prevent fraud, and
        understand roughly how many people visit the site. We do not sell your personal information, and we do not
        share it except with the service providers named above, which handle it for us, or when the law requires it.
      </p>

      <h2>How long we keep it</h2>
      <p>
        Purchase records are kept as long as tax and accounting rules require (usually up to seven years). Support
        emails and waitlist addresses are kept until you ask us to delete them.
      </p>

      <h2>Your choices</h2>
      <p>
        You can ask us what we hold about you, to correct it, or to delete it, by emailing {mail}. Depending on where
        you live (for example California, or the EU and UK) you may have further rights under local law, and we will
        honor them. We may need to keep some purchase records where the law requires it.
      </p>

      <h2>Children</h2>
      <p>stillhere is not directed at children under 13, and we do not knowingly collect their information.</p>

      <h2>Changes</h2>
      <p>
        If we change this policy, we will post the new version here and update the date at the top.
      </p>

      <h2>Contact</h2>
      <p>Questions about privacy: {mail}.</p>
    </LegalPage>
  );
}
