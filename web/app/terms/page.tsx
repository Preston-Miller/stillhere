import type { Metadata } from "next";
import { LegalPage } from "../legal";
import { PRICE_DISPLAY, REQUIREMENTS_SHORT, SUPPORT_EMAIL } from "@/lib/content";

export const metadata: Metadata = {
  title: "Terms of sale — stillhere",
  description: "The terms for buying and using stillhere, including the 30-day refund.",
};

export default function TermsPage() {
  const mail = <a href={`mailto:${SUPPORT_EMAIL}`}>{SUPPORT_EMAIL}</a>;
  return (
    <LegalPage title="Terms of sale">
      <p>
        These terms apply when you buy or use stillhere (&quot;the app&quot;) from www.stillhereoffline.com. The seller is
        Preston Miller, an individual in Utah, USA, doing business as stillhere (&quot;we&quot;, &quot;us&quot;). By
        buying or using it, you agree to them.
      </p>

      <h2>Not medical or emergency advice</h2>
      <p>
        <strong>
          stillhere is a reference tool. It is not a doctor, and it does not replace emergency services, medical care
          or professional advice.
        </strong>{" "}
        If you can call for help, do that first. The AI can be wrong, incomplete or out of date, and the guides it
        draws on are general public information that may not fit your situation. You are responsible for decisions
        you make using it. Maps come from OpenStreetMap and may be missing places or show them in the wrong spot.
      </p>

      <h2>What you are buying</h2>
      <p>
        A one-time purchase of {PRICE_DISPLAY} (plus any tax shown at checkout) gets you a personal license to install
        and use stillhere on computers you own or control, along with free updates while we offer them. There is no
        subscription. You may not resell, redistribute or rent the app. The guides, map data, AI model and other
        third-party parts included with it remain under their own licenses.
      </p>

      <h2>Requirements</h2>
      <p>
        stillhere needs {REQUIREMENTS_SHORT}. Please check the requirements on the home page before buying. Setup needs
        an internet connection to download the AI model and the maps you choose.
      </p>

      <h2>Payment and delivery</h2>
      <p>
        Payments are processed by Stripe. After payment you get a download page and an email with your download link.
        Keep that email: the link is your receipt and works for re-downloads.
      </p>

      <h2>30-day refunds</h2>
      <p>
        If stillhere isn&apos;t right for you, email {mail} within 30 days of buying and we will refund you in full, no
        questions asked. Refunds go back to your original payment method, and a refunded purchase&apos;s download link
        stops working.
      </p>

      <h2>No warranty</h2>
      <p>
        Apart from the refund above, the app is provided &quot;as is&quot;, without warranties of any kind, to the
        extent the law allows. We do not promise it will be error-free, always available, or suited to any particular
        emergency.
      </p>

      <h2>Limit of liability</h2>
      <p>
        To the extent the law allows, we are not liable for any indirect, incidental or consequential damages, or for
        any injury, loss or harm resulting from relying on the app&apos;s answers, guides or maps. Our total liability
        for any claim is limited to the amount you paid for stillhere. Some places do not allow these limits, so they
        may not apply to you.
      </p>

      <h2>Changes</h2>
      <p>
        We may update these terms. The version posted here, with the date at the top, is the one that applies.
      </p>

      <h2>Governing law</h2>
      <p>These terms are governed by the laws of the State of Utah, USA.</p>

      <h2>Contact</h2>
      <p>Questions: {mail}.</p>
    </LegalPage>
  );
}
