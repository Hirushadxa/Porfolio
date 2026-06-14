import fs from 'fs';
import path from 'path';

const distPath = 'd:\\Cowork Playground\\Portfolio Website\\Antigravity working folder\\dist';
const assetsPath = path.join(distPath, 'assets');

console.log('--- Starting Build Verification ---');

// 1. Verify dist folder exists
if (!fs.existsSync(distPath)) {
  console.error('FAIL: dist folder does not exist. Did the build fail?');
  process.exit(1);
}

// 2. Find the CSS file in dist/assets
if (!fs.existsSync(assetsPath)) {
  console.error('FAIL: dist/assets folder does not exist.');
  process.exit(1);
}

const files = fs.readdirSync(assetsPath);
const cssFiles = files.filter(f => f.endsWith('.css'));

if (cssFiles.length === 0) {
  console.error('FAIL: No CSS file found in dist/assets.');
  process.exit(1);
}

const cssFileName = cssFiles[0];
const cssFilePath = path.join(assetsPath, cssFileName);
console.log(`Found compiled CSS file: ${cssFileName}`);

const cssContent = fs.readFileSync(cssFilePath, 'utf8');

// 3. Verify fluid-p-section compilation
// In Tailwind v4, custom utility `@utility fluid-p-section` compiles to `.fluid-p-section` class.
// We expect it to have:
// padding-top: clamp(4rem, 8vw, 8rem) (or padding-top:clamp(4rem,8vw,8rem))
// padding-bottom: clamp(4rem, 8vw, 8rem)
console.log('\n--- Checking for fluid-p-section ---');
const hasFluidPSection = cssContent.includes('.fluid-p-section');
console.log(`Contains '.fluid-p-section' class: ${hasFluidPSection ? 'YES' : 'NO'}`);

// Standardize whitespace for regex
const standardizedCss = cssContent.replace(/\s+/g, ' ');

// Look for .fluid-p-section styling patterns
const fluidPSectionRegex = /\.fluid-p-section\s*\{[^}]*\}/;
const matchFluidPSection = cssContent.match(fluidPSectionRegex);
if (matchFluidPSection) {
  console.log(`Matched CSS block: ${matchFluidPSection[0]}`);
}

const hasPaddingTop = /padding-top:\s*clamp\(\s*4rem\s*,\s*8vw\s*,\s*8rem\s*\)/.test(cssContent);
const hasPaddingBottom = /padding-bottom:\s*clamp\(\s*4rem\s*,\s*8vw\s*,\s*8rem\s*\)/.test(cssContent);

console.log(`Contains padding-top clamp: ${hasPaddingTop ? 'YES' : 'NO'}`);
console.log(`Contains padding-bottom clamp: ${hasPaddingBottom ? 'YES' : 'NO'}`);

if (!hasFluidPSection || !hasPaddingTop || !hasPaddingBottom) {
  console.error('FAIL: fluid-p-section styling is not correctly compiled or present.');
} else {
  console.log('SUCCESS: fluid-p-section verification passed.');
}

// 4. Verify custom tailwind selectors for mobile-menu-open
console.log('\n--- Checking for mobile-menu-open ---');
const hasMobileMenuOpenMain = cssContent.includes('.mobile-menu-open main');
console.log(`Contains '.mobile-menu-open main' selector: ${hasMobileMenuOpenMain ? 'YES' : 'NO'}`);

const mobileMenuRegex = /\.mobile-menu-open\s+main\s*\{[^}]*\}/;
const matchMobileMenu = cssContent.match(mobileMenuRegex);
if (matchMobileMenu) {
  console.log(`Matched CSS block: ${matchMobileMenu[0]}`);
}

if (!hasMobileMenuOpenMain) {
  console.error('FAIL: mobile-menu-open selector not found in compiled CSS.');
} else {
  console.log('SUCCESS: mobile-menu-open verification passed.');
}

// 5. Check index.html sanity
console.log('\n--- Checking index.html sanity ---');
const htmlPath = path.join(distPath, 'index.html');
if (!fs.existsSync(htmlPath)) {
  console.error('FAIL: dist/index.html does not exist.');
} else {
  const htmlContent = fs.readFileSync(htmlPath, 'utf8');
  const hasCssLink = htmlContent.includes(cssFileName);
  console.log(`index.html references compiled CSS: ${hasCssLink ? 'YES' : 'NO'}`);
  
  const jsFiles = files.filter(f => f.endsWith('.js'));
  if (jsFiles.length > 0) {
    const hasJsLink = htmlContent.includes(jsFiles[0]);
    console.log(`index.html references compiled JS (${jsFiles[0]}): ${hasJsLink ? 'YES' : 'NO'}`);
  } else {
    console.error('FAIL: No JS files found in dist/assets.');
  }
}

console.log('\n--- Verification Finished ---');
if (hasFluidPSection && hasPaddingTop && hasPaddingBottom && hasMobileMenuOpenMain) {
  console.log('ALL VERIFICATIONS PASSED.');
  process.exit(0);
} else {
  console.log('SOME VERIFICATIONS FAILED.');
  process.exit(1);
}
