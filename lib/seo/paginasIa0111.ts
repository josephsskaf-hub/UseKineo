// KINEO-PAGINAS-IA-0111 — "dobrar o canal que já paga" (fundador 01/11/2026, "vai tudo, avulso 2,90").
//
// POR QUE ESTAS PÁGINAS (events, 1ª página da sessão por origem, 14 dias, medido em 30/10):
//   · o ChatGPT manda gente para /text-to-video-shorts (134), /free-ai-shorts/horror (94), /ai-video-generator/for/urdu (93),
//     /ai-video-generator/seedance (63), /for/story-videos (44); o Bing manda para artigos de dinheiro
//     (/how-much-do-youtube-shorts-pay 96, /business 20). 7 dias: ChatGPT 485 visitas, Bing 80, Google 70. 8 de 11 pagantes
//     vieram do ChatGPT; país rico converte ~9x mais; /vs/invideo deu 2 cadastros → 1 pagante.
//   · o ChatGPT cita PÁGINA DE FAMÍLIA que ele já conhece. Daí: 8 nichos novos em /free-ai-shorts (só os que ainda não
//     existiam — mystery, history, motivation, space, truecrime, sports, faith, money e mais 29 já tinham página), 4 casos
//     de uso + 6 alternativas no catálogo /ai-video-generator/for (lib/seo/intentPages.ts) e 2 artigos de dinheiro para o Bing.
//
// REGRAS (as mesmas das vencedoras):
//   · resposta direta no 1º parágrafo depois do H1 — é o trecho que o ChatGPT cita;
//   · preço, créditos e filme grátis NUNCA digitados: buyCreatorPrice()/creatorSeedanceFilms(), lib/marketingPrice,
//     TRIAL_FREE_FILM_SECONDS e FREE_FILM_ENGINE_NAME (o mesmo interruptor do filme grátis);
//   · número de terceiro (YouTube/AdSense) só com fonte PRIMÁRIA e data de leitura (FONTES_0111). A rodada pedia também
//     "quanto o TikTok/Instagram pagam por mil views": as páginas oficiais do TikTok não renderizam fora do navegador e o
//     TikTok não publica taxa por mil; sem fonte primária legível, o número NÃO entra — as duas viraram páginas do YouTube
//     (datas de pagamento e divisão de receita dos Shorts), que têm fonte oficial lida hoje;
//   · nenhuma promessa de monetização: quem decide é o YouTube, canal a canal;
//   · nada infantil assustador (dinossauros e invenções são calmos; lendas urbanas são para adulto e dito assim).
import { buyCreatorPrice, creatorSeedanceFilms } from '@/lib/growth/buyCreatorOffer'
import { TRIAL_FREE_FILM_SECONDS } from '@/lib/freeTierOffer'
import { FREE_FILM_ENGINE_NAME } from '@/lib/freeFilmEngine'
import { FREE_ENTRY_COUNTRY_CLAUSE_MIRROR } from '@/lib/entryPolicy'
import { STARTER_PRICE, STUDIO_PRICE } from '@/lib/marketingPrice'

export { PAGINAS_IA_0111_MARK, PAGINAS_IA_0111_REVIEWED_ISO, PAGINAS_IA_0111_NICHE_SLUGS, PAGINAS_IA_0111_MONEY_PATHS } from '@/lib/seo/paginasIa0111Paths'

// ── Verdades de hoje, derivadas (nunca digitadas) ───────────────────────────────────────────────────────────────────────
const PRICE = buyCreatorPrice()
const CREATOR_FILMS = creatorSeedanceFilms()
const FREE_S = TRIAL_FREE_FILM_SECONDS
const WHERE = FREE_ENTRY_COUNTRY_CLAUSE_MIRROR
const CREATOR_DEAL = PRICE.firstMonth
  ? `${PRICE.firstMonth} for the first month (${PRICE.percentOff}% off), then ${PRICE.full}/month`
  : `${PRICE.full}/month`
const FREE_ONCE = `A new account${WHERE} gets one ${FREE_S}-second film on ${FREE_FILM_ENGINE_NAME}, watermarked, with no card.`
const PLANS_LINE = `Creator is ${CREATOR_DEAL} and covers ${CREATOR_FILMS} watermark-free 60-second Seedance 1.5 films a month; Starter is ${STARTER_PRICE}/month and Studio is ${STUDIO_PRICE}/month.`

export interface Ia0111Section { h2: string; paragraphs: string[] }
export interface Ia0111Faq { q: string; a: string }
export interface Ia0111Niche {
  /** a busca que a página mira, como a pessoa digita */
  searchTarget: string
  label: string
  h1: string
  metaTitle: string
  metaDescription: string
  /** a resposta direta (1º parágrafo depois do H1) */
  intro: string
  ideas: string[]
  hubCard: { title: string; example: string }
  sections: Ia0111Section[]
  faq: Ia0111Faq[]
}

// ═══ 8 NICHOS NOVOS em /free-ai-shorts/<slug> ═══════════════════════════════════════════════════════════════════════════
export const IA0111_NICHES: Readonly<Record<string, Ia0111Niche>> = {
  mythology: {
    searchTarget: 'ai mythology shorts generator / greek mythology video maker',
    label: 'Mythology',
    h1: 'Free AI Mythology Shorts Generator',
    metaTitle: 'AI Mythology Shorts Generator: Greek, Norse, Egyptian | Kineo',
    metaDescription: `Type a myth — Medusa, Ragnarok, Anubis — and get a narrated vertical Short with generated scenes and captions. First ${FREE_S}-second film free, no card.`,
    intro:
      'Kineo turns one myth into a finished vertical Short: you type "the night Medusa was cursed" or paste your own retelling, and it writes the hook, narrates it, generates a scene for every line and burns in captions. Gods, monsters and lost cities have no stock footage, so every shot is generated from your words.',
    ideas: [
      'Why Medusa was cursed, and the part of the myth most retellings skip',
      'Ragnarok in 60 seconds: how the Norse world was supposed to end',
      'Anubis weighs a heart against a feather: the Egyptian judgment of the dead',
      'The Trojan Horse: the trick that ended a ten-year war',
      'Why Prometheus was chained to a rock for giving humans fire',
    ],
    hubCard: { title: 'Mythology Shorts', example: 'Why Medusa was cursed' },
    sections: [
      {
        h2: 'Why mythology works as a daily Short',
        paragraphs: [
          'Every myth already has the structure a Short needs: a character with a flaw, a rule that gets broken and a punishment nobody forgets. You do not have to invent the twist — Pandora opens the jar, Icarus flies too high. That is why mythology channels can post every day for months without running out of stories.',
          'Pick one pantheon per series. A Greek series, a Norse series and an Egyptian series each build their own returning audience, and the same opening line ("In Greek myth, there is a story nobody tells you…") makes episodes recognizable in the feed.',
        ],
      },
      {
        h2: 'How to prompt gods and monsters that look consistent',
        paragraphs: [
          'Describe each figure the same way in every line you care about: "Zeus, a broad-shouldered bearded king in a white robe holding a lightning bolt". Repeating the description is what keeps him recognizable from the first scene to the last, because every scene is generated separately.',
          'Ask for the look in plain words — "ancient Greek marble temple, golden hour, epic painting style" — rather than naming a film or a game. If you want the story told your way, paste the full narration and choose to keep your script as written.',
        ],
      },
    ],
    faq: [
      { q: 'Can I make a mythology Short for free?', a: `Yes, once. ${FREE_ONCE} That is enough to see how your god or monster comes out before paying anything.` },
      { q: 'Are the myths historically accurate?', a: 'Myths have many versions. Kineo narrates what you write; if you let the AI structure the idea, read the script before generating and correct any detail you want told differently.' },
      { q: 'How many mythology films does a paid plan cover?', a: PLANS_LINE },
    ],
  },
  billionaires: {
    searchTarget: 'ai billionaire shorts generator / rich people facts video maker',
    label: 'Billionaire Stories',
    h1: 'Free AI Billionaire Stories Shorts Generator',
    metaTitle: 'AI Billionaire Story Shorts Generator (Faceless) | Kineo',
    metaDescription: `Turn a founder story or a wealth habit into a narrated, captioned vertical Short: no filming, your facts narrated word for word. First ${FREE_S}-second film free.`,
    intro:
      'Kineo makes faceless billionaire Shorts from one line: type "the first job of a self-made billionaire" or paste a script you researched, and you get back a narrated vertical video with a scene for every sentence and captions timed to the voice. It does not look up facts for you — the strongest billionaire channels source every number they say.',
    ideas: [
      'The first job of five self-made billionaires, and what each one learned there',
      'Why some of the richest founders still drive old cars',
      'The rejection letter a future billionaire kept for 20 years',
      'How one garage start-up turned into a trillion-dollar company',
      'The daily habit almost every billionaire interview mentions',
    ],
    hubCard: { title: 'Billionaire Shorts', example: 'The first job of five self-made billionaires' },
    sections: [
      {
        h2: 'What makes a billionaire Short worth watching',
        paragraphs: [
          'The audience is not there for luxury — it is there for the moment before the money. The rejected pitch, the near-bankruptcy, the strange first job. Open on that moment, then reveal who it was. A name in the first second gets skipped; a mystery in the first second gets watched.',
          'Keep numbers few and exact. One sourced figure ("sold the company for X in year Y") is more convincing than five round ones. Write the facts in your script and choose to keep it as written so the narration says exactly what you checked.',
        ],
      },
      {
        h2: 'Faceless visuals without real photos',
        paragraphs: [
          'Generated scenes show the situation, not the person: a cramped garage at night, a stack of rejection letters, a boardroom at dawn. That keeps the video original and avoids using someone’s likeness as if it were footage of them.',
          'A recurring visual motif — a gold coin on a desk, the same city skyline — ties a series together and makes episodes recognizable before the caption is read.',
        ],
      },
    ],
    faq: [
      { q: 'Can I use real billionaire photos in the video?', a: 'Kineo generates scenes from your text rather than using real photographs. Describe the situation (a garage, an office, a rejection letter) instead of asking for a specific person’s face.' },
      { q: 'Is there a free way to try it?', a: `Yes. ${FREE_ONCE}` },
      { q: 'What does it cost to post billionaire Shorts every day?', a: PLANS_LINE },
    ],
  },
  'military-history': {
    searchTarget: 'ai military history shorts / war history video generator',
    label: 'Military History',
    h1: 'Free AI Military History Shorts Generator',
    metaTitle: 'AI Military History Shorts Generator, No Footage | Kineo',
    metaDescription: `Turn a battle, a strategy or an unlikely hero into a narrated vertical Short with period scenes and captions. Respectful, faceless, first ${FREE_S}-second film free.`,
    intro:
      'Kineo turns a moment of military history into a narrated vertical Short: type "the deception plan before D-Day" or paste your own script, and it writes, narrates, generates period-style scenes and adds captions. Battles from centuries ago have no footage at all, and generated scenes show the place and the era without reusing someone else’s archive.',
    ideas: [
      'The inflatable tanks that fooled an army before D-Day',
      'Why Napoleon’s march on Moscow failed before the first battle',
      'The Christmas truce of 1914, told by the soldiers who climbed out',
      'How a single codebreaker shortened a war',
      'The 300 at Thermopylae: what the legend gets right and wrong',
    ],
    hubCard: { title: 'Military History Shorts', example: 'The inflatable tanks that fooled an army' },
    sections: [
      {
        h2: 'Strategy and people, not gore',
        paragraphs: [
          'The military history Shorts that travel furthest are about decisions: the bluff, the weather that changed a plan, the one message that arrived too late. Strategy is easy to visualize — maps, tents, a general reading a letter by candlelight — and it keeps the channel suitable for advertisers.',
          'Treat real wars with respect. Name the people, the date and the place, avoid graphic violence in your prompts, and say plainly when something is legend rather than record.',
        ],
      },
      {
        h2: 'Getting period scenes right',
        paragraphs: [
          'Put the year and the place in the prompt of every important scene: "1815, Belgian farmland in the rain, soldiers in dark blue coats". Generated scenes follow the text; the more specific the era, the less likely you get modern details.',
          'For a series, keep one conflict per playlist and one recurring narrator voice. Viewers who finish one episode on a campaign usually want the next battle of the same campaign.',
        ],
      },
    ],
    faq: [
      { q: 'Will the uniforms and weapons be accurate?', a: 'Generated scenes follow your description, so the more specific you are about year, army and equipment, the closer they get. Small inaccuracies can still happen; review the film before posting.' },
      { q: 'Can I try a military history Short for free?', a: `Yes. ${FREE_ONCE}` },
      { q: 'How much does a paid plan cover?', a: PLANS_LINE },
    ],
  },
  'urban-legends': {
    searchTarget: 'ai urban legend video generator / creepy story shorts maker',
    label: 'Urban Legends',
    h1: 'Free AI Urban Legends Shorts Generator',
    metaTitle: 'AI Urban Legend Shorts Generator for Story Channels | Kineo',
    metaDescription: `Turn an urban legend into a narrated, atmospheric vertical Short with generated scenes and captions — for adult audiences. First ${FREE_S}-second film free, no card.`,
    intro:
      'Kineo turns an urban legend into a narrated vertical Short: type "the phone call from inside the house" or paste your own telling, and it writes a slow-burn script, narrates it, generates moody scenes for each line and burns in captions. It is made for adult story channels — keep it out of feeds meant for children.',
    ideas: [
      'The babysitter and the phone call that came from inside the house',
      'The vanishing hitchhiker who leaves something behind in the back seat',
      'Why nobody answers the knock on the third night',
      'The motel room behind the painting',
      'The bridge where cars stop on their own',
    ],
    hubCard: { title: 'Urban Legend Shorts', example: 'The phone call from inside the house' },
    sections: [
      {
        h2: 'How urban legends differ from horror stories',
        paragraphs: [
          'An urban legend is told as if it happened to a friend of a friend. That framing — a real town, an ordinary night, a detail that is almost believable — is what makes the audience comment "this happened in my city too". Write it in that voice and let the last line land without explanation.',
          'Atmosphere beats shock. Empty roads, a ringing phone in a dark kitchen, headlights in fog: generated scenes are built from light and framing, so describe the mood, not the monster.',
        ],
      },
      {
        h2: 'Building a legends series',
        paragraphs: [
          'Number your episodes and keep the same cold open ("Everyone in this town knows the rule…"). A regional angle works well: legends of one state, one country or one highway, a new one every day.',
          'For the horror end of the spectrum — creatures, second-person scares — the horror page has its own ideas; legends stay closer to everyday places.',
        ],
      },
    ],
    faq: [
      { q: 'Is this suitable for kids?', a: 'No. Urban legend videos are meant for adult audiences. On YouTube and TikTok, set the audience correctly and do not mark them as made for kids.' },
      { q: 'Can I narrate my own version of a legend?', a: 'Yes. Paste your telling and choose to keep your script as written; Kineo narrates it word for word and generates a scene for each line.' },
      { q: 'What does it cost?', a: `${FREE_ONCE} After that: ${PLANS_LINE}` },
    ],
  },
  dinosaurs: {
    searchTarget: 'ai dinosaur video generator / dinosaur facts shorts',
    label: 'Dinosaurs',
    h1: 'Free AI Dinosaur Shorts Generator',
    metaTitle: 'AI Dinosaur Shorts Generator: Facts & Prehistoric Scenes | Kineo',
    metaDescription: `Turn a dinosaur fact into a narrated vertical Short with generated prehistoric scenes and captions, calm enough for families. First ${FREE_S}-second film free.`,
    intro:
      'Kineo makes dinosaur Shorts from one fact: type "why T. rex had tiny arms" and it writes the script, narrates it, generates a prehistoric scene for every line and adds captions. Nobody has filmed a dinosaur, so every frame is generated — which is exactly what an AI video engine is good at.',
    ideas: [
      'Why T. rex had such tiny arms: the theories scientists argue about',
      'The dinosaur as long as three buses parked end to end',
      'What the Earth looked like on the morning the asteroid hit',
      'Birds are living dinosaurs, and here is the evidence',
      'The baby dinosaur fossil found curled up inside its egg',
    ],
    hubCard: { title: 'Dinosaur Shorts', example: 'Why T. rex had tiny arms' },
    sections: [
      {
        h2: 'Facts first, roar second',
        paragraphs: [
          'The best dinosaur Shorts answer one question a curious person actually asks: how big, how fast, why it went extinct, what it ate. Lead with the question, answer it in the last line, and let the scenes do the wow in between.',
          'Science changes. Feathers, posture and colors have been revised many times, so phrase uncertain points as "scientists think" and give the newest view you can find in your script.',
        ],
      },
      {
        h2: 'Keeping it friendly for younger viewers',
        paragraphs: [
          'Dinosaur channels are watched by families. Ask for daylight, lush forests and gentle movement rather than hunting scenes, and keep the narrator warm. If your audience is children, mark the video as made for kids on the platform.',
          'A recurring host dinosaur — "Rex, a small green dinosaur with a curious face" — turns facts into a series kids ask for by name.',
        ],
      },
    ],
    faq: [
      { q: 'Are dinosaur Shorts made with AI scientifically accurate?', a: 'The narration says what you write, and the scenes follow your description. Check facts against a museum or university source, and describe the latest scientific look (for example, feathers) in your prompt.' },
      { q: 'Can I try one for free?', a: `Yes. ${FREE_ONCE}` },
      { q: 'How many films does a plan include?', a: PLANS_LINE },
    ],
  },
  'survival-stories': {
    searchTarget: 'ai survival story video generator / true survival shorts',
    label: 'Survival Stories',
    h1: 'Free AI Survival Stories Shorts Generator',
    metaTitle: 'AI Survival Story Shorts Generator (True Stories) | Kineo',
    metaDescription: `Turn a true survival story into a narrated vertical Short: generated scenes of the place, captions, a hook in the first second. First ${FREE_S}-second film free.`,
    intro:
      'Kineo turns a true survival story into a narrated vertical Short: type "the climber who crawled down a mountain alone" or paste a script you researched, and it writes the hook, narrates, generates a scene of the place for every line and adds captions. The story is the hero; the scenes show the ice, the ocean or the jungle nobody could have filmed.',
    ideas: [
      'The climber who crawled down a mountain alone with a broken leg',
      '76 days adrift on a life raft in the Atlantic',
      'The teenager who walked out of the Amazon after a plane crash',
      'How the whole Endurance crew survived after the ice crushed their ship',
      'The cave rescue the whole world watched',
    ],
    hubCard: { title: 'Survival Story Shorts', example: '76 days adrift on a life raft' },
    sections: [
      {
        h2: 'The shape of a survival Short',
        paragraphs: [
          'Open at the worst moment, not the beginning: the rope breaks, the boat flips, the radio dies. Then go back for ten seconds of context, and spend the rest on the decision that saved them. Viewers stay to learn the one thing the survivor did right.',
          'These are real people. Use names and dates you can source, avoid inventing dialogue, and never turn a death into a punchline.',
        ],
      },
      {
        h2: 'Showing places nobody filmed',
        paragraphs: [
          'Describe the environment precisely — "a crevasse in blue glacier ice, harsh wind, a single headlamp" — and let the generated scenes carry the scale. Wide shots for the setting, close shots for the hands, the rope, the last biscuit.',
          'A 60-second story usually fits four beats: disaster, isolation, decision, rescue. If yours needs more room, the 90-second option keeps every beat.',
        ],
      },
    ],
    faq: [
      { q: 'Can I tell a real person’s survival story?', a: 'Yes, from public facts you have checked. Kineo generates scenes of the situation rather than real footage of the person, and narrates exactly what you write when you keep your script as written.' },
      { q: 'Is there a free trial?', a: `Yes. ${FREE_ONCE}` },
      { q: 'How much for a daily survival series?', a: PLANS_LINE },
    ],
  },
  inventions: {
    searchTarget: 'ai invention history shorts / how things were invented video',
    label: 'Inventions',
    h1: 'Free AI Inventions Shorts Generator',
    metaTitle: 'AI Invention History Shorts Generator | Kineo',
    metaDescription: `Turn the story behind an everyday invention into a narrated vertical Short with generated scenes and captions for curiosity channels. First ${FREE_S}-second film free.`,
    intro:
      'Kineo makes invention Shorts from one question: type "how the microwave was invented by accident" and it writes the script, narrates it, generates a scene for each step and adds captions. Workshops from 1850 and labs from 1945 were never filmed for TikTok, so the scenes are generated from your text.',
    ideas: [
      'The melted chocolate bar that led to the microwave oven',
      'Why the first vacuum cleaner needed a horse-drawn cart',
      'The accident that gave us the sticky note',
      'How a burr on a dog’s fur became Velcro',
      'The inventor who sold the rights to his idea for almost nothing',
    ],
    hubCard: { title: 'Invention Shorts', example: 'The melted chocolate bar behind the microwave' },
    sections: [
      {
        h2: 'Why "how was it invented" keeps getting asked',
        paragraphs: [
          'People search the origin of things they touch every day — zippers, microwaves, sticky notes — and the answer is almost always a surprise: an accident, a failed product, a rival who got there first. That surprise is your hook.',
          'Credit carefully. Many inventions have disputed origins; say "is usually credited to" when historians disagree, and name the year.',
        ],
      },
      {
        h2: 'Turning one invention into a series',
        paragraphs: [
          'Group episodes by theme — kitchen inventions, inventions by accident, inventions from war — and end each one by teasing the next. A curiosity channel that posts the same format daily trains viewers to come back.',
          'Ask for a consistent visual style across episodes, for example "warm vintage workshop light, close-up on hands and tools", so the series looks like one show.',
        ],
      },
    ],
    faq: [
      { q: 'Can these Shorts be used in a classroom?', a: 'Yes — they are narrated explainers with captions. Review the script for accuracy first, since you decide what the narration says.' },
      { q: 'Can I make one free?', a: `Yes. ${FREE_ONCE}` },
      { q: 'What do paid plans cost?', a: PLANS_LINE },
    ],
  },
  'abandoned-places': {
    searchTarget: 'ai abandoned places video generator / lost places shorts',
    label: 'Abandoned Places',
    h1: 'Free AI Abandoned Places Shorts Generator',
    metaTitle: 'AI Abandoned Places Shorts Generator, No Travel | Kineo',
    metaDescription: `The story of an abandoned town, island or building as a narrated vertical Short with generated scenes. No travel, no trespassing. First ${FREE_S}-second film free.`,
    intro:
      'Kineo makes abandoned-places Shorts without anyone travelling or trespassing: type "the island city that emptied overnight" or paste your script, and it narrates the story, generates a scene of the place for every line and adds captions. You tell why the place was left behind; the engine shows the empty streets.',
    ideas: [
      'The island city that emptied out within months of its mine closing',
      'The ghost town buried by sand dunes in the desert',
      'Why an entire city was evacuated and never came back',
      'The abandoned theme park reclaimed by the jungle',
      'The underground metro station that was finished and never opened',
    ],
    hubCard: { title: 'Abandoned Places Shorts', example: 'The island city that emptied overnight' },
    sections: [
      {
        h2: 'The story is why it was left',
        paragraphs: [
          'Beautiful ruins get a like; the reason they are empty gets a share. A mine that ran dry, a disaster, a highway that moved, a company town after the company left. Lead with the mystery of the empty place and answer it at the end.',
          'Exploring real abandoned sites is often illegal and dangerous. Generated scenes let you tell the story of places you could never safely visit.',
        ],
      },
      {
        h2: 'Prompting decay that looks real',
        paragraphs: [
          'Describe time, not just ruins: "peeling paint, vines through a broken window, dust in a shaft of light, a calendar still on the wall". The small human detail left behind is what makes the scene feel abandoned rather than just old.',
          'Name the climate and era of the place so the scenes match — desert sand, tropical overgrowth, Soviet concrete, Victorian brick.',
        ],
      },
    ],
    faq: [
      { q: 'Do I need footage of the place?', a: 'No. Every scene is generated from your text. Describe the place and the era and the engine builds it; there is no stock footage to license.' },
      { q: 'Can I try it without paying?', a: `Yes. ${FREE_ONCE}` },
      { q: 'How many abandoned-places films fit in a plan?', a: PLANS_LINE },
    ],
  },
}

export const IA0111_NICHE_SLUG_LIST: readonly string[] = Object.keys(IA0111_NICHES)

// ═══ 2 ARTIGOS DE DINHEIRO para o Bing ══════════════════════════════════════════════════════════════════════════════════
export interface FontePrimaria { label: string; url: string; checkedOn: string }
const CHECKED = '2026-11-01'

/** Só páginas oficiais (YouTube Help / AdSense Help), lidas em 01/11/2026. */
export const FONTES_0111 = {
  ypp: { label: 'YouTube Partner Program overview & eligibility (YouTube Help)', url: 'https://support.google.com/youtube/answer/72851?hl=en', checkedOn: CHECKED },
  getPaid: { label: 'Get paid from YouTube: payment timeline (YouTube Help)', url: 'https://support.google.com/youtube/answer/72902?hl=en', checkedOn: CHECKED },
  adsenseTimeline: { label: 'Payment timelines for AdSense (AdSense Help)', url: 'https://support.google.com/adsense/answer/7164703?hl=en', checkedOn: CHECKED },
  adsenseThreshold: { label: 'Payment thresholds (AdSense Help)', url: 'https://support.google.com/adsense/answer/1709871?hl=en', checkedOn: CHECKED },
  shortsRevenue: { label: 'YouTube Shorts monetization policies: revenue sharing (YouTube Help)', url: 'https://support.google.com/youtube/answer/12504220?hl=en', checkedOn: CHECKED },
} as const satisfies Record<string, FontePrimaria>

/** Os números lidos nas fontes acima — guardados como número, formatados na hora (nenhum "$<dígito>" digitado no texto). */
export const YT_FATOS_0111 = {
  subscribers: 1000,
  watchHours: 4000,
  watchHoursMonths: 12,
  shortsViews: '10 million',
  shortsViewsDays: 90,
  finalizedFromDay: 7,
  finalizedToDay: 12,
  paidFromDay: 21,
  paidToDay: 26,
  thresholdDay: 20,
  thresholdUsd: 100,
  addressVerificationUsd: 10,
  creatorSharePercent: 45,
} as const

const usd = (n: number) => `$${n}`
const F = YT_FATOS_0111

export interface MoneyRow { label: string; value: string; source: FontePrimaria }
export interface MoneyArticle {
  path: string
  title: string
  description: string
  h1: string
  /** resposta direta — 1º parágrafo depois do H1 */
  answer: string
  rows: MoneyRow[]
  sections: Ia0111Section[]
  faq: Ia0111Faq[]
  sources: FontePrimaria[]
  /** ideia que vai pré-preenchida para o Studio */
  studioPrompt: string
  related: { href: string; label: string }[]
}

const YPP_LINE = `${F.subscribers.toLocaleString('en-US')} subscribers plus either ${F.watchHours.toLocaleString('en-US')} valid public watch hours in the last ${F.watchHoursMonths} months or ${F.shortsViews} valid public Shorts views in the last ${F.shortsViewsDays} days, a linked AdSense for YouTube account, and living in a country where the Partner Program is available`

export const MONEY_ARTICLES_0111: Readonly<Record<string, MoneyArticle>> = {
  '/when-does-youtube-pay-you': {
    path: '/when-does-youtube-pay-you',
    title: 'When Does YouTube Pay You? Payout Dates & Threshold (2026)',
    description: `YouTube adds last month's earnings between the ${F.finalizedFromDay}th and ${F.finalizedToDay}th and pays from the ${F.paidFromDay}st to the ${F.paidToDay}th once you pass the ${usd(F.thresholdUsd)} threshold. Official sources.`,
    h1: 'When does YouTube pay you?',
    answer: `YouTube pays once a month. Your earnings for the previous month are finalized and added to your AdSense for YouTube balance between the ${F.finalizedFromDay}th and the ${F.finalizedToDay}th, and if the balance has reached the payment threshold (${usd(F.thresholdUsd)} for accounts paid in US dollars) with no holds, the payment is issued between the ${F.paidFromDay}st and the ${F.paidToDay}th of that month. So money earned in January arrives in late February.`,
    rows: [
      { label: 'Earnings for last month added to your balance', value: `Between the ${F.finalizedFromDay}th and ${F.finalizedToDay}th of each month`, source: FONTES_0111.getPaid },
      { label: 'Payment issued', value: `Between the ${F.paidFromDay}st and ${F.paidToDay}th, if the threshold is met and there are no holds`, source: FONTES_0111.getPaid },
      { label: 'Payment threshold (US dollars)', value: usd(F.thresholdUsd), source: FONTES_0111.adsenseThreshold },
      { label: 'Balance checked against the threshold on', value: `The ${F.thresholdDay}th of the month`, source: FONTES_0111.adsenseTimeline },
      { label: 'Address (PIN) verification starts at', value: `${usd(F.addressVerificationUsd)} in earnings`, source: FONTES_0111.adsenseThreshold },
      { label: 'Tax info', value: 'US tax info is required for every monetizing creator, wherever they live, before the first payment', source: FONTES_0111.getPaid },
    ],
    sections: [
      {
        h2: 'A worked example',
        paragraphs: [
          `Say your Shorts earn money during January. In the first days of February those earnings are finalized, and between February ${F.finalizedFromDay} and ${F.finalizedToDay} they are added to your AdSense for YouTube balance. If that balance is at or above the threshold on February ${F.thresholdDay} and nothing is on hold, the payment goes out between February ${F.paidFromDay} and ${F.paidToDay}. Bank transfers can take a few more days to show up.`,
          `If your balance is below the threshold, nothing is lost: you are paid out when your outstanding earnings reach it, in the first payment cycle after that. A small channel may wait several months for its first ${usd(F.thresholdUsd)}.`,
        ],
      },
      {
        h2: 'What has to be in place before the first payment',
        paragraphs: [
          `First, the channel has to be in the YouTube Partner Program for ad revenue. The published bar is ${YPP_LINE}.`,
          `Second, the AdSense for YouTube account must be complete: identity, US tax information (required for all monetizing creators, regardless of country) and the address verification that starts once earnings reach ${usd(F.addressVerificationUsd)}. A missing step is the most common reason a payment is held.`,
        ],
      },
      {
        h2: 'Why your first payment seems late',
        paragraphs: [
          'Three things stack up: the month you earn in has to end, earnings are finalized early the next month, and the payment window is late in that month. On top of that, new accounts must clear tax and verification steps first. None of this depends on how the video was made.',
          'Whether a channel earns at all is YouTube’s decision, channel by channel. Original videos with a real point of view are what the Partner Program pays for; mass-produced, repetitive uploads are not.',
        ],
      },
    ],
    faq: [
      { q: 'What day of the month does YouTube pay?', a: `Between the ${F.paidFromDay}st and the ${F.paidToDay}th, for the previous month's earnings, if your balance has reached the payment threshold and there are no payment holds.` },
      { q: 'What is the minimum payout on YouTube?', a: `YouTube pays through AdSense for YouTube. For accounts paid in US dollars, the AdSense payment threshold is ${usd(F.thresholdUsd)}; other currencies have a local equivalent listed on the AdSense thresholds page.` },
      { q: 'Do I need to give US tax info if I live outside the US?', a: 'Yes. YouTube says submitting US tax info is required for all monetizing creators regardless of where they live, and new AdSense for YouTube accounts need it before their first payment.' },
      { q: 'Does YouTube pay for Shorts the same way?', a: 'Yes. Shorts ad revenue is part of the same Partner Program earnings and is paid on the same monthly AdSense for YouTube schedule. How the Shorts share is calculated is explained in our guide to Shorts revenue sharing.' },
    ],
    sources: [FONTES_0111.getPaid, FONTES_0111.adsenseTimeline, FONTES_0111.adsenseThreshold, FONTES_0111.ypp],
    studioPrompt: 'The inflatable tanks that fooled an army before D-Day',
    related: [
      { href: '/youtube-shorts-revenue-sharing-explained', label: 'YouTube Shorts revenue sharing, explained' },
      { href: '/how-much-do-youtube-shorts-pay', label: 'How much do YouTube Shorts pay?' },
      { href: '/can-you-monetize-ai-videos', label: 'Does YouTube pay for AI-generated videos?' },
    ],
  },
  '/youtube-shorts-revenue-sharing-explained': {
    path: '/youtube-shorts-revenue-sharing-explained',
    title: 'YouTube Shorts Revenue Sharing Explained (45% Creator Pool)',
    description: `How YouTube splits Shorts ad money: the monthly Creator Pool, music costs, engaged views and the ${F.creatorSharePercent}% creators keep, from YouTube's own policy.`,
    h1: 'YouTube Shorts revenue sharing, explained',
    answer: `YouTube does not pay a fixed amount per Short. Each month it pools the ad revenue from the Shorts feed, sets aside part of it to cover music licensing, and puts the rest in a Creator Pool. That pool is divided among monetizing creators by their share of engaged views, and each creator keeps ${F.creatorSharePercent}% of the revenue allocated to them — whether or not their Shorts used music.`,
    rows: [
      { label: 'What is pooled', value: 'Ad revenue earned between videos in the Shorts feed, each month', source: FONTES_0111.shortsRevenue },
      { label: 'Music', value: 'Shorts with music split their share between the Creator Pool and music partners (one track = half to the pool); Shorts without music send it all to the pool', source: FONTES_0111.shortsRevenue },
      { label: 'How the pool is divided', value: 'By each creator’s share of total engaged views, country by country', source: FONTES_0111.shortsRevenue },
      { label: 'What creators keep', value: `${F.creatorSharePercent}% of their allocated revenue, with or without music`, source: FONTES_0111.shortsRevenue },
      { label: 'Views that do not count', value: 'Non-original content, artificial or fake views, and views of videos that break advertiser-friendly guidelines', source: FONTES_0111.shortsRevenue },
      { label: 'Who can earn it', value: `Partner Program channels: ${F.subscribers.toLocaleString('en-US')} subscribers plus ${F.shortsViews} Shorts views in ${F.shortsViewsDays} days or ${F.watchHours.toLocaleString('en-US')} watch hours in ${F.watchHoursMonths} months`, source: FONTES_0111.ypp },
    ],
    sections: [
      {
        h2: 'The four steps, in plain English',
        paragraphs: [
          'Step one: all the money advertisers pay for ads shown between Shorts in the feed during the month goes into one pot. Step two: YouTube works out how much of that pot is tied to Shorts that used music, and sends part of it to the music partners. Step three: what is left is the Creator Pool. Step four: the pool is shared among monetizing creators by how many engaged views their Shorts got, and each creator keeps their percentage of what they were allocated.',
          'Because the pool is shared, your payout depends on two things you control — engaged views and originality — and on things you do not, like how much advertisers spent that month and in which countries your viewers live.',
        ],
      },
      {
        h2: 'Why using music lowers the pool, but not your percentage',
        paragraphs: [
          `Music costs money to license, so a Short with one track sends half of its associated revenue to the music side and half to the Creator Pool; with two tracks the pool's share is smaller again. Your own cut of whatever reaches you stays at ${F.creatorSharePercent}% either way.`,
          'So music choice never changes your percentage; it changes how much of the revenue tied to your views reaches the pool in the first place. A Short with no music track sends all of it.',
        ],
      },
      {
        h2: 'What this means for AI-made Shorts',
        paragraphs: [
          'Engaged views from non-original content do not count toward the pool. A Short made with an AI tool can earn like any other when it is original — your own idea, script and point of view — and it is the repetitive, mass-produced kind that YouTube excludes.',
          'Kineo makes a finished, narrated Short from your idea or script; it does not decide whether a channel is monetized. That decision is YouTube’s, channel by channel.',
        ],
      },
    ],
    faq: [
      { q: 'What percentage of Shorts revenue do creators get?', a: `${F.creatorSharePercent}% of the revenue allocated to them from the Creator Pool, regardless of whether their Shorts used music.` },
      { q: 'Is there a fixed rate per 1,000 Shorts views?', a: 'No. The amount per view changes every month with total Shorts ad revenue, music usage, the number of engaged views across all creators and the countries your viewers are in. YouTube does not publish a fixed per-view rate.' },
      { q: 'What counts as an engaged view?', a: 'YouTube calculates payments from eligible engaged views and excludes views from non-original content, artificial or fake views, and views of content that violates its advertiser-friendly guidelines.' },
      { q: 'When is Shorts revenue paid?', a: 'On the normal monthly YouTube schedule through AdSense for YouTube; see our guide on when YouTube pays you for the exact dates and threshold.' },
    ],
    sources: [FONTES_0111.shortsRevenue, FONTES_0111.ypp],
    studioPrompt: 'Why the Trojan Horse worked: the trick that ended a ten-year war',
    related: [
      { href: '/when-does-youtube-pay-you', label: 'When does YouTube pay you?' },
      { href: '/how-much-do-youtube-shorts-pay', label: 'How much do YouTube Shorts pay?' },
      { href: '/youtube-shorts-rpm-by-niche', label: 'YouTube Shorts RPM by niche' },
    ],
  },
}

export function getMoneyArticle0111(path: string): MoneyArticle {
  const a = MONEY_ARTICLES_0111[path]
  if (!a) throw new Error(`KINEO-PAGINAS-IA-0111: artigo desconhecido ${path}`)
  return a
}
