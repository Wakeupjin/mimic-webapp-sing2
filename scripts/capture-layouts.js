const { chromium } = require("playwright");
const fs = require("fs");
const path = require("path");

const BASE = process.env.BASE_URL || "http://localhost:3000";
const OUT = process.argv[2] || path.join(__dirname, "../docs/responsive-audit/before");

const devices = [
  { id: "mobile", width: 390, height: 844 },
  { id: "tablet", width: 768, height: 1024 },
  { id: "pc", width: 1440, height: 900 },
];

const screens = [
  { id: "home-live", url: "/" },
  {
    id: "home-menu",
    url: "/",
    after: async (page) => {
      await page.locator("main button").first().click();
      await page.waitForTimeout(700);
    },
  },
  { id: "login-live", url: "/auth/login" },
  { id: "signup-live", url: "/auth/signup" },
  { id: "selecting", url: "/dev/layout-lab?screen=selecting" },
  { id: "watching", url: "/dev/layout-lab?screen=watching" },
  { id: "mimicking", url: "/dev/layout-lab?screen=mimicking" },
  { id: "guessing", url: "/dev/layout-lab?screen=guessing" },
  { id: "word", url: "/dev/layout-lab?screen=word" },
  { id: "guess-result", url: "/dev/layout-lab?screen=guess-result" },
  { id: "admin", url: "/dev/layout-lab?screen=admin" },
];

(async () => {
  fs.mkdirSync(OUT, { recursive: true });
  const browser = await chromium.launch({ headless: true });
  for (const device of devices) {
    const page = await browser.newPage({
      viewport: { width: device.width, height: device.height },
      deviceScaleFactor: 1,
    });
    for (const screen of screens) {
      const file = path.join(OUT, `${screen.id}__${device.id}.png`);
      try {
        await page.goto(BASE + screen.url, { waitUntil: "domcontentloaded", timeout: 25000 });
        await page.waitForTimeout(500);
        if (screen.after) await screen.after(page);
        await page.screenshot({ path: file, fullPage: false });
        console.log("ok", path.basename(file));
      } catch (error) {
        console.error("fail", screen.id, device.id, error.message);
      }
    }
    await page.close();
  }
  await browser.close();
})();
