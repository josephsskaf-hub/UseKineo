import { existsSync } from 'node:fs'
import { execFileSync } from 'node:child_process'
import { resolve } from 'node:path'
import { root, offlineModules } from './gpt24h-offline-support.mjs'
// Extract one still from each existing authorized local preview. No new video,
// model, upload, remote renderer or paid API. Never overwrite an existing asset.
const { PAID_ENGINE_PROOF, paidEngineExamples } = offlineModules()('lib/growth/paidEngineProof.ts')
for (const slug of Object.keys(PAID_ENGINE_PROOF)) {
  for (const sample of paidEngineExamples(slug,slug)) {
    const output = resolve(root,'public'+sample.posterUrl)
    if (existsSync(output)) continue
    execFileSync('ffmpeg',['-hide_banner','-loglevel','error','-n','-i',resolve(root,'public'+sample.videoUrl),'-frames:v','1','-q:v','3',output],{windowsHide:true,stdio:'pipe'})
    console.log(`Extracted still ${sample.id}`)
  }
}
