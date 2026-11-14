// KINEO-RECREATE-MOVIMENTO-MOLDE-1411 [CEO 14/11 12:2x: "preparar a linha do 1º molde de movimento para receber o demo de 10 s e os textos"]
// Põe UM molde de movimento no catálogo a partir do demo NOSSO (MP4) e dos dois textos (cena do passo 1, ação do passo 2). Antes de escrever
// qualquer arquivo, confere tudo e para no primeiro problema:
//   · id em kebab-case, novo (nem no catálogo nem nos assets); título curto em inglês;
//   · o MP4 (ffprobe): 1 trilha de vídeo h264, 9:16 (largura 700 a 736, altura 1280), 9,5 a 10,6 s, até 12 MB;
//   · o pôster: o quadro de 1 s, 720 px de largura, JPEG ≤ 200 KB (a régua de scripts/test-recreate-poster-1011.mjs);
//   · os textos pelo código REAL (lib/recreate/movimento.ts, movimentoProblemasDoMolde): enquadramento "knees up"/"waist up" + "face clearly
//     visible" na cena, nenhuma frase negativa, uma pessoa no guia, tarifa de 10 s, guia MP4 nos assets.
// Escreve: lib/recreate/assets/recreate-mov-<id>-v1.mp4 e recreate-mov-<id>.jpg, as 2 chaves em RECREATE_ASSETS e a linha em
// RECREATE_MOVIMENTO_MOLDES com movimentoAprovado: false (só a casa vê; o público só com a aprovação da CEO e o interruptor 'public').
// Demo trocado depois = id novo de arquivo (-v2): o guia sobe para o bucket em recreate-sources/v1/<arquivo> e o nome não pode ser reusado.
//
// Uso (da raiz da worktree):
//   node scripts/recreate-movimento-novo-molde.mjs --id lance-de-futebol --titulo "Football run" --mp4 C:\caminho\demo.mp4 \
//     --cena "standing on …, framed from the knees up, their face clearly visible …" --acao "The person runs forward …" [--desde 2026-11-14] [--ensaio]
// --ensaio: confere tudo e mostra o que escreveria, sem escrever nada.
import { createRequire } from 'node:module'
import { execFileSync } from 'node:child_process'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'

const require = createRequire(import.meta.url)
const { loader } = require('../docs/recreate-0911/test-recreate.cjs')
const FORMATS = 'lib/recreate/formats.ts', ASSETS = 'lib/recreate/assets'
const args = Object.fromEntries(process.argv.slice(2).reduce((acc, a, i, all) => (a.startsWith('--') ? [...acc, [a.slice(2), all[i + 1] && !all[i + 1].startsWith('--') ? all[i + 1] : true]] : acc), []))
const falha = (m) => { console.error('PARADO: ' + m); process.exit(1) }
const id = String(args.id ?? ''), titulo = String(args.titulo ?? ''), mp4 = String(args.mp4 ?? ''), cena = String(args.cena ?? '').trim(), acao = String(args.acao ?? '').trim()
const desde = String(args.desde ?? new Date().toISOString().slice(0, 10)), ensaio = args.ensaio === true
if (!/^[a-z0-9]+(-[a-z0-9]+)*$/.test(id) || id.length > 40) falha('--id em kebab-case (a-z, 0-9, hífen), até 40')
if (!titulo || titulo.length > 40 || /['"`\\]/.test(titulo)) falha('--titulo curto (até 40), sem aspas nem barra')
if (!/^\d{4}-\d{2}-\d{2}$/.test(desde)) falha('--desde AAAA-MM-DD')
for (const [n, t] of [['cena', cena], ['acao', acao]]) if (!t || t.length > 400 || /['`\\\n]/.test(t)) falha(`--${n}: obrigatório, uma linha, até 400, sem apóstrofo, crase ou barra (escreva "do not" já é proibido: frase positiva)`)
if (!mp4 || !fs.existsSync(mp4)) falha('--mp4: arquivo não encontrado')

const src = fs.readFileSync(FORMATS, 'utf8')
const crlf = src.includes('\r\n')
const lf = src.replace(/\r\n/g, '\n')
const arqMp4 = `recreate-mov-${id}-v1.mp4`, arqJpg = `recreate-mov-${id}.jpg`
if (lf.includes(`'${id}.mp4'`) || lf.includes(`id: '${id}'`) || fs.existsSync(path.join(ASSETS, arqMp4))) falha(`o id ${id} já existe no catálogo ou nos assets`)

// 1. o MP4
const probe = JSON.parse(execFileSync('ffprobe', ['-v', 'error', '-show_entries', 'stream=codec_type,codec_name,width,height:format=duration,size', '-of', 'json', mp4], { encoding: 'utf8' }))
const videos = (probe.streams ?? []).filter((s) => s.codec_type === 'video')
const dur = Number(probe.format?.duration), bytes = Number(probe.format?.size)
if (videos.length !== 1) falha(`o MP4 precisa de 1 trilha de vídeo (tem ${videos.length})`)
const v = videos[0]
if (v.codec_name !== 'h264') falha(`codec ${v.codec_name}: precisa h264 (o navegador e a fal)`)
if (!(v.height === 1280 && v.width >= 700 && v.width <= 736)) falha(`tamanho ${v.width}x${v.height}: precisa 9:16 com altura 1280 (720x1280)`)
if (!(dur >= 9.5 && dur <= 10.6)) falha(`duração ${dur.toFixed(2)} s: o molde é de 10 s (9,5 a 10,6)`)
if (!(bytes <= 12 * 1024 * 1024)) falha(`${(bytes / 1048576).toFixed(1)} MB: até 12 MB`)

// 2. o pôster (quadro de 1 s, 720 px, JPEG leve)
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'mov-molde-'))
const poster = path.join(tmp, arqJpg)
let q = 4
for (; q <= 12; q += 2) {
  execFileSync('ffmpeg', ['-v', 'error', '-y', '-ss', '1', '-i', mp4, '-frames:v', '1', '-vf', 'scale=720:-2', '-q:v', String(q), poster])
  if (fs.statSync(poster).size <= 200_000) break
}
if (fs.statSync(poster).size > 200_000) falha('o pôster não ficou abaixo de 200 KB')

// 3. as duas chaves dos assets e a linha do catálogo, conferidas pelo código REAL antes de escrever
const chaves = `  // KINEO-RECREATE-MOVIMENTO-MOLDE-1411 — demo nosso do molde de movimento "${titulo}" (${v.width}x${v.height}, ${dur.toFixed(1)} s); pôster = quadro de 1 s, 720 px.\n  '${id}.mp4': { file: '${arqMp4}', contentType: 'video/mp4' },\n  '${id}.jpg': { file: '${arqJpg}', contentType: 'image/jpeg' },\n`
const linha = `  { id: '${id}', title: '${titulo}', desde: '${desde}', type: 'motion', preview: '/api/recreate/assets/${id}.mp4', poster: '/api/recreate/assets/${id}.jpg', guia: '${id}.mp4', seconds: 10, photoSlots: 1, pessoasNoGuia: 1, prompt: '', movimentoAprovado: false,\n    cena: '${cena}',\n    acao: '${acao}' },\n`
const iAssets = lf.indexOf('export const RECREATE_ASSETS = {')
const iFim = lf.indexOf('\n} as const', iAssets)
if (iAssets < 0 || iFim < 0) falha('âncora de RECREATE_ASSETS')
let novo = lf.slice(0, iFim + 1) + chaves + lf.slice(iFim + 1)
const m = /export const RECREATE_MOVIMENTO_MOLDES: readonly RecreateFormat\[\] = \[(\]?)/.exec(novo)
if (!m) falha('âncora de RECREATE_MOVIMENTO_MOLDES')
novo = novo.replace(m[0], `export const RECREATE_MOVIMENTO_MOLDES: readonly RecreateFormat[] = [\n${linha}${m[1] ? ']' : ''}`)
const mod = loader({ '@supabase/supabase-js': { createClient: () => ({}) }, 'server-only': {} }, { [FORMATS]: novo })
const f = mod('lib/recreate/formats').recreateFormat(id)
if (!f || f.type !== 'motion' || f.movimentoAprovado !== false) falha('a linha não entrou no catálogo como movimento sem aprovação')
const problemas = mod('lib/recreate/movimento').movimentoProblemasDoMolde(f)
if (problemas.length) falha('o código recusa o molde: ' + problemas.join('; '))
const creditos = mod('lib/recreate/formats').recreateCreditsFor(f)
const casa = mod('lib/internalAccounts').INTERNAL_EXACT_EMAILS[0], acc = mod('lib/recreate/access')
if (!acc.recreateFormatVisible(f, casa) || acc.recreateFormatVisible(f, 'cliente@exemplo.com')) falha('visibilidade: a casa tem de ver e o cliente não')

console.log(`OK: ${id} "${titulo}" · ${v.width}x${v.height} · ${dur.toFixed(2)} s · ${(bytes / 1048576).toFixed(1)} MB · pôster ${fs.statSync(poster).size} B (q ${q}) · ${creditos} créditos · só a casa vê`)
if (ensaio) { console.log('ENSAIO: nada foi escrito. A linha seria:\n' + linha + 'e as chaves:\n' + chaves); process.exit(0) }
fs.copyFileSync(mp4, path.join(ASSETS, arqMp4))
fs.copyFileSync(poster, path.join(ASSETS, arqJpg))
fs.writeFileSync(FORMATS, crlf ? novo.replace(/\n/g, '\r\n') : novo)
console.log(`Escrito: ${ASSETS}/${arqMp4}, ${ASSETS}/${arqJpg} e ${FORMATS}. Próximo: node scripts/test-recreate-movimento-1411.mjs, a bateria pelos arquivos tocados, commit.`)
