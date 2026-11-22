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
      // Stage 1 UX invariants: the search must precede all five unchanged guide/lab blocks.
      const discovery = await page.evaluate(() => {
        const pos = selector => {
          const node = document.querySelector(selector);
          return node ? node.getBoundingClientRect().top + window.scrollY : NaN;
        };
        return {
          resources: Number(document.querySelector("#totalStat").textContent),
          searchTop: pos(".search-panel"),
          guideTop: pos(".knowledge-hub"),
          resultsTop: pos('#resultsTitle'),
          guideCount: document.querySelectorAll(".knowledge-hub > .resilience-banner").length,
          filterOpen: document.querySelector("#advancedFilters").open,
        };
      });
      assert.equal(discovery.resources, 391, "Stage 1 modified the complete catalog");
      assert.equal(discovery.guideCount, 5, "Guide and laboratory links were lost");
      assert.ok(discovery.searchTop < discovery.guideTop && discovery.guideTop < discovery.resultsTop,
        "Discovery-first visual ordering failed");
      assert.equal(discovery.filterOpen, true, "Desktop advanced filters must remain visible");
      console.log("PASS Stage 1 desktop hierarchy, catalog preservation and five guide blocks");
      // Stage 2: each card keeps complete factual copy, source URL and advisories.
      const integrity = await page.evaluate(() => {
        const failures = [];
        for (const item of resources) {
          const rendered = card(item);
          const meta = metadataFor(item);
          const val = (selector) => rendered.querySelector(selector)?.textContent || "";
          if (val("h3") !== item.title) failures.push(item.url + ": title");
          if (val(".resource-desc") !== (item.desc || "Recurso disponible en su sitio original.")) failures.push(item.url + ": description");
          if (rendered.querySelector("a.external")?.href !== item.url) failures.push(item.url + ": destination");
          if (val(".resource-caution") !== "Precaución: " + meta.caution) failures.push(item.url + ": caution");
          if (!val(".card-type") || !val(".card-details-toggle").includes("precauciones")) failures.push(item.url + ": discoverability");
          if (rendered.querySelectorAll(".resource-facts-primary .fact").length !== 2) failures.push(item.url + ": primary facts");
          const primary = val(".resource-facts-primary");
          if (!primary.includes("Nivel") || !primary.includes(meta.level) ||
              !primary.includes("Licencia") || !primary.includes(meta.license)) failures.push(item.url + ": level/license");
          if (rendered.querySelector(".card-details")?.open) failures.push(item.url + ": disclosure initial state");
        }
        return {total: resources.length, failures: failures.slice(0,12), failuresCount: failures.length};
      });
      assert.equal(integrity.total, 391, "Stage 2 catalog count changed");
      assert.deepEqual(integrity.failures, [], "Stage 2 card invariants failed: " + integrity.failuresCount);
      assert.equal(integrity.failuresCount, 0, "Stage 2 contains altered resource content");
      assert.ok(await page.locator("#catalog .card .card-details").count() >= 24, "Cards lack semantic disclosure");
      await page.locator("#catalog .card .card-details summary").first().click();
      assert.equal(await page.locator("#catalog .card .card-details").first().evaluate(el => el.open), true,
        "Stage 2 details cannot be opened");
      assert.ok(await page.locator("#catalog .card .resource-caution").first().isVisible(),
        "Stage 2 caution inaccessible after disclosure");
      await page.locator("#catalog .card .card-details summary").first().press("Enter");
      assert.equal(await page.locator("#catalog .card .card-details").first().evaluate(el => el.open), false,
        "Stage 2 disclosure cannot be closed with keyboard");
      for (const width of [320, 375, 768, 1024, 1440]) {
        await page.setViewportSize({width, height:900});
        const geometry = await page.evaluate(() => ({
          documentWidth:document.documentElement.scrollWidth,
          viewportWidth:window.innerWidth,
          cardWidth:document.querySelector("#catalog .card").getBoundingClientRect().width,
          cardScrollWidth:document.querySelector("#catalog .card").scrollWidth
        }));
        assert.ok(geometry.documentWidth <= geometry.viewportWidth + 2,
          "Stage 2 horizontal overflow at " + width + "px: " + JSON.stringify(geometry));
        assert.ok(geometry.cardScrollWidth <= geometry.cardWidth + 2,
          "Stage 2 card content overflow at " + width + "px: " + JSON.stringify(geometry));
        await page.locator("#catalog .card").first().screenshot({path: REPORT + "/stage2-card-" + width + ".png"});
      }
      await page.setViewportSize({width:1280, height:800});
      console.log("PASS Stage 2 cards: 391/391 titles, descriptions, licenses, sources and cautions; disclosure + 5 widths");
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

      // Open Silicon Lab is verified against the proposed PR build, not production.
      assert.equal(await page.locator('#category option[value="silicon"]').count(), 1, "Missing silicon category");
      assert.equal(await page.locator("#siliconLabOpen").count(), 1, "Missing silicon entrypoint");
      await page.locator("#category").selectOption("silicon");
      const siliconUrls = await page.locator("#catalog .card a.external").evaluateAll(
        anchors => anchors.map(anchor => anchor.href)
      );
      const expectedSilicon = [
        "https://github.com/YosysHQ/yosys",
        "https://github.com/librelane/librelane",
        "https://github.com/The-OpenROAD-Project/OpenROAD",
        "https://www.tinytapeout.com/"
      ];
      assert.deepEqual(siliconUrls.slice().sort(), expectedSilicon.slice().sort(), "Silicon links or cards differ");
      await page.locator("#search").fill("Yosys");
      assert.equal(await page.locator("#catalog .card").count(), 1, "Silicon search must return a single matching card");
      await page.locator("#clearFilters").click();
      const siliconGuide = await browser.newPage({ viewport: { width: 1280, height: 800 }, locale: "es-MX" });
      const guideResponse = await siliconGuide.goto(BASE + "silicon-lab.html", { waitUntil: "domcontentloaded" });
      assert.equal(guideResponse && guideResponse.status(), 200, "Silicon Lab guide failed HTTP");
      assert.ok((await siliconGuide.locator("h1").textContent()).includes("un chip de verdad"));
      assert.equal(await siliconGuide.locator(".flow .step").count(), 4, "Missing four design steps");
      await siliconGuide.locator(".faq summary").first().click();
      assert.equal(await siliconGuide.locator(".faq details[open]").count(), 1, "Native FAQ interaction failed");
      await siliconGuide.close();
      console.log("PASS Open Silicon Lab: four cards, sources, filter/search and guide interaction");
      // Open Space Lab must be verifiably interactive and have four unique source cards.
      assert.equal(await page.locator('#category option[value="space"]').count(), 1, "Missing space category");
      assert.equal(await page.locator('#spaceLabOpen[href="./space-lab.html"]').count(), 1, "Missing space lab entrypoint");
      await page.locator("#category").selectOption("space");
      const spaceUrls = await page.locator("#catalog .card a.external").evaluateAll(
        anchors => anchors.map(anchor => anchor.href)
      );
      const expectedSpace = [
        "https://network.satnogs.org/",
        "https://github.com/CS-SI/Orekit",
        "https://github.com/nasa/openmct",
        "https://github.com/nasa/cFS"
      ];
      assert.deepEqual(spaceUrls.slice().sort(), expectedSpace.slice().sort(), "Space catalog cards or source URLs differ");
      await page.locator("#search").fill("Orekit");
      assert.equal(await page.locator("#catalog .card").count(), 1, "Space category search failed");
      await page.locator("#clearFilters").click();

      const spacePage = await browser.newPage({ viewport: { width: 1280, height: 800 }, locale: "es-MX" });
      const spaceResponse = await spacePage.goto(BASE + "space-lab.html", { waitUntil: "domcontentloaded" });
      assert.equal(spaceResponse && spaceResponse.status(), 200, "Space Lab guide failed HTTP");
      assert.ok((await spacePage.locator("h1").textContent()).includes("El espacio"));
      assert.equal(await spacePage.locator(".path article").count(), 4, "Missing four space learning steps");
      assert.ok((await spacePage.locator("#periodOut").textContent()).includes("min"), "Simulator not initialized");
      const basePeriod = Number((await spacePage.locator("#periodOut").textContent()).split(" ")[0].replace(",", "."));
      await spacePage.locator("#altitude").evaluate(el => { el.value = "1000"; el.dispatchEvent(new Event("input", { bubbles: true })); });
      const higherPeriod = Number((await spacePage.locator("#periodOut").textContent()).split(" ")[0].replace(",", "."));
      assert.ok(higherPeriod > basePeriod && basePeriod > 80, "Circular orbit period must increase with altitude");
      assert.equal(await spacePage.locator("#preset").inputValue(), "custom", "Manual control did not select custom profile");
      await spacePage.locator("#toggleMotion").click();
      assert.equal(await spacePage.locator("#toggleMotion").getAttribute("aria-pressed"), "false", "Motion pause button failed");
      await spacePage.locator("#resetOrbit").click();
      assert.equal(await spacePage.locator("#altitudeOut").textContent(), "420 km", "Reset did not restore LEO profile");
      assert.equal(await spacePage.locator('a[href="https://network.satnogs.org/observations/"]').count(), 1, "Real observations source missing");
      const spaceMobile = await browser.newPage({ viewport: { width: 390, height: 844 }, isMobile: true });
      await spaceMobile.goto(BASE + "space-lab.html", { waitUntil: "domcontentloaded" });
      assert.ok((await spaceMobile.locator("#periodOut").textContent()).includes("min"), "Mobile simulator did not initialize");
      assert.ok(await spaceMobile.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 2), "Space Lab mobile overflow");
      await spaceMobile.close();
      await spacePage.close();
      console.log("PASS Open Space Lab: four cards, search, math controls, pause/reset, source attribution and mobile viewport");


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
    if (PREVIEW_MODE) {
      assert.equal(await mobile.locator("#advancedFilters").evaluate(el => el.open), false,
        "Mobile advanced filters should start collapsed");
      await mobile.locator("#advancedFilters summary").click();
      assert.equal(await mobile.locator("#advancedFilters").evaluate(el => el.open), true,
        "Mobile advanced filters did not expand");
      await mobile.locator("#advancedFilters summary").click();
      assert.equal(await mobile.locator("#sidebar").getAttribute("aria-hidden"), "true",
        "Closed mobile navigation must be hidden to assistive technology");
      assert.equal(await mobile.locator("#sidebar").evaluate(el => el.inert), true,
        "Closed mobile navigation must be inert");
      await mobile.locator("#menuBtn").click();
      assert.equal(await mobile.locator("#sidebar").getAttribute("aria-hidden"), "false");
      await mobile.keyboard.press("Escape");
      assert.equal(await mobile.locator("#menuBtn").getAttribute("aria-expanded"), "false",
        "Escape did not close the mobile drawer");
      assert.equal(await mobile.locator("#sidebar").evaluate(el => el.inert), true);
      assert.ok(await mobile.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 2),
        "Stage 1 caused mobile horizontal page overflow");
      console.log("PASS Stage 1 mobile disclosure, accessible drawer and no page overflow");
    }
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

    for (const relative of ["rea-roadmap.html", "intelligence.html", "resiliencia-agentes.html", "soporte-remoto-windows.html", "assets/social/unrepo-icon-2026.png", ...(PREVIEW_MODE ? ["silicon-lab.html", "space-lab.html"] : [])]) {
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
