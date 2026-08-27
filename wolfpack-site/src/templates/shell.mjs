import { asset, escapeHtml } from '../lib/html.mjs'

function canonicalUrl(page, site) {
  return `${site.url}${page.slug ? `${page.slug}/` : ''}`
}

export function renderPage(page, site) {
  const title = escapeHtml(page.title)
  const description = escapeHtml(page.description || page.title)
  const canonical = canonicalUrl(page, site)

  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${title} | Wolfpack Companies</title>
  <meta name="description" content="${description}">
  <link rel="canonical" href="${canonical}">
  <link rel="stylesheet" href="${asset('site.css')}">
  <script src="${asset('site.js')}" defer></script>
</head>
<body>
  <main id="main-content">
    <h1>${title}</h1>
  </main>
</body>
</html>
`
}
