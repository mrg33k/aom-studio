import { chromium } from 'playwright';
import fs from 'fs';
import path from 'path';

const OUTPUT_DIR = '/Users/aom-inhouse/Documents/Dev/aom-studio-transfer/AOM-EA/projects/sys/qa-final';

const VIEWPORTS = [
  { name: 'desktop-1440', width: 1440, height: 900 },
  { name: 'mobile-390', width: 390, height: 844 },
  { name: 'mobile-375', width: 375, height: 667 },
];

const PAGES = [
  { slug: 'landing', url: 'https://aheadofmarket.com/', password: null },
  { slug: 'skills', url: 'https://aheadofmarket.com/skills', password: null },
  { slug: 'finance', url: 'https://aheadofmarket.com/finance', password: 'aom2026' },
  { slug: 'sourcing', url: 'https://aheadofmarket.com/sourcing', password: null },
];

const results = [];

async function checkPage(page, slug, url, viewport, password) {
  const consoleErrors = [];
  const consoleWarnings = [];
  let financeApiError = false;

  page.on('console', msg => {
    if (msg.type() === 'error') {
      const text = msg.text();
      consoleErrors.push(text);
      if (text.includes("Unexpected token '/'") || text.includes('Unexpected token')) {
        financeApiError = true;
      }
    }
    if (msg.type() === 'warning') {
      consoleWarnings.push(msg.text());
    }
  });

  page.on('pageerror', err => {
    consoleErrors.push(`[PAGE ERROR] ${err.message}`);
  });

  await page.goto(url, { waitUntil: 'networkidle', timeout: 30000 });

  // Handle password gate if needed
  if (password) {
    // Check for password input
    const pwInput = page.locator('input[type="password"]');
    const pwVisible = await pwInput.isVisible().catch(() => false);
    if (pwVisible) {
      await pwInput.fill(password);
      await page.keyboard.press('Enter');
      await page.waitForLoadState('networkidle').catch(() => {});
      await page.waitForTimeout(2000);
    } else {
      // Try text input that might be password
      const textInput = page.locator('input[type="text"]').first();
      const textVisible = await textInput.isVisible().catch(() => false);
      if (textVisible) {
        await textInput.fill(password);
        await page.keyboard.press('Enter');
        await page.waitForLoadState('networkidle').catch(() => {});
        await page.waitForTimeout(2000);
      }
    }
  }

  // Wait for content to settle
  await page.waitForTimeout(1500);

  // Screenshot
  const screenshotName = `${slug}-${viewport.name}.png`;
  const screenshotPath = path.join(OUTPUT_DIR, screenshotName);
  await page.screenshot({ path: screenshotPath, fullPage: true });

  // Check horizontal overflow
  const overflow = await page.evaluate(() => {
    return document.documentElement.scrollWidth > document.documentElement.clientWidth;
  });

  // Check small fonts (< 12px on visible text nodes)
  const smallFonts = await page.evaluate(() => {
    const issues = [];
    const allEls = document.querySelectorAll('*');
    allEls.forEach(el => {
      const text = el.textContent?.trim();
      if (!text || text.length < 2) return;
      // Only leaf nodes (no significant children with text)
      const children = el.children;
      let hasTextChild = false;
      for (let i = 0; i < children.length; i++) {
        if (children[i].textContent?.trim()) {
          hasTextChild = true;
          break;
        }
      }
      if (hasTextChild) return;

      const style = window.getComputedStyle(el);
      const fs = parseFloat(style.fontSize);
      const display = style.display;
      const visibility = style.visibility;
      const opacity = parseFloat(style.opacity);

      if (display === 'none' || visibility === 'hidden' || opacity === 0) return;

      const rect = el.getBoundingClientRect();
      if (rect.width === 0 || rect.height === 0) return;

      if (fs < 12 && !isNaN(fs)) {
        issues.push(`"${text.substring(0, 30)}" @ ${fs}px (${el.tagName.toLowerCase()}.${[...el.classList].join('.')})`);
      }
    });
    return issues.slice(0, 10); // cap at 10
  });

  // Check touch targets on mobile
  let smallTouchTargets = [];
  if (viewport.width <= 430) {
    smallTouchTargets = await page.evaluate(() => {
      const issues = [];
      const interactives = document.querySelectorAll('button, a, [role="button"], input, select, textarea');
      interactives.forEach(el => {
        const style = window.getComputedStyle(el);
        if (style.display === 'none' || style.visibility === 'hidden') return;
        const rect = el.getBoundingClientRect();
        if (rect.width === 0 || rect.height === 0) return;
        if (rect.height < 44) {
          const label = el.textContent?.trim().substring(0, 30) || el.getAttribute('aria-label') || el.getAttribute('href') || el.tagName;
          issues.push(`"${label}" h=${Math.round(rect.height)}px w=${Math.round(rect.width)}px`);
        }
      });
      return issues.slice(0, 10); // cap at 10
    });
  }

  const isMobile = viewport.width <= 430;
  const issues = [];

  if (overflow) {
    issues.push('HORIZONTAL OVERFLOW detected');
  }
  if (smallFonts.length > 0) {
    issues.push(`Small fonts (${smallFonts.length}): ${smallFonts.slice(0, 3).join(' | ')}`);
  }
  if (isMobile && smallTouchTargets.length > 0) {
    issues.push(`Small touch targets (${smallTouchTargets.length}): ${smallTouchTargets.slice(0, 3).join(' | ')}`);
  }
  if (consoleErrors.length > 0) {
    const dedupedErrors = [...new Set(consoleErrors)].slice(0, 5);
    issues.push(`Console errors (${consoleErrors.length}): ${dedupedErrors.join(' | ')}`);
  }

  const financeTokenError = consoleErrors.some(e => e.includes("Unexpected token") && e.includes('/'));

  return {
    slug,
    url,
    viewport: viewport.name,
    screenshotPath,
    overflow,
    smallFonts: smallFonts.length,
    smallFontDetails: smallFonts,
    smallTouchTargets: smallTouchTargets.length,
    smallTouchDetails: smallTouchTargets,
    consoleErrors: [...new Set(consoleErrors)],
    financeApiError: financeTokenError,
    issues,
    pass: issues.length === 0,
  };
}

(async () => {
  console.log('Starting final QA pass -- 2026-03-28 post-WD40\n');

  const browser = await chromium.launch({ headless: true });

  for (const vp of VIEWPORTS) {
    for (const pg of PAGES) {
      const context = await browser.newContext({
        viewport: { width: vp.width, height: vp.height },
        userAgent: vp.width <= 430
          ? 'Mozilla/5.0 (iPhone; CPU iPhone OS 16_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.0 Mobile/15E148 Safari/604.1'
          : undefined,
        isMobile: vp.width <= 430,
        hasTouch: vp.width <= 430,
      });
      const page = await context.newPage();

      console.log(`Testing ${pg.slug} @ ${vp.name}...`);

      try {
        const result = await checkPage(page, pg.slug, pg.url, vp, pg.password);
        results.push(result);
        console.log(`  ${result.pass ? 'PASS' : 'FAIL'} -- ${result.issues.length} issues`);
        if (result.issues.length > 0) {
          result.issues.forEach(i => console.log(`    - ${i}`));
        }
      } catch (err) {
        console.log(`  ERROR: ${err.message}`);
        results.push({
          slug: pg.slug,
          url: pg.url,
          viewport: vp.name,
          issues: [`TIMEOUT/ERROR: ${err.message}`],
          pass: false,
          error: err.message,
        });
      }

      await context.close();
    }
  }

  await browser.close();

  // ---- Generate Report ----
  const totalTests = results.length;
  const passCount = results.filter(r => r.pass).length;
  const failCount = totalTests - passCount;
  const allIssues = results.flatMap(r => r.issues.map(i => `${r.slug}@${r.viewport}: ${i}`));

  let report = `FINAL QA -- 2026-03-28 post-WD40\n`;
  report += `${'='.repeat(60)}\n\n`;

  for (const vp of VIEWPORTS) {
    report += `VIEWPORT: ${vp.name} (${vp.width}x${vp.height})\n`;
    report += `${'-'.repeat(40)}\n`;

    for (const pg of PAGES) {
      const r = results.find(x => x.slug === pg.slug && x.viewport === vp.name);
      if (!r) continue;

      const status = r.pass ? 'PASS' : 'FAIL';
      report += `[${pg.slug.toUpperCase()}] @ ${vp.name}: ${status}\n`;

      if (!r.pass) {
        r.issues.forEach(issue => {
          report += `  - ${issue}\n`;
        });
      }

      // Always report finance API error check
      if (pg.slug === 'finance') {
        const apiErrorPresent = r.financeApiError;
        report += `  Finance API error (Unexpected token '/'): ${apiErrorPresent ? 'STILL PRESENT -- FAIL' : 'GONE -- OK'}\n`;
      }
    }
    report += '\n';
  }

  report += `${'='.repeat(60)}\n`;
  report += `Summary: ${passCount}/${totalTests} pass, ${failCount} issues remaining\n\n`;

  if (allIssues.length > 0) {
    report += `All Issues:\n`;
    allIssues.forEach(i => report += `  - ${i}\n`);
  } else {
    report += `No issues found. All checks green.\n`;
  }

  // Per-page detail section
  report += `\n${'='.repeat(60)}\nDetailed Findings\n${'='.repeat(60)}\n`;
  for (const r of results) {
    report += `\n${r.slug.toUpperCase()} @ ${r.viewport}\n`;
    report += `  URL: ${r.url}\n`;
    report += `  Screenshot: ${r.screenshotPath || 'N/A'}\n`;
    report += `  Overflow: ${r.overflow ? 'YES -- FAIL' : 'no'}\n`;
    report += `  Small fonts: ${r.smallFonts || 0}\n`;
    if (r.smallFontDetails?.length > 0) {
      r.smallFontDetails.slice(0, 5).forEach(f => report += `    ${f}\n`);
    }
    report += `  Small touch targets: ${r.smallTouchTargets || 0}\n`;
    if (r.smallTouchDetails?.length > 0) {
      r.smallTouchDetails.slice(0, 5).forEach(t => report += `    ${t}\n`);
    }
    report += `  Console errors: ${r.consoleErrors?.length || 0}\n`;
    if (r.consoleErrors?.length > 0) {
      r.consoleErrors.slice(0, 5).forEach(e => report += `    ${e}\n`);
    }
  }

  const reportPath = path.join(OUTPUT_DIR, 'report.txt');
  fs.writeFileSync(reportPath, report);
  console.log('\n' + report);
  console.log(`\nReport saved: ${reportPath}`);
})();
