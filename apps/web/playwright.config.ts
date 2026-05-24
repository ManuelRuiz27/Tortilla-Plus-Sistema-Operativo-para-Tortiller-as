import path from "node:path";
import { fileURLToPath } from "node:url";
import { defineConfig, devices } from "@playwright/test";

const currentDir = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(currentDir, "../..");

export default defineConfig({
  testDir: "./e2e",
  timeout: 30_000,
  expect: {
    timeout: 10_000
  },
  use: {
    baseURL: "http://127.0.0.1:5173",
    trace: "on-first-retry"
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] }
    }
  ],
  webServer: [
    {
      command: "npm run dev:api",
      cwd: rootDir,
      reuseExistingServer: true,
      timeout: 60_000,
      url: "http://127.0.0.1:3000/api/v1/health"
    },
    {
      command: "npm run dev:web -- --host 127.0.0.1",
      cwd: rootDir,
      env: {
        VITE_API_BASE_URL: "http://127.0.0.1:3000/api/v1",
        VITE_APP_ENV: "audit",
        VITE_USE_MOCKS: "false"
      },
      reuseExistingServer: true,
      timeout: 60_000,
      url: "http://127.0.0.1:5173"
    }
  ]
});
