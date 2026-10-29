// Execute the real client replacement branch with offline authenticated-response fixtures.
const test = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')
const vm = require('node:vm')
const ts = require('typescript')
const root = path.resolve(__dirname, '..')
function pure(file) {
  const exports = {}
  const code = ts.transpileModule(fs.readFileSync(path.join(root, file), 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText
  vm.runInNewContext(code, { exports })
  return exports
}
const { kling4PaidReplacement } = pure('lib/kling4PaidClaim.ts')
const { kling4TrialReplacement } = pure('lib/kling4TrialClaim.ts')
const file = 'app/(dashboard)/generate/GenerateClient.tsx'
const source = fs.readFileSync(path.join(root, file), 'utf8')
const ast = ts.createSourceFile(file, source, ts.ScriptTarget.ES2022, true, ts.ScriptKind.TSX)
let block
function walk(node) {
  if (ts.isIfStatement(node) && node.expression.getText(ast) === 'data.replacement !== undefined') block = node.getText(ast)
  ts.forEachChild(node, walk)
}
walk(ast)
assert.ok(block)
const names = ['falModelRef','falModelsRef','falQualityRef','sceneEnginesRef','scenePromptsRef','sceneAnchorsRef',
  'sceneNarrationsRef','sceneSecondsRef','sceneDialoguesRef','hollyRetriedRef','narracaoVerbatimRef']
const setters = ['setScenes','setFastCaptions','setFastVoiceover','setTtsSpeed','setFalRequestIds','setActualEngineUsed']
const exportsForBranch = {}
const code = ts.transpileModule(`export function apply(data,generationId,falRequestIds,refs,out) {
  const {${names.join(',')}}=refs;
  ${setters.map(n => `const ${n}=value=>{out.${n}=value};`).join('\n')}
  const scheduleNextPoll=value=>{out.scheduled=value};
  ${block}
  out.continues=true;
}`, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText
vm.runInNewContext(code, { exports: exportsForBranch, kling4PaidReplacement, kling4TrialReplacement })

test('paid client fallback restores Hollywood billing, actual Seedance badge and the complete narration for15/30/60', () => {
  for (const seconds of [15,30,60]) {
    const count=seconds/5, original=Array.from({length:seconds/15},(_,i)=>'old-'+i), words=Array.from({length:count},(_,i)=>'word'+i)
    const replacement={generationId:'offline-generation',quality:'cinematic_hollywood',duration:seconds,
      fal_request_ids:words.map((_,i)=>'seedance-'+i),fal_models:words.map(()=> 'fal-ai/bytedance/seedance/v1.5/pro/text-to-video'),
      fal_model:'fal-ai/bytedance/seedance/v1.5/pro/text-to-video', scenes:words.map(w=>'Visual '+w),scene_prompts:words.map(w=>'Visual '+w),
      scene_captions:words,scene_narrations:words,scene_seconds:words.map(()=>5),scene_engines:words.map(()=> 'cinematic'),
      scene_dialogues:words.map(()=>null),scene_anchor_urls:words.map(()=>null),voiceover_script:words.join(' '),speed:1,verbatim:true,
      engine_used:'seedance15_fallback',kling4_paid:{version:'kling4_paid_2810',promo:true,seconds,
        engine_used:'seedance15_fallback',fallback_finalized:true,fallback_budget_reserved:true,original_request_ids:original}}
    const refs=Object.fromEntries(names.map(n=>[n,{current:null}])), out={}
    exportsForBranch.apply({replacement},replacement.generationId,original,refs,out)
    assert.equal(refs.falQualityRef.current,'cinematic_hollywood')
    assert.equal(out.setActualEngineUsed,'seedance15_fallback')
    assert.equal(out.setFastVoiceover,replacement.voiceover_script)
    assert.deepEqual(Array.from(out.setFalRequestIds),replacement.fal_request_ids)
    assert.equal(refs.hollyRetriedRef.current,2)
    const invalid={}
    exportsForBranch.apply({replacement:{...replacement,generationId:'another-film'}},replacement.generationId,original,refs,invalid)
    assert.equal(invalid.setFalRequestIds,undefined)
    assert.equal(invalid.setActualEngineUsed,undefined)
    assert.equal(invalid.scheduled,6000)
  }
})
