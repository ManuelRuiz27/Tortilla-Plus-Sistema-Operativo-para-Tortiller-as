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
    baseURL: "http://127.0.0.1:5179",
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
      command: "npm run build -w @tortilla-plus/api && npm run db:seed -w @tortilla-plus/api && npm run start -w @tortilla-plus/api",
      cwd: rootDir,
      env: {
        DATABASE_URL: "postgresql://tortilla_plus:tortilla_plus_dev@localhost:5432/tortilla_plus?schema=public",
        HOST: "127.0.0.1",
        JWT_SECRET: "change_me_in_local_development",
        PORT: "3199"
      },
      reuseExistingServer: false,
      timeout: 60_000,
      url: "http://127.0.0.1:3199/api/v1/health"
    },
    {
      command: "npm run dev -w @tortilla-plus/web -- --host 127.0.0.1 --port 5179",
      cwd: rootDir,
      env: {
        VITE_API_BASE_URL: "http://127.0.0.1:3199/api/v1",
        VITE_APP_ENV: "audit",
        VITE_USE_MOCKS: "false"
      },
      reuseExistingServer: false,
      timeout: 60_000,
      url: "http://127.0.0.1:5179"
    }
  ]
});
