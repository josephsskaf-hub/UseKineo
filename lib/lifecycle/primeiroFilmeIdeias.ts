// ═══ KINEO-EMAILS-VENDA-2026-10-13 — AÇÃO 3: as 3 ideias do lembrete do 1º filme, no TEMA da pessoa, a 1 clique ═══════
//
// NÃO É E-MAIL NOVO. A carta do 1º filme já existe (app/api/cron/send-activation-nudge, cron "40 * * * *", janela 1–6 h
// depois do cadastro, 1 por pessoa, supressão cruzada de 24 h) e já leva a ideia que a pessoa digitou antes do cadastro
// (KINEO-LEMBRETE-COM-A-IDEIA-2026-10-03). Criar uma segunda carta de ativação seria mandar dois e-mails de "faça seu
// 1º filme" no mesmo dia. Esta peça MELHORA a que existe, nos dois pontos que a medição de 13/10 mostrou fracos:
//
//   MEDIDO (13/10, cadastros externos de 30 dias): 246 receberam a carta (mediana 1,5 h após o cadastro) e só 7 (2,8%)
//   fizeram um filme depois; desde 05/10, com o evento activation_nudge_sent, 29 envios → 1 filme, e o placar de cliques
//   (utm_campaign d0_activation*) tem ~2 chegadas em 30 dias. Ou seja: a carta chega na hora certa e ninguém clica.
//
//   (1) AS 3 IDEIAS ERAM DE PRATELEIRA. Vinham do pool viral (lib/viralTopics, "Bermuda Triangle" para quem chegou pela
//       página de terror). Agora: se a pessoa se cadastrou por uma página de nicho (signup_utm_campaign
//       push63_niche_<slug>, gravada no perfil — 24 de terror, 3 de geografia, 2 de fitness… nos 341 sem filme), as 3
//       ideias são as da PRÓPRIA página que ela viu (espelho verbatim de app/free-ai-shorts/[niche]/page.tsx NICHES; o
//       guardião confere cada frase lá). Sem nicho: 3 ideias CAMPEÃS da vitrine — filmes reais do Seedance 1.5 que a
//       casa fez (lib/seo/houseFilmIdeas.ts, posse do fundador confirmada), não o pool genérico.
//   (2) O LINK NÃO ESCOLHIA MOTOR NEM DURAÇÃO. Abria o compositor no padrão (35 s), que o saldo de entrada pode não
//       pagar. Agora cada link abre o Studio com a ideia na caixa, Seedance 1.5, 15 s (`?engine=seedance&duration=15`,
//       lido por lib/creationHandoff.ts — o 15 s só vale junto com engine=seedance). Prefill, NUNCA create_intent: nada
//       gera sozinho e nenhum crédito é dado como isca.
//
// MÓDULO PURO (só imports relativos e puros): a rota e o guardião scripts/test-emails-venda-2026-10-13.mjs executam as
// MESMAS funções.
import { composerUrl } from './composerUrl'
import { seedanceGalleryFilms } from '../seo/houseFilmIdeas'

export const PRIMEIRO_FILME_IDEIAS_VERSION = 'primeiro_filme_ideias_2026_10_13' as const
/** O motor e a duração do 1º filme (o Seedance de 15 s é a entrada da casa desde KINEO-FILME-GRATIS-15S-2026-09-29). */
export const PRIMEIRO_FILME_ENGINE = 'seedance' as const
export const PRIMEIRO_FILME_SECONDS = 15 as const
/** Campanhas separadas no placar: ideia do nicho × ideia campeã da vitrine (a do pool segue d0_activation_topic). */
export const PRIMEIRO_FILME_CAMPANHA_NICHO = 'd0_activation_niche' as const
export const PRIMEIRO_FILME_CAMPANHA_VITRINE = 'd0_activation_showcase' as const

/** Espelho VERBATIM das 3 primeiras ideias (sem escape, até 120 caracteres) de cada nicho da página
 *  app/free-ai-shorts/[niche]/page.tsx (NICHES[slug].ideas). A página não é importável (é página, puxa componentes); o
 *  guardião lê a página e exige que cada frase daqui exista lá. 'localbusiness' fica fora: é a página de anúncio. */
export const NICHE_FIRST_FILM_IDEAS: Readonly<Record<string, { label: string; ideas: readonly [string, string, string] }>> = {
  money: { label: "Money & Finance", ideas: ["$200 a month makes you a millionaire — here’s the exact math", "The money habit 90% of millionaires share", "Why your savings account is quietly making you poorer"] },
  faith: { label: "Faith & Devotional", ideas: ["The verse for anyone who is tired of pretending they are fine", "What Psalm 34:18 actually promises the brokenhearted", "3 minutes of scripture for when the answer is still no"] },
  mystery: { label: "Mystery & Unsolved", ideas: ["The disappearance nobody solved in 70 years", "The signal from space scientists still can’t explain", "The island the government bans humans from"] },
  history: { label: "History", ideas: ["Why ancient Rome collapsed in 5 steps", "The empire that fell in a single day", "The invention that accidentally changed the world"] },
  motivation: { label: "Motivation & Mindset", ideas: ["The 5am habit that rewires your brain", "Why discipline beats motivation every time", "The 1% rule that compounds into everything"] },
  facts: { label: "Mind-Blowing Facts", ideas: ["The everyday object that’s secretly 1,000 years old", "Your body does this 100,000 times a day without you noticing", "The animal that’s technically immortal"] },
  ai: { label: "AI & Tech", ideas: ["The AI tool replacing 10 jobs right now", "5 AI tools that feel illegal to know", "How AI will change your job in 2 years"] },
  geography: { label: "Countries & Places", ideas: ["The country where it’s illegal to die", "The city built on top of another city", "The island where snakes outnumber people"] },
  space: { label: "Space", ideas: ["What NASA found on Mars they never announced", "The sound a black hole actually makes", "Why a day on Venus is longer than its year"] },
  truecrime: { label: "True Crime", ideas: ["The cold case solved by a single typo", "The killer who mailed the police his own confession", "The 911 call that proved she did it"] },
  psychology: { label: "Psychology Facts", ideas: ["Say this one sentence and people instantly trust you", "The reason your brain remembers embarrassment forever", "Why silence makes people tell you everything"] },
  sports: { label: "Sports Legends", ideas: ["The shot that ended a career in one second", "The athlete who was told he’d never walk again", "The 13 seconds that rewrote sports history"] },
  science: { label: "Science Facts", ideas: ["There’s enough gold in the ocean to make everyone rich — here’s the catch", "A teaspoon of a neutron star weighs 6 billion tons", "Your atoms are older than the sun"] },
  conspiracy: { label: "Conspiracies & Cover-ups", ideas: ["The “accident” that destroyed the evidence days before the trial", "The document declassified 50 years too late", "The town that doesn’t officially exist on any map"] },
  luxury: { label: "Luxury & Billionaire", ideas: ["What a $500 million yacht actually costs to run per day", "The hotel room that costs more per night than a house", "How billionaires legally pay almost zero tax"] },
  stoicism: { label: "Stoicism & Philosophy", ideas: ["The Stoic rule that kills anxiety in 10 seconds", "Why caring less makes people respect you more", "The one question Stoics ask before reacting"] },
  crypto: { label: "Crypto & Investing", ideas: ["The $100 Bitcoin bet that turned into a fortune", "Why most people buy crypto at exactly the wrong time", "The investing mistake that quietly wipes out beginners"] },
  business: { label: "Business & Entrepreneurship", ideas: ["The business that made millions with almost no employees", "Why 90% of startups die in the first year", "The pricing trick that doubled their revenue overnight"] },
  fitness: { label: "Fitness & Gym Motivation", ideas: ["The 20-minute habit that changes your body in 30 days", "The mindset shift that makes discipline automatic", "3 mistakes quietly killing your gains"] },
  relationships: { label: "Relationships & Dating", ideas: ["The one text that instantly changes how they see you", "Why the person who cares less holds the power", "The green flag almost everyone ignores"] },
  horror: { label: "Scary Stories & Horror", ideas: ["The 3am rule you should never break", "The last text she sent before she vanished", "The house that no delivery driver will return to"] },
  celebrity: { label: "Celebrity & Fame", ideas: ["The star who went from broke to a billion dollars", "The contract clause that ended a career overnight", "The role that was secretly turned down 7 times"] },
  animals: { label: "Animals & Nature", ideas: ["The animal that can survive being frozen solid", "Why octopuses might be the closest thing to aliens", "The tiny creature that could outlive the sun"] },
  health: { label: "Health & Longevity", ideas: ["The 30-second habit that adds years to your life", "What happens to your body when you walk daily", "The nutrient 90% of people are quietly missing"] },
  cars: { label: "Cars & Supercars", ideas: ["The $3 million car only 10 people can buy", "Why this engine should be illegal", "The car that depreciates faster than anything"] },
  gaming: { label: "Gaming", ideas: ["The game that was never supposed to exist", "The speedrun record thought to be impossible", "The easter egg hidden for 15 years"] },
  movies: { label: "Movie & Film Facts", ideas: ["The movie scene that was completely unscripted", "The role that was recast at the last minute", "Why this blockbuster almost never got made"] },
  food: { label: "Food & Cooking Facts", ideas: ["The food that never actually expires", "Why restaurants add this one secret ingredient", "The dish that started as a mistake"] },
  travel: { label: "Travel & Places", ideas: ["The place tourists are banned from entering", "The town that only exists for one month a year", "The hidden beach locals keep secret"] },
}

export type IdeiaPronta = { titulo: string; gancho: string; href: string }
export type FonteDasIdeias = 'niche' | 'showcase' | 'none'

/** O nicho do cadastro, lido de `profiles.signup_utm_campaign` (push63_niche_<slug>). null = sem nicho conhecido. */
export function nichoDoCadastro(campanha: unknown): string | null {
  if (typeof campanha !== 'string') return null
  const m = /^push63_niche_([a-z]+)$/.exec(campanha.trim().toLowerCase())
  if (!m) return null
  return Object.prototype.hasOwnProperty.call(NICHE_FIRST_FILM_IDEAS, m[1]) ? m[1] : null
}

/** Acrescenta o motor e a duração do 1º filme a um link do compositor (mantém utm e prompt). */
export function comMotorDeEntrada(href: string): string {
  try {
    const u = new URL(href)
    u.searchParams.set('engine', PRIMEIRO_FILME_ENGINE)
    u.searchParams.set('duration', String(PRIMEIRO_FILME_SECONDS))
    return u.toString()
  } catch {
    return href
  }
}

/** A frase que vira prefill: a 1ª frase da ideia do filme se couber em 120; senão o título do filme. */
function fraseDoFilme(ideia: string, titulo: string): string {
  const primeira = (ideia.match(/^[^.!?]+[.!?]/)?.[0] ?? ideia).trim()
  return primeira.length >= 12 && primeira.length <= 120 ? primeira : titulo.trim()
}

/** 3 ideias campeãs da vitrine: filmes REAIS do Seedance 1.5 da casa ([] se a vitrine não der 3). */
export function ideiasCampeas(): Array<{ titulo: string; gancho: string }> {
  try {
    const out: Array<{ titulo: string; gancho: string }> = []
    const vistos = new Set<string>()
    for (const f of seedanceGalleryFilms()) {
      const titulo = fraseDoFilme(f.idea, f.title)
      if (!titulo || titulo.length > 120 || vistos.has(titulo)) continue
      vistos.add(titulo)
      out.push({ titulo, gancho: `From a real Kineo film: “${f.title.trim()}”` })
      if (out.length === 3) break
    }
    return out.length === 3 ? out : []
  } catch {
    return []
  }
}

/**
 * As 3 ideias da carta para ESTA pessoa, já com o link de 1 clique (Studio + ideia + Seedance 15 s).
 * Nicho conhecido → as 3 da página do nicho; senão → as 3 campeãs da vitrine; senão → [] (a rota cai no pool de sempre).
 * Ou as TRÊS, ou nenhuma (mesma regra do episodiosProntos: carta com 1 exemplo lê como "não tinham mais ideias").
 */
export function ideiasDoPrimeiroFilme(base: string, nicho: string | null): { fonte: FonteDasIdeias; ideias: IdeiaPronta[] } {
  const link = (titulo: string, campaign: string) => comMotorDeEntrada(composerUrl({ base, campaign, prompt: titulo }))
  if (nicho && Object.prototype.hasOwnProperty.call(NICHE_FIRST_FILM_IDEAS, nicho)) {
    const n = NICHE_FIRST_FILM_IDEAS[nicho]
    const ideias = n.ideas.map((titulo) => ({ titulo, gancho: '', href: link(titulo, PRIMEIRO_FILME_CAMPANHA_NICHO) }))
    if (ideias.length === 3) return { fonte: 'niche', ideias }
  }
  const campeas = ideiasCampeas()
  if (campeas.length === 3) {
    return { fonte: 'showcase', ideias: campeas.map((c) => ({ ...c, href: link(c.titulo, PRIMEIRO_FILME_CAMPANHA_VITRINE) })) }
  }
  return { fonte: 'none', ideias: [] }
}
