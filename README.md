# Hirusha Dassanayaka — Portfolio

Personal portfolio website. A single-page site introducing me, my work, and how to get in touch.

**Live:** _(update once deployed)_

---

## Stack

- **Build:** Vite
- **Framework:** React 19 + TypeScript
- **Styling:** Tailwind CSS v4 (CSS-first config via `@theme` in `src/index.css`)
- **Animation:** Framer Motion
- **Icons:** Lucide React
- **Fonts:** Instrument Serif + Inter + JetBrains Mono (via Google Fonts)

## Local development

```bash
npm install
npm run dev          # http://localhost:5173
npm run build        # production build to dist/
npm run preview      # serve the production build locally
npm run lint         # ESLint
```

## Project structure

```
src/
├── App.tsx                 ← composes the sections
├── index.css               ← Tailwind + design tokens
├── main.tsx
├── data/                   ← content (decoupled from layout)
│   ├── projects.ts
│   ├── experience.ts
│   ├── skills.ts
│   └── socials.ts
├── components/             ← reusable primitives
│   ├── Container.tsx
│   ├── Nav.tsx
│   ├── Footer.tsx
│   ├── SectionHeader.tsx
│   ├── RotatingWords.tsx
│   ├── Reveal.tsx
│   ├── ProjectCard.tsx
│   ├── ExperienceItem.tsx
│   └── SkillGroup.tsx
└── sections/               ← one file per page section
    ├── Hero.tsx
    ├── About.tsx
    ├── Work.tsx
    ├── Experience.tsx
    ├── Skills.tsx
    └── Contact.tsx
```

To update content (add a project, change a skill, etc.) edit the relevant file in `src/data/` — no need to touch JSX.

## Design tokens

Defined in `src/index.css` under the `@theme` block:

| Token | Value | Use |
|---|---|---|
| `--color-bg` | `#0a0a0f` | Page background |
| `--color-surface` | `#13131a` | Cards, nav background |
| `--color-line` | `#1f1f29` | Borders |
| `--color-fg` | `#f5f5f0` | Primary text |
| `--color-fg-muted` | `#a3a3ad` | Secondary text |
| `--color-fg-subtle` | `#6b6b75` | Tertiary text, captions |
| `--color-accent` | `#f5b84e` | Warm amber (accents, CTAs) |
| `--font-display` | Instrument Serif | Headlines |
| `--font-sans` | Inter | Body, UI |
| `--font-mono` | JetBrains Mono | Captions, labels, tags |

## Deploy

See `2026-05-23-deploy-guide.md` in the parent folder for Firebase Hosting setup steps.

## Credits

Aesthetic reference: [valentincheval.design](https://valentincheval.design/) — design principles only, all implementation is original.
