# Test Infrastructure: Zero-Dependency E2E Framework

## Test Philosophy
Our testing philosophy focuses on **opaque-box End-to-End (E2E) verification** using only native tools and pre-installed system resources, adhering to a strict **zero-dependency** mandate. This ensures high portability, minimal maintenance overhead, and independence from complex testing suites.

By leveraging Node.js native libraries (`node:test`, `node:assert`) and connecting directly to pre-installed browsers (Microsoft Edge or Google Chrome) via the **Chrome DevTools Protocol (CDP)** over a WebSocket connection, we directly test the built production asset without modifying or polluting the project with external heavy testing frameworks like Cypress or Playwright.

---

## Runner Configuration
The E2E test runner automatically handles the lifecycle of the application build, server hosting, and browser automation:

1. **Build Step**: Executes the project's production build command (`npm run build`).
2. **Server Lifecycle**: Spawns a local Vite preview server on default port `4173` with the `--strictPort` flag.
3. **Browser Automation**:
   - Locates Microsoft Edge or Google Chrome at standard Windows paths.
   - Spawns the browser in headless mode (`--headless=new`) with remote debugging enabled (`--remote-debugging-port=9222`).
   - Uses a temporary user-profile directory created inside the OS temporary folder, ensuring clean state isolation.
4. **WebSocket Connection**: Connects to the browser's CDP WebSocket debugger endpoint to control the viewport, simulate user interactions (clicking, scrolling, resizing), and inspect the DOM.

---

## Test Format
Tests are written using Node.js's standard `node:test` suite. Features are tested across four tiers of complexity:

- **Tier 1: Feature Coverage (Static Checks)**: Checks existence, default styling classes, accessibility tags, and structure of elements on initial render.
- **Tier 2: Interactive functional tests**: Performs clicks, scrolls, and resizes to verify interactive states (such as navbar show/hide triggers, theme styling changes, language updates).
- **Tier 3: Cross-Feature Combinations**: Validates features acting together (e.g. toggling theme and language simultaneously inside the mobile menu drawer while resizing, verifying persistence).
- **Tier 4: Real-world User Scenario Scripts**: Implements sequential user stories, mimicking realistic navigation flows through the portfolio, form completion, and interactive visual checking.

---

## Feature Inventory & Test Coverage

The test suite consists of **50 distinct test cases** divided across the following features:

### 1. Navbar Navigation & Scrolling (10 Tests)
- **Tier 1**: Presence of navbar, monogram link, desktop anchor list, mobile hamburger trigger, and settings selector container.
- **Tier 2**: Desktop sticky behavior (starts hidden, becomes visible past 600px scroll, hides on return to top), mobile always-on visibility, and mobile menu body scroll locks.

### 2. Responsive Layouts & Grid Wrapping (10 Tests)
- **Tier 1**: Presence of Work grid, Experience timeline, Skills categories, Contact form, and 3D Canvas wrapper.
- **Tier 2**: Monogram/hamburger single-line alignment on small screens, vertical grid stacking on mobile, container width validation on tablet, side-by-side logo layout on desktop, and site-wide horizontal scrollbar check across all standard breakpoints.

### 3. Theme Switcher (10 Tests)
- **Tier 1**: Theme selector toggle button, presence of sun/moon icons, class list initialization, accessibility checks, and Three.js background existence.
- **Tier 2**: Dynamic class changes, theme persistence in local storage, visual background color validation (#fafafa in light vs #0a0a0f in dark), and rendering state updates on click.

### 4. Language Toggle (10 Tests)
- **Tier 1**: Language selector container, EN/DE button presence, active sliding pill state, mono/bold styles, and translation dictionary loading.
- **Tier 2**: English/German text translation checks for greetings, menu headers, work project details, and experience timeline items.

### 5. Cross-Feature Combinations (5 Tests)
- Drawer interactions (theme & language toggling within mobile menu drawer), persistence after window resizing, cinematic text color scroll interpolation, and DE language responsive layout checks.

### 6. Real-World User Scenario Scripts (5 Tests)
- Full user walkthroughs including:
  - Initial land and scroll readability audit.
  - Mobile menu language switch validation.
  - Multi-anchor menu scroll verification.
  - State cycling stability (toggling theme and language multiple times).
  - End-to-end traversal: landing, translation to DE, theme toggle, scrolling to work, and filling out contact form.
