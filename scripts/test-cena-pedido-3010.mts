// KINEO-CENA-PEDIDO-3010 — guardião dos 3 consertos pedidos pelo revisor de vídeos (29/10, rodada 23:17), com o texto REAL:
// (1) Arca de Noé no Kling 4: a cena chega ao motor com a AÇÃO da fala (nuvens/cidade, a arca sendo construída, arca + arco-íris)
//     e sem a moldura que comia os 512 (Opening shot…, 9:16 com faixa de legenda, "characters act naturally");
// (2) cenas vizinhas com eixo de câmera diferente, tudo ≤ 512 code points, "Mouth closed, no speaking." e a proteção de texto na cauda;
// (3) Clipe: o roteiro do corretor ("Crie um vídeo animado…") dispara o aviso + porta do Filme com o texto, e o "animado" vira estilo.
// Mais: a rota usa promptDaCenaKling4 nos 2 caminhos do Kling 4; textos novos nas 16 línguas; mutantes ficam vermelhos.
// Rodar: npx tsx scripts/test-cena-pedido-3010.mts
import { readFileSync } from 'node:fs'
import { buildClassicVisualPrompt } from '@/lib/cinematic/visualPromptPolicy'
import { prepararQualidadeDoFilme } from '@/lib/cinematic/filmQuality'
import { deriveStyleAnchor } from '@/lib/cinematic/sceneStyle'
import { promptDaCenaKling4, semMolduraParaKling4, KLING4_PROMPT_MAX } from '@/lib/cinematic/cenaKling4'
import { pareceRoteiroDeFilme, hrefDoFilmeComTexto, promptDoClipeComEstilo, estiloPedidoNoTexto } from '@/lib/clips/clipTextoLongo'
import { CLIP_COPY_EN, CLIP_COPY } from '@/lib/clips/clipCopy'
import { comSuperficieSemTexto, frasesDeSuperficie } from '@/lib/cinematic/superficieSemTexto'

let pass = 0, fail = 0
const ok = (c: unknown, m: string) => { if (c) { pass++; console.log('  ok  ', m) } else { fail++; console.log('  FALHA', m) } }
const len = (s: string) => Array.from(s).length

// ── (1)(2) Arca de Noé — o pedido real (US, baixou 3×), 3 cenas do filme de 15 s ──
const style = deriveStyleAnchor("Noah's Ark — a story of faith and survival", 'cinematic_ai')
const elenco = [{ nome: 'Noah', nucleo: 'Noah', tipo: 'humano', origem: 'autor', canonica: 'an elderly man with a long flowing white beard, weathered tan skin, deep-set kind eyes, wearing a simple undyed wool robe tied with a rope belt and leather sandals' }] as never
const visuais = [
  'Noah, an old man with a white beard, looks up at dark storm clouds over a corrupt ancient city at dusk',
  'Noah and his sons hammer giant wooden beams, building an enormous ark on a hill as animals arrive in pairs',
  'A close-up of a partially constructed wooden ship with a vibrant rainbow arcing above it, sunlight illuminating the scene',
]
const falas = ["Noah's Ark — a story of faith and survival! Long ago, the world was filled with wickedness.", 'God told Noah to build a giant ark and gather two of every animal before the great flood.', 'After the waters fell, a rainbow filled the sky — a promise of hope.']
const classicos = visuais.map((v, i) => buildClassicVisualPrompt(v, { mode: 'character_story', style, aspect: '9:16', opening: i === 0 } as never))
const finais = prepararQualidadeDoFilme({ prompts: classicos, falas, contextoOriginal: falas.join(' '), contextoFiltro: falas.join(' '), modo: 'character_story' as never, tagFaceless: false, style, elenco, aplicarContrato: false }).prompts
const k4 = finais.map((p, i) => promptDaCenaKling4(p, style, i))
ok(/storm clouds/.test(k4[0]) && /ancient city/.test(k4[0]), '(1) cena 1 leva a ação da fala (nuvens sobre a cidade) — antes chegava só moldura + ficha')
ok(/ark/.test(k4[1]) && /animals/.test(k4[1]), '(1) cena 2 leva a arca e os animais')
ok(/rainbow/.test(k4[2]) && /wooden ship/.test(k4[2]), '(1) cena 3 leva a arca e o arco-íris')
ok(k4.every((p) => !/Opening shot: show the described subject/.test(p) && !/lower third clear for captions/.test(p) && !/characters act naturally/.test(p)), '(1) a moldura que não é cena saiu das 3')
ok(/elderly man with a long flowing white beard/.test(k4[0]), '(1) a ficha do Noé continua na cena')
ok(k4.every((p) => len(p) <= KLING4_PROMPT_MAX), `(2) todas ≤ ${KLING4_PROMPT_MAX} code points (${k4.map(len).join(', ')})`)
ok(k4.every((p) => p.endsWith('Mouth closed, no speaking.') && /no readable text/.test(p)), '(2) cauda preservada: proteção de texto + "Mouth closed, no speaking."')
const eixos = k4.map((p) => /^[^.]+\. ([^.]+)\./.exec(p)?.[1] ?? '')
ok(eixos.every(Boolean) && eixos[0] !== eixos[1] && eixos[1] !== eixos[2], `(2) eixo de câmera por cena, vizinhos diferentes (${eixos.join(' | ')})`)
ok(k4.every((p) => p.startsWith('Photoreal film. ')), '(2) o meio do filme abre cada cena')
ok(semMolduraParaKling4('sem meio nenhum', style) === 'sem meio nenhum', '(2) prompt sem moldura passa igual')

// ── (3) Clipe — o pedido real do corretor (BR, nota 4) ──
const corretor = 'Crie um vídeo animado 1080x1920 em terceira pessoa. Um corretor de imóveis acorda cedo, abre o notebook e vê dezenas de leads novos chegando. Ele liga para cada um, agenda visitas, mostra apartamentos, negocia com calma e no fim do dia fecha três vendas. A câmera acompanha a rotina dele do café da manhã até a comemoração com a equipe no escritório, mostrando como organizar os leads mudou o jogo.'
ok(pareceRoteiroDeFilme(corretor), '(3) roteiro do corretor dispara o aviso de roteiro longo')
ok(!pareceRoteiroDeFilme('a storm over the sea at night'), '(3) ideia curta de clipe não dispara')
ok(pareceRoteiroDeFilme('HOOK: o segredo do mar'), '(3) marca de roteiro dispara')
ok(hrefDoFilmeComTexto(corretor).startsWith('/studio?prompt=') && new URLSearchParams(hrefDoFilmeComTexto(corretor).split('?')[1]).get('prompt') === corretor.trim(), '(3) a porta do Filme leva o texto inteiro ao Studio')
ok(estiloPedidoNoTexto(corretor) === '3D animated cartoon style, not live action' && /Visual style: 3D animated cartoon style, not live action\.$/.test(promptDoClipeComEstilo(corretor)), '(3) "animado" vira estilo no prompt do clipe')
ok(estiloPedidoNoTexto('um anime de humor com três amigos') === 'anime style animation, not live action', '(3) anime vira estilo anime')
ok(promptDoClipeComEstilo('a storm over the sea') === 'a storm over the sea', '(3) sem estilo pedido, o prompt sai igual')
ok(len(promptDoClipeComEstilo('desenho animado '.repeat(80))) <= 1000, '(3) com estilo, o prompt continua ≤ 1000')

// ── (4) defeito 3 — texto inventado em lousa/tela/página/placa (lousa "Gurdiola Bapiom", Seedance; pergaminho, Kling 4) ──
const lousa = 'Pep Guardiola draws tactics on a chalkboard in the Barcelona locker room, players watching. 9:16 vertical framing'
const lousaFinal = comSuperficieSemTexto(lousa)
ok(lousaFinal.startsWith('Pep Guardiola draws tactics on a chalkboard') && /The board is covered only in hand-drawn arrows, circles and simple diagrams.$/.test(lousaFinal), '(4) lousa: a ação continua na frente e a lousa vai descrita em positivo (setas, círculos)')
ok(comSuperficieSemTexto(lousaFinal) === lousaFinal, '(4) idempotente: aplicar 2× não repete a frase')
ok(comSuperficieSemTexto('A storm over the sea at night') === 'A storm over the sea at night', '(4) cena sem superfície de texto sai igual, byte a byte')
ok(frasesDeSuperficie(classicos[0]).length === 0, '(4) a moldura de sempre ("no readable text, letters, labels or signage") não dispara sozinha')
const pergaminho = finais[2].replace('A close-up of a partially constructed wooden ship', 'A prophet unrolls an ancient parchment scroll beside a partially constructed wooden ship')
const k4Perg = promptDaCenaKling4(comSuperficieSemTexto(pergaminho), style, 2)
ok(/Every page shows only aged texture and faint decorative lines./.test(k4Perg) && k4Perg.endsWith('Mouth closed, no speaking.') && len(k4Perg) <= KLING4_PROMPT_MAX, `(4) pergaminho no Kling 4: página em positivo, cauda preservada, ≤ 512 (${len(k4Perg)})`)
ok((k4Perg.match(/Every page shows only aged texture/g) ?? []).length === 1, '(4) a frase entra uma vez só no Kling 4')

// ── rota, tela e 16 línguas ──
const rota = readFileSync('app/api/generate-video-cinematic/route.ts', 'utf8')
ok(/const kling4Prompts = classicScenePrompts\.map\(\(p, i\) => promptDaCenaKling4\(p, styleAnchor, i\)\)/.test(rota), 'rota: 1º filme Kling 4 usa promptDaCenaKling4')
ok(rota.includes("classicScenePrompts[i] = comSuperficieSemTexto(classicScenePrompts[i])"), 'rota: superfícies em positivo no vetor final de TODOS os motores (still e clipe)')
ok(/scenes: paidScenes\.map\(\(s, i\) => \(\{ \.\.\.s, prompt: promptDaCenaKling4\(s\.prompt, styleAnchor, i\) \}\)\)/.test(rota), 'rota: filme pago Kling 4 usa promptDaCenaKling4')
const tela = readFileSync('app/(dashboard)/clips/ClipsClient.tsx', 'utf8')
ok((tela.includes('{pareceRoteiroDeFilme(prompt) && (') || (tela.includes('{roteiroDeFilme && (') && tela.includes('const roteiroDeFilme = !withPhoto && pareceRoteiroDeFilme(prompt)'))) /* reancorado 30/10 KINEO-CLIPE-OU-FILME-3010 */ && tela.includes("t('longScript', { s: seconds })") && tela.includes('href={hrefDoFilmeComTexto(prompt)}') && tela.includes('prompt: promptDoClipeComEstilo(prompt)'), 'tela do Clipe: aviso, porta do Filme e estilo no envio')
const langs = Object.keys(CLIP_COPY) as Array<keyof typeof CLIP_COPY>
const ruins = langs.filter((l) => { const d = CLIP_COPY[l] as Record<string, string>; return !d.longScript || !d.longScriptCta || d.longScript === CLIP_COPY_EN.longScript || !d.longScript.includes('{s}') })
ok(langs.length === 15 && ruins.length === 0 && CLIP_COPY_EN.longScript.includes('{s}'), `textos novos nas 16 línguas, traduzidos, com {s}${ruins.length ? ': ' + ruins.join(',') : ''}`)

// ── mutantes ──
ok(!/storm clouds/.test(finais[0].replace(/Noah, an old man[^.]*\./, '')), 'M ação removida da cena 1: (1) ficaria vermelho')
ok(!pareceRoteiroDeFilme(corretor.split(' ').slice(0, 20).join(' ')), 'M roteiro curto: o aviso não aparece')

console.log(`${pass} ok, ${fail} falha(s)`)
process.exit(fail ? 1 : 0)
