import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { playwright } from '@vitest/browser-playwright'

// Browser-mode tests for the React frontend, run in the pre-installed Chromium
// through Vitest's Playwright provider. The installed browser build (1194) is
// older than the one this Playwright would fetch, so we launch the on-disk
// binary directly instead of letting Playwright download its own.
export default defineConfig({
  plugins: [react()],
  test: {
    include: ['test/browser/**/*.test.jsx'],
    setupFiles: ['test/browser/setup.js'],
    browser: {
      enabled: true,
      provider: playwright({
        launchOptions: {
          executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome',
        },
      }),
      headless: true,
      screenshotFailures: false,
      instances: [{ browser: 'chromium' }],
    },
  },
})
