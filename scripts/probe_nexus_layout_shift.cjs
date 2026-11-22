#!/usr/bin/env node
"use strict";
// Diagnose uncontrolled layout shifts without changing production behavior.
const {chromium} = require("playwright");
const fs = require("node:fs");
const OUT="artifacts/quality-stage4";
const BASE=(process.env.NEXUS_PREVIEW_URL||"http://127.0.0.1:8765/").replace(/\/?$/, "/");
(async()=>{
 const browser=await chromium.launch({headless:true});
 const audits=[];
 try{
  for(const width of [390,1440]){
   for(const blockFonts of [false,true]){
    const page=await browser.newPage({viewport:{width,height:900},locale:"es-MX"});
    if(blockFonts){await page.route(/fonts\.(googleapis|gstatic)\.com/,r=>r.abort());}
    await page.addInitScript(()=>{
     window.__nexusShifts=[];
     new PerformanceObserver(list=>{
      for(const entry of list.getEntries()) {
       window.__nexusShifts.push({time:Math.round(entry.startTime),score:entry.value,
        input:entry.hadRecentInput,
        sources:(entry.sources||[]).slice(0,5).map(s=>({element:s.node?.tagName,
         id:s.node?.id,className:typeof s.node?.className==="string"?s.node.className:"",
         before:s.previousRect,after:s.currentRect}))});
      }
     }).observe({type:"layout-shift",buffered:true});
    });
    const response=await page.goto(BASE,{waitUntil:"domcontentloaded",timeout:30000});
    await page.waitForTimeout(2500);
    const info=await page.evaluate(()=>({
      events:window.__nexusShifts||[],
      fonts:document.fonts.status,
      title:document.querySelector("h1")?.getBoundingClientRect().toJSON(),
      metrics:document.querySelector(".metrics")?.getBoundingClientRect().toJSON(),
      search:document.querySelector(".search-panel")?.getBoundingClientRect().toJSON(),
      layoutWidth:document.documentElement.scrollWidth,
      fontFamily:getComputedStyle(document.querySelector("h1")).fontFamily
    }));
    audits.push({width,blockFonts,status:response?.status(),score:info.events.filter(e=>!e.input).reduce((n,e)=>n+e.score,0),...info});
    await page.close();
   }
  }
  fs.mkdirSync(OUT,{recursive:true});
  fs.writeFileSync(OUT+"/layout-shift-probe.json",JSON.stringify({at:new Date().toISOString(),tests:audits},null,2)+"\n");
  for(const a of audits)console.log("CLS_PROBE width="+a.width+" fontsBlocked="+a.blockFonts+" score="+a.score+" shifts="+a.events.length+" top="+JSON.stringify(a.events.slice(0,3)).slice(0,450));
 }finally{await browser.close()}
})();
