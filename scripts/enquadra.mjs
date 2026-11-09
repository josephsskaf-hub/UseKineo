// KINEO-ENQUADRAMENTO-0911 — fundador 09/11: "sempre que a gente for colocar alguma coisa nova, a gente coloque ele com os quadros certos.
// A gente não pode errar isso." A ferramenta de conferir o quadro de uma mídia da vitrine (home + /made-with-kineo).
//
// Uso:
//   node scripts/enquadra.mjs <id ou caminho>                 ex.: lion · outfit-morph · /previews/galeria/lion.mp4 · puddle.webp
//   node scripts/enquadra.mjs <id> --focus "50% 30%"          testa outro focus antes de mudar o código
//   node scripts/enquadra.mjs <id> --frames 12                mais quadros (mínimo 8; sempre com o 1º e o último)
//   node scripts/enquadra.mjs <caminho> --shapes small,big    mídia que ainda não está ligada à vitrine (--poster /posters/x.webp)
//   node scripts/enquadra.mjs --todas                         uma folha para cada mídia da vitrine (auditoria)
//
// Saída: uma folha de contato PNG na pasta temporária (o caminho é impresso): o pôster (1º painel, fundo magenta embaixo) e N quadros
// do vídeo, do primeiro ao último, com a janela de cada forma desenhada — VERDE = a janela mais larga (desktop da home, a mais apertada
// em altura), AMARELA = a mais estreita (corte dos lados no celular). Olhe a folha: cabeça inteira com respiro, rosto, produto, o corpo
// que pula, DENTRO do verde em todo quadro. Certo? Cole a linha impressa em lib/vitrineEnquadramento.ts (ENQUADRAMENTO). Sem ela o
// guardião scripts/test-enquadramento-vitrine-0911.mjs fica vermelho.
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { spawnSync } from 'node:child_process'
import { ROOT, carrega, midiasDaVitrine, impressao } from './vitrine-tiles.mjs'

const args = process.argv.slice(2)
const COM_VALOR = new Set(['--focus', '--frames', '--shapes', '--poster', '--out'])
const opt = (nome, padrao) => { const i = args.indexOf(nome); return i >= 0 ? args[i + 1] : padrao }
const alvo = args.find((a, i) => !a.startsWith('--') && !(i > 0 && COM_VALOR.has(args[i - 1])))
const FRAMES = Math.max(8, Number(opt('--frames', 10)) || 10)
const OUT = opt('--out', path.join(os.tmpdir(), 'kineo-enquadra'))
const PAINEL = 200 // largura de cada quadro na folha

function run(cmd, a) {
  const r = spawnSync(cmd, a, { encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 })
  if (r.status !== 0) throw new Error(`${cmd} falhou: ${(r.stderr || r.error?.message || '').slice(-400)}`)
  return r.stdout
}
const probe = (f) => {
  const j = JSON.parse(run('ffprobe', ['-v', 'error', '-select_streams', 'v:0', '-show_entries', 'stream=width,height,avg_frame_rate:format=duration', '-of', 'json', f]))
  const s = j.streams[0]; const [n, d] = String(s.avg_frame_rate || '0/1').split('/').map(Number)
  return { w: s.width, h: s.height, dur: Number(j.format?.duration) || 0, fps: d ? n / d : 0 }
}
export const pct = (focus) => { const m = /^\s*(\d+(?:\.\d+)?)%\s+(\d+(?:\.\d+)?)%\s*$/.exec(focus || ''); if (!m) throw new Error(`focus fora do formato "X% Y%": ${focus}`); return [Number(m[1]) / 100, Number(m[2]) / 100] }

/** A caixa visível (object-fit: cover + object-position) de uma janela de proporção r (largura÷altura) num quadro sw×sh. */
export function caixa(sw, sh, r, [fx, fy]) {
  if (r >= sw / sh) { const h = sw / r; return { x: 0, y: fy * (sh - h), w: sw, h } }
  const w = r * sh; return { x: fx * (sw - w), y: 0, w, h: sh }
}

function desenhos(JANELAS, sw, sh, shapes, foco) {
  const f = []
  for (const s of shapes) {
    const j = JANELAS[s]
    for (const [r, cor, t] of [[j.min, 'yellow@0.9', 2], [j.max, 'lime@0.95', 3]]) {
      const b = caixa(sw, sh, r, foco)
      f.push(`drawbox=x=${Math.round(b.x)}:y=${Math.round(b.y)}:w=${Math.round(b.w)}:h=${Math.round(b.h)}:color=${cor}:t=${t}`)
    }
  }
  return f.join(',')
}

async function folha(JANELAS, m, focus, shapes) {
  const foco = pct(focus)
  const arq = path.join(ROOT, 'public', m.media.replace(/^\//, ''))
  if (!fs.existsSync(arq)) throw new Error(`arquivo não existe: ${arq}`)
  fs.mkdirSync(OUT, { recursive: true })
  const nome = `${m.kind ?? 'nova'}-${m.label}`.replace(/[^a-z0-9_.-]+/gi, '_')
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'kineo-enq-'))
  const p = probe(arq)
  const sw = PAINEL; const sh = Math.round((PAINEL * p.h) / p.w / 2) * 2
  const paineis = []
  const ehVideo = /\.(mp4|webm|mov)$/i.test(arq)
  const posterArq = m.poster ? path.join(ROOT, 'public', m.poster.replace(/^\//, '')) : null
  if (posterArq && fs.existsSync(posterArq)) { // o pôster na MESMA janela (é o que aparece antes de o vídeo tocar)
    const pp = probe(posterArq); const psh = Math.round((PAINEL * pp.h) / pp.w / 2) * 2
    const o = path.join(tmp, 'p.png')
    run('ffmpeg', ['-v', 'error', '-y', '-i', posterArq, '-frames:v', '1', '-vf', `scale=${PAINEL}:${psh},${desenhos(JANELAS, PAINEL, psh, shapes, foco)},pad=${PAINEL + 10}:${Math.max(psh, sh) + 8}:0:0:magenta`, o])
    paineis.push(o)
  }
  const tempos = []
  if (ehVideo) {
    const fim = Math.max(0, p.dur - (p.fps ? 1.5 / p.fps : 0.06))
    for (let i = 0; i < FRAMES; i++) tempos.push((fim * i) / (FRAMES - 1))
    for (const [i, t] of tempos.entries()) {
      const o = path.join(tmp, `f${i}.png`)
      run('ffmpeg', ['-v', 'error', '-y', '-ss', t.toFixed(3), '-i', arq, '-frames:v', '1', '-vf', `scale=${sw}:${sh},${desenhos(JANELAS, sw, sh, shapes, foco)},pad=${sw + 4}:${sh}:0:0:black`, o])
      paineis.push(o)
    }
  } else {
    const o = path.join(tmp, 'img.png')
    run('ffmpeg', ['-v', 'error', '-y', '-i', arq, '-frames:v', '1', '-vf', `scale=${sw}:${sh},${desenhos(JANELAS, sw, sh, shapes, foco)}`, o])
    paineis.push(o)
  }
  const H = Math.max(...paineis.map((f) => probe(f).h)) // todos com a mesma altura para o hstack
  const ins = paineis.flatMap((f) => ['-i', f])
  const pads = paineis.map((_, i) => `[${i}:v]pad=iw:${H}:0:0:black[p${i}]`).join(';')
  const destino = path.join(OUT, `${nome}.png`)
  run('ffmpeg', ['-v', 'error', '-y', ...ins, '-filter_complex', paineis.length > 1 ? `${pads};${paineis.map((_, i) => `[p${i}]`).join('')}hstack=${paineis.length}` : '[0:v]null', destino])
  fs.rmSync(tmp, { recursive: true, force: true })
  const linha = `  '${m.media}': { focus: '${focus}', shapes: [${shapes.map((s) => `'${s}'`).join(', ')}], frames: ${ehVideo ? tempos.length : 1}, date: '${new Date().toISOString().slice(0, 10)}', media: '${impressao(m.media)}', poster: ${m.poster ? `'${impressao(m.poster)}'` : 'null'} },`
  return { destino, linha, tempos, probe: p }
}

async function main() {
  const mods = carrega()
  const { JANELAS } = mods.registro
  const midias = midiasDaVitrine(mods, { dias: 120 })
  const todas = args.includes('--todas')
  let lista
  if (todas) lista = [...midias.values()]
  else {
    if (!alvo) { console.log('uso: node scripts/enquadra.mjs <id ou caminho> [--focus "50% 30%"] [--frames N] [--shapes small,big] | --todas'); process.exit(2) }
    lista = [...midias.values()].filter((m) => m.key === alvo || m.label === alvo || m.key.endsWith('/' + alvo) || m.key.endsWith('/' + alvo + '.mp4'))
    if (!lista.length) {
      if (!fs.existsSync(path.join(ROOT, 'public', alvo.replace(/^\//, '')))) { console.log(`não achei "${alvo}" na vitrine nem em public/`); process.exit(2) }
      const sh = String(opt('--shapes', 'small,big')).split(',').filter((s) => JANELAS[s])
      lista = [{ key: alvo, label: path.basename(alvo).replace(/\.[^.]+$/, ''), media: alvo.startsWith('/') ? alvo : '/' + alvo, poster: opt('--poster', null), focus: '50% 50%', shapes: new Set(sh), fora: true }]
    }
  }
  for (const m of lista) {
    const shapes = [...m.shapes].sort()
    const focus = opt('--focus', m.focus)
    const r = await folha(JANELAS, m, focus, shapes)
    console.log(`\n${m.kind ?? 'nova'} ${m.label}  ${r.probe.w}×${r.probe.h}${r.probe.dur ? ` ${r.probe.dur.toFixed(2)} s` : ''}  focus ${focus}  formas ${shapes.map((s) => `${s} (${JANELAS[s].min}–${JANELAS[s].max})`).join(', ')}${m.fora ? '  [ainda fora da vitrine]' : ''}`)
    console.log(`folha: ${r.destino}`)
    if (r.tempos.length) console.log(`quadros em: ${r.tempos.map((t) => t.toFixed(2)).join(' · ')} s (1º painel = pôster, quando há)`)
    console.log('linha para lib/vitrineEnquadramento.ts (só depois de OLHAR a folha):')
    console.log(r.linha)
  }
}
if (process.argv[1] && path.resolve(process.argv[1]) === path.resolve(import.meta.filename)) main().catch((e) => { console.error(e.message); process.exit(1) })
