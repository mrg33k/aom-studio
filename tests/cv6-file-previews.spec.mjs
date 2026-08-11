import { test, expect } from 'playwright/test'

const BASE = process.env.CV6_AUDIT_BASE || 'http://127.0.0.1:5173'

function fixtureFile(kind = 'html') {
  return {
    html: { url: 'https://fixture.local/review-page.html', name: 'review-page.html', mime: 'text/html' },
    pdf: { url: `${BASE}/artlink/Artlink_Brand_Standards.pdf`, name: 'Artlink_Brand_Standards.pdf', mime: 'application/pdf' },
    image: { url: `${BASE}/corner-og.png`, name: 'corner-og.png', mime: 'image/png' },
    video: { url: `${BASE}/ConradFoundation/nancy-sample-tile-v1.mp4`, name: 'nancy-sample-tile-v1.mp4', mime: 'video/mp4' },
  }[kind] || null
}

async function installFixtureRoutes(page) {
  const comments = new Map()

  await page.route('https://fixture.local/**', async (route) => {
    const url = new URL(route.request().url())
    if (url.pathname.endsWith('/review-page.html')) {
      await route.fulfill({
        status: 200,
        contentType: 'text/html',
        headers: { 'Access-Control-Allow-Origin': '*' },
        body: `<!doctype html>
          <html><head><style>body{margin:0;font:16px system-ui;background:#f7f3eb;color:#172033}main{padding:48px}h1{margin:0 0 12px;color:#1740b8}img{width:48px;height:48px}</style></head>
          <body><main><h1>HTML preview is live</h1><p>Corner rendered this saved page without leaving review.</p><img src="./preview-pixel.svg" alt="Relative asset"></main></body></html>`,
      })
      return
    }
    await route.fulfill({
      status: 200,
      contentType: 'image/svg+xml',
      headers: { 'Access-Control-Allow-Origin': '*' },
      body: '<svg xmlns="http://www.w3.org/2000/svg" width="48" height="48"><rect width="48" height="48" rx="9" fill="#ffb000"/></svg>',
    })
  })

  await page.route('**/api/dashboard/review-comments*', async (route) => {
    const request = route.request()
    if (request.method() === 'GET') {
      const id = new URL(request.url()).searchParams.get('deliverable') || ''
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ ok: true, list: comments.get(id) || [] }) })
      return
    }
    const body = request.postDataJSON()
    if (body.action === 'add') {
      const current = comments.get(body.deliverable) || []
      current.push({ ...body, id: `pin-${current.length + 1}` })
      comments.set(body.deliverable, current)
    } else if (body.action === 'delete') {
      comments.set(body.deliverable, (comments.get(body.deliverable) || []).filter((item) => item.id !== body.id))
    }
    await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ ok: true }) })
  })

  await page.route('**/api/dashboard/projects*', (route) => route.fulfill({
    status: 200,
    contentType: 'application/json',
    body: JSON.stringify({ ok: true, projects: [] }),
  }))
  await page.route('**/api/dashboard/missions-tree*', (route) => route.fulfill({
    status: 200,
    contentType: 'application/json',
    body: JSON.stringify({ ok: true, projects: [] }),
  }))
  await page.route('**/api/dashboard/review-queue*', (route) => {
    const kind = new URL(page.url()).searchParams.get('preview') || 'html'
    const file = fixtureFile(kind)
    return route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        ok: true,
        items: [{
          id: file.url,
          path: file.url,
          name: file.name,
          mime: file.mime,
          type: { key: 'copy', label: 'Copy' },
          project: '',
          mission: '',
          last_modified: '2026-07-14T12:00:00.000Z',
        }],
        total: 1,
        counts: { waiting: 1 },
      }),
    })
  })
  await page.route('**/api/dashboard/files*', (route) => route.fulfill({
    status: 200,
    contentType: 'application/json',
    body: JSON.stringify({
      ok: true,
      files: [],
      uploads: [
        fixtureFile('html'),
        fixtureFile('pdf'),
        fixtureFile('image'),
        fixtureFile('video'),
      ],
      files_truth: { ghosts: [], counts: { waitingTotal: 0 } },
    }),
  }))
}

test('HTML, PDF, image, and video stay reviewable with point comments', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 950 })
  await installFixtureRoutes(page)

  const pageErrors = []
  page.on('pageerror', (error) => pageErrors.push(error.message))
  await page.goto(`${BASE}/dashboard?cv6=1&demo=file-previews`, { waitUntil: 'domcontentloaded' })

  const htmlFrame = page.locator('[data-html-frame]')
  await expect(htmlFrame).toBeVisible({ timeout: 15_000 })
  await expect(htmlFrame.contentFrame().getByRole('heading', { name: 'HTML preview is live' })).toBeVisible()
  await expect(htmlFrame.contentFrame().getByAltText('Relative asset')).toHaveJSProperty('complete', true)
  await expect(page.getByText(/must be downloaded|preview is not available/i)).toHaveCount(0)

  await page.getByRole('button', { name: 'Pin mode: off' }).click()
  await page.locator('.pinshield:visible').click({ position: { x: 230, y: 170 } })
  await page.getByPlaceholder('Comment on this spot…').fill('Keep this headline treatment.')
  await page.getByRole('button', { name: 'Comment', exact: true }).click()
  await expect(page.getByText('Keep this headline treatment.')).toBeVisible()

  await page.goto(`${BASE}/dashboard?cv6=1&demo=file-previews&preview=pdf`, { waitUntil: 'domcontentloaded' })
  await expect(page.locator('[data-pdf-page="1"] canvas')).toBeVisible({ timeout: 20_000 })
  expect(await page.locator('[data-pdf-page]').count()).toBeGreaterThanOrEqual(1)

  await page.goto(`${BASE}/dashboard?cv6=1&demo=file-previews&preview=image`, { waitUntil: 'domcontentloaded' })
  const image = page.locator('.doc img[data-kind="image"]').first()
  await expect(image).toBeVisible()
  await expect.poll(() => image.evaluate((node) => node.naturalWidth)).toBeGreaterThan(0)

  await page.goto(`${BASE}/dashboard?cv6=1&demo=file-previews&preview=video`, { waitUntil: 'domcontentloaded' })
  const video = page.locator('.doc video').first()
  await expect(video).toBeVisible()
  await expect.poll(() => video.evaluate((node) => node.readyState), { timeout: 15_000 }).toBeGreaterThanOrEqual(1)
  await expect(page.locator('[data-vscrub]')).toBeVisible({ timeout: 5_000 })

  await expect(page.getByText(/must be downloaded|preview is not available|couldn't load this/i)).toHaveCount(0)
  expect(pageErrors).toEqual([])
})

test('mobile Files opens out-of-tree previews and keeps comments attached', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 })
  await installFixtureRoutes(page)

  const pageErrors = []
  page.on('pageerror', (error) => pageErrors.push(error.message))
  await page.goto(`${BASE}/dashboard?cv6=1&demo=file-previews`, { waitUntil: 'domcontentloaded' })

  const htmlFrame = page.locator('[data-html-frame]')
  await expect(htmlFrame).toBeVisible({ timeout: 15_000 })
  await expect(htmlFrame.contentFrame().getByRole('heading', { name: 'HTML preview is live' })).toBeVisible()
  await page.getByRole('button', { name: 'Pin mode: off' }).click()
  await page.locator('.pinshield:visible').click({ position: { x: 120, y: 120 } })
  await page.getByPlaceholder('Comment on this spot…').fill('Mobile review stays connected.')
  await page.getByRole('button', { name: 'Comment', exact: true }).click()
  await expect(page.locator('.doc > .pin').first()).toBeVisible()
  await page.getByRole('button', { name: 'Pin mode: on' }).click()
  await page.locator('.doc > .pin').first().click()
  await expect(page.getByText('Mobile review stays connected.')).toBeVisible()

  await page.goto(`${BASE}/dashboard?cv6=1&demo=file-previews&preview=pdf`, { waitUntil: 'domcontentloaded' })
  await expect(page.locator('[data-pdf-page="1"] canvas')).toBeVisible({ timeout: 20_000 })

  await page.goto(`${BASE}/dashboard?cv6=1&demo=file-previews&preview=image`, { waitUntil: 'domcontentloaded' })
  const image = page.locator('.doc img[data-kind="image"]').first()
  await expect(image).toBeVisible()
  await expect.poll(() => image.evaluate((node) => node.naturalWidth)).toBeGreaterThan(0)

  await page.goto(`${BASE}/dashboard?cv6=1&demo=file-previews&preview=video`, { waitUntil: 'domcontentloaded' })
  const video = page.locator('.doc video').first()
  await expect(video).toBeVisible()
  await expect.poll(() => video.evaluate((node) => node.readyState), { timeout: 15_000 }).toBeGreaterThanOrEqual(1)
  await expect(video).toHaveAttribute('controls', '')

  await expect(page.getByText(/must be downloaded|preview is not available|couldn't load this/i)).toHaveCount(0)
  expect(pageErrors).toEqual([])
})
