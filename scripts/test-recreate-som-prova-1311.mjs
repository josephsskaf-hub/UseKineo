// KINEO-RECREATE-SOM-PROVA-1311 — guardião da PROVA do som num clipe só (CEO 14/11). Com SEU_VIDEO_SOM_ORIGINAL=false, o POST /api/recreate/seu-video
// aceita `som_original: true` SÓ de conta da casa: a marca vai na entrada do pedido (a impressão que a liquidação lê) e a montagem do som entra SÓ
// naquele clipe; a fal nunca recebe a marca. Prova, EXECUTANDO somOriginalDaLinha e semMarcasDaCasa com a MESMA impressão que o submitClip grava
// ([clipFingerprint, modelo, entrada]): sem o campo nada muda; com o campo e conta da casa a montagem entra; com o campo e conta de fora (a rota não
// grava a marca) não entra; o interruptor global continua false. E a rota/envio: a marca só com isInternalEmail + campo + som global desligado, o
// evento de prova, e o envio tira kineo_* antes da fal. Mutantes. Rodar: node scripts/test-recreate-som-prova-1311.mjs
import fs from 'node:fs'
import path from 'node:path'
import { createRequire } from 'node:module'

const require = createRequire(import.meta.url)
const ts = require('typescript')
const lf = (f) => fs.readFileSync(f, 'utf8').replace(/\r\n/g, '\n')
const SV = 'lib/recreate/seuVideo.ts', ROTA = 'app/api/recreate/seu-video/route.ts', SRV = 'lib/recreate/seuVideoServer.ts'
function carregar(src) {
  const cache = new Map()
  const load = (rel) => {
    if (cache.has(rel)) return cache.get(rel).exports
    const mod = { exports: {} }; cache.set(rel, mod)
    const js = ts.transpileModule(rel === SV && src ? src : lf(rel), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText
    new Function('require', 'module', 'exports', js)((id) => {
      if (id === '@/lib/checkoutPricing') return { recreateCreditCost: (s) => (s <= 10 ? 40 : 60) }
      if (id.startsWith('.')) return load(path.posix.join(path.posix.dirname(rel), id) + '.ts')
      throw new Error('import inesperado: ' + id)
    }, mod, mod.exports)
    return mod.exports
  }
  return load(SV)
}
const SUPA = 'https://x.supabase.co', U = '11111111-2222-4333-8444-555555555555', V = '66666666-7777-4888-9999-000000000000'
const ORIGINAL = `${SUPA}/storage/v1/object/public/renders/recreate-uploads/${U}/${V}.mp4`

function bateria(over = {}) {
  const p = []
  const check = (n, fn) => { try { fn() } catch (e) { p.push(n + ': ' + e.message) } }
  const S = carregar(over[SV])
  const model = S.KLING4_EDIT_MODEL
  // a rota: provaDoSom = campo && !global && conta da casa → entrada com a marca; a impressão como o submitClip grava
  const linha = (comMarca) => {
    const input = S.entradaKling4({ prompt: 'p @Video1 @Image1', fotos: ['https://x/f.jpg'], videoUrl: ORIGINAL })
    const entrada = comMarca ? { ...input, [S.MARCA_SOM_PROVA]: true } : input
    return { model, user_id: U, seconds: 5, fingerprint: JSON.stringify([JSON.stringify(['h3', null, 5, null, 'p', 'https://x/f.jpg']), model, entrada]), entrada }
  }
  check('o som global continua desligado', () => { if (S.SEU_VIDEO_SOM_ORIGINAL !== false) throw new Error('ligado') })
  check('sem o campo: nada muda (sem som)', () => { if (S.somOriginalDaLinha(linha(false), SUPA) !== null) throw new Error('som sem a prova') })
  check('com o campo e conta da casa: a montagem entra neste clipe', () => {
    const a = S.somOriginalDaLinha(linha(true), SUPA)
    if (!a || a.url !== ORIGINAL || a.seconds !== 5) throw new Error(JSON.stringify(a))
  })
  check('conta de fora (a rota não grava a marca): não entra', () => { if (S.somOriginalDaLinha(linha(false), SUPA) !== null) throw new Error('entrou') })
  check('marca que não é true literal: não entra', () => {
    const l = linha(false); const f = JSON.parse(l.fingerprint); f[2][S.MARCA_SOM_PROVA] = 'true'; l.fingerprint = JSON.stringify(f)
    if (S.somOriginalDaLinha(l, SUPA) !== null) throw new Error('aceitou "true" texto')
  })
  check('com o global ligado, segue como antes (sem precisar da marca)', () => { if (!S.somOriginalDaLinha(linha(false), SUPA, true)) throw new Error('o global ligado parou de ligar') })
  check('a fal nunca recebe a marca', () => {
    const l = linha(true)
    const enviado = S.semMarcasDaCasa(l.entrada)
    if (Object.keys(enviado).some((k) => k.startsWith('kineo_')) || enviado.video_url !== ORIGINAL || enviado.resolution !== '720p') throw new Error(JSON.stringify(enviado))
    const limpo = S.semMarcasDaCasa(linha(false).entrada)
    if (limpo !== linha(false).entrada && JSON.stringify(limpo) !== JSON.stringify(linha(false).entrada)) throw new Error('sem marca mudou a entrada')
  })
  const r = (over[ROTA] ?? lf(ROTA)).replace(/\/\/[^\n]*/g, '')
  const s = (over[SRV] ?? lf(SRV)).replace(/\/\/[^\n]*/g, '')
  check('rota: marca só com campo + global desligado + conta da casa; evento de prova', () => {
    if (!r.includes('const provaDoSom = raw.som_original === true && !SEU_VIDEO_SOM_ORIGINAL && isInternalEmail(user.email)')) throw new Error('condição da prova')
    if (!r.includes('const entrada = provaDoSom ? { ...input, [MARCA_SOM_PROVA]: true } : input') || !/falUsd: v\.falUsd, photos, input: entrada \}/.test(r)) throw new Error('a marca não vai na impressão')
    if (!/if \(!result\.replay && provaDoSom\) await writeServerEvent\(\{ name: 'recreate_seu_video_som_prova'[^\n]*prova: true/.test(r)) throw new Error('sem evento de prova')
  })
  check('envio: kineo_* sai antes da fal', () => {
    if (!s.includes('submit: (model: string, input: Record<string, unknown>) => envio(model, semMarcasDaCasa(input))')) throw new Error('a marca iria à fal')
  })
  return p
}

const real = bateria()
if (real.length) { console.error('FALHA\n' + real.join('\n')); process.exit(1) }
const sv = lf(SV), rota = lf(ROTA), srv = lf(SRV)
const mutantes = [
  ['marca liga sem ser da casa', { [ROTA]: rota.replace(' && isInternalEmail(user.email)', '') }],
  ['somOriginal ignora a marca', { [SV]: sv.replace("if (!ligado && (p[2] as Record<string, unknown>)[MARCA_SOM_PROVA] !== true) return null", 'if (!ligado) return null') }],
  ['marca liga todo clipe', { [SV]: sv.replace("if (!ligado && (p[2] as Record<string, unknown>)[MARCA_SOM_PROVA] !== true) return null", 'if (false) return null') }],
  ['a marca vai à fal', { [SRV]: srv.replace('envio(model, semMarcasDaCasa(input))', 'envio(model, input)') }],
  ['som global ligado', { [SV]: sv.replace('export const SEU_VIDEO_SOM_ORIGINAL = false', 'export const SEU_VIDEO_SOM_ORIGINAL = true') }],
]
let mortos = 0
for (const [n, over] of mutantes) {
  const [k, v] = Object.entries(over)[0]
  if (v === lf(k)) { console.error('MUTANTE SEM EFEITO: ' + n); process.exit(1) }
  if (bateria(over).length) mortos++; else console.error('MUTANTE VIVO: ' + n)
}
if (mortos !== mutantes.length) process.exit(1)
console.log(`PASS prova do som: sem o campo nada muda; campo + conta da casa = som só naquele clipe; conta de fora não; a fal nunca vê a marca; som global segue desligado; ${mortos}/${mutantes.length} mutantes mortos`)
