// ═══ KINEO-META95-PERSONAGEM-AJUSTE-2010 [TRAVA 8.2 — vai do fundador 19/10 "Vai pra meta do 95"] — os 6 consertos da FOLHA DE PERSONAGEM ═══
//
// A folha (lib/cinematic/folhaDePersonagem.ts, KINEO-META95-PERSONAGEM-2010) foi testada em produção em 20/10 com 3 filmes reais:
// funcionou onde entrou (o Dino continuou dinossauro em toda cena; o menino do Ravan ficou o mesmo), mas mostrou 6 defeitos.
// Este módulo é PURO (sem rede) e só roda com a folha ligada (conta interna + formatFlags ["personagem"]; PERSONAGEM_PUBLIC=false):
//   1. FORMATO — o still do nano-banana-pro/edit saiu fora de 9:16 (faixa azul lisa embaixo do vídeo) e, com 2 folhas, virou
//      colagem de 2 painéis. Agora: o prompt diz o formato do filme por extenso e proíbe painel/colagem/split-screen; as dimensões
//      do still devolvido são conferidas (cabeçalho PNG/JPEG/WebP/GIF ou o width/height da fal) e fora do formato = o FLUX de hoje.
//   2. MODERAÇÃO — a régua de saída barrou como "sexual/minors" uma cena inocente de desenho (dinossauro criança no quarto): a
//      categoria sexual/minors do omni-moderation é SÓ de texto e dispara a 0,02 com termo de idade. Agora, SÓ quando todo
//      personagem da cena é criatura/animal, o bloqueio veio SÓ de sexual/minors (sem 'sexual', sem 'minor_term'), a nota sexual
//      é de cena inocente (< 0,01), a de menor é fraca (< 0,5) e o texto não tem termo sexual: confere de novo com o texto SEM os
//      termos de idade e a MESMA imagem. Tem de passar inteiro (imagem incluída). Gente (humano) nunca entra nesta exceção.
//   3. FIGURA CONHECIDA — o Ravan (rei-demônio de 10 cabeças) virou "homem de 30 anos ruivo de moletom". Agora: nome de figura
//      mítica/religiosa/lendária conhecida ganha a iconografia tradicional (tabela FIGURAS_CONHECIDAS, origem 'mitica', o casting
//      não troca); nome desconhecido em contexto mítico (demon/god/legend/effigy…) não ganha descrição inventada; o casting é
//      instruído a preservar a identidade cultural e recusa roupa moderna para figura mítica.
//   4. FALA — o menino da moto não ganhou folha porque o elenco era procurado só no visual escrito pelo GPT ("young man on
//      motorcycle") e não na FALA ("A boy… His bike"). Agora: a cena cujo visual MOSTRA alguém (pessoa, criatura, rosto, mãos,
//      "rider"…) e cuja fala cita o personagem (nome, papel "a boy/the girl", ou pronome he/his/she/her que continua a fala
//      anterior) recebe o personagem — e o prompt dela ganha a ficha. Gênero do visual que contradiz o personagem não casa.
//   5. REFAÇÃO — ver lib/cinematic/criticoStill.ts (janela/teto por filme + motivo no relato) e a rota.
//   6. CENA SEM PERSONAGEM — no character_story a cena 1 do Dino (floresta, ninguém citado) ganhou um homem adulto: o construtor de
//      cena cola ", characters act naturally within the scene" em TODA cena. Agora a cena sem personagem cujo visual não mostra
//      ninguém perde essa cláusula e ganha "No people, no human figures and no faces anywhere in this shot."
// Guardião: scripts/test-meta95-personagem-ajuste-2010.mjs (executa este arquivo com os 3 roteiros reproduzidos à mão + mutantes).
import {
  elencoDeterministico, cenasComPersonagem, promptDoStillComFolha, mensagensDoCasting, lerCasting, ensaioDoPersonagem, custoDoPersonagemUsd, PERSONAGEM_MAX_STILLS,
  PERSONAGEM_CASTING_MODELO, PERSONAGEM_CASTING_PRAZO_MS, type FichaDePersonagem,
} from '@/lib/cinematic/folhaDePersonagem'
import type { StyleAnchor } from '@/lib/cinematic/sceneStyle'
import { mentionsMinor } from '@/lib/safety/moderationPolicy'

export const MARCA_PERSONAGEM_AJUSTE = 'KINEO-META95-PERSONAGEM-AJUSTE-2010'
export const PERSONAGEM_AJUSTE_VERSAO = 'personagem_ajuste_v1'

const limpa = (s: string) => String(s ?? '').replace(/\s+/g, ' ').trim()
const escapaRe = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
const palavra = (w: string) => new RegExp(`(?<![\\p{L}\\p{N}])${escapaRe(w)}(?![\\p{L}\\p{N}])`, 'iu')

// ═══ 3. FIGURAS CONHECIDAS (mito, religião, lenda) ═══════════════════════════════════════════════════════════════
/** Iconografia tradicional — o que qualquer pessoa da cultura reconhece. Só figuras de domínio público com aparência canônica. */
export const FIGURAS_CONHECIDAS: ReadonlyArray<{ nomes: readonly string[]; descricao: string; genero: 'man' | 'woman' }> = [
  { nomes: ['ravan', 'ravana', 'raavan', 'raavana', 'rawan', 'ravanan'], genero: 'man', descricao: 'the ten-headed demon king of Lanka from the Ramayana: a towering regal figure with ten crowned heads side by side, fierce wide eyes and thick curled black moustaches, many strong arms, a tall golden jewelled crown on the central head, ornate gold armour over a deep red and gold royal costume' },
  { nomes: ['kumbhakarna', 'kumbhkaran', 'kumbhakaran'], genero: 'man', descricao: 'the giant demon brother of Ravana from the Ramayana: an enormous sleepy giant with a huge round belly, wild dark hair, a wide tusked mouth, a golden crown and heavy gold armour' },
  { nomes: ['hanuman', 'hanumanji'], genero: 'man', descricao: 'the monkey god of the Ramayana: a strong muscular figure with a monkey face and a long tail, reddish-orange fur, a golden crown and jewellery, a red cloth around the waist, carrying a golden mace' },
  { nomes: ['ganesha', 'ganesh', 'ganpati', 'ganapati'], genero: 'man', descricao: 'the elephant-headed Hindu god: a round-bellied figure with an elephant head, one broken tusk and a curled trunk, four arms, a golden crown, red and gold silk garments, a small mouse at his feet' },
  { nomes: ['zeus'], genero: 'man', descricao: 'the king of the Greek gods: a powerful elder with long white hair and a full white beard, a white and gold draped Greek robe over one shoulder, a golden laurel wreath, holding a crackling lightning bolt' },
  { nomes: ['poseidon'], genero: 'man', descricao: 'the Greek god of the sea: a muscular elder with long wavy grey-blue hair and beard, a sea-green draped cloth, a golden crown, holding a golden trident' },
  { nomes: ['medusa'], genero: 'woman', descricao: 'the Gorgon of Greek myth: a woman with living green snakes instead of hair, pale green scaled skin, glowing yellow serpent eyes, an ancient Greek draped dress' },
  { nomes: ['anubis'], genero: 'man', descricao: 'the jackal-headed Egyptian god of the dead: a tall figure with a black jackal head and pointed ears, a gold and blue broad collar, a white linen kilt, holding a long staff' },
  { nomes: ['thor'], genero: 'man', descricao: 'the Norse god of thunder: a powerful man with long red hair and a braided red beard, a winged steel helmet, a red cloak over chain mail, holding a short-handled war hammer' },
]
/** Contexto que diz "isto é mito/lenda" perto do nome (para o nome que a tabela não conhece). */
const CONTEXTO_MITICO_RE = /\b(?:demons?|devils?|gods?|goddess(?:es)?|deity|deities|myths?|mythical|mythology|legends?|legendary|epic|effig(?:y|ies)|spirits?|asuras?|rakshasas?|titans?|ramayana|mahabharata|dussehra|dasara|olymp\w*)\b/i
/** A espécie mítica que o roteiro diz perto do nome ("the demon Mahisha"). */
const ESPECIE_MITICA_RE = /\b(demon|devil|god|goddess|deity|spirit|asura|rakshasa|titan|giant|dragon|serpent|monster|ghost|genie|angel|fairy|witch|wizard|troll|ogre)s?\b/i
/** Roupa moderna: a figura mítica nunca ganha isto do casting. */
const ROUPA_MODERNA_RE = /\b(?:hoodies?|sweatshirts?|sweaters?|jeans|t-shirts?|tee|sneakers|trainers|tracksuits?|baseball caps?|jackets?|blazers?|leggings|shorts|polo shirts?)\b/i

export type OrigemDaFicha = FichaDePersonagem['origem'] | 'mitica'

export function figuraConhecida(nome: string): (typeof FIGURAS_CONHECIDAS)[number] | null {
  const n = limpa(nome).toLowerCase().replace(/^the\s+/, '')
  return FIGURAS_CONHECIDAS.find((f) => f.nomes.includes(n)) ?? null
}

/** As frases do roteiro (sem tags) que citam o nome. */
function frasesDoNome(script: string, nome: string): string {
  const re = palavra(nome)
  return limpa(String(script ?? '').replace(/\[[^\]]*\]/g, ' ')).split(/(?<=[.!?…])\s+|\n+/).filter((f) => re.test(f)).join(' ')
}

/**
 * O elenco do ajuste: o determinístico de sempre (elencoDeterministico) e, por cima, a identidade das figuras conhecidas.
 * Nome da tabela → a iconografia tradicional (tipo 'criatura', origem 'mitica'); nome fora da tabela num contexto mítico →
 * "como a lenda o mostra", sem cabelo/rosto/roupa inventados. Ficha do autor ('autor') nunca é trocada.
 */
export function elencoDoRoteiro(script: string): FichaDePersonagem[] {
  return elencoDeterministico(script).map((f) => {
    if (f.origem === 'autor' || f.nome.toLowerCase().startsWith('the ')) return f
    const conhecida = figuraConhecida(f.nome)
    if (conhecida) return { ...f, tipo: 'criatura', canonica: `${f.nome}, ${conhecida.descricao}`, origem: 'mitica' as FichaDePersonagem['origem'], genero: conhecida.genero }
    const frases = frasesDoNome(script, f.nome)
    if (CONTEXTO_MITICO_RE.test(frases)) {
      // nome que a casa não conhece num contexto de mito: a espécie que o roteiro diz (demon, dragon…) fica; cor, rosto e roupa NÃO são inventados
      const especie = (ESPECIE_MITICA_RE.exec(frases)?.[1] ?? '').toLowerCase()
      const oQue = especie ? `the ${especie} ${f.nome}` : f.nome
      return { ...f, tipo: 'criatura', canonica: `${f.nome}, ${especie ? `a ${especie}, ` : ''}shown with the traditional appearance, costume and attributes that ${oQue} has in the myth or legend this story comes from, never as an ordinary modern person`, origem: 'mitica' as FichaDePersonagem['origem'] }
    }
    return f
  })
}

const REGRA_MITICA = ' If a character is a known figure of mythology, religion, folklore or history (for example Ravana, Hanuman, Zeus, Anubis), describe their TRADITIONAL, recognizable iconography from that culture (number of heads or arms, animal head, crown, weapons, period costume); never turn them into an ordinary modern person and never give them modern clothes. If you do not know who a named character is, return the draft unchanged.'

/** O pedido do casting: o de sempre + a regra da identidade cultural; ficha 'mitica' não vai ao modelo (fica fixa). */
export function mensagensDoCastingAjuste(script: string, elenco: ReadonlyArray<FichaDePersonagem>): Array<{ role: 'system' | 'user'; content: string }> {
  const [sistema, usuario] = mensagensDoCasting(script, elenco.filter((e) => (e.origem as OrigemDaFicha) !== 'mitica'))
  return [{ role: 'system', content: sistema.content + REGRA_MITICA }, usuario]
}

/** A leitura do casting: a de sempre; ficha 'mitica' fica; nome em contexto mítico com roupa moderna na resposta fica a de antes. */
export function lerCastingAjuste(raw: string, elenco: ReadonlyArray<FichaDePersonagem>, script: string = ''): FichaDePersonagem[] {
  const lido = lerCasting(raw, elenco)
  return lido.map((f, i) => {
    const antes = elenco[i]
    if ((antes.origem as OrigemDaFicha) === 'mitica') return { ...antes }
    if (f.origem === 'modelo' && ROUPA_MODERNA_RE.test(f.canonica) && CONTEXTO_MITICO_RE.test(frasesDoNome(script, antes.nome))) return { ...antes }
    return f
  })
}

/** O casting do ajuste (uma chamada, 6 s; falhou = o elenco do roteiro). Mesmo contrato de elencoComCasting. */
export async function elencoComCastingAjuste(script: string, elenco: ReadonlyArray<FichaDePersonagem>, opts?: { timeoutMs?: number; fetchImpl?: typeof fetch; apiKey?: string }): Promise<{ elenco: FichaDePersonagem[]; casting: 'modelo' | 'falhou' | 'sem_chave' | 'sem_elenco' | 'fixo'; ms: number }> {
  const t0 = Date.now()
  if (elenco.length === 0) return { elenco: [], casting: 'sem_elenco', ms: 0 }
  if (elenco.every((e) => (e.origem as OrigemDaFicha) === 'mitica' || e.origem === 'autor')) return { elenco: elenco.map((e) => ({ ...e })), casting: 'fixo', ms: 0 }
  const key = opts?.apiKey ?? (typeof process !== 'undefined' ? process.env.OPENAI_API_KEY : undefined)
  if (!key) return { elenco: elenco.map((e) => ({ ...e })), casting: 'sem_chave', ms: 0 }
  const ctrl = new AbortController()
  const timer = setTimeout(() => ctrl.abort(), opts?.timeoutMs ?? PERSONAGEM_CASTING_PRAZO_MS)
  try {
    const doFetch = opts?.fetchImpl ?? fetch
    const res = await doFetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      signal: ctrl.signal,
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${key}` },
      body: JSON.stringify({ model: PERSONAGEM_CASTING_MODELO, temperature: 0, max_tokens: 400, response_format: { type: 'json_object' }, messages: mensagensDoCastingAjuste(script, elenco) }),
    })
    if (!res.ok) return { elenco: elenco.map((e) => ({ ...e })), casting: 'falhou', ms: Date.now() - t0 }
    const data = (await res.json()) as { choices?: Array<{ message?: { content?: string } }> }
    const lido = lerCastingAjuste(data.choices?.[0]?.message?.content ?? '', elenco, script)
    return { elenco: lido, casting: lido.some((e) => e.origem === 'modelo') ? 'modelo' : 'falhou', ms: Date.now() - t0 }
  } catch {
    return { elenco: elenco.map((e) => ({ ...e })), casting: 'falhou', ms: Date.now() - t0 }
  } finally {
    clearTimeout(timer)
  }
}

// ═══ 4. QUEM ESTÁ NA CENA — o visual diz SE há alguém; a fala diz QUEM ═════════════════════════════════════════════
const GENTE = 'man|men|woman|women|boy|boys|girl|girls|kid|kids|child|children|person|people|persons|figure|figures|silhouette|someone|somebody|rider|biker|cyclist|motorcyclist|driver|teen|teenager|youth|guy|lady|stranger|hero|heroine|face|faces|hands?|eyes|shoulders?|feet|legs?|body|he|him|his|she|her|hers|they|riding|rides|rode|crowds?|villagers?|soldiers?|warriors?|family|families|audience|dancers?|workers?|monks?|priests?|citizens?|passengers?|students?|players?|fans?|tourists?|pilgrims?|guards?|knights?|kings?|queens?|princes?|princess|mother|father|sister|brother|grandmother|grandfather|baby|babies'
const BICHOS = 'dinosaur|dino|dragon|robot|unicorn|monster|ghost|demon|alien|fairy|creature|bunny|rabbit|bear|fox|mouse|puppy|dog|kitten|cat|owl|turtle|elephant|lion|tiger|wolf|deer|monkey|horse|pony|bird|frog|duck|penguin|panda|whale|dolphin'
const FIGURA_RE = new RegExp(`\\b(?:${GENTE}|${BICHOS})s?\\b`, 'i')
const SEM_GENTE_RE = /\b(?:no (?:people|person|humans?|human figures?|one|foreground human faces?)|without (?:people|humans?|anyone)|nobody|no one in sight|empty (?:scene|street|room|beach|landscape|city|path|road|forest)|unpopulated|deserted)\b/i
const FEM_VISUAL_RE = /\b(?:woman|women|girl|girls|lady|she|her|hers|herself|mother|sister|daughter|queen|princess|bride)\b/i
const MASC_VISUAL_RE = /\b(?:man|men|boy|boys|guy|he|him|his|himself|father|brother|son|king|prince|groom)\b/i

/** O visual mostra alguém (pessoa, criatura, parte do corpo, quem pilota)? A negação de gente vence. */
export function visualMostraAlguem(visual: string): boolean {
  const v = String(visual ?? '')
  return !SEM_GENTE_RE.test(v) && FIGURA_RE.test(v)
}

/** Quem a FALA cita: o nome, o papel ("a boy", "the boy") ou, por pronome, quem a fala anterior citou (gênero tem de bater). */
function quemNaFala(fala: string, elenco: ReadonlyArray<FichaDePersonagem>, anterior: readonly string[]): string[] {
  const f = String(fala ?? '')
  if (!f.trim()) return []
  const nomes = elenco.filter((e) => palavra(e.nome.replace(/^the\s+/i, '')).test(f) || (e.nucleo.toLowerCase() !== e.nome.toLowerCase() && palavra(e.nucleo).test(f))).map((e) => e.nome)
  if (nomes.length > 0) return nomes
  const ele = /\b(?:he|him|his|himself)\b/i.test(f)
  const ela = /\b(?:she|her|hers|herself)\b/i.test(f)
  return anterior.filter((n) => { const e = elenco.find((x) => x.nome === n); return !!e && ((ele && e.genero === 'man') || (ela && e.genero === 'woman') || ((ele || ela) && elenco.length === 1 && e.tipo !== 'humano')) })
}

/** O gênero que o VISUAL dá à figura contradiz o personagem? ("a young woman" não é o menino; figura neutra não contradiz.) */
function generoContradiz(visual: string, f: FichaDePersonagem): boolean {
  const fem = FEM_VISUAL_RE.test(visual)
  const masc = MASC_VISUAL_RE.test(visual)
  if (f.genero === 'man') return fem && !masc
  if (f.genero === 'woman') return masc && !fem
  return false
}

export interface CenaDoElenco { indice: number; nomes: string[]; pelaFala: string[] }

/**
 * Por cena, quem está nela. O VISUAL decide se há alguém no quadro (cenasComPersonagem: nome/papel/pronome no visual); a FALA
 * decide QUEM é a figura que o visual mostra sem nomear ("young man on motorcycle" + "A boy rode his bike" = o menino). Visual
 * sem ninguém (floresta, paisagem) não recebe personagem só porque a fala o cita — vira plano de ambiente (conserto 6).
 */
export function cenasDoElenco(visuals: ReadonlyArray<string>, falas: ReadonlyArray<string>, elenco: ReadonlyArray<FichaDePersonagem>): CenaDoElenco[] {
  const pelosVisuais = cenasComPersonagem(visuals, elenco)
  let anteriorFala: string[] = []
  return visuals.map((visual, indice) => {
    const v = String(visual ?? '')
    const doVisual = pelosVisuais[indice]?.nomes ?? []
    const daFala = quemNaFala(falas[indice] ?? '', elenco, anteriorFala)
    if (daFala.length > 0) anteriorFala = daFala
    const extra = visualMostraAlguem(v)
      ? daFala.filter((n) => !doVisual.includes(n) && !generoContradiz(v, elenco.find((e) => e.nome === n) as FichaDePersonagem))
      : []
    return { indice, nomes: [...doVisual, ...extra], pelaFala: extra }
  })
}

// ═══ 4+6. O PROMPT de cada cena (antes do still FLUX e do clipe) ════════════════════════════════════════════════════
export const CLAUSULA_PERFORMANCE = ', characters act naturally within the scene without addressing the viewer'
export const CLAUSULA_SEM_GENTE = ' No people, no human figures and no faces anywhere in this shot.'
export const CLAUSULA_FICHA = (canonica: string) => ` The same main character appears in this scene, consistent design: ${canonica}.`

/**
 * O ajuste dos prompts finais das cenas (o vetor classicScenePrompts, que alimenta o still FLUX e o clipe):
 *   · cena com personagem que o prompt ainda não descreve (veio pela fala) → ganha a ficha (a mesma cláusula do construtor);
 *   · cena sem personagem e sem ninguém no visual → perde a cláusula de "characters act" e ganha "No people…";
 *   · cena sem personagem com gente própria no visual (multidão, outra pessoa) → intocada.
 */
export function ajustarPromptsDoElenco(args: { prompts: ReadonlyArray<string>; visuals: ReadonlyArray<string>; falas: ReadonlyArray<string>; elenco: ReadonlyArray<FichaDePersonagem> }): { prompts: string[]; cenas: CenaDoElenco[]; comFicha: number[]; semGente: number[] } {
  const cenas = cenasDoElenco(args.visuals, args.falas, args.elenco)
  const comFicha: number[] = []
  const semGente: number[] = []
  const prompts = args.prompts.map((p, i) => {
    const cena = cenas[i]
    let out = String(p ?? '')
    if (!cena) return out
    if (cena.nomes.length > 0) {
      for (const nome of cena.nomes) {
        const f = args.elenco.find((e) => e.nome === nome)
        const semNome = f ? f.canonica.replace(new RegExp(`^${escapaRe(f.nome)},\\s*`, 'i'), '') : ''
        if (!f || out.includes(f.canonica) || (semNome && out.includes(semNome))) continue
        out = `${out.replace(/[\s]+$/, '')}${CLAUSULA_FICHA(f.canonica)}`
        if (!comFicha.includes(i + 1)) comFicha.push(i + 1)
      }
      return out
    }
    if (visualMostraAlguem(args.visuals[i] ?? '')) return out
    out = out.split(CLAUSULA_PERFORMANCE).join('')
    if (!out.includes(CLAUSULA_SEM_GENTE.trim())) out = `${out.replace(/[\s]+$/, '')}${CLAUSULA_SEM_GENTE}`
    semGente.push(i + 1)
    return out
  })
  return { prompts, cenas, comFicha, semGente }
}

// ═══ 1. O STILL COM FOLHA — formato explícito, um quadro só ════════════════════════════════════════════════════════
export type AspectoDoStill = '9:16' | '16:9' | '1:1' | '4:5'
export function aspectoDoStill(aspect: unknown): AspectoDoStill {
  return aspect === '16:9' || aspect === '1:1' || aspect === '4:5' ? aspect : '9:16'
}
const FORMATO_POR_EXTENSO: Record<AspectoDoStill, string> = {
  '9:16': 'ONE vertical 9:16 portrait image, taller than wide',
  '16:9': 'ONE horizontal 16:9 landscape image, wider than tall',
  '1:1': 'ONE square 1:1 image',
  '4:5': 'ONE vertical 4:5 portrait image, slightly taller than wide',
}
/** O prompt do still com folha: o de sempre (cena + quem + identidade + um quadro) + o formato por extenso + a proibição de painéis. */
export function promptDoStillComFolhaAjuste(scenePrompt: string, fichas: ReadonlyArray<FichaDePersonagem>, aspect: unknown): string {
  const a = aspectoDoStill(aspect)
  const formato = `Output: ${FORMATO_POR_EXTENSO[a]} (${a}), the scene filling the whole canvas edge to edge, no bars, no borders, no empty or flat-colour bands.`
  const quadro = fichas.length > 1
    ? ` The ${fichas.length} reference images are separate character sheets: draw each character exactly once, together inside the same single scene; never place them in separate panels or frames, no side-by-side images, no diptych, no grid, no split screen, no collage.`
    : ' The reference image is only a character sheet: never paste it, frame it or show it as a panel; no side-by-side images, no diptych, no split screen, no collage.'
  // integração 21/10 (ideia da versão Codex): "the lower third clear for captions" (sceneStyle/visualPromptPolicy) contradizia o "edge to edge" e é candidata à faixa lisa embaixo
  const cena = String(scenePrompt ?? '').replace(/\bthe lower third clear for captions\b/gi, 'continuous scenery down to the bottom edge')
  return `${promptDoStillComFolha(cena, fichas)}\n${formato}${quadro}`
}

/** Largura × altura pelo cabeçalho do arquivo (PNG, JPEG, WebP, GIF). Ilegível = null. */
export function dimensoesDaImagem(bytes: Uint8Array | ArrayLike<number> | null | undefined): { largura: number; altura: number; formato: string } | null {
  if (!bytes || bytes.length < 24) return null
  const b = bytes as ArrayLike<number>
  const u16be = (i: number) => (b[i] << 8) | b[i + 1]
  const u16le = (i: number) => b[i] | (b[i + 1] << 8)
  const u32be = (i: number) => ((b[i] << 24) >>> 0) + (b[i + 1] << 16) + (b[i + 2] << 8) + b[i + 3]
  const u24le = (i: number) => b[i] | (b[i + 1] << 8) | (b[i + 2] << 16)
  const ascii = (i: number, n: number) => Array.from({ length: n }, (_, k) => String.fromCharCode(b[i + k])).join('')
  if (b[0] === 0x89 && ascii(1, 3) === 'PNG' && ascii(12, 4) === 'IHDR') return { largura: u32be(16), altura: u32be(20), formato: 'png' }
  if (ascii(0, 3) === 'GIF') return { largura: u16le(6), altura: u16le(8), formato: 'gif' }
  if (ascii(0, 4) === 'RIFF' && ascii(8, 4) === 'WEBP' && b.length >= 30) {
    const tipo = ascii(12, 4)
    if (tipo === 'VP8X') return { largura: u24le(24) + 1, altura: u24le(27) + 1, formato: 'webp' }
    if (tipo === 'VP8L') { const x = b[21] | (b[22] << 8) | (b[23] << 16) | (b[24] << 24); return { largura: (x & 0x3fff) + 1, altura: ((x >>> 14) & 0x3fff) + 1, formato: 'webp' } }
    if (tipo === 'VP8 ') return { largura: u16le(26) & 0x3fff, altura: u16le(28) & 0x3fff, formato: 'webp' }
    return null
  }
  if (b[0] === 0xff && b[1] === 0xd8) {
    let i = 2
    while (i + 9 < b.length) {
      if (b[i] !== 0xff) { i++; continue }
      const m = b[i + 1]
      if (m === 0xd8 || m === 0x01 || (m >= 0xd0 && m <= 0xd7)) { i += 2; continue }
      const tam = u16be(i + 2)
      if ((m >= 0xc0 && m <= 0xc3) || (m >= 0xc5 && m <= 0xc7) || (m >= 0xc9 && m <= 0xcb) || (m >= 0xcd && m <= 0xcf)) return { largura: u16be(i + 7), altura: u16be(i + 5), formato: 'jpeg' }
      if (tam < 2) return null
      i += 2 + tam
    }
    return null
  }
  return null
}

/** Tolerância da razão largura/altura (2,5%): o 9:16 da fal a 1K sai 768×1376 (0,558 × 0,5625 = 0,8%). */
export const FORMATO_TOLERANCIA = 0.025
const RAZAO: Record<AspectoDoStill, number> = { '9:16': 9 / 16, '16:9': 16 / 9, '1:1': 1, '4:5': 4 / 5 }
/** O still está no formato do filme? Sem dimensão conferida = NÃO (cai para o FLUX de hoje). */
export function stillNoFormato(dim: { largura: number; altura: number } | null | undefined, aspect: unknown): { ok: boolean; motivo: 'ok' | 'formato_errado' | 'formato_nao_conferido'; razao: number | null } {
  if (!dim || !(dim.largura > 0) || !(dim.altura > 0)) return { ok: false, motivo: 'formato_nao_conferido', razao: null }
  const razao = dim.largura / dim.altura
  const alvo = RAZAO[aspectoDoStill(aspect)]
  const ok = Math.abs(razao - alvo) / alvo <= FORMATO_TOLERANCIA
  return { ok, motivo: ok ? 'ok' : 'formato_errado', razao: Math.round(razao * 10000) / 10000 }
}

// ═══ 2. A MODERAÇÃO de saída — termo de idade em cena inocente de criatura ═══════════════════════════════════════════
/** Nota sexual de cena inocente (o omni dá ≤ 0,001 em cena legítima; calibração de 25/09 em lib/safety/moderationPolicy). */
export const CENA_INOCENTE_SEXUAL_MAX = 0.01
/** Sinal de menor forte NUNCA é reconferido. */
export const MENOR_FORTE = 0.5
const TERMO_SEXUAL_RE = /\b(?:nude|nudity|naked|nsfw|sexy|sexual|sexuali[sz]ed|erotic|lingerie|undress\w*|seductive|sensual|kiss\w*|bath\w*|shower\w*|underwear|topless|bikini|bed ?sheets? with|intimate|lust\w*|fetish\w*)\b/i
// os termos de idade que a régua lê (lib/safety/moderationPolicy MINOR_TERM_LIST + idade por extenso), trocados por palavra neutra
const IDADE_RE = /\b(?:\d{1,2}|one|two|three|four|five|six|seven|eight|nine|ten|eleven|twelve|thirteen|fourteen|fifteen|sixteen|seventeen)[\s-]*(?:years?|yrs?|yo)(?:[\s-]*old)?\b|\baged[\s-]*\d{1,2}\b/gi
const MENOR_PALAVRA_RE = /\b(?:children|childlike|childish|child|kiddie|kids|kid|toddlers?|infants?|babies|baby|preteens?|pre-teens?|tweens?|teenagers?|teenage[d]?|teens?|adolescents?|schoolgirls?|schoolboys?|little|young(?:er|est)?|minors?|underage|boys?|girls?|kind|ado|nina|nino|nena|bimbo|bambin[oaie])\b/gi

/** Gente no texto (fora do elenco): com ela na cena, o termo de idade pode ser de uma criança de verdade — nunca reconfere. */
const HUMANO_NO_TEXTO_RE = /\b(?:boys?|girls?|man|men|woman|women|persons?|people|humans?|lady|ladies|guys?|sons?|daughters?|brothers?|sisters?|mothers?|fathers?|moms?|dads?|parents?|students?|schoolchildren|pupils?)\b/i
const ANIMAIS_PERTO = 'bunny|rabbit|bear|fox|mouse|puppy|dog|kitten|cat|owl|turtle|lion|zebra|giraffe|penguin|duck|duckling|frog|monkey|tiger|wolf|deer|whale|dolphin|bee|butterfly|horse|pony|pig|cow|sheep|goat|chicken|squirrel|hedgehog|raccoon|panda|koala|otter|seal|crab|octopus|snake|lizard|hamster|t-rex|trex|raptor|cub|hatchling|chick|calf|foal'
const CRIATURA_PERTO_RE = new RegExp(`\\b(?:${BICHOS}|${ANIMAIS_PERTO})s?\\b`, 'i')
/** Todo termo de idade do texto qualifica a criatura (até ~32 letras de um nome de bicho: "baby dinosaur", "dinosaur child")? */
function idadeSoDaCriatura(texto: string): boolean {
  const t = String(texto ?? '')
  const achados = [...t.matchAll(new RegExp(MENOR_PALAVRA_RE.source, 'gi')), ...t.matchAll(new RegExp(IDADE_RE.source, 'gi'))]
  return achados.every((m) => CRIATURA_PERTO_RE.test(t.slice(Math.max(0, (m.index ?? 0) - 32), (m.index ?? 0) + m[0].length + 32)))
}

/** O texto sem termo de idade (só para a 2ª conferência; o pedido ao fornecedor não muda). */
export function textoSemIdade(texto: string): string {
  return limpa(String(texto ?? '').replace(IDADE_RE, ' ').replace(MENOR_PALAVRA_RE, (w) => (/^(?:little|young|kids?|kid|child|children|baby|babies|toddlers?|infants?)$/i.test(w) ? 'small' : 'friendly')))
}

export interface DecisaoDeModeracaoLike { reasons: string[]; sexualScore: number; sexualMinorsScore: number }
/**
 * Pode conferir de novo, sem os termos de idade? SÓ: todo personagem da cena é criatura/animal; o bloqueio veio SÓ de
 * 'sexual/minors' (a categoria de texto); nota sexual de cena inocente; sinal de menor fraco; nenhum termo sexual no texto; e
 * o texto neutro não cita mais menor nenhum pela régua real (mentionsMinor). A 2ª conferência leva a MESMA imagem.
 */
export function podeReconferirModeracao(args: { decisao: DecisaoDeModeracaoLike | null | undefined; fichas: ReadonlyArray<Pick<FichaDePersonagem, 'tipo'>>; texto: string }): { reconferir: boolean; motivo: string; textoNeutro: string | null } {
  const d = args.decisao
  const nao = (motivo: string) => ({ reconferir: false, motivo, textoNeutro: null })
  if (!d || !Array.isArray(d.reasons) || d.reasons.length === 0) return nao('sem_bloqueio')
  if (!d.reasons.every((r) => r === 'sexual/minors')) return nao('bloqueio_sexual')
  if (!(d.sexualScore < CENA_INOCENTE_SEXUAL_MAX)) return nao('nota_sexual')
  if (!(d.sexualMinorsScore < MENOR_FORTE)) return nao('menor_forte')
  if (args.fichas.length === 0 || !args.fichas.every((f) => f.tipo === 'criatura' || f.tipo === 'animal')) return nao('tem_humano')
  if (TERMO_SEXUAL_RE.test(args.texto)) return nao('termo_sexual')
  if (HUMANO_NO_TEXTO_RE.test(args.texto)) return nao('humano_no_texto')
  if (!idadeSoDaCriatura(args.texto)) return nao('idade_fora_da_criatura')
  const neutro = textoSemIdade(args.texto)
  if (mentionsMinor(neutro)) return nao('idade_no_neutro')
  return { reconferir: true, motivo: 'criatura_cena_inocente', textoNeutro: neutro }
}

// ═══ 1+2. O still com folha, com rede INJETADA (o servidor em ./personagemAjusteServer liga a fal e a moderação) ══════
export type MotivoStillComFolha = 'ok' | 'provider_failed' | 'provider_timeout' | 'formato_errado' | 'formato_nao_conferido' | 'moderation_blocked' | 'moderation_unavailable' | 'no_key'
export interface ResultadoStillComFolha { url: string | null; motivo: MotivoStillComFolha; razao: number | null; reconferida: boolean }
export interface DepsStillComFolha {
  /** POST único ao edit + leitura até o prazo; width/height quando a fal devolve. */
  pedir: (input: Record<string, unknown>, pollWindowMs: number) => Promise<{ url: string | null; motivo: 'ok' | 'provider_failed' | 'provider_timeout'; largura?: number | null; altura?: number | null }>
  /** Os primeiros bytes do arquivo (para o cabeçalho). null = não deu para ler. */
  bytes: (url: string) => Promise<Uint8Array | null>
  /** A porta de moderação da casa (lib/safety/contentModeration moderateContent, superfície 'estrela', etapa 'output'). */
  moderar: (texto: string, imageUrls: string[], meta: Record<string, unknown>) => Promise<{ ok: true } | { ok: false; reason: string; decision?: DecisaoDeModeracaoLike }>
}
/** O corpo do edit: o MESMO da Estrela (prompt, image_urls, aspect_ratio do filme, 1 imagem, 1K). */
export function corpoDoEditAjuste(prompt: string, imageUrls: string[], aspect: unknown): Record<string, unknown> {
  return { prompt, image_urls: imageUrls, aspect_ratio: aspectoDoStill(aspect), num_images: 1, resolution: '1K' }
}
/** Um still com folha: edit → formato conferido → moderação (com a reconferência da criatura). Nunca lança. */
export async function stillComFolha(args: { prompt: string; imageUrls: string[]; aspect: unknown; fichas: ReadonlyArray<Pick<FichaDePersonagem, 'tipo'>>; pollWindowMs: number; meta?: Record<string, unknown> }, deps: DepsStillComFolha): Promise<ResultadoStillComFolha> {
  try {
    const pedido = await deps.pedir(corpoDoEditAjuste(args.prompt, args.imageUrls, args.aspect), args.pollWindowMs)
    if (!pedido.url) return { url: null, motivo: pedido.motivo === 'provider_timeout' ? 'provider_timeout' : 'provider_failed', razao: null, reconferida: false }
    const dim = typeof pedido.largura === 'number' && typeof pedido.altura === 'number' && pedido.largura > 0 && pedido.altura > 0
      ? { largura: pedido.largura, altura: pedido.altura }
      : dimensoesDaImagem(await deps.bytes(pedido.url).catch(() => null))
    const formato = stillNoFormato(dim, args.aspect)
    if (!formato.ok) return { url: null, motivo: formato.motivo === 'formato_errado' ? 'formato_errado' : 'formato_nao_conferido', razao: formato.razao, reconferida: false }
    const meta = { ...(args.meta ?? {}), personagem_ajuste: PERSONAGEM_AJUSTE_VERSAO }
    const check = await deps.moderar(args.prompt, [pedido.url], meta)
    if (check.ok) return { url: pedido.url, motivo: 'ok', razao: formato.razao, reconferida: false }
    if (check.reason !== 'blocked') return { url: null, motivo: 'moderation_unavailable', razao: formato.razao, reconferida: false }
    const re = podeReconferirModeracao({ decisao: check.decision, fichas: args.fichas, texto: args.prompt })
    if (!re.reconferir || !re.textoNeutro) return { url: null, motivo: 'moderation_blocked', razao: formato.razao, reconferida: false }
    const segunda = await deps.moderar(re.textoNeutro, [pedido.url], { ...meta, reconferencia: re.motivo })
    if (segunda.ok) return { url: pedido.url, motivo: 'ok', razao: formato.razao, reconferida: true }
    return { url: null, motivo: segunda.reason === 'blocked' ? 'moderation_blocked' : 'moderation_unavailable', razao: formato.razao, reconferida: true }
  } catch {
    return { url: null, motivo: 'provider_failed', razao: null, reconferida: false }
  }
}

// ═══ 5. A REFAÇÃO — janelas do edit (o crítico nasceu medido no FLUX dev, 3-6 s; o edit leva 15-40 s) ═════════════════
/** Teto do crítico numa cena com folha: julgar (≤ 6 s) + refazer no edit (≤ 40 s) + julgar de novo (≤ 6 s). */
export const PERSONAGEM_CRITICO_TETO_CENA_MS = 55_000
/** Janela de espera da foto nova no edit (o padrão do crítico, 9 s, é a do FLUX: o edit nunca cabia nela). */
export const PERSONAGEM_REGERACAO_JANELA_MS = 40_000
/** Menos que isto de folga = não refaz (o edit não volta antes). */
export const PERSONAGEM_REGERACAO_MIN_MS = 20_000
/** Prazo absoluto do crítico com folha no filme (o lote é paralelo: o pior caso é UMA cena). A rota tem maxDuration 300 s: +25 s sobre os 35 s de antes. */
export const PERSONAGEM_CRITICO_PRAZO_MS = 60_000

// ═══ Relato e ensaio ═════════════════════════════════════════════════════════════════════════════════════════════
export function relatoDoAjuste(args: { motivos: Partial<Record<MotivoStillComFolha, number>>; reconferidas: number; cenas: ReadonlyArray<CenaDoElenco>; comFicha: readonly number[]; semGente: readonly number[]; regeracoes: ReadonlyArray<{ cena: number; regerou: boolean; regeracao_ok: boolean | null; regeracao_motivo?: string | null }>; elenco: ReadonlyArray<FichaDePersonagem> }) {
  return {
    ajuste: PERSONAGEM_AJUSTE_VERSAO,
    motivos_still: { ...args.motivos },
    formato_recusado: (args.motivos.formato_errado ?? 0) + (args.motivos.formato_nao_conferido ?? 0),
    moderacao_reconferida: args.reconferidas,
    cenas_pela_fala: args.cenas.filter((c) => c.pelaFala.length > 0).map((c) => c.indice + 1),
    cenas_com_ficha_no_prompt: [...args.comFicha],
    cenas_sem_gente: [...args.semGente],
    miticas: args.elenco.filter((e) => (e.origem as OrigemDaFicha) === 'mitica').map((e) => e.nome),
    regeracoes: args.regeracoes.filter((r) => r.regerou).map((r) => ({ cena: r.cena, ok: r.regeracao_ok, motivo: r.regeracao_motivo ?? null })),
  }
}

/** O ensaio de $0 com as cenas do ajuste (fala + visual), as cenas sem gente e as figuras míticas. Nada é gerado. */
export function ensaioDoPersonagemAjuste(args: { engine: string; elenco: ReadonlyArray<FichaDePersonagem>; casting: string; visuals: ReadonlyArray<string>; falas: ReadonlyArray<string>; look: Pick<StyleAnchor, 'lookPhrase'> | null | undefined; ajuste: { cenas: CenaDoElenco[]; comFicha: number[]; semGente: number[] } | null }) {
  const base = ensaioDoPersonagem({ engine: args.engine, elenco: args.elenco, casting: args.casting, visuals: args.visuals, look: args.look })
  const cenas = args.ajuste?.cenas ?? cenasDoElenco(args.visuals, args.falas, args.elenco)
  const com = cenas.filter((c) => c.nomes.length > 0).length
  return {
    ...base,
    ajuste: PERSONAGEM_AJUSTE_VERSAO,
    cenas: cenas.map((c) => ({ cena: c.indice + 1, personagens: c.nomes, pela_fala: c.pelaFala })),
    cenas_com_personagem: com,
    custo_estimado_usd: custoDoPersonagemUsd({ folhas: args.elenco.length, stills: Math.min(com, PERSONAGEM_MAX_STILLS), criticos: Math.min(com, PERSONAGEM_MAX_STILLS), regeracoes: 0 }).usd,
    custo_pior_caso_usd: custoDoPersonagemUsd({ folhas: args.elenco.length, stills: Math.min(com, PERSONAGEM_MAX_STILLS), criticos: Math.min(com, PERSONAGEM_MAX_STILLS), regeracoes: Math.min(com, PERSONAGEM_MAX_STILLS) }).usd,
    cenas_sem_gente: args.ajuste?.semGente ?? [],
    miticas: args.elenco.filter((e) => (e.origem as OrigemDaFicha) === 'mitica').map((e) => e.nome),
  }
}
