import { NARRATION_LANGUAGE_CODES, LANGUAGE_NAMES, narrationLanguage, narrationWordCount } from '@/lib/textLanguage' // KINEO-IDIOMAS-FORMATOS-2410
// KINEO-BEBE-QUE-FALA-2010 — "AI Kids Cartoon Stories" / "Histórias infantis em desenho 3D com IA" (fundador 20/10: "começa hoje").
//
// POR QUÊ: o anúncio que o fundador viu (promo da OpenArt) vende "Claude escreve a história → sai um curta de desenho 3D infantil
// estilo Cocomelon/Pixar". A casa JÁ tem tudo isso no fluxo de filme: o Seedance 1.5 (o motor das primeiras impressões), 15/35 s,
// 9:16, narração e legenda. O que faltava era (1) um template de 1 clique e (2) o MESMO personagem e o MESMO estilo 3D em todas as
// cenas. Aqui mora a regra pura; o template (app/kids-cartoon), a rota que escreve a história (app/api/kids-cartoon/story) e a
// rota do filme (app/api/generate-video-cinematic, com `kids_cartoon`) executam as MESMAS funções.
//
// PRODUTO PRINCIPAL desde a NOTA 10 do fundador ao curta de teste (20/10, render 4f6c8a40, fluxo de filme Seedance 1.5, estilo 3D).
// O "bebê podcast" é o SEGUNDO modo, com interruptor próprio desligado e só a decisão anotada: lib/kidsCartoon/babyPodcast.ts.
// Personagem consistente: hoje é a ficha canônica em toda cena; quando KINEO-META95-PERSONAGEM-2010 entrar, reaproveitar a folha dele.
//
// INTERRUPTORES (entregues DESLIGADOS; prontos para virar true logo depois de publicar):
//   · KIDS_CARTOON_LIVE — o template e o `kids_cartoon` da rota do filme. false = só as contas da casa (isInternalEmail);
//   · KIDS_CARTOON_PAGES_LIVE — /ai-kids-cartoon-videos e /desenho-infantil-3d-com-ia (404 + fora do sitemap e do /llms.txt);
//   · HOME_4TH_CARD_LIVE (lib/ui/homeKidsCard.ts) — o 4º card da home.
//
// MÓDULO PURO (zero import): o guardião scripts/test-bebe-que-fala-2010.mjs executa este arquivo num vm.

export const KIDS_CARTOON_MARK = 'KINEO-BEBE-QUE-FALA-2010'

/** Interruptor do PRODUTO (template + `kids_cartoon` no filme). false = só as contas da casa veem e usam. */
export const KIDS_CARTOON_LIVE = true // LIGADO 20/10 noite: nota 10 do fundador ao curta 4f6c8a40 e "os 4 cards no ar hoje"
/** Interruptor das PÁGINAS públicas (EN/PT). false = 404 + fora do sitemap/llms.txt (o IndexNow do cron só envia o que está no sitemap). */
export const KIDS_CARTOON_PAGES_LIVE = true // LIGADO 20/10 noite: o menu do topo (home remodelada) aponta "AI Cartoon Videos" → /ai-kids-cartoon-videos

/** O produto abre para esta conta? (puro: `internal` = isInternalEmail do e-mail verificado da sessão). */
export function kidsCartoonOn(live: boolean, internal: boolean): boolean {
  return live === true || internal === true
}

/** O caminho do template (exige conta; visitante passa pelo cadastro e volta). */
export const KIDS_CARTOON_TEMPLATE_PATH = '/kids-cartoon'
export function kidsCartoonTemplateHref(signedIn: boolean, campaign = 'home_card'): string {
  const dest = `${KIDS_CARTOON_TEMPLATE_PATH}?utm_source=${encodeURIComponent(campaign)}`
  return signedIn ? dest : `/signup?redirect=${encodeURIComponent(dest)}`
}

// ── o motor, as durações e as línguas ────────────────────────────────────────────────────────────────────────────
/** O motor do filme: o Seedance 1.5 do fluxo de sempre (o selo honesto do card e das páginas diz este nome). */
export const KIDS_CARTOON_ENGINE = 'seedance' as const
export const KIDS_CARTOON_ENGINE_LABEL = 'SEEDANCE 1.5'
/** As durações do template (as do Seedance 1.5 que cabem num curta infantil: 15 s e 35 s). */
export const KIDS_CARTOON_DURATIONS = [15, 35] as const
export type KidsCartoonDuration = (typeof KIDS_CARTOON_DURATIONS)[number]
export const KIDS_CARTOON_DEFAULT_DURATION: KidsCartoonDuration = 35
/** As línguas da narração no template (EN/PT no mínimo; ES de brinde — o Seedance 1.5 narra nas 16). */
export const KIDS_CARTOON_LANGUAGES = NARRATION_LANGUAGE_CODES // KINEO-IDIOMAS-FORMATOS-2410
export type KidsCartoonLanguage = (typeof KIDS_CARTOON_LANGUAGES)[number]
export const KIDS_CARTOON_LANGUAGE_NAMES: Record<KidsCartoonLanguage, string> = LANGUAGE_NAMES // KINEO-IDIOMAS-FORMATOS-2410
export function isKidsCartoonLanguage(raw: unknown): raw is KidsCartoonLanguage {
  return typeof raw === 'string' && narrationLanguage(raw) === raw // KINEO-IDIOMAS-FORMATOS-2410
}
export function isKidsCartoonDuration(raw: unknown): raw is KidsCartoonDuration {
  return typeof raw === 'number' && (KIDS_CARTOON_DURATIONS as readonly number[]).includes(raw)
}

// ── os 6 personagens fixos (descrição canônica em inglês: é ela que vai em TODA cena) ─────────────────────────────
export type KidsCharacterId = 'leo' | 'mia' | 'dino' | 'pip' | 'bibi' | 'ollie' | 'preta' | 'guilhermina' | 'amora' // KINEO-BULDOGUES-PERSONAGENS-3010
export interface KidsCharacter {
  id: KidsCharacterId
  /** O nome (igual em toda língua: é ele que o escritor usa e que a cena reconhece). */
  name: string
  kind: { en: string; pt: string; es: string }
  /** A FICHA canônica (começa por "Nome, …" — lib/cinematic/sceneStyle mentionsStoryCharacter reconhece o nome). */
  sheet: string
  /** Retrato fixo gerado por nós (KINEO-DESENHO-NOTA9-2110: Nano Banana Pro, 1:1, na conta do fundador, um por ficha; public/kids-cartoon/<id>.webp). */
  portrait: string
}
export const KIDS_CHARACTERS: readonly KidsCharacter[] = [
  { id: 'leo', name: 'Leo', kind: { en: 'Boy', pt: 'Menino', es: 'Niño' }, portrait: '/kids-cartoon/leo.webp',
    sheet: 'Leo, a cheerful 5-year-old boy 3D cartoon character with curly brown hair, big round green eyes, rosy cheeks, a bright yellow raincoat over a blue striped shirt and red rubber boots' },
  { id: 'mia', name: 'Mia', kind: { en: 'Girl', pt: 'Menina', es: 'Niña' }, portrait: '/kids-cartoon/mia.webp',
    sheet: 'Mia, a curious 5-year-old girl 3D cartoon character with two puffy black pigtails tied with pink ribbons, big brown eyes, a small gap-tooth smile, a purple dress with white polka dots and white sneakers' },
  { id: 'dino', name: 'Dino', kind: { en: 'Little dinosaur', pt: 'Dinossaurinho', es: 'Dinosaurito' }, portrait: '/kids-cartoon/dino.webp',
    sheet: 'Dino, a friendly little green dinosaur 3D cartoon character with a round belly, tiny arms, big shiny amber eyes, soft orange spots on his back and a short wobbly tail' },
  { id: 'pip', name: 'Pip', kind: { en: 'Puppy', pt: 'Filhote de cachorro', es: 'Cachorrito' }, portrait: '/kids-cartoon/pip.webp',
    sheet: 'Pip, a fluffy cream-colored puppy 3D cartoon character with floppy brown ears, a black button nose, big blue eyes and a red collar with a little gold bell' },
  { id: 'bibi', name: 'Bibi', kind: { en: 'Bunny', pt: 'Coelhinha', es: 'Conejita' }, portrait: '/kids-cartoon/bibi.webp',
    sheet: 'Bibi, a little white bunny 3D cartoon character with long pink-lined ears, a round fluffy tail, big violet eyes and a tiny yellow scarf' },
  { id: 'ollie', name: 'Ollie', kind: { en: 'Baby elephant', pt: 'Elefantinho', es: 'Elefantito' }, portrait: '/kids-cartoon/ollie.webp',
    sheet: 'Ollie, a baby elephant 3D cartoon character with soft grey skin, big flappy ears with pink insides, a short curly trunk and a tiny green cap' },
  // KINEO-BULDOGUES-PERSONAGENS-3010 — as 3 buldogues da série do canal (fundador 30/10: "coloca eles como personagens normais").
  // Retratos recortados das fichas 3D aprovadas (C:\kineo-wt\_buldogues\front-*.png). Amora usa cadeirinha de rodas rosa em toda cena de corpo inteiro.
  { id: 'preta', name: 'Preta', kind: { en: 'French bulldog', pt: 'Buldogue francês', es: 'Bulldog francés' }, portrait: '/kids-cartoon/preta.webp',
    sheet: 'Preta, a charcoal blue-grey French bulldog 3D cartoon character with a white chest patch, big honey-amber eyes, upright bat ears and a playful, loving, kissy personality' },
  { id: 'guilhermina', name: 'Guilhermina', kind: { en: 'French bulldog', pt: 'Buldogue francês', es: 'Bulldog francés' }, portrait: '/kids-cartoon/guilhermina.webp',
    sheet: 'Guilhermina, a strong white French bulldog 3D cartoon character with grey patches, a grey mask around both eyes, a white stripe on her forehead, upright bat ears and a sturdy, confident build' },
  { id: 'amora', name: 'Amora', kind: { en: 'French bulldog', pt: 'Buldogue francês', es: 'Bulldog francés' }, portrait: '/kids-cartoon/amora.webp',
    sheet: 'Amora, a small cream French bulldog 3D cartoon character with a light patch over one eye, huge pink-lined bat ears, big brown eyes and a pink dog wheelchair supporting her back legs' },
]
export const KIDS_CHARACTER_IDS: readonly KidsCharacterId[] = KIDS_CHARACTERS.map((c) => c.id)
export function isKidsCharacterId(raw: unknown): raw is KidsCharacterId {
  return typeof raw === 'string' && (KIDS_CHARACTER_IDS as readonly string[]).includes(raw)
}
export function kidsCharacter(id: unknown): KidsCharacter | null {
  return KIDS_CHARACTERS.find((c) => c.id === id) ?? null
}

// ── as 6 ideias prontas (variedade: as plataformas punem conteúdo repetido em massa) ─────────────────────────────
export type KidsIdeaId = 'share' | 'dark' | 'seed' | 'teeth' | 'bird' | 'rain'
export const KIDS_IDEAS: readonly { id: KidsIdeaId; en: string; pt: string; es: string }[] = [
  { id: 'share', en: 'learns to share toys with a new friend at the park', pt: 'aprende a dividir os brinquedos com um novo amigo no parque', es: 'aprende a compartir sus juguetes con un nuevo amigo en el parque' },
  { id: 'dark', en: 'is afraid of the dark until the friendly stars help', pt: 'tem medo do escuro até as estrelas amigas ajudarem', es: 'tiene miedo a la oscuridad hasta que las estrellas amigas ayudan' },
  { id: 'seed', en: 'plants a tiny seed and learns to wait for it to grow', pt: 'planta uma sementinha e aprende a esperar ela crescer', es: 'planta una semillita y aprende a esperar a que crezca' },
  { id: 'teeth', en: 'learns why we brush our teeth before bed', pt: 'aprende por que escovamos os dentes antes de dormir', es: 'aprende por qué nos cepillamos los dientes antes de dormir' },
  { id: 'bird', en: 'helps a baby bird get back to its nest', pt: 'ajuda um passarinho a voltar para o ninho', es: 'ayuda a un pajarito a volver a su nido' },
  { id: 'rain', en: 'discovers that a rainy day can be fun', pt: 'descobre que um dia de chuva pode ser divertido', es: 'descubre que un día de lluvia puede ser divertido' },
]
export function kidsIdea(id: unknown): (typeof KIDS_IDEAS)[number] | null {
  return KIDS_IDEAS.find((i) => i.id === id) ?? null
}

// ── a regra extra "conteúdo inocente para criança" (soma-se à moderação da casa, nunca a substitui) ─────────────────
export type KidsRefusal = 'sexual' | 'violence' | 'humiliation' | 'adult_products'
const B = String.raw`(?<![\p{L}\p{N}])`
const E = String.raw`(?![\p{L}\p{N}])`
const KIDS_RULES: readonly [KidsRefusal, RegExp][] = [
  // Lista enxuta de propósito: "shooting star", "a weed in the garden", "o patinho feio", "el niño vino a casa", "a mata" são histórias
  // infantis legítimas e NÃO casam. Cada categoria só tem palavra que, num curta para criança de 3–7 anos, já é o problema.
  ['sexual', new RegExp(`${B}(?:sexy|sexual\\w*|sensual\\w*|erotic\\w*|nude|nudes|naked|nudity|lingerie|underwear|bikini|seduc\\w*|kiss(?:es|ing)? on the (?:lips|mouth)|make ?out|sexo|nua|nuas|pelad[oa]s?|calcinha|cueca|beijo na boca|sedu[zç]\\w*|desnud[oa]s?|ropa interior|beso en la boca)${E}`, 'iu')],
  ['violence', new RegExp(`${B}(?:kill(?:s|ed|ing|er|ers)?|murder\\w*|blood\\w*|gore|gory|guns?|pistols?|rifles?|knife|knives|stab(?:s|bed|bing)?|weapons?|bombs?|torture\\w*|beat(?:s|ing)? (?:him|her|them) up|war|matar|matou|assassin\\w*|sangue\\w*|armas|facas?|esfaque\\w*|tiros?|bombas?|tortur\\w*|espancar|guerra|asesin\\w*|sangre|cuchill\\w*|disparos?|golpear)${E}`, 'iu')],
  ['humiliation', new RegExp(`${B}(?:humiliat\\w*|make fun of|making fun of|mock(?:s|ed|ing)?|bull(?:y|ies|ied|ying)|stupid|idiot\\w*|dumb|fat (?:kid|boy|girl|baby)|pee(?:s|d)? (?:his|her|their) pants|poop(?:s|ed)? (?:his|her|their) pants|humilh\\w*|zombar|zombou|zombando|caçoar|tirar sarro|idiota\\w*|xixi na calça|cocô na calça|humill\\w*|burlarse|se burlan)${E}`, 'iu')],
  ['adult_products', new RegExp(`${B}(?:beer|wine|alcohol\\w*|vodka|whisk(?:e)?y|cocktails?|cigarettes?|cigars?|smoking|vap(?:e|es|ing)|tobacco|cannabis|marijuana|drugs?|casinos?|gambl\\w*|betting|lotter(?:y|ies)|dating|cerveja\\w*|vinhos?|álcool|alcool|cigarros?|charutos?|fumar|fumando|maconha|drogas?|cassino|apostas?|namoro|cerveza\\w*|cigarrillos?|apuestas?)${E}`, 'iu')],
]
/** A regra extra para criança: devolve a 1ª categoria que o texto fere, ou null (texto inocente). Determinística. */
export function kidsContentRefusal(text: string | null | undefined): KidsRefusal | null {
  const t = String(text ?? '').normalize('NFC')
  if (!t.trim()) return null
  for (const [cat, re] of KIDS_RULES) if (re.test(t)) return cat
  return null
}
export const KIDS_REFUSAL_MESSAGE = {
  en: 'Kids cartoons must stay innocent: no romance or nudity, no violence or weapons, no making fun of anyone, and no adult products. Try another story idea. Nothing was charged.',
  pt: 'Desenho infantil precisa ser inocente: sem romance ou nudez, sem violência ou armas, sem zombar de ninguém e sem produto adulto. Tente outra ideia de história. Nada foi cobrado.',
} as const

// ── a entrada do template (validada no SERVIDOR; a tela só ajuda) ─────────────────────────────────────────────────
export const KIDS_IDEA_MIN_CHARS = 8
export const KIDS_IDEA_MAX_CHARS = 300
export interface KidsCartoonRequest {
  character: KidsCharacterId
  language: KidsCartoonLanguage
  duration: KidsCartoonDuration
  /** A ideia em texto (a escrita pela pessoa, ou a da ideia pronta na língua escolhida). */
  idea: string
  ideaId: KidsIdeaId | null
}
export type KidsCartoonValidation = { ok: true; value: KidsCartoonRequest } | { ok: false; error: string; field: string }

/** Confere o pedido do template. Nada fora da lista passa; texto limpo de controle e espaços; link não é ideia. */
export function validateKidsCartoonRequest(raw: unknown): KidsCartoonValidation {
  const r = (raw && typeof raw === 'object' ? raw : {}) as Record<string, unknown>
  if (!isKidsCharacterId(r.character)) return { ok: false, error: 'Pick one of the characters.', field: 'character' }
  if (!isKidsCartoonLanguage(r.language)) return { ok: false, error: 'Pick a narration language from the list.', field: 'language' }
  const duration = typeof r.duration === 'string' ? Number(r.duration) : r.duration
  if (!isKidsCartoonDuration(duration)) return { ok: false, error: 'Pick 15 or 35 seconds.', field: 'duration' }
  const idea0 = kidsIdea(r.ideaId)
  const typed = typeof r.idea === 'string' ? r.idea.replace(/[\u0000-\u001f\u007f​-‍⁠﻿]/g, ' ').replace(/\s+/g, ' ').trim() : ''
  if (typed.length > KIDS_IDEA_MAX_CHARS) return { ok: false, error: `Keep the story idea under ${KIDS_IDEA_MAX_CHARS} characters.`, field: 'idea' }
  if (/https?:\/\/|www\./i.test(typed)) return { ok: false, error: 'Describe the story in words, not a link.', field: 'idea' }
  const idea = typed || (idea0 ? idea0[r.language === 'pt' || r.language === 'es' ? r.language : 'en'] : '') // KINEO-IDIOMAS-FORMATOS-2410 — a ideia editorial de fallback é traduzida pelo escritor para a língua escolhida
  if (idea.length < KIDS_IDEA_MIN_CHARS) return { ok: false, error: 'Write a story idea or pick one of the ready ideas.', field: 'idea' }
  return { ok: true, value: { character: r.character, language: r.language, duration, idea, ideaId: typed ? null : (idea0?.id ?? null) } }
}

// ── o escritor da história (a régua de palavras vem do chamador: lib/scriptWriterRate, a MESMA do /api/generate-script) ──
export function kidsStoryWriterPrompt(i: { request: KidsCartoonRequest; minWords: number; maxWords: number }): { system: string; user: string } {
  const c = kidsCharacter(i.request.character) as KidsCharacter
  const lang = KIDS_CARTOON_LANGUAGE_NAMES[i.request.language]
  const system = [
    'You write narration for short 3D animated cartoon stories for young children (ages 3 to 7), like a gentle bedtime cartoon.',
    `Write in ${lang}. Plain narration only: no title, no scene labels, no markers, no stage directions, no emojis, no hashtags, no quotes around the text.`,
    `Length: between ${i.minWords} and ${i.maxWords} words. For Chinese, Cantonese, Japanese and Thai, count lexical words with Unicode word segmentation, not spaces; never add spaces between characters. Short, simple sentences a small child understands.`, // KINEO-IDIOMAS-FORMATOS-2410
    `The main character is ${c.name} (${c.sheet}). Name ${c.name} in the first sentence and keep ${c.name} in every part of the story.`,
    'Keep it innocent, kind, warm and a little funny: no romance, no nudity, no violence, no weapons, no danger or scary moments, no making fun of anyone, no brands, no real people, no adult products.',
    'Shape: a happy opening, a small everyday problem, a gentle solution, and one sentence with a kind lesson. End with one short friendly question to the child watching.',
  ].join(' ')
  const user = `Story idea: ${c.name} ${i.request.idea}`
  return { system, user }
}

/** Palavras faladas do texto (o mesmo corte por espaços que a régua da casa conta). */
export function kidsWordCount(text: string): number {
  return narrationWordCount(text) // KINEO-IDIOMAS-FORMATOS-2410
}
/** A história pronta (puro): limpa, no tamanho, com o nome do personagem e inocente. */
export function kidsStoryCheck(script: string, i: { character: KidsCharacterId; minWords: number; maxWords: number }): { ok: true; script: string } | { ok: false; reason: 'empty' | 'too_short' | 'too_long' | 'no_character' | 'not_innocent' } {
  const s = String(script ?? '').replace(/^["“”']+|["“”']+$/g, '').replace(/\s+/g, ' ').trim()
  if (!s) return { ok: false, reason: 'empty' }
  const n = kidsWordCount(s)
  if (n < i.minWords) return { ok: false, reason: 'too_short' }
  if (n > i.maxWords) return { ok: false, reason: 'too_long' }
  const c = kidsCharacter(i.character) as KidsCharacter
  if (!new RegExp(`${B}${c.name}${E}`, 'u').test(s)) return { ok: false, reason: 'no_character' }
  if (kidsContentRefusal(s)) return { ok: false, reason: 'not_innocent' }
  return { ok: true, script: s }
}

// ── a passagem para o fluxo de filme de sempre (/generate, Seedance 1.5, roteiro "como está") ─────────────────────
/** Teto do texto que viaja na URL (espelho de CREATION_HANDOFF_PROMPT_MAX_CHARS, lib/creationHandoff.ts; o guardião confere). */
export const KIDS_HANDOFF_PROMPT_MAX_CHARS = 1000
export const KIDS_CARTOON_CAMPAIGN = 'kids_cartoon' as const
/** O destino do filme: o /generate no Seedance 1.5, duração do pedido, roteiro verbatim, língua e o personagem. null = texto grande demais. */
export function kidsCartoonGenerateHref(i: { script: string; request: KidsCartoonRequest }): string | null {
  const script = String(i.script ?? '').trim()
  if (!script || script.length > KIDS_HANDOFF_PROMPT_MAX_CHARS) return null
  const q = new URLSearchParams({
    engine: KIDS_CARTOON_ENGINE,
    duration: String(i.request.duration),
    script_mode: 'verbatim',
    language: i.request.language,
    kids_cartoon: i.request.character,
    intent_campaign: KIDS_CARTOON_CAMPAIGN,
    prompt: script,
  })
  return `/generate?${q.toString()}`
}

// ── o estilo 3D fixo e o personagem em TODA cena (a rota do filme aplica; forma de StyleAnchor, lib/cinematic/sceneStyle.ts) ──
export const KIDS_STYLE_ANCHOR = {
  look: 'animated3d' as const,
  lookPhrase: '3D animated cartoon for young children, Pixar-like stylized look, soft rounded shapes, big expressive eyes, bright cheerful saturated colors, gentle warm lighting, not photorealistic',
  suffix: ', same 3D animated kids cartoon style in every scene, same character design and palette, consistent soft lighting, gentle and child-friendly, never mix with live-action or photorealism',
}
export const KIDS_SAFE_SCENE_SUFFIX = ', gentle child-friendly scene, nothing scary, violent or unsafe'
/** O prompt final da cena com o personagem canônico garantido (se a cena já traz a ficha, só a trava infantil) — puro e idempotente. */
export function comPersonagemInfantil(prompt: string, sheet: string): string {
  let p = String(prompt ?? '')
  if (!p.includes(sheet)) p = `${p.replace(/[\s.]+$/, '')}. The same main character appears in this scene, consistent design: ${sheet}.`
  if (!p.includes(KIDS_SAFE_SCENE_SUFFIX)) p = `${p.replace(/[\s.]+$/, '')}${KIDS_SAFE_SCENE_SUFFIX}`
  return p
}

// ── KINEO-DESENHO-LEO-0111 [TRAVA 8.2 — vai do fundador 01/11 "puxa do canal revisor os últimos 10 vídeos ... e arrumam os defeitos"] ──
// Revisor 31/10, dois PRIMEIROS vídeos de cliente: (1) o cliente escolheu o Leo (menino) e um ESQUILO fez o papel principal do começo
// ao fim ("found the owner, a grateful squirrel"); (2) a luva listrada colorida virou luva vermelha e o parque de outono virou neve no
// meio do filme. CAUSA de (1): o elenco determinístico da casa (lib/cinematic/folhaDePersonagem tipoDoNome) lê a espécie na frase do
// nome — "Leo found the owner, a grateful squirrel" → Leo = 'animal', espécie 'squirrel' → canônica "Leo, a squirrel…" — e a rota
// (KINEO-QUALIDADE-TODOS-MOTORES-2910, folha ligada para todos) punha ESSA canônica no lugar da ficha do personagem escolhido; o
// semDescricaoConcorrente ainda tirava o menino da cena. CAUSA de (2): ninguém fixava objeto nem cenário — cada cena era descrita
// solta pelo descritor a partir da sua fala. Conserto (só com `kids_cartoon`): o elenco do filme é a ficha ESCOLHIDA como protagonista
// (origem 'autor': casting e ficha literal nunca a trocam) + no máximo um coadjuvante; e o último toque no prompt de cada cena põe o
// personagem escolhido NA FRENTE como protagonista, tira a cláusula "No people" e repete o objeto e o cenário da história.
export const KIDS_DESENHO_LEO_MARK = 'KINEO-DESENHO-LEO-0111' // KINEO-DESENHO-LEO-0111
/** O que cada personagem fixo É (o elenco da casa precisa do tipo; o Leo é humano mesmo quando a história tem esquilo). */ // KINEO-DESENHO-LEO-0111
export const KIDS_CHARACTER_TIPO: Record<KidsCharacterId, { tipo: 'humano' | 'animal' | 'criatura'; genero: 'man' | 'woman' | null }> = { // KINEO-DESENHO-LEO-0111
  leo: { tipo: 'humano', genero: 'man' }, mia: { tipo: 'humano', genero: 'woman' }, dino: { tipo: 'criatura', genero: null }, // KINEO-DESENHO-LEO-0111
  pip: { tipo: 'animal', genero: null }, bibi: { tipo: 'animal', genero: null }, ollie: { tipo: 'animal', genero: null }, // KINEO-DESENHO-LEO-0111
  preta: { tipo: 'animal', genero: null }, guilhermina: { tipo: 'animal', genero: null }, amora: { tipo: 'animal', genero: null }, // KINEO-DESENHO-LEO-0111
} // KINEO-DESENHO-LEO-0111
/** A forma de FichaDePersonagem (lib/cinematic/folhaDePersonagem) — espelhada aqui para o módulo seguir puro. */ // KINEO-DESENHO-LEO-0111
export interface FichaDoDesenho { nome: string; nucleo: string; tipo: 'humano' | 'animal' | 'criatura'; canonica: string; origem: 'autor' | 'deterministica' | 'modelo'; protagonista: boolean; genero: 'man' | 'woman' | null } // KINEO-DESENHO-LEO-0111
const escapaReDesenho = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') // KINEO-DESENHO-LEO-0111
/**
 * O elenco do desenho: o personagem ESCOLHIDO é sempre o protagonista, com a ficha canônica (origem 'autor'); do elenco que a casa leu
 * no roteiro fica no máximo UM coadjuvante (protagonista=false). Sai a ficha que leu o escolhido como outro ser (Leo = esquilo) e o
 * papel sem nome que é ele mesmo ("the little boy" numa história do Leo). Puro e idempotente.
 */ // KINEO-DESENHO-LEO-0111
export function elencoDoDesenho(personagem: KidsCharacter, elenco: ReadonlyArray<FichaDoDesenho> | null | undefined): FichaDoDesenho[] { // KINEO-DESENHO-LEO-0111
  const t = KIDS_CHARACTER_TIPO[personagem.id] // KINEO-DESENHO-LEO-0111
  const folha = personagem.sheet.toLowerCase() // KINEO-DESENHO-LEO-0111
  const protagonista: FichaDoDesenho = { nome: personagem.name, nucleo: personagem.name, tipo: t.tipo, canonica: personagem.sheet, origem: 'autor', protagonista: true, genero: t.genero } // KINEO-DESENHO-LEO-0111
  const secundarios = (elenco ?? []).filter((f) => { // KINEO-DESENHO-LEO-0111
    if (!f || typeof f.nome !== 'string') return false // KINEO-DESENHO-LEO-0111
    if (f.nome.toLowerCase() === personagem.name.toLowerCase() || f.canonica === personagem.sheet) return false // KINEO-DESENHO-LEO-0111 — o escolhido lido como outro ser
    if (/^the\s/i.test(f.nome) && new RegExp(`(?<![\\p{L}])${escapaReDesenho(String(f.nucleo ?? '').toLowerCase())}(?![\\p{L}])`, 'u').test(folha)) return false // KINEO-DESENHO-LEO-0111 — o papel sem nome que é ele mesmo
    return true // KINEO-DESENHO-LEO-0111
  }).slice(0, 1).map((f) => ({ ...f, protagonista: false })) // KINEO-DESENHO-LEO-0111 — teto de 2 fichas da casa (PERSONAGEM_MAX_PERSONAGENS)
  return [protagonista, ...secundarios] // KINEO-DESENHO-LEO-0111
} // KINEO-DESENHO-LEO-0111

// a ÂNCORA da história: o objeto-chave e o cenário, tirados das PALAVRAS (história em inglês primeiro, depois o 1º plano) — determinístico // KINEO-DESENHO-LEO-0111
export interface AncoraDoDesenho { objeto: string | null; nucleoObjeto: string | null; adjetivosObjeto: string[]; cenario: string | null; estacao: string | null } // KINEO-DESENHO-LEO-0111
const OBJETOS_DESENHO = 'teddy bear|mitten|glove|ball|kite|balloon|teddy|toy car|toy|seed|flower|umbrella|cookie|cup|shoelace|shoe|card|letter|sandcastle|blanket|apple|basket|hat|scarf|book|drum|tricycle|bicycle|bike|boat|shell|egg|nest|acorn|key|box|present|gift|cake|sock|crayon|painting|toothbrush|lantern|map|bucket|shovel|pumpkin|snowman|robot toy|doll|puzzle|treasure' // KINEO-DESENHO-LEO-0111
const CENARIOS_DESENHO = 'living room|park|garden|backyard|yard|beach|forest|woods|meadow|playground|kitchen|bedroom|classroom|school|farm|pond|lake|zoo|supermarket|street|village|jungle|mountain|hill|field|orchard|bakery|library' // KINEO-DESENHO-LEO-0111
const DETERMINANTE_DESENHO = String.raw`(?:a|an|the|his|her|their|its|my|one|\p{Lu}\p{Ll}+['’]s)` // KINEO-DESENHO-LEO-0111
const NAO_ADJETIVO_DESENHO = new Set(['and', 'or', 'of', 'with', 'very', 'so', 'that', 'this', 'to', 'in', 'on', 'at', 'was', 'is', 'were', 'had', 'has', 'found', 'saw', 'lost', 'little', 'own', 'same']) // KINEO-DESENHO-LEO-0111
const ESTACAO_RE = /\b(autumn|winter|summer)\b|\b(?:in|this|one|a|the|on a)\s+(spring|fall)\b/i // KINEO-DESENHO-LEO-0111
/** O objeto-chave (1º objeto da lista que o texto cita, com os adjetivos da 1ª menção detalhada) e o cenário (+ estação). */ // KINEO-DESENHO-LEO-0111
export function ancoraDaHistoria(texto: string | null | undefined): AncoraDoDesenho { // KINEO-DESENHO-LEO-0111
  const t = String(texto ?? '').replace(/\s+/g, ' ') // KINEO-DESENHO-LEO-0111
  const vazio: AncoraDoDesenho = { objeto: null, nucleoObjeto: null, adjetivosObjeto: [], cenario: null, estacao: null } // KINEO-DESENHO-LEO-0111
  if (!t.trim()) return vazio // KINEO-DESENHO-LEO-0111
  const est = ESTACAO_RE.exec(t) // KINEO-DESENHO-LEO-0111
  const estacao = est ? (est[1] ?? est[2]).toLowerCase().replace(/^fall$/, 'autumn') : null // KINEO-DESENHO-LEO-0111
  // objeto: o núcleo é o que aparece PRIMEIRO no texto; os adjetivos, os da menção com mais adjetivos desse núcleo // KINEO-DESENHO-LEO-0111
  const primeiro = new RegExp(String.raw`(?<![\p{L}])(${OBJETOS_DESENHO})s?(?![\p{L}])`, 'iu').exec(t) // KINEO-DESENHO-LEO-0111 — o objeto que a história cita primeiro
  const nucleo = primeiro ? primeiro[1].toLowerCase() : null // KINEO-DESENHO-LEO-0111
  let adjetivos: string[] = [] // KINEO-DESENHO-LEO-0111
  if (nucleo) for (const m of t.matchAll(new RegExp(String.raw`(?<![\p{L}])${DETERMINANTE_DESENHO}\s+((?:[a-z][a-z-]*,?\s+){0,3})${escapaReDesenho(nucleo)}(?![\p{L}])`, 'giu'))) { // KINEO-DESENHO-LEO-0111
    const adj = m[1].split(/[\s,]+/).map((w) => w.toLowerCase()).filter((w) => w && !NAO_ADJETIVO_DESENHO.has(w)) // KINEO-DESENHO-LEO-0111
    if (adj.length > adjetivos.length) adjetivos = adj // KINEO-DESENHO-LEO-0111 — a menção mais detalhada vence ("a striped colorful mitten" > "the mitten")
  } // KINEO-DESENHO-LEO-0111
  // cenário: "in the autumn park", "at the beach" — até 2 adjetivos colados // KINEO-DESENHO-LEO-0111
  const cen = new RegExp(String.raw`(?<![\p{L}])(?:in|at|to|through|around|across|into|near|by)\s+(?:the|a|an|his|her|their)\s+((?:[a-z][a-z-]*\s+){0,2})(${CENARIOS_DESENHO})(?![\p{L}])`, 'iu').exec(t) // KINEO-DESENHO-LEO-0111
  const adjCen = cen ? cen[1].trim().split(/\s+/).filter((w) => w && !NAO_ADJETIVO_DESENHO.has(w.toLowerCase())) : [] // KINEO-DESENHO-LEO-0111
  let cenario = cen ? [...adjCen, cen[2]].join(' ').toLowerCase() : null // KINEO-DESENHO-LEO-0111
  if (cenario && estacao && !cenario.includes(estacao)) cenario = `${cenario} in ${estacao}` // KINEO-DESENHO-LEO-0111
  return { objeto: nucleo ? [...adjetivos, nucleo].join(' ') : null, nucleoObjeto: nucleo, adjetivosObjeto: adjetivos, cenario, estacao } // KINEO-DESENHO-LEO-0111
} // KINEO-DESENHO-LEO-0111
/** A frase de continuidade que vai em TODA cena (positiva: o motor não tem negativo). null = a história não deu objeto nem cenário. */ // KINEO-DESENHO-LEO-0111
export function fraseDaAncora(a: AncoraDoDesenho | null | undefined): string | null { // KINEO-DESENHO-LEO-0111
  if (!a || (!a.objeto && !a.cenario && !a.estacao)) return null // KINEO-DESENHO-LEO-0111
  const partes: string[] = [] // KINEO-DESENHO-LEO-0111
  if (a.objeto) partes.push(`the same ${a.objeto}, identical colour and pattern in every shot`) // KINEO-DESENHO-LEO-0111
  if (a.cenario) partes.push(`the same ${a.cenario} setting`) // KINEO-DESENHO-LEO-0111
  if (a.estacao) partes.push(`the same ${a.estacao} season and weather`) // KINEO-DESENHO-LEO-0111
  return `Story continuity in every scene: ${partes.join('; ')}. ` // KINEO-DESENHO-LEO-0111
} // KINEO-DESENHO-LEO-0111
/** O personagem escolhido NA FRENTE de toda cena (o motor segue o 1º sujeito do prompt; a ficha no rabo perdia para o esquilo). */ // KINEO-DESENHO-LEO-0111
export function prefixoDoProtagonista(p: KidsCharacter): string { // KINEO-DESENHO-LEO-0111
  return `Main character in the foreground of this shot, clearly visible and doing the action: ${p.sheet}. Any animal or other character in this scene is secondary, smaller and beside ${p.name}, never replacing ${p.name}. ` // KINEO-DESENHO-LEO-0111
} // KINEO-DESENHO-LEO-0111
const SEM_GENTE_DESENHO = ' No people, no human figures and no faces anywhere in this shot.' // KINEO-DESENHO-LEO-0111 — espelho de lib/cinematic/personagemAjuste CLAUSULA_SEM_GENTE (o guardião confere)
const FICHA_REPETIDA_DESENHO = (sheet: string) => ` The same main character appears in this scene, consistent design: ${sheet}.` // KINEO-DESENHO-LEO-0111 — espelho de CLAUSULA_FICHA / sceneStyle / comPersonagemInfantil
const COR_PADRAO_DESENHO = 'red|blue|green|yellow|purple|violet|pink|orange|brown|black|white|grey|gray|golden|gold|silver|striped|stripy|spotted|dotted|polka-dot|checked|plaid|plain|knitted|woolly|wool|woolen|woollen|colorful|colourful|rainbow|multicolored|multicoloured|bright|dark|light|pale|shiny' // KINEO-DESENHO-LEO-0111
const NEVE_DESENHO_RE = /\b(snow-covered|snowy|snowfall|snowflakes?|snow|winter|wintry|frosty|frost|icy)\b/gi // KINEO-DESENHO-LEO-0111
const NEVE_NA_HISTORIA_RE = /\b(?:snow-covered|snowy|snowfall|snowflakes?|snow|winter|wintry|frosty|frost|icy)\b/i // KINEO-DESENHO-LEO-0111 — sem /g: o .test não guarda estado
const ESTACAO_QUENTE_RE = /\b(autumn|summer|spring)\b/gi // KINEO-DESENHO-LEO-0111
/** Objeto e estação concorrentes viram os da âncora ("a red mitten" → "a striped colorful mitten"; "in the snow" → "in the fallen autumn leaves"). */ // KINEO-DESENHO-LEO-0111
function semConcorrenteDaAncora(trecho: string, a: AncoraDoDesenho, historia: string): string { // KINEO-DESENHO-LEO-0111
  let s = trecho // KINEO-DESENHO-LEO-0111
  if (a.nucleoObjeto && a.adjetivosObjeto.length > 0) { // KINEO-DESENHO-LEO-0111
    const certo = a.adjetivosObjeto.join(' ') // KINEO-DESENHO-LEO-0111
    s = s.replace(new RegExp(String.raw`(?<![\p{L}])((?:(?:${COR_PADRAO_DESENHO})[\s,]+(?:and\s+)?){1,3})(${escapaReDesenho(a.nucleoObjeto)})(?![\p{L}])`, 'giu'), (todo, _adj, nucleo) => (todo.toLowerCase() === `${certo} ${a.nucleoObjeto}` ? todo : `${certo} ${nucleo}`)) // KINEO-DESENHO-LEO-0111
  } // KINEO-DESENHO-LEO-0111
  const h = historia.toLowerCase() // KINEO-DESENHO-LEO-0111
  if (a.estacao && a.estacao !== 'winter' && !NEVE_NA_HISTORIA_RE.test(h)) { // KINEO-DESENHO-LEO-0111 — a história não fala de neve: neve na cena é deriva
    const chao = a.estacao === 'autumn' ? 'fallen autumn leaves' : a.estacao === 'spring' ? 'spring blossoms' : 'summer sunshine' // KINEO-DESENHO-LEO-0111
    s = s.replace(NEVE_DESENHO_RE, (w) => (/^(snow|snowfall|snowflakes?)$/i.test(w) ? chao : a.estacao as string)) // KINEO-DESENHO-LEO-0111
  } // KINEO-DESENHO-LEO-0111
  if (a.estacao === 'winter' && !/\b(autumn|summer|spring)\b/i.test(h)) s = s.replace(ESTACAO_QUENTE_RE, 'winter') // KINEO-DESENHO-LEO-0111
  return s // KINEO-DESENHO-LEO-0111
} // KINEO-DESENHO-LEO-0111
/**
 * O ÚLTIMO toque no prompt de cada cena do desenho (depois do elenco/época da casa): (1) sai a cláusula "No people…" (o protagonista
 * está em TODA cena) e a ficha repetida no rabo; (2) objeto e estação concorrentes viram os da âncora (fora da ficha); (3) logo depois
 * da trava de estilo, o personagem escolhido como protagonista e a frase de continuidade. Puro e idempotente.
 */ // KINEO-DESENHO-LEO-0111
export function travarDesenhoInfantil(prompt: string, i: { personagem: KidsCharacter; ancora: AncoraDoDesenho | null; historia?: string | null }): string { // KINEO-DESENHO-LEO-0111
  const sheet = i.personagem.sheet // KINEO-DESENHO-LEO-0111
  const prefixo = prefixoDoProtagonista(i.personagem) // KINEO-DESENHO-LEO-0111
  const frase = fraseDaAncora(i.ancora) // KINEO-DESENHO-LEO-0111
  let p = String(prompt ?? '') // KINEO-DESENHO-LEO-0111
  p = p.split(prefixo).join('') // KINEO-DESENHO-LEO-0111 — idempotente: o bloco da frente é refeito uma vez só
  if (frase) p = p.split(frase).join('') // KINEO-DESENHO-LEO-0111
  p = p.split(SEM_GENTE_DESENHO.trim()).join('') // KINEO-DESENHO-LEO-0111
  p = p.split(FICHA_REPETIDA_DESENHO(sheet).trim().replace(/\.$/, '')).join('') // KINEO-DESENHO-LEO-0111 — a ficha já vai na frente (com ou sem o ponto: comPersonagemInfantil troca o ponto pela trava infantil)
  if (i.ancora) p = p.split(sheet).map((trecho) => semConcorrenteDaAncora(trecho, i.ancora as AncoraDoDesenho, String(i.historia ?? ''))).join(sheet) // KINEO-DESENHO-LEO-0111 — a ficha do personagem nunca é reescrita
  p = p.replace(/\s{2,}/g, ' ').replace(/\s+([.,])/g, '$1').replace(/\.\s*\./g, '.').replace(/\.\s*,/g, ',').trim() // KINEO-DESENHO-LEO-0111
  const trava = /^Film visual medium: [^.]*\.\s*/.exec(p) // KINEO-DESENHO-LEO-0111 — a trava de estilo (travarEstiloDoFilme) continua a 1ª coisa do prompt
  const cabeca = trava ? trava[0].replace(/\s*$/, ' ') : '' // KINEO-DESENHO-LEO-0111
  return `${cabeca}${prefixo}${frase ?? ''}${trava ? p.slice(trava[0].length) : p}` // KINEO-DESENHO-LEO-0111
} // KINEO-DESENHO-LEO-0111

/** O que a rota do filme decide sobre `kids_cartoon` (puro). Ausente = inativo (nada muda, byte a byte). */
export type DesenhoInfantil =
  | { ativo: false; recusa: null }
  | { ativo: false; recusa: { status: number; reason: string; error: string } }
  | { ativo: true; recusa: null; personagem: KidsCharacter; ficha: string; estilo: typeof KIDS_STYLE_ANCHOR }
export function desenhoInfantilDoPedido(i: { raw: unknown; engine: unknown; duration: unknown; aberto: boolean; texto: string }): DesenhoInfantil {
  if (i.raw === undefined || i.raw === null || i.raw === '') return { ativo: false, recusa: null }
  if (!i.aberto) return { ativo: false, recusa: { status: 404, reason: 'kids_cartoon_off', error: 'Kids cartoons are not available yet. Nothing was charged.' } }
  const personagem = kidsCharacter(i.raw)
  if (!personagem) return { ativo: false, recusa: { status: 400, reason: 'kids_cartoon_unknown_character', error: 'Pick one of the kids cartoon characters. Nothing was charged.' } }
  const engine = typeof i.engine === 'string' && i.engine.trim() ? i.engine.trim().toLowerCase() : KIDS_CARTOON_ENGINE
  if (engine !== KIDS_CARTOON_ENGINE) return { ativo: false, recusa: { status: 422, reason: 'kids_cartoon_engine', error: 'Kids cartoons are made on Seedance 1.5. Nothing was charged.' } }
  if (!isKidsCartoonDuration(i.duration)) return { ativo: false, recusa: { status: 422, reason: 'kids_cartoon_duration', error: 'Kids cartoons are 15 or 35 seconds long. Nothing was charged.' } }
  if (kidsContentRefusal(i.texto)) return { ativo: false, recusa: { status: 422, reason: 'kids_cartoon_content', error: KIDS_REFUSAL_MESSAGE.en } }
  return { ativo: true, recusa: null, personagem, ficha: personagem.sheet, estilo: KIDS_STYLE_ANCHOR }
}

// ── o selo de IA na legenda de postagem ──────────────────────────────────────────────────────────────────────────
/** A legenda pronta para postar (com o selo "Made with AI"): as plataformas exigem o rótulo de IA em conteúdo realista/gerado. */
export function kidsPostCaption(language: KidsCartoonLanguage, characterId: KidsCharacterId): string {
  const c = kidsCharacter(characterId) as KidsCharacter
  if (language === 'pt') return `Uma história de ${c.name} para os pequenos 🌈 Feito com IA (desenho 3D gerado por IA) em usekineo.com #FeitoComIA #DesenhoInfantil #HistoriaInfantil`
  if (language === 'es') return `Una historia de ${c.name} para los peques 🌈 Hecho con IA (dibujo 3D generado por IA) en usekineo.com #HechoConIA #CuentosInfantiles`
  return `A ${c.name} story for little ones 🌈 Made with AI (AI-generated 3D cartoon) at usekineo.com #MadeWithAI #KidsStories #AIgenerated`
}

// ── a tela do template (EN/PT/ES; o resto das línguas vê o inglês) ─────────────────────────────────────────────
// KINEO-DESENHO-NOTA9-2110 [TRAVA 8.2 — vai do fundador 21/10 "experiência no mínimo 9"] — o fluxo inteiro mora na tela clara do
// /kids-cartoon: personagem com rosto → ideia → a história aparece para revisar/editar → UMA linha de custo (o preço real do
// servidor para a duração) → um botão grande → progresso e o filme pronto com download, na MESMA tela. Nunca mais o /generate escuro.
export const KIDS_TEMPLATE_COPY = {
  en: {
    title: 'AI Cartoon Videos', lead: 'Pick a character, give a story idea and get a narrated 3D cartoon with captions — all on this page.',
    character: 'Character', idea: 'Story idea', ideaPlaceholder: 'e.g. learns to say sorry to a friend', ready: 'Or pick a ready idea',
    language: 'Narration language', duration: 'Length', write: 'Write my story', writing: 'Writing the story…', story: 'Your story',
    storyHint: 'Read it and change anything you like — the narrator says exactly this text.', make: 'Make my cartoon', starting: 'Starting…',
    caption: 'Post caption (with the AI label)', copy: 'Copy', copied: 'Copied', label: 'Made with AI — turn on the AI label when you post.',
    rules: 'Kids content stays innocent: no romance, violence, mocking or adult products.', again: 'Write another version',
    plans: 'See plans', shorter: 'Make it 15 seconds instead', back: 'Change the idea', captionsToggle: 'Captions on the video', captionsHint: 'Turn off to post without burned-in captions.',
    stepScenes: 'Drawing the scenes', stepVoice: 'Adding the voice and captions', stepReady: 'Your cartoon is ready',
    wait: 'Usually 3 to 6 minutes. You can close this page — we finish it and email you, and it stays in your library.',
    download: 'Download video', library: 'Open my library', another: 'Make another cartoon', failed: 'The cartoon did not finish', retry: 'Try again',
  },
  pt: {
    title: 'Vídeos de desenho com IA', lead: 'Escolha o personagem, dê a ideia da história e receba um desenho 3D narrado e com legenda — tudo nesta página.',
    character: 'Personagem', idea: 'Ideia da história', ideaPlaceholder: 'ex.: aprende a pedir desculpas a um amigo', ready: 'Ou escolha uma ideia pronta',
    language: 'Língua da narração', duration: 'Duração', write: 'Escrever minha história', writing: 'Escrevendo a história…', story: 'Sua história',
    storyHint: 'Leia e mude o que quiser — o narrador fala exatamente este texto.', make: 'Fazer meu desenho', starting: 'Começando…',
    caption: 'Legenda para postar (com o selo de IA)', copy: 'Copiar', copied: 'Copiado', label: 'Feito com IA — ligue o rótulo de IA ao postar.',
    rules: 'Conteúdo infantil é inocente: sem romance, violência, zombaria ou produto adulto.', again: 'Escrever outra versão',
    plans: 'Ver planos', shorter: 'Fazer com 15 segundos', back: 'Mudar a ideia', captionsToggle: 'Legenda no vídeo', captionsHint: 'Desligue para postar sem legenda queimada no vídeo.',
    stepScenes: 'Desenhando as cenas', stepVoice: 'Colocando a voz e a legenda', stepReady: 'Seu desenho está pronto',
    wait: 'Leva de 3 a 6 minutos. Pode fechar esta página — a gente termina, avisa por e-mail e ele fica na sua biblioteca.',
    download: 'Baixar vídeo', library: 'Abrir minha biblioteca', another: 'Fazer outro desenho', failed: 'O desenho não terminou', retry: 'Tentar de novo',
  },
  es: {
    title: 'Videos de dibujos con IA', lead: 'Elige el personaje, da la idea del cuento y recibe un dibujo 3D narrado y con subtítulos — todo en esta página.',
    character: 'Personaje', idea: 'Idea del cuento', ideaPlaceholder: 'ej.: aprende a pedir perdón a un amigo', ready: 'O elige una idea lista',
    language: 'Idioma de la narración', duration: 'Duración', write: 'Escribir mi cuento', writing: 'Escribiendo el cuento…', story: 'Tu cuento',
    storyHint: 'Léelo y cambia lo que quieras — el narrador dice exactamente este texto.', make: 'Hacer mi dibujo', starting: 'Empezando…',
    caption: 'Texto para publicar (con la etiqueta de IA)', copy: 'Copiar', copied: 'Copiado', label: 'Hecho con IA — activa la etiqueta de IA al publicar.',
    rules: 'El contenido infantil es inocente: sin romance, violencia, burlas ni productos para adultos.', again: 'Escribir otra versión',
    plans: 'Ver planes', shorter: 'Hacerlo de 15 segundos', back: 'Cambiar la idea', captionsToggle: 'Subtítulos en el video', captionsHint: 'Desactívalos para publicar sin subtítulos grabados en el video.',
    stepScenes: 'Dibujando las escenas', stepVoice: 'Poniendo la voz y los subtítulos', stepReady: 'Tu dibujo está listo',
    wait: 'Suele tardar de 3 a 6 minutos. Puedes cerrar esta página — lo terminamos, te avisamos por e-mail y queda en tu biblioteca.',
    download: 'Descargar video', library: 'Abrir mi biblioteca', another: 'Hacer otro dibujo', failed: 'El dibujo no terminó', retry: 'Intentar de nuevo',
  },
} as const
export type KidsTemplateCopy = { readonly [K in keyof (typeof KIDS_TEMPLATE_COPY)['en']]: string }
export function kidsTemplateCopy(language: string | null | undefined): KidsTemplateCopy {
  return language === 'pt' ? KIDS_TEMPLATE_COPY.pt : language === 'es' ? KIDS_TEMPLATE_COPY.es : KIDS_TEMPLATE_COPY.en
}

// ── KINEO-DESENHO-NOTA9-2110 — a linha de custo (o número vem do chamador: creditCostForDuration('cinematic_ai', true, s),
// a MESMA conta que o servidor debita; aqui só o texto) ────────────────────────────────────────────────────────────────
export const KIDS_PLANS_PATH = '/pricing'
type KidsLang = 'en' | 'pt' | 'es'
function kidsLang(l: string | null | undefined): KidsLang {
  return l === 'pt' || l === 'es' ? l : 'en'
}
function kidsNum(n: number, l: KidsLang): string {
  const locale = l === 'pt' ? 'pt-BR' : l === 'es' ? 'es-ES' : 'en-US'
  return Math.round(n).toLocaleString(locale)
}
function kidsCr(n: number, l: KidsLang): string {
  if (l === 'en') return n === 1 ? 'credit' : 'credits'
  return n === 1 ? 'crédito' : 'créditos'
}
/** A pílula de duração: "15 s · 9 credits". */
export function kidsDurationChip(language: string | null | undefined, seconds: number, cost: number): string {
  const l = kidsLang(language)
  return `${seconds} s · ${kidsNum(cost, l)} ${kidsCr(cost, l)}`
}
/** A ÚNICA linha de custo acima do botão. balance null = saldo ainda não lido (mostra só o preço; o servidor é a guarda final). */
export function kidsCostLine(language: string | null | undefined, i: { seconds: number; cost: number; balance: number | null }): { text: string; enough: boolean | null } {
  const l = kidsLang(language)
  const c = kidsNum(i.cost, l)
  const cr = kidsCr(i.cost, l)
  let head = `${i.seconds}-second cartoon · ${c} ${cr}`
  if (l === 'pt') head = `Desenho de ${i.seconds} segundos · ${c} ${cr}`
  if (l === 'es') head = `Dibujo de ${i.seconds} segundos · ${c} ${cr}`
  if (typeof i.balance !== 'number' || !Number.isFinite(i.balance)) return { text: head, enough: null }
  const b = kidsNum(i.balance, l)
  if (i.balance < i.cost) {
    if (l === 'pt') return { enough: false, text: `Você precisa de ${c} ${cr} — você tem ${b}.` }
    if (l === 'es') return { enough: false, text: `Necesitas ${c} ${cr} — tienes ${b}.` }
    return { enough: false, text: `You need ${c} ${cr} — you have ${b}.` }
  }
  const left = kidsNum(i.balance - i.cost, l)
  if (l === 'pt') return { enough: true, text: `${head} · você tem ${b} → sobram ${left}` }
  if (l === 'es') return { enough: true, text: `${head} · tienes ${b} → te quedan ${left}` }
  return { enough: true, text: `${head} · you have ${b} → ${left} left` }
}

// ── KINEO-DESENHO-NOTA9-2110 — os pedidos do filme, montados aqui (puro) com os MESMOS campos que o /generate manda ────────
/** O corpo do POST /api/generate-video-cinematic: o do /generate no Seedance 1.5 com "Use my script as is" e kids_cartoon. */
export function kidsCinematicPayload(i: { generationId: string; script: string; request: Pick<KidsCartoonRequest, 'character' | 'language' | 'duration'>; captions?: boolean }) {
  return {
    generationId: i.generationId,
    prompt: String(i.script ?? '').trim(),
    duration: i.request.duration,
    language: i.request.language,
    script_mode: 'verbatim' as const,
    engine: KIDS_CARTOON_ENGINE,
    kids_cartoon: i.request.character,
    ...(i.captions === false ? { kids_captions: false as const } : {}), // KINEO-DESENHO-SOM-2110 — o botão "Captions on the video" desligado; ligado (padrão) = corpo de antes
  }
}
/** O corpo do POST /api/compose do caminho clássico (o mesmo composePayload do /generate para um filme do Seedance 1.5). */
export function kidsComposePayload(i: { generationId: string; clipUrls: string[]; voiceover: string; captions: string[]; duration: number; topic: string; quality: string; language: string; speed: number | null }) {
  return {
    generationId: i.generationId,
    clip_urls: i.clipUrls,
    voiceover_script: i.voiceover,
    scene_captions: i.captions,
    duration: i.duration,
    topic: i.topic,
    quality: i.quality,
    language: i.language,
    ...(typeof i.speed === 'number' ? { speed: i.speed } : {}),
  }
}

// ── KINEO-DESENHO-SOM-2110 [TRAVA 8.2 — vai do fundador 21/10 "experiência no mínimo 9"] — o SOM do desenho infantil ──────────────
// Fundador deu 9,5 aos dois curtas do Ollie: "o que me incomodou foi a trilha, tem que ser diferente; o resto está perfeito". E a
// pesquisa de mercado (docs/MERCADO-DESENHO-INFANTIL-OPCOES-2026-10-21.md): o padrão é um NARRADOR CONTADOR DE HISTÓRIAS caloroso,
// não voz de criança. Tudo aqui vale SÓ para o filme com `kids_cartoon` (Seedance 1.5); filme comum = byte a byte o de antes.
//   · VOZ: a rota do filme põe `vertical = KIDS_NARRATION_VERTICAL` no pedido infantil; lib/narration/niche-mapping devolve a persona
//     KIDS_NARRATION_PERSONA (nova, a contadora calorosa — 2,55 × 0,97 = 2,47 pal/s, dentro da régua de 2,5 do Seedance 1.5) antes de
//     qualquer palpite por palavra-chave (que mandava "learns…" para o narrador de documentário). Vai ASSINADA no claim
//     (`narration_voice`, também no 35 s), então a montagem, a retomada e o resgate do cron falam a mesma voz.
//   · TRILHA: lib/musicDirection devolve a direção 'kids' para esse `vertical` (Lyria: música leve de programa infantil — ukulele,
//     glockenspiel, xilofone, piano suave, alegre, sem bateria/épico/tensão) e o /api/compose baixa a trilha para KIDS_MUSIC_VOLUME.
//   · LEGENDA: o botão "Captions on the video" da tela (ligado por padrão). Desligado, o pedido manda `kids_captions:false`, a rota
//     assina `kids_cartoon.captions=false` no claim e o /api/compose tira as legendas faladas (trilhas 5/7). Marca d'água fica.
export const KIDS_SOM_MARK = 'KINEO-DESENHO-SOM-2110'
/** O `vertical` do filme infantil (literal espelhado em lib/narration/niche-mapping.ts e lib/musicDirection.ts — o guardião confere). */
export const KIDS_NARRATION_VERTICAL = 'kids_story'
/** A persona do narrador infantil: a contadora de histórias calorosa (lib/narration/personas.ts, voz nova). */
export const KIDS_NARRATION_PERSONA = 'emotional-storyteller'
/** Volume da trilha no desenho infantil (o filme comum fica em 12% — lib/compose MUSIC_VOLUME). */
export const KIDS_MUSIC_VOLUME = '8%'
/** O que vai assinado no claim do filme infantil (a montagem e o resgate do cron leem daqui). */
export function kidsClaimField(i: { character: KidsCharacterId; captions: boolean }): { character: KidsCharacterId; captions: boolean } {
  return { character: i.character, captions: i.captions !== false }
}
/** O desenho infantil assinado no claim (response.kids_cartoon). null = filme comum (nada muda) ou campo inválido. */
export function desenhoDoClaim(response: unknown): { character: KidsCharacterId; captions: boolean } | null {
  const r = response && typeof response === 'object' ? (response as Record<string, unknown>) : null
  const k = r?.kids_cartoon
  if (!k || typeof k !== 'object' || Array.isArray(k)) return null
  const { character, captions } = k as Record<string, unknown>
  if (!isKidsCharacterId(character) || typeof captions !== 'boolean') return null
  return { character, captions }
}
/** A trilha (áudio da trilha 8 do RenderScript) mais baixa no desenho infantil. Puro: devolve um source novo; o resto intacto. */
export function kidsMusicQuieter<T extends Record<string, unknown>>(source: T): { source: T; changed: number } {
  const els = source && typeof source === 'object' ? (source as { elements?: unknown }).elements : undefined
  if (!Array.isArray(els)) return { source, changed: 0 }
  let changed = 0
  const next = els.map((e) => {
    if (e && typeof e === 'object' && (e as { type?: unknown }).type === 'audio' && Number((e as { track?: unknown }).track) === 8) { changed++; return { ...(e as Record<string, unknown>), volume: KIDS_MUSIC_VOLUME } }
    return e
  })
  return { source: { ...source, elements: next }, changed }
}
