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
export const KIDS_CARTOON_LIVE = false
/** Interruptor das PÁGINAS públicas (EN/PT). false = 404 + fora do sitemap/llms.txt (o IndexNow do cron só envia o que está no sitemap). */
export const KIDS_CARTOON_PAGES_LIVE = false

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
export const KIDS_CARTOON_LANGUAGES = ['en', 'pt', 'es'] as const
export type KidsCartoonLanguage = (typeof KIDS_CARTOON_LANGUAGES)[number]
export const KIDS_CARTOON_LANGUAGE_NAMES: Record<KidsCartoonLanguage, string> = { en: 'English', pt: 'Brazilian Portuguese', es: 'Spanish' }
export function isKidsCartoonLanguage(raw: unknown): raw is KidsCartoonLanguage {
  return typeof raw === 'string' && (KIDS_CARTOON_LANGUAGES as readonly string[]).includes(raw)
}
export function isKidsCartoonDuration(raw: unknown): raw is KidsCartoonDuration {
  return typeof raw === 'number' && (KIDS_CARTOON_DURATIONS as readonly number[]).includes(raw)
}

// ── os 6 personagens fixos (descrição canônica em inglês: é ela que vai em TODA cena) ─────────────────────────────
export type KidsCharacterId = 'leo' | 'mia' | 'dino' | 'pip' | 'bibi' | 'ollie'
export interface KidsCharacter {
  id: KidsCharacterId
  /** O nome (igual em toda língua: é ele que o escritor usa e que a cena reconhece). */
  name: string
  kind: { en: string; pt: string; es: string }
  /** A FICHA canônica (começa por "Nome, …" — lib/cinematic/sceneStyle mentionsStoryCharacter reconhece o nome). */
  sheet: string
  /** Retrato fixo gerado por nós. '' = placeholder até o teste aprovar os retratos (o template mostra a inicial). */
  portrait: string
}
export const KIDS_CHARACTERS: readonly KidsCharacter[] = [
  { id: 'leo', name: 'Leo', kind: { en: 'Boy', pt: 'Menino', es: 'Niño' }, portrait: '',
    sheet: 'Leo, a cheerful 5-year-old boy 3D cartoon character with curly brown hair, big round green eyes, rosy cheeks, a bright yellow raincoat over a blue striped shirt and red rubber boots' },
  { id: 'mia', name: 'Mia', kind: { en: 'Girl', pt: 'Menina', es: 'Niña' }, portrait: '',
    sheet: 'Mia, a curious 5-year-old girl 3D cartoon character with two puffy black pigtails tied with pink ribbons, big brown eyes, a small gap-tooth smile, a purple dress with white polka dots and white sneakers' },
  { id: 'dino', name: 'Dino', kind: { en: 'Little dinosaur', pt: 'Dinossaurinho', es: 'Dinosaurito' }, portrait: '',
    sheet: 'Dino, a friendly little green dinosaur 3D cartoon character with a round belly, tiny arms, big shiny amber eyes, soft orange spots on his back and a short wobbly tail' },
  { id: 'pip', name: 'Pip', kind: { en: 'Puppy', pt: 'Filhote de cachorro', es: 'Cachorrito' }, portrait: '',
    sheet: 'Pip, a fluffy cream-colored puppy 3D cartoon character with floppy brown ears, a black button nose, big blue eyes and a red collar with a little gold bell' },
  { id: 'bibi', name: 'Bibi', kind: { en: 'Bunny', pt: 'Coelhinha', es: 'Conejita' }, portrait: '',
    sheet: 'Bibi, a little white bunny 3D cartoon character with long pink-lined ears, a round fluffy tail, big violet eyes and a tiny yellow scarf' },
  { id: 'ollie', name: 'Ollie', kind: { en: 'Baby elephant', pt: 'Elefantinho', es: 'Elefantito' }, portrait: '',
    sheet: 'Ollie, a baby elephant 3D cartoon character with soft grey skin, big flappy ears with pink insides, a short curly trunk and a tiny green cap' },
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
  if (!isKidsCartoonLanguage(r.language)) return { ok: false, error: 'Pick English, Portuguese or Spanish.', field: 'language' }
  const duration = typeof r.duration === 'string' ? Number(r.duration) : r.duration
  if (!isKidsCartoonDuration(duration)) return { ok: false, error: 'Pick 15 or 35 seconds.', field: 'duration' }
  const idea0 = kidsIdea(r.ideaId)
  const typed = typeof r.idea === 'string' ? r.idea.replace(/[\u0000-\u001f\u007f​-‍⁠﻿]/g, ' ').replace(/\s+/g, ' ').trim() : ''
  if (typed.length > KIDS_IDEA_MAX_CHARS) return { ok: false, error: `Keep the story idea under ${KIDS_IDEA_MAX_CHARS} characters.`, field: 'idea' }
  if (/https?:\/\/|www\./i.test(typed)) return { ok: false, error: 'Describe the story in words, not a link.', field: 'idea' }
  const idea = typed || (idea0 ? idea0[r.language] : '')
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
    `Length: between ${i.minWords} and ${i.maxWords} words. Short, simple sentences a small child understands.`,
    `The main character is ${c.name} (${c.sheet}). Name ${c.name} in the first sentence and keep ${c.name} in every part of the story.`,
    'Keep it innocent, kind, warm and a little funny: no romance, no nudity, no violence, no weapons, no danger or scary moments, no making fun of anyone, no brands, no real people, no adult products.',
    'Shape: a happy opening, a small everyday problem, a gentle solution, and one sentence with a kind lesson. End with one short friendly question to the child watching.',
  ].join(' ')
  const user = `Story idea: ${c.name} ${i.request.idea}`
  return { system, user }
}

/** Palavras faladas do texto (o mesmo corte por espaços que a régua da casa conta). */
export function kidsWordCount(text: string): number {
  return String(text ?? '').trim().split(/\s+/).filter(Boolean).length
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

// ── a tela do template (EN/PT; o resto das línguas vê o inglês) ─────────────────────────────────────────────────
export const KIDS_TEMPLATE_COPY = {
  en: {
    title: 'AI Kids Cartoon Stories', lead: 'Type a story idea, pick a character and get a narrated 3D cartoon with captions.',
    character: 'Character', idea: 'Story idea', ideaPlaceholder: 'e.g. learns to say sorry to a friend', ready: 'Or pick a ready idea',
    language: 'Narration language', duration: 'Length', write: 'Write my story', writing: 'Writing the story…', story: 'Your story',
    make: 'Make my cartoon', makeNote: 'Opens the Studio on Seedance 1.5 with your story. The price shows on the Generate button there.',
    caption: 'Post caption (with the AI label)', copy: 'Copy', copied: 'Copied', label: 'Made with AI — turn on the AI label when you post.',
    rules: 'Kids content stays innocent: no romance, violence, mocking or adult products.', again: 'Write another version',
  },
  pt: {
    title: 'Histórias infantis em desenho 3D com IA', lead: 'Escreva a ideia da história, escolha o personagem e receba um desenho 3D narrado e com legenda.',
    character: 'Personagem', idea: 'Ideia da história', ideaPlaceholder: 'ex.: aprende a pedir desculpas a um amigo', ready: 'Ou escolha uma ideia pronta',
    language: 'Língua da narração', duration: 'Duração', write: 'Escrever minha história', writing: 'Escrevendo a história…', story: 'Sua história',
    make: 'Fazer meu desenho', makeNote: 'Abre o Studio no Seedance 1.5 com a sua história. O preço aparece no botão de gerar de lá.',
    caption: 'Legenda para postar (com o selo de IA)', copy: 'Copiar', copied: 'Copiado', label: 'Feito com IA — ligue o rótulo de IA ao postar.',
    rules: 'Conteúdo infantil é inocente: sem romance, violência, zombaria ou produto adulto.', again: 'Escrever outra versão',
  },
} as const
export function kidsTemplateCopy(language: string | null | undefined) {
  return language === 'pt' ? KIDS_TEMPLATE_COPY.pt : KIDS_TEMPLATE_COPY.en
}
