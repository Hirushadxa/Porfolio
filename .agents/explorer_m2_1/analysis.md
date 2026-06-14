# Milestone M2 Responsiveness and Layout Analysis Report

**Date:** 2026-06-14  
**Author:** explorer_m2_1  
**Project:** Portfolio Website  
**Focus:** Responsiveness, breakpoint behavior, layout constraints, mobile menu stacking, and horizontal scrollbar leaks.

---

## Executive Summary
A comprehensive read-only investigation of the portfolio codebase (focusing on `src/`) was conducted to evaluate layout integrity and responsiveness across standard viewports. 

Key findings include:
1. **Ultra-wide Alignment Drift:** The `CinematicIntro` section (tagline overlay and About viewport) spans the full viewport width (`w-full`, `left-0 right-0`) without max-width constraints. On screens $> 1440\text{px}$, this causes text elements and logos to drift to the far outer edges of the screen, misaligning them with all other sections which are constrained to a centered `1280px` grid via the `Container` component.
2. **Logo Orbit Layout Collision:** On Desktop and Landscape Tablet viewports, the `FloatingLogos` component uses absolute pixel diameters ($340\text{px}$ to $600\text{px}$) and large orbital radii. At the lower ends of the `lg` ($1024\text{px}$) and `xl` ($1280px$) breakpoints, the orbits overflow their parent columns, leaving as little as $8\text{px}$ of separation between the logos and the About paragraph text.
3. **Mobile Overlay Transparency & Duplicate UI:** The mobile navigation overlay drawer uses a transparent background (`bg-transparent`) and does not hide the underlying navbar. Consequently, when the menu is open, the monogram, header selector buttons, and close button visually overlap. Additionally, two identical theme/language selectors are rendered simultaneously.
4. **Horizontal Overflow Safety:** General horizontal leaks on the document root are protected by `overflow-x: clip` on `html, body`. Text content wrapping (e.g., project tags and experience item bullets) is robust and stacks correctly.
5. **Pre-existing Linter Errors:** Running `npm run lint` yields 16 compiler/linter issues in `Background3D.tsx`, `MaskedContent.tsx`, `LanguageContext.tsx`, `ThemeContext.tsx`, and `Contact.tsx`. These must be resolved for clean production delivery.

---

## 1. Horizontal Scrollbar Leaks & Column Overflows
### 1.1 Document-Level Safety
* **Observation:** `src/index.css` (lines 84-87) applies `overflow-x: clip` to the `html` and `body` elements:
  ```css
  html,
  body {
    overflow-x: clip;
  }
  ```
* **Analysis:** This prevents visual bleed from generating document-level horizontal scrollbars. Using `clip` rather than `hidden` is the correct primitive because it avoids creating secondary scroll containers that break `position: sticky` logic (ref: `2026-05-25-double-scrollbar-regression-fix-spec.md`).

### 1.2 Desktop/Tablet Landscape Orbit Overflow
* **Observation (File: `src/components/FloatingLogos.tsx`):**
  * Base outer radius (`--radius-outer`): $135\text{px}$ (diameter $270\text{px}$). Logo width $\approx 50\text{px}$. Bounding circle $\approx 320\text{px}$. Orbit parent: `w-[340px]`.
  * `lg` outer radius (at $1024\text{px}$): $200\text{px}$ (diameter $400\text{px}$). Logo width $\approx 66\text{px}$. Bounding circle $\approx 466\text{px}$. Orbit parent: `lg:w-[440px]`.
  * `xl` outer radius (at $1280\text{px}$): $270\text{px}$ (diameter $540\text{px}$). Logo width $\approx 84\text{px}$. Bounding circle $\approx 624\text{px}$. Orbit parent: `xl:w-[600px]`.
* **Observation (File: `src/sections/CinematicIntro.tsx` lines 366-370):**
  The left column holding the orbits has a relative layout that takes `w-1/2` of the viewport:
  ```tsx
  <div className="absolute inset-y-0 left-0 w-1/2 hidden md:flex items-start pointer-events-none px-6 md:px-12 pt-[152px]">
    <div className="relative w-full h-[340px] lg:h-[440px] xl:h-[600px]">
      <FloatingLogos progress={0.5} />
    </div>
  </div>
  ```
* **Analysis:**
  * **At 1024px viewport width (`lg` breakpoint):** The column width is $512\text{px}$. Accounting for padding (`md:px-12` = $96\text{px}$ total), the usable width is $416\text{px}$. However, the orbits' bounding width is $466\text{px}$, which overflows the usable container width. The orbits extend to $489\text{px}$ from the left edge of the screen. Since the About text block on the right column begins exactly at the center line ($512\text{px}$), the separation gap is only $23\text{px}$.
  * **At 1280px viewport width (`xl` breakpoint):** The column width is $640\text{px}$. Usable width is $544\text{px}$. The orbits' bounding width is $624\text{px}$. The rightmost edge of the outer logos lies at $320\text{px} + 312\text{px} = 632\text{px}$. Since the About text block on the right column starts at $640\text{px}$, the separation gap between the rotating logo and the text shrinks to **$8\text{px}$**.
  * **Layout Consequence:** The orbits overflow their designated layout space, resulting in severe visual crowding and potential collisions with paragraph text on smaller desktop windows.

---

## 2. Breakpoint Layout Constraints Behavior
### 2.1 Mobile Viewport (<768px)
* **Behavior:** The cinematic scroll scrub is disabled. A stacked static layout is rendered via the `useFallback` path in `CinematicIntro.tsx`.
* **Details:**
  * **Headshot:** CSS-cropped to a square using `clamp(220px, 64vw, 320px)` and centered.
  * **Flow:** Standard top-to-bottom block layout (`flex-col` or grid collapse).
  * **Content Margins:** Bounded by `px-5 sm:px-6` (gutters of $20\text{px}$-$24\text{px}$), ensuring text does not hug the screen edges.

### 2.2 Tablet Viewport (768px - 1023px)
* **Behavior:** 
  * Portrait orientation uses the mobile fallback layout, which is highly readable.
  * Landscape orientation uses the desktop cinematic layout.
* **Details:**
  * **Section Height:** Shrinks to `160dvh` (Task 2 of fixes spec) to prevent excessive scroll fatigue.
  * **Experience Timeline:** Stacks vertically below $1024\text{px}$ to prevent the timeline periods from squeezing descriptions.

### 2.3 Desktop Viewport (1024px - 1440px)
* **Behavior:** Full cinematic scrub is active. 
* **Details:**
  * Layout divides screen into two columns (`w-1/2` for logos, `w-1/2` or `lg:w-5/12` for text).
  * Collisions occur at the lower boundaries of this breakpoint range (as described in section 1.2).

### 2.4 Ultra-wide Viewport (>1440px)
* **Behavior:** Full cinematic scrub is active.
* **Details:**
  * **Alignment Drift:** In `CinematicIntro.tsx` (lines 313 & 357), the intro overlay and the About container span the full viewport width (`w-full` / `left-0 right-0`). The About text block pushes to the extreme right edge using `ml-auto lg:w-5/12`, and the tagline pushes to the extreme left.
  * **Alignment Mismatch:** On a $2560\text{px}$ display, the About text block is rendered on the far right (ending at $2512\text{px}$ after padding), while the subsequent sections (Work, Experience, Skills, Contact) are wrapped in `<Container>` and locked to the centered $1280\text{px}$ grid (spanning from $640\text{px}$ to $1920\text{px}$). This creates a major layout break.

---

## 3. Mobile Component Wrapping, Stacking, & Nav Overlay
### 3.1 Rest Header Stacking
* **Observation:** The mobile header (Nav bar) fits the monogram "HD" on the left, and a flex container on the right (`flex items-center gap-4`) holding `ThemeAndLangSelector` ($\approx 119\text{px}$) and a hamburger menu button ($\approx 32\text{px}$).
* **Behavior:** Combined, these elements consume $\approx 202\text{px}$ of horizontal space. On a $320\text{px}$ phone viewport, the container gutters leave $280\text{px}$ of usable width. The elements fit without wrapping or overlapping.

### 3.2 Mobile Overlay Stacking & Transparency
* **Observation (File: `src/components/Nav.tsx` lines 120-165):**
  * The mobile menu drawer overlay has:
    ```tsx
    className="fixed inset-0 z-50 flex flex-col bg-transparent lg:hidden"
    ```
  * Inside this drawer, there is a second `ThemeAndLangSelector` (lines 156-163).
  * The close button is positioned with simple utility classes (line 128):
    ```tsx
    className="flex justify-end px-6 py-4"
    ```
* **Analysis:**
  1. **Background Transparency:** Because the overlay has `bg-transparent` and only `main` is hidden (not `Nav`, `Footer`, or `Background3D`), the original header remains visible in the background when the menu is open.
  2. **Visual Overlaps:** The close button `X` overlaps the original hamburger menu button. Because of padding differences (`px-6` on close button vs clamp-based padding in the Container), they are misaligned, creating a cluttered UI.
  3. **Duplicate Switchers:** The user is presented with two identical theme/language selectors: one in the resting header (background) and one in the middle of the drawer.

---

## 4. Recommended Fix Strategy

### 4.1 Constrain CinematicIntro to Grid Width (Fixes Ultra-wide Drift & Orbit Collisions)
* **Goal:** Wrap the `CinematicIntro` content sections in the `Container` component so they remain aligned with the rest of the website's grid layout on ultra-wide screens. This will also contain the `FloatingLogos` within a maximum column width of $640\text{px}$, resolving the layout collision issues.
* **Target File:** `src/sections/CinematicIntro.tsx`
* **Implementation Plan:**
  1. **Tagline Overlay (Lines 313-354):** Wrap the content in a `<Container>` wrapper rather than a full-width `div` with absolute padding.
     * *Before:*
       ```tsx
       <div className="absolute top-0 left-0 right-0 z-30 pointer-events-none flex min-h-dvh flex-col justify-between px-6 py-6 md:px-16 md:py-8">
       ```
     * *After:*
       ```tsx
       <div className="absolute top-0 left-0 right-0 z-30 pointer-events-none">
         <Container className="flex min-h-dvh flex-col justify-between py-6 md:py-8">
           ...
         </Container>
       </div>
       ```
  2. **About Viewport (Lines 357-413):** Replace the current unconstrained relative column containers with a flex row wrapped in a `<Container>`.
     * *Before:*
       ```tsx
       <MaskedContent className="relative z-10 w-full pointer-events-none">
         <div className="relative min-h-dvh w-full py-24 md:py-32 pointer-events-auto">
           <div id="about" className="absolute top-24 md:top-32 left-0 w-full" />
           <div className="absolute inset-y-0 left-0 w-1/2 hidden md:flex items-start pointer-events-none px-6 md:px-12 pt-[152px]">
             <div className="relative w-full h-[340px] lg:h-[440px] xl:h-[600px]">
               <FloatingLogos progress={0.5} />
             </div>
           </div>
           <div className="ml-auto w-full md:w-1/2 lg:w-5/12 text-left pr-6 md:pr-12 pl-6 md:pl-8 lg:pl-0 space-y-8">
             ...
           </div>
         </div>
       </MaskedContent>
       ```
     * *After:*
       ```tsx
       <MaskedContent className="relative z-10 w-full pointer-events-none">
         <div className="relative min-h-dvh w-full pointer-events-auto">
           <div id="about" className="absolute top-24 md:top-32 left-0 w-full" />
           <Container className="py-24 md:py-32 flex flex-col md:flex-row gap-12 lg:gap-16 items-start">
             {/* Left Column: FloatingLogos */}
             <div className="w-full md:w-1/2 hidden md:flex justify-center pt-[152px] pointer-events-none">
               <div className="relative w-full max-w-[340px] lg:max-w-[440px] xl:max-w-[600px] h-[340px] lg:h-[440px] xl:h-[600px]">
                 <FloatingLogos progress={0.5} />
               </div>
             </div>
             {/* Right Column: Text Block */}
             <div className="w-full md:w-1/2 lg:w-7/12 text-left space-y-8">
               ...
             </div>
           </Container>
         </div>
       </MaskedContent>
       ```
     * *Rationale:* Placing the text and logos inside a centered `<Container>` forces them to align with the rest of the site grid on screens wider than $1280\text{px}$. Using flexbox with `gap-*` guarantees a controlled separation between the logo orbits and the text, preventing collisions at narrow desktop sizes.

### 4.2 Fix Mobile Nav Overlay Design (Fixes Transparency & Duplicate UI)
* **Goal:** Hide the resting navbar behind a solid, blurred backdrop when the drawer is open. Ensure alignment between the close button and the original layout grid, and hide the duplicate selectors.
* **Target File:** `src/components/Nav.tsx`
* **Implementation Plan:**
  1. **Change Backdrop Styling (Line 121):** Modify the overlay wrapper `div` to add a semi-opaque background color and a backdrop filter.
     * *Before:*
       ```tsx
       className="fixed inset-0 z-50 flex flex-col bg-transparent lg:hidden"
       ```
     * *After:*
       ```tsx
       className="fixed inset-0 z-50 flex flex-col bg-bg/98 backdrop-blur-lg lg:hidden"
       ```
  2. **Wrap Close Button in Container (Line 128-137):** Use the `Container` component around the close button wrapper to align the button perfectly with the horizontal page gutters.
     * *Before:*
       ```tsx
       <div className="flex justify-end px-6 py-4">
         <button ...>
           <X className="h-6 w-6" />
         </button>
       </div>
       ```
     * *After:*
       ```tsx
       <Container>
         <div className="flex justify-end py-4">
           <button ...>
             <X className="h-6 w-6" />
           </button>
         </div>
       </Container>
       ```
     * *Rationale:* The solid background obscuring the resting header removes visual clutter. Using the `<Container>` component aligns the close `X` button with the position previously occupied by the hamburger menu icon, eliminating visual jumping.
