# Scope: Implementation Track

## Architecture
- **Framework**: React 19 + TypeScript + Vite
- **Styling**: Tailwind CSS v4
- **Contexts**: ThemeContext, LanguageContext
- **Components**: CinematicIntro, Hero, About, Work, Experience, Skills, Contact, ThemeAndLangSelector

## Milestones
| # | Name | Scope | Dependencies | Status |
|---|------|-------|-------------|--------|
| M2 | Responsiveness & Layout | Fix layout constraints, wrap/stack, no horizontal scrollbars | None | IN_PROGRESS |
| M3 | Theme Contrast & Readability | High contrast in light/dark, 3D meshes active, cinematic intro scroll-fade text transition | None | PLANNED |
| M4 | Multilingual Support | Fix language toggle states, localize EN/DE translations | None | PLANNED |
| M5 | Final E2E Pass & Hardening | Pass 100% of E2E tests, Challenger-led hardening, auditor check | M2, M3, M4 | PLANNED |

## Interface Contracts
### Theme & Language Selection
- Selector component `ThemeAndLangSelector.tsx` must render theme switcher and language toggle button.
- Toggle controls must dynamically call `setTheme` and `setLanguage` from context.
- Active states must be styled indicating which language and theme are active.
- Context providers must wrap the application root.
