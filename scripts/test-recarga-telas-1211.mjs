// KINEO-RECARGA-TELAS-1211 — guardião: nas telas de criação que abriam o pop-up "You're out of credits… Pick a bigger plan" (/images,
// /audio, /animate, /clips e o fim do filme), o assinante pago vê a barra da recarga; quem não assina vê exatamente o pop-up de antes.
// Prova: (1) as 5 telas usam TopupOuRecargaModal com a superfície de sempre (e não o pop-up cru); (2) o servidor decide (GET da recarga,
// "show"); enquanto lê, nada pinta; sem oferta ou leitura que falhou → o CreditsTopupModal de antes; com oferta → a MESMA barra
// (BuyCreditsModal); (3) depois de pagar, cada tela volta para ela mesma. Rodar: node scripts/test-recarga-telas-1211.mjs
import { readFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const rd = (p) => readFileSync(resolve(root, p), 'utf8').replace(/\r\n/g, '\n')
const ENTRY = 'components/billing/BuyCreditsEntry.tsx'
const LIB = 'lib/billing/recargaAssinante.ts'
const TELAS = [
  ['app/(dashboard)/images/ImagesClient.tsx', '<TopupOuRecargaModal surface="images_402" onClose={() => setShowTopup(false)} />'],
  ['app/(dashboard)/audio/AudioClient.tsx', '<TopupOuRecargaModal surface="audio_402" onClose={() => setShowTopup(false)} />'],
  ['app/(dashboard)/animate/AnimateClient.tsx', '<TopupOuRecargaModal surface="animate_402" onClose={() => setShowTopup(false)} />'],
  ['app/(dashboard)/clips/ClipsClient.tsx', '<TopupOuRecargaModal surface="clips_402" onClose={() => setShowTopup(false)} />'],
  ['components/FilmReadyExits.tsx', 'createPortal(<TopupOuRecargaModal surface={FILM_READY_TOPUP_SURFACE} onClose={() => setTopupOpen(false)} />, document.body)'],
]
const SRC = Object.fromEntries([ENTRY, LIB, ...TELAS.map(([f]) => f)].map((p) => [p, rd(p)]))

function battery(src) {
  const p = []
  for (const [f, tag] of TELAS) {
    if (!src[f].includes(tag)) p.push(`${f}: o pop-up de sem crédito não passa pela recarga`)
    if (/<CreditsTopupModal\b/u.test(src[f])) p.push(`${f}: ainda abre o pop-up cru (assinante não veria a barra)`)
  }
  const e = src[ENTRY]
  const i = e.indexOf('export function TopupOuRecargaModal(')
  const f = i < 0 ? '' : e.slice(i, e.indexOf('\n}\n', i))
  if (!f) return [...p, 'a peça TopupOuRecargaModal sumiu']
  if (!f.includes('fetch(`${RECARGA_ASSINANTE_API}?surface=${encodeURIComponent(surface)}`')) p.push('a peça não pergunta ao servidor')
  if (!f.includes("setEstado(o && o.show === true && typeof o.go === 'string' && typeof o.qa === 'boolean' ? (o as RecargaAssinanteOffer) : 'nada')")) p.push('a peça não decide pelo "show" do servidor')
  if (!f.includes(".catch(() => { if (alive) setEstado('nada') })")) p.push('leitura que falhou não volta ao pop-up de antes')
  if (!f.includes("if (estado === 'lendo') return null")) p.push('a peça pinta antes de saber (pisca de uma tela para a outra)')
  if (!f.includes("if (estado === 'nada') return <CreditsTopupModal surface={surface} onClose={onClose} />")) p.push('quem não assina não vê o pop-up de antes')
  if (!f.includes('return <BuyCreditsModal offer={estado} surface={surface} idea={idea} onClose={onClose} />')) p.push('o assinante não vê a mesma barra da recarga')
  for (const pre of ['/images', '/audio', '/animate', '/clips']) if (!src[LIB].includes(`'${pre}'`)) p.push(`depois de pagar, ${pre} não volta para ${pre}`)
  return p
}

let failed = 0
const base = battery(SRC)
console.log(base.length === 0 ? 'PASS telas de criação: assinante sem saldo vê a barra; quem não assina vê o pop-up de antes; servidor decide' : 'FAIL\n  ' + base.join('\n  '))
if (base.length) failed++

const muta = (rel, from, to) => {
  if (!SRC[rel].includes(from)) throw new Error(`mutante sem âncora em ${rel}: ${from.slice(0, 80)}`)
  return { ...SRC, [rel]: SRC[rel].replace(from, to) }
}
const MUTANTES = [
  ['images volta ao pop-up cru', muta('app/(dashboard)/images/ImagesClient.tsx', '<TopupOuRecargaModal surface="images_402"', '<CreditsTopupModal surface="images_402"')],
  ['fim do filme volta ao pop-up cru', muta('components/FilmReadyExits.tsx', 'createPortal(<TopupOuRecargaModal surface={FILM_READY_TOPUP_SURFACE}', 'createPortal(<CreditsTopupModal surface={FILM_READY_TOPUP_SURFACE}')],
  ['barra para todos', muta(ENTRY, "setEstado(o && o.show === true && typeof o.go === 'string'", "setEstado(o && typeof o.go === 'string'")],
  ['falha vira barra', muta(ENTRY, ".catch(() => { if (alive) setEstado('nada') })", '.catch(() => {})')],
  ['pisca', muta(ENTRY, "  if (estado === 'lendo') return null\n", '')],
  ['volta perdida', muta(LIB, ", '/images', '/audio', '/animate', '/clips']", ']')],
]
let killed = 0
for (const [nome, src] of MUTANTES) {
  let p
  try { p = battery(src) } catch (e) { p = [`lançou: ${e.message}`] }
  if (p.length > 0) killed++
  else { failed++; console.log(`SOBREVIVEU mutante: ${nome}`) }
}
console.log(`mutantes: ${killed}/${MUTANTES.length} mortos`)
if (failed) { console.log('FAIL'); process.exit(1) }
console.log('OK')
