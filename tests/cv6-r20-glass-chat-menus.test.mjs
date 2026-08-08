import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const css = fs.readFileSync(new URL('../src/dashboard/cv6next/cv6.css', import.meta.url), 'utf8');

function ruleFor(selector) {
  const escaped = selector.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const match = css.match(new RegExp(`${escaped}\\s*\\{([\\s\\S]*?)\\}`));
  assert.ok(match, `missing CSS rule for ${selector}`);
  return match[1];
}

test('glass theme provides a solid menu surface token', () => {
  const glassTheme = ruleFor('[data-cv6][data-theme="glass"]');
  const globalGlassTheme = ruleFor('[data-cv6][data-app-theme="glass"], [data-app-theme="glass"] [data-cv6]');

  assert.match(glassTheme, /--composer-solid:\s*#111820/);
  assert.match(globalGlassTheme, /--composer-solid:\s*#111820/);
});

test('chat header menus use the solid surface rather than translucent panel glass', () => {
  for (const selector of ['[data-cv6] .cv6-chat-more-menu', '[data-cv6] .cv6-work-dropdown']) {
    const rule = ruleFor(selector);
    assert.match(rule, /background:\s*var\(--composer-solid,\s*#131317\)/);
    assert.doesNotMatch(rule, /background:\s*var\(--surface\)/);
    assert.match(rule, /backdrop-filter:\s*none/);
    assert.match(rule, /isolation:\s*isolate/);
  }
});

test('dark and light modes also define non-transparent solid menu surfaces', () => {
  assert.match(ruleFor('[data-cv6][data-theme="dark"]'), /--composer-solid:\s*#131317/);
  assert.match(ruleFor('[data-cv6][data-theme="light"]'), /--composer-solid:\s*#FFFFFF/);
});
