const fs = require('node:fs');
const path = require('node:path');
const cp = require('node:child_process');
const crypto = require('node:crypto');
const root = path.resolve(__dirname, '../../..');
const git = (...args) => cp.execFileSync('git', args, { cwd: root, encoding: 'utf8' }).trim();
const base = '7827f2e07f89b55e2a020b266a48ec98247e5bd4';
const head = '7c9445f4ba248b1cbe779a708afadea4b248dd8e';
const previousValidation = '35dfe3c8031f44be20733c34f7c2aeee868db78d';
if (git('rev-parse','origin/main') !== base) throw new Error('Base changed; reconcile before compiling package.');
if (git('rev-parse','HEAD') !== head) throw new Error('Reviewed head changed; review before updating manifest.');
const scopes = ['app','components','lib','scripts'];
const files = git('diff','--name-only',base,head,'--',...scopes).split('\n').filter(Boolean);
const blob = (ref,file) => {
  const result = cp.spawnSync('git',['rev-parse','--verify',ref+':'+file],{cwd:root,encoding:'utf8'});
  return result.status === 0 ? result.stdout.trim() : null;
};
const forbidden = ['app/api/stripe','lib/checkoutPricing.ts','lib/entryPolicy.ts','lib/affiliateCommission.ts','lib/settlementCurrency.ts'];
const changedProtected = git('diff','--name-only',base,head,'--',...forbidden).split('\n').filter(Boolean);
if (changedProtected.length) throw new Error('Forbidden paths changed.');
const unchangedSinceValidation = git('diff','--name-only',previousValidation,head,'--',...scopes) === '';
const artifacts = [
  'docs/citacoes-01-pages-2026-09-10/preview-citacoes-01.html',
  'docs/citacoes-chatgpt/2026-09-10-prioridade/engine-catalog-verification.json',
  'docs/citacoes-chatgpt/2026-09-10-prioridade/local-engine-routes-verification.json',
  'docs/citacoes-chatgpt/2026-09-10-prioridade/local-verification.json',
  'docs/citacoes-chatgpt/2026-09-10-20h/HTTP-CHECKPOINT.md',
  'docs/citacoes-chatgpt/2026-09-10-20h/chatgpt-20-perguntas.json'
].map(file => {
  const body = fs.readFileSync(path.join(root,file));
  return {file,bytes:body.length,sha256:crypto.createHash('sha256').update(body).digest('hex'),blob:blob(head,file)};
});
const manifest = {
  classification:'IMPLEMENTADO / TESTADO LOCALMENTE; não enfileirado ou publicado',
  generatedAtUtc:new Date().toISOString(),
  mandate:{source:'Founder renewal relayed by Board, 2026-09-10 23:17 BRT',startBrt:'2026-09-10T23:30:00-03:00',endBrt:'2026-09-11T23:30:00-03:00',cadenceMinutes:30,nextMeasurementBrt:'2026-09-11T20:00:00-03:00',supersedesOldMidnight:true},
  repository:{clone:'C:/kineo',worktree:root.replaceAll('\\','/'),remote:'https://github.com/josephsskaf-hub/UseKineo.git',branch:'codex/citacoes-01-2026-09-10',reviewedBase:base,reviewedInputHead:head,reviewedTree:git('rev-parse',head+'^{tree}'),baseIsAncestor:cp.spawnSync('git',['merge-base','--is-ancestor',base,head],{cwd:root}).status===0},
  codeCommits:['7f3f96220c26eeaec537900bedd1eb524b6fdd9c','b619128999e93b77e74287795c43a6f4aac699c4','c633ed8bc35e6f697b85ee745cd3fca8a3270f5e'],
  integration:{merge:previousValidation,parents:git('show','-s','--format=%P',previousValidation).split(' '),doNotCherryPickMergeAsOrdinaryCommit:true,codeUnchangedSince19hValidation:unchangedSinceValidation,documentationFollowingMerge:['ecd55fe374db31f012541946402fbb9d76230788',head],handoffCommit:'O commit que contém este manifesto adiciona apenas handoff/evidências/checkpoint; não muda os blobs funcionais revisados.'},
  functionalFiles:files.map(file=>({file,baseBlob:blob(base,file),reviewedBlob:blob(head,file)})),
  protectedPaths:forbidden,
  changedProtectedPaths:changedProtected,
  pendingPages:['/ai-video-generator/free-youtube-shorts','/ai-video-generator/horror-story-60-seconds','/ai-video-generator/chatgpt-script-to-finished-short'],
  counts:{producedUnique:8,alreadyPublished:5,pendingPrepared:3,newPagesThisHandoff:0},
  artifacts,
  validation:{typecheck:{command:'node C:/kineo/node_modules/typescript/bin/tsc --noEmit --incremental false',exitCode:0,observedBrt:'2026-09-10 23:28',nextGeneratedTypesPreserved:true,generatedRouteTypeBytes:fs.statSync(path.join(root,'.next/types/app/ai-video-generator/[engine]/page.ts')).size,claim:'Gate executed on reviewedInputHead; only checkpoint documentation was dirty.'},reusedEvidence:{catalogChecks:24,flagScenarios:2,engineRoutes:8,publicRoutesAndDiscovery:11,whyReused:'Functional blobs are unchanged since prior integrated validation; no new visual/HTTP audit required before transport changes base.'},independentReview:{dateBrt:'2026-09-10 23:29',result:'No concrete blockers in pending code. Protected-path delta empty; catalog, consumers and guard path updates unchanged; eight answer entries and three new llms links.'},existingGuards:{llms:{checks:91,exitCode:0},money:{checks:322,exitCode:0},arena:{checks:81,exitCode:0},aeo:{exitCode:1,inheritedFailure:'S25 present in engine list, absent in expected list; same baseline before delta'},signup:{exitCode:1,inheritedFailure:'Destination named before generic creation copy; same baseline before delta'}}},
  transport:{owner:'Board only',candidateWorktree:'C:/kineo-wt/transport-safe-20260911',status:'Candidate under review; no execution or publication authorized by this manifest.',dependency:'C:/Users/josep/.codex/outputs/01a03e3e-5f63-7cf1-8b9f-6c6646b446b7/FILA-TRANSPORTE-DOCS-2026-09-10.md',exclude:['.publication-temp/','Main dirty worktree and other authors work','Already-published first five pages as a new delivery'],noUnsafeFallback:true},
  commercialOutcome:{externalBuyers:'DESCONHECIDO',confirmedRevenue:'DESCONHECIDO',signupOrCheckoutTesting:false,newRenders:false,noAttributionClaim:true}
};
fs.writeFileSync(path.join(__dirname,'MANIFESTO.json'),JSON.stringify(manifest,null,2)+'\n','utf8');
console.log(JSON.stringify({base,head,functionalFiles:files.length,protectedChanged:changedProtected.length,unchangedSinceValidation,artifacts:artifacts.length}));
