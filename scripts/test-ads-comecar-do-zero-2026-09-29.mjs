// KINEO-ADS-COMECAR-DO-ZERO-2026-09-29 — guardião do "Start from scratch" e do "Delete old photos and videos" no /ads/new.
// Fundador 28/09: "ter o botão para ela conseguir dar clear em tudo, para a pessoa começar do zero"; 29/09: "preciso que
// coloque um comando que apaga as fotos e vídeos antigos no ads". O assistente reaproveitava o último pedido
// (REUSABLE_STATUSES + hydrate), e a marca, as fotos e os vídeos dos testes antigos voltavam.
// Prova: (1) os dois botões existem nos dois modos; (2) "Start from scratch" cria pedido NOVO e vazio, sem copiar nada do
// anterior, e o hydrate escolhe esse pedido depois de recarregar; (3) o apagar RODA de verdade (funções extraídas do
// arquivo, com fetch falso): confirma antes, chama DELETE /api/footage um por um, pula o que está em 'rendering', não apaga
// o logo e tira os ids do pedido atual antes de apagar. Só readFileSync (sem alias @/).
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { createRequire } from 'node:module'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const rd = (p) => readFileSync(join(root, p), 'utf8').replace(/\r\n/g, '\n')
let ok = 0
const falhas = []
const checa = (nome, cond) => { if (cond) { ok += 1; return } falhas.push(nome); console.error('  ✗ ' + nome) }
const count = (s, needle) => s.split(needle).length - 1

const W = rd('app/(dashboard)/ads/new/AdsWizardClient.tsx')
const ROUTE = rd('app/api/ads/orders/route.ts')
const FOOTAGE = rd('app/api/footage/route.ts')
const EVENTS = rd('lib/ads/events.ts')
const panel = W.slice(W.indexOf('function AdsAutoPanel('), W.indexOf('// ─── passo 1: brief'))
const mediaStep = W.slice(W.indexOf('function MediaStep('), W.indexOf('// ─── passo 3: modelo'))
const main = W.slice(W.indexOf('export default function AdsWizardClient('), W.indexOf('/** KINEO-ADS-KIT-MARCA-2026-09-26'))
const fnSrc = (name, prefix = 'function') => { const i = W.indexOf(`${prefix} ${name}(`); return i < 0 ? '' : W.slice(i, W.indexOf('\n}\n', i) + 3) }

// ── 1. os dois botões, nos dois modos ─────────────────────────────────────────────────────────
checa('1a. "Start from scratch" aparece em todo passo do assistente, sem depender do modo (IA ou passo a passo)',
  main.includes('const scratchOn = boot.kind === \'ready\' && stepIndex >= 0\n') &&
  /\{scratchOn \? \(\n\s+<div className="row adsw-scratch">\n\s+<button type="button" className="adsw-btn ghost small" disabled=\{scratchBusy \|\| busyNew\} aria-busy=\{scratchBusy\} onClick=\{\(\) => void startFromScratch\(\)\}>\n\s+\{scratchBusy \? 'Starting a new ad…' : 'Start from scratch'\}/.test(main))
checa('1b. o botão fica no topo, logo depois dos botões de modo e antes do conteúdo do passo',
  main.indexOf('>Step by step</button>') > 0 && main.indexOf('>Step by step</button>') < main.indexOf('{scratchOn ? (') && main.indexOf('{scratchOn ? (') < main.indexOf('<Fragment key={freshRound}>{content}</Fragment>'))
checa('1c. "Delete old photos and videos" no modo IA (painel) e no passo a passo (etapa de fotos)',
  count(panel, '>Delete old photos and videos</button>') === 1 && count(mediaStep, '>Delete old photos and videos</button>') === 1 && count(W, '>Delete old photos and videos</button>') === 2)
checa('1d. botões de apagar desabilitados durante a ação (sem duplo clique) e com resultado em role="status"',
  panel.includes('<button type="button" className="adsw-btn ghost small" disabled={Boolean(busy)} onClick={() => void deleteOld()}>') &&
  mediaStep.includes('<button type="button" className="adsw-btn ghost small" disabled={Boolean(busy) || saving} onClick={() => void deleteOld()}>') &&
  count(W, '{cleanNote ? <p className="adsw-hint" role="status">{cleanNote}</p> : null}') === 2 &&
  panel.includes('if (anon || busy) return') && mediaStep.includes('if (busy || saving) return'))

// ── 2. Start from scratch = pedido novo e vazio, sem reaproveitar ─────────────────────────────
const scratch = fnSrc('startFromScratch', 'async function')
checa('2a. confirma antes com a frase combinada',
  scratch.includes(`if (!window.confirm("Start a new ad from zero? Your finished ads stay in 'Your ads'.")) return`) &&
  scratch.indexOf('window.confirm(') < scratch.indexOf("callJson<{ order: AdsOrder }>('/api/ads/orders'"))
checa('2b. cria o pedido pelo POST de sempre com corpo VAZIO (sem brief, logo, fotos, vídeos ou texto) e não copia nada',
  scratch.includes("await callJson<{ order: AdsOrder }>('/api/ads/orders', { method: 'POST', headers: JSON_HEADERS, body: JSON.stringify({}) })") &&
  !/patchOrder|orderMedia|stripItem|\.brief|media:/.test(scratch))
checa('2c. passa a mostrar o pedido novo e zera o que era do anterior (batidas, storyboard, cartão, render, versão)',
  /orderRef\.current = next\n\s+setOrder\(next\)\n\s+setBeats\(null\)\n\s+setStoryboard\(\{\}\)\n\s+setCard\(null\)\n\s+setRender\(null\)\n\s+setRenderState\(null\)\n\s+setRemix\(null\)/.test(scratch) &&
  scratch.includes("setView('brief')") && scratch.includes('setFreshRound((n) => n + 1)'))
checa('2d. a tela remonta (estado local do painel e dos passos não sobrevive): conteúdo sob <Fragment key={freshRound}>',
  main.includes('<Fragment key={freshRound}>{content}</Fragment>') && count(main, '{content}') === 1 && W.includes("import { Fragment, useCallback, useEffect, useMemo, useRef, useState } from 'react'"))
checa('2e. o pedido anterior fica abandonado: upload ou render que termina depois não o traz de volta',
  scratch.includes('if (prev && prev.id !== next.id) abandoned.current.add(prev.id)') &&
  /const applyOrder = useCallback\(\(next: AdsOrder\) => \{\n[^\n]*\n\s+if \(abandoned\.current\.has\(next\.id\)\) return/.test(main) &&
  main.includes('if (abandoned.current.has(s.order_id)) return'))
checa('2f. depois de recarregar, o hydrate escolhe o pedido novo: GET em ordem de criação decrescente, o 1º reaproveitável, e draft é reaproveitável',
  ROUTE.includes(".order('created_at', { ascending: false })") &&
  main.includes('const pick = orders.find((o) => REUSABLE_STATUSES.includes(o.status)) ?? null') &&
  /const REUSABLE_STATUSES: readonly string\[\] = \['draft',/.test(W) &&
  ROUTE.includes("insert({ user_id: user.id, status: 'draft', brief })") && /let brief = null\n\s+if \(body && 'brief' in body\)/.test(ROUTE))
checa('2g. pedido vazio não mostra a marca antiga nem o aviso "Continuing your unfinished ad", e a lista "Your ads" continua',
  panel.includes('{!order && brand ? (') && panel.includes('{order && !createdHere.current && (media.length > 0 || order.brief) ? (') &&
  panel.includes('const blankOrder = !order || (orderMedia(order).length === 0 && !order.brief)') && panel.includes('{blankOrder && recent.length ? ('))
checa('2h. erro claro ao criar (429 com a saída; outros com a frase do servidor) em role="alert"; 401 vai ao login',
  scratch.includes("created.status === 429 ? 'You have too many unfinished ads, so a new one could not start.") &&
  scratch.includes('`A new ad could not start. ${errorText(created)}`') && scratch.includes('if (created.status === 401) return goLogin()') &&
  main.includes('{scratchError ? <p className="adsw-err" role="alert">{scratchError}</p> : null}') &&
  scratch.includes('if (scratchBusy || busyNew) return') && /finally \{\n\s+setScratchBusy\(false\)/.test(scratch))

// ── 3. o apagar, EXECUTADO com fetch falso ───────────────────────────────────────────────────
const ts = createRequire(import.meta.url)(join(root, 'node_modules', 'typescript'))
const modSrc = [
  "const OLD_MEDIA_BUSY_STATUS = " + (/const OLD_MEDIA_BUSY_STATUS = ('[a-z]+')/.exec(W)?.[1] ?? 'null'),
  fnSrc('orderMedia'), fnSrc('stripItem'), fnSrc('oldMediaPlan'), fnSrc('oldMediaResultText'), fnSrc('deleteOldAdsMedia', 'async function'),
  'module.exports = { oldMediaPlan, oldMediaResultText, deleteOldAdsMedia }',
].join('\n')
let M = null
try {
  const js = ts.transpileModule(modSrc, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 } }).outputText
  M = { exports: {} }
  new Function('module', 'exports', 'callJson', 'patchOrder', 'goLogin', 'errorText', 'trackEvent', 'window', js)(
    M, M.exports,
    (...a) => env.callJson(...a), (...a) => env.patchOrder(...a), () => { env.log.push('login') }, () => 'ERR', (...a) => { env.events.push(a) }, { confirm: (t) => env.confirm(t) },
  )
  M = M.exports
} catch (e) { console.error(e); M = null }
checa('3a. as funções do apagar existem e rodam fora do navegador', Boolean(M && M.oldMediaPlan && M.deleteOldAdsMedia && M.oldMediaResultText))

const img = (id, isLogo = false) => ({ footageId: id, url: `https://x/${id}.jpg`, kind: 'image', isLogo, bytes: 1 })
const vid = (id) => ({ footageId: id, url: `https://x/${id}.mp4`, kind: 'video', isLogo: false, bytes: 1 })
const current = { id: 'cur', status: 'draft', media: [img('logoA', true), img('p1'), vid('v1')], brief: null }
const orders = [
  current,
  { id: 'r', status: 'rendering', media: [img('logoA', true), img('p9'), img('p1')] },
  { id: 'd', status: 'delivered', media: [img('logoB', true), img('p2'), vid('v2'), img('p3')] },
  { id: 'f', status: 'failed', media: [img('p4'), img('logoB')] },
]
let env
const freshEnv = (confirmAnswer = true) => {
  env = { log: [], events: [], confirmText: null, callJson: null, patchOrder: null, confirm: null }
  env.confirm = (t) => { env.log.push('confirm'); env.confirmText = t; return confirmAnswer }
  env.callJson = async (url, init) => {
    const method = init?.method ?? 'GET'
    env.log.push(`${method} ${url}`)
    if (url === '/api/ads/orders' && method === 'GET') return { ok: true, status: 200, data: { orders } }
    if (url.startsWith('/api/footage?id=') && method === 'DELETE') return url.endsWith('=v2') ? { ok: false, status: 500, code: null, message: null, body: {} } : { ok: true, status: 200, data: { ok: true } }
    return { ok: false, status: 404, code: null, message: null, body: {} }
  }
  env.patchOrder = async (id, fields) => { env.log.push(`PATCH ${id} ${fields.media.map((m) => m.footageId).join(',')}`); return { ok: true, status: 200, data: { order: { ...current, media: fields.media } } } }
}

if (M) {
  const plan = M.oldMediaPlan(orders, current)
  const ids = [...plan.ids].sort()
  checa('3b. plano: apaga fotos e vídeos dos pedidos (atual, entregue, falhou)', ['p2', 'p3', 'p4', 'v1', 'v2'].every((x) => ids.includes(x)))
  checa('3c. plano: NUNCA o logo (nem o que é logo em outro pedido)', !ids.includes('logoA') && !ids.includes('logoB'))
  checa('3d. plano: pula o que um pedido em rendering usa, mesmo que outro pedido também use (p1, p9), e conta quantos ficaram', !ids.includes('p9') && !ids.includes('p1') && plan.keptRendering === 2)
  checa('3e. plano: pedido atual fora da lista do GET entra mesmo assim', M.oldMediaPlan([], current).ids.sort().join() === 'p1,v1')

  freshEnv(true)
  const r = await M.deleteOldAdsMedia(current, (l) => env.log.push(`progress ${l}`))
  const firstDelete = env.log.findIndex((l) => l.startsWith('DELETE /api/footage'))
  const deletes = env.log.filter((l) => l.startsWith('DELETE '))
  checa('3f. confirma ANTES de apagar ou mexer no pedido, com a contagem e o efeito', env.log.indexOf('confirm') >= 0 && env.log.indexOf('confirm') < firstDelete && env.log.indexOf('confirm') < env.log.findIndex((l) => l.startsWith('PATCH')) &&
    env.confirmText === "Deletes 5 photos and videos from your account. Finished ads stay. Old ads can't make new versions from these files.")
  checa('3g. apaga pela rota que confere o dono, DELETE /api/footage?id=<id>, um por um', deletes.length === 5 && deletes.every((l) => /^DELETE \/api\/footage\?id=[a-z0-9]+$/.test(l)) && deletes.map((l) => l.split('=')[1]).sort().join() === 'p2,p3,p4,v1,v2')
  checa('3h. antes de apagar, tira os ids do pedido atual; o logo fica, e a foto que um render em curso usa também', env.log.some((l) => l === 'PATCH cur logoA,p1') && env.log.findIndex((l) => l.startsWith('PATCH')) < firstDelete && r.order && r.order.media.map((m) => m.footageId).join() === 'logoA,p1')
  checa('3i. resultado conta apagados, falhas e os que ficaram por causa do render', r.kind === 'done' && r.deleted === 4 && r.failed === 1 && r.keptRendering === 2 &&
    M.oldMediaResultText(r) === 'Deleted 4 · kept 2 in use by an ad that is rendering · 1 could not be deleted, try again')
  checa('3j. progresso com frase clara durante a ação', env.log.includes('progress Deleting 1 of 5…') && env.log.includes('progress Deleting 5 of 5…'))
  checa('3k. evento ads_old_media_deleted com contagens e order_id', env.events.length === 1 && env.events[0][0] === 'ads_old_media_deleted' && env.events[0][1].order_id === 'cur' && env.events[0][1].deleted === 4 && env.events[0][1].kept_rendering === 2)

  freshEnv(false)
  const c = await M.deleteOldAdsMedia(current, () => undefined)
  checa('3l. "Cancel" na confirmação não apaga nem altera nada', c.kind === 'cancelled' && !env.log.some((l) => l.startsWith('DELETE') || l.startsWith('PATCH')))

  freshEnv(true)
  const onlyLogo = { id: 'solo', status: 'draft', media: [img('logoZ', true)] }
  const saved = orders.splice(0, orders.length, onlyLogo, { id: 'r2', status: 'rendering', media: [img('q1')] })
  const n = await M.deleteOldAdsMedia(onlyLogo, () => undefined)
  orders.splice(0, orders.length, ...saved)
  checa('3m. nada para apagar: não pede confirmação e diz o porquê', n.kind === 'nothing' && !env.log.includes('confirm') && M.oldMediaResultText(n) === 'No old photos or videos to delete · kept 1 in use by an ad that is rendering.')
}

// ── 4. telas: o resultado vai ao pedido atual; eventos novos; rota de apagar confere o dono ──
checa('4a. modo IA: depois de apagar, o pedido atual (sem os ids) é o que a tela mostra', /if \(r\.kind === 'done' && r\.order\) \{\n\s+mediaRef\.current = orderMedia\(r\.order\)\n\s+orderLocal\.current = r\.order\n\s+onOrder\(r\.order\)/.test(panel) && panel.includes('const r = await deleteOldAdsMedia(orderLocal.current, setBusy)'))
checa('4b. passo a passo: idem na etapa de fotos', /if \(r\.kind === 'done' && r\.order\) \{\n\s+mediaRef\.current = orderMedia\(r\.order\)\n\s+onOrder\(r\.order\)/.test(mediaStep) && mediaStep.includes('const r = await deleteOldAdsMedia(order, setBusy)'))
checa('4c. eventos novos na lista fechada, do navegador (não só-servidor)',
  EVENTS.includes("'ads_started_from_scratch',") && EVENTS.includes("'ads_old_media_deleted',") &&
  !/ADS_SERVER_ONLY_EVENTS[^\]]*ads_(started_from_scratch|old_media_deleted)/.test(EVENTS) &&
  scratch.includes("void trackEvent('ads_started_from_scratch', { order_id: next.id, from_order: prev?.id ?? null, mode })"))
checa('4d. a rota DELETE /api/footage que o botão usa confere o dono antes de apagar',
  /export async function DELETE[\s\S]*?\.eq\('id', id\)\n\s+\.eq\('user_id', user\.id\)[\s\S]*?\.delete\(\)\.eq\('id', id\)\.eq\('user_id', user\.id\)/.test(FOOTAGE))
checa('4e. 400 px: as linhas novas quebram (flex-wrap) e o botão é o pequeno de sempre',
  W.includes('.adsw .adsw-scratch{margin:0 0 14px;gap:8px 12px;flex-wrap:wrap;align-items:center}') && W.includes('.adsw .adsw-clean{margin:10px 0 0;gap:8px 12px;flex-wrap:wrap;align-items:center}'))

console.log(`test-ads-comecar-do-zero-2026-09-29: ${ok} ok, ${falhas.length} falha(s)`)
if (falhas.length) process.exit(1)
