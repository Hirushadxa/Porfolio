# Project: Portfolio Website Optimization

## Architecture
- **Framework**: React 19 + TypeScript + Vite
- **Styling**: Tailwind CSS v4
- **Animations & 3D**: Three.js, React Three Fiber (@react-three/fiber, @react-three/drei), Framer Motion, Lenis Scroll
- **Contexts**:
  - `ThemeContext` - Tracks and updates theme (`light` vs `dark`). Updates document class list for Tailwind theme variants.
  - `LanguageContext` - Tracks and updates language (`en` vs `de`). Connects translation keys.
- **Data Flow**:
  - Translations stored in `src/data/translations.ts`.
  - Language selection trigger in `ThemeAndLangSelector.tsx` propagates via `LanguageContext` to all sections.
  - Theme selection trigger in `ThemeAndLangSelector.tsx` propagates via `ThemeContext` to update `Background3D` and Tailwind components.

## Code Layout
- `src/App.tsx` - Root component coordinating layout and section order.
- `src/index.css` - Custom styling rules, fonts, and scroll resets.
- `src/components/` - Shared UI elements (selectors, containers, card layouts).
- `src/sections/` - Individual page sections:
  - `CinematicIntro` - Initial cinematic scrolling text container.
  - `Hero` - Portfolio splash section.
  - `About` - Narrative and personal biography.
  - `Work` - Grid showcasing previous work projects.
  - `Experience` - Timeline of jobs and positions.
  - `Skills` - Grouped technology stack listings.
  - `Contact` - Form and social links.
- `src/data/` - Static copy, project specifications, and translation content.

## Milestones
| # | Name | Scope | Track | Dependencies | Status |
|---|------|-------|-------|--------------|--------|
| M1 | E2E Testing Track Setup | Design test infra, write Tier 1-4 test cases, publish `TEST_READY.md` | E2E Testing | None | PLANNED |
| M2 | Responsiveness & Layout | Fix layout constraints, prevent horizontal scrollbars, wrap grid items | Implementation | None | PLANNED |
| M3 | Theme Contrast & Readability | Optimize light/dark themes, contrast ratios, and cinematic intro transitions | Implementation | None | PLANNED |
| M4 | Multilingual Verification | Fix language selection buttons and localize all hardcoded texts | Implementation | None | PLANNED |
| M5 | Final E2E Pass & Hardening | Pass 100% of E2E tests, run Challenger-led adversarial hardening | Implementation | M1, M2, M3, M4 | PLANNED |

## Interface Contracts
### Theme & Language Selection
- Selector component `ThemeAndLangSelector.tsx` must render theme switcher and language toggle button.
- Toggle controls must dynamically call `setTheme` and `setLanguage` from context.
- Active states must be styled indicating which language and theme are active.
- Context providers must wrap the application root inside `main.tsx` or `App.tsx`.
