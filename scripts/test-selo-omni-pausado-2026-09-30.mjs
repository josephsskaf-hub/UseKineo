// KINEO-SELO-OMNI-POPUP-2026-09-30 — guardião do selo honesto: motor PAUSADO não vira promessa de compra.
//
// O caso (30/09, testando /pricing): o pop-up "Your first month is 20% off" prometia, no cartão Studio,
// "N films on Omni Flash — the #1 model — plus change" com o Omni pausado desde 15/09 (PAUSED_ENGINE_KEYS em
// lib/engineLaunch.ts). A mesma promessa morava na home, no exit-intent, na FAQ do /pricing, no /ph, no
// /kineo-vs-higgsfield e na FAQ de custo do /ai-robot-video-generator.
//
// REANCORADO KINEO-OMNI-FORA-2026-10-12 (com motivo): ordem do fundador (12/10, noite) — "tira o Omni sim… dos motores,
// a gente vai arrumar mais pra frente… mas NÃO tira os vídeos que ele nos proporcionou, deixa os vídeos." Antes, cada
// superfície LIA o interruptor (enginePaused('omni')) e mostrava o Omni sozinha quando ele voltasse. Agora o Omni está
// FORA DA OFERTA (lib/engineLaunch.ts OFFER_RETIRED_ENGINE_KEYS): nenhuma destas superfícies de venda o cita em código —
// nem como ramo condicional — e voltar com ele é decisão do fundador. A regra fica MAIS forte, não mais fraca:
//   · o Omni continua PAUSADO no servidor (recusa antes de qualquer débito) e fora da oferta;
//   · nenhuma linha de código destas 7 superfícies cita "Omni Flash", engine=omni ou cinematic_omni;
//   · o pop-up ancora o Studio no Kling 3 (motor ativo), sem superlativo e sem "plus change";
//   · o /ai-robot-video-generator vende o Kling 3 e o FILME dos robôs (render real do Omni) continua na página.
// Node puro (readFileSync, sem alias @/), com mutantes em memória: reintroduzir qualquer linha velha dá vermelho.
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

const read = (p) => readFileSync(new URL(`../${p}`, import.meta.url), 'utf8').replace(/\r\n/g, '\n')

const FILES = {
  engineLaunch: 'lib/engineLaunch.ts',
  modal: 'components/WelcomeOfferModal.tsx',
  landing: 'app/KineoLanding.tsx',
  exitOffer: 'components/ExitIntentOffer.tsx',
  pricing: 'app/pricing/PricingClient.tsx',
  ph: 'app/ph/page.tsx',
  higgsfield: 'app/kineo-vs-higgsfield/page.tsx',
  robot: 'app/ai-robot-video-generator/page.tsx',
}
const src = Object.fromEntries(Object.entries(FILES).map(([k, p]) => [k, read(p)]))

// Comentários fora (// só quando não é "://" de URL). Comentário não é copy.
function code(s) {
  return s.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:])\/\/.*$/gm, '$1')
}

function listOf(engineLaunch, name) {
  const m = engineLaunch.match(new RegExp(`export const ${name}\\b[^=]*=\\s*\\[([^\\]]*)\\]`))
  assert.ok(m, `${name} não encontrado em lib/engineLaunch.ts`)
  return [...m[1].matchAll(/'([^']+)'/g)].map((x) => x[1])
}

// Motor da UI → quality do biller, para saber se o motor-âncora do pop-up é um motor ativo e na oferta.
const QUALITY_TO_KEY = { cinematic_hollywood: 'hollywood', cinematic_h3: 'h3', cinematic_omni: 'omni', cinematic_s25: 's25', cinematic_veo: 'veo', cinematic_kling: 'kling', cinematic_ai: 'seedance' }

const SUPERLATIVE = /#1(?![0-9a-fA-F])|the #1|number one|best model/i
// O que não pode aparecer em CÓDIGO (fora de comentário) numa superfície de venda.
const OMNI_IN_CODE = /omni flash|engine=omni|cinematic_omni|enginePaused\('omni'\)|OMNI_LEAD|OMNI_PAUSED/i

function omniLines(s, name) {
  return code(s).split('\n').filter((l) => OMNI_IN_CODE.test(l)).map((l) => `${name}: Omni em código de venda: ${l.trim().slice(0, 160)}`)
}

function modalViolations(s, paused, retired) {
  const v = []
  const c = code(s)
  if (!/^const studioLead = KLING3_LEAD$/m.test(c)) v.push('studioLead não é o Kling 3 fixo (const studioLead = KLING3_LEAD)')
  const k3 = c.match(/const KLING3_LEAD = \{ quality: '([a-z_0-9]+)', film: '([^']+)' \} as const/)
  if (!k3) v.push('KLING3_LEAD ausente ou fora do formato')
  else {
    const key = QUALITY_TO_KEY[k3[1]]
    if (!key || paused.includes(key) || retired.includes(key)) v.push(`motor-âncora do Studio pausado ou fora da oferta (${k3[1]})`)
    if (/omni/i.test(k3[2])) v.push('motor-âncora cita Omni')
    if (k3[1] === 'cinematic_hollywood' && !/Kling 3/.test(k3[2])) v.push('rótulo do motor-âncora não bate com o motor (Kling 3)')
  }
  v.push(...omniLines(s, 'pop-up'))
  const perks = [...c.matchAll(/perks:\s*\[([\s\S]*?)\],\n/g)].map((m) => m[1])
  if (perks.length < 2) v.push(`esperava os perks de Creator e Studio, achei ${perks.length}`)
  for (const p of perks) {
    if (/omni/i.test(p)) v.push(`perk cita Omni direto: ${p.trim().slice(0, 140)}`)
    if (SUPERLATIVE.test(p)) v.push(`perk com superlativo sem prova: ${p.trim().slice(0, 140)}`)
    if (/plus change/i.test(p)) v.push('perk promete "plus change" (sobra não derivada)')
  }
  if (!perks.some((p) => /videosPerMonth\('pro', studioLead\.quality\)/.test(p))) v.push('perk do Studio não deriva o número do motor-âncora (videosPerMonth(\'pro\', studioLead.quality))')
  return v
}

function robotViolations(s) {
  const v = []
  const c = code(s)
  if (!/^const PLAN_ENGINE = \{ quality: 'cinematic_hollywood', name: 'Kling 3' \} as const$/m.test(c)) v.push('robot: o custo do plano não é o do Kling 3 fixo')
  if (/videosPerMonth\('pro', 'cinematic_omni'\)/.test(c)) v.push('robot: promessa de plano cravada no Omni (videosPerMonth(\'pro\', \'cinematic_omni\'))')
  if (/plus change/i.test(c)) v.push('robot: "plus change" (sobra não derivada)')
  if (/#1-ranked|ranked #1/i.test(c)) v.push('robot: superlativo do ranking de agosto de volta')
  v.push(...omniLines(s, 'robot'))
  // "deixa os vídeos": o filme dos robôs (render real do Omni) continua embutido na página.
  if (!/^const VIDEO_URL =/m.test(c) || !/<video\n\s*src=\{VIDEO_URL\}/.test(c)) v.push('robot: o filme dos robôs sumiu da página (o vídeo tinha de ficar)')
  return v
}

function allViolations(sources) {
  const paused = listOf(sources.engineLaunch, 'PAUSED_ENGINE_KEYS')
  const retired = listOf(sources.engineLaunch, 'OFFER_RETIRED_ENGINE_KEYS')
  return [
    ...(paused.includes('omni') ? [] : ['servidor: o Omni saiu da pausa (PAUSED_ENGINE_KEYS) — voltaria a ser cobrável']),
    ...(retired.includes('omni') ? [] : ['oferta: o Omni saiu de OFFER_RETIRED_ENGINE_KEYS']),
    ...modalViolations(sources.modal, paused, retired),
    ...omniLines(sources.landing, 'home'),
    ...omniLines(sources.exitOffer, 'exit-intent'),
    ...omniLines(sources.pricing, '/pricing'),
    ...omniLines(sources.ph, '/ph'),
    ...omniLines(sources.higgsfield, '/kineo-vs-higgsfield'),
    ...robotViolations(sources.robot),
  ]
}

let passed = 0
const ok = (name) => { passed++; console.log(`✓ ${name}`) }

// 1. O Omni segue PAUSADO no servidor (o portão que recusa sem cobrar) e FORA DA OFERTA.
const paused = listOf(src.engineLaunch, 'PAUSED_ENGINE_KEYS')
const retired = listOf(src.engineLaunch, 'OFFER_RETIRED_ENGINE_KEYS')
assert.ok(/export function enginePaused[\s\S]{0,300}PAUSED_ENGINE_KEYS/.test(src.engineLaunch), 'enginePaused não lê PAUSED_ENGINE_KEYS')
assert.ok(paused.includes('omni'), 'o Omni saiu da pausa — o servidor voltaria a aceitá-lo (não religar sem ordem do fundador)')
ok(`PAUSED_ENGINE_KEYS = [${paused.join(', ')}]: o Omni segue recusado pelo servidor antes de qualquer débito`)
assert.ok(retired.includes('omni'), 'OFFER_RETIRED_ENGINE_KEYS sem o Omni')
assert.ok(/export function engineOffered[\s\S]{0,300}OFFER_RETIRED_ENGINE_KEYS/.test(src.engineLaunch), 'engineOffered não lê OFFER_RETIRED_ENGINE_KEYS')
ok(`OFFER_RETIRED_ENGINE_KEYS = [${retired.join(', ')}]: o Omni está fora da oferta`)

// 2. A árvore atual está limpa.
const current = allViolations(src)
assert.deepEqual(current, [], `violações:\n  ${current.join('\n  ')}`)
ok('pop-up, home, exit-intent, /pricing, /ph, /kineo-vs-higgsfield e /ai-robot-video-generator sem Omni em código de venda; filme dos robôs mantido')

// 3. Mutantes em memória: cada um tem de APLICAR (texto mudou) e ficar VERMELHO.
function mutant(name, key, from, to) {
  const before = src[key]
  const after = typeof from === 'string' ? before.split(from).join(to) : before.replace(from, to)
  assert.ok(after !== before, `mutante "${name}" não aplicou — âncora envelhecida`)
  const v = allViolations({ ...src, [key]: after })
  assert.ok(v.length > 0, `mutante "${name}" passou verde — o guardião não trava a regressão`)
  ok(`mutante vermelho: ${name} (${v.length} ${v.length > 1 ? 'violações' : 'violação'})`)
}

mutant('Omni sai da pausa no servidor', 'engineLaunch',
  "export const PAUSED_ENGINE_KEYS: readonly PausedEngineKey[] = ['omni']", 'export const PAUSED_ENGINE_KEYS: readonly PausedEngineKey[] = []')
mutant('linha velha do pop-up reintroduzida', 'modal',
  /perks: \[`\$\{formatResultCount\(videosPerMonth\('pro', studioLead\.quality\), studioLead\.film\)\}[^`]*`, /,
  "perks: [`${formatResultCount(videosPerMonth('pro', 'cinematic_omni'), 'film')} on Omni Flash — the #1 model — plus change`, ")
mutant('interruptor do Omni de volta no pop-up', 'modal',
  'const studioLead = KLING3_LEAD', "const OMNI_LEAD = { quality: 'cinematic_omni', film: 'Omni Flash film' } as const\nconst studioLead = enginePaused('omni') ? KLING3_LEAD : OMNI_LEAD")
mutant('motor-âncora do pop-up apontando para motor pausado', 'modal',
  "const KLING3_LEAD = { quality: 'cinematic_hollywood', film: 'Kling 3 film' } as const", "const KLING3_LEAD = { quality: 'cinematic_omni', film: 'Kling 3 film' } as const")
mutant('superlativo de volta no perk do Studio', 'modal',
  "'MiniMax H3 film')}`, 'Kling 3 film scenes", "'MiniMax H3 film')} — the #1 model`, 'Kling 3 film scenes")
mutant('home: linha do Omni de volta no cartão Studio', 'landing',
  "<li><span className=\"ck\">✓</span><UiLabel> Or </UiLabel><b>{filmsOn('pro', 'cinematic_hollywood')}",
  "{enginePaused('omni') ? null : <li><span className=\"ck\">✓</span><UiLabel> Or </UiLabel><b>{filmsOn('pro', 'cinematic_omni')}<UiLabel> films on Omni Flash</UiLabel></b></li>}<li><span className=\"ck\">✓</span><UiLabel> Or </UiLabel><b>{filmsOn('pro', 'cinematic_hollywood')}")
mutant('home: item do Omni de volta no mega-menu', 'landing',
  '<NavEngineItem href="/studio?engine=veo&intent_campaign=nav_mega"',
  '<NavEngineItem href="/studio?engine=omni&intent_campaign=nav_mega" name="Omni Flash" desc="x" /><NavEngineItem href="/studio?engine=veo&intent_campaign=nav_mega"')
mutant('exit-intent: chip "OMNI FLASH" de volta', 'exitOffer',
  "{['VEO 3.1', ", "{['OMNI FLASH', 'VEO 3.1', ")
mutant('/pricing: "Kling 3 or Omni Flash" de volta', 'pricing',
  'Kling 3 = ${creditsPerReferenceVideo(\'cinematic_hollywood\')}', 'Kling 3 or Omni Flash = ${creditsPerReferenceVideo(\'cinematic_hollywood\')}')
mutant('/ph: lista digitada com Omni', 'ph',
  'button ({VIDEO_ENGINE_LIST_COPY}).', 'button (Veo 3.1, Kling 3, Seedance, MiniMax H3, Omni Flash).')
mutant('/ph: plano Studio com Omni', 'ph',
  "`Kling 3, Veo 3.1, MiniMax H3${AVATAR_PUBLIC", "`Kling 3, Veo 3.1, MiniMax H3, Omni Flash${AVATAR_PUBLIC")
mutant('/kineo-vs-higgsfield: "seven, incl. Omni Flash (#1)"', 'higgsfield',
  '`Yes — ${ENGINE_COUNT}: ${VIDEO_ENGINE_LIST_COPY}`', "'Yes — seven, incl. Omni Flash (#1, Aug 2026)'")
mutant('/ai-robot: custo do plano cravado no Omni', 'robot',
  "videosPerMonth('pro', PLAN_ENGINE.quality)", "videosPerMonth('pro', 'cinematic_omni')")
mutant('/ai-robot: interruptor do Omni de volta', 'robot',
  "const PLAN_ENGINE = { quality: 'cinematic_hollywood', name: 'Kling 3' } as const",
  "const OMNI_PAUSED = Boolean(enginePaused('omni'))\nconst PLAN_ENGINE = OMNI_PAUSED ? { quality: 'cinematic_hollywood', name: 'Kling 3' } as const : { quality: 'cinematic_omni', name: 'Omni Flash' } as const")
mutant('/ai-robot: "#1-ranked" de volta na descrição', 'robot',
  'soundtrack. Watch the real film', 'soundtrack, rendered by the #1-ranked video model. Watch the real film')
mutant('/ai-robot: o filme dos robôs some da página', 'robot',
  '          src={VIDEO_URL}\n', '          src={undefined}\n')

console.log(`\n${passed}/${passed} selo-omni-pausado checks passed`)
