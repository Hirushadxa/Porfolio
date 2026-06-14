# Spec — Trim FloatingLogos to Tech Stack + Add Education Section + Logos in Experience

**Date:** 2026-05-25
**Target files:**
- `src/components/FloatingLogos.tsx` (edit — trim to 6 tech entries, update filenames)
- `src/data/education.ts` (new — education entries with logo refs)
- `src/sections/Education.tsx` (new — section component)
- `src/components/EducationItem.tsx` (new — reusable item, mirrors ExperienceItem with a logo slot)
- `src/data/experience.ts` (edit — add optional `logo` field, populate for Singer)
- `src/components/ExperienceItem.tsx` (edit — render logo if present)
- `src/App.tsx` (edit — add Education between CinematicIntro and Experience)

**Scope:** Architectural restructure of how logos appear on the site. Tech stack logos stay in `FloatingLogos` as monochrome scatter pattern (decorative). Institution logos move to context: schools render in a new Education section, employers render alongside Experience entries. Renders each institution logo with brand colors on a clean white pill background so any source format (SVG / PNG / future JPG-traces) reads cleanly.

**Builds on context the user has already set up:** The user has 10 logo files in `public/logos/` with these exact filenames (case-sensitive, including spaces and parentheses):

| File | Type | Purpose |
| --- | --- | --- |
| `React-icon.svg` | SVG | Tech stack |
| `Typescript_logo_2020.svg` | SVG | Tech stack |
| `Vitejs-logo.svg` | SVG | Tech stack |
| `Firebase_Logo_(No_wordmark)_(2024-).svg` | SVG | Tech stack |
| `New_Power_BI_Logo.svg` | SVG | Tech stack |
| `Google_Gemini_icon_2025.svg` | SVG | Tech stack |
| `OTH_AW_Logo.jpg` (→ user will trace to `OTH_AW_Logo.svg`) | SVG (after) | Institution — Education |
| `Logo_Thomas_More.png` | PNG | Institution — Education |
| `Singer_Sri_Lanka_logo.jpg` (→ user will trace to `Singer_Sri_Lanka_logo.svg`) | SVG (after) | Institution — Experience |
| `Wenglor_sensoric_logo.jpg` (→ user will trace to `Wenglor_sensoric_logo.svg`) | SVG (after) | TBD — see Open Question at bottom |

The component references in this spec assume the post-trace filenames (`.svg` for the three JPGs). If the user keeps a logo as PNG/JPG, the same `<img src=…>` reference works — just match the actual filename.

---

## CHANGE 1 — Trim FloatingLogos to 6 tech stack entries (with new filenames)

`src/components/FloatingLogos.tsx` currently has a `LOGOS` array of 10 entries. Replace the array so it has only the 6 tech entries with the user's actual filenames, and rebalance the `x`/`y` scatter coordinates so the 6 logos fill the left column gracefully (without leaving large empty zones where the 4 institution logos used to sit).

### Replace the LOGOS array

```tsx
const LOGOS: LogoItem[] = [
  { src: '/logos/React-icon.svg',                     label: 'React',        x: 8,  y: 12, delay: 0,    duration: 5 },
  { src: '/logos/Typescript_logo_2020.svg',           label: 'TypeScript',   x: 30, y: 18, delay: 0.15, duration: 4.3 },
  { src: '/logos/Vitejs-logo.svg',                    label: 'Vite',         x: 18, y: 38, delay: 0.45, duration: 5.8 },
  { src: '/logos/Firebase_Logo_(No_wordmark)_(2024-).svg', label: 'Firebase', x: 35, y: 50, delay: 0.75, duration: 4.6 },
  { src: '/logos/New_Power_BI_Logo.svg',              label: 'Power BI',     x: 12, y: 62, delay: 1.05, duration: 5.4 },
  { src: '/logos/Google_Gemini_icon_2025.svg',        label: 'Gemini',       x: 28, y: 82, delay: 1.35, duration: 4.2 },
];
```

### Why the new x/y values

The previous coordinates were calibrated for 10 logos spread across `x: 5–38, y: 12–92`. With only 6, the same range looks sparse. The new coordinates keep the vertical spread (12–82%) but tighten horizontal range slightly (8–35%) so the cluster reads as intentional negative-space-aware scatter rather than scattered remnants. Adjust by eye if the visual feels off.

### Filename escaping note

The Firebase filename contains parentheses: `Firebase_Logo_(No_wordmark)_(2024-).svg`. In a JS string literal those don't need escaping, but **make sure they're not URL-encoded** when the `<img src>` resolves. Vite serves files from `/public/` verbatim, so the literal path `/logos/Firebase_Logo_(No_wordmark)_(2024-).svg` works. If the browser ever shows a 404, the parentheses got URL-encoded somewhere — re-check.

### Everything else in FloatingLogos.tsx stays the same

- The `LogoImage` component (with `brightness-0 invert opacity-60`) is unchanged.
- The compact mode for mobile fallback is unchanged.
- The scroll-driven opacity logic and float animations are unchanged.

---

## CHANGE 2 — Add an optional `logo` field to Experience entries

### Update `src/data/experience.ts`

Extend the `Experience` interface:

```ts
export interface Experience {
  role: string;
  company: string;
  location: string;
  period: string;
  bullets: string[];
  logo?: string;  // optional path to logo SVG/PNG, e.g. '/logos/Singer_Sri_Lanka_logo.svg'
}
```

And add the logo to the Singer entry (the only existing entry with a known institution logo):

```ts
{
  role: 'Junior Executive — IT',
  company: 'Singer Sri Lanka PLC',
  location: 'Kadawatha, Sri Lanka',
  period: '11/2020 – 08/2022',
  logo: '/logos/Singer_Sri_Lanka_logo.svg',   // assumes user has traced JPG → SVG
  bullets: [
    'First point of contact for internal IT support across Windows environments and network issues',
    'Analysed and improved cross-departmental data workflows to reduce downtime',
    'Promoted from IT Assistant for consistently strong performance',
    'Supported the integration of new software tools and managed inter-departmental interfaces',
  ],
},
```

Leave the other experience entries unchanged. The `logo` field is optional and Wenglor / SCA / freelance entries can have logos added later if available.

### Update `src/components/ExperienceItem.tsx`

Add a logo slot inside the right column, just above the role title. The logo renders only if `item.logo` is present.

Replace the current return value of `ExperienceItem`:

```tsx
export default function ExperienceItem({ item }: ExperienceItemProps) {
  return (
    <div className="grid grid-cols-1 gap-6 md:grid-cols-[200px_1fr] md:gap-12">
      {/* Left: period */}
      <span className="font-mono text-sm text-fg-subtle md:pt-1">
        {item.period}
      </span>

      {/* Right: details with hover accent border */}
      <div className="border-l-2 border-transparent pl-4 transition-colors duration-200 hover:border-accent md:pl-6">
        {/* Optional company logo on a light pill — works for color SVGs, traced black SVGs, and transparent PNGs */}
        {item.logo && (
          <div className="mb-4 inline-flex h-12 items-center rounded-lg bg-white px-3 py-2">
            <img
              src={item.logo}
              alt={`${item.company} logo`}
              className="h-7 w-auto max-w-[120px] object-contain"
              draggable={false}
            />
          </div>
        )}

        <h3 className="font-display text-2xl text-fg md:text-3xl">
          {item.role}
        </h3>

        <p className="mt-1 text-fg-muted">
          {item.company} — {item.location}
        </p>

        <ul className="mt-4 space-y-2">
          {item.bullets.map((bullet) => (
            <li
              key={bullet}
              className="flex items-start gap-3 leading-relaxed text-fg-muted"
            >
              <span
                className="mt-2.5 h-1 w-1 shrink-0 rounded-full bg-accent"
                aria-hidden="true"
              />
              {bullet}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
```

### Why the white pill background

The white pill (`bg-white rounded-lg px-3 py-2`) gives every logo a uniform, intentional-looking backdrop that works regardless of source format:
- Color SVGs render natural.
- Monochrome black-on-transparent traced SVGs read clearly on white.
- Transparent PNGs render natural.
- JPGs with white backgrounds blend into the pill — looks intentional.

This means the user doesn't need to worry about consistent formats per logo. Whatever they have in `public/logos/` works.

The pill is `inline-flex` so it sizes to content width, not full column width. `h-12` keeps it compact; the inner `<img>` is constrained to `h-7 max-w-[120px]` so logos with wildly different aspect ratios still feel uniform.

---

## CHANGE 3 — Create the Education section

### New file: `src/data/education.ts`

```ts
export interface Education {
  degree: string;
  institution: string;
  location: string;
  period: string;
  bullets: string[];
  logo?: string;
}

export const education: Education[] = [
  {
    degree: 'BSc Digital Technology & Management',
    institution: 'OTH Amberg-Weiden',
    location: 'Amberg, Germany',
    period: '10/2022 – Present',
    logo: '/logos/OTH_AW_Logo.svg',  // assumes user has traced JPG → SVG
    bullets: [
      'IoT and sensor technology, applied AI and computer vision in smart factories',
      'Business intelligence, data modelling, and ERP / process integration',
      'Bridging engineering systems with business operations and strategy',
    ],
  },
  {
    degree: 'Exchange Semester',
    institution: 'Thomas More University of Applied Sciences',
    location: 'Belgium',
    period: 'TBD — fill in actual semester dates',
    logo: '/logos/Logo_Thomas_More.png',
    bullets: [
      'TBD — fill in actual courses and focus areas studied during the exchange',
    ],
  },
];
```

**Note for Antigravity:** The Thomas More entry's period and bullets are placeholders. Leave the `TBD` markers in — the user will fill these in directly via the data file once the section is rendering. Do not invent details.

### New file: `src/components/EducationItem.tsx`

Mirrors `ExperienceItem` exactly (same two-column timeline layout, same hover accent, same logo pill), differing only in field names (`degree` instead of `role`, `institution` instead of `company`).

```tsx
import type { Education } from '../data/education';

interface EducationItemProps {
  item: Education;
}

export default function EducationItem({ item }: EducationItemProps) {
  return (
    <div className="grid grid-cols-1 gap-6 md:grid-cols-[200px_1fr] md:gap-12">
      <span className="font-mono text-sm text-fg-subtle md:pt-1">
        {item.period}
      </span>

      <div className="border-l-2 border-transparent pl-4 transition-colors duration-200 hover:border-accent md:pl-6">
        {item.logo && (
          <div className="mb-4 inline-flex h-12 items-center rounded-lg bg-white px-3 py-2">
            <img
              src={item.logo}
              alt={`${item.institution} logo`}
              className="h-7 w-auto max-w-[120px] object-contain"
              draggable={false}
            />
          </div>
        )}

        <h3 className="font-display text-2xl text-fg md:text-3xl">
          {item.degree}
        </h3>

        <p className="mt-1 text-fg-muted">
          {item.institution} — {item.location}
        </p>

        <ul className="mt-4 space-y-2">
          {item.bullets.map((bullet) => (
            <li
              key={bullet}
              className="flex items-start gap-3 leading-relaxed text-fg-muted"
            >
              <span
                className="mt-2.5 h-1 w-1 shrink-0 rounded-full bg-accent"
                aria-hidden="true"
              />
              {bullet}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
```

### New file: `src/sections/Education.tsx`

Mirrors `Experience.tsx`:

```tsx
import Container from '../components/Container';
import SectionHeader from '../components/SectionHeader';
import Reveal from '../components/Reveal';
import EducationItem from '../components/EducationItem';
import { education } from '../data/education';

export default function Education() {
  return (
    <section id="education" className="py-24 md:py-32">
      <Container>
        <Reveal>
          <SectionHeader
            label="(Education)"
            headline="Where I've studied"
          />
        </Reveal>

        <div className="space-y-16 md:space-y-20">
          {education.map((item, i) => (
            <Reveal key={`${item.institution}-${item.period}`} delay={i * 0.08} width="full">
              <EducationItem item={item} />
            </Reveal>
          ))}
        </div>
      </Container>
    </section>
  );
}
```

### Update `src/App.tsx`

Add the Education import and render it between `CinematicIntro` and `Work` (so the flow is Intro → About → Education → Work → Experience → Skills → Contact). This puts academic background before work history, which makes sense for a 5th-semester student:

```tsx
import Nav from './components/Nav';
import Footer from './components/Footer';
import CurtainLoader from './components/CurtainLoader';
import CinematicIntro from './sections/CinematicIntro';
import Education from './sections/Education';     // ← NEW
import Work from './sections/Work';
import Experience from './sections/Experience';
import Skills from './sections/Skills';
import Contact from './sections/Contact';

function App() {
  return (
    <>
      <CurtainLoader />
      <Nav />
      <main>
        <CinematicIntro />
        <Education />                              {/* ← NEW */}
        <Work />
        <Experience />
        <Skills />
        <Contact />
      </main>
      <Footer />
    </>
  );
}

export default App;
```

### Optionally — update Nav links

If `Nav.tsx` shows section anchors and lists Work/About/Experience/Contact, add an "Education" entry between About and Work (or wherever fits the current ordering). If Nav is hard-coded to specific sections only, leave it alone — the Education section will still be accessible via scroll.

---

## CHANGE 4 — Verify acceptance

### FloatingLogos

1. Open the page on desktop, scroll into the About section.
2. Six logos float in the left column: React (top-left), TypeScript (top-mid), Vite, Firebase, Power BI, Gemini. No institution logos visible here.
3. All six render as monochrome white silhouettes via `brightness-0 invert`.
4. Layout looks intentional — no large empty patches where the 4 institutions used to be.

### Experience section

5. Scroll to Experience. Singer Sri Lanka entry shows a small white pill above the role title with the Singer logo inside.
6. Other experience entries (SCA, Self-employed, forzahorizon5_xpert) render without a logo pill — they're missing the `logo` field, which is fine (the conditional render handles it).
7. The hover-accent left border still activates on hover of each entry.

### Education section (new)

8. Education section renders between About and Work, with the standard `(Education)` eyebrow + "Where I've studied" headline.
9. OTH Amberg-Weiden entry renders with the OTH logo in a white pill, then the degree title, institution + location, and bullets.
10. Thomas More entry renders with the Thomas More logo in a white pill, then the (placeholder) degree + bullets — visible markers like "TBD" remind the user to fill in the actual content.
11. Same hover-accent border behavior as Experience.

### No regressions

12. The cinematic hero, About reveal, sticky scroll mechanics, mobile fallback layout — all unchanged.
13. The dark-fade scrim, About-readability scrim, intro overlay — all unchanged.
14. Skills and Contact sections render as before.

---

## Files to touch

- **Edit:** `src/components/FloatingLogos.tsx` (LOGOS array only; rest unchanged).
- **Edit:** `src/data/experience.ts` (add `logo?` to interface, set logo on Singer entry).
- **Edit:** `src/components/ExperienceItem.tsx` (add conditional logo pill above role title).
- **Edit:** `src/App.tsx` (import + render Education section).
- **New:** `src/data/education.ts` (education entries with logos).
- **New:** `src/components/EducationItem.tsx` (mirror of ExperienceItem).
- **New:** `src/sections/Education.tsx` (mirror of Experience).
- **Optionally edit:** `src/components/Nav.tsx` (add Education link if Nav has section anchors).

## Files NOT to touch

- `src/sections/CinematicIntro.tsx` — leave alone, fully shaped by prior specs.
- `src/components/RevealWords.tsx`, `RotatingWords.tsx`, `CurtainLoader.tsx`, `Reveal.tsx`, `Container.tsx`, `SectionHeader.tsx` — leave alone.
- `src/sections/Work.tsx`, `Skills.tsx`, `Contact.tsx`, `Footer.tsx` — leave alone.
- `src/hooks/useScrollScrub.ts` — leave alone.
- `src/index.css` — leave alone.
- Any logo file in `public/logos/` — the user manages those assets directly.

## Open question for the user (Antigravity should leave this for resolution)

**Where does Wenglor sensoric belong?** It's not in the current Experience data and not mentioned in the About copy. Three plausible places:

1. **An additional Experience entry** if the user worked at or interned with Wenglor.
2. **A "Sensors & Industrial Partners" line in the OTH education bullets** if Wenglor sensors are part of the user's academic IoT / smart-factory coursework.
3. **Omitted from the website** if the relationship is too casual to warrant a section presence.

Recommend the user clarifies and provides the relevant logo placement before deploying. Until then, the Wenglor logo file sits in `public/logos/` unused — no error, just unused. The current spec doesn't reference it anywhere, so there's no breakage if it stays unattached.

## Edge cases for Antigravity

- If the Education section's vertical spacing (`space-y-16 md:space-y-20`) feels off because there are only 2 entries (vs 4 in Experience), try `space-y-12 md:space-y-16` for Education only. Leave Experience untouched.
- If the white pill backdrop on logos clashes too hard with the dark theme, soften it: change `bg-white` to `bg-fg/95` or `bg-[#f5f5f0]` (matching the `--color-fg` token). The pill should still read as "an intentional swatch behind the logo," just less stark.
- If the Singer logo SVG is mostly empty whitespace around its viewbox, the `h-7 max-w-[120px]` constraint will leave it looking tiny inside the pill. The fix is to crop the SVG's viewBox tighter (user can do this in any SVG editor), or, if the user prefers a code fix, increase the pill's inner image to `h-8 max-w-[140px]` — but this is a per-logo judgment call, not a global rule.
- Do NOT try to apply `brightness-0 invert` to the Experience/Education logos. They render in their natural colors on white. The filter is only used in `FloatingLogos` for the scattered decorative pattern.
