// KINEO-ANUNCIO-MOTOR-2026-10-07 — gera os CSVs do Google Ads Editor (docs/anuncio-google-motores-2026-10-07/) a partir de
// UMA fonte, validando os limites do Google, o anúncio seguro sem marca e as negativas. Uso: node scripts/gerar-anuncio-google-motores-2026-10-07.cjs
// [pasta de saída] [tabelas.md opcional]. Os números da cópia são conferidos contra o código por scripts/test-anuncio-motor-copia-2026-10-07.mjs.
const fs = require('fs')
const path = require('path')
const OUT = process.argv[2] || path.join(__dirname, '..', 'docs', 'anuncio-google-motores-2026-10-07')
const MD_OUT = process.argv[3] || null
const BASE = 'https://www.usekineo.com'
const CAMPAIGN = 'Kineo - Search - Motores - Teste 0710'
const utm = (c) => `utm_source=google&utm_medium=cpc&utm_campaign=${c}`
const BRAND = /seedance|kling|veo|google|bytedance|kuaishou|minimax|gemini|tiktok|youtube|runway|higgsfield/i
const FORBIDDEN_H = /\bfree\b|\bbest\b|#1|\bofficial\b|guarantee|\bunlimited\b|!/i
const FORBIDDEN_D = /\bfree\b|\bbest\b|#1|\bofficial\b|guarantee|\bunlimited\b/i
const PRICES = ['$12.90', '$29.90', '$54.90']

const SAFE_SHARED = [
  'Finished Films, Not Just Clips', 'One Sentence to a Full Video', 'Narration, Captions and Music',
  'Plans From $12.90 a Month', 'Creator Plan: $29.90 a Month', 'Commercial Use on Every Plan',
  'Clean MP4 on Paid Plans', 'Vertical 9:16, Ready to Post', 'Film Ready in Minutes', // KINEO-GEO-RODADA3-2026-10-08 — era "Usually Ready in 8-25 Minutes": a página trocou a faixa pelo tempo medido
  '6 AI Video Models, 1 Account',
]
const groups = [
  {
    key: 'G1', name: 'Seedance 2.5', campaign: 'motor-seedance-2-5', url: '/ai-video-generator/seedance-2-5',
    exact: ['seedance 2.5 app', 'seedance 2.5 online', 'use seedance 2.5', 'seedance 2.5 video generator', 'seedance 2.5 ai video generator', 'seedance 2.5 price', 'seedance 2.5 pricing', 'seedance 2.5 access', 'try seedance 2.5', 'seedance 2.5 text to video'],
    phrase: ['seedance 2.5 app', 'seedance 2.5 online', 'use seedance 2.5', 'seedance 2.5 video generator', 'seedance 2.5 price', 'seedance 2.5 subscription', 'where to use seedance 2.5', 'seedance 2.5 image to video'],
    a: {
      path: ['Seedance-2-5', 'Online'],
      h: ['Seedance 2.5 Online', 'Use Seedance 2.5 Today', 'Seedance 2.5 Video Generator', 'Seedance 2.5 Clips: 8 Credits', 'Finished Films, Not Just Clips', 'Narration, Captions and Music', 'One Sentence to a Full Video', 'Plans From $12.90 a Month', '60-Second Film: 150 Credits', '35-Second Film: 88 Credits', 'Commercial Use on Every Plan', 'Clean MP4 on Paid Plans', 'Vertical 9:16, Ready to Post', 'Film Ready in Minutes', '6 AI Video Models, 1 Account'],
      d: ['Type one sentence. Kineo directs Seedance 2.5 scenes, voiceover, captions and music.', 'A 5-second Seedance 2.5 clip costs 8 credits. A finished 60-second film costs 150.', 'Seedance 2.5 runs on paid plans. Creator: $29.90/month for 150 credits.', 'No editing: script, scenes, narration and captions arrive as one vertical MP4.'],
    },
    b: {
      path: ['AI-Video', 'Films'],
      h: ['Cinematic AI Video Online', 'Storms, Crowds and Explosions', 'Script, Scenes and Edit Done', 'Type an Idea, Get a Film', 'Cancel Anytime', ...SAFE_SHARED],
      d: ['Type one sentence. Kineo writes the script, generates every scene and adds narration.', 'Captions, music and the edit included. One vertical MP4, ready to post.', 'Plans from $12.90/month. Creator: $29.90/month for 150 credits.', 'Commercial use on every plan. Paid plans export clean MP4s with no watermark.'],
    },
  },
  {
    key: 'G2', name: 'Kling 3', campaign: 'motor-kling-3', url: '/ai-video-generator/kling-3',
    exact: ['kling 3 app', 'kling 3.0 app', 'use kling 3', 'kling 3 video generator', 'kling 3.0 video generator', 'kling 3 online', 'kling 3 price', 'kling 3 pricing', 'kling 3 lip sync', 'try kling 3'],
    phrase: ['kling 3 app', 'kling 3.0 online', 'use kling 3', 'kling 3 video generator', 'kling 3 price', 'kling 3 lip sync', 'kling 3 ai video', 'where to use kling 3'],
    a: {
      path: ['Kling-3', 'Online'],
      h: ['Kling 3 Online', 'Use Kling 3 Today', 'Kling 3 Video Generator', 'Kling 3 With Lip Sync', 'Kling 3 Clips: 6 Credits', 'Characters Speak On Camera', 'Native Voice and Lip Sync', 'Finished Films, Not Just Clips', '60-Second Film: 150 Credits', 'Plans From $12.90 a Month', 'Narration, Captions and Music', 'No Camera, No Studio, No Actor', 'Commercial Use on Every Plan', 'Film Ready in Minutes', '6 AI Video Models, 1 Account'],
      d: ['Kling 3 inside Kineo: talking characters with native voice and lip sync, fully edited.', 'A 5-second Kling 3 clip costs 6 credits. A finished 60-second film costs 150 credits.', 'Type one sentence. Kineo writes the script, routes scenes to Kling 3 and edits the film.', 'Plans from $12.90/month. Creator ($29.90, 150 credits) covers a 60-second Kling 3 film.'],
    },
    b: {
      path: ['AI-Video', 'Lip-Sync'],
      h: ['Talking Characters, No Camera', 'Characters Speak On Camera', 'Lip Sync AI Video Online', 'No Filming, No Editing', 'Type an Idea, Get a Film', ...SAFE_SHARED],
      d: ['Characters speak on camera with their own generated voice and lip sync, scene by scene.', 'Type one sentence. Kineo writes the script, renders each scene and edits the film.', 'Captions, music and the edit included. One vertical MP4, ready to post.', 'Plans from $12.90/month. Commercial use on every plan, clean MP4 on paid plans.'],
    },
  },
  {
    key: 'G3', name: 'Veo 3.1', campaign: 'motor-veo-3-1', url: '/ai-video-generator/veo',
    exact: ['veo 3.1 app', 'veo 3.1 online', 'use veo 3.1', 'veo 3.1 video generator', 'veo 3.1 ai video generator', 'veo 3.1 price', 'veo 3.1 pricing', 'veo 3.1 access', 'try veo 3.1', 'veo 3.1 fast'],
    phrase: ['veo 3.1 app', 'veo 3.1 online', 'use veo 3.1', 'veo 3.1 video generator', 'veo 3.1 price', 'where to use veo 3.1', 'veo 3.1 text to video', 'veo 3.1 fast video'],
    a: {
      path: ['Veo-3-1', 'Online'],
      h: ['Veo 3.1 Online', 'Use Veo 3.1 Fast Today', 'Veo 3.1 Video Generator', 'Veo 3.1 Fast, Fully Edited', 'Veo 3.1 Clips: 6 Credits', '60-Second Film: 100 Credits', 'Finished Films, Not Just Clips', 'Narration, Captions and Music', 'One Sentence to a Full Video', 'Plans From $12.90 a Month', 'Creator Plan: $29.90 a Month', 'Commercial Use on Every Plan', 'Film Ready in Minutes', 'Vertical 9:16, Ready to Post', '6 AI Video Models, 1 Account'],
      d: ['Kineo runs Veo 3.1 Fast and turns one sentence into a narrated, captioned vertical film.', 'A 6-second Veo 3.1 clip costs 6 credits. A finished 60-second film costs 100 credits.', 'No raw clips to stitch: script, scenes, voiceover, captions and music in one MP4.', 'Plans from $12.90/month. Creator ($29.90, 150 credits) covers a 60-second Veo 3.1 film.'],
    },
    b: {
      path: ['AI-Video', 'Films'],
      h: ['Coherent Scenes From a Prompt', 'No Raw Clips to Stitch', 'Script, Scenes and Edit Done', 'Hero Video of the Week', 'Type an Idea, Get a Film', ...SAFE_SHARED],
      d: ['Type one sentence. Kineo writes the script, generates every scene and edits the film.', 'No raw clips to stitch: voiceover, captions and music arrive in one vertical MP4.', 'Plans from $12.90/month. Commercial use on every plan, clean MP4 on paid plans.', 'Pick the model per video and pay per finished film, with one credit balance.'],
    },
  },
  {
    key: 'G4', name: 'Seedance + Kling + Veo in one app', campaign: 'motor-3-em-1', url: '/seedance-kling-veo-in-one-place',
    exact: ['kling vs veo', 'veo vs kling', 'kling 3 vs veo 3.1', 'veo 3.1 vs kling 3', 'seedance vs kling', 'kling vs seedance', 'seedance 2.5 vs kling 3', 'seedance vs veo', 'ai video generator with veo and kling', 'all ai video models in one place'],
    phrase: ['kling vs veo', 'seedance vs kling', 'veo vs seedance', 'kling and veo in one app', 'seedance kling veo', 'multi model ai video generator', 'ai video generator all models', 'higgsfield alternative'],
    a: {
      path: ['All-Models', 'One-App'],
      h: ['Seedance, Kling and Veo', 'Kling, Veo, Seedance in 1 App', 'Compare Kling, Veo, Seedance', 'One Account, 6 Video Models', 'One Credit Balance for All', 'Pick the Model Per Video', 'Price Per Finished Video', 'Finished Films, Not Just Clips', 'Narration, Captions and Music', 'Plans From $12.90 a Month', 'Commercial Use on Every Plan', 'Film Ready in Minutes', 'Vertical 9:16, Ready to Post', 'Seedance 2.5 Clips: 8 Credits', 'Kling 3 and Veo 3.1 Inside'],
      d: ['Seedance 1.5, Seedance 2.5, Kling 2.5, Kling 3, Veo 3.1 and MiniMax H3 in one account.', 'One credit balance: a finished 60-second video costs 35 to 150 credits by model.', 'Type one sentence. Kineo writes, renders, narrates and edits the film for you.', 'Plans from $12.90/month for 60 credits. Commercial use on every plan.'],
    },
    b: {
      path: ['All-Models', 'One-App'],
      h: ['Six Video Models in One App', 'One Credit Balance for All', 'Pick the Model Per Video', 'Price Per Finished Video', 'Price Table for Each Model', ...SAFE_SHARED],
      d: ['Six AI video models in one account and one credit balance. Pick the model per video.', 'A finished 60-second video costs 35 to 150 credits depending on the model you pick.', 'Type one sentence. Kineo writes, renders, narrates and edits the film for you.', 'Plans from $12.90/month for 60 credits. Commercial use on every plan.'],
    },
  },
]
const negatives = {
  broad: ['free', 'download', 'apk', 'mod', 'crack', 'cracked', 'torrent', 'pirate', 'github', 'huggingface', 'comfyui', 'api', 'jobs', 'job', 'careers', 'career', 'hiring', 'salary', 'internship', 'wiki', 'wikipedia', 'news', 'leak', 'leaked', 'arxiv', 'benchmark', 'reddit', 'discord', 'login', 'dreamina', 'capcut', 'jimeng', 'doubao', 'volcengine', 'byteplus', 'klingai', 'vertex', 'gemini', 'replicate', 'wavespeed', 'runway', 'nsfw', 'nude', 'porn', 'uncensored', 'hentai', 'stock', 'ipo', 'earnings'],
  phrase: ['hugging face', 'open source', 'model weights', 'api key', 'what is', 'release date', 'technical report', 'log in', 'sign in', 'customer service', 'cancel subscription', 'google flow', 'ai studio', 'fal ai', 'share price'],
}
const sitelinks = [
  { text: 'Plans and Prices', d1: 'Starter $12.90 a month', d2: 'Cancel anytime', url: '/pricing' },
  { text: 'All AI Video Models', d1: 'Price per video for each model', d2: 'One credit balance', url: '/ai-video-generator' },
  { text: 'Real Examples', d1: 'Finished vertical AI videos', d2: 'Narration and captions included', url: '/examples' },
  { text: 'Render Time and Cost', d1: 'Render time per AI model', d2: 'October 2026 index', url: '/ai-video-index' },
]

// ── validação ──
const problems = []
const need = (cond, msg) => { if (!cond) problems.push(msg) }
for (const g of groups) {
  for (const kind of ['a', 'b']) {
    const ad = g[kind]
    need(ad.h.length === 15, `${g.key}${kind}: ${ad.h.length} títulos`)
    need(new Set(ad.h.map((x) => x.toLowerCase())).size === ad.h.length, `${g.key}${kind}: título repetido`)
    need(ad.d.length === 4, `${g.key}${kind}: ${ad.d.length} descrições`)
    for (const h of ad.h) { need(h.length <= 30, `${g.key}${kind}: título ${h.length} > 30: ${h}`); need(!FORBIDDEN_H.test(h), `${g.key}${kind}: palavra proibida: ${h}`) }
    for (const d of ad.d) { need(d.length <= 90, `${g.key}${kind}: descrição ${d.length} > 90: ${d}`); need(!FORBIDDEN_D.test(d), `${g.key}${kind}: palavra proibida: ${d}`) }
    for (const p of ad.path) need(p.length <= 15, `${g.key}${kind}: path > 15: ${p}`)
    const all = [...ad.h, ...ad.d].join(' ')
    for (const m of all.match(/\$\d+\.\d\d/g) ?? []) need(PRICES.includes(m), `${g.key}${kind}: preço fora da fonte: ${m}`)
    if (kind === 'b') {
      const safe = [...ad.h, ...ad.d, ...ad.path].join(' | ')
      need(!BRAND.test(safe), `${g.key}b: marca de terceiro no anúncio seguro: ${safe.match(BRAND)}`)
    }
  }
  need(g.exact.length >= 8 && g.phrase.length >= 6, `${g.key}: poucas palavras-chave`)
}
for (const s of sitelinks) {
  need(s.text.length <= 25, `sitelink > 25: ${s.text}`)
  need(s.d1.length <= 35 && s.d2.length <= 35, `sitelink desc > 35: ${s.text}`)
  need(!BRAND.test(`${s.text} ${s.d1} ${s.d2}`), `sitelink com marca: ${s.text}`)
}
const allText = groups.flatMap((g) => [...g.a.h, ...g.a.d, ...g.b.h, ...g.b.d]).join('\n')
need(/^[\x20-\x7E\n]*$/.test(allText), 'texto fora do ASCII')
const kws = groups.flatMap((g) => [...g.exact, ...g.phrase])
for (const kw of kws) {
  const words = kw.split(/\s+/)
  for (const n of negatives.broad) need(!words.includes(n), `negativa ampla "${n}" bloqueia "${kw}"`)
  for (const n of negatives.phrase) need(!` ${kw} `.includes(` ${n} `), `negativa de frase "${n}" bloqueia "${kw}"`)
}
if (problems.length) { console.error(problems.join('\n')); process.exit(1) }

// ── CSVs (ASCII, CRLF) ──
const q = (v) => { const s = String(v ?? ''); return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s }
const write = (name, header, rows) => fs.writeFileSync(path.join(OUT, name), [header, ...rows].map((r) => r.map(q).join(',')).join('\r\n') + '\r\n')
const adGroupName = (g) => `${g.key} - ${g.name}`
write('1-campanha.csv', ['Campaign', 'Campaign Type', 'Networks', 'Budget', 'Budget type', 'Bid Strategy Type', 'Maximum CPC bid limit', 'Languages', 'Final URL suffix', 'Campaign Status'],
  [[CAMPAIGN, 'Search', 'Google search', '18.00', 'Daily', 'Maximize clicks', '1.00', 'en', 'utm_term={keyword}&utm_content={creative}', 'Paused']])
write('2-locais.csv', ['Campaign', 'Location', 'Location ID'],
  [['United States', '2840'], ['United Kingdom', '2826'], ['Canada', '2124'], ['Australia', '2036']].map(([n, id]) => [CAMPAIGN, n, id]))
write('3-grupos.csv', ['Campaign', 'Ad Group', 'Ad Group Status'], groups.map((g) => [CAMPAIGN, adGroupName(g), 'Enabled']))
write('4-palavras-chave.csv', ['Campaign', 'Ad Group', 'Keyword', 'Criterion Type', 'Status'],
  groups.flatMap((g) => [...g.exact.map((k) => [CAMPAIGN, adGroupName(g), k, 'Exact', 'Enabled']), ...g.phrase.map((k) => [CAMPAIGN, adGroupName(g), k, 'Phrase', 'Enabled'])]))
write('5-negativas.csv', ['Campaign', 'Keyword', 'Criterion Type'],
  [...negatives.broad.map((k) => [CAMPAIGN, k, 'Campaign Negative Broad']), ...negatives.phrase.map((k) => [CAMPAIGN, k, 'Campaign Negative Phrase'])])
const adHeader = ['Campaign', 'Ad Group', 'Ad type', ...Array.from({ length: 15 }, (_, i) => `Headline ${i + 1}`), ...Array.from({ length: 4 }, (_, i) => `Description ${i + 1}`), 'Path 1', 'Path 2', 'Final URL', 'Status']
write('6-anuncios.csv', adHeader, groups.flatMap((g) => ['a', 'b'].map((kind) => [CAMPAIGN, adGroupName(g), 'Responsive search ad', ...g[kind].h, ...g[kind].d, ...g[kind].path, `${BASE}${g.url}?${utm(g.campaign)}`, 'Enabled'])))
write('7-sitelinks.csv', ['Campaign', 'Ad Group', 'Link Text', 'Description Line 1', 'Description Line 2', 'Final URL'],
  groups.flatMap((g) => sitelinks.map((s) => [CAMPAIGN, adGroupName(g), s.text, s.d1, s.d2, `${BASE}${s.url}?${utm(g.campaign)}`])))

// ── tabelas para o doc ──
let md = ''
for (const g of groups) {
  md += `\n### ${g.key} — ${g.name}\n\n`
  md += `**URL final:** \`${BASE}${g.url}?${utm(g.campaign)}\`\n\n`
  md += `**Palavras-chave — exata:** ${g.exact.map((k) => `\`[${k}]\``).join(' · ')}\n\n`
  md += `**Palavras-chave — frase:** ${g.phrase.map((k) => `\`"${k}"\``).join(' · ')}\n\n`
  for (const [kind, label] of [['a', 'Anúncio A — com o nome do motor (clique melhor; pode ser reprovado por marca)'], ['b', 'Anúncio B — seguro, sem marca de terceiro (a marca fica só na palavra-chave)']]) {
    const ad = g[kind]
    md += `**${label}** · caminho exibido: usekineo.com/${ad.path.join('/')}\n\n| # | Título (≤ 30) | car. |\n|---|---|---|\n`
    ad.h.forEach((h, i) => { md += `| ${i + 1} | ${h} | ${h.length} |\n` })
    md += `\n| # | Descrição (≤ 90) | car. |\n|---|---|---|\n`
    ad.d.forEach((d, i) => { md += `| ${i + 1} | ${d} | ${d.length} |\n` })
    md += '\n'
  }
}
md += `\n### Negativas (nível da campanha)\n\n**Ampla (bloqueia toda busca que tenha a palavra):** ${negatives.broad.map((k) => `\`${k}\``).join(' · ')}\n\n**Frase:** ${negatives.phrase.map((k) => `\`"${k}"\``).join(' · ')}\n`
md += `\n### Sitelinks (os mesmos 4 em cada grupo, com o utm_campaign do grupo no destino)\n\n| Texto (≤ 25) | Linha 1 (≤ 35) | Linha 2 (≤ 35) | Destino |\n|---|---|---|---|\n`
sitelinks.forEach((s) => { md += `| ${s.text} | ${s.d1} | ${s.d2} | ${s.url} |\n` })
if (MD_OUT) fs.writeFileSync(MD_OUT, md)
console.log(`ok: ${groups.length} grupos, ${groups.length * 2} anúncios, ${kws.length} palavras-chave, ${negatives.broad.length + negatives.phrase.length} negativas, ${sitelinks.length * groups.length} sitelinks`)
