#!/usr/bin/env node
"use strict";
// Stage 4: production byte parity + live/preview WCAG 2.2 automated regression.
// No user data is collected. This is not a substitute for manual WCAG review.
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const crypto = require("node:crypto");
const cp = require("node:child_process");
const {chromium} = require("playwright");
const PUBLIC = (process.env.NEXUS_PUBLIC_URL || "https://tuconsultor.github.io/UnRepo/").replace(/\/?$/, "/");
const LOCAL = (process.env.NEXUS_PREVIEW_URL || "http://127.0.0.1:8765/").replace(/\/?$/, "/");
const OUT = "artifacts/quality-stage4";
const ROUTES = ["index.html","rea-roadmap.html","intelligence.html","resiliencia-agentes.html","soporte-remoto-windows.html","silicon-lab.html","space-lab.html"];
const ASSETS = [...ROUTES, "assets/css/nexus-stage3.css"];
const sha256 = bytes => crypto.createHash("sha256").update(bytes).digest("hex");
const tags = ["wcag2a","wcag2aa","wcag21a","wcag21aa","wcag22aa"];
const audited = [];
function writeReport(name,data) { fs.writeFileSync(path.join(OUT,name),JSON.stringify(data,null,2)+"\n") }
function compareViolations(baseline,candidate) {
  const original = new Map(baseline.map(v=>[v.id, v.nodes.length]));
  return candidate.filter(v=>(v.nodes.length>(original.get(v.id)||0))).map(v=>({id:v.id,impact:v.impact,old:original.get(v.id)||0,new:v.nodes.length}));
}
async function testPublicFiles(request) {
  const results = [];
  for(const rel of ASSETS) {
    const expected = cp.execFileSync("git",["show","origin/main:"+rel]);
    const response = await request.get(PUBLIC+rel+"?stage4="+Date.now(),{timeout:30000});
    const data = await response.body();
    const actual = {route:rel,status:response.status(),type:response.headers()["content-type"]||null,
      expectedSha256:sha256(expected),servedSha256:sha256(data),bytes:data.length,match:data.equals(expected)};
    results.push(actual);
    if(response.status()!==200 || !actual.match) {
      console.error("PUBLIC_PARITY_FAIL "+JSON.stringify(actual));
    }else console.log("PASS PUBLIC_PARITY "+rel+" bytes="+data.length);
  }
  writeReport("production-parity.json",{base:PUBLIC,checkedAt:new Date().toISOString(),results});
  assert.ok(results.every(x=>x.status===200&&x.match),"Published files differ from origin/main (or HTTP error)");
}
async function audit(browser,base,scope) {
  const records = [];
  for(const rel of ROUTES) {
    const page = await browser.newPage({viewport:{width:390,height:844},locale:"es-MX",reducedMotion:"reduce"});
    const failures = [];
    page.on("pageerror",error=>failures.push(error.message));
    try {
      const response=await page.goto(base+rel+"?quality="+Date.now(),{waitUntil:"domcontentloaded",timeout:30000});
      assert.equal(response?.status(),200,"Page not available "+base+rel);
      if(rel==="index.html") await page.waitForFunction(()=>Number(document.querySelector("#totalStat")?.textContent)>=391,null,{timeout:15000});
      await page.addScriptTag({path:require.resolve("axe-core/axe.min.js")});
      const result=await page.evaluate(async checks => window.axe.run(document,{runOnly:{type:"tag",values:checks},resultTypes:["violations","incomplete"]}),tags);
      const outline=await page.evaluate(()=>({
        lang:document.documentElement.lang,
        headings:[...document.querySelectorAll("h1")].map(x=>x.textContent.trim()),
        horizontalOverflow:document.documentElement.scrollWidth-window.innerWidth,
        reducedMotion:matchMedia("(prefers-reduced-motion: reduce)").matches,
        links:[...document.querySelectorAll('a[href^="./"]')].length,
        bodyToken:getComputedStyle(document.body).getPropertyValue("--nx-accent").trim()
      }));
      const violations=result.violations.map(v=>({id:v.id,impact:v.impact,description:v.help,helpUrl:v.helpUrl,
        tags:v.tags.filter(t=>t.startsWith("wcag")),nodes:v.nodes.map(n=>({target:n.target,summary:n.failureSummary?.slice(0,280)}))}));
      const rec={scope,route:rel,base,outline,violations,incomplete:result.incomplete.map(v=>({id:v.id,nodes:v.nodes.length})),pageErrors:failures};
      records.push(rec);
      console.log("AUDIT "+scope+" "+rel+": violations="+violations.length+" targets="+violations.reduce((a,v)=>a+v.nodes.length,0)+" overflow="+outline.horizontalOverflow);
    } finally {await page.close()}
  }
  writeReport(scope+"-axe.json",records);
  return records;
}
(async()=>{
  fs.mkdirSync(OUT,{recursive:true});
  let browser;
  try {
    browser=await chromium.launch({headless:true});
    const request=await (await browser.newContext()).request;
    await testPublicFiles(request);
    const production=await audit(browser,PUBLIC,"production");
    // Post-deploy checks run against the published version, not a historical PR baseline.
    if (process.env.NEXUS_AUDIT_MODE === "production") {
      const report={checkedAt:new Date().toISOString(),mode:"production",publicUrl:PUBLIC,
        filesVerified:ASSETS.length,pagesVerified:ROUTES.length,
        pages:production.map(x=>({route:x.route,violations:x.violations.length,
          pageErrors:x.pageErrors,horizontalOverflow:x.outline.horizontalOverflow}))};
      writeReport("production-deployment-summary.json",report);
      assert.ok(production.every(x=>x.violations.length===0),
        "Deployed pages have automated axe WCAG A/AA violations");
      assert.ok(production.every(x=>!x.pageErrors.length&&x.outline.horizontalOverflow<=2),
        "Deployed pages have JS errors or horizontal overflow");
      console.log("PASS POST_DEPLOY: "+ASSETS.length+" exact public hashes, "
        +ROUTES.length+" pages without automated WCAG violations or JS errors");
      return;
    }
    const preview=await audit(browser,LOCAL,"preview");
    const deltas=[];
    for(let i=0;i<ROUTES.length;i++){
      const extra=compareViolations(production[i].violations,preview[i].violations);
      if(extra.length)deltas.push({route:ROUTES[i],newOrIncreased:extra});
    }
    const report={checkedAt:new Date().toISOString(),tools:{browser:"Playwright Chromium",accessibility:"axe-core",tags},routes:ROUTES,
      baselineViolations:production.map(x=>({route:x.route,rules:x.violations.length,nodes:x.violations.reduce((a,v)=>a+v.nodes.length,0)})),
      candidateViolations:preview.map(x=>({route:x.route,rules:x.violations.length,nodes:x.violations.reduce((a,v)=>a+v.nodes.length,0)})),
      regressions:deltas,notes:["axe is automated coverage, not a full WCAG 2.2 AA certification","Lighthouse lab results are not CrUX 28-day field percentiles"]};
    writeReport("summary.json",report);
    if(deltas.length)console.error("WCAG_REGRESSIONS "+JSON.stringify(deltas));
    assert.deepEqual(deltas,[],"New or increased accessibility violations in candidate");
    assert.ok(preview.every(x=>x.violations.length===0),"Automated WCAG A/AA violations remain in the candidate");
    assert.ok(preview.every(x=>!x.pageErrors.length&&x.outline.horizontalOverflow<=2),"Preview JS/overflow regression");
    console.log("PASS production parity + WCAG automated comparative audit. Review baseline violations in artifacts.");
  }catch(error){console.error("STAGE4_FAIL",error.stack||error);process.exitCode=1}
  finally{if(browser)await browser.close()}
})();
