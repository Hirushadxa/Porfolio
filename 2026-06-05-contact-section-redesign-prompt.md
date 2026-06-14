# Antigravity Prompt — Contact Section Redesign

Paste the prompt below into Antigravity. It is written against the actual files
(`src/sections/Contact.tsx`, `src/components/Footer.tsx`, `src/data/socials.ts`)
and reuses the existing design tokens (`bg`, `surface`, `fg`, `fg-muted`,
`fg-subtle`, `line`, `accent`, `accent-hover`, `font-display`, `font-mono`).

---

## PROMPT

Refactor the Contact section so it reads as part of the page rather than a
floating card. Work in `src/sections/Contact.tsx`, `src/components/Footer.tsx`,
and `src/data/socials.ts`.

**1. Remove the card frame and gradient.**
In `Contact.tsx`, delete the outer wrapper `div` with
`rounded-3xl border border-line bg-surface shadow-2xl` and the two-column
flex layout. Remove the left column's gradient
(`bg-gradient-to-br from-rose-500 to-orange-500`) entirely. The whole section
should sit directly on the page background (`bg-bg`) with no border, no card,
no rounded container, and no shadow. Keep the existing `<SectionHeader>` with
the "(Get in touch)" label and the "Got a project, role, or conversation in
mind? Let's talk." headline at the top.

**2. New layout.**
Below the headline, lay out two columns on desktop (stack on mobile): a left
identity block and a right form. Both transparent — no card backgrounds.

Left identity block:
- Profile photo: change the `<img src>` from `/hero/K1-person.png` to
  `/IMG_8877.jpeg` (file already exists in `public/`). Keep it a circular
  avatar but drop the heavy `border-4 border-white/20`; use a subtle
  `border border-line` instead.
- Name: show the full name **Hirusha Dassanayaka** (currently just "Hirusha").
  Use `font-display`, `text-fg`.
- Keep "Software Engineer" subtitle in `font-mono text-fg-muted`.
- Email (`hirushadassanayaka1@gmail.com`) and Location (`Ingolstadt, Germany`)
  blocks: keep them, styled with `font-mono text-xs text-fg-muted` labels and
  `text-fg` values.
- Social icons: remove the IN / TW / IG / GH set. Keep ONLY LinkedIn, using the
  real LinkedIn logo. Import `Linkedin` from `lucide-react` and render it inside
  the link to `https://linkedin.com/in/hirusha-dassanayaka`
  (`target="_blank" rel="noopener noreferrer"`). Style the icon `text-fg-muted`
  with `hover:text-accent`.
- Keep the "Download CV" link to `/cv.pdf`, but restyle it for the no-gradient
  look: use `border border-line text-fg hover:bg-surface` instead of the
  `bg-black/20` treatment.

Right form block:
- Remove the `CONTACT ME` `<h2>` heading completely (the "Let's talk" headline
  above already serves this role).
- Fields in order: **Name** (text, required), **Email** (email, required),
  **Subject** (text, optional — placeholder "Subject (optional)"), **Message**
  (textarea, required). Reuse the existing input classes
  (`rounded-xl border border-line bg-bg ... focus:border-accent`).
- Remove the "Made with ♥ by Hirusha" span entirely.
- Keep the "Send" submit button with the existing `bg-accent` styling.

**3. Make the form actually send to my Gmail inbox (Formspree).**
Wire the form to Formspree so submissions arrive at
`hirushadassanayaka1@gmail.com`.
- Create a free form at https://formspree.io (verify my email), copy the form
  ID, and POST to `https://formspree.io/f/{FORM_ID}`.
- Implement it with controlled React state and `fetch`:
  - `name` the inputs `name`, `email`, `subject`, `message`.
  - On submit (`preventDefault`), `fetch` POST the form data as JSON with header
    `Accept: application/json`.
  - Track `status` state: idle → submitting → success / error. On success clear
    the fields and show an inline confirmation (e.g. "Thanks — I'll get back to
    you."); on error show a short failure message. Disable the Send button while
    submitting.
- Put the form ID in an env var `VITE_FORMSPREE_ID` (read via
  `import.meta.env.VITE_FORMSPREE_ID`) and add it to `.env`, so the ID isn't
  hardcoded. Leave a placeholder if the real ID isn't available yet.

**4. Footer — remove the social links row.**
In `Footer.tsx`, remove the right-hand block that maps over `socials`
(the Email / LinkedIn / CV links). Keep the left copyright line. If `socials`
is now unused, also remove the unused import; you can leave `src/data/socials.ts`
in place or delete it if nothing else references it.

Keep everything responsive (stack columns on mobile), preserve the `<Reveal>`
animations, and don't introduce new colors outside the existing design tokens.

---

## After Antigravity runs — your one manual step
Create the free Formspree form, then put its ID in `.env`:
```
VITE_FORMSPREE_ID=your_form_id_here
```
Formspree emails every submission to the address you sign up with, so use
`hirushadassanayaka1@gmail.com`. (Alternative if you'd rather not use Formspree:
EmailJS — say the word and I'll rewrite step 3 for it.)
