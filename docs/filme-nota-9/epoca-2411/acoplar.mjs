import assert from 'node:assert/strict'
export function aplicar(s) {
  const helper=s.world.load('@/lib/cinematic/epocaVisual2411')
  assert.equal(helper.EPOCA_VISUAL_2411,'internal')
  const prep=s.mode==='off'?args=>helper.prepararEpocaVisual({...args,modo:'off'}):helper.prepararEpocaVisual
  const prepared=s.borders.v('epocaVisual').run({
    prepararEpocaVisual:prep,kling4TrialCandidate:true,qualidadeHerdada:null,
    isDryRunAccount:()=>s.account,user:{email:s.account?'casa-de-teste':'conta-externa-de-teste'},
    verbatim:true,prompt:s.film.script,parsedScript:{segments:s.bits},
    scenes:s.voices.map(voiceover=>({voiceover}))
  })
  const scope={aplicarEpocaVisual:helper.aplicarEpocaVisual,epocaVisual:prepared}
  const scenes=Array.from(s.scenes)
  s.borders.epochStills().run({...scope,classicScenePrompts:scenes})
  return {...s,scope,scenes}
}
