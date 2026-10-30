# CalMe: A healthy mind in a healthy body

The website for CalMe, a mental health organization. Built with **Next.js 16 (App Router)**, **React 19**, **TypeScript** and **Tailwind CSS v4**.

## Getting started

```bash
npm install
npm run dev
```

Then open http://localhost:3000.

## Project structure

```
src/
  app/
    (site)/             public marketing pages, sharing the navbar + footer layout
      page.tsx          home
      about/ programs/ events/ resources/ contact/ book/
      privacy-policy/ terms-of-service/
    (auth)/             split-screen auth layout
      sign-in/ sign-up/
    globals.css         design tokens (colours, shadows, fonts) + shared component classes
    layout.tsx          root layout + fonts (Fraunces, Plus Jakarta Sans, Caveat)
  components/
    site/               Navbar, Footer, Logo
    sections/           page sections (Hero, MoodCheckin, Breathe, SipAndPaint, BookingFlow, AuthForm…)
    ui/                 small building blocks (Icon, Eyebrow, Reveal, PageHero)
  lib/content.ts        all site copy and data in one place
public/images/          logo + Sip & Paint event photos
```

## Design system

The palette is defined once in `globals.css` and exposed to Tailwind, so `bg-sun`, `text-ink`, `bg-mint-soft`, `font-display` and `font-hand` all work.
Shared classes include `.btn`, `.btn-primary`, `.btn-sun`, `.btn-white`, `.card-pop`, `.eyebrow`, `.field`, `.lede` and `.serif-em`.

## Status

This is the UI only. Still to do:

- [ ] Authentication + role-based dashboards (user, psychologist, admin)
- [ ] Wire the booking, contact, partner, volunteer and newsletter forms to the backend
- [ ] Replace the placeholder contact details and US crisis numbers in `src/lib/content.ts`
- [ ] Add privacy policy and terms text
