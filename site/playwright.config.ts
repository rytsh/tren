import { defineConfig } from "@playwright/test";
export default defineConfig({
  testDir:"./tests/e2e",
  timeout:60000,
  use:{ baseURL:"http://127.0.0.1:4173", viewport:{width:1440,height:900}, launchOptions:{ executablePath: process.env.CHROME_PATH, args:["--use-gl=angle","--use-angle=swiftshader","--enable-unsafe-swiftshader"] } },
  webServer:{ command:"pnpm exec vite preview --port 4173 --host 127.0.0.1", url:"http://127.0.0.1:4173", reuseExistingServer:true },
});
