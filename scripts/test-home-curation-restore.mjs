#!/usr/bin/env node
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import vm from 'node:vm'
import ts from 'typescript'

const root = process.cwd()
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8')
let checks = 0
const check = (value, message) => { assert.ok(value, message); checks++ }
const equal = (actual, expected, message) => { assert.equal(actual, expected, message); checks++ }

function executeTs(file, mocks) {
  const compiled = ts.transpileModule(read(file), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020, esModuleInterop: true },
  }).outputText
  const moduleBox = { exports: {} }
  vm.runInNewContext(compiled, {
    module: moduleBox,
    exports: moduleBox.exports,
    require: (id) => {
      if (Object.hasOwn(mocks, id)) return mocks[id]
      throw new Error(`unmocked import ${id}`)
    },
    process: { env: {} },
    Map,
    Set,
    Promise,
    RegExp,
  }, { filename: file })
  return moduleBox.exports
}

let databaseCalls = 0
const publicExamplesModule = executeTs('lib/publicExamples.ts', {})
const publicExamples = publicExamplesModule.PUBLIC_EXAMPLES
const publicEngineExamples = publicExamplesModule.PUBLIC_ENGINE_EXAMPLES
const wall = executeTs('lib/engineWall.ts', {
  '@supabase/supabase-js': { createClient: () => { databaseCalls++; throw new Error('privacy regression: database opened') } },
  '@/lib/publicVideos': { cleanTitleLine: (value) => String(value ?? '').trim() },
  '@/lib/publicExamples': {
    PUBLIC_EXAMPLES: publicExamples,
    PUBLIC_ENGINE_EXAMPLES: publicEngineExamples,
    posterWebpPath: publicExamplesModule.posterWebpPath,
  },
  '@/lib/publicSurfacePolicy': { CUSTOMER_VIDEO_PUBLIC_SURFACE_ENABLED: false },
})

const hero = await wall.getEngineHero()
const expectedEngines = ['fast', 'cinematic_ai', 'cinematic_kling', 'cinematic_veo', 'cinematic_hollywood', 'cinematic_h3', 'cinematic_omni', 'presenter']
equal(databaseCalls, 0, 'privacy-contained home does not open Supabase')
equal(new Set(hero.map((video) => video.engine)).size, 8, 'middle wall receives all eight engine families')
equal(publicEngineExamples.length, 26, 'engine allowlist contains the twenty-six founder-confirmed curated renders')
equal(new Set(publicEngineExamples.map((video) => video.id)).size, publicEngineExamples.length, 'engine allowlist has no duplicate IDs')
check(publicEngineExamples.every((video) => video.ownershipEvidence === 'founder_confirmed_owned'), 'every engine preview records the founder ownership confirmation')
check(publicEngineExamples.every((video) => video.ownershipVerifiedAt === '2026-08-27'), 'every engine preview records the production verification date')
for (const engine of expectedEngines) {
  check(hero.some((video) => video.engine === engine), `${engine} has a repository-owned clip`)
}

const heroOrder = ['cinematic_veo', 'cinematic_hollywood', 'cinematic_h3', 'cinematic_omni']
const heroCounts = Object.fromEntries(heroOrder.map((engine) => [engine, hero.filter((video) => video.engine === engine).length]))
equal(heroCounts.cinematic_veo, 4, 'Veo 3.1 restores four rotating clips')
equal(heroCounts.cinematic_hollywood, 5, 'Kling 3 restores four hero clips plus distinct middle tile')
equal(heroCounts.cinematic_h3, 3, 'MiniMax H3 restores its three rotating founder-owned clips')
equal(heroCounts.cinematic_omni, 4, 'Omni Flash restores four rotating clips')
equal(hero.filter((video) => video.engine === 'fast').length, 1, 'Kineo 1 uses its original founder-owned render')
check(hero.some((video) => video.id === '36a04f7b-65f7-42d9-a2ab-198b5a7f115e'), 'robot harbor clip is restored')
check(hero.some((video) => video.id === '33249fbf-57b6-47cf-8486-88bfb2a02db1'), 'Mariana Trench clip is restored')

for (const video of hero) {
  check(video.videoUrl.startsWith('/previews/') || video.videoUrl.startsWith('/videos/') || video.videoUrl.startsWith('https://cqqukkvjjrguayiyjvhh.supabase.co/storage/'), `${video.id} uses an explicitly allow-listed asset`)
  check(typeof video.href === 'string' && video.href.startsWith('/'), `${video.id} has an explicit internal destination`)
  check(!video.href.startsWith('/v/'), `${video.id} cannot open an unconsented customer page`)
  check(video.engine !== 'static_example', `${video.id} keeps its honest engine label`)
  equal(video.publicSource, 'founder_owned_engine_example', `${video.id} carries an auditable public-source reason`)
  if (video.videoUrl.startsWith('/')) {
    const asset = path.join(root, 'public', video.videoUrl.replace(/^\//, '').replace(/^public[\\/]/, ''))
    check(fs.existsSync(asset), `${video.id} asset exists on disk`)
    check(fs.statSync(asset).size > 20_000, `${video.id} asset is non-empty media`)
  }
  if (video.posterUrl) {
    const poster = path.join(root, 'public', video.posterUrl.replace(/^\//, ''))
    check(fs.existsSync(poster), `${video.id} poster exists on disk`)
  }
}

const trending = await wall.getTrending()
equal(databaseCalls, 0, 'trending also stays database-free')
equal(trending.length, 14, 'third row restores a dense fourteen-video rail')
check(new Set(trending.map((video) => video.engine)).size >= 7, 'third row spans at least seven engine families')
equal(trending[0].engine, 'fast', 'trending interleave starts with everyday output')
equal(trending[1].engine, 'cinematic_ai', 'trending interleave avoids same-engine clumps')
equal(trending[5].engine, 'cinematic_h3', 'MiniMax appears in the first visible pass')
equal(trending[6].engine, 'cinematic_omni', 'Omni appears in the first visible pass')
for (const video of trending) {
  check(video.href && !video.href.startsWith('/v/'), `${video.id} trending destination is explicit and safe`)
}

const showcase = await wall.getEngineShowcase()
const genericWall = await wall.getEngineWall()
const oneEngine = await wall.getEngineRenders('cinematic_omni')
check(showcase.every((video) => video.engine === 'static_example'), 'other public showcase remains privacy-contained')
check(genericWall.every((video) => video.engine === 'static_example'), 'generic public wall remains privacy-contained')
equal(oneEngine.length, 0, 'engine SEO page does not infer customer publication consent')
equal(databaseCalls, 0, 'no containment branch touched the database')

const landing = read('app/KineoLanding.tsx')
check(landing.includes("const order = ['cinematic_veo', 'cinematic_hollywood', 'cinematic_h3', 'cinematic_omni']"), 'top row order stays Veo, Kling 3, MiniMax, Omni')
check(landing.includes("tileVid('cinematic_ai')"), 'middle Seedance tile consumes restored wall')
check(landing.includes("tileVid('cinematic_kling')"), 'middle Kling 2.5 tile consumes restored wall')
check(landing.includes("tileVidLast('cinematic_hollywood')"), 'middle Kling 3 tile remains visually distinct')
check(landing.includes('Made with Kineo — every engine'), 'static internal showcase is not mislabeled as trending')

const previewBase = 'docs/previews/HOME-CURATION-RESTORE-2026-08-27'
for (const extension of ['html', 'png']) {
  check(fs.existsSync(path.join(root, `${previewBase}.${extension}`)), `${extension} before/after preview exists`)
}
const preview = read(`${previewBase}.html`)
for (const section of ['TOPO', 'MIOLO', 'TERCEIRA FILEIRA', 'MOBILE']) {
  check(preview.includes(section), `preview covers ${section.toLowerCase()}`)
}
check(preview.includes('BEFORE'), 'preview labels the current state')
check(preview.includes('AFTER'), 'preview labels the restored state')
check(preview.includes('36a04f7b-65f7-42d9-a2ab-198b5a7f115e.mp4'), 'preview shows the approved robot clip')

console.log(`PASS — ${checks}/${checks} home curation restore checks`)
