#!/usr/bin/env node
"use strict";
const { chromium } = require("playwright");
const fs = require("node:fs");
const assert = require("node:assert/strict");
const BASE = (process.env.NEXUS_BASE_URL || "https://tuconsultor.github.io/UnRepo/").replace(/\/?$/, "/");
const REPORT = "artifacts/browser-smoke";
const MIN_RESOURCES = 375;
const MIN_REPOS = 267;
const NEW_REPOS = [
  "diggerhq/opencomputer", "ysunyang4/nexus", "facebookresearch/demucs",
  "facebookresearch/audiocraft", "swivid/f5-tts", "audacity/audacity",
  "kde/kdenlive", "olive-editor/olive", "breakthrough/pyscenedetect",
  "zulko/moviepy", "subtitleedit/subtitleedit", "k4yt3x/video2x",
  "handbrake/handbrake", "obsproject/obs-studio"
];
async function retry(fn, label, attempts = 8, delayMs = 15000) {
  let problem;
  for (let n = 1; n <= attempts; n++) {
    try { return await fn(); }
    catch (e) {
      problem = e;
      console.warn(label + " attempt " + n + "/" + attempts + ": " + e.message);
      if (n < attempts) await new Promise(resolve => setTimeout(resolve, delayMs));
    }
  }
  throw new Error(label + ": " + problem.message);
}
(async () => {
  fs.mkdirSync(REPORT, { recursive: true });
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1280, height: 800 }, locale: "es-MX" });
  const jsErrors = [];
  page.on("pageerror", e => jsErrors.push(e.message));
  try {
    await retry(async () => {
      const response = await page.goto(BASE + "?audit=" + Date.now(), { waitUntil: "domcontentloaded", timeout: 30000 });
      assert.equal(response && response.status(), 200, "Site did not return HTTP 200");
      await page.waitForFunction(min => Number(document.querySelector("#totalStat")?.textContent) >= min, MIN_RESOURCES, {timeout: 12000});
      assert.ok(await page.locator("#catalog > *").count() > 0, "Catalog has no rendered cards");
      for (const category of ["sound", "editing", "delivery"]) {
        assert.equal(await page.locator('#category option[value="' + category + '"]').count(), 1);
      }
    }, "Live homepage");
    console.log("PASS homepage: 375+ resources, filter controls and rendered cards");

    await retry(async () => {
      const response = await page.request.get(BASE + "data/github-metadata.json?audit=" + Date.now());
      assert.equal(response.status(), 200, "Metadata HTTP failed");
      const data = await response.json();
      assert.equal(data.schema, 1);
      assert.ok(Object.keys(data.repos || {}).length >= MIN_REPOS, "Missing GitHub metadata records");
      for (const repo of NEW_REPOS) {
        assert.ok(data.repos[repo] && data.repos[repo].status !== "not_verified", "Missing metadata: " + repo);
      }
      assert.equal(data.repos["facebookresearch/demucs"].status, "archived");
    }, "Public GitHub metadata");
    console.log("PASS public metadata: 267+ GitHub records, all 14 new projects");

    await page.locator("#search").fill("AudioCraft");
    await page.waitForFunction(() => document.querySelector("#catalog")?.textContent?.includes("AudioCraft"), null, {timeout: 10000});
    console.log("PASS search");

    await page.locator("#clearFilters").click();
    await page.locator("#category").selectOption("sound");
    const sound = await page.locator("#catalog").textContent();
    for (const name of ["Demucs", "AudioCraft", "F5-TTS", "Audacity"]) {
      assert.ok(sound.includes(name), "Sound filter missing " + name);
    }
    console.log("PASS category filtering");

    await page.locator("#clearFilters").click();
    await page.locator("h1#page-title").click();
    await page.keyboard.type("xus");
    await page.locator("#nexusSecret").waitFor({ state: "visible", timeout: 10000 });
    assert.equal(await page.locator('#nexusSecret a[href="https://github.com/Tuconsultor/HUB-NFC"]').count(), 1);
    assert.equal(await page.locator('#nexusSecret a[href="https://rentahuman.ai/humans/yJ4sM0eBbL5ZW2WpSpOn"]').count(), 1);
    await page.locator("#nexusSecretClose").click();
    await page.locator("#nexusSecret").waitFor({ state: "hidden", timeout: 10000 });
    console.log("PASS desktop Easter egg and private routes");

    const mobile = await browser.newPage({viewport: {width: 390, height: 844}, isMobile: true});
    await mobile.goto(BASE, {waitUntil: "domcontentloaded", timeout: 30000});
    for (let n = 0; n < 5; n++) await mobile.locator("#brand .logo").click({force:true, timeout:3000});
    await mobile.locator("#nexusSecret").waitFor({state:"visible", timeout:10000});
    await mobile.close();
    console.log("PASS mobile Easter egg");

    for (const relative of ["rea-roadmap.html", "intelligence.html", "resiliencia-agentes.html", "soporte-remoto-windows.html", "assets/social/unrepo-icon-2026.png"]) {
      const response = await page.request.get(BASE + relative);
      assert.equal(response.status(), 200, "Broken internal file: " + relative);
    }
    console.log("PASS internal pages and icon");
    assert.deepEqual(jsErrors, [], "Uncaught JavaScript errors");
    await page.screenshot({path: REPORT + "/success.png"});
    fs.writeFileSync(REPORT + "/result.json", JSON.stringify({status:"passed", at:new Date().toISOString(), site:BASE}, null, 2));
    console.log("SUCCESS: public site interaction checked in real Chromium");
  } catch (error) {
    console.error("FAILED:", error.stack || error);
    try { await page.screenshot({path:REPORT + "/failure.png", fullPage:true}); } catch (_) {}
    fs.writeFileSync(REPORT + "/result.json", JSON.stringify({status:"failed", at:new Date().toISOString(), error:String(error.stack || error)}, null, 2));
    process.exitCode = 1;
  } finally {
    await browser.close();
  }
})();
