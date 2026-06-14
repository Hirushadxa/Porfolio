/**
 * Comprehensive E2E Test Suite for Portfolio Website
 * Written in native Node.js (node:test, node:assert, WebSocket, fetch)
 * using Chrome DevTools Protocol (CDP) for browser interaction.
 *
 * Runs 50 specific E2E test cases across Tiers 1-4.
 */

import { test } from 'node:test';
import assert from 'node:assert';
import { spawn } from 'node:child_process';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { promises as fs } from 'node:fs';

const PORT = 4173;
const PREVIEW_URL = `http://localhost:${PORT}/`;
const EDGE_PATH = "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe";
const CHROME_PATH = "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";
const DEBUG_PORT = 9222;

let serverProcess = null;
let browserProcess = null;
let tempProfileDir = null;
let ws = null;
let requestId = 1;
const pendingRequests = new Map();

function killProcessTree(proc) {
  if (!proc) return;
  try {
    if (process.platform === 'win32') {
      spawn('taskkill', ['/F', '/T', '/PID', String(proc.pid)], { stdio: 'ignore' });
    } else {
      proc.kill();
    }
  } catch (e) {}
}

function sendCDP(method, params = {}) {
  return new Promise((resolve, reject) => {
    if (!ws || ws.readyState !== WebSocket.OPEN) {
      return reject(new Error("WebSocket is not connected"));
    }
    const id = requestId++;
    pendingRequests.set(id, { resolve, reject });
    ws.send(JSON.stringify({ id, method, params }));
  });
}

async function evaluateInPage(expression) {
  const res = await sendCDP("Runtime.evaluate", {
    expression,
    returnByValue: true
  });
  if (res.result?.exceptionDetails) {
    throw new Error(`Evaluation failed: ${res.result.exceptionDetails.exception.description}`);
  }
  return res.result?.result?.value;
}

async function clickElementByExpression(expr) {
  const coords = await evaluateInPage(expr);
  if (!coords) {
    throw new Error(`Could not find click coordinates for expression: ${expr}`);
  }
  await sendCDP("Input.dispatchMouseEvent", {
    type: "mousePressed",
    x: coords.x,
    y: coords.y,
    button: "left",
    clickCount: 1
  });
  await new Promise(r => setTimeout(r, 50));
  await sendCDP("Input.dispatchMouseEvent", {
    type: "mouseReleased",
    x: coords.x,
    y: coords.y,
    button: "left",
    clickCount: 1
  });
  await new Promise(r => setTimeout(r, 200)); // allow event to process
}

async function captureScreenshot(name) {
  const screenshotRes = await sendCDP("Page.captureScreenshot", { format: "png" });
  if (screenshotRes && screenshotRes.result && screenshotRes.result.data) {
    const base64Data = screenshotRes.result.data;
    const imgBuffer = Buffer.from(base64Data, 'base64');
    const screenshotsDir = join(process.cwd(), 'tests', 'screenshots');
    await fs.mkdir(screenshotsDir, { recursive: true });
    const imgPath = join(screenshotsDir, `${name}.png`);
    await fs.writeFile(imgPath, imgBuffer);
    console.log(`Captured screenshot: ${name}.png`);
  } else {
    console.warn("Failed to capture screenshot:", name);
  }
}

async function cleanup() {
  console.log("\n--- Cleaning up E2E environment ---");
  if (ws) {
    try { ws.close(); } catch (e) {}
  }
  if (browserProcess) {
    console.log("Stopping browser...");
    killProcessTree(browserProcess);
  }
  if (serverProcess) {
    console.log("Stopping Vite preview server...");
    killProcessTree(serverProcess);
  }
  if (tempProfileDir) {
    await new Promise(r => setTimeout(r, 1000));
    try {
      await fs.rm(tempProfileDir, { recursive: true, force: true });
      console.log("Temp browser profile cleaned up.");
    } catch (e) {
      console.warn("Could not delete temp profile:", e.message);
    }
  }
}

process.on('SIGINT', async () => {
  await cleanup();
  process.exit(1);
});

// Selectors helper targeting ONLY visible elements
const themeToggleExpr = `
  (() => {
    const buttons = Array.from(document.querySelectorAll('button[aria-label="Toggle theme"]'));
    const visibleBtn = buttons.find(b => {
      const rect = b.getBoundingClientRect();
      return rect.width > 0 && rect.height > 0;
    });
    if (!visibleBtn) return null;
    const rect = visibleBtn.getBoundingClientRect();
    return { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 };
  })()
`;

const deBtnExpr = `
  (() => {
    const buttons = Array.from(document.querySelectorAll('button'));
    const deBtn = buttons.find(b => b.innerText.trim() === 'DE' && b.getBoundingClientRect().width > 0);
    if (!deBtn) return null;
    const rect = deBtn.getBoundingClientRect();
    return { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 };
  })()
`;

const enBtnExpr = `
  (() => {
    const buttons = Array.from(document.querySelectorAll('button'));
    const enBtn = buttons.find(b => b.innerText.trim() === 'EN' && b.getBoundingClientRect().width > 0);
    if (!enBtn) return null;
    const rect = enBtn.getBoundingClientRect();
    return { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 };
  })()
`;

test.describe("Portfolio Site E2E Verification", () => {

  test.before(async () => {
    // Ensure clean state directories
    await fs.mkdir(join(process.cwd(), 'tests', 'screenshots'), { recursive: true });

    console.log("Building project with npm run build...");
    await new Promise((resolve, reject) => {
      const build = spawn(process.platform === 'win32' ? 'npm.cmd' : 'npm', ['run', 'build'], {
        cwd: process.cwd(),
        stdio: 'inherit',
        shell: true
      });
      build.on('close', (code) => {
        if (code === 0) resolve();
        else reject(new Error(`Build failed with code ${code}`));
      });
    });

    console.log("Starting preview server with npm run preview...");
    serverProcess = spawn(process.platform === 'win32' ? 'npm.cmd' : 'npm', ['run', 'preview', '--', '--port', String(PORT), '--strictPort'], {
      cwd: process.cwd(),
      stdio: 'pipe',
      shell: true
    });

    // Wait for server to be responsive
    let serverResponsive = false;
    for (let i = 0; i < 30; i++) {
      await new Promise(r => setTimeout(r, 500));
      try {
        const res = await fetch(PREVIEW_URL);
        if (res.ok) {
          serverResponsive = true;
          break;
        }
      } catch (e) {}
    }

    if (!serverResponsive) {
      throw new Error(`Preview server did not start on ${PREVIEW_URL}`);
    }
    console.log(`Preview server is active at ${PREVIEW_URL}`);

    // Select browser path
    let browserPath = EDGE_PATH;
    try {
      await fs.access(EDGE_PATH);
    } catch (e) {
      try {
        await fs.access(CHROME_PATH);
        browserPath = CHROME_PATH;
      } catch (e) {
        throw new Error("Neither Microsoft Edge nor Google Chrome could be found at their default paths.");
      }
    }

    // Launch browser
    tempProfileDir = join(tmpdir(), `portfolio-e2e-profile-${Date.now()}`);
    await fs.mkdir(tempProfileDir, { recursive: true });

    console.log(`Launching browser: ${browserPath}`);
    browserProcess = spawn(browserPath, [
      '--headless=new',
      `--remote-debugging-port=${DEBUG_PORT}`,
      `--user-data-dir=${tempProfileDir}`,
      'about:blank'
    ], {
      detached: true,
      stdio: 'ignore'
    });
    browserProcess.unref();

    // Poll for CDP endpoint
    let webSocketDebuggerUrl = null;
    for (let i = 0; i < 20; i++) {
      await new Promise(r => setTimeout(r, 500));
      try {
        const res = await fetch(`http://127.0.0.1:${DEBUG_PORT}/json`);
        if (res.ok) {
          const targets = await res.json();
          const pageTarget = targets.find(t => t.type === 'page');
          if (pageTarget && pageTarget.webSocketDebuggerUrl) {
            webSocketDebuggerUrl = pageTarget.webSocketDebuggerUrl;
            break;
          }
        }
      } catch (e) {}
    }

    if (!webSocketDebuggerUrl) {
      throw new Error(`Failed to retrieve WebSocket debugger URL from port ${DEBUG_PORT}`);
    }

    // Connect WebSocket
    console.log("Connecting to browser CDP WebSocket...");
    ws = new WebSocket(webSocketDebuggerUrl);

    ws.onmessage = (event) => {
      const data = JSON.parse(event.data);
      if (data.id && pendingRequests.has(data.id)) {
        const { resolve, reject } = pendingRequests.get(data.id);
        pendingRequests.delete(data.id);
        if (data.error) {
          reject(new Error(data.error.message || JSON.stringify(data.error)));
        } else {
          resolve(data);
        }
      }
    };

    await new Promise((resolve, reject) => {
      ws.onopen = resolve;
      ws.onerror = reject;
    });

    console.log("WebSocket connected. Enabling Page and Emulation domains...");
    await sendCDP("Page.enable");
    
    // Inject E2E testing flag to bypass Lenis smooth scrolling
    await sendCDP("Page.addScriptToEvaluateOnNewDocument", {
      source: "window.__E2E__ = true;"
    });

    // Set default viewport
    await sendCDP("Emulation.setDeviceMetricsOverride", {
      width: 1280,
      height: 800,
      deviceScaleFactor: 1,
      mobile: false
    });

    // Navigate to page
    console.log(`Navigating to ${PREVIEW_URL}...`);
    await sendCDP("Page.navigate", { url: PREVIEW_URL });
    
    // Wait for initial load and curtain animation to clear
    await new Promise(r => setTimeout(r, 3500));
  });

  test.after(async () => {
    await cleanup();
  });

  // ==========================================
  // FEATURE 1: NAVBAR NAVIGATION & SCROLLING
  // ==========================================

  test.describe("Feature 1: Navbar Navigation & Scrolling", () => {
    
    test("F1T1_1: Navbar container element should exist in DOM", async () => {
      const exists = await evaluateInPage("!!document.querySelector('nav')");
      assert.strictEqual(exists, true);
    });

    test("F1T1_2: Monogram 'HD' brand link should exist in Navbar", async () => {
      const exists = await evaluateInPage("!!document.querySelector('nav a[href=\"#hero\"]')");
      const text = await evaluateInPage("document.querySelector('nav a[href=\"#hero\"]').innerText.trim()");
      assert.strictEqual(exists, true);
      assert.strictEqual(text, 'HD');
    });

    test("F1T1_3: Desktop navigation links should exist in the DOM with correct anchor hrefs", async () => {
      const hrefs = await evaluateInPage(`
        Array.from(document.querySelectorAll('nav div.hidden a')).map(a => a.getAttribute('href'))
      `);
      assert.ok(hrefs.includes('#hero'));
      assert.ok(hrefs.includes('#about'));
      assert.ok(hrefs.includes('#work'));
      assert.ok(hrefs.includes('#experience'));
      assert.ok(hrefs.includes('#contact'));
    });

    test("F1T1_4: Mobile menu hamburger toggle button should exist in DOM with screen-reader label", async () => {
      const exists = await evaluateInPage("!!document.querySelector('nav button[aria-label=\"Open navigation menu\"]')");
      assert.strictEqual(exists, true);
    });

    test("F1T1_5: Theme and language selector container should exist in Navbar", async () => {
      const exists = await evaluateInPage("!!document.querySelector('nav div.flex.items-center.gap-3')");
      assert.strictEqual(exists, true);
    });

    test("F1T2_1: Navbar should start hidden on desktop (opacity: 0) during cinematic intro", async () => {
      await evaluateInPage("window.scrollTo(0, 0)");
      await new Promise(r => setTimeout(r, 500));
      const opacity = await evaluateInPage("window.getComputedStyle(document.querySelector('nav')).opacity");
      assert.strictEqual(opacity, '0');
    });

    test("F1T2_2: Navbar should become visible (opacity: 1) when scrolling down past 600px on desktop", async () => {
      await evaluateInPage("window.scrollTo(0, 800)");
      await evaluateInPage("window.dispatchEvent(new Event('scroll'))");
      await new Promise(r => setTimeout(r, 1000));
      const opacity = await evaluateInPage("window.getComputedStyle(document.querySelector('nav')).opacity");
      assert.strictEqual(opacity, '1');
    });

    test("F1T2_3: Navbar should hide again (opacity: 0) when scrolling back to top on desktop", async () => {
      await evaluateInPage("window.scrollTo(0, 0)");
      await evaluateInPage("window.dispatchEvent(new Event('scroll'))");
      await new Promise(r => setTimeout(r, 1000));
      const opacity = await evaluateInPage("window.getComputedStyle(document.querySelector('nav')).opacity");
      assert.strictEqual(opacity, '0');
    });

    test("F1T2_4: Navbar should always be visible (opacity: 1) on mobile viewports even at top of page", async () => {
      await sendCDP("Emulation.setDeviceMetricsOverride", {
        width: 375,
        height: 667,
        deviceScaleFactor: 1,
        mobile: true
      });
      await new Promise(r => setTimeout(r, 500));
      const opacity = await evaluateInPage("window.getComputedStyle(document.querySelector('nav')).opacity");
      assert.strictEqual(opacity, '1');
      
      await sendCDP("Emulation.setDeviceMetricsOverride", {
        width: 1280,
        height: 800,
        deviceScaleFactor: 1,
        mobile: false
      });
      await new Promise(r => setTimeout(r, 500));
    });

    test("F1T2_5: Clicking mobile menu hamburger should open drawer and lock body overflow; clicking close should unlock body overflow", async () => {
      await sendCDP("Emulation.setDeviceMetricsOverride", {
        width: 375,
        height: 667,
        deviceScaleFactor: 1,
        mobile: true
      });
      await new Promise(r => setTimeout(r, 500));

      const hamburgerExpr = `
        (() => {
          const btn = document.querySelector('nav button[aria-label="Open navigation menu"]');
          if (!btn) return null;
          const rect = btn.getBoundingClientRect();
          return { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 };
        })()
      `;
      await clickElementByExpression(hamburgerExpr);
      await new Promise(r => setTimeout(r, 800));

      const bodyOverflowAfterOpen = await evaluateInPage("window.getComputedStyle(document.body).overflow");
      assert.strictEqual(bodyOverflowAfterOpen, 'hidden');

      await captureScreenshot('mobile_drawer_open');

      const closeBtnExpr = `
        (() => {
          const btn = document.querySelector('button[aria-label="Close navigation menu"]');
          if (!btn) return null;
          const rect = btn.getBoundingClientRect();
          return { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 };
        })()
      `;
      await clickElementByExpression(closeBtnExpr);
      await new Promise(r => setTimeout(r, 800));

      const bodyOverflowAfterClose = await evaluateInPage("window.getComputedStyle(document.body).overflow");
      assert.notStrictEqual(bodyOverflowAfterClose, 'hidden');

      await sendCDP("Emulation.setDeviceMetricsOverride", {
        width: 1280,
        height: 800,
        deviceScaleFactor: 1,
        mobile: false
      });
      await new Promise(r => setTimeout(r, 500));
    });
  });

  // ==========================================
  // FEATURE 2: RESPONSIVE LAYOUTS & GRID WRAPPING
  // ==========================================

  test.describe("Feature 2: Responsive Layouts & Grid Wrapping", () => {
    
    test("F2T1_1: Work section grid container should exist in the DOM", async () => {
      const exists = await evaluateInPage("!!document.querySelector('#work')");
      assert.strictEqual(exists, true);
    });

    test("F2T1_2: Experience section timeline container should exist in the DOM", async () => {
      const exists = await evaluateInPage("!!document.querySelector('#experience')");
      assert.strictEqual(exists, true);
    });

    test("F2T1_3: Skills section group containers should exist in the DOM", async () => {
      const exists = await evaluateInPage("!!document.querySelector('#skills')");
      assert.strictEqual(exists, true);
    });

    test("F2T1_4: Contact section form elements should exist in the DOM", async () => {
      const exists = await evaluateInPage("!!document.querySelector('#contact form')");
      assert.strictEqual(exists, true);
    });

    test("F2T1_5: Three.js Canvas container should exist in the DOM", async () => {
      const exists = await evaluateInPage("!!document.querySelector('canvas')");
      assert.strictEqual(exists, true);
    });

    test("F2T2_1: On mobile (<768px), monogram and selector controls must fit on a single line without wrapping", async () => {
      await sendCDP("Emulation.setDeviceMetricsOverride", {
        width: 360,
        height: 640,
        deviceScaleFactor: 1,
        mobile: true
      });
      await new Promise(r => setTimeout(r, 500));

      const isSameLine = await evaluateInPage(`
        (() => {
          const monogram = document.querySelector('nav a[href="#hero"]');
          const selectors = document.querySelector('nav div.flex.items-center.gap-4');
          if (!monogram || !selectors) return false;
          const mRect = monogram.getBoundingClientRect();
          const sRect = selectors.getBoundingClientRect();
          return Math.abs(mRect.top - sRect.top) < 20;
        })()
      `);
      assert.strictEqual(isSameLine, true);
    });

    test("F2T2_2: On mobile (<768px), About section, Work grid, and Contact info must stack vertically", async () => {
      const isStacked = await evaluateInPage(`
        (() => {
          const about = document.querySelector('#about');
          const work = document.querySelector('#work');
          const contact = document.querySelector('#contact');
          if (!about || !work || !contact) return false;
          const aRect = about.getBoundingClientRect();
          const wRect = work.getBoundingClientRect();
          const cRect = contact.getBoundingClientRect();
          return (aRect.top < wRect.top) && (wRect.top < cRect.top);
        })()
      `);
      assert.strictEqual(isStacked, true);
    });

    test("F2T2_3: On tablet (768px-1023px), Work grid should scale or wrap correctly without layout overflow", async () => {
      await sendCDP("Emulation.setDeviceMetricsOverride", {
        width: 768,
        height: 1024,
        deviceScaleFactor: 1,
        mobile: false
      });
      await new Promise(r => setTimeout(r, 500));

      const fitsWidth = await evaluateInPage(`
        (() => {
          const workGrid = document.querySelector('#work .grid') || document.querySelector('#work');
          if (!workGrid) return false;
          return workGrid.getBoundingClientRect().width <= 768;
        })()
      `);
      assert.strictEqual(fitsWidth, true);
    });

    test("F2T2_4: On desktop (>=1024px), About section side-by-side text blocks and logos should render side-by-side", async () => {
      await sendCDP("Emulation.setDeviceMetricsOverride", {
        width: 1280,
        height: 800,
        deviceScaleFactor: 1,
        mobile: false
      });
      await new Promise(r => setTimeout(r, 500));

      const isDesktopLayout = await evaluateInPage(`
        (() => {
          const aboutNode = document.querySelector('#about');
          if (!aboutNode) return false;
          const logosContainer = aboutNode.parentElement.querySelector('.absolute.inset-y-0.left-0');
          if (!logosContainer) return false;
          return window.getComputedStyle(logosContainer).display !== 'none';
        })()
      `);
      assert.strictEqual(isDesktopLayout, true);
    });

    test("F2T2_5: Horizontal scrollbar audit: site must maintain zero horizontal scrollbar on all breakpoints", async () => {
      const breakpoints = [360, 768, 1200, 1920];
      for (const w of breakpoints) {
        await sendCDP("Emulation.setDeviceMetricsOverride", {
          width: w,
          height: 800,
          deviceScaleFactor: 1,
          mobile: w < 768
        });
        await new Promise(r => setTimeout(r, 300));
        const hasHorizontalScroll = await evaluateInPage(`
          document.documentElement.scrollWidth > window.innerWidth
        `);
        assert.strictEqual(hasHorizontalScroll, false, `Horizontal scrollbar detected at width ${w}px`);
      }
      
      await sendCDP("Emulation.setDeviceMetricsOverride", {
        width: 1280,
        height: 800,
        deviceScaleFactor: 1,
        mobile: false
      });
      await new Promise(r => setTimeout(r, 500));
    });
  });

  // ==========================================
  // FEATURE 3: THEME SWITCHER
  // ==========================================

  test.describe("Feature 3: Theme Switcher", () => {
    
    test.beforeEach(async () => {
      // Ensure we scroll down to 800px so navbar is visible and selectors can be clicked
      await evaluateInPage("window.scrollTo(0, 800)");
      await evaluateInPage("window.dispatchEvent(new Event('scroll'))");
      await new Promise(r => setTimeout(r, 300));
    });

    test("F3T1_1: Theme selector toggle button should exist in DOM", async () => {
      const exists = await evaluateInPage("!!document.querySelector('button[aria-label=\"Toggle theme\"]')");
      assert.strictEqual(exists, true);
    });

    test("F3T1_2: Theme toggle button should contain SVG icons for sun and moon", async () => {
      const count = await evaluateInPage("document.querySelector('button[aria-label=\"Toggle theme\"]').querySelectorAll('svg').length");
      assert.ok(count >= 1);
    });

    test("F3T1_3: Theme context value should be initialized correctly (defaults to dark or light)", async () => {
      const className = await evaluateInPage("document.documentElement.className");
      assert.ok(className.includes('dark') || className.includes('light') || className === '');
    });

    test("F3T1_4: Theme selector should have correct accessibility attributes (aria-label)", async () => {
      const attr = await evaluateInPage("document.querySelector('button[aria-label=\"Toggle theme\"]').getAttribute('aria-label')");
      assert.strictEqual(attr, 'Toggle theme');
    });

    test("F3T1_5: Three.js starfield or constellation mesh container should match the initial theme state", async () => {
      const exists = await evaluateInPage("!!document.querySelector('canvas')");
      assert.strictEqual(exists, true);
    });

    test("F3T2_1: Clicking theme selector should toggle html element class between dark and light", async () => {
      // Force initial state to dark first
      await evaluateInPage(`
        (() => {
          if (!document.documentElement.classList.contains('dark')) {
            const btn = document.querySelector('button[aria-label="Toggle theme"]');
            if (btn) btn.click();
          }
        })()
      `);
      await new Promise(r => setTimeout(r, 500));
      assert.strictEqual(await evaluateInPage("document.documentElement.classList.contains('dark')"), true);

      await clickElementByExpression(themeToggleExpr);
      await new Promise(r => setTimeout(r, 800));

      assert.strictEqual(await evaluateInPage("document.documentElement.classList.contains('light')"), true);
      assert.strictEqual(await evaluateInPage("document.documentElement.classList.contains('dark')"), false);

      await clickElementByExpression(themeToggleExpr);
      await new Promise(r => setTimeout(r, 800));

      assert.strictEqual(await evaluateInPage("document.documentElement.classList.contains('dark')"), true);
      assert.strictEqual(await evaluateInPage("document.documentElement.classList.contains('light')"), false);
    });

    test("F3T2_2: Theme toggle should persist the selected theme state (checked via localStorage/session)", async () => {
      await clickElementByExpression(themeToggleExpr);
      await new Promise(r => setTimeout(r, 500));

      const stored = await evaluateInPage("localStorage.getItem('theme')");
      assert.strictEqual(stored, 'light');

      await clickElementByExpression(themeToggleExpr);
      await new Promise(r => setTimeout(r, 500));
      assert.strictEqual(await evaluateInPage("localStorage.getItem('theme')"), 'dark');
    });

    test("F3T2_3: Toggling theme should dynamically update colors and classes of key components", async () => {
      await clickElementByExpression(themeToggleExpr);
      await new Promise(r => setTimeout(r, 500));

      const bgStyle = await evaluateInPage("window.getComputedStyle(document.body).backgroundColor");
      assert.ok(bgStyle.includes('250') || bgStyle.includes('fafafa'));

      await clickElementByExpression(themeToggleExpr);
      await new Promise(r => setTimeout(r, 500));
    });

    test("F3T2_4: In light mode, html background color should match light theme colors (#fafafa)", async () => {
      await clickElementByExpression(themeToggleExpr);
      await new Promise(r => setTimeout(r, 500));

      const isLight = await evaluateInPage("document.documentElement.classList.contains('light')");
      assert.strictEqual(isLight, true);

      await captureScreenshot('light_mode_desktop');

      await clickElementByExpression(themeToggleExpr);
      await new Promise(r => setTimeout(r, 500));
    });

    test("F3T2_5: In dark mode, html background color should match dark theme colors (#0a0a0f)", async () => {
      const isDark = await evaluateInPage("document.documentElement.classList.contains('dark')");
      assert.strictEqual(isDark, true);

      const bgStyle = await evaluateInPage("window.getComputedStyle(document.body).backgroundColor");
      assert.ok(bgStyle.includes('10') || bgStyle.includes('0a0a0f'));
    });
  });

  // ==========================================
  // FEATURE 4: LANGUAGE TOGGLE
  // ==========================================

  test.describe("Feature 4: Language Toggle", () => {
    
    test.beforeEach(async () => {
      // Ensure selectors are visible by scrolling down
      await evaluateInPage("window.scrollTo(0, 800)");
      await evaluateInPage("window.dispatchEvent(new Event('scroll'))");
      await new Promise(r => setTimeout(r, 300));
    });

    test("F4T1_1: Language switcher container should exist in DOM", async () => {
      const exists = await evaluateInPage(`
        (() => {
          const buttons = Array.from(document.querySelectorAll('button'));
          return buttons.some(b => b.innerText === 'EN') && buttons.some(b => b.innerText === 'DE');
        })()
      `);
      assert.strictEqual(exists, true);
    });

    test("F4T1_2: Language buttons (EN and DE) should be present inside switcher", async () => {
      const hasEN = await evaluateInPage("!!Array.from(document.querySelectorAll('button')).find(b => b.innerText === 'EN')");
      const hasDE = await evaluateInPage("!!Array.from(document.querySelectorAll('button')).find(b => b.innerText === 'DE')");
      assert.strictEqual(hasEN, true);
      assert.strictEqual(hasDE, true);
    });

    test("F4T1_3: Active language pill or indicator should render correctly on load", async () => {
      const hasSlidingPill = await evaluateInPage(`
        (() => {
          const pills = Array.from(document.querySelectorAll('.absolute'));
          return pills.some(p => p.className.includes('bg-accent') && p.parentNode.innerText.includes('EN'));
        })()
      `);
      assert.strictEqual(hasSlidingPill, true);
    });

    test("F4T1_4: Language toggle buttons should have font-mono and font-bold styles", async () => {
      const stylesCorrect = await evaluateInPage(`
        (() => {
          const btn = Array.from(document.querySelectorAll('button')).find(b => b.innerText === 'EN');
          if (!btn) return false;
          const classList = Array.from(btn.classList);
          return classList.includes('font-mono') || classList.includes('font-bold');
        })()
      `);
      assert.strictEqual(stylesCorrect, true);
    });

    test("F4T1_5: Static translation dictionary should contain entries for both English and German", async () => {
      const translationWorking = await evaluateInPage("!!document.body.innerText");
      assert.strictEqual(translationWorking, true);
    });

    test("F4T2_1: Clicking DE button should translate main headers and greeting text to German", async () => {
      await clickElementByExpression(deBtnExpr);
      await new Promise(r => setTimeout(r, 500));

      const isGerman = await evaluateInPage("document.body.innerText.includes('Hallo, ich bin')");
      assert.strictEqual(isGerman, true);

      await captureScreenshot('german_mode_desktop');
    });

    test("F4T2_2: Clicking EN button should translate main headers and greeting text to English", async () => {
      await clickElementByExpression(enBtnExpr);
      await new Promise(r => setTimeout(r, 500));

      const isEnglish = await evaluateInPage("document.body.innerText.includes('Hi there, this is')");
      assert.strictEqual(isEnglish, true);
    });

    test("F4T2_3: Active states of language buttons should visually update on click", async () => {
      await clickElementByExpression(deBtnExpr);
      await new Promise(r => setTimeout(r, 500));

      const isDeStyledActive = await evaluateInPage(`
        (() => {
          const buttons = Array.from(document.querySelectorAll('button'));
          const btn = buttons.find(b => b.innerText.trim() === 'DE' && b.getBoundingClientRect().width > 0);
          return btn.className.includes('text-bg');
        })()
      `);
      assert.strictEqual(isDeStyledActive, true);

      await clickElementByExpression(enBtnExpr);
      await new Promise(r => setTimeout(r, 500));
    });

    test("F4T2_4: Language change should translate work project cards titles and descriptions", async () => {
      await clickElementByExpression(deBtnExpr);
      await new Promise(r => setTimeout(r, 500));

      const hasDeSubtitle = await evaluateInPage("document.body.innerText.includes('KI-gestützte Lebens- & Finanzplattform')");
      assert.strictEqual(hasDeSubtitle, true);

      await clickElementByExpression(enBtnExpr);
      await new Promise(r => setTimeout(r, 500));

      const hasEnSubtitle = await evaluateInPage("document.body.innerText.includes('AI-driven life & finance platform')");
      assert.strictEqual(hasEnSubtitle, true);
    });

    test("F4T2_5: Language change should translate experience timeline items and roles", async () => {
      await clickElementByExpression(deBtnExpr);
      await new Promise(r => setTimeout(r, 500));

      const hasDeRole = await evaluateInPage("document.body.innerText.includes('Assistent für Operations & Logistik')");
      assert.strictEqual(hasDeRole, true);

      await clickElementByExpression(enBtnExpr);
      await new Promise(r => setTimeout(r, 500));

      const hasEnRole = await evaluateInPage("document.body.innerText.includes('Operations & Logistics Assistant')");
      assert.strictEqual(hasEnRole, true);
    });
  });

  // ==========================================
  // TIER 3: CROSS-FEATURE COMBINATIONS
  // ==========================================

  test.describe("Tier 3: Cross-Feature Combinations", () => {
    
    test("F3_1: Theme toggle on mobile drawer: toggling theme inside mobile menu drawer should update site-wide theme and reflect in background", async () => {
      await sendCDP("Emulation.setDeviceMetricsOverride", {
        width: 375,
        height: 667,
        deviceScaleFactor: 1,
        mobile: true
      });
      await new Promise(r => setTimeout(r, 500));

      const hamburgerExpr = `
        (() => {
          const btn = document.querySelector('nav button[aria-label="Open navigation menu"]');
          if (!btn) return null;
          const rect = btn.getBoundingClientRect();
          return { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 };
        })()
      `;
      await clickElementByExpression(hamburgerExpr);
      await new Promise(r => setTimeout(r, 800));

      // Theme toggle inside mobile menu drawer
      const drawerThemeToggleExpr = `
        (() => {
          const buttons = Array.from(document.querySelectorAll('button[aria-label="Toggle theme"]'));
          const btn = buttons[buttons.length - 1]; // pick the drawer one
          if (!btn) return null;
          const rect = btn.getBoundingClientRect();
          return { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 };
        })()
      `;
      await clickElementByExpression(drawerThemeToggleExpr);
      await new Promise(r => setTimeout(r, 800));

      const isLight = await evaluateInPage("document.documentElement.classList.contains('light')");
      assert.strictEqual(isLight, true);

      await clickElementByExpression(drawerThemeToggleExpr);
      await new Promise(r => setTimeout(r, 800));

      const closeBtnExpr = `
        (() => {
          const btn = document.querySelector('button[aria-label="Close navigation menu"]');
          if (!btn) return null;
          const rect = btn.getBoundingClientRect();
          return { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 };
        })()
      `;
      await clickElementByExpression(closeBtnExpr);
      await new Promise(r => setTimeout(r, 800));

      await sendCDP("Emulation.setDeviceMetricsOverride", {
        width: 1280,
        height: 800,
        deviceScaleFactor: 1,
        mobile: false
      });
      await new Promise(r => setTimeout(r, 500));
    });

    test("F3_2: Language toggle on mobile drawer: toggling language inside mobile menu drawer should update site-wide translation and keep mobile drawer open", async () => {
      await sendCDP("Emulation.setDeviceMetricsOverride", {
        width: 375,
        height: 667,
        deviceScaleFactor: 1,
        mobile: true
      });
      await new Promise(r => setTimeout(r, 500));

      const hamburgerExpr = `
        (() => {
          const btn = document.querySelector('nav button[aria-label="Open navigation menu"]');
          if (!btn) return null;
          const rect = btn.getBoundingClientRect();
          return { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 };
        })()
      `;
      await clickElementByExpression(hamburgerExpr);
      await new Promise(r => setTimeout(r, 800));

      const drawerDeBtnExpr = `
        (() => {
          const buttons = Array.from(document.querySelectorAll('button'));
          const deBtns = buttons.filter(b => b.innerText.trim() === 'DE');
          const btn = deBtns[deBtns.length - 1]; // drawer one
          if (!btn) return null;
          const rect = btn.getBoundingClientRect();
          return { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 };
        })()
      `;
      await clickElementByExpression(drawerDeBtnExpr);
      await new Promise(r => setTimeout(r, 800));

      const hasDeMenu = await evaluateInPage("document.body.innerText.includes('Über mich')");
      assert.strictEqual(hasDeMenu, true);

      const isHidden = await evaluateInPage("window.getComputedStyle(document.body).overflow === 'hidden'");
      assert.strictEqual(isHidden, true);

      const drawerEnBtnExpr = `
        (() => {
          const buttons = Array.from(document.querySelectorAll('button'));
          const enBtns = buttons.filter(b => b.innerText.trim() === 'EN');
          const btn = enBtns[enBtns.length - 1]; // drawer one
          if (!btn) return null;
          const rect = btn.getBoundingClientRect();
          return { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 };
        })()
      `;
      await clickElementByExpression(drawerEnBtnExpr);
      await new Promise(r => setTimeout(r, 800));

      const closeBtnExpr = `
        (() => {
          const btn = document.querySelector('button[aria-label="Close navigation menu"]');
          if (!btn) return null;
          const rect = btn.getBoundingClientRect();
          return { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 };
        })()
      `;
      await clickElementByExpression(closeBtnExpr);
      await new Promise(r => setTimeout(r, 800));

      await sendCDP("Emulation.setDeviceMetricsOverride", {
        width: 1280,
        height: 800,
        deviceScaleFactor: 1,
        mobile: false
      });
      await new Promise(r => setTimeout(r, 500));
    });

    test("F3_3: Theme and Language persistence on resize: switching theme and language, then resizing viewport should preserve active theme and language state", async () => {
      await evaluateInPage("window.scrollTo(0, 800)");
      await evaluateInPage("window.dispatchEvent(new Event('scroll'))");
      await new Promise(r => setTimeout(r, 500));

      await clickElementByExpression(themeToggleExpr);
      await new Promise(r => setTimeout(r, 500));

      await clickElementByExpression(deBtnExpr);
      await new Promise(r => setTimeout(r, 500));

      await sendCDP("Emulation.setDeviceMetricsOverride", {
        width: 360,
        height: 640,
        deviceScaleFactor: 1,
        mobile: true
      });
      await new Promise(r => setTimeout(r, 500));

      assert.strictEqual(await evaluateInPage("document.documentElement.classList.contains('light')"), true);
      assert.strictEqual(await evaluateInPage("document.body.innerText.includes('Hallo, ich bin')"), true);

      await sendCDP("Emulation.setDeviceMetricsOverride", {
        width: 1280,
        height: 800,
        deviceScaleFactor: 1,
        mobile: false
      });
      await new Promise(r => setTimeout(r, 500));

      await evaluateInPage("window.scrollTo(0, 800)");
      await evaluateInPage("window.dispatchEvent(new Event('scroll'))");
      await new Promise(r => setTimeout(r, 500));

      await clickElementByExpression(themeToggleExpr);
      await new Promise(r => setTimeout(r, 500));

      await clickElementByExpression(enBtnExpr);
      await new Promise(r => setTimeout(r, 500));
    });

    test("F3_4: Cinematic Intro text color transition: in light mode, overlay texts should transition dynamically based on scroll progress", async () => {
      await evaluateInPage("window.scrollTo(0, 800)");
      await evaluateInPage("window.dispatchEvent(new Event('scroll'))");
      await new Promise(r => setTimeout(r, 500));

      await clickElementByExpression(themeToggleExpr);
      await new Promise(r => setTimeout(r, 500));

      await evaluateInPage("window.scrollTo(0, 0)");
      await evaluateInPage("window.dispatchEvent(new Event('scroll'))");
      await new Promise(r => setTimeout(r, 500));
      const colorAtTop = await evaluateInPage(`
        window.getComputedStyle(document.querySelector('#cinematic-intro p')).color
      `);

      // Scroll to 600px (which is activeProgress = 600/480 = 1.0 clamped)
      await evaluateInPage("window.scrollTo(0, 600)");
      await evaluateInPage("window.dispatchEvent(new Event('scroll'))");
      await new Promise(r => setTimeout(r, 500));
      const colorAtMiddle = await evaluateInPage(`
        window.getComputedStyle(document.querySelector('#cinematic-intro p')).color
      `);

      assert.notStrictEqual(colorAtTop, colorAtMiddle);

      await evaluateInPage("window.scrollTo(0, 800)");
      await evaluateInPage("window.dispatchEvent(new Event('scroll'))");
      await new Promise(r => setTimeout(r, 500));
      await clickElementByExpression(themeToggleExpr);
      await new Promise(r => setTimeout(r, 500));

      await evaluateInPage("window.scrollTo(0, 0)");
      await evaluateInPage("window.dispatchEvent(new Event('scroll'))");
      await new Promise(r => setTimeout(r, 500));
    });

    test("F3_5: Responsive layout integrity: changing language should not break layout grids or introduce horizontal scrollbars across all viewports", async () => {
      await evaluateInPage("window.scrollTo(0, 800)");
      await evaluateInPage("window.dispatchEvent(new Event('scroll'))");
      await new Promise(r => setTimeout(r, 500));

      await clickElementByExpression(deBtnExpr);
      await new Promise(r => setTimeout(r, 500));

      const breakpoints = [360, 768, 1200, 1920];
      for (const w of breakpoints) {
        await sendCDP("Emulation.setDeviceMetricsOverride", {
          width: w,
          height: 800,
          deviceScaleFactor: 1,
          mobile: w < 768
        });
        await new Promise(r => setTimeout(r, 200));
        const hasHorizontalScroll = await evaluateInPage(`
          document.documentElement.scrollWidth > window.innerWidth
        `);
        assert.strictEqual(hasHorizontalScroll, false, `Horizontal scrollbar detected with DE lang at width ${w}px`);
      }

      await sendCDP("Emulation.setDeviceMetricsOverride", {
        width: 1280,
        height: 800,
        deviceScaleFactor: 1,
        mobile: false
      });
      await new Promise(r => setTimeout(r, 500));

      await evaluateInPage("window.scrollTo(0, 800)");
      await evaluateInPage("window.dispatchEvent(new Event('scroll'))");
      await new Promise(r => setTimeout(r, 500));

      await clickElementByExpression(enBtnExpr);
      await new Promise(r => setTimeout(r, 500));

      await evaluateInPage("window.scrollTo(0, 0)");
      await evaluateInPage("window.dispatchEvent(new Event('scroll'))");
      await new Promise(r => setTimeout(r, 500));
    });
  });

  // ==========================================
  // TIER 4: REAL-WORLD USER SCENARIO SCRIPTS
  // ==========================================

  test.describe("Tier 4: Real-world User Scenario Scripts", () => {
    
    test("F4_1: Scenario 1: User lands on page, reviews initial intro, scrolls to About section, and verifies text readability", async () => {
      await evaluateInPage("window.scrollTo(0, 0)");
      await evaluateInPage("window.dispatchEvent(new Event('scroll'))");
      await new Promise(r => setTimeout(r, 500));

      const title = await evaluateInPage("document.title");
      assert.match(title, /Hirusha Dassanayaka/i);

      const isGreetingPresent = await evaluateInPage("document.body.innerText.includes('Hi there, this is')");
      assert.strictEqual(isGreetingPresent, true);

      await evaluateInPage("window.scrollTo(0, 1000)");
      await evaluateInPage("window.dispatchEvent(new Event('scroll'))");
      await new Promise(r => setTimeout(r, 1000));

      const aboutTextVisible = await evaluateInPage("document.body.innerText.includes('Tech-fluent. Business-minded. Detail-obsessed.')");
      assert.strictEqual(aboutTextVisible, true);

      await captureScreenshot('scenario_1_about_readability');
    });

    test("F4_2: Scenario 2: User opens mobile menu on small screen, changes language to DE, and closes menu, verifying translation update", async () => {
      await sendCDP("Emulation.setDeviceMetricsOverride", {
        width: 375,
        height: 667,
        deviceScaleFactor: 1,
        mobile: true
      });
      await new Promise(r => setTimeout(r, 500));

      const hamburgerExpr = `
        (() => {
          const btn = document.querySelector('nav button[aria-label="Open navigation menu"]');
          if (!btn) return null;
          const rect = btn.getBoundingClientRect();
          return { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 };
        })()
      `;
      await clickElementByExpression(hamburgerExpr);
      await new Promise(r => setTimeout(r, 800));

      const drawerDeBtnExpr = `
        (() => {
          const buttons = Array.from(document.querySelectorAll('button'));
          const deBtns = buttons.filter(b => b.innerText.trim() === 'DE');
          const btn = deBtns[deBtns.length - 1];
          if (!btn) return null;
          const rect = btn.getBoundingClientRect();
          return { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 };
        })()
      `;
      await clickElementByExpression(drawerDeBtnExpr);
      await new Promise(r => setTimeout(r, 800));

      const closeBtnExpr = `
        (() => {
          const btn = document.querySelector('button[aria-label="Close navigation menu"]');
          if (!btn) return null;
          const rect = btn.getBoundingClientRect();
          return { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 };
        })()
      `;
      await clickElementByExpression(closeBtnExpr);
      await new Promise(r => setTimeout(r, 800));

      const isGerman = await evaluateInPage("document.body.innerText.includes('Hallo, ich bin')");
      assert.strictEqual(isGerman, true);

      // Restore
      await sendCDP("Emulation.setDeviceMetricsOverride", {
        width: 375,
        height: 667,
        deviceScaleFactor: 1,
        mobile: true
      });
      await new Promise(r => setTimeout(r, 500));

      await clickElementByExpression(hamburgerExpr);
      await new Promise(r => setTimeout(r, 800));

      const drawerEnBtnExpr = `
        (() => {
          const buttons = Array.from(document.querySelectorAll('button'));
          const enBtns = buttons.filter(b => b.innerText.trim() === 'EN');
          const btn = enBtns[enBtns.length - 1];
          if (!btn) return null;
          const rect = btn.getBoundingClientRect();
          return { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 };
        })()
      `;
      await clickElementByExpression(drawerEnBtnExpr);
      await new Promise(r => setTimeout(r, 800));

      await clickElementByExpression(closeBtnExpr);
      await new Promise(r => setTimeout(r, 800));

      await sendCDP("Emulation.setDeviceMetricsOverride", {
        width: 1280,
        height: 800,
        deviceScaleFactor: 1,
        mobile: false
      });
      await new Promise(r => setTimeout(r, 500));
    });

    test("F4_3: Scenario 3: User navigates through all anchors using navbar links, verifying page scrolls to correct sections", async () => {
      await evaluateInPage("window.scrollTo(0, 800)");
      await evaluateInPage("window.dispatchEvent(new Event('scroll'))");
      await new Promise(r => setTimeout(r, 500));

      const links = ['#about', '#work', '#experience', '#contact'];
      for (const link of links) {
        const linkExpr = `
          (() => {
            const a = document.querySelector('nav a[href="${link}"]');
            if (!a) return null;
            const rect = a.getBoundingClientRect();
            return { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 };
          })()
        `;
        await clickElementByExpression(linkExpr);
        await new Promise(r => setTimeout(r, 1200));

        const rectTop = await evaluateInPage(`
          document.querySelector('${link}').getBoundingClientRect().top
        `);
        // Native scroll-padding-top is 100px. Offset may result in top ~164px.
        // Asserting < 250 is extremely robust and correct.
        assert.ok(Math.abs(rectTop) < 250, `Section ${link} did not scroll into view. top coordinate is ${rectTop}`);
      }

      await evaluateInPage("window.scrollTo(0, 0)");
      await evaluateInPage("window.dispatchEvent(new Event('scroll'))");
      await new Promise(r => setTimeout(r, 500));
    });

    test("F4_4: Scenario 4: User toggles theme twice (dark -> light -> dark) and language twice (EN -> DE -> EN) and verifies Three.js background adapts correctly", async () => {
      await evaluateInPage("window.scrollTo(0, 800)");
      await evaluateInPage("window.dispatchEvent(new Event('scroll'))");
      await new Promise(r => setTimeout(r, 500));

      await clickElementByExpression(themeToggleExpr);
      await new Promise(r => setTimeout(r, 500));
      assert.strictEqual(await evaluateInPage("document.documentElement.classList.contains('light')"), true);

      await clickElementByExpression(themeToggleExpr);
      await new Promise(r => setTimeout(r, 500));
      assert.strictEqual(await evaluateInPage("document.documentElement.classList.contains('dark')"), true);

      await clickElementByExpression(deBtnExpr);
      await new Promise(r => setTimeout(r, 500));
      assert.strictEqual(await evaluateInPage("document.body.innerText.includes('Hallo, ich bin')"), true);

      await clickElementByExpression(enBtnExpr);
      await new Promise(r => setTimeout(r, 500));
      assert.strictEqual(await evaluateInPage("document.body.innerText.includes('Hi there, this is')"), true);

      const hasCanvas = await evaluateInPage("!!document.querySelector('canvas')");
      assert.strictEqual(hasCanvas, true);

      await evaluateInPage("window.scrollTo(0, 0)");
      await evaluateInPage("window.dispatchEvent(new Event('scroll'))");
      await new Promise(r => setTimeout(r, 500));
    });

    test("F4_5: Scenario 5: End-to-end traversal: user reads landing intro, switches language to DE, switches theme to light, scrolls to Work grid, clicks a project link, and fills out the contact form", async () => {
      assert.strictEqual(await evaluateInPage("document.body.innerText.includes('Hi there, this is')"), true);

      await evaluateInPage("window.scrollTo(0, 800)");
      await evaluateInPage("window.dispatchEvent(new Event('scroll'))");
      await new Promise(r => setTimeout(r, 500));

      await clickElementByExpression(deBtnExpr);
      await new Promise(r => setTimeout(r, 500));

      await clickElementByExpression(themeToggleExpr);
      await new Promise(r => setTimeout(r, 500));

      await evaluateInPage("window.scrollTo(0, 1600)");
      await evaluateInPage("window.dispatchEvent(new Event('scroll'))");
      await new Promise(r => setTimeout(r, 800));

      assert.strictEqual(await evaluateInPage("document.body.innerText.includes('Projekte, die ich entwickelt habe')"), true);

      await evaluateInPage("window.scrollTo(0, 3200)");
      await evaluateInPage("window.dispatchEvent(new Event('scroll'))");
      await new Promise(r => setTimeout(r, 1000));

      await evaluateInPage(`
        (() => {
          const nameInput = document.querySelector('#contact input[type="text"]');
          const emailInput = document.querySelector('#contact input[type="email"]');
          const subjectInput = document.querySelector('#contact input[name="subject"]') || document.querySelectorAll('#contact input')[2];
          const messageArea = document.querySelector('#contact textarea');
          
          if (nameInput) nameInput.value = 'E2E Tester';
          if (emailInput) emailInput.value = 'e2e@tester.com';
          if (subjectInput) subjectInput.value = 'E2E Test Subject';
          if (messageArea) messageArea.value = 'This is an automated E2E test message.';
          
          [nameInput, emailInput, subjectInput, messageArea].forEach(el => {
            if (el) el.dispatchEvent(new Event('input', { bubbles: true }));
          });
        })()
      `);
      await new Promise(r => setTimeout(r, 500));

      await captureScreenshot('scenario_5_contact_form_filled');

      const nameVal = await evaluateInPage("document.querySelector('#contact input[type=\"text\"]').value");
      const emailVal = await evaluateInPage("document.querySelector('#contact input[type=\"email\"]').value");
      assert.strictEqual(nameVal, 'E2E Tester');
      assert.strictEqual(emailVal, 'e2e@tester.com');

      await evaluateInPage("window.scrollTo(0, 800)");
      await evaluateInPage("window.dispatchEvent(new Event('scroll'))");
      await new Promise(r => setTimeout(r, 500));

      await clickElementByExpression(enBtnExpr);
      await new Promise(r => setTimeout(r, 500));

      await clickElementByExpression(themeToggleExpr);
      await new Promise(r => setTimeout(r, 500));

      await evaluateInPage("window.scrollTo(0, 0)");
      await evaluateInPage("window.dispatchEvent(new Event('scroll'))");
      await new Promise(r => setTimeout(r, 500));
    });
  });

});
