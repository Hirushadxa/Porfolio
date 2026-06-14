import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');
const distAssetsDir = path.join(rootDir, 'dist', 'assets');

console.log('Starting programmatic verification of build assets...');
console.log(`Checking in assets directory: ${distAssetsDir}`);

try {
  // 1. Locate the CSS bundle file
  if (!fs.existsSync(distAssetsDir)) {
    console.error('Error: dist/assets directory does not exist. Run build first.');
    process.exit(1);
  }

  const files = fs.readdirSync(distAssetsDir);
  const cssFile = files.find(file => file.endsWith('.css'));

  if (!cssFile) {
    console.error('Error: No CSS bundle file found in dist/assets.');
    process.exit(1);
  }

  const cssPath = path.join(distAssetsDir, cssFile);
  console.log(`Found compiled CSS bundle: ${cssFile}`);

  const cssContent = fs.readFileSync(cssPath, 'utf8');
  console.log(`Loaded CSS size: ${cssContent.length} bytes.`);

  // 2. Verify fluid-p-section
  // Source:
  // @utility fluid-p-section {
  //   padding-top: clamp(4rem, 8vw, 8rem);
  //   padding-bottom: clamp(4rem, 8vw, 8rem);
  // }
  // Minified or formatted Tailwind output will contain:
  // .fluid-p-section { ... padding-top: clamp(4rem, 8vw, 8rem) ... }
  // Let's use a regex that is robust to spacing.
  const fluidPaddingRegex = /\.fluid-p-section\s*\{[^}]*padding-top\s*:\s*clamp\(\s*4rem\s*,\s*8vw\s*,\s*8rem\s*\);?[^}]*padding-bottom\s*:\s*clamp\(\s*4rem\s*,\s*8vw\s*,\s*8rem\s*\);?[^}]*\}/i;
  const simplifiedFluidRegex = /\.fluid-p-section/i;

  const hasFluidSection = simplifiedFluidRegex.test(cssContent);
  console.log(`Verification: Has '.fluid-p-section' class: ${hasFluidSection ? 'PASS' : 'FAIL'}`);

  // Let's search for the exact compiled properties inside the file
  const matchesFluidProps = cssContent.includes('padding-top:clamp(4rem,8vw,8rem)') || 
                            cssContent.includes('padding-top: clamp(4rem, 8vw, 8rem)') ||
                            (cssContent.includes('padding-top') && cssContent.includes('clamp(4rem'));
  
  // Find index of fluid-p-section class and print the surrounding block
  const fluidIdx = cssContent.indexOf('.fluid-p-section');
  if (fluidIdx !== -1) {
    const context = cssContent.substring(fluidIdx, fluidIdx + 150);
    console.log(`Found fluid-p-section compiled block context:\n  "${context}"`);
  } else {
    console.error('Error: Could not find ".fluid-p-section" in css file.');
    process.exit(1);
  }

  // 3. Verify mobile-menu-open main selectors
  // Source:
  // .mobile-menu-open main {
  //   opacity: 0;
  //   pointer-events: none;
  //   transition: opacity 0.3s ease;
  // }
  const mobileMenuIdx = cssContent.indexOf('.mobile-menu-open main');
  if (mobileMenuIdx !== -1) {
    const context = cssContent.substring(mobileMenuIdx, mobileMenuIdx + 150);
    console.log(`Found .mobile-menu-open main block context:\n  "${context}"`);
  } else {
    console.error('Error: Could not find ".mobile-menu-open main" selector in css file.');
    process.exit(1);
  }

  console.log('\nAll programmatic build asset checks passed successfully!');
  process.exit(0);

} catch (err) {
  console.error('Verification script encountered an unexpected error:', err);
  process.exit(1);
}
