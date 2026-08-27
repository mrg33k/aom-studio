import { defineConfig } from '@playwright/test'

export default defineConfig({
  testDir: '../tests',
  testMatch: 'wolfpack-responsive.spec.mjs',
  timeout: 45000,
  use: { baseURL: 'http://127.0.0.1:4175', trace: 'retain-on-failure' },
  webServer: {
    command: 'npm run build && python3 -m http.server 4175 --directory dist',
    url: 'http://127.0.0.1:4175',
    cwd: new URL('.', import.meta.url).pathname,
    reuseExistingServer: false,
    timeout: 60000,
  },
})
