/** D540: Playwright, from the project's node_modules or the machine's global install. */
import { createRequire } from "node:module";
export async function playwright() {
  try {
    return await import("playwright");
  } catch {
    const root = process.env.PLAYWRIGHT_ROOT ?? "/opt/node22/lib/node_modules/";
    return createRequire(root)("playwright");
  }
}
export const PORT = process.env.PORT ?? 5199;
export const probeUrl = () => `http://localhost:${PORT}/tools/playback/cpu/probe.html`;
export async function openProbe(browser, opts = {}) {
  const ctx = await browser.newContext(opts.phone ? { hasTouch: true, isMobile: true, viewport: { width: 844, height: 390 } } : {});
  const page = await ctx.newPage();
  page.on("pageerror", (e) => console.error("pageerror", e.message));
  const cdp = await ctx.newCDPSession(page);
  await page.goto(probeUrl());
  await page.waitForFunction(() => window.__ready, null, { timeout: 120000 });
  return { ctx, page, cdp };
}
export const LAUNCH = { args: ["--autoplay-policy=no-user-gesture-required"] };
