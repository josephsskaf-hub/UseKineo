// KINEO-FILMES-F1-F4-1910 [TRAVA 8.2 — vai do fundador 19/10 "vai, sim pra tudo"] — os 3 SFX da receita "Faceless 15 s"
// (§3.5 do estudo): riser reverso de 1,2 s · whoosh de 0,25 s · pop suave de 0,3 s.
//
// SÍNTESE PRÓPRIA, DETERMINÍSTICA (gerador de ruído com semente fixa + senóides): nenhum arquivo de terceiro, nenhuma
// licença a registrar além desta — o som é da casa (equivalente a CC0 para todos os efeitos; pode ser trocado por um
// Pixabay CC0 mudando a URL e o hash em lib/filmes/faceless15.ts SFX_FACELESS15). WAV PCM 16 bits mono 44,1 kHz, servido
// como arquivo estático em https://www.usekineo.com/sfx/ (public/sfx/, fora do middleware de rotas protegidas).
//
// Uso: node scripts/gerar-sfx-faceless15-1910.mjs  → escreve public/sfx/faceless15-{riser,whoosh,pop}.wav e imprime os
// sha256. O guardião scripts/test-filmes-f1f4-1910.mjs regenera em memória e confere o hash do arquivo em disco e do
// catálogo (os três têm de ser o mesmo byte).
import { createHash } from 'node:crypto'
import { writeFileSync, mkdirSync } from 'node:fs'
import { join, dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

export const SFX_SAMPLE_RATE = 44100
export const SFX_FACELESS15_ARQUIVOS = { riser: 'faceless15-riser.wav', whoosh: 'faceless15-whoosh.wav', pop: 'faceless15-pop.wav' }
export const SFX_FACELESS15_SEGUNDOS = { riser: 1.2, whoosh: 0.25, pop: 0.3 }

/** mulberry32 — determinístico; o mesmo seed dá os mesmos bytes em qualquer máquina. */
function prng(seed) {
  let a = seed >>> 0
  return () => {
    a = (a + 0x6d2b79f5) >>> 0
    let t = a
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return (((t ^ (t >>> 14)) >>> 0) / 4294967296) * 2 - 1
  }
}
const alphaLp = (fc) => 1 - Math.exp((-2 * Math.PI * fc) / SFX_SAMPLE_RATE)

function normalizar(x, pico) {
  let m = 0
  for (const v of x) m = Math.max(m, Math.abs(v))
  const g = m > 0 ? pico / m : 1
  return x.map((v) => v * g)
}

/** WAV PCM16 mono. */
export function paraWav(samples) {
  const n = samples.length
  const buf = Buffer.alloc(44 + n * 2)
  buf.write('RIFF', 0); buf.writeUInt32LE(36 + n * 2, 4); buf.write('WAVE', 8)
  buf.write('fmt ', 12); buf.writeUInt32LE(16, 16); buf.writeUInt16LE(1, 20); buf.writeUInt16LE(1, 22)
  buf.writeUInt32LE(SFX_SAMPLE_RATE, 24); buf.writeUInt32LE(SFX_SAMPLE_RATE * 2, 28); buf.writeUInt16LE(2, 32); buf.writeUInt16LE(16, 34)
  buf.write('data', 36); buf.writeUInt32LE(n * 2, 40)
  for (let i = 0; i < n; i++) buf.writeInt16LE(Math.max(-32768, Math.min(32767, Math.round(samples[i] * 32767))), 44 + i * 2)
  return buf
}

/** Riser reverso: ruído que abre o filtro e cresce até o pico, e PARA no pico (corte em silêncio na 1ª palavra). */
export function sintetizarRiser() {
  const T = SFX_FACELESS15_SEGUNDOS.riser
  const n = Math.round(T * SFX_SAMPLE_RATE)
  const rnd = prng(1910)
  const out = new Array(n)
  let lp = 0
  let fase = 0
  for (let i = 0; i < n; i++) {
    const t = i / SFX_SAMPLE_RATE
    const u = t / T
    const fc = 300 + 5700 * u * u
    lp += alphaLp(fc) * (rnd() - lp)
    const env = Math.pow(u, 2.5)
    const f = 220 + 1300 * u * u
    fase += (2 * Math.PI * f) / SFX_SAMPLE_RATE
    const taper = i >= n - 132 ? (n - i) / 132 : 1 // 3 ms: sem clique no corte
    out[i] = (0.75 * lp * env * 3 + 0.35 * Math.sin(fase) * env) * taper
  }
  return paraWav(normalizar(out, 0.9))
}

/** Whoosh curto: sopro de ar (ruído em banda que desce) com ataque e cauda — o comprimento do movimento (0,25 s = o punch). */
export function sintetizarWhoosh() {
  const T = SFX_FACELESS15_SEGUNDOS.whoosh
  const n = Math.round(T * SFX_SAMPLE_RATE)
  const rnd = prng(2510)
  const out = new Array(n)
  let lp = 0
  let lpBaixo = 0
  for (let i = 0; i < n; i++) {
    const t = i / SFX_SAMPLE_RATE
    const u = t / T
    const x = rnd()
    lp += alphaLp(4000 - 3000 * u) * (x - lp)
    lpBaixo += alphaLp(250) * (lp - lpBaixo)
    const env = Math.pow(Math.sin(Math.PI * u), 1.3)
    out[i] = (lp - lpBaixo) * env
  }
  return paraWav(normalizar(out, 0.9))
}

/** Pop suave: tom que cai (520 → ~180 Hz) com decaimento rápido e um sopro de 4 ms no ataque. */
export function sintetizarPop() {
  const T = SFX_FACELESS15_SEGUNDOS.pop
  const n = Math.round(T * SFX_SAMPLE_RATE)
  const rnd = prng(3010)
  const out = new Array(n)
  let fase = 0
  for (let i = 0; i < n; i++) {
    const t = i / SFX_SAMPLE_RATE
    const f = 180 + 340 * Math.exp(-t / 0.09)
    fase += (2 * Math.PI * f) / SFX_SAMPLE_RATE
    const ataque = Math.min(1, t / 0.0015)
    const env = ataque * Math.exp(-t / 0.055)
    const sopro = t < 0.004 ? 0.3 * rnd() * (1 - t / 0.004) : 0
    out[i] = Math.sin(fase) * env + sopro
  }
  return paraWav(normalizar(out, 0.85))
}

export function sintetizarSfxFaceless15() {
  return { riser: sintetizarRiser(), whoosh: sintetizarWhoosh(), pop: sintetizarPop() }
}
export const sha256 = (b) => createHash('sha256').update(b).digest('hex')

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const RAIZ = resolve(join(dirname(fileURLToPath(import.meta.url)), '..'))
  const dir = join(RAIZ, 'public', 'sfx')
  mkdirSync(dir, { recursive: true })
  const sons = sintetizarSfxFaceless15()
  for (const [k, buf] of Object.entries(sons)) {
    const arquivo = SFX_FACELESS15_ARQUIVOS[k]
    writeFileSync(join(dir, arquivo), buf)
    console.log(`${arquivo}  ${buf.length} bytes  ${SFX_FACELESS15_SEGUNDOS[k]} s  sha256=${sha256(buf)}`)
  }
}
