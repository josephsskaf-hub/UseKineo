#!/usr/bin/env node
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import vm from 'node:vm'
import ts from 'typescript'
import { execFileSync } from 'node:child_process'

const root = process.cwd()
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8').replace(/\r\n/g, '\n') // KINEO-LEVA-REBASE-2610: preserve exact source assertions across checkout EOL.
let checks = 0
const check = (value, message) => { assert.ok(value, message); checks++ }
const equal = (actual, expected, message) => { assert.equal(actual, expected, message); checks++ }

function executeTs(file, mocks, source = read(file)) {
  const compiled = ts.transpileModule(source, {
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
// KINEO-VITRINE-APROVADOS-2026-09-16 — este guardião estava PARADO desde 07/09: engineWall passou a importar
// @/lib/homeVideoCuration (b79827aa) e o import não tinha mock, então morria antes da 1ª verificação.
// Agora a curadoria da home entra pelo mesmo caminho do produto.
const homeCurationModule = executeTs('lib/homeVideoCuration.ts', {
  '@/lib/publicExamples': { PUBLIC_ENGINE_EXAMPLES: publicEngineExamples },
})
const wall = executeTs('lib/engineWall.ts', {
  '@/lib/homeVideoCuration': { HOME_ENGINE_EXAMPLES: homeCurationModule.HOME_ENGINE_EXAMPLES },
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
// Reancorado 29/09 (KINEO-KINEO1-FORA-2026-09-29, fundador: "quero tirar o kineo 1 do jogo, ele estraga a entrada"):
// o Kineo 1 saiu da vitrine pública (HERO_CAPS/TRENDING_CAPS.fast = 0); a curadoria dele fica intacta em
// lib/homeVideoCuration.ts. A parede passa a ter as sete famílias restantes e 0 clipe 'fast'.
const expectedEngines = ['cinematic_ai', 'cinematic_kling', 'cinematic_veo', 'cinematic_hollywood', 'cinematic_h3', 'cinematic_omni', 'presenter']
equal(databaseCalls, 0, 'privacy-contained home does not open Supabase')
equal(new Set(hero.map((video) => video.engine)).size, 7, 'middle wall receives the seven public engine families (Kineo 1 off since 29/09)')
// reancorado 16/09: a vitrine do fundador de 07/09 (KINEO-VITRINE-FUNDADOR) somou 11 renders aos 26 — o guardião estava parado e não viu.
equal(publicEngineExamples.length, 37, 'engine allowlist contains the thirty-seven founder-confirmed curated renders (26 + 11 of 07/09)')
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
// reancorado 16/09 aos fatos de 07-08/09 (KINEO-CARDS-ENQUADRADOS: H3 ganha o 4o render; Omni = robô + 4 apresentadores, card mostra 4).
equal(heroCounts.cinematic_h3, 4, 'MiniMax H3 keeps its four rotating founder-owned clips (07/09)')
equal(heroCounts.cinematic_omni, 5, 'Omni Flash keeps robot + four presenters on the wall (card shows four)')
// KINEO-VITRINE-APROVADOS-2026-09-16: os filmes aprovados abrem o card do seu motor.
for (const [engine, id] of [['cinematic_ai', 'b5434412-62b9-48f5-9a10-c36e2e725c9f'], ['cinematic_kling', 'ed95d4a6-79f9-444e-8b29-0d6b9c1c05eb'], ['cinematic_veo', '6b9b363c-3185-4db7-a877-46b77e334f06'], ['cinematic_hollywood', 'd6d73a90-9bd7-46a3-826a-9a4a72549e05']]) {
  equal(hero.find((video) => video.engine === engine)?.id, id, `${engine} opens with the film the founder approved on 16/09`)
}
// 29/09: os três aprovados de 07/09 do Kineo 1 seguem na curadoria, fora da vitrine pública.
equal(hero.filter((video) => video.engine === 'fast').length, 0, 'Kineo 1 is off the public hero (KINEO-KINEO1-FORA-2026-09-29)')
check(hero.some((video) => video.id === '36a04f7b-65f7-42d9-a2ab-198b5a7f115e'), 'robot harbor clip is restored')
// reancorado 16/09: desde 07/09 o Omni da home é robô + 4 apresentadores aprovados (Mariana Trench saiu por decisão do fundador).
check(hero.some((video) => video.id === 'a66e975a-3f6c-4bf4-9510-cd15b895b58b'), 'Omni presenter approved on 07/09 is on the wall')

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
// reancorado 16/09: a curadoria de 07/09 (3 Kineo 1 + 4 Seedance + Omni robô e 4 apresentadores…) levou a fileira de 14 a 23.
// 29/09 (KINEO-KINEO1-FORA-2026-09-29): os 3 Kineo 1 saíram da fileira; 24 − 3 = 21.
equal(trending.length, 21, 'third row keeps the dense rail minus the three Kineo 1 clips (07/09 curation + Kling 2.5 four clips on 16/09; Kineo 1 off since 29/09)')
check(new Set(trending.map((video) => video.engine)).size >= 7, 'third row spans at least seven engine families')
// 29/09: sem o Kineo 1 a intercalação abre no Seedance e o primeiro passe anda uma casa (H3 na 5ª, Omni na 6ª).
check(trending.every((video) => video.engine !== 'fast'), 'trending carries no Kineo 1 clip (KINEO-KINEO1-FORA-2026-09-29)')
equal(trending[0].engine, 'cinematic_ai', 'trending interleave starts with the Seedance output')
check(trending[1].engine !== trending[0].engine, 'trending interleave avoids same-engine clumps')
equal(trending[4].engine, 'cinematic_h3', 'MiniMax appears in the first visible pass')
equal(trending[5].engine, 'cinematic_omni', 'Omni appears in the first visible pass')
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
const frozen = (sha, file) => execFileSync('git', ['show', `${sha}:${file}`], { cwd: root, encoding: 'utf8', maxBuffer: 16 * 1024 * 1024 }).replace(/\r\n/g, '\n')
const originalLanding = frozen('2c918543399ccb65d695ef461371711e22f72f88', 'app/KineoLanding.tsx')
// KINEO-VITRINE-APROVADOS-2026-09-16 (fundador): a primeira tela volta aos quatro motores validados; H3 e Omni em manutenção saem dela.
// Those engine cards were replaced by the separately approved 24/09 film
// gallery. Keep every original composition assertion on its immutable revision,
// and execute/freeze the current replacement below; previews do not promise that
// an engine is currently available for generation.
check(originalLanding.includes("const order = ['cinematic_ai', 'cinematic_kling', 'cinematic_veo', 'cinematic_hollywood']"), '16/09 fixture: top row order is Seedance, Kling2.5, Veo, Kling3')
check(!originalLanding.includes("'cinematic_h3', 'cinematic_omni']"), '16/09 fixture: paused engines do not open the first screen')
check(originalLanding.includes("tileVidLast('cinematic_ai')"), '16/09 fixture: middle Seedance consumes the last restored clip')
check(originalLanding.includes("tileVidLast('cinematic_kling')"), '16/09 fixture: middle Kling2.5 consumes the last clip')
check(originalLanding.includes("tileVidLast('cinematic_veo')"), '16/09 fixture: middle Veo consumes the last clip')
check(originalLanding.includes("tileVidLast('cinematic_hollywood')"), '16/09 fixture: middle Kling3 remains distinct')
check(landing.includes('Made with Kineo — every engine'), 'static internal showcase is not mislabeled as trending')
const featuredSource = read('lib/ui/homeFeaturedFilms.ts')
equal(featuredSource, frozen('1c078ed01', 'lib/ui/homeFeaturedFilms.ts'), 'current approved film selection and playlists retain main bytes')
check(landing.includes('<HomeFeaturedFilms />'), 'current home renders the approved film gallery')
check(read('components/HomeFeaturedFilms.tsx').includes('heroOnly featuredCount={4}'), 'current gallery still exposes four hero cards')
const selection = executeTs('lib/ui/examplesSelectionSep24.ts', { '@/lib/publicExamples': publicExamplesModule })
const featuredMocks = { './examplesSelectionSep24': selection }
const featured = executeTs('lib/ui/homeFeaturedFilms.ts', featuredMocks)
const featuredIds = ['36a04f7b-65f7-42d9-a2ab-198b5a7f115e', '1b8e12f9-83e5-411c-8fda-0b277d289934', '19e317fe-6838-4edc-9fbf-d830d62be140', '6b9b363c-3185-4db7-a877-46b77e334f06']
const approvedFeatured = films => JSON.stringify(films.map(video => video.id)) === JSON.stringify(featuredIds) &&
  films.every(video => video.href === '/studio' && video.publicSource === 'founder_owned_engine_example')
check(approvedFeatured(featured.HOME_FEATURED_FILMS), 'executed hero has the four approved openers in order and no customer-page link')
const playlistClips = featured.HOME_FEATURED_PLAYLISTS.flat()
equal(new Set(playlistClips.map(video => video.id)).size, playlistClips.length, 'simultaneous playlists never repeat a film')
for (const video of playlistClips) {
  const asset = path.join(root, 'public', video.videoUrl)
  check(fs.existsSync(asset) && fs.statSync(asset).size > 20_000, `${video.id} current gallery preview exists and is nonempty`)
}
const unsafeLink = executeTs('lib/ui/homeFeaturedFilms.ts', featuredMocks, featuredSource.replace("href: '/studio'", "href: '/v/unconsented-customer'"))
check(!approvedFeatured(unsafeLink.HOME_FEATURED_FILMS), 'mutant: customer-page destination fails current-gallery protection')
const reversed = executeTs('lib/ui/homeFeaturedFilms.ts', featuredMocks, featuredSource.replace('HOME_FEATURED_PLAYLISTS.map(playlist => playlist[0])', 'HOME_FEATURED_PLAYLISTS.map(playlist => playlist[0]).reverse()'))
check(!approvedFeatured(reversed.HOME_FEATURED_FILMS), 'mutant: reordered openers fail current-gallery protection')

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
