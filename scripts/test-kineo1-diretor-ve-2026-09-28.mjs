// KINEO1-DIRETOR-VE-2026-09-28 — guardião: o diretor do Kineo 1 passa a VER a miniatura.
//
// Fato: o gpt-4o-mini que escolhe entre os ~8 finalistas do Pixabay lia SÓ as tags — por isso "tender" virou carne
// e um poster preto passou. Agora a mesma chamada leva até 4 miniaturas (image_url, detail 'low') com ordem de
// REPROVAR texto legível/logo/placa/símbolo religioso/arma/quadro preto/sujeito diferente, e se a chamada com
// imagens estourar ou falhar, o caminho de tags de sempre decide — a cena nunca fica sem decisão.
//
// Prova (a) por readFileSync: miniatura viaja no candidato; a lista de critérios de reprovação está no prompt;
// existe o fallback vision → tags dentro do MESMO teto de 5 s; o breaker só conta quando as duas tentativas falham;
// nada da trava (rota) mudou. Prova (b) EXECUTANDO o builder e o parser (transpilados do arquivo real com
// `typescript`, sem alias @/): ≤ 4 imagens, todas detail 'low', rotuladas pelo número do clipe; sem imagens o
// prompt é o de produção de sempre; "PICK: 3,1 REJECT: 2" lê certo; resposta antiga "3, 1" segue lendo certo.
import { readFileSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import vm from 'node:vm'
import ts from 'typescript'

const RAIZ = join(dirname(fileURLToPath(import.meta.url)), '..')
const rd = (p) => readFileSync(join(RAIZ, p), 'utf8').replace(/\r\n/g, '\n')
let ok = 0
const falhas = []
const checa = (n, c) => { if (c) ok++; else falhas.push(n) }

const SRC = rd('lib/pixabay.ts')

// ── (a) texto ────────────────────────────────────────────────────────────────────────────────────────────────
checa('candidato carrega a miniatura (tipo)', /thumbnail\?: string/.test(SRC))
checa('collectCandidates lê videos.small.thumbnail da Pixabay', /video\.videos\?\.small\?\.thumbnail/.test(SRC) && /\.\.\.\(thumbnail \? \{ thumbnail \} : \{\}\)/.test(SRC))
checa('teto de 4 imagens', /export const GPT_DIRECTOR_MAX_IMAGES = 4\b/.test(SRC))
checa("detail 'low' em toda imagem", /image_url: \{ url, detail: 'low' \}/.test(SRC) && !/detail: '(high|auto)'/.test(SRC))
const crit = /export const GPT_DIRECTOR_REJECT_CRITERIA =\s*\n?\s*'([^']+)'/.exec(SRC)?.[1] ?? ''
for (const termo of ['readable text', 'logo', 'sign', 'religious symbol', 'weapon', 'black or blank frame', 'subject different from the narration']) {
  checa(`critério de reprovação no prompt: ${termo}`, crit.includes(termo))
}
checa('o prompt com imagens manda REPROVAR pelos critérios', /REJECT any clip whose thumbnail shows \$\{GPT_DIRECTOR_REJECT_CRITERIA\}/.test(SRC))
checa('teto do diretor NÃO mudou (5000 ms)', /const GPT_DIRECTOR_TIMEOUT_MS = 5000\b/.test(SRC))
const visionMs = Number(/const GPT_DIRECTOR_VISION_TIMEOUT_MS = (\d+)/.exec(SRC)?.[1] ?? 0)
checa('chamada com imagens deixa ≥ 1.000 ms para o caminho de tags', visionMs > 0 && visionMs <= 5000 - 1000)
checa('fallback: tentativas vision → tags', /attempts: Array<'vision' \| 'tags'> = visionOn \? \['vision', 'tags'\] : \['tags'\]/.test(SRC))
checa('fallback: orçamento de tags = o que sobrou do MESMO deadline', /const deadline = startedAt \+ GPT_DIRECTOR_TIMEOUT_MS/.test(SRC) && /mode === 'vision' \? Math\.min\(GPT_DIRECTOR_VISION_TIMEOUT_MS, left\) : left/.test(SRC))
checa('fallback: falha da vision NÃO decide — continua para tags', /if \(!out\.ok\) \{\s*\n\s*reasons\.push\(`\$\{mode\}:\$\{out\.reason\}`\)\s*\n\s*continue/.test(SRC))
checa('fallback: resposta lixo da vision também cai para tags', /picks\.length === 0\) \{[\s\S]{0,400}?continue/.test(SRC))
checa('breaker só conta quando as duas tentativas falham', /if \(!decided\) noteGptDirectorFailure\(reasons\.join/.test(SRC))
checa('interruptor FAST_GPT_DIRECTOR_VISION=false volta ao tags-only', /process\.env\.FAST_GPT_DIRECTOR_VISION !== 'false'/.test(SRC))
checa('reprovado vai para o FIM do pool, nunca some', /ranked = \[\.\.\.chosen, \.\.\.rest, \.\.\.rejected\]/.test(SRC))
checa('assinatura pública que a rota chama segue igual', /export async function getPixabayClipsForScene\(/.test(SRC))
checa('custo por filme estimado no comentário', /filme de 9 cenas ≈ US\$ 0,015/.test(SRC))
checa('askGptDirector nunca lança (catch devolve reason)', /async function askGptDirector\([\s\S]*?\} catch \(err\) \{[\s\S]*?return \{\s*\n?\s*ok: false/.test(SRC))
// a rota travada não é tocada por esta trilha
const ROTA = rd('app/api/generate-video-fast/route.ts')
checa('rota travada não menciona a vision (nada ligado por lá)', !/FAST_GPT_DIRECTOR_VISION|buildGptDirectorMessages/.test(ROTA))

// ── (b) execução do builder e do parser ──────────────────────────────────────────────────────────────────────
function fatia(nomeRegex) {
  const m = nomeRegex.exec(SRC)
  if (!m) return null
  // do início da declaração até a próxima linha que começa com '}' em coluna 0
  const ini = m.index
  const fim = SRC.indexOf('\n}\n', ini)
  return SRC.slice(ini, fim + 3)
}
const trecho = [
  /export const GPT_DIRECTOR_MAX_IMAGES = 4[^\n]*\n/.exec(SRC)?.[0] ?? '',
  /export const GPT_DIRECTOR_REJECT_CRITERIA =\s*\n?\s*'[^']+'\n/.exec(SRC)?.[0] ?? '',
  fatia(/export function buildGptDirectorMessages\(/) ?? '',
  fatia(/export function parseGptDirectorReply\(/) ?? '',
].join('\n')
checa('builder e parser localizados no arquivo', trecho.includes('function buildGptDirectorMessages') && trecho.includes('function parseGptDirectorReply'))
const js = ts.transpileModule(trecho, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 } }).outputText
const ctx = { exports: {}, module: { exports: {} }, console }
vm.runInNewContext(js, ctx)
const { buildGptDirectorMessages: build, parseGptDirectorReply: parse } = ctx.exports

const fin8 = Array.from({ length: 8 }, (_, i) => ({ tags: `tag${i + 1}, night, cinematic`, thumbnail: `https://cdn.pixabay.com/video/t${i + 1}_small.jpg` }))
const comImg = build('The tender meat of the story', fin8, 3, true)
const partes = comImg.messages[0].content
const imgs = Array.isArray(partes) ? partes.filter((p) => p.type === 'image_url') : []
checa('com 8 miniaturas anexa exatamente 4', comImg.imagesAttached === 4 && imgs.length === 4)
checa("toda imagem vai com detail 'low'", imgs.every((p) => p.image_url.detail === 'low'))
checa('imagens são as 4 primeiras miniaturas, rotuladas pelo número do clipe', imgs.map((p) => p.image_url.url).join(',') === fin8.slice(0, 4).map((f) => f.thumbnail).join(',') && Array.isArray(partes) && partes.some((p) => p.type === 'text' && p.text === 'Thumbnail of clip 1:') && partes.some((p) => p.type === 'text' && p.text === 'Thumbnail of clip 4:'))
const textoFinal = Array.isArray(partes) ? partes[partes.length - 1].text : ''
checa('prompt com imagens pede PICK/REJECT e cita os critérios', /PICK: a,b REJECT: c/.test(textoFinal) && textoFinal.includes('religious symbol') && textoFinal.includes('weapon') && textoFinal.includes('logo'))
checa('prompt com imagens pede os 3 clipes (maxClips) não reprovados', /the 3 non-rejected clips/.test(textoFinal))
checa('max_tokens maior para PICK/REJECT', comImg.maxTokens >= 30)
const fin2 = [{ tags: 'a' }, { tags: 'b', thumbnail: 'https://x/b.jpg' }, { tags: 'c' }, { tags: 'd', thumbnail: 'https://x/d.jpg' }, { tags: 'e' }]
const parcial = build('hint here', fin2, 2, true)
const imgs2 = parcial.messages[0].content.filter((p) => p.type === 'image_url')
checa('só quem tem miniatura vai como imagem (2 de 5), rótulo com o número certo', parcial.imagesAttached === 2 && imgs2.length === 2 && parcial.messages[0].content.some((p) => p.type === 'text' && p.text === 'Thumbnail of clip 2:') && parcial.messages[0].content.some((p) => p.type === 'text' && p.text === 'Thumbnail of clip 4:'))
const semImg = build('The tender meat of the story', fin8, 3, false)
checa('sem imagens: prompt de tags de produção, string simples, 20 tokens', typeof semImg.messages[0].content === 'string' && semImg.imagesAttached === 0 && semImg.maxTokens === 20 && semImg.messages[0].content === `Narration: "The tender meat of the story"\nStock clips (by tags):\n${fin8.map((c, i) => `${i + 1}. tags: ${c.tags}`).join('\n')}\nReply ONLY with the numbers of the 3 clips that best match the narration's subject and a dark cinematic documentary look, comma-separated, best first.`)
checa('narração cortada em 120 caracteres', build('x'.repeat(300), fin8, 3, true).messages[0].content[0].text.includes(`"${'x'.repeat(120)}"`) && !build('x'.repeat(300), fin8, 3, true).messages[0].content[0].text.includes('x'.repeat(121)))

// parser
const r1 = parse('PICK: 3,1 REJECT: 2', 8)
checa('PICK/REJECT: escolhas 0-based na ordem, reprovado separado', JSON.stringify(r1) === JSON.stringify({ picks: [2, 0], rejects: [1] }))
const r2 = parse('3, 1', 8)
checa('formato antigo (só números) segue lendo como escolhas', JSON.stringify(r2) === JSON.stringify({ picks: [2, 0], rejects: [] }))
const r3 = parse('PICK: 2,9,2 REJECT: none', 8)
checa('fora do alcance e repetido caem; "none" não reprova ninguém', JSON.stringify(r3) === JSON.stringify({ picks: [1], rejects: [] }))
const r4 = parse('PICK: 1 REJECT: 1,4', 8)
checa('número escolhido E reprovado fica como escolha', JSON.stringify(r4) === JSON.stringify({ picks: [0], rejects: [3] }))
const r5 = parse('I cannot see the images.', 8)
checa('resposta sem número = sem escolha (cai para tags no chamador)', r5.picks.length === 0 && r5.rejects.length === 0)

console.log(`test-kineo1-diretor-ve-2026-09-28: ok=${ok} falhas=${falhas.length}`)
for (const f of falhas) console.log(`  FALHA: ${f}`)
process.exit(falhas.length ? 1 : 0)
