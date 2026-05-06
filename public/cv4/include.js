// include.js — Simple component inclusion helper (20 lines)
// Usage: <div data-include="components/my-component.html"></div>
// The script loads the HTML and replaces the element with its contents.

document.addEventListener('DOMContentLoaded', async () => {
  const includes = document.querySelectorAll('[data-include]');

  for (const el of includes) {
    const path = el.getAttribute('data-include');
    if (!path) continue;

    try {
      const response = await fetch(path);
      if (!response.ok) throw new Error(`Failed to load ${path}`);
      const html = await response.text();
      el.outerHTML = html;
    } catch (err) {
      console.error(`[include.js] ${err.message}`);
      el.innerHTML = `<div class="text-muted">Component load failed: ${path}</div>`;
    }
  }
});
