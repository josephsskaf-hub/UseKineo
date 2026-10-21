// KINEO-META95-PERSONAGEM-AJUSTE-2010 [TRAVA 8.2 — vai do fundador 19/10 "Vai pra meta do 95"] — guardião dos 6 CONSERTOS da folha de
// personagem (testada em produção em 20/10 com 3 filmes reais). Prova OFFLINE, sem fornecedor (fal, OpenAI e moderação falsos), EXECUTANDO
// a lib nova (lib/cinematic/personagemAjuste.ts), a lib da folha, a régua REAL de moderação (lib/safety/moderationPolicy), o crítico de HOJE
// e o da BASE (lido do git), o construtor REAL de cena (lib/cinematic/visualPromptPolicy) e o BLOCO REAL da rota (de hoje e o desfeito),
// com os 3 roteiros reproduzidos à mão (Dino, Ravan, menino da moto):
//   F1 formato   — o still pede o formato do filme por extenso e proíbe painel/colagem; as dimensões são lidas do cabeçalho; fora do formato = FLUX;
//   F2 moderação — o bloqueio "sexual/minors" só por termo de idade numa cena de criatura é reconferido sem o termo (a MESMA imagem);
//                  gente, nota sexual, sinal de menor forte ou termo sexual NUNCA são reconferidos;
//   F3 Ravan     — figura conhecida ganha a iconografia (10 cabeças), nunca "homem ruivo de moletom"; nome mítico desconhecido não ganha invenção;
//   F4 moto      — o elenco casa pela FALA ("A boy… His bike") quando o visual mostra alguém ("young man on motorcycle") e a ficha vai ao prompt;
//   F5 refação   — a CAUSA (janela de 9 s do FLUX para um edit de 15-40 s) reproduzida no bloco antigo e corrigida no novo, com o motivo no evento;
//   F6 cena 1    — a floresta do Dino (ninguém citado) perde "characters act naturally" e ganha "No people…" no construtor real;
//   O  desligado — sem o interruptor: o vetor de prompts, o bloco e o crítico (sem as opções novas) são os de sempre;
//   D  desfaz exato e encadeado, commits com marca e selo; M mutantes (cada regra fica vermelha quando quebrada).
import fs from 'node:fs'
import path from 'node:path'
import { execFileSync } from 'node:child_process'
import { createRequire } from 'node:module'
import { fileURLToPath } from 'node:url'
import {
  semMeta95PersonagemAjuste2010, MARCA_META95_PERSONAGEM_AJUSTE_2010, META95_PERSONAGEM_AJUSTE_2010_BASE, META95_PERSONAGEM_AJUSTE_2010_ARQUIVOS,
  META95_PERSONAGEM_AJUSTE_2010_NOVOS, ACRESCIMOS_META95_PERSONAGEM_AJUSTE_2010, TROCAS_META95_PERSONAGEM_AJUSTE_2010,
} from './test-support/desfaz-meta95-personagem-ajuste-2010.mjs'
import { semMeta95Personagem2010 } from './test-support/desfaz-meta95-personagem-2010.mjs'

const require = createRequire(import.meta.url)
const ts = require('typescript')
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const MARCA = MARCA_META95_PERSONAGEM_AJUSTE_2010
const SELO = '[TRAVA 8.2 — vai do fundador 19/10 "Vai pra meta do 95"]'
const lf = (s) => String(s).replace(/\r\n/g, '\n')
const rd = (rel) => lf(fs.readFileSync(path.join(ROOT, rel), 'utf8'))
const git = (...a) => execFileSync('git', ['-C', ROOT, ...a], { encoding: 'utf8', maxBuffer: 1 << 28, stdio: ['ignore', 'pipe', 'ignore'] })
const BASE_CMP = META95_PERSONAGEM_AJUSTE_2010_BASE // integração 21/10: a base é a origin/main sobre a qual a entrega foi mesclada (a tabela do desfaz foi refeita contra ela)
const base = (rel) => { try { return lf(git('show', `${BASE_CMP}:${rel}`)) } catch { return null } }
let pass = 0
let fail = 0
function ok(cond, msg, extra = '') { if (cond) { pass++; console.log('  ok  ', msg) } else { fail++; console.log('  FALHA', msg, extra ? `→ ${extra}` : '') } }

globalThis.fetch = () => { throw new Error('rede proibida no guardião') }

const F = {
  aj: 'lib/cinematic/personagemAjuste.ts',
  folha: 'lib/cinematic/folhaDePersonagem.ts',
  critico: 'lib/cinematic/criticoStill.ts',
  rota: 'app/api/generate-video-cinematic/route.ts',
  policy: 'lib/cinematic/visualPromptPolicy.ts',
  moderacao: 'lib/safety/moderationPolicy.ts',
  servidor: 'lib/cinematic/personagemAjusteServer.ts',
}

// ─── carregador: módulo TS real → exports (imports @/ e ./ resolvidos transpilando os arquivos reais; `over` troca um arquivo pelo texto mutado) ───
function carregador(over = {}, escopo = {}) {
  const cache = new Map()
  const carrega = (rel) => {
    if (cache.has(rel)) return cache.get(rel)
    const src = over[rel] ?? rd(rel)
    const js = ts.transpileModule(src, { fileName: rel, compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText
    const mod = { exports: {} }
    cache.set(rel, mod.exports)
    const req = (n) => {
      if (n.startsWith('@/')) return carrega(`${n.slice(2)}.ts`)
      if (n.startsWith('./') || n.startsWith('../')) {
        const p = (rel.replace(/[^/]+$/, '') + n).split('/').reduce((acc, seg) => { if (seg === '..') acc.pop(); else if (seg !== '.' && seg !== '') acc.push(seg); return acc }, []).join('/')
        return carrega(`${p}.ts`)
      }
      throw new Error(`import inesperado ${n}`)
    }
    const nomes = Object.keys(escopo)
    new Function('module', 'exports', 'require', 'process', ...nomes, js)(mod, mod.exports, req, process, ...nomes.map((k) => escopo[k]))
    return mod.exports
  }
  return carrega
}

// ─── os 3 roteiros, reproduzidos à mão (o texto falado do roteiro + o visual que o escritor de cenas (GPT) escreveu) ───
const DINO = {
  script: 'HOOK: [Pexels: dark forest night] It was bedtime, but Dino heard a strange noise in the forest!\n\nMICRO REWARD 2: [Pexels: dinosaur blanket window] Dino: "Oh no!\n\nPAYOFF: [Pexels: fireflies glowing] Dino took a deep breath, opened the window... and found fireflies! The noise? Just a twig. The darkness wasn\'t so scary after all. Good night, Dino!',
  visuals: [
    'Close-up shot of rustling leaves and dark shadows in a dense forest at night, creating an eerie atmosphere as if something is lurking in the darkness.',
    'Close-up of Dino\'s worried face, eyes wide, as he, "Oh no!" in a dimly lit room with a dinosaur blanket visible behind him.',
    'Tracking shot of Dino peering out of a window, his face illuminated by the soft glow of fireflies dancing in the night sky, contrasting the earlier tension with a sense of wonder.',
  ],
  falas: ['It was bedtime, but Dino heard a strange noise in the forest!', 'Dino: "Oh no!', 'Dino took a deep breath, opened the window... and found fireflies! The noise? Just a twig.'],
}
const RAVAN = {
  script: 'HOOK (0-2s): [Pexels: colorful cartoon boy] A sad Indian boy stands beside a burnt Ravan effigy.\n\nMICRO REWARD 2: [Pexels: ravan face alive] Ravan\'s face comes alive, looking exhausted and annoyed.\n\nPAYOFF: [Pexels: cartoon boy shock] Ravan: "Bhai, I want to rest in peace... but people won\'t even let me rest in peace!" The boy stares in shock; Ravan rolls his eyes.',
  visuals: [
    'A close-up of a young Indian boy with tears in his eyes, standing beside a charred and burnt effigy of Ravan, the demon king, in a deserted street during dusk.',
    'A close-up of Ravan\'s painted face, looking exhausted and annoyed, with smoke swirling around it.',
    'A tracking shot following the Indian boy\'s face as he stares in shock at the Ravan effigy. The camera captures Ravan\'s eyes rolling in a comical way.',
  ],
  falas: ['A sad Indian boy stands beside a burnt Ravan effigy.', 'Ravan\'s face comes alive, looking exhausted and annoyed.', 'Ravan: "Bhai, I want to rest in peace... but people won\'t even let me rest in peace!" The boy stares in shock; Ravan rolls his eyes.'],
}
const MOTO = {
  script: 'Midnight. A boy rode his bike home through a haunted path. He agreed—only to learn... she was buried there three years ago. His bike stopped. Her photo... on a grave. He vanished. Only the sound of a bike remains at midnight.',
  // o visual que o escritor de cenas escreveu (o "young man on motorcycle" do 5a114e02) — o personagem está no quadro, mas com outro nome
  visuals: [
    'Wide shot of a young man on a motorcycle riding along a dark foggy forest path at midnight, the headlight cutting through the mist.',
    'A figure on the motorcycle brakes hard as the bike stops on the dark path, a faded photo resting on a grave in the headlight.',
    'The empty forest path at midnight, mist drifting, no one in sight.',
  ],
  falas: ['Midnight. A boy rode his bike home through a haunted path.', 'He agreed—only to learn... she was buried there three years ago. His bike stopped. Her photo... on a grave.', 'He vanished. Only the sound of a bike remains at midnight.'],
}
const BIBLIOTECA = {
  script: 'HOOK: [Pexels: mysterious street at night] A library that only appears at midnight...\n\nMICRO REWARD 1: [Pexels: young man entering library] A young man enters, finding glowing books.\n\nMICRO REWARD 2: [Pexels: book with his name] He opens a book... with his name on it.\n\nPAYOFF: [Pexels: sister holding book] The next morning, his missing sister appears... holding the same book.',
  visuals: [
    'A dimly lit street shrouded in fog, the silhouette of an ornate library materializes as the clock strikes midnight, casting an eerie glow.',
    'A close-up of a young man\'s hands as he opens a dusty, book, the pages illuminated with a soft, ethereal light revealing his name.',
    'A soft morning light filters through a window as a young woman stands in the doorway, clutching the same glowing book, her expression a mix of relief and confusion.',
  ],
  falas: ['A library that only appears at midnight...', 'A young man enters, finding glowing books.', 'The next morning, his missing sister appears... holding the same book.'],
}

const A = carregador()(F.aj)
const L = carregador()(F.folha)
const V = carregador()(F.policy)
const P = carregador()(F.moderacao)
const S = carregador()('lib/cinematic/sceneStyle.ts')
const nomes = (cenas) => JSON.stringify(cenas.map((c) => c.nomes))

// ─── bytes de cabeçalho feitos à mão (PNG, JPEG, WebP VP8X) ───
const png = (w, h) => { const b = new Uint8Array(33); b.set([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0, 0, 13, 0x49, 0x48, 0x44, 0x52]); b.set([(w >>> 24) & 255, (w >>> 16) & 255, (w >>> 8) & 255, w & 255, (h >>> 24) & 255, (h >>> 16) & 255, (h >>> 8) & 255, h & 255], 16); return b }
const jpeg = (w, h) => new Uint8Array([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46, 0x49, 0x46, 0, 1, 1, 0, 0, 1, 0, 1, 0, 0, 0xff, 0xc0, 0x00, 0x11, 0x08, (h >> 8) & 255, h & 255, (w >> 8) & 255, w & 255, 3, 1, 0x22, 0, 2, 0x11, 1, 3, 0x11, 1])
const webp = (w, h) => { const b = new Uint8Array(30); b.set([0x52, 0x49, 0x46, 0x46, 0, 0, 0, 0, 0x57, 0x45, 0x42, 0x50, 0x56, 0x50, 0x38, 0x58]); const W = w - 1; const H = h - 1; b.set([W & 255, (W >> 8) & 255, (W >> 16) & 255, H & 255, (H >> 8) & 255, (H >> 16) & 255], 24); return b }

console.log('\nF1. formato do still (9:16 explícito, sem colagem, dimensões conferidas)')
const elencoDino = A.elencoDoRoteiro(DINO.script)
const elencoRavan = A.elencoDoRoteiro(RAVAN.script)
const elencoMoto = A.elencoDoRoteiro(MOTO.script)
{
  const um = A.promptDoStillComFolhaAjuste('X. ' + DINO.visuals[1], elencoDino, '9:16')
  ok(um.startsWith(L.promptDoStillComFolha('X. ' + DINO.visuals[1], elencoDino)) && /Output: ONE vertical 9:16 portrait image, taller than wide \(9:16\), the scene filling the whole canvas edge to edge, no bars, no borders, no empty or flat-colour bands\./.test(um) && /no diptych, no split screen, no collage/.test(um), 'F1a 1 folha: o prompt de sempre + o formato do filme por extenso (9:16, vertical, sem faixa/borda) + sem painel')
  const dois = A.promptDoStillComFolhaAjuste('Y.', elencoRavan, '9:16')
  ok(/The 2 reference images are separate character sheets: draw each character exactly once, together inside the same single scene; never place them in separate panels or frames, no side-by-side images, no diptych, no grid, no split screen, no collage\./.test(dois), 'F1b 2 folhas (Ravan + o menino): "cada personagem uma vez, na MESMA cena; nunca painéis lado a lado" (a colagem de 2 painéis de 20/10)')
  ok(/ONE horizontal 16:9 landscape image/.test(A.promptDoStillComFolhaAjuste('Z.', elencoDino, '16:9')) && /ONE vertical 9:16/.test(A.promptDoStillComFolhaAjuste('Z.', elencoDino, undefined)), 'F1c o formato segue o pedido (16:9 diz horizontal; sem pedido = 9:16, o da casa)')
  const terco = A.promptDoStillComFolhaAjuste('A dinosaur in a bedroom, 9:16 vertical, subject framed in the upper two-thirds with the lower third clear for captions, soft light', elencoDino, '9:16') // integração 21/10 (ideia da versão Codex)
  ok(!/lower third clear/i.test(terco) && /with continuous scenery down to the bottom edge/.test(terco) && /edge to edge/.test(terco), 'F1h o pedido de "lower third clear for captions" (sceneStyle/visualPromptPolicy) não chega ao edit: vira cenário contínuo até a borda (não contradiz o edge to edge)')
  const corpo = A.corpoDoEditAjuste('p', ['https://f/a.jpg', 'https://f/b.jpg'], '9:16')
  ok(JSON.stringify(corpo) === JSON.stringify(carregador()('lib/estrelaDoFilme.ts').buildEstrelaEditInput('p', ['https://f/a.jpg', 'https://f/b.jpg'], '9:16')) && corpo.aspect_ratio === '9:16', 'F1d o corpo do edit é o da Estrela, com aspect_ratio 9:16 explícito')
  const d1 = A.dimensoesDaImagem(png(768, 1376)); const d2 = A.dimensoesDaImagem(jpeg(1376, 768)); const d3 = A.dimensoesDaImagem(webp(1024, 1024))
  ok(d1?.largura === 768 && d1?.altura === 1376 && d1.formato === 'png' && d2?.largura === 1376 && d2?.altura === 768 && d2.formato === 'jpeg' && d3?.largura === 1024 && d3?.altura === 1024 && d3.formato === 'webp' && A.dimensoesDaImagem(new Uint8Array(40)) === null && A.dimensoesDaImagem(null) === null, 'F1e dimensões lidas do cabeçalho (PNG 768×1376, JPEG 1376×768, WebP 1024×1024; lixo/nada = null)')
  ok(A.stillNoFormato({ largura: 768, altura: 1376 }, '9:16').ok && A.stillNoFormato({ largura: 1024, altura: 1024 }, '9:16').motivo === 'formato_errado' && A.stillNoFormato({ largura: 1536, altura: 1376 }, '9:16').motivo === 'formato_errado' && A.stillNoFormato({ largura: 768, altura: 1200 }, '9:16').motivo === 'formato_errado' && A.stillNoFormato(null, '9:16').motivo === 'formato_nao_conferido' && A.stillNoFormato({ largura: 1376, altura: 768 }, '16:9').ok, 'F1f 9:16 da fal (768×1376) passa; quadrado, 2 painéis lado a lado (1536×1376) e "9:16 com faixa" (768×1200) caem; sem dimensão = não conferido')
  const deps = (largura, altura, bytes) => ({ pedir: async () => ({ url: 'https://f/edit.png', motivo: 'ok', largura, altura }), bytes: async () => bytes, moderar: async () => ({ ok: true }) })
  const r1 = await A.stillComFolha({ prompt: 'p', imageUrls: ['f'], aspect: '9:16', fichas: elencoDino, pollWindowMs: 1 }, deps(768, 1376, null))
  const r2 = await A.stillComFolha({ prompt: 'p', imageUrls: ['f'], aspect: '9:16', fichas: elencoDino, pollWindowMs: 1 }, deps(null, null, png(1024, 1024)))
  const r3 = await A.stillComFolha({ prompt: 'p', imageUrls: ['f'], aspect: '9:16', fichas: elencoDino, pollWindowMs: 1 }, deps(null, null, null))
  const r4 = await A.stillComFolha({ prompt: 'p', imageUrls: ['f'], aspect: '9:16', fichas: elencoDino, pollWindowMs: 1 }, deps(null, null, png(768, 1376)))
  ok(r1.url === 'https://f/edit.png' && r1.motivo === 'ok' && r2.url === null && r2.motivo === 'formato_errado' && r3.url === null && r3.motivo === 'formato_nao_conferido' && r4.url && r4.razao === 0.5581, 'F1g o still: width/height da fal OU o cabeçalho; fora do formato ou sem conferir = url null (a cena volta ao FLUX)')
}

console.log('\nF2. moderação de saída: termo de idade em cena inocente de criatura')
{
  // o omni-moderation falso: sexual/minors sobe (0,03) quando o TEXTO cita menor — o comportamento de 20/10 (a categoria é só de texto)
  const omni = (texto, extra = {}) => ({ flagged: false, categories: {}, category_scores: { sexual: extra.sexual ?? 0.0004, 'sexual/minors': P.mentionsMinor(texto) ? (extra.minors ?? 0.03) : 0.0001 } })
  const textoDino = A.promptDoStillComFolhaAjuste('Opening shot: a baby dinosaur child hiding under a dinosaur blanket in his bedroom at night, fireflies at the window.', elencoDino, '9:16')
  const real = P.decideModeration(omni(textoDino), textoDino, { hasImage: true })
  ok(real.block === true && JSON.stringify(real.reasons) === '["sexual/minors"]' && real.sexualScore < 0.01, `F2a ANTES (régua real): a cena do Dino com "baby dinosaur child" barra como sexual/minors só pelo termo de idade (nota sexual ${real.sexualScore})`)
  const re = A.podeReconferirModeracao({ decisao: real, fichas: elencoDino, texto: textoDino })
  ok(re.reconferir === true && re.motivo === 'criatura_cena_inocente' && !P.mentionsMinor(re.textoNeutro) && /dinosaur/.test(re.textoNeutro) && P.decideModeration(omni(re.textoNeutro), re.textoNeutro, { hasImage: true }).block === false, 'F2b DEPOIS: criatura + só sexual/minors + nota de cena inocente → 2ª conferência com o texto sem termo de idade, que a régua real aprova')
  const menino = A.promptDoStillComFolhaAjuste('A boy in his bedroom at night.', elencoRavan.slice(0, 1), '9:16')
  const naoReconfere = [
    ['gente (o menino do Ravan)', { decisao: P.decideModeration(omni(menino), menino, { hasImage: true }), fichas: elencoRavan.slice(0, 1), texto: menino }, 'tem_humano'],
    ['nota sexual', { decisao: { reasons: ['sexual/minors'], sexualScore: 0.05, sexualMinorsScore: 0.03 }, fichas: elencoDino, texto: textoDino }, 'nota_sexual'],
    ['bloqueio "sexual"', { decisao: { reasons: ['sexual/minors', 'sexual'], sexualScore: 0.6, sexualMinorsScore: 0.03 }, fichas: elencoDino, texto: textoDino }, 'bloqueio_sexual'],
    ['minor_term (sexual ≥ 0,1)', { decisao: { reasons: ['sexual/minors', 'minor_term'], sexualScore: 0.2, sexualMinorsScore: 0.03 }, fichas: elencoDino, texto: textoDino }, 'bloqueio_sexual'],
    ['sinal de menor forte', { decisao: { reasons: ['sexual/minors'], sexualScore: 0.001, sexualMinorsScore: 0.8 }, fichas: elencoDino, texto: textoDino }, 'menor_forte'],
    ['termo sexual no texto', { decisao: { reasons: ['sexual/minors'], sexualScore: 0.001, sexualMinorsScore: 0.03 }, fichas: elencoDino, texto: textoDino + ' The dinosaur is naked.' }, 'termo_sexual'],
    ['criança humana junto da criatura', { decisao: { reasons: ['sexual/minors'], sexualScore: 0.001, sexualMinorsScore: 0.03 }, fichas: elencoDino, texto: 'A little girl hugs the baby dinosaur.' }, 'humano_no_texto'],
    ['idade que não é da criatura', { decisao: { reasons: ['sexual/minors'], sexualScore: 0.001, sexualMinorsScore: 0.03 }, fichas: elencoDino, texto: 'The dinosaur blanket lies folded on the bed. In the corner of the quiet room stands an old wooden toddler crib.' }, 'idade_fora_da_criatura'],
  ]
  const probs = naoReconfere.filter(([, a, motivo]) => { const r = A.podeReconferirModeracao(a); return r.reconferir !== false || r.motivo !== motivo }).map(([n, a]) => `${n}: ${JSON.stringify(A.podeReconferirModeracao(a))}`)
  ok(probs.length === 0, 'F2c o que é proibido de verdade NUNCA é reconferido: gente, nota sexual, bloqueio sexual/minor_term, menor forte, termo sexual, criança humana junto, idade fora da criatura', probs.join(' | '))
  const chamadas = []
  const moderarFalso = async (texto, imgs, meta) => { chamadas.push({ texto, imgs, meta }); const d = P.decideModeration(omni(texto), texto, { hasImage: true }); return d.block ? { ok: false, reason: 'blocked', decision: d } : { ok: true } }
  const pedir = async () => ({ url: 'https://f/edit-dino.png', motivo: 'ok', largura: 768, altura: 1376 })
  const r = await A.stillComFolha({ prompt: textoDino, imageUrls: ['https://f/folha.png'], aspect: '9:16', fichas: elencoDino, pollWindowMs: 1 }, { pedir, bytes: async () => null, moderar: moderarFalso })
  ok(r.url === 'https://f/edit-dino.png' && r.motivo === 'ok' && r.reconferida === true && chamadas.length === 2 && chamadas[1].imgs.join() === 'https://f/edit-dino.png' && !P.mentionsMinor(chamadas[1].texto) && chamadas[1].meta.reconferencia === 'criatura_cena_inocente', 'F2d o still do Dino passa na 2ª conferência (a MESMA imagem vai de novo; o texto vai sem termo de idade)')
  const chamadasH = []
  const rH = await A.stillComFolha({ prompt: menino, imageUrls: ['f'], aspect: '9:16', fichas: elencoRavan.slice(0, 1), pollWindowMs: 1 }, { pedir, bytes: async () => null, moderar: async (t, i, m) => { chamadasH.push(t); const d = P.decideModeration(omni(t), t, { hasImage: true }); return d.block ? { ok: false, reason: 'blocked', decision: d } : { ok: true } } })
  ok(rH.url === null && rH.motivo === 'moderation_blocked' && chamadasH.length === 1, 'F2e o mesmo bloqueio numa cena com gente (o menino): barrado, sem 2ª conferência — a régua de gente não afrouxa')
  const rI = await A.stillComFolha({ prompt: textoDino, imageUrls: ['f'], aspect: '9:16', fichas: elencoDino, pollWindowMs: 1 }, { pedir, bytes: async () => null, moderar: async (t) => (/baby|child/.test(t) ? { ok: false, reason: 'blocked', decision: { reasons: ['sexual/minors'], sexualScore: 0.0004, sexualMinorsScore: 0.03 } } : { ok: false, reason: 'blocked', decision: { reasons: ['sexual'], sexualScore: 0.7, sexualMinorsScore: 0 } }) })
  const rU = await A.stillComFolha({ prompt: textoDino, imageUrls: ['f'], aspect: '9:16', fichas: elencoDino, pollWindowMs: 1 }, { pedir, bytes: async () => null, moderar: async () => ({ ok: false, reason: 'unavailable' }) })
  ok(rI.url === null && rI.motivo === 'moderation_blocked' && rI.reconferida === true && rU.url === null && rU.motivo === 'moderation_unavailable', 'F2f a 2ª conferência tem de passar INTEIRA (a imagem barrada por nota sexual continua barrada); moderação fora do ar = FLUX (falha fechada para o still)')
}

console.log('\nF3. figura conhecida: o Ravan é o rei-demônio de 10 cabeças')
{
  const antes = L.elencoDeterministico(RAVAN.script).find((e) => e.nome === 'Ravan')
  ok(antes && antes.tipo === 'humano' && /\bman\b.*hair/.test(antes.canonica) && /wearing/.test(antes.canonica), `F3a ANTES (o de 20/10): Ravan = "${antes?.canonica.slice(0, 70)}…" (homem comum com cabelo e roupa inventados)`)
  const ravan = elencoRavan.find((e) => e.nome === 'Ravan')
  ok(ravan && ravan.origem === 'mitica' && ravan.tipo === 'criatura' && /ten-headed demon king of Lanka from the Ramayana/.test(ravan.canonica) && /ten crowned heads/.test(ravan.canonica) && !/hoodie|jeans|t-shirt|jacket|early thirties|reddish/i.test(ravan.canonica), 'F3b DEPOIS: Ravan = a iconografia tradicional (10 cabeças coroadas, rei-demônio do Ramayana), origem "mitica", sem roupa moderna')
  const menino = elencoRavan[0]
  ok(menino.nucleo === 'boy' && menino.protagonista && menino.canonica === L.elencoDeterministico(RAVAN.script)[0].canonica, 'F3c o menino (que funcionou em 20/10) fica byte a byte o mesmo')
  const msgs = A.mensagensDoCastingAjuste(RAVAN.script, elencoRavan)
  ok(/known figure of mythology, religion, folklore or history/.test(msgs[0].content) && /never turn them into an ordinary modern person/.test(msgs[0].content) && /If you do not know who a named character is, return the draft unchanged/.test(msgs[0].content) && !msgs[1].content.includes('- Ravan (') && msgs[1].content.includes(menino.nome), 'F3d o casting: regra da identidade cultural no sistema; o Ravan (fixo) nem vai ao modelo')
  const resposta = JSON.stringify({ characters: [{ name: 'Ravan', description: 'a thirty-year-old man with short red hair, a grey hoodie and dark jeans, tired eyes, a stubble beard and white sneakers' }, { name: menino.nome, description: 'a thin nine-year-old Indian boy with short black hair, big brown eyes, a faded orange kurta and brown sandals, a small scar on his chin' }] })
  const lido = A.lerCastingAjuste(resposta, elencoRavan, RAVAN.script)
  ok(lido.find((e) => e.nome === 'Ravan').canonica === ravan.canonica && lido.find((e) => e.nome === menino.nome).origem === 'modelo', 'F3e resposta que faz do Ravan "homem ruivo de moletom": recusada (fica a iconografia); o menino é refinado normalmente')
  const fetchOk = async () => ({ ok: true, status: 200, json: async () => ({ choices: [{ message: { content: resposta } }] }) })
  const r = await A.elencoComCastingAjuste(RAVAN.script, elencoRavan, { fetchImpl: fetchOk, apiKey: 'k' })
  let chamou = false
  const soMitica = A.elencoDoRoteiro('Zeus thundered over Olympus. Zeus laughed at the storm. Zeus raised his bolt.')
  const rFixo = await A.elencoComCastingAjuste('Zeus thundered over Olympus. Zeus laughed at the storm.', soMitica, { fetchImpl: async () => { chamou = true; return fetchOk() }, apiKey: 'k' })
  ok(r.casting === 'modelo' && r.elenco.find((e) => e.nome === 'Ravan').origem === 'mitica' && soMitica[0]?.origem === 'mitica' && /king of the Greek gods/.test(soMitica[0].canonica) && rFixo.casting === 'fixo' && chamou === false, 'F3f a chamada real do casting (falsa): Ravan intocado; elenco só de figuras conhecidas nem chama o modelo ("fixo")')
  const desconhecido = A.elencoDoRoteiro('The demon Mahisha roared at the temple gates. Mahisha laughed at the gods. The goddess rode her lion.')
  const mahisha = desconhecido.find((e) => e.nome === 'Mahisha')
  ok(mahisha && mahisha.origem === 'mitica' && /^Mahisha, a demon, shown with the traditional appearance, costume and attributes that the demon Mahisha has in the myth or legend/.test(mahisha.canonica) && !/hair|wearing|eyes|years old/.test(mahisha.canonica), 'F3g nome mítico que a casa NÃO conhece ("the demon Mahisha"): a espécie que o roteiro diz fica, nada inventado ("como a lenda o mostra", sem cor/cabelo/rosto/roupa)')
  const comum = 'Benny opened his bakery at dawn. Benny smiled at the first customer.'
  ok(JSON.stringify(A.elencoDoRoteiro(comum)) === JSON.stringify(L.elencoDeterministico(comum)) && JSON.stringify(A.elencoDoRoteiro(DINO.script)) === JSON.stringify(L.elencoDeterministico(DINO.script)), 'F3h nome comum (Benny) e o Dino: o elenco é byte a byte o de antes')
  { const C0 = carregador()(F.critico); const ent = { indice: 0, url: 'https://f/s.jpg', mostra: 'Ravan', fala: 'Ravan laughed.', prompt: 'p', seed: 1 }; const com = C0.montarPedidoAoCritico({ ...ent, referencia: { url: 'https://f/folha.jpg', descricao: 'Ravan, ten heads' } }, ent.url).messages[0].content; const sem = C0.montarPedidoAoCritico(ent, ent.url).messages[0].content // integração 21/10 (ideia da versão Codex)
    ok(/ten heads, is its identity and is not an anatomy defect/.test(com) && sem === C0.STILL_CRITIC_SISTEMA && !/anatomy defect/.test(sem), 'F3i o crítico com folha sabe que as 10 cabeças do Ravan são identidade, não defeito de anatomia (sem folha, o sistema de sempre)') }
}

console.log('\nF4. o menino da moto: o elenco casa pela FALA')
{
  ok(elencoMoto.length === 1 && elencoMoto[0].nucleo === 'boy' && elencoMoto[0].genero === 'man', 'F4a o roteiro tem o menino ("A boy rode his bike")')
  const antes = L.cenasComPersonagem(MOTO.visuals, elencoMoto)
  ok(nomes(antes) === '[[],[],[]]', 'F4b ANTES (o de 20/10): procurado só no visual do GPT ("young man on motorcycle"), o menino não está em cena nenhuma — a folha não entrou')
  const depois = A.cenasDoElenco(MOTO.visuals, MOTO.falas, elencoMoto)
  ok(nomes(depois) === JSON.stringify([['the boy'], ['the boy'], []]) && depois[0].pelaFala.join() === 'the boy' && depois[1].pelaFala.join() === 'the boy', 'F4c DEPOIS: cena 1 ("A boy" + o rapaz da moto) e cena 2 ("His bike stopped" + a figura na moto) = o menino; cena 3 ("no one in sight") = ninguém')
  const look = S.deriveStyleAnchor(MOTO.script)
  const pol = { mode: 'character_story', style: look, character: L.fichaDoProtagonista(elencoMoto), elenco: L.elencoSecundario(elencoMoto), aspect: '9:16' }
  const prompts = MOTO.visuals.map((v, i) => V.buildClassicVisualPrompt(v, { ...pol, opening: i === 0 }))
  ok(prompts.every((p) => !p.includes(elencoMoto[0].canonica)), 'F4d ANTES no construtor REAL de cena: nenhum prompt diz quem é o menino (o visual fala de "young man")')
  const aj = A.ajustarPromptsDoElenco({ prompts, visuals: MOTO.visuals, falas: MOTO.falas, elenco: elencoMoto })
  ok(aj.prompts[0].endsWith(`The same main character appears in this scene, consistent design: ${elencoMoto[0].canonica}.`) && aj.prompts[1].includes(elencoMoto[0].canonica) && JSON.stringify(aj.comFicha) === '[1,2]' && aj.prompts[0].startsWith(prompts[0].trimEnd()), 'F4e DEPOIS: a ficha do menino entra no prompt das cenas 1 e 2 (o resto do prompt fica igual)')
  ok(nomes(A.cenasDoElenco(DINO.visuals, DINO.falas, elencoDino)) === JSON.stringify([[], ['Dino'], ['Dino']]) && nomes(A.cenasDoElenco(RAVAN.visuals, RAVAN.falas, elencoRavan)) === nomes(L.cenasComPersonagem(RAVAN.visuals, elencoRavan)), 'F4f Dino e Ravan (que funcionaram): as mesmas cenas de 20/10 (a floresta do Dino não ganha o Dino só porque a fala o cita)')
  const bib = A.elencoDoRoteiro(BIBLIOTECA.script)
  ok(nomes(A.cenasDoElenco(BIBLIOTECA.visuals, BIBLIOTECA.falas, bib)) === '[[],["the young man"],[]]', 'F4g a irmã ("his missing sister" + "a young woman" no visual) NÃO vira o rapaz: gênero do visual que contradiz não casa')
  ok(nomes(A.cenasDoElenco(['A girl rides her bike at night.', 'Close-up of her hands on the handlebars.'], ['A girl rode her bike home.', 'Her bike stopped.'], A.elencoDoRoteiro('A girl rode her bike home. Her bike stopped.'))) === JSON.stringify([['the girl'], ['the girl']]), 'F4h "a girl" + "her": a menina, pelo papel e pelo pronome (mãos dela no visual)')
}

console.log('\nF6. cena sem personagem citado não recebe pessoa nenhuma (a cena 1 do Dino)')
{
  const look = S.deriveStyleAnchor(DINO.script)
  const pol = { mode: 'character_story', style: look, character: L.fichaDoProtagonista(elencoDino), elenco: L.elencoSecundario(elencoDino), aspect: '9:16' }
  const prompts = DINO.visuals.map((v, i) => V.buildClassicVisualPrompt(v, { ...pol, opening: i === 0 }))
  ok(prompts[0].includes(A.CLAUSULA_PERFORMANCE) && !/No people/.test(prompts[0]), 'F6a ANTES no construtor REAL: a floresta (ninguém citado) leva ", characters act naturally within the scene…" e nada que proíba gente — o homem adulto de 20/10')
  const aj = A.ajustarPromptsDoElenco({ prompts, visuals: DINO.visuals, falas: DINO.falas, elenco: elencoDino })
  ok(!aj.prompts[0].includes(A.CLAUSULA_PERFORMANCE) && aj.prompts[0].endsWith(A.CLAUSULA_SEM_GENTE) && aj.prompts[0].includes('rustling leaves') && JSON.stringify(aj.semGente) === '[1]', 'F6b DEPOIS: a cena 1 perde a cláusula de "characters" e ganha "No people, no human figures and no faces anywhere in this shot."')
  ok(aj.prompts[1] === prompts[1] && aj.prompts[2] === prompts[2] && JSON.stringify(aj.comFicha) === '[]', 'F6c as cenas do Dino (que já levavam a ficha) ficam byte a byte as de antes')
  const multidao = A.ajustarPromptsDoElenco({ prompts: ['A crowd of villagers cheers in the square, characters act naturally within the scene without addressing the viewer.'], visuals: ['A crowd of villagers cheers in the square.'], falas: ['Everyone cheered.'], elenco: elencoDino })
  ok(multidao.prompts[0].includes('villagers') && !multidao.prompts[0].includes('No people') && multidao.semGente.length === 0, 'F6d cena sem o personagem MAS com gente própria no visual (multidão): intocada')
}

console.log('\nF5 + R. a refação e a rota (o bloco REAL de hoje × o desfeito, executados)')
const rota = rd(F.rota)
const rotaAntiga = lf(semMeta95PersonagemAjuste2010(rota, F.rota))
const LINHA_CENAS = (src) => src.split('\n').filter((l) => /^\s*(?:const personagemCenas = |if \(personagemCenas\) \{)/.test(l)).join('\n')
function montaBloco(src, nomesExtra = []) {
  const linhas = src.split('\n')
  const ini = linhas.findIndex((l) => l.includes('// >>> KINEO-META95-PERSONAGEM-2010 bloco'))
  const fim = linhas.findIndex((l) => l.includes('// <<< KINEO-META95-PERSONAGEM-2010 bloco'))
  const corpo = linhas.slice(ini + 1, fim).join('\n')
  const nomesCtx = ['personagem', 'anchorActive', 'estrelaAtiva', 'personagemElenco', 'scenes', 'classicScenePrompts', 'wantsKling', 'wantsVeo', 'styleAnchor', 'generationSeed', 'aspectRequested', 'user', 'generationId', 'sceneStills', 'providerSubmissionMayExist', 'generateCinematicSceneStill', 'gerarStillDaEstrela', 'writeServerEvent', 'console', 'cenasComPersonagem', 'promptDaFolha', 'promptDoStillComFolha', 'relatoDoPersonagem', 'PERSONAGEM_MAX_STILLS', 'PERSONAGEM_EVENTO', 'novoFilmeDoCritico', 'modoDoCriticoDoStill', 'criticarStill', 'STILL_CRITIC_EVENTO', ...nomesExtra]
  const fonte = `export async function bloco(ctx: any) {\n  let { ${nomesCtx.join(', ')} } = ctx\n  let personagemRelatoFinal: any = null\n${corpo}\n  return { sceneStills, personagemRelatoFinal, providerSubmissionMayExist }\n}\n`
  const js = ts.transpileModule(fonte, { fileName: 'bloco.ts', compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText
  const mod = { exports: {} }
  new Function('module', 'exports', 'require', js)(mod, mod.exports, () => { throw new Error('o bloco não importa') })
  return mod.exports.bloco
}
const NOMES_NOVOS = ['gerarStillComFolha', 'promptDoStillComFolhaAjuste', 'cenasDoElenco', 'relatoDoAjuste', 'personagemCenas', 'PERSONAGEM_CRITICO_TETO_CENA_MS', 'PERSONAGEM_REGERACAO_JANELA_MS', 'PERSONAGEM_REGERACAO_MIN_MS', 'PERSONAGEM_CRITICO_PRAZO_MS']
/** O edit falso com a LATÊNCIA do nano-banana-pro/edit (~15 s): janela menor que isso = provider_timeout (url null), como em 20/10. */
const LATENCIA_EDIT_MS = 15_000
function fakes(respostas = {}) {
  const folhas = []; const edits = []; const pedidos = []; const eventos = []
  let n = 0
  const editar = (a) => { edits.push(a); if (respostas.editFalha) return { url: null, motivo: 'provider_failed' }; if (a.pollWindowMs < LATENCIA_EDIT_MS) return { url: null, motivo: 'provider_timeout' }; n++; return { url: `https://f/edit-${n}.jpg`, motivo: 'ok' } }
  return {
    folhas, edits, pedidos, eventos,
    generateCinematicSceneStill: async (a) => { folhas.push(a); return respostas.folhaFalha ? null : `https://f/folha-${folhas.length}.jpg` },
    gerarStillDaEstrela: async (a) => editar(a),
    gerarStillComFolha: async (a) => { const r = editar(a); if (r.url && respostas.formatoErrado?.includes(r.url)) return { url: null, motivo: 'formato_errado', razao: 1, reconferida: false }; return { ...r, razao: r.url ? 0.5581 : null, reconferida: Boolean(r.url && respostas.reconferida?.includes(r.url)) } },
    fetch: async (_u, init) => {
      const corpo = JSON.parse(init.body)
      const imgs = corpo.messages[1].content.filter((p) => p.type === 'image_url').map((p) => p.image_url.url)
      pedidos.push({ imgs })
      const r = respostas[imgs[imgs.length - 1]] ?? { verdict: 'PASS', issues: [], reason: '', score: 85 }
      return { ok: true, status: 200, json: async () => ({ choices: [{ message: { content: JSON.stringify(r) } }], usage: { prompt_tokens: 6000, completion_tokens: 40 } }) }
    },
    writeServerEvent: async (ev) => { eventos.push(ev); return true },
    console: { log() {}, warn() {}, error() {} },
  }
}
async function rodaBloco(opcoes = {}) {
  const f = fakes(opcoes.respostas)
  const over = opcoes.over ?? {}
  const carrega = carregador(over, { fetch: f.fetch })
  const folha = carrega(F.folha)
  const aj = carrega(F.aj)
  const critico = opcoes.criticoAntigo ? carregador({ [F.critico]: lf(semMeta95PersonagemAjuste2010(rd(F.critico), F.critico)) }, { fetch: f.fetch })(F.critico) : carrega(F.critico)
  process.env.OPENAI_API_KEY = 'chave-falsa'
  delete process.env.STILL_CRITIC_MODE
  const caso = opcoes.caso ?? DINO
  const elenco = aj.elencoDoRoteiro(caso.script)
  const scenes = caso.visuals.map((v, i) => ({ aiPrompt: v, description: v, voiceover: caso.falas[i] ?? '' }))
  const sceneStills = scenes.map((_, i) => `https://f/flux-${i + 1}.jpg`)
  const prompts = scenes.map((s, i) => `${s.aiPrompt} Shot ${i + 1}.`)
  const personagemCenas = opcoes.antigo ? undefined : opcoes.ativo === false ? null : aj.ajustarPromptsDoElenco({ prompts, visuals: caso.visuals, falas: caso.falas, elenco })
  const ctx = {
    ...folha, ...aj, ...critico, ...f,
    personagem: { ativo: opcoes.ativo ?? true, motivo: 'pedido_interno' }, anchorActive: true, estrelaAtiva: false,
    personagemElenco: { elenco, casting: 'modelo', ms: 1 }, scenes, classicScenePrompts: personagemCenas ? personagemCenas.prompts : prompts, wantsKling: false, wantsVeo: false,
    styleAnchor: { lookPhrase: 'photorealistic, ultra-detailed' }, generationSeed: 63444935, aspectRequested: '9:16', user: { id: 'u-1' }, generationId: 'gen-1', sceneStills: sceneStills.slice(), providerSubmissionMayExist: false, personagemCenas,
  }
  const src = over[F.rota] ?? (opcoes.antigo ? rotaAntiga : rota)
  let res
  try { res = await montaBloco(src, opcoes.antigo ? [] : NOMES_NOVOS)(ctx) } catch (e) { res = { erro: e.message } }
  return { ...f, res, antes: sceneStills }
}
{
  // a refação reprovada por IDENTITY, com o edit de ~15 s — o bloco de 20/10 (desfeito) e o de hoje
  const FAIL2 = { 'https://f/edit-1.jpg': { verdict: 'FAIL', issues: ['identity'], reason: 'a human boy, not a dinosaur', score: 20 } }
  const velho = await rodaBloco({ antigo: true, criticoAntigo: true, respostas: FAIL2 })
  const critVelho = velho.res.erro ? null : velho.eventos.find((e) => e.name === 'cinematic_still_critic' && e.metadata.cena === 2)?.metadata
  ok(critVelho && critVelho.regerou === true && critVelho.regeracao_ok === false && velho.edits[2]?.pollWindowMs <= 9_000 && critVelho.regeracao_motivo === undefined && velho.res.sceneStills[1] === 'https://f/edit-1.jpg', `F5a ANTES (bloco e crítico de 20/10): a foto nova foi pedida com janela de ${velho.edits[2]?.pollWindowMs} ms (a do FLUX, 9 s) a um edit de ~15 s → regeracao_ok=false, sem motivo no evento — reproduzido ${velho.res.erro ?? ''}`)
  const novo = await rodaBloco({ respostas: FAIL2 })
  const critNovo = novo.res.erro ? null : novo.eventos.find((e) => e.name === 'cinematic_still_critic' && e.metadata.cena === 2)?.metadata
  ok(critNovo && critNovo.regerou === true && critNovo.regeracao_ok === true && critNovo.regeracao_motivo === 'ok' && novo.edits[2].pollWindowMs >= LATENCIA_EDIT_MS && novo.edits[2].pollWindowMs <= 40_000 && novo.res.sceneStills[1] === 'https://f/edit-3.jpg', `F5b DEPOIS: janela de ${novo.edits[2]?.pollWindowMs} ms (≤ 40 s) → a foto nova sai, é julgada e escolhida; o evento diz regeracao_motivo "ok" ${novo.res.erro ?? ''}`)
  const rel = novo.res.personagemRelatoFinal
  ok(rel && rel.ajuste === 'personagem_ajuste_v1' && JSON.stringify(rel.regeracoes) === JSON.stringify([{ cena: 2, ok: true, motivo: 'ok' }]) && novo.eventos.find((e) => e.name === 'cinematic_character_sheet')?.metadata.regeracoes?.[0]?.motivo === 'ok', 'F5c o relato da folha (cinematic_character_sheet) lista cada refação com ok e motivo')
  const falhaEdit = await rodaBloco({ respostas: { ...FAIL2, formatoErrado: ['https://f/edit-3.jpg'] } })
  const critFalha = falhaEdit.eventos.find((e) => e.name === 'cinematic_still_critic' && e.metadata.cena === 2)?.metadata
  ok(critFalha && critFalha.regeracao_ok === false && critFalha.regeracao_motivo === 'formato_errado' && falhaEdit.res.sceneStills[1] === 'https://f/edit-1.jpg', 'F5d foto nova recusada (fora do formato): o MOTIVO vai ao evento ("formato_errado") e a original segue')
  // o crítico SEM as opções novas: relato byte a byte o da lib da base (FLUX, hollywood, clássico)
  const CB = carregador({ [F.critico]: base(F.critico) })(F.critico)
  const C = carregador()(F.critico)
  const cenarios = [['PASS', null, async () => 'https://f/nova.jpg'], ['FAIL', 'sujeito', async () => 'https://f/nova.jpg'], ['FAIL', 'anatomia', async () => null], ['FAIL', 'texto', async () => { throw new Error('x') }]]
  const probs = []
  for (const [v, prob, gerar] of cenarios) {
    const fetchImpl = async () => ({ ok: true, status: 200, json: async () => ({ choices: [{ message: { content: JSON.stringify({ verdict: v, issues: prob ? [{ sujeito: 'subject', anatomia: 'anatomy', texto: 'text' }[prob]] : [], reason: 'r', score: v === 'PASS' ? 90 : 20 }) } }], usage: { prompt_tokens: 3000, completion_tokens: 30 } }) })
    const relogio = () => { let t = 1_000_000; return () => (t += 1) }
    const e = { indice: 0, url: 'https://f/o.jpg', mostra: 'm', fala: 'f', prompt: 'A subject. More.', seed: 9 }
    const a = await C.criticarStill(e, { filme: C.novoFilmeDoCritico('enforce'), gerarStill: gerar, fetchImpl, apiKey: 'k', agora: relogio() })
    const b = await CB.criticarStill(e, { filme: CB.novoFilmeDoCritico('enforce'), gerarStill: gerar, fetchImpl, apiKey: 'k', agora: relogio() })
    if (JSON.stringify(a) !== JSON.stringify(b)) probs.push(`${v}/${prob}`)
  }
  ok(base(F.critico) !== null && probs.length === 0, 'F5e o crítico sem as opções novas (o FLUX, o hollywood, o clássico): url e relato BYTE A BYTE os da lib da base em PASS, FAIL+foto nova, FAIL+falha e FAIL+exceção', probs.join(' | '))
  // a moto pelo bloco: as cenas pela fala ganham o still com folha; o formato errado volta ao FLUX
  const moto = await rodaBloco({ caso: MOTO, respostas: { formatoErrado: ['https://f/edit-2.jpg'] } })
  ok(!moto.res.erro && moto.edits.length === 2 && moto.edits.every((e) => e.prompt.includes('Character in this scene: the boy is') && /ONE vertical 9:16/.test(e.prompt) && e.imageUrls[0] === 'https://f/folha-1.jpg' && e.fichas?.[0]?.nome === 'the boy') && moto.res.sceneStills[0] === 'https://f/edit-1.jpg' && moto.res.sceneStills[1] === 'https://f/flux-2.jpg' && moto.res.personagemRelatoFinal.motivos_still.formato_errado === 1 && moto.res.personagemRelatoFinal.formato_recusado === 1 && JSON.stringify(moto.res.personagemRelatoFinal.cenas_pela_fala) === '[1,2]', `R1 LIGADO (moto): 1 folha, edit nas cenas 1 e 2 (pela fala), prompt com o formato; a cena 2 veio fora do formato → FLUX; o relato conta ${moto.res.erro ?? ''}`)
  const dino = await rodaBloco({ respostas: { reconferida: ['https://f/edit-1.jpg'] } })
  ok(!dino.res.erro && dino.edits.length === 2 && JSON.stringify(dino.res.sceneStills) === JSON.stringify(['https://f/flux-1.jpg', 'https://f/edit-1.jpg', 'https://f/edit-2.jpg']) && dino.res.personagemRelatoFinal.moderacao_reconferida === 1 && JSON.stringify(dino.res.personagemRelatoFinal.cenas_sem_gente) === '[1]' && dino.res.personagemRelatoFinal.cenas_com_personagem === 2, 'R2 LIGADO (Dino): as cenas 2 e 3 com folha, a cena 1 com o FLUX (sem gente); a reconferência entra no relato')
  const rav = await rodaBloco({ caso: RAVAN })
  ok(!rav.res.erro && rav.folhas.length === 2 && rav.folhas.some((f) => /ten crowned heads/.test(f.scenePrompt)) && rav.edits.some((e) => e.imageUrls.length === 2 && /The 2 reference images are separate character sheets/.test(e.prompt)) && JSON.stringify(rav.res.personagemRelatoFinal.miticas) === '["Ravan"]', 'R3 LIGADO (Ravan): a folha do Ravan é a do rei de 10 cabeças; a cena com os 2 pede "cada um uma vez, mesma cena, sem painéis"')
  const off = await rodaBloco({ ativo: false })
  ok(!off.res.erro && off.folhas.length === 0 && off.edits.length === 0 && off.pedidos.length === 0 && off.eventos.length === 0 && JSON.stringify(off.res.sceneStills) === JSON.stringify(off.antes) && off.res.personagemRelatoFinal === null, 'O1 DESLIGADO: o bloco de hoje não chama folha, edit nem crítico; sceneStills intactos; sem evento; sem relato')
  // as 2 linhas do ajuste de prompts (antes do FLUX), executadas com o interruptor desligado e ligado
  const linhas = LINHA_CENAS(rota)
  const fonte = `export function ajusta(ctx: any) {\n  let { personagem, estrelaFicha, classicVisualMode, personagemElenco, classicScenePrompts, scenes, ajustarPromptsDoElenco, generationId, console } = ctx\n${linhas}\n  return { classicScenePrompts, personagemCenas }\n}\n`
  const js = ts.transpileModule(fonte, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText
  const mod = { exports: {} }
  new Function('module', 'exports', 'require', js)(mod, mod.exports, () => { throw new Error('não importa') })
  const look = S.deriveStyleAnchor(DINO.script)
  const pol = { mode: 'character_story', style: look, character: L.fichaDoProtagonista(elencoDino), elenco: L.elencoSecundario(elencoDino), aspect: '9:16' }
  const promptsDino = DINO.visuals.map((v, i) => V.buildClassicVisualPrompt(v, { ...pol, opening: i === 0 }))
  const scenesDino = DINO.visuals.map((v, i) => ({ aiPrompt: v, voiceover: DINO.falas[i] }))
  const ctx = (o) => ({ personagem: { ativo: true }, estrelaFicha: null, classicVisualMode: 'character_story', personagemElenco: { elenco: elencoDino }, classicScenePrompts: promptsDino.slice(), scenes: scenesDino, ajustarPromptsDoElenco: A.ajustarPromptsDoElenco, generationId: 'g', console: { log() {} }, ...o })
  const casos = [['desligado', { personagem: { ativo: false } }], ['com a Estrela', { estrelaFicha: 'x' }], ['faceless', { classicVisualMode: 'documentary_faceless' }], ['sem elenco', { personagemElenco: { elenco: [] } }]]
  const mudou = casos.filter(([, o]) => { const r = mod.exports.ajusta(ctx(o)); return r.personagemCenas !== null || JSON.stringify(r.classicScenePrompts) !== JSON.stringify(promptsDino) }).map(([n]) => n)
  const ligado = mod.exports.ajusta(ctx({}))
  ok(linhas.split('\n').length === 2 && mudou.length === 0, 'O2 o ajuste de prompts EXECUTADO: desligado, com a Estrela, faceless ou sem elenco → personagemCenas null e o vetor byte a byte', mudou.join(', '))
  ok(ligado.personagemCenas && ligado.classicScenePrompts[0].endsWith(A.CLAUSULA_SEM_GENTE) && ligado.classicScenePrompts[1] === promptsDino[1], 'O3 ligado: o mesmo vetor (que alimenta o still FLUX e o clipe) sai com a cena 1 sem gente e as cenas do Dino iguais')
  // forma das linhas marcadas da rota
  const linhasR = rota.split('\n')
  const ini = linhasR.findIndex((l) => l.includes('// >>> KINEO-META95-PERSONAGEM-2010 bloco'))
  const fim = linhasR.findIndex((l) => l.includes('// <<< KINEO-META95-PERSONAGEM-2010 bloco'))
  const OK_FORA = [/^import \{/, /^\s*\/\//, /^\s*const personagemElenco: .* = personagem\.ativo \? await elencoComCastingAjuste\(prompt, elencoDoRoteiro\(prompt\)\)/, /^\s*const personagemCenas = personagem\.ativo && !estrelaFicha && classicVisualMode === 'character_story' && personagemElenco\.elenco\.length > 0 \?/, /^\s*if \(personagemCenas\) \{/, /^\s*\.\.\.\(personagem\.ativo \? \{ personagem: ensaioDoPersonagemAjuste\(/]
  const soltas = linhasR.map((l, i) => [l, i]).filter(([l, i]) => l.includes(MARCA) && !(i > ini && i < fim) && !OK_FORA.some((re) => re.test(l))).map(([l]) => l.trim().slice(0, 90))
  ok(soltas.length === 0, 'O4 toda linha marcada da rota fora do bloco é import, comentário, a porta do casting/ensaio guardada por personagem.ativo ou o ajuste guardado por personagemCenas', soltas.join(' | '))
  ok(!/gerarStillComFolha\(/.test(rotaAntiga) && rota.split('\n').filter((l) => l.includes('gerarStillComFolha(')).every((l) => l.includes(MARCA) && rota.indexOf(l) > rota.indexOf('// >>> KINEO-META95-PERSONAGEM-2010 bloco')), 'O5 gerarStillComFolha só é chamado dentro do bloco da folha (a Estrela segue com gerarStillDaEstrela, intocada)')
  const srv = rd(F.servidor)
  ok(/submitFalQueueOnce\(ESTRELA_EDIT_SLUG, input\)/.test(srv) && (srv.match(/submitFalQueueOnce\(/g) ?? []).length === 1 && /surface: 'estrela', stage: 'output'/.test(srv) && /Range: `bytes=0-\$\{BYTES_DO_CABECALHO\}`/.test(srv) && /return \{ url: null, motivo: 'no_key'/.test(srv), 'O6 o servidor: UM POST por still (submitFalQueueOnce), a moderação de saída de sempre (estrela/output), só o cabeçalho do arquivo é lido; sem chave = nada')
  ok(rd(F.aj).includes('export const MARCA_PERSONAGEM_AJUSTE = \'KINEO-META95-PERSONAGEM-AJUSTE-2010\'') && carregador()(F.folha).PERSONAGEM_PUBLIC === false, 'O7 o interruptor público segue false (PERSONAGEM_PUBLIC): os consertos só rodam com a folha pedida por conta interna')
}

console.log('\nD. desfaz, encadeamento, diff e commits')
{
  const probs = []
  for (const f of META95_PERSONAGEM_AJUSTE_2010_ARQUIVOS) {
    const b = base(f)
    let d
    try { d = lf(semMeta95PersonagemAjuste2010(fs.readFileSync(path.join(ROOT, f), 'utf8'), f)) } catch (e) { d = [e.message] }
    if (b === null) probs.push(`${f}: sem base`)
    else if (Array.isArray(d)) probs.push(`${f}: ${d[0]}`)
    else if (d !== b) probs.push(`${f}: desfeito ≠ base`)
    const marcadas = rd(f).split('\n').filter((l) => l.includes(MARCA)).length
    const esperadas = (ACRESCIMOS_META95_PERSONAGEM_AJUSTE_2010[f] ?? 0) + (TROCAS_META95_PERSONAGEM_AJUSTE_2010[f]?.length ?? 0)
    if (marcadas !== esperadas) probs.push(`${f}: ${marcadas} linhas marcadas, tabela diz ${esperadas}`)
  }
  ok(probs.length === 0, `D1 desfeito o ajuste, cada arquivo tocado (${META95_PERSONAGEM_AJUSTE_2010_ARQUIVOS.length}) é EXATAMENTE a base ${BASE_CMP.slice(0, 10)}; contagem de marcas = tabela`, probs.join(' | '))
  ok(META95_PERSONAGEM_AJUSTE_2010_NOVOS.every((f) => fs.existsSync(path.join(ROOT, f)) && base(f) === null), 'D2 os arquivos novos existem e não existem na base')
  let lancou = false
  try { semMeta95PersonagemAjuste2010(`a\nx // ${MARCA}\nc`, F.rota) } catch { lancou = true }
  ok(semMeta95PersonagemAjuste2010('a\nb', F.rota) === 'a\nb' && semMeta95PersonagemAjuste2010(`a // ${MARCA}`, 'outro.ts') === `a // ${MARCA}` && lancou && !MARCA.includes('KINEO-META95-PERSONAGEM-2010'), 'D3 idempotente, só nos arquivos da lista, lança com a marca fora da contagem; a marca não contém a da folha')
  const viaFolha = semMeta95Personagem2010(rota, F.rota)
  ok(!viaFolha.includes(MARCA) && !viaFolha.includes('KINEO-META95-PERSONAGEM-2010') && viaFolha === semMeta95Personagem2010(semMeta95PersonagemAjuste2010(rota, F.rota), F.rota), 'D4 encadeado: semMeta95Personagem2010 (e toda cadeia que passa por ele) tira o ajuste primeiro')
  const I = await import(new URL('./test-support/desfaz-meta95-ideia-1910.mjs', import.meta.url).href)
  ok(!I.semMeta95Ideia1910(rota, F.rota).includes(MARCA), 'D5 pela cabeça da cadeia da rota (semMeta95Ideia1910), a rota desfeita não tem mais a marca')
  const marcados = (() => { try { return git('log', '--no-merges', '--format=%H', `--grep=${MARCA}`, 'HEAD').trim().split('\n').filter(Boolean) } catch { return [] } })()
  const tocados = [...new Set(marcados.flatMap((h) => git('diff-tree', '--no-commit-id', '--name-only', '-r', h).trim().split('\n').filter(Boolean)))]
  const permitidos = new Set([...META95_PERSONAGEM_AJUSTE_2010_ARQUIVOS, ...META95_PERSONAGEM_AJUSTE_2010_NOVOS])
  ok(marcados.length === 0 || tocados.every((f) => permitidos.has(f)), `D6 os commits do ajuste só tocam a lista + os novos (${tocados.filter((f) => !permitidos.has(f)).join(', ') || 'ok'})`)
  const desdeABase = (() => { try { return git('log', '--format=%H%x09%s', `${BASE_CMP}..HEAD`).trim().split('\n').filter(Boolean).map((l) => { const [h, ...s] = l.split('\t'); return { h, s: s.join('\t') } }) } catch { return [] } })()
  const daEntrega = desdeABase.filter(({ h, s }) => s.includes(MARCA) || git('diff-tree', '--no-commit-id', '--name-only', '-r', '-m', h).trim().split('\n').some((f) => META95_PERSONAGEM_AJUSTE_2010_NOVOS.includes(f)))
  ok(daEntrega.every(({ s }) => s.startsWith(`${MARCA} ${SELO}`)), `D7 todo commit do ajuste começa por "${MARCA} ${SELO}" (${daEntrega.length} commit(s) desde ${BASE_CMP.slice(0, 10)})`, daEntrega.filter(({ s }) => !s.startsWith(`${MARCA} ${SELO}`)).map(({ s }) => s.slice(0, 60)).join(' | '))
  ok(fs.existsSync(path.join(ROOT, 'docs/META95-PERSONAGEM-AJUSTE-2026-10-20.md')) && /formatFlags/.test(rd('docs/META95-PERSONAGEM-AJUSTE-2026-10-20.md')), 'D8 o desenho e os 6 consertos estão em docs/META95-PERSONAGEM-AJUSTE-2026-10-20.md')
}

console.log('\nM. mutantes (cada um APLICADO e VERMELHO)')
const ajAtual = rd(F.aj)
const criticoAtual = rd(F.critico)
const troca = (txt, de, para) => (txt.includes(de) ? txt.split(de).join(para) : null)
let mut = {}
const A2 = () => carregador(mut)(F.aj)
const MUTANTES = [
  ['M1 o still não diz o formato', F.aj, troca(ajAtual, "return `${promptDoStillComFolha(cena, fichas)}\\n${formato}${quadro}`", 'return `${promptDoStillComFolha(cena, fichas)}\\n${quadro}`'), async () => /ONE vertical 9:16/.test(A2().promptDoStillComFolhaAjuste('X.', elencoDino, '9:16'))],
  ['M2 duas folhas sem a proibição de painéis', F.aj, troca(ajAtual, "never place them in separate panels or frames, no side-by-side images, no diptych, no grid, no split screen, no collage.", 'together.'), async () => /never place them in separate panels/.test(A2().promptDoStillComFolhaAjuste('Y.', elencoRavan, '9:16'))],
  ['M3 qualquer formato passa', F.aj, troca(ajAtual, 'const ok = Math.abs(razao - alvo) / alvo <= FORMATO_TOLERANCIA', 'const ok = razao > 0'), async () => A2().stillNoFormato({ largura: 1024, altura: 1024 }, '9:16').ok === false],
  ['M4 sem dimensão conferida passa', F.aj, troca(ajAtual, "if (!dim || !(dim.largura > 0) || !(dim.altura > 0)) return { ok: false, motivo: 'formato_nao_conferido', razao: null }", "if (!dim || !(dim.largura > 0) || !(dim.altura > 0)) return { ok: true, motivo: 'ok', razao: null }"), async () => A2().stillNoFormato(null, '9:16').ok === false],
  ['M5 gente também é reconferida', F.aj, troca(ajAtual, "if (args.fichas.length === 0 || !args.fichas.every((f) => f.tipo === 'criatura' || f.tipo === 'animal')) return nao('tem_humano')", ''), async () => A2().podeReconferirModeracao({ decisao: { reasons: ['sexual/minors'], sexualScore: 0.0004, sexualMinorsScore: 0.03 }, fichas: elencoRavan.slice(0, 1), texto: 'Opening shot: the kid in a green dinosaur costume at night.' }).reconferir === false],
  ['M6 bloqueio sexual também é reconferido', F.aj, troca(ajAtual, "if (!d.reasons.every((r) => r === 'sexual/minors')) return nao('bloqueio_sexual')", ''), async () => A2().podeReconferirModeracao({ decisao: { reasons: ['sexual/minors', 'sexual'], sexualScore: 0.001, sexualMinorsScore: 0.03 }, fichas: elencoDino, texto: 'a baby dinosaur in the forest' }).reconferir === false],
  ['M7 a 2ª conferência não é obrigatória', F.aj, troca(ajAtual, "    if (segunda.ok) return { url: pedido.url, motivo: 'ok', razao: formato.razao, reconferida: true }\n", "    return { url: pedido.url, motivo: 'ok', razao: formato.razao, reconferida: true }\n"), async () => (await A2().stillComFolha({ prompt: 'a baby dinosaur child in the forest', imageUrls: ['f'], aspect: '9:16', fichas: elencoDino, pollWindowMs: 1 }, { pedir: async () => ({ url: 'u', motivo: 'ok', largura: 768, altura: 1376 }), bytes: async () => null, moderar: async () => ({ ok: false, reason: 'blocked', decision: { reasons: ['sexual/minors'], sexualScore: 0.0004, sexualMinorsScore: 0.03 } }) })).url === null],
  ['M8 o Ravan sai da tabela de figuras', F.aj, troca(ajAtual, "nomes: ['ravan', 'ravana', 'raavan', 'raavana', 'rawan', 'ravanan']", "nomes: ['ravana_x']"), async () => /ten-headed/.test(A2().elencoDoRoteiro(RAVAN.script).find((e) => e.nome === 'Ravan')?.canonica ?? '')],
  ['M9 o casting troca a figura mítica', F.aj, troca(ajAtual, "    if ((antes.origem as OrigemDaFicha) === 'mitica') return { ...antes }\n", ''), async () => { const el = A2().elencoDoRoteiro('The demon Mahisha roared at the temple gates. Mahisha laughed at the gods.'); return A2().lerCastingAjuste(JSON.stringify({ characters: [{ name: 'Mahisha', description: 'a towering buffalo demon with huge curved horns, dark blue-black skin, glowing red eyes, a golden crown and a heavy bronze armour, holding a great iron club' }] }), el, 'The demon Mahisha roared.')[0].origem === 'mitica' }],
  ['M10 a fala não conta (só o visual)', F.aj, troca(ajAtual, '    const daFala = quemNaFala(falas[indice] ?? \'\', elenco, anteriorFala)\n', '    const daFala: string[] = []\n'), async () => nomes(A2().cenasDoElenco(MOTO.visuals, MOTO.falas, elencoMoto)) === JSON.stringify([['the boy'], ['the boy'], []])],
  ['M11 a fala vale mesmo sem ninguém no visual', F.aj, troca(ajAtual, '    const extra = visualMostraAlguem(v)\n', '    const extra = true\n'), async () => nomes(A2().cenasDoElenco(DINO.visuals, DINO.falas, elencoDino)) === JSON.stringify([[], ['Dino'], ['Dino']])],
  ['M12 gênero contraditório casa', F.aj, troca(ajAtual, '&& !generoContradiz(v, elenco.find((e) => e.nome === n) as FichaDePersonagem))', ')'), async () => nomes(A2().cenasDoElenco(BIBLIOTECA.visuals, BIBLIOTECA.falas, A2().elencoDoRoteiro(BIBLIOTECA.script))) === '[[],["the young man"],[]]'],
  ['M13 a cena sem gente fica com "characters act"', F.aj, troca(ajAtual, '    out = out.split(CLAUSULA_PERFORMANCE).join(\'\')\n', ''), async () => !A2().ajustarPromptsDoElenco({ prompts: ['x, characters act naturally within the scene without addressing the viewer, y'], visuals: [DINO.visuals[0]], falas: [DINO.falas[0]], elenco: elencoDino }).prompts[0].includes('characters act')],
  ['M14 a rota: janela da refação volta à do FLUX', F.rota, troca(rota, 'filme: criticoP, tetoCenaMs: PERSONAGEM_CRITICO_TETO_CENA_MS, janelaRegeracaoMs: PERSONAGEM_REGERACAO_JANELA_MS, minRegeracaoMs: PERSONAGEM_REGERACAO_MIN_MS, relatarMotivo: true,', 'filme: criticoP, relatarMotivo: true,'), async (over) => { const r = await rodaBloco({ over, respostas: { 'https://f/edit-1.jpg': { verdict: 'FAIL', issues: ['identity'], score: 20 } } }); return r.eventos.find((e) => e.name === 'cinematic_still_critic' && e.metadata.cena === 2)?.metadata.regeracao_ok === true }],
  ['M15 o crítico perde o motivo', F.critico, troca(criticoAtual, "      if (d.relatarMotivo) r.regeracao_motivo = saida && typeof saida === 'object' && typeof saida.motivo === 'string' && saida.motivo ? saida.motivo.slice(0, 60) : urlNova ? 'ok' : 'sem_url'", "      void saida"), async (over) => { const r = await rodaBloco({ over, respostas: { 'https://f/edit-1.jpg': { verdict: 'FAIL', issues: ['identity'], score: 20 }, formatoErrado: ['https://f/edit-3.jpg'] } }); return r.eventos.find((e) => e.name === 'cinematic_still_critic' && e.metadata.cena === 2)?.metadata.regeracao_motivo === 'formato_errado' }],
  ['M16 a rota: o bloco volta a só olhar o visual', F.rota, troca(rota, "const cenasP = (personagemCenas?.cenas ?? cenasDoElenco(visuaisP, scenes.map((s) => s.voiceover ?? ''), elencoP))", 'const cenasP = (cenasComPersonagem(visuaisP, elencoP))'), async (over) => { const r = await rodaBloco({ over, caso: MOTO }); return r.edits.length === 2 }],
  ['M17 a rota: o still volta ao prompt sem formato', F.rota, troca(rota, 'const r = await gerarStillComFolha({ prompt: promptDoStillComFolhaAjuste(classicScenePrompts[c.indice], fichasDaCena(c), aspectRequested),', 'const r = await gerarStillComFolha({ prompt: promptDoStillComFolha(classicScenePrompts[c.indice], fichasDaCena(c)),'), async (over) => { const r = await rodaBloco({ over }); return r.edits.length > 0 && r.edits.every((e) => /ONE vertical 9:16/.test(e.prompt)) }],
  ['M18 a rota: o ajuste de prompts roda desligado', F.rota, troca(rota, "const personagemCenas = personagem.ativo && !estrelaFicha && classicVisualMode === 'character_story'", "const personagemCenas = !estrelaFicha && classicVisualMode === 'character_story'"), async (over) => /^\s*const personagemCenas = personagem\.ativo && !estrelaFicha/m.test(over[F.rota])],
  ['M19 o desfaz: uma linha marcada a mais', F.rota, rota.replace('    // <<< KINEO-META95-PERSONAGEM-2010 bloco', `    // <<< KINEO-META95-PERSONAGEM-2010 bloco\n    const x = 1 // ${MARCA}`), async (over) => { try { return lf(semMeta95PersonagemAjuste2010(over[F.rota], F.rota)) === base(F.rota) } catch { return false } }],
  ['M20 o "lower third clear for captions" volta ao edit', F.aj, troca(ajAtual, ".replace(/\\bthe lower third clear for captions\\b/gi, 'continuous scenery down to the bottom edge')", ''), async () => !/lower third clear/.test(A2().promptDoStillComFolhaAjuste('x with the lower third clear for captions', elencoDino, '9:16'))],
  ['M21 o crítico volta a ver as 10 cabeças como anatomia', F.critico, troca(criticoAtual, ' Deliberate anatomy of a creature or mythical figure shown in the reference, such as the demon king Ravan with ten heads, is its identity and is not an anatomy defect.', ''), async (over) => /not an anatomy defect/.test(carregador(over)(F.critico).STILL_CRITIC_IDENTIDADE)],
]
let vermelhos = 0
for (const [nome, arq, txt, prova] of MUTANTES) {
  if (txt === null) { fail++; console.log(`  FALHA mutante ${nome}: âncora não encontrada`); continue }
  const original = arq === F.aj ? ajAtual : arq === F.critico ? criticoAtual : rota
  if (txt === original) { fail++; console.log(`  FALHA mutante ${nome}: não aplicou`); continue }
  mut = { [arq]: txt }
  let verde
  try { verde = await prova(mut) } catch (e) { verde = `lançou: ${e.message}` }
  mut = {}
  if (verde === false) { vermelhos++; pass++; console.log(`  ok   mutante ${nome}: aplicou e ficou vermelho`) } else { fail++; console.log(`  FALHA mutante ${nome}: continuou verde (${verde})`) }
}
console.log(`\n${pass} ok · ${fail} falha(s) · ${vermelhos}/${MUTANTES.length} mutantes vermelhos · base ${BASE_CMP.slice(0, 10)}`)
process.exit(fail === 0 ? 0 : 1)
