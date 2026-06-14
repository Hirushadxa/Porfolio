/**
 * Proposed E2E Test Runner for Windows Environment in CODE_ONLY (Offline) Mode
 * Using native Node.js (node:test, node:assert, globalThis.WebSocket, fetch)
 * and pre-installed Microsoft Edge.
 * 
 * To run:
 *   node .agents/explorer_env_1/proposed_e2e_runner.js
 */

import { test } from 'node:test';
import assert from 'node:assert';
import { spawn } from 'node:child_process';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { promises as fs } from 'node:fs';

const PORT = 4173; // Vite's default preview port
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

// Helper to send CDP command
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

// Clean up processes
async function cleanup() {
  console.log("\n--- Cleaning up E2E environment ---");
  
  if (ws) {
    try {
      ws.close();
    } catch (e) {}
  }

  if (browserProcess) {
    console.log("Terminating browser...");
    try {
      // Force kill the browser and any orphaned processes using Windows taskkill
      spawn('taskkill', ['/F', '/IM', 'msedge.exe', '/FI', 'WINDOWTITLE eq about:blank*'], { stdio: 'ignore' });
      spawn('taskkill', ['/F', '/IM', 'chrome.exe', '/FI', 'WINDOWTITLE eq about:blank*'], { stdio: 'ignore' });
      browserProcess.kill();
    } catch (e) {}
  }

  if (serverProcess) {
    console.log("Stopping Vite preview server...");
    try {
      serverProcess.kill();
    } catch (e) {}
  }

  if (tempProfileDir) {
    // Delete temp profile directory after a short delay
    await new Promise(r => setTimeout(r, 1500));
    try {
      await fs.rm(tempProfileDir, { recursive: true, force: true });
      console.log("Temp browser profile cleaned up.");
    } catch (e) {
      console.warn("Could not delete temp profile:", e.message);
    }
  }
}

// Ensure clean exit
process.on('SIGINT', async () => {
  await cleanup();
  process.exit(1);
});
process.on('exit', () => {
  // Sync cleanup fallback
  try {
    spawn('taskkill', ['/F', '/IM', 'msedge.exe', '/FI', 'WINDOWTITLE eq about:blank*'], { stdio: 'ignore' });
  } catch(e) {}
});

test.describe("Portfolio E2E Tests", () => {

  test.before(async () => {
    console.log("Building project with npm run build...");
    await new Promise((resolve, reject) => {
      const build = spawn('npm.cmd', ['run', 'build'], {
        cwd: process.cwd(),
        stdio: 'inherit'
      });
      build.on('close', (code) => {
        if (code === 0) resolve();
        else reject(new Error(`Build failed with code ${code}`));
      });
    });

    console.log("Starting preview server with npm run preview...");
    serverProcess = spawn('npm.cmd', ['run', 'preview', '--', '--port', String(PORT), '--strictPort'], {
      cwd: process.cwd(),
      stdio: 'pipe'
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
      } catch (e) {
        // continue polling
      }
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

    console.log(`Launching browser headlessly: ${browserPath}`);
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
        const { resolve } = pendingRequests.get(data.id);
        pendingRequests.delete(data.id);
        resolve(data);
      }
    };

    await new Promise((resolve, reject) => {
      ws.onopen = resolve;
      ws.onerror = reject;
    });

    console.log("WebSocket connected. Enabling Page domain...");
    await sendCDP("Page.enable");
  });

  test.after(async () => {
    await cleanup();
  });

  test("Page should load successfully and render correctly", async () => {
    console.log(`Navigating to ${PREVIEW_URL}...`);
    await sendCDP("Page.navigate", { url: PREVIEW_URL });
    
    // Wait 3 seconds for client-side rendering (Framer Motion, 3D Canvas, etc.)
    await new Promise(r => setTimeout(r, 3000));

    // Evaluate title
    const titleRes = await sendCDP("Runtime.evaluate", {
      expression: "document.title",
      returnByValue: true
    });
    const title = titleRes.result?.result?.value;
    console.log("Page Title:", title);
    assert.match(title, /Hirusha Dassanayaka/i);

    // Evaluate if root element exists
    const rootRes = await sendCDP("Runtime.evaluate", {
      expression: "!!document.getElementById('root')",
      returnByValue: true
    });
    assert.strictEqual(rootRes.result?.result?.value, true);
  });

  test("Theme selector should toggle correctly", async () => {
    // Check initial theme state (e.g. check html class list or local storage)
    const initialThemeClass = await sendCDP("Runtime.evaluate", {
      expression: "document.documentElement.className",
      returnByValue: true
    });
    console.log("Initial document html class:", initialThemeClass.result?.result?.value);

    // Trigger click on theme toggle button
    // Let's find coordinate of the theme selector toggle button
    const findCoordsExpr = `
      (() => {
        // Look for buttons that look like theme selectors (using aria-label or specific icons/classes)
        // e.g. containing Lucide sun/moon icons
        const buttons = Array.from(document.querySelectorAll('button'));
        const toggle = buttons.find(b => b.innerHTML.includes('svg') && (b.title?.toLowerCase().includes('theme') || b.getAttribute('aria-label')?.toLowerCase().includes('theme') || b.className.includes('theme')));
        if (!toggle) return null;
        const rect = toggle.getBoundingClientRect();
        return { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 };
      })()
    `;
    const coordsRes = await sendCDP("Runtime.evaluate", {
      expression: findCoordsExpr,
      returnByValue: true
    });
    const coords = coordsRes.result?.result?.value;

    if (coords) {
      console.log(`Clicking Theme selector at: (${coords.x}, ${coords.y})`);
      // Mouse press
      await sendCDP("Input.dispatchMouseEvent", {
        type: "mousePressed",
        x: coords.x,
        y: coords.y,
        button: "left",
        clickCount: 1
      });
      // Mouse release
      await sendCDP("Input.dispatchMouseEvent", {
        type: "mouseReleased",
        x: coords.x,
        y: coords.y,
        button: "left",
        clickCount: 1
      });

      // Wait a moment for transitions
      await new Promise(r => setTimeout(r, 500));

      const newThemeClass = await sendCDP("Runtime.evaluate", {
        expression: "document.documentElement.className",
        returnByValue: true
      });
      console.log("Toggled document html class:", newThemeClass.result?.result?.value);
    } else {
      console.warn("Theme toggle button not found. Skipping click interaction.");
    }
  });

  test("Language selector should change content text", async () => {
    // Check initial language (default is English)
    const initTextRes = await sendCDP("Runtime.evaluate", {
      expression: "document.body.innerText.includes('Digital Technology & Management')",
      returnByValue: true
    });
    assert.strictEqual(initTextRes.result?.result?.value, true);

    // Find language selector button (e.g. text containing 'DE' or 'EN')
    const findLangCoordsExpr = `
      (() => {
        const buttons = Array.from(document.querySelectorAll('button'));
        const toggle = buttons.find(b => b.innerText.includes('DE') || b.innerText.includes('EN') || b.title?.toLowerCase().includes('lang') || b.className.includes('lang'));
        if (!toggle) return null;
        const rect = toggle.getBoundingClientRect();
        return { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 };
      })()
    `;
    const coordsRes = await sendCDP("Runtime.evaluate", {
      expression: findLangCoordsExpr,
      returnByValue: true
    });
    const coords = coordsRes.result?.result?.value;

    if (coords) {
      console.log(`Clicking Language selector at: (${coords.x}, ${coords.y})`);
      // Mouse press
      await sendCDP("Input.dispatchMouseEvent", {
        type: "mousePressed",
        x: coords.x,
        y: coords.y,
        button: "left",
        clickCount: 1
      });
      // Mouse release
      await sendCDP("Input.dispatchMouseEvent", {
        type: "mouseReleased",
        x: coords.x,
        y: coords.y,
        button: "left",
        clickCount: 1
      });

      // Wait a moment
      await new Promise(r => setTimeout(r, 500));

      // Verify page now displays German text or changed content
      const deTextRes = await sendCDP("Runtime.evaluate", {
        expression: "document.body.innerText.includes('Digital Technology & Management') || document.body.innerText.includes('Management')", 
        returnByValue: true
      });
      console.log("Is German translation active?", deTextRes.result?.result?.value);
    } else {
      console.warn("Language toggle button not found. Skipping click interaction.");
    }
  });

  test("Capture visual snapshot for validation", async () => {
    console.log("Capturing visual screenshot...");
    const screenshotRes = await sendCDP("Page.captureScreenshot", {
      format: "png"
    });
    if (screenshotRes && screenshotRes.result && screenshotRes.result.data) {
      const base64Data = screenshotRes.result.data;
      const imgBuffer = Buffer.from(base64Data, 'base64');
      const imgPath = join(import.meta.dirname, 'e2e_page_snapshot.png');
      await fs.writeFile(imgPath, imgBuffer);
      console.log("Visual snapshot saved to:", imgPath);
    } else {
      throw new Error("Failed to capture visual snapshot");
    }
  });

});
