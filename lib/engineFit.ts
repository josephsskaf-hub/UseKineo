// KINEO-ENGINE-FIT-2026-09-09 — O KINEO 1 NÃO CONTA HISTÓRIA.
//
// Relatório dos motores de 09/09 (docs/RELATORIO-MOTORES-2026-09-09.md): o
// Kineo 1 (banco de imagens Pixabay + voz) é 72% dos filmes de cliente e tirou
// a pior nota de fidelidade (35/100) por UM motivo: pedido de FICÇÃO. "Benny, o
// coelhinho, acha um ovo dourado" virou coelho real + ovo de geladeira; um
// conto de terror em urdu virou aranha + catedral + água-viva. Banco de imagens
// só serve para fatos, lugares, objetos e documentário — nunca para personagem,
// enredo, infantil, animação.
//
// Este módulo é PURO (sem imports) para o guardião executá-lo em sandbox. Ele
// não bloqueia sozinho: devolve um veredito que o servidor transforma em 409
// com sugestão (Seedance, custo real) e que a tela transforma em UMA escolha
// ("trocar" ou "manter"). O cliente sempre pode manter — nunca é barrado.
//
// Falha FECHADA para o lado de não incomodar: só dispara com sinal FORTE ou
// com dois sinais MÉDIOS. Fatos, notícias, história, finanças, ciência, "top 5"
// passam direto.

export type EngineFitVerdict =
  | { verdict: 'ok'; signals: string[] }
  | { verdict: 'stock_cannot_tell'; reason: string; signals: string[] }

// Sinal FORTE — basta um.
const STRONG: Array<[RegExp, string]> = [
  [/\bonce upon a time\b/i, 'once_upon'],
  // KINEO-FICCAO-PT-ES-2026-09-12 — 4 filmes de 12/09 (Lumi e Pipo, historinha infantil em PT) passaram sem aviso: o léxico era só inglês.
  [/\b(era uma vez|havia uma vez|[ée]rase una vez|hab[íi]a una vez)\b/i, 'once_upon_ptes'],
  [/\b(desenho animado|desenhos animados|dibujos animados|historinha|hist[óo]ria infantil|v[íi]deo infantil|cuento infantil|para crian[çc]as|para ni[ñn]os|infantil educativ[oa])\b/i, 'kids_content_ptes'],
  [/\b(bedtime|fairy)\s*tale|\bfairytale\b|\bnursery rhyme\b|\bbedtime story\b/i, 'fairy_tale'],
  [/\b(3d|3-d)\s*(animated|animation|cartoon)\b|\bcartoon\b|\banimated\s+(short|film|story|video|nursery|rhyme)\b|\banime\b|\bpixar\b|\bdisney[- ]style\b/i, 'animation_requested'],
  [/\b(for|to)\s+(kids|children|toddlers|preschoolers)\b|\bkids'?\s+(story|song|video|cartoon)\b|\bchildren'?s\s+(story|book|song)\b/i, 'kids_content'],
  [/\b(dragon|unicorn|princess|prince charming|wizard|witch|fairy|elf|elves|goblin|troll|talking\s+\w+|magic(al)?\s+(kingdom|forest|egg|wand))\b/i, 'fantasy_creature'],
]

// Sinal MÉDIO — precisa de dois.
const MEDIUM: Array<[RegExp, string]> = [
  // KINEO-FICCAO-PT-ES-2026-09-12
  [/\b(personagens?|personajes?|criaturas?|amigos muito curiosos|dois amigos|dos amigos)\b/i, 'character_ptes'],
  [/\b(disse|sussurrou|gritou|perguntou|respondeu|dijo|susurr[óo]|grit[óo]|pregunt[óo]|respondi[óo])\b/i, 'dialogue_verb_ptes'],
  // nome próprio de personagem + verbo de enredo ("Benny finds", "Roland walks")
  [/\b[A-Z][a-z]{2,}(?:,\s+the\s+[a-z\s-]{3,30})?\s+(finds|found|discovers|meets|met|decides|decided|wakes|woke|runs|ran|whispers|whispered|opens|opened|stares|stared|smiles|smiled)\b/, 'named_character_action'],
  // diálogo com aspas
  [/["“][^"”]{6,}["”]\s*(,|\.)?\s*(he|she|they|it)\s+(said|whispered|shouted|asked|replied)\b|\b(said|whispered|shouted|asked|replied)\s*[:,]?\s*["“]/i, 'dialogue'],
  // narrativa em primeira pessoa com tempo de enredo
  [/\b(i|we)\s+(heard|saw|felt|opened|ran|woke|found|whispered|screamed|realized|knocked)\b/i, 'first_person_narrative'],
  // horror/suspense de enredo (não documental)
  [/\b(haunted|ghost|creature|monster|possessed|cursed|the door creaked|footsteps behind|something moved)\b/i, 'horror_plot'],
  // tempo de fábula
  [/\b(one (day|night|morning)|the next (day|morning|night)|suddenly|until one day|and then,)\b/i, 'story_time'],
  // nome inventado de três partes + descrição ("Roland Pernicus Ozxnard, a rough old man")
  [/\b[A-Z][a-z]+\s+[A-Z][a-z]+\s+[A-Z][a-z]+,\s+(a|an|the)\s+[a-z]/, 'invented_character'],
  // gesto de personagem (verbo emotivo com pronome) — documentário diz "he bought", ficção diz "he smiles"
  [/\b(he|she)\s+(smiles|smiled|grins|grinned|nods|nodded|shrugs|shrugged|whispers|whispered|opens his|opens her|opened his|opened her|stares|stared|sighs|sighed)\b/i, 'character_gesture'],
  // personagens animais/objetos humanizados
  [/\b(little|tiny|brave|clever|lonely|curious)\s+(bunny|rabbit|bear|fox|mouse|dragon|robot|puppy|kitten|owl|turtle|train|car)\b/i, 'anthropomorphic'],
  // pedido explícito de estilo visual de ficção
  [/\b(fantasy|fictional|imaginary|whimsical|storybook|cinematic short film about a (boy|girl|man|woman))\b/i, 'fiction_style'],
]

// Contra-sinais documentais: se dominam, não é ficção (um "one day" numa
// notícia não vira conto).
const DOCUMENTARY: Array<RegExp> = [
  /\b(in\s+1[0-9]{3}|in\s+20[0-2][0-9]|according to|scientists|researchers|study|studies|nasa|fbi|government|billion|million|percent|%|history of|the truth about|top\s+\d+|facts?\b|documentary|explained|how does|why does|what happens)\b/i,
]

export function classifyEngineFit(text: string): EngineFitVerdict {
  const t = (text || '').replace(/\s+/g, ' ').trim().slice(0, 6000)
  if (t.length < 20) return { verdict: 'ok', signals: [] }
  const signals: string[] = []
  let strong = false
  for (const [re, name] of STRONG) if (re.test(t)) { signals.push(name); strong = true }
  let medium = 0
  for (const [re, name] of MEDIUM) if (re.test(t)) { signals.push(name); medium++ }
  const documentary = DOCUMENTARY.filter((re) => re.test(t)).length
  // Documentário com um sinal médio solto continua documentário.
  if (!strong && medium < 2) return { verdict: 'ok', signals }
  if (!strong && documentary >= 2 && medium < 3) return { verdict: 'ok', signals }
  const reason = strong
    ? 'This is a story with characters or an animated look. Stock footage can only show real places and objects — it cannot act out a plot.'
    : 'This reads like a narrative with characters and scenes. Stock footage cannot follow a plot; a generative engine draws each scene from your script.'
  return { verdict: 'stock_cannot_tell', reason, signals }
}
