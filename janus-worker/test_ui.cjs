// Node-based UI contract smoke test with isolated DOM/fetch stubs. No network required.
const fs = require("node:fs");
const vm = require("node:vm");
const assert = require("node:assert/strict");

class FakeElement {
  constructor(tag="div") {
    this.tag=tag;this.children=[];this.textContent="";this.hidden=false;
    this.id="";this.href="";this.target="";this.rel="";this.className="";
    this.classList={add:()=>{}};
  }
  append(...nodes){this.children.push(...nodes)}
  replaceChildren(...nodes){this.children=[...nodes]}
}
const html=fs.readFileSync("intelligence.html","utf8");
const script=html.split("<script>")[1]?.split("</script>")[0];
assert(script,"Missing dashboard script");

async function run(data){
 const ids={};
 const doc={
  createElement:(tag)=>new FakeElement(tag),
  getElementById:(id)=>ids[id]??(ids[id]=new FakeElement()),
 };
 const ctx={document:doc,fetch:async()=>({ok:true,json:async()=>data}),Date,Number,String,Array,Error,encodeURIComponent,console};
 vm.runInNewContext(script,ctx,{timeout:1500});
 await new Promise(resolve=>setImmediate(resolve));
 return ids;
}
const single={
 schema:1,repository:"janus-llm/janus-llm",revision:"a".repeat(40),
 file:"janus/__init__.py",model:"free/glm-5.3-flash",
 analysis:{purpose:"Initialize package",components:["Translator"],risks:[],evidence:["Translator"]}
};
const multi={
 schema:2,repository:"janus-llm/janus-llm",commit:"b".repeat(40),
 model:"free/glm-5.3-flash",
 files:[
  {file:"src/a.py",analysis:{purpose:"Describe A",components:["a"],risks:[],evidence:["a"]}},
  {file:"src/b.py",analysis:{purpose:"Describe B",components:["b"],risks:[],evidence:["b"]}},
 ],
 usage:{calls:2,estimated_input_tokens:1000,max_output_tokens_reserved:1000}
};
(async()=>{
 for(const [data,count] of [[single,1],[multi,2]]){
  const ids=await run(data);
  assert.equal(ids.status.textContent,"Informe cargado correctamente. Revisión humana pendiente.");
  assert.equal(ids.details.hidden,false);
  assert.equal(ids.file.textContent,count+" archivo(s) analizado(s)");
  assert.equal(ids.sourceLink.href,"https://github.com/janus-llm/janus-llm");
 }
 const malicious=JSON.parse(JSON.stringify(multi));
 malicious.files[0].analysis.purpose="<img src=x onerror=alert(1)>";
 const ids=await run(malicious);
 const rendered=ids.details.children[0].children.find(x=>x.tag==="p");
 assert.equal(rendered.textContent,malicious.files[0].analysis.purpose);
 console.log("UI smoke tests passed: schema1, schema2 and untrusted text rendering.");
})().catch(err=>{console.error(err);process.exitCode=1});
