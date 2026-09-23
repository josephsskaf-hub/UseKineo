// Offline checks only: no browser, media decoding, network, credentials or production imports.
const {readFileSync}=require('node:fs');
const assert=require('node:assert/strict');
const vm=require('node:vm');
const html=readFileSync(require('node:path').join(__dirname,'kineo-empresas.html'),'utf8');
const script=html.match(/<script>([\s\S]*?)<\/script>/)[1];
new vm.Script(script); // Whole UI script parses, but do not execute browser effects.
const core=script.split('// CORE_START')[1].split('// CORE_END')[0].split('\n').slice(1).join('\n');
const context=vm.createContext({});vm.runInContext(core,context);
const {buildPlan,sceneAt,fileProblem}=context;
let checks=0;function check(fn){fn();checks++;}
check(()=>assert.throws(()=>buildPlan(NaN,'','')));
for(const duration of [0,3.9,181,Infinity])check(()=>assert.throws(()=>buildPlan(duration,'','')));
for(const duration of [4,35,60,180]){
 const plan=buildPlan(duration,' Empresa ','A\r\nB\nC');
 check(()=>assert.equal(plan.length,4));
 check(()=>assert.equal(plan[0].start,0));
 check(()=>assert.equal(plan[3].end,duration));
 check(()=>assert.equal(plan[0].text,'Empresa'));
 check(()=>assert.equal(plan[1].text,'A\nB'));
 check(()=>assert.equal(plan[2].text,'C'));
 check(()=>assert.equal(sceneAt(plan,duration*.75).kind,'professional'));
 check(()=>assert.equal(sceneAt(plan,duration).kind,'professional'));
 check(()=>assert.equal(sceneAt(plan,duration+.1),null));
 check(()=>assert.equal(sceneAt(plan,-1),null));
 for(let i=1;i<4;i++)check(()=>assert.equal(plan[i-1].end,plan[i].start));
}
check(()=>assert.equal(buildPlan(20,'x','Somente um')[2].text,''));
check(()=>assert.equal(fileProblem({type:'video/mp4',size:100*1024*1024},'video'),''));
check(()=>assert.notEqual(fileProblem({type:'video/mp4',size:100*1024*1024+1},'video'),''));
check(()=>assert.notEqual(fileProblem({type:'image/png',size:0},'photo'),''));
check(()=>assert.notEqual(fileProblem({type:'image/svg+xml',size:30},'photo'),''));
check(()=>assert.equal(fileProblem({type:'image/jpeg',size:30},'photo'),''));
check(()=>assert.notEqual(fileProblem({type:'image/png',size:11*1024*1024},'photo'),''));
check(()=>assert.ok(html.includes("connect-src 'none'")));
check(()=>assert.ok(!/\bfetch\s*\(|XMLHttpRequest|WebSocket|localStorage|sessionStorage|\.innerHTML\s*=/.test(script)));
check(()=>assert.ok(html.includes('Exportar MP4 · ainda indisponível')));
check(()=>assert.ok(script.includes('aiAnalysisPerformed:false')));
check(()=>assert.ok(script.includes("$('reviewed').checked=false")));
console.log(`${checks} checks passed. Script syntax and pure helpers only; browser/media/visual gates remain unverified.`);
