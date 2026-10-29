/**
 * ─────────────────────────────────────────────────────────────────────
 *  XDEV PUBLIC SITE COPY — "Studio Index"
 *  Every word on the public site lives here. Edit freely — the layout
 *  adapts. Items marked [sample] are placeholders to replace with the
 *  club's real history.
 * ─────────────────────────────────────────────────────────────────────
 */

export const site = {
  name: "XDEV",
  fullName: "XDEV Club",
  tagline: "Build what's next.",
  description:
    "A student-run software collective. Workshops, competitions, and shipped projects — in public, every week.",
};

export const hero = {
  eyebrow: "Student developer collective",
  titleLines: [
    { text: "Build", outline: false },
    { text: "What's", outline: true },
    { text: "Next", outline: false },
  ],
  subtitle:
    "XDEV is a student-run software collective. We teach what we ship, compete with what we build, and do all of it in public.",
  primaryCta: { label: "View the calendar", href: "/events" },
  secondaryCta: { label: "Read the story", href: "/story" },
};

export const marqueeWords = [
  "Workshops",
  "Hackathons",
  "Build nights",
  "Competitions",
  "Community",
  "Shipped work",
];

export const manifesto = {
  label: "The manifesto",
  lines: [
    "You don't need to know",
    "everything.",
    "You just need to be",
    "curious enough to learn.",
  ],
};

export const pillars = {
  label: "The practice",
  title: "Three disciplines. One output.",
  items: [
    {
      index: "01",
      name: "Build",
      body: "Weekly build nights where side projects become real software. Code review, pair programming, demo days — finishing is the culture.",
    },
    {
      index: "02",
      name: "Learn",
      body: "Peer-taught workshops on web, AI, systems, and design. Taught by members who shipped it last month, not by slides from 2015.",
    },
    {
      index: "03",
      name: "Compete",
      body: "Hackathons and contests that put the work on stage. Deadlines, judges, prizes — pressure is a feature.",
    },
  ],
};

/* Showcase reel — the cipher-style card tunnel that opens the homepage.
   Media itself is auto-detected from src/assets/showcase (see showcase.js). */
export const showcase = {
  eyebrow: "Inside XDEV",
  tagline: "Build what's next.",
};

/* Optional display-name overrides, keyed by filename without extension.
   e.g. { "02-spring-event": "Spring Build Week" } */
export const showcaseTitles = {};

export const story = {
  label: "The story",
  title: "Every club is a repo. Ours has great commits.",
  lede: "XDEV started the way good software does — a few people scratching an itch, committing early and often. This is the git log. Swap these entries for the club's real milestones whenever ready.",

  milestones: [
    {
      hash: "a3f9c21",
      date: "The beginning [sample]",
      title: "init: first commit",
      body: "A handful of students, one classroom, and a shared frustration — plenty of theory, nowhere to build. XDEV was founded to be that place.",
    },
    {
      hash: "7d2e04b",
      date: "First semester [sample]",
      title: "feat(workshops): weekly sessions",
      body: "The first peer-taught workshop filled the room past capacity. The format stuck: bring a laptop, leave with something that runs.",
    },
    {
      hash: "c81aa6e",
      date: "Year one [sample]",
      title: "feat(events): open the doors",
      body: "Our first campus-wide event — registrations, check-ins, prizes, the whole production. It sold out and set the bar for everything after.",
    },
    {
      hash: "e5b3d90",
      date: "Today [sample]",
      title: "release: a community that ships",
      body: "An active roster, a calendar of competitions and workshops, and alumni across internships and startups. We're just getting merged in.",
    },
  ],

  values: {
    label: "Operating principles",
    title: "How we work",
    items: [
      {
        name: "Ship over talk",
        body: "A deployed rough version beats a perfect plan. We optimise for things that exist.",
      },
      {
        name: "Teach to learn",
        body: "If you can't explain it to a first-year, you don't know it yet. Everyone teaches eventually.",
      },
      {
        name: "Open doors",
        body: "No gatekeeping, no genius myth. Curiosity is the only entry requirement.",
      },
    ],
  },

  join: {
    label: "Join us",
    title: "Make your first commit.",
    steps: [
      {
        title: "Show up",
        body: "Attend any public event or workshop. No experience required — a laptop and curiosity will do.",
      },
      {
        title: "Build something small",
        body: "Finish a tiny project at a build session. Small finished things compound.",
      },
      {
        title: "Get onboarded",
        body: "Active builders are invited onto the roster — an ID card and commit rights to our events follow.",
      },
    ],
    note: "The fastest way in is the next event on the calendar.",
    cta: { label: "See upcoming events", href: "/events" },
  },
};

export const footerNote = `© ${new Date().getFullYear()} XDEV Club. Written by hand, shipped with care.`;
