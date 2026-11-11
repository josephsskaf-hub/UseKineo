// KINEO-BEFORE-YOU-GO-TEMA-1111 + KINEO-BARRA-SEM-MOTOR-1111 — guardião de dois consertos de tela vistos na prova em tela da
// CEO (11/11 06:20, tema claro):
//   A. o "Before you go" (components/billing/CancelSaveFlow.tsx) é um cartão SEMPRE escuro e passa a definir a PRÓPRIA paleta
//      de texto (as variáveis valem só dentro dele): contraste WCAG >= 4,5 de --text, --text2 e --muted contra o fundo do
//      cartão, nos dois temas — antes, no tema claro, var(--text) virava rgb(14,17,22) sobre o fundo escuro;
//   B. a barra do assinante (components/CreditsTopupModal.tsx, modo recarga) conta em FILMES curtos, sem nome de motor;
//      o resumo por motor continua só no top-up antigo;
//   C. mutantes.
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..')
const read = (rel) => fs.readFileSync(path.join(ROOT, rel), 'utf8').replace(/\r\n/g, '\n')
let pass = 0
let fail = 0
const ok = (c, m) => { if (c) { pass++; console.log('  ok  ' + m) } else { fail++; console.log('  FAIL ' + m) } }
const SRC = { ui: read('components/billing/CancelSaveFlow.tsx'), modal: read('components/CreditsTopupModal.tsx'), copy: read('lib/billing/recargaAssinante.ts') }

const hex = (h) => { const m = /^#([0-9a-f]{6})$/i.exec(h); if (!m) return null; const n = parseInt(m[1], 16); return [(n >> 16) & 255, (n >> 8) & 255, n & 255] }
const lum = ([r, g, b]) => { const f = (c) => { c /= 255; return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4 }; return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b) }
const contrast = (a, b) => { const [x, y] = [lum(a), lum(b)].sort((p, q) => q - p); return (x + 0.05) / (y + 0.05) }

function suite(S) {
  const out = []
  const t = (c, m) => out.push([!!c, m])
  // A
  const bgM = /const CARD_BG = 'rgba\((\d+),(\d+),(\d+),0\.9\d\)'/.exec(S.ui)
  const bg = bgM ? [Number(bgM[1]), Number(bgM[2]), Number(bgM[3])] : null
  const pal = {}
  for (const k of ['--text', '--text2', '--muted', '--muted2']) { const m = new RegExp(`'${k}': '(#[0-9a-fA-F]{6})'`).exec(S.ui); pal[k] = m ? hex(m[1]) : null }
  t(bg && pal['--text'] && contrast(pal['--text'], bg) >= 4.5, `A1 --text legível no cartão escuro (contraste ${bg && pal['--text'] ? contrast(pal['--text'], bg).toFixed(1) : '—'})`)
  t(bg && pal['--text2'] && contrast(pal['--text2'], bg) >= 4.5, 'A2 --text2 legível (motivos não escolhidos, saldo)')
  t(bg && pal['--muted'] && contrast(pal['--muted'], bg) >= 4.5, 'A3 --muted legível (rodapés, "credits in your balance")')
  t(/style=\{\{ \.\.\.\(CANCEL_SAVE_PALETTE as unknown as CSSProperties\), background: CARD_BG, color: CANCEL_SAVE_PALETTE\['--text'\]/.test(S.ui), 'A4 o cartão aplica a própria paleta (não herda a do tema da página)')
  t(/<h2 id="cancel-save-title"[^>]*style=\{\{ color: 'var\(--text\)' \}\}/.test(S.ui), 'A5 o título lê --text, que dentro do cartão é a paleta clara')
  // B
  const iRec = S.modal.indexOf('{recarga ? (')
  const bloco = iRec > 0 ? S.modal.slice(iRec, S.modal.indexOf(')}', S.modal.indexOf('<CreditMinutesSummary', iRec)) + 2) : ''
  t(iRec > 0 && /RECARGA_ASSINANTE_COPY\.films/.test(bloco) && /recargaAssinanteMinFilmCredits\(\)/.test(bloco) && /: \(\s*<CreditMinutesSummary credits=\{amount\} live \/>/.test(bloco), 'B1 barra do assinante: filmes curtos; o resumo por motor só fora do modo recarga')
  const films = /films: '([^']+)'/.exec(S.copy)?.[1] ?? ''
  t(films.includes('{films}') && !/Kling|Seedance|MiniMax|H3|Veo|Hailuo|Omni|Sora/i.test(films), 'B2 o texto da barra não tem nome de motor')
  t(!/Kling|Seedance|MiniMax|H3 |Veo|Hailuo|Omni|Sora/.test(bloco.replace(/\{\/\*[\s\S]*?\*\/\}/g, '')), 'B3 nenhum nome de motor no trecho da barra do assinante')
  return out
}
for (const [c, m] of suite(SRC)) ok(c, m)
const MUTANTS = [
  ['cartão herda o tema', 'ui', '...(CANCEL_SAVE_PALETTE as unknown as CSSProperties), ', ''],
  ['texto escuro no cartão', 'ui', "'--text': '#f5f7fb'", "'--text': '#0e1116'"],
  ['muted escuro', 'ui', "'--muted': '#a7afbd'", "'--muted': '#4b5563'"],
  ['barra volta a nomear motor', 'copy', "films: '≈ {films} short films of 15 seconds'", "films: '≈ {films} films on Kling 4.0'"],
  ['barra mostra minutos por motor', 'modal', '{recarga ? (', '{false ? ('],
]
for (const [name, key, from, to] of MUTANTS) {
  if (!SRC[key].includes(from)) { ok(false, `mutante "${name}": trecho não encontrado`); continue }
  ok(suite({ ...SRC, [key]: SRC[key].replace(from, to) }).some(([c]) => !c), `mutante "${name}" é pego`)
}
console.log(`\n${pass} ok · ${fail} falha(s)`)
process.exit(fail ? 1 : 0)
