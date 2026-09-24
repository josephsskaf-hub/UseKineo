// Offline catalogue/SSR checks. No database, provider, or browser calls.
import fs from 'node:fs'
import path from 'node:path'
import vm from 'node:vm'
import assert from 'node:assert/strict'
import { createRequire } from 'node:module'
import { execFileSync } from 'node:child_process'
import ts from 'typescript'
import React from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
const requireNode = createRequire(import.meta.url)
let checks = 0
const ok = (v, label) => { assert.ok(v, label); checks++ }
const read = file => fs.readFileSync(file, 'utf8')
let loggedIn = true
let environment = 'preview'
function loader(overrides = {}) {
  const cache = new Map()
  function load(file) {
    if (cache.has(file)) return cache.get(file)
    const exports = {}; cache.set(file, exports)
    const require = id => {
      if (id === 'react' || id === 'react/jsx-runtime') return requireNode(id)
      if (id === '@/components/InterfaceLanguage') return { UiLabel: ({children}) => children }
      if (id === 'next/navigation') return { notFound: () => { throw Error('NOT_FOUND') } }
      if (id === 'next/link' || id === '@/components/OrganicCtaLink') return { __esModule: true, default: ({children, source, placement, ...props}) => React.createElement('a', props, children) }
      if (id === '@/lib/supabase/server') return { createClient: () => ({ auth: { getUser: async () => ({ data: { user: loggedIn ? {id:'offline-user'} : null } }) } }) }
      if (id === '@supabase/supabase-js') return { createClient: () => { throw Error('Database forbidden') } }
      if (id === '@/lib/publicVideos') return { cleanTitleLine: s => s }
      if (id.endsWith('.module.css')) return { __esModule: true, default: new Proxy({}, {get: (_, name) => String(name)}) }
      if (id === './ExamplesBusinessProofBridge') return { __esModule: true, default: () => null } // unchanged, independently tested
      if (id === '@/components/WallMedia') return { __esModule: true, default: ({src}) => React.createElement('video', {src, muted:true, controls:true, style:{width:'100%',height:'100%',objectFit:'cover'}}) }
      const base = id.startsWith('@/') ? id.slice(2) : path.join(path.dirname(file), id)
      const target = [base, base+'.ts', base+'.tsx'].find(f => fs.existsSync(f) && fs.statSync(f).isFile())
      if (!target) throw Error('Unexpected dependency: '+id)
      return load(target.replaceAll('\\','/'))
    }
    vm.runInNewContext(ts.transpileModule(overrides[file] ?? read(file), {compilerOptions:{module:1,target:9,jsx:4,esModuleInterop:true}}).outputText,
      {exports,require,process:{env:{VERCEL_ENV:environment}},console,URL}, {filename:file})
    return exports
  }
  return load
}
const load = loader()
const base = await load('lib/engineWall.ts').getExamplesBest()
const policy = load('lib/ui/examplesGallery.ts')
const media = load('lib/ui/showcaseGallery.ts')
const original = JSON.stringify(base)
const videos = policy.expandExamples(base)
ok(videos.length === base.length + 8, 'eight additional approved films including three newly selected renders')
ok(new Set(videos.map(v=>v.id)).size === videos.length, 'no duplicated films')
ok(JSON.stringify(base) === original, 'existing collection unchanged')
ok(policy.expandExamples(videos).length === videos.length, 'repeat expansion is idempotent')
for (const video of videos) {
  ok(video.publicSource?.startsWith('founder_owned'), 'explicit founder source '+video.id)
  for (const asset of [video.videoUrl, video.previewUrl, video.posterUrl, media.showcasePoster(video)].filter(Boolean)) {
    ok(asset.startsWith('/') && !asset.startsWith('//'), 'local approved media')
    ok(fs.existsSync(path.join('public',asset)), 'media exists: '+asset)
  }
  ok(video.href?.startsWith('/studio?') || video.href?.startsWith('/examples/'), 'explicit safe destination')
}
ok(load('lib/publicSurfacePolicy.ts').CUSTOMER_VIDEO_PUBLIC_SURFACE_ENABLED === false, 'customer gallery remains private')
ok(policy.searchExamples(videos,'  LIGHTHOUSE  ','all').length === 1, 'case and whitespace normalized')
ok(policy.searchExamples(videos,'lighthouse','cinematic_kling').length === 0, 'query and engine combine')
ok(policy.searchExamples(videos,'nothingmatcheszz','all').length === 0, 'empty result')
ok(policy.searchExamples(videos,'','unknown').length === 0, 'unknown engine does not leak other results')
for (const choice of media.showcaseEngines(videos)) {
  ok(policy.searchExamples(videos,'',choice.engine).length === choice.count, 'each engine reconciles to catalogue')
}
const Gallery = load('app/examples/ExamplesGallery.tsx').default
const html = renderToStaticMarkup(React.createElement(Gallery,{videos}))
ok((html.match(/class="card"/g) ?? []).length === videos.length, 'every card SSR rendered')
ok(!html.includes('<video'), 'no video download before device policy and visibility are known')
ok(html.includes('Search examples') && html.includes('Filter by engine'), 'controls have accessible names')
ok(!html.includes(' cr<') && !read('app/examples/page.tsx').includes('costFor'), 'no credit prices in cards')
ok(renderToStaticMarkup(React.createElement(Gallery,{videos:[]})).includes('No matching examples'), 'empty catalogue usable')
const Page = load('app/examples/page.tsx').default
const after = renderToStaticMarkup(await Page())
ok(after.includes('Open Studio'), 'signed-in entry preserved')
ok((after.match(/class="card"/g) ?? []).length === 6, 'candidate page has six collection cards')
ok((after.match(/aria-label="Watch preview:/g) ?? []).length === 9, 'candidate page has exactly nine different entry points')
loggedIn = false
ok(renderToStaticMarkup(await Page()).includes('/signup?'), 'visitor entry preserved')
loggedIn = true
const Design = load('app/examples/design/page.tsx').default
const chosen = load('lib/ui/examplesSelectionSep24.ts').EXAMPLES_SELECTION_SEP24
const homeFilms = load('lib/ui/homeFeaturedFilms.ts').HOME_FEATURED_FILMS
const homePlaylists = load('lib/ui/homeFeaturedFilms.ts').HOME_FEATURED_PLAYLISTS
ok(homePlaylists.map(list=>list.length).join(',') === '3,2,2,2', 'three lead films and two in each side card')
ok(new Set(homePlaylists.flat().map(v=>v.id)).size === 9, 'nine home films without repetition across cards')
ok(['cinematic_ai','cinematic_kling','cinematic_veo','cinematic_hollywood'].every(engine=>homePlaylists.flat().some(v=>v.engine===engine)), 'all four earlier home engines return with their actual badges')
ok(homePlaylists.flat().every(v=>v.href==='/studio'), 'rotating films retain safe Studio entry')
for (const video of homePlaylists.flat()) {
  const info = JSON.parse(execFileSync('ffprobe',['-v','error','-select_streams','v:0','-show_entries','stream=width,height','-show_entries','format=duration','-of','json',path.join('public',video.videoUrl)],{encoding:'utf8'}))
  ok(info.streams[0].width===1080 && info.streams[0].height===1920, 'home rotation remains 1080p: '+video.title)
  ok(Number(info.format.duration)>=4 && Number(info.format.duration)<=10.1, 'bounded home clip duration')
  ok(fs.existsSync(path.join('public',video.posterUrl)), 'home rotation poster exists')
}
const homeScreen = renderToStaticMarkup(React.createElement(load('components/HomeFeaturedFilms.tsx').default))
ok(homeFilms.map(v=>v.id).join(',') === '36a04f7b-65f7-42d9-a2ab-198b5a7f115e,1b8e12f9-83e5-411c-8fda-0b277d289934,19e317fe-6838-4edc-9fbf-d830d62be140,6b9b363c-3185-4db7-a877-46b77e334f06', 'approved four home films in order')
ok(homeFilms.every(v=>v.href === '/studio'), 'film showcase does not route to a paused generator')
ok((homeScreen.match(/aria-label="Watch preview:/g) ?? []).length === 4, 'four home previews rendered')
ok(!homeScreen.includes('Explore the collection') && !homeScreen.includes('Search examples'), 'home contains only the hero')
ok(!homeScreen.includes('<video'), 'home waits for device/visibility policy before downloading')
for (const video of chosen) {
  const info = JSON.parse(execFileSync('ffprobe', ['-v','error','-select_streams','v:0','-show_entries','stream=width,height','-of','json',path.join('public',video.videoUrl)], {encoding:'utf8'}))
  ok(info.streams[0].width === 1080 && info.streams[0].height === 1920, 'selected film is native 1080p: '+video.id)
  ok(video.previewUrl === video.videoUrl, 'inline and expanded previews share full-quality asset')
}
ok(chosen.length === 9 && new Set(chosen.map(v=>v.id)).size === 9, 'nine distinct screenshot selections')
ok(chosen.filter(v=>v.engine === 'cinematic_h3').length === 2, 'both selected H3 versions retained')
ok(chosen.every((v,i)=>videos[i].id === v.id && videos[i].videoUrl === v.videoUrl), 'selected clips lead without hero media overrides')
const selectedScreen = renderToStaticMarkup(await Design({searchParams:{option:'selected'}}))
ok((selectedScreen.match(/class="card"/g) ?? []).length === 6, 'selection preview shows exactly six collection cards')
ok((selectedScreen.match(/aria-label="Watch preview:/g) ?? []).length === 9, 'three hero plus six cards without repetition')
ok(selectedScreen.includes('Sua seleção'), 'selection is named for the founder')
const screens = []
for (let option=1; option<=4; option++) {
  const screen = renderToStaticMarkup(await Design({searchParams:{option:String(option)}}))
  screens.push(screen)
  ok(screen.includes(`0${option} ·`), 'named arrangement '+option)
  ok((screen.match(/class="lead"/g) ?? []).length === 1, 'one lead per arrangement')
  for (const [,asset] of screen.matchAll(/src="(\/[^"#]+)"/g)) ok(fs.existsSync(path.join('public',asset)), 'arrangement asset exists '+asset)
}
ok(new Set(screens).size === 4, 'four distinct real-media arrangements')
environment = 'production'
await assert.rejects(()=>loader()('app/examples/design/page.tsx').default({searchParams:{}}),/NOT_FOUND/)
checks++
environment = 'preview'
if (process.argv.includes('--preview')) {
  const destination = process.argv[process.argv.indexOf('--preview')+1]
  assert.ok(destination, 'preview destination required')
  fs.mkdirSync(destination,{recursive:true})
  const oldSource = execFileSync('git',['show','3aac79e7:app/examples/page.tsx'],{encoding:'utf8'})
  const oldLoad = loader({'app/examples/page.tsx':oldSource})
  let before = renderToStaticMarkup(await oldLoad('app/examples/page.tsx').default())
  // Offline before-state uses the exact pre-change JSX with still posters in place of motion.
  before = before.replace(/<video[^>]*src="([^"]+)"[^>]*><\/video>/g, (tag,src)=> {
    const video = base.find(v=>v.videoUrl===src)
    return `<img src="${video?.posterUrl ?? ''}" alt="" style="width:100%;height:100%;object-fit:cover">`
  })
  const postcss = requireNode('postcss'), tailwind = requireNode('tailwindcss')
  const config = requireNode('../tailwind.config.js')
  const css = (await postcss([tailwind({...config,content:[{raw:oldSource+read('app/examples/page.tsx'),extension:'tsx'}]})]).process('@tailwind base;@tailwind utilities;',{from:undefined})).css
  const embed = markup => markup.replace(/src="(\/[^"#]+)"/g,(tag,asset)=> {
    const file = path.join('public',asset)
    if (!fs.existsSync(file)) return tag
    const ext=path.extname(file).slice(1); const mime=ext==='jpg'?'jpeg':ext
    return `src="data:image/${mime};base64,${fs.readFileSync(file).toString('base64')}"`
  })
  const document = (body,extra='') => `<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><style>${css}\nhtml{font-size:14px}body{margin:0;font-family:Arial,sans-serif}${extra}</style>${embed(body)}</html>`
  fs.writeFileSync(path.join(destination,'before.html'),document(before))
  fs.writeFileSync(path.join(destination,'after.html'),document(after,read('app/examples/ExamplesGallery.module.css')))
  screens.forEach((screen,index)=>fs.writeFileSync(path.join(destination,`montagem-${index+1}.html`),document(screen,read('app/examples/ExamplesGallery.module.css'))))
  fs.writeFileSync(path.join(destination,'sua-selecao.html'),document(selectedScreen,read('app/examples/ExamplesGallery.module.css')))
  const escape = s=>s.replaceAll('&','&amp;').replaceAll('"','&quot;')
  const panels = [['Antes · desktop','before.html',1440],['Depois · desktop','after.html',1440],['Antes · celular','before.html',390],['Depois · celular','after.html',390]].map(([label,file,width])=>`<section><h2>${label}</h2><iframe title="${label}" style="width:${width}px;height:950px" srcdoc="${escape(read(path.join(destination,file)))}"></iframe></section>`).join('')
  fs.writeFileSync(path.join(destination,'ANTES-DEPOIS.html'),`<!doctype html><html lang="pt-BR"><meta charset="utf-8"><title>Examples — antes e depois</title><style>body{margin:24px;background:#10151d;color:#eee;font:16px Arial}iframe{border:1px solid #334155;border-radius:12px}section{margin:30px 0}</style><h1>Examples — antes e depois</h1><p>JSX real, CSS inline e capas locais. Prévia estática: filtros e player são verificados no site publicado. Ponte comercial inalterada omitida.</p>${panels}</html>`)

  const oldLanding = execFileSync('git',['show','ed065b91:app/KineoLanding.tsx'],{encoding:'utf8'})
  const landingCss = oldLanding.match(/const KLP_CSS = `([\s\S]*?)`/)[1] + load('lib/ui/homePresentation.ts').HOME_PRESENTATION_CSS
  const wall = await load('lib/engineWall.ts').getEngineHero()
  const orderVideos = load('lib/ui/heroOpening.ts').orderHeroVideos
  const CycleCard = load('components/EngineCycleCard.tsx').default
  const oldCards = ['cinematic_ai','cinematic_kling','cinematic_veo','cinematic_hollywood'].map((engine,index) => renderToStaticMarkup(React.createElement(CycleCard,{index,videos:orderVideos(wall.filter(v=>v.engine===engine)).slice(0,4)}))).join('')
  const intro = '<div class="home-intro"><div class="home-intro-copy"><p class="home-eyebrow">Kineo</p><h1 class="home-title">Type an idea — watch it become a film.</h1></div><a class="btn btn-blue" href="#">Create a video ↗</a></div>'
  const homeDocument = media => document(`<main class="klp"><header class="hero"><div class="glow"></div><div class="wrap">${intro}${media}</div></header></main>`,landingCss+'\n'+read('app/examples/ExamplesGallery.module.css'))
  fs.writeFileSync(path.join(destination,'home-before.html'),homeDocument(`<div class="ftr-row hero-ftr">${oldCards}</div>`))
  fs.writeFileSync(path.join(destination,'home-after.html'),homeDocument(homeScreen))
  const homePanels = [['Antes · desktop','home-before.html',1440],['Depois · desktop','home-after.html',1440],['Antes · celular','home-before.html',390],['Depois · celular','home-after.html',390]].map(([label,file,width])=>`<section><h2>${label}</h2><iframe title="${label}" style="width:${width}px;height:1100px" srcdoc="${escape(read(path.join(destination,file)))}"></iframe></section>`).join('')
  fs.writeFileSync(path.join(destination,'HOME-ANTES-DEPOIS.html'),`<!doctype html><html lang="pt-BR"><meta charset="utf-8"><title>Home — antes e depois</title><style>body{margin:24px;background:#10151d;color:#eee;font:16px Arial}iframe{border:1px solid #334155;border-radius:12px}section{margin:30px 0}</style><h1>Home — apenas o hero</h1><p>Componentes reais com capas estáticas; desktop e celular. Navegação e seções abaixo não foram alteradas.</p>${homePanels}</html>`)
}
console.log(`Examples gallery: ${checks} checks passed; ${base.length} → ${videos.length} examples; no database/provider calls.`)
