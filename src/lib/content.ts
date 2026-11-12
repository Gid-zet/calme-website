// Site copy and data. Swap these for CMS / database content once the backend is in place.

export const site = {
  name: "CalMe",
  tagline: "A healthy mind in a healthy body",
  description:
    "CalMe provides accessible mental health resources, professional support, and community programs to help you navigate life's challenges and thrive.",
  // TODO: replace placeholder contact details with the organization's real ones
  contact: {
    address: "123 Mental Health Ave, Wellness City, WC 10101",
    phone: "(123) 456-7890",
    email: "info@cal-me.org",
    hours: [
      ["Monday – Friday", "9:00 AM – 6:00 PM"],
      ["Saturday", "10:00 AM – 2:00 PM"],
      ["Sunday", "Closed"],
    ],
  },
  socials: {
    instagram: "#",
    x: "#",
    linkedin: "#",
    tiktok: "#",
  },
};

export const nav = [
  { href: "/about", label: "About" },
  { href: "/programs", label: "Programs" },
  { href: "/events", label: "Events" },
  { href: "/resources", label: "Resources" },
  { href: "/contact", label: "Contact" },
];

export const affirmations = [
  "It's okay to not be okay",
  "Rest is productive",
  "Good things are coming",
  "Talk it out",
  "You're one in a million",
  "Breathe in, breathe out",
  "Healing isn't linear",
];

export const services = [
  {
    icon: "heart",
    title: "Professional Support",
    body: "Our team of qualified mental health professionals provides compassionate care tailored to your needs.",
    bg: "var(--sun)",
  },
  {
    icon: "book",
    title: "Educational Resources",
    body: "Access evidence-based information and guides to help you understand and manage mental health challenges.",
    bg: "var(--mint)",
  },
  {
    icon: "people",
    title: "Community Programs",
    body: "Join our workshops, support groups, and community events designed to foster connection and growth.",
    bg: "var(--coral-soft)",
  },
  {
    icon: "calendar",
    title: "Flexible Scheduling",
    body: "Book appointments that fit your schedule with our convenient online booking system.",
    bg: "var(--lilac)",
  },
] as const;

export const values = [
  { emoji: "🌱", label: "Compassion", bg: "var(--mint-soft)" },
  { emoji: "☀️", label: "Accessibility", bg: "var(--sun-soft)" },
  { emoji: "💬", label: "Community", bg: "var(--coral-soft)" },
  { emoji: "🧠", label: "Evidence-based", bg: "var(--blue-soft)" },
];

// Example programs: edit or replace with the real calendar
export const programs = [
  {
    slug: "sip-and-paint",
    art: "palette",
    tag: "Creative wellness",
    tagBg: "var(--sun)",
    artBg: "var(--sun-soft)",
    title: "Sip & Paint Sessions",
    body: "Relaxed, guided painting nights where art becomes a gentle doorway to talking about how we feel.",
    status: "past" as const,
  },
  {
    slug: "support-circles",
    art: "chat",
    tag: "Peer support",
    tagBg: "var(--mint)",
    artBg: "var(--mint-soft)",
    title: "Support Circles",
    body: "Safe, facilitated group conversations where you can share, listen and realise you're not the only one.",
    status: "upcoming" as const,
  },
  {
    slug: "workshops",
    art: "screen",
    tag: "Education",
    tagBg: "var(--blue-soft)",
    artBg: "var(--blue-soft)",
    title: "Mental Health Workshops",
    body: "Practical sessions on stress, anxiety, burnout and building resilience for schools, workplaces and communities.",
    status: "upcoming" as const,
  },
];

export const topics = [
  { emoji: "🌀", bg: "var(--sun)", title: "Anxiety & Stress", body: "Understand what's happening in your body and find tools to slow things down." },
  { emoji: "🌧️", bg: "var(--lilac)", title: "Depression & Low Mood", body: "Signs to look out for, and gentle steps toward feeling like yourself again." },
  { emoji: "🔋", bg: "var(--mint)", title: "Burnout & Self-care", body: "Recharge habits for students, professionals and caregivers." },
  { emoji: "💞", bg: "var(--coral)", title: "Relationships", body: "Communicate better, set boundaries and support the people you love." },
  { emoji: "🫧", bg: "var(--blue-soft)", title: "Mindfulness", body: "Breathing exercises and grounding techniques you can do anywhere." },
  { emoji: "😴", bg: "#fff", title: "Sleep & Rest", body: "Because a healthy mind needs a well-rested body." },
];

// TODO: these are the US numbers from the previous site, so replace them with local crisis lines
export const crisisLines = [
  { label: "Crisis hotline", value: "1-800-273-TALK (8255)" },
  { label: "Text line", value: "Text HOME to 741741" },
  { label: "Emergency", value: "Call 911 or go to your nearest emergency room" },
];

export const talkShow = {
  venue: "Academic City University, Ghana",
  photos: [
    { src: "/images/acity-guest-speaker.jpg", alt: "Guest speaker addressing students at CalMe's mental health talk show, Academic City University", cap: "our guest speaker 🎤", pos: "center 30%" },
    { src: "/images/acity-calme-host.jpg", alt: "A CalMe team member hosting the talk show at Academic City University", cap: "the CalMe team ♡", pos: "center 30%" },
  ],
};

export const sipAndPaint = {
  photos: [
    { src: "/images/group-five.jpg", w: 1400, h: 933, alt: "Five participants holding their paintings in front of a beach mural", cap: "the whole crew 🎨", pos: "center 40%" },
    { src: "/images/panda-balloons.jpg", w: 934, h: 1400, alt: "Participant in a red headband holding a panda with heart balloons painting", cap: "panda with love ♡", pos: "center 25%" },
    { src: "/images/good-things.jpg", w: 934, h: 1400, alt: "Participant holding a 'Good things are coming' evil eye painting", cap: "good things ✦", pos: "center 30%" },
    { src: "/images/duo.jpg", w: 934, h: 1400, alt: "Two participants with a hands painting and a panda painting", cap: "peace ✌︎", pos: "center 30%" },
    { src: "/images/group-trio.jpg", w: 1000, h: 1400, alt: "Three participants with evil-eye, landscape and minion paintings", cap: "proud artists", pos: "center 22%" },
  ],
  quotes: [
    { q: "“Good things are coming”", body: "A reminder painted in blue: hope is a practice, and every small step counts.", bg: "var(--blue-soft)" },
    { q: "“You're one in a minion”", body: "Humour heals. Laughing together is a powerful way to lighten the load.", bg: "var(--sun)" },
    { q: "Hands reaching up 🙌", body: "Reaching out is a strength, not a weakness. Nobody has to go it alone.", bg: "var(--coral-soft)" },
  ],
};

export const moods = [
  { key: "great", face: "😄", label: "Great", title: "Love that for you! 🌞", body: "Bottle this feeling: what's going well today? Share the good vibes at our next event.", link: { href: "/events", label: "See events" } },
  { key: "okay", face: "🙂", label: "Okay", title: "Steady is good 🌿", body: "A little self-care keeps okay days okay. Browse our toolkit for small daily habits.", link: { href: "/resources", label: "Open the toolkit" } },
  { key: "meh", face: "😐", label: "Meh", title: "Meh days are valid 🫧", body: "Try a minute of box breathing. It's a small reset that can shift your whole afternoon.", link: { href: "/#breathe", label: "Breathe with us" } },
  { key: "low", face: "😔", label: "Low", title: "We're glad you checked in 💙", body: "You don't have to carry this alone. Talking to someone can help.", link: { href: "/book", label: "Book a session" } },
  { key: "heavy", face: "😣", label: "Heavy", title: "Thank you for being honest 🤍", body: "If things feel overwhelming, please reach out now. Our crisis contacts are listed on the resources page.", link: { href: "/resources#crisis", label: "Get help now" } },
] as const;

export const concerns = [
  "Anxiety & stress",
  "Low mood",
  "Relationships",
  "Grief & loss",
  "Burnout",
  "Sleep",
  "Self-esteem",
  "Something else",
];
