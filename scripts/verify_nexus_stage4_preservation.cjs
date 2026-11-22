#!/usr/bin/env node
"use strict";
// Proves that Stage 4 edited only pre-approved accessibility and font delivery markup.
const assert=require("node:assert/strict");
const fs=require("node:fs");
const cp=require("node:child_process");
// The preservation contract is relative to the immutable parent of the Stage 4
// squash merge, not to origin/main, which changes after that PR is integrated.
const ORIGINAL_STAGE4_BASE="5a47f2c7aa314bf3650e01bd8f6e675c5084422e^";
const paths=[
"index.html","rea-roadmap.html","intelligence.html","resiliencia-agentes.html",
"soporte-remoto-windows.html","silicon-lab.html","space-lab.html"
];
for(const path of paths){
 const original=cp.execFileSync("git",["show",ORIGINAL_STAGE4_BASE+":"+path],{encoding:"utf8"});
 let candidate=fs.readFileSync(path,"utf8");
 candidate=candidate.replace('<link rel="icon" type="image/png" href="./assets/social/unrepo-icon-2026.png">',"");
 if(path==="index.html") {
  candidate=candidate.replace('id="activeFilters" role="group" aria-label','id="activeFilters" aria-label');
  candidate=candidate.replace("&display=optional","&display=swap");
 }
 if(path==="rea-roadmap.html")candidate=candidate.replace('<pre id="prompt" tabindex="0">','<pre id="prompt">');
 if(path==="intelligence.html")candidate=candidate.replace('aria-label="UNREPO · NEXUS — Volver al catálogo Nexus"','aria-label="Volver al catálogo Nexus"');
 if(path==="resiliencia-agentes.html") {
  candidate=candidate.replace('<pre tabindex="0"><code>','<pre><code>');
  candidate=candidate.replaceAll('<div class="table-wrap" tabindex="0">','<div class="table-wrap">');
 }
 if(path==="soporte-remoto-windows.html") {
  candidate=candidate.replaceAll('<pre tabindex="0">','<pre>');
  candidate=candidate.replace("&display=optional","&display=swap");
 }
 assert.equal(candidate,original,path+": unapproved content, interaction, data or structure changes");
 console.log("PASS EXACT_CONTENT "+path);
}
console.log("PASS Stage 4 preservation: all 7 original HTML files recovered byte-for-byte");
