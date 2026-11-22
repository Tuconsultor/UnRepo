#!/usr/bin/env node
"use strict";
const { chromium } = require("playwright");
const fs = require("node:fs");
const assert = require("node:assert/strict");
const BASE = (process.env.NEXUS_BASE_URL || "https://tuconsultor.github.io/UnRepo/").replace(/\/?$/, "/");
const REPORT = "artifacts/browser-smoke";
const MIN_RESOURCES = Number(process.env.NEXUS_MIN_RESOURCES || 375);
const MIN_REPOS = Number(process.env.NEXUS_MIN_REPOS || 267);
const PREVIEW_MODE = process.env.NEXUS_PREVIEW === "1";
const PREVIEW_COHORT = [
  ["cantools", "https://github.com/cantools/cantools"],
  ["evcc", "https://github.com/evcc-io/evcc"],
  ["Zigbee2MQTT", "https://github.com/Koenkk/zigbee2mqtt"],
  ["fq", "https://github.com/wader/fq"],
  ["Legacy Update", "https://github.com/LegacyUpdate/LegacyUpdate"]
];
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
    console.log("PASS homepage: " + MIN_RESOURCES + "+ resources, filter controls and rendered cards");

    // A pull request must prove its proposed changes work in a real browser,
    // not just prove that the already deployed public site still works.
    if (PREVIEW_MODE) {
      for (const [query, canonicalUrl] of PREVIEW_COHORT) {
        await page.locator("#search").fill(query);
        const links = await page.locator("#catalog .card a.external").evaluateAll(
          anchors => anchors.map(anchor => anchor.href)
        );
        assert.ok(links.includes(canonicalUrl), "Preview search omitted " + canonicalUrl);
      }
      await page.locator("#clearFilters").click();
      console.log("PASS proposed cohort: five independently reviewed cards are searchable and link to sources");
      // OSINT Lab must be functional in PR preview, not merely present in HTML.
      assert.equal(await page.locator('#category option[value="osint"]').count(), 1);
      assert.equal(await page.locator("#osintLabOpen").count(), 1);
      await page.locator("#osintLabOpen").click();
      assert.equal(await page.locator("#category").inputValue(), "osint", "OSINT Lab entrypoint did not select the category");
      const osintUrls = await page.locator("#catalog .card a.external").evaluateAll(
        anchors => anchors.map(a => a.href)
      );
      const expectedOsint = [
        "https://github.com/tyrasd/overpass-turbo",
        "https://github.com/smicallef/spiderfoot",
        "https://github.com/exiftool/exiftool"
      ];
      assert.deepEqual(osintUrls.slice().sort(), expectedOsint.slice().sort(), "OSINT category cards or canonical destinations differ");
      await page.locator("#search").fill("ExifTool");
      assert.equal(await page.locator("#catalog .card").count(), 1, "OSINT search did not narrow the results");
      assert.ok((await page.locator("#catalog").textContent()).includes("ExifTool"));
      await page.locator("#clearFilters").click();
      console.log("PASS OSINT Lab: visible entrypoint, 3 cards, canonical links and working search/filter");

    }

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
    await page.waitForFunction(() => { const text = document.querySelector("#catalog")?.textContent || ""; return text.includes("AudioCraft") && !text.includes("OpenComputer"); }, null, {timeout: 10000});
    console.log("PASS search");

    await page.locator("#clearFilters").click();
    await page.locator("#category").selectOption("sound");
    const sound = await page.locator("#catalog").textContent();
    for (const name of ["Demucs", "AudioCraft", "F5-TTS", "Audacity"]) {
      assert.ok(sound.includes(name), "Sound filter missing " + name);
    }
    console.log("PASS category filtering");

    // Verify order, pagination, favorites and persistence without changing production data.
    await page.locator("#clearFilters").click();
    await page.locator("#sort").selectOption("name");
    const sortedNames = await page.locator("#catalog .card h3").allTextContents();
    assert.ok(sortedNames.length >= 2 && sortedNames.every((name, i) => i === 0 || sortedNames[i - 1].localeCompare(name, "es") <= 0), "Name sort is not ascending");
    await page.locator("#sort").selectOption("original");
    assert.equal(await page.locator("#catalog .card").count(), 24, "Initial page size changed");
    await page.locator("#loadMore").click();
    assert.equal(await page.locator("#catalog .card").count(), 48, "Load more failed");
    await page.locator("#catalog .card .favorite").first().click();
    assert.equal(await page.locator("#savedStat").textContent(), "1", "Favorite not saved");
    await page.reload({waitUntil: "domcontentloaded"});
    await page.waitForFunction(min => Number(document.querySelector("#totalStat")?.textContent) >= min, MIN_RESOURCES);
    assert.equal(await page.locator("#savedStat").textContent(), "1", "Favorite did not persist on reload");
    await page.locator("#favToggle").click();
    assert.equal(await page.locator("#catalog .card").count(), 1, "Favorites filter failed");
    await page.locator("#favToggle").click();
    await page.locator("#catalog .card .favorite").first().click();
    assert.equal(await page.locator("#savedStat").textContent(), "0", "Favorite cleanup failed");
    await page.locator("#search").fill("__NEXUS_NO_RESULTS_TEST__");
    assert.equal(await page.locator("#catalog .empty").count(), 1, "Empty result state missing");
    await page.locator("#clearFilters").click();
    console.log("PASS sorting, incremental loading, favorites persistence and empty state");

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
    await mobile.waitForFunction(min => Number(document.querySelector("#totalStat")?.textContent) >= min, MIN_RESOURCES);
    await mobile.locator("#menuBtn").click();
    // Visibility is not enough: the responsive sidebar animates in from offscreen.
    // Wait for the logo's bounding box to enter the viewport before real pointer clicks.
    await mobile.waitForFunction(() => {
      const el = document.querySelector("#brand .logo");
      if (!el) return false;
      const box = el.getBoundingClientRect();
      return box.width > 0 && box.left >= 0 && box.right <= window.innerWidth;
    }, null, {timeout: 10000});
    for (let n = 0; n < 5; n++) await mobile.locator("#brand .logo").click({timeout:3000});
    await mobile.locator("#nexusSecret").waitFor({state:"visible", timeout:10000});
    await mobile.locator("#nexusSecretClose").click();
    // The app closes the sidebar on pointerdown outside it (including modal close).
    assert.equal(await mobile.locator("#menuBtn").getAttribute("aria-expanded"), "false", "Mobile sidebar remained open unexpectedly");
    await mobile.locator("#category").selectOption("sound");
    assert.ok((await mobile.locator("#catalog .card").count()) >= 4, "Mobile category filter returned too few cards");
    await mobile.locator("#search").fill("AudioCraft");
    assert.ok((await mobile.locator("#catalog").textContent()).includes("AudioCraft"), "Mobile search failed");
    await mobile.close();
    console.log("PASS mobile menu, Easter egg, search and category filter");

    for (const relative of ["rea-roadmap.html", "intelligence.html", "resiliencia-agentes.html", "soporte-remoto-windows.html", "assets/social/unrepo-icon-2026.png"]) {
      const response = await page.request.get(BASE + relative);
      assert.equal(response.status(), 200, "Broken internal file: " + relative);
    }
    console.log("PASS internal pages and icon");
    const noCachePage = await browser.newPage({viewport:{width:1280,height:800}});
    await noCachePage.route("**/data/github-metadata.json**", route => route.abort());
    await noCachePage.goto(BASE, {waitUntil:"domcontentloaded", timeout:30000});
    await noCachePage.waitForFunction(min => Number(document.querySelector("#totalStat")?.textContent) >= min, MIN_RESOURCES);
    assert.ok(await noCachePage.locator("#catalog .card").count() > 0, "Missing metadata interrupted catalog rendering");
    await noCachePage.close();
    console.log("PASS graceful behavior when GitHub metadata is unavailable");
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
