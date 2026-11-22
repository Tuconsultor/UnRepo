#!/usr/bin/env node
"use strict";
// Summarize Lighthouse laboratory metrics. Field Core Web Vitals must be sourced separately.
const fs = require("node:fs");
const path = require("node:path");
const assert = require("node:assert/strict");
const out = "artifacts/quality-stage4";
const reportFiles = ["lighthouse-home-mobile.json","lighthouse-home-desktop.json","lighthouse-space-mobile.json"];
const metrics = ["first-contentful-paint","largest-contentful-paint","speed-index","total-blocking-time","cumulative-layout-shift","interaction-to-next-paint"];
const report = {generatedAt:new Date().toISOString(),measurement:"Lighthouse controlled synthetic laboratory",
  fieldMetricsAvailable:false,labReports:[],targets:{performanceMobile:90,accessibility:95,lcpMs:2500,cls:0.1},
  important:"Lighthouse synthetic LCP/CLS are not the 75th percentile CrUX field Core Web Vitals. INP requires real interactions."};
for(const file of reportFiles){
  const filename=path.join(out,file);
  assert.ok(fs.existsSync(filename),"Lighthouse report missing: "+file);
  const raw=JSON.parse(fs.readFileSync(filename,"utf8"));
  const scores={};
  for(const key of ["performance","accessibility","best-practices","seo"]){
    const score=raw.categories?.[key]?.score;
    scores[key]=score===null||score===undefined?null:Math.round(score*100);
  }
  const values={};
  for(const key of metrics) {
    const datum=raw.audits?.[key];
    values[key]={numericValue:Number.isFinite(datum?.numericValue)?datum.numericValue:null,displayValue:datum?.displayValue||null};
  }
  const findings=Object.entries(raw.audits||{}).filter(([key,val])=>val?.details&&typeof val.score==="number"&&val.score<0.9&&val.scoreDisplayMode!=="notApplicable").map(([key,val])=>({id:key,title:val.title,score:val.score,displayValue:val.displayValue||null})).slice(0,35);
  report.labReports.push({name:file,url:raw.finalDisplayedUrl||raw.finalUrl,fetchTime:raw.fetchTime,
    lighthouseVersion:raw.lighthouseVersion,formFactor:raw.configSettings?.formFactor,
    scores,metrics:values,findings});
}
fs.writeFileSync(path.join(out,"lighthouse-summary.json"),JSON.stringify(report,null,2)+"\n");
for(const r of report.labReports) {
  console.log("LIGHTHOUSE "+r.name+" "+JSON.stringify({scores:r.scores,lcpMs:r.metrics["largest-contentful-paint"].numericValue,cls:r.metrics["cumulative-layout-shift"].numericValue,tbtMs:r.metrics["total-blocking-time"].numericValue}));
}
console.log("Lab goals are diagnostic; target misses are recorded as issues rather than silently treated as compliant.");
