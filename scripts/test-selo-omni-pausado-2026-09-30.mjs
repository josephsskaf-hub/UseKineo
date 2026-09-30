// KINEO-SELO-OMNI-POPUP-2026-09-30 — guardião do selo honesto: motor PAUSADO não vira promessa de compra.
//
// O caso (30/09, testando /pricing): o pop-up "Your first month is 20% off" prometia, no cartão Studio,
// "N films on Omni Flash — the #1 model — plus change" com o Omni pausado desde 15/09 (PAUSED_ENGINE_KEYS em
// lib/engineLaunch.ts). A mesma promessa morava na home, no exit-intent, na FAQ do /pricing, no /ph, no
// /kineo-vs-higgsfield e na FAQ de custo do /ai-robot-video-generator.
//
// Regra travada aqui: toda citação do Omni Flash nessas superfícies de venda passa pelo interruptor
// (enginePaused('omni')); no pop-up, o motor-âncora do Studio é escolhido pelo interruptor e o ramo pausado é um
// motor ATIVO. Node puro (readFileSync, sem alias @/), com mutantes em memória: reintroduzir a linha velha dá
// vermelho em toda rodada.
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

function pausedKeys(engineLaunch) {
  const m = engineLaunch.match(/export const PAUSED_ENGINE_KEYS\b[^=]*=\s*\[([^\]]*)\]/)
  assert.ok(m, 'PAUSED_ENGINE_KEYS não encontrado em lib/engineLaunch.ts')
  return [...m[1].matchAll(/'([^']+)'/g)].map((x) => x[1])
}

// Motor da UI → quality do biller, para saber se o ramo "pausado" aponta para um motor ativo.
const QUALITY_TO_KEY = { cinematic_hollywood: 'hollywood', cinematic_h3: 'h3', cinematic_omni: 'omni', cinematic_s25: 's25', cinematic_veo: 'veo', cinematic_kling: 'kling', cinematic_ai: 'seedance' }

const SUPERLATIVE = /#1(?![0-9a-fA-F])|the #1|number one|best model/i

function modalViolations(s, paused) {
  const v = []
  const c = code(s)
  if (!/import \{[^}]*\benginePaused\b[^}]*\} from '@\/lib\/engineLaunch'/.test(c)) v.push('modal não importa enginePaused de @/lib/engineLaunch')
  if (!/const studioLead = enginePaused\('omni'\) \? KLING3_LEAD : OMNI_LEAD\b/.test(c)) v.push('studioLead não é escolhido pelo interruptor (enginePaused(\'omni\') ? KLING3_LEAD : OMNI_LEAD)')
  const k3 = c.match(/const KLING3_LEAD = \{ quality: '([a-z_0-9]+)', film: '([^']+)' \} as const/)
  if (!k3) v.push('KLING3_LEAD ausente ou fora do formato')
  else {
    const key = QUALITY_TO_KEY[k3[1]]
    if (!key || paused.includes(key)) v.push(`ramo pausado aponta para motor inativo (${k3[1]})`)
    if (/omni/i.test(k3[2])) v.push('ramo pausado cita Omni')
    if (k3[1] === 'cinematic_hollywood' && !/Kling 3/.test(k3[2])) v.push('rótulo do ramo pausado não bate com o motor (Kling 3)')
  }
  // Toda linha de código que cita Omni tem de ser a definição do OMNI_LEAD (o ramo ativo do interruptor).
  for (const line of c.split('\n')) {
    const rest = line.replace(/enginePaused\('omni'\)/g, '').replace(/\bOMNI_LEAD\b/g, '')
    if (!/omni/i.test(rest)) continue
    if (/^const OMNI_LEAD = \{ quality: 'cinematic_omni', film: '[^']*' \} as const$/.test(line.trim())) continue
    v.push(`Omni citado fora do interruptor: ${line.trim().slice(0, 140)}`)
  }
  const perks = [...c.matchAll(/perks:\s*\[([\s\S]*?)\],\n/g)].map((m) => m[1])
  if (perks.length < 2) v.push(`esperava os perks de Creator e Studio, achei ${perks.length}`)
  for (const p of perks) {
    if (/omni/i.test(p)) v.push(`perk cita Omni direto: ${p.trim().slice(0, 140)}`)
    if (SUPERLATIVE.test(p)) v.push(`perk com superlativo sem prova: ${p.trim().slice(0, 140)}`)
    if (/plus change/i.test(p)) v.push('perk promete "plus change" (sobra não derivada)')
  }
  if (!perks.some((p) => /videosPerMonth\('pro', studioLead\.quality\)/.test(p))) v.push('perk do Studio não deriva o número do motor escolhido (videosPerMonth(\'pro\', studioLead.quality))')
  return v
}

// Superfícies com a regra simples: toda linha de código com "Omni Flash" é o ramo "no ar" de enginePaused('omni').
function gatedViolations(s, name) {
  const v = []
  const c = code(s)
  for (const line of c.split('\n')) {
    const re = /omni flash/gi
    let m
    while ((m = re.exec(line))) {
      const prefix = line.slice(0, m.index)
      const guardedAnd = prefix.includes("!enginePaused('omni') &&")
      const t = prefix.lastIndexOf("enginePaused('omni') ?")
      const guardedTernary = t >= 0 && !prefix.slice(t).startsWith("!") && prefix.slice(t).includes(' : ') && prefix[t - 1] !== '!'
      if (!guardedAnd && !guardedTernary) v.push(`${name}: Omni Flash sem interruptor: ${line.trim().slice(0, 160)}`)
    }
  }
  if (/omni flash/i.test(c) && !/\benginePaused\b/.test(c.match(/^import[^\n]*engineLaunch[^\n]*$/m)?.[0] ?? '')) v.push(`${name}: cita Omni Flash sem importar enginePaused`)
  return v
}

function robotViolations(s) {
  const v = []
  const c = code(s)
  if (!/const OMNI_PAUSED = Boolean\(enginePaused\('omni'\)\)/.test(c)) v.push('robot: OMNI_PAUSED não lê o interruptor')
  if (/videosPerMonth\('pro', 'cinematic_omni'\)/.test(c)) v.push('robot: promessa de plano cravada no Omni (videosPerMonth(\'pro\', \'cinematic_omni\'))')
  if (/plus change/i.test(c)) v.push('robot: "plus change" (sobra não derivada)')
  if (!/const PLAN_ENGINE = OMNI_PAUSED \? \{ quality: 'cinematic_hollywood'/.test(c)) v.push('robot: com o Omni pausado o custo não cai no Kling 3')
  if (!/\{OMNI_PAUSED && \(/.test(c)) v.push('robot: sem aviso visível de pausa')
  return v
}

function allViolations(sources) {
  const paused = pausedKeys(sources.engineLaunch)
  return [
    ...modalViolations(sources.modal, paused),
    ...gatedViolations(sources.landing, 'home'),
    ...gatedViolations(sources.exitOffer, 'exit-intent'),
    ...gatedViolations(sources.pricing, '/pricing'),
    ...gatedViolations(sources.ph, '/ph'),
    ...gatedViolations(sources.higgsfield, '/kineo-vs-higgsfield'),
    ...robotViolations(sources.robot),
  ]
}

let passed = 0
const ok = (name) => { passed++; console.log(`✓ ${name}`) }

// 1. O interruptor existe, é lido por enginePaused e hoje pausa o Omni (a razão de existir deste guardião).
const paused = pausedKeys(src.engineLaunch)
assert.ok(/export function enginePaused[\s\S]{0,300}PAUSED_ENGINE_KEYS/.test(src.engineLaunch), 'enginePaused não lê PAUSED_ENGINE_KEYS')
ok(`PAUSED_ENGINE_KEYS = [${paused.join(', ')}] e enginePaused lê a lista`)
assert.match(src.engineLaunch, /omni: \{[^\n]*alternative: \{ key: 'hollywood', label: 'Kling 3' \}/, 'a alternativa oficial do Omni deixou de ser Kling 3 — revisar o ramo pausado do pop-up')
ok('alternativa oficial do Omni no ENGINE_PAUSE = Kling 3 (o ramo pausado do pop-up)')
if (paused.includes('omni')) ok('Omni PAUSADO hoje: nenhuma superfície de venda pode prometê-lo')
else ok('Omni no ar hoje: as linhas condicionais mostram o Omni sozinhas')

// 2. A árvore atual está limpa.
const current = allViolations(src)
assert.deepEqual(current, [], `violações:\n  ${current.join('\n  ')}`)
ok('pop-up, home, exit-intent, /pricing, /ph, /kineo-vs-higgsfield e /ai-robot-video-generator passam pelo interruptor')

// 3. Mutantes em memória: cada um tem de APLICAR (texto mudou) e ficar VERMELHO.
function mutant(name, key, from, to) {
  const before = src[key]
  const after = typeof from === 'string' ? before.split(from).join(to) : before.replace(from, to)
  assert.ok(after !== before, `mutante "${name}" não aplicou — âncora envelhecida`)
  const v = allViolations({ ...src, [key]: after })
  assert.ok(v.length > 0, `mutante "${name}" passou verde — o guardião não trava a regressão`)
  ok(`mutante vermelho: ${name} (${v.length} ${v.length > 1 ? 'violações' : 'violação'})`)
}

mutant('linha velha do pop-up reintroduzida', 'modal',
  /perks: \[`\$\{formatResultCount\(videosPerMonth\('pro', studioLead\.quality\), studioLead\.film\)\}[^`]*`, /,
  "perks: [`${formatResultCount(videosPerMonth('pro', 'cinematic_omni'), 'film')} on Omni Flash — the #1 model — plus change`, ")
mutant('interruptor invertido no pop-up', 'modal',
  "const studioLead = enginePaused('omni') ? KLING3_LEAD : OMNI_LEAD", "const studioLead = enginePaused('omni') ? OMNI_LEAD : KLING3_LEAD")
mutant('interruptor removido do pop-up', 'modal',
  "const studioLead = enginePaused('omni') ? KLING3_LEAD : OMNI_LEAD", 'const studioLead = OMNI_LEAD')
mutant('ramo pausado do pop-up apontando para motor pausado', 'modal',
  "const KLING3_LEAD = { quality: 'cinematic_hollywood', film: 'Kling 3 film' } as const", "const KLING3_LEAD = { quality: 'cinematic_s25', film: 'Kling 3 film' } as const")
mutant('superlativo de volta no perk do Studio', 'modal',
  "'MiniMax H3 film')}`, 'Kling 3 film scenes", "'MiniMax H3 film')} — the #1 model`, 'Kling 3 film scenes")
mutant('home: linha do Omni sem interruptor', 'landing',
  /\{enginePaused\('omni'\) \? <li>.*? : (<li>.*?films on Omni Flash.*?<\/li>)\}/, '$1')
mutant('exit-intent: chip "OMNI FLASH · #1" fixo', 'exitOffer',
  "[...(enginePaused('omni') ? [] : ['OMNI FLASH']), 'VEO 3.1',", "['OMNI FLASH · #1', 'VEO 3.1',")
mutant('/pricing: "Kling 3 or Omni Flash" fixo', 'pricing',
  "Kling 3${enginePaused('omni') ? '' : ' or Omni Flash'} =", 'Kling 3 or Omni Flash =')
mutant('/ph: lista digitada com Omni', 'ph',
  'button ({VIDEO_ENGINE_LIST_COPY}).', 'button (Veo 3.1, Kling 3, Seedance, MiniMax H3, Omni Flash).')
mutant('/ph: plano Studio com Omni fixo', 'ph',
  "MiniMax H3${enginePaused('omni') ? '' : ', Omni Flash'}", 'MiniMax H3, Omni Flash')
mutant('/kineo-vs-higgsfield: "seven, incl. Omni Flash (#1)"', 'higgsfield',
  '`Yes — ${ENGINE_COUNT}: ${VIDEO_ENGINE_LIST_COPY}`', "'Yes — seven, incl. Omni Flash (#1, Aug 2026)'")
mutant('/ai-robot: custo do plano cravado no Omni', 'robot',
  "videosPerMonth('pro', PLAN_ENGINE.quality)", "videosPerMonth('pro', 'cinematic_omni')")
mutant('/ai-robot: aviso de pausa removido', 'robot', '{OMNI_PAUSED && (', '{false && (')

console.log(`\n${passed}/${passed} selo-omni-pausado checks passed`)
