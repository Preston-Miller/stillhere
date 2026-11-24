// Product copy. Edit here, not in the page.

export const PRICE_DISPLAY = "$19.99"; // must match the Stripe Price (STRIPE_PRICE_ID)

// Shown in the footer, install help and download page. Also set it in Stripe → Settings → Public details.
export const SUPPORT_EMAIL = "stillhere.ai.help@gmail.com";

// Hero bullets under the "Offline AI" header. Each links to its section.
export const HERO_POINTS = [
  { text: "Access to emergency guides", href: "#guides" },
  { text: "Offline, searchable maps", href: "#maps" },
];

// "What your computer needs" on the homepage. Keep in sync with the FAQ, /install and the Checkout text.
export const COMPATIBILITY: { name: string; items: string[] }[] = [
  {
    name: "Mac",
    items: ["Apple Silicon (M1 or newer)", "macOS 14 Sonoma or later", "8 GB memory (16 GB recommended)", "About 15 GB free space"],
  },
  {
    name: "Windows",
    items: [
      "Windows 10 or 11, 64-bit",
      "8 GB memory (16 GB recommended)",
      "NVIDIA graphics card recommended (without one, answers take a few minutes)",
      "About 15 GB free space",
    ],
  },
];
// One-line version for the Checkout page and FAQ.
export const REQUIREMENTS_SHORT =
  "a Mac with Apple Silicon (M1 or newer) and macOS 14 or later, or a 64-bit Windows 10 or 11 PC; at least 8 GB of memory (16 GB recommended)";

// Questions the library answers. Since 2026-11-17 the library is only the CDC, FEMA, FDA, NWS, USFA and NPS
// sources in ../reference-sources/library-keep.json; check a question against those before adding it here.
export const READY_QUESTIONS = [
  "What goes in an emergency supply kit?",
  "How do I make water safe to drink in an emergency?",
  "Can I drink rainwater I collected?",
  "Where is it safe to run a generator?",
  "How do I spot and treat heat illness?",
  "How should I clean a cut if I can't see a doctor?",
  "Can I still use medicine that got wet in a flood?",
  "How do I charge and store lithium batteries safely?",
  "What do I do in a radiation emergency?",
  "What should I do during a tornado?",
  "How do I recognize a stroke?",
  "Is my fridge food safe after the power goes out?",
  "How do I heat my home safely?",
  "What if I'm caught in a winter storm?",
  "What should I always carry on a hike?",
];

// Topic cards: grouped from READY_QUESTIONS (same sources). Keep the two in sync.
export const TOPIC_CARDS: { title: string; blurb: string; examples: string[] }[] = [
  {
    title: "Safe drinking water",
    blurb: "When the tap is in doubt.",
    examples: ["How do I make water safe to drink in an emergency?", "Can I drink rainwater I collected?"],
  },
  {
    title: "Power outages",
    blurb: "Running a generator, keeping food safe.",
    examples: ["Where is it safe to run a generator?", "Is my fridge food safe after the power goes out?"],
  },
  {
    title: "Health and first steps",
    blurb: "Basic care when a doctor is out of reach.",
    examples: ["How do I spot and treat heat illness?", "How should I clean a cut?"],
  },
  {
    title: "Storms and disasters",
    blurb: "What to do when it hits.",
    examples: ["What should I do during a tornado?", "What do I do in a radiation emergency?"],
  },
  {
    title: "Batteries and heating",
    blurb: "Charging, storing and staying warm safely.",
    examples: ["How do I store lithium batteries safely?", "How do I heat my home safely?"],
  },
  {
    title: "Outdoors",
    blurb: "Trips that go further than planned.",
    examples: ["What should I always carry on a hike?", "What if I'm caught in a winter storm?"],
  },
];

// Topics still being cleared before launch. Empty: the section on the page is hidden.
export const REVIEW_TOPICS: string[] = [];

export const INCLUDED = [
  "The stillhere app for Mac or Windows",
  "An Ai model, downloaded once when you first open it (3 to 7 GB, sized to your computer)",
  "The saved library of emergency and survival guides",
  "Offline street maps for any U.S. states you choose, at no extra cost",
  "Help by email",
  "No subscription and no account",
];

export const FAQ: [string, string][] = [
  [
    "Does it really work with no internet?",
    "Yes, once it's set up. The AI, the guides and your maps are all saved on your computer, so it works with no Wi-Fi or cell signal. It still needs power: it runs as long as your laptop has battery or you have backup power.",
  ],
  [
    "Will it run on my computer?",
    "On a Mac: Apple Silicon (M1 or newer), macOS 14 Sonoma or later, and at least 8 GB of memory. On Windows: a 64-bit Windows 10 or 11 PC with at least 8 GB of memory. With 8 GB it uses a smaller AI; 16 GB or more runs the larger one, which gives better answers. A Windows PC with an NVIDIA graphics card answers in seconds; without one, answers take a few minutes. Linux isn't supported yet. Plan on about 15 GB of free space: the app and its AI take 4 to 8 GB, and offline maps add more depending on which states you pick (about 0.3 GB for a state like Utah, more for big states).",
  ],
  [
    "How long does setup take?",
    "The first time you open it, it downloads its AI, 3 to 7 GB depending on your computer. That's roughly 5 to 15 minutes on a fast home connection and about an hour on a slow one, plus any map states you add. Do it while you have internet. After that it works with no connection.",
  ],
  [
    "Where do the answers come from?",
    "It searches a library of public emergency and survival guides saved on your computer, such as CDC, FDA and U.S. Army material, and shows which guide each part of the answer came from. Anything it adds from its own training is marked separately, so you can tell the difference.",
  ],
  [
    "Can it be wrong?",
    "Yes. It can misread a guide, miss something, or fill a gap with its own knowledge. That's why it shows its sources: check them, especially for anything medical. If a topic isn't in its library, it should say so.",
  ],
  [
    "What about updates and refunds?",
    "Updates to stillhere are free: download the newest version from your purchase page any time. If it isn't right for you, email us within 30 days of buying and we'll refund you in full, no questions asked. Please still check the requirements above first.",
  ],
  [
    "Can it replace a doctor?",
    "No. It's for when help is far away or can't be reached. If you can call for help, do that first.",
  ],
];
