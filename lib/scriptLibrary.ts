// KINEO-SCRIPT-LIBRARY-2026-08-03 — the taxonomy + data layer behind /scripts.
//
// Why this module exists
// ─────────────────────────────────────────────────────────────────────────────
// 729 completed videos already publish a `/v/[id]` page carrying the full
// script and a VideoObject. Every one of them is an ORPHAN: no hub, no
// category, no internal link pointing in. Search Console: 8 web-search clicks
// in the entire history of the domain. An orphan page does not rank, no matter
// how good the JSON-LD is — PageRank has to be able to flow to it.
//
// This module turns that pile into a browsable "Shorts Script Library": it
// groups the already-indexable pages into VERTICALS and hands the hub, the
// vertical pages and `/v/[id]` a single, consistent view of the collection.
//
// Three constraints shaped the implementation:
//
//  1. NO NEW DATABASE COLUMNS. `videos.niche` is NULL on 100% of rows and
//     `thumbnail_url` on 100% too (see the measured header in lib/publicVideos.ts).
//     So the vertical is DERIVED from the script text at render time, using the
//     same `PUBLIC_VIDEO_COLUMNS` allow-list. Nothing else is selected.
//
//  2. NO NEW TAXONOMY. The slugs below are exactly the slugs that already exist
//     in app/free-ai-shorts/[niche]/page.tsx (28 niches), and the `viralVerticals`
//     field maps them back onto the `vertical` values already used in
//     lib/viralTopics.ts (billionaire / country / crime / nature / technology…).
//     The library therefore links straight into the niche cluster that already
//     ranks instead of inventing a parallel vocabulary.
//
//  3. NO SECOND QUALITY GATE. Membership is decided ONLY by
//     `listIndexablePublicVideos()` in lib/publicVideos.ts — the same function
//     the video sitemap uses. If a page renders `noindex`, it is never listed
//     and never linked, so the library can't manufacture a single broken or
//     no-value internal link.
//
// On the "pexels" question: measured on production 2026-08-03, 50 of the 729
// completed rows mention Pexels and ALL 50 use the bracketed `[Pexels: query]`
// form, which `stripScriptMarkers()` (lib/scriptParser.ts) already removes —
// zero rows use a bare `Pexels:` line, a `B-roll:` line or a `Visual prompt:`
// line. `stripFootageResidue()` below is therefore a belt-and-braces net, not
// the primary defence: it exists so a future un-bracketed directive can never
// reach a public excerpt.

import { unstable_cache } from 'next/cache'
import {
  isPromptScaffolding,
  listIndexablePublicVideos,
  PUBLIC_BASE_URL,
  type PublicVideo,
} from '@/lib/publicVideos'

export { PUBLIC_BASE_URL }

/** How many rows the library pulls. Bounded so the ISR render can't blow up. */
export const LIBRARY_FETCH_LIMIT = 1200

/** Rich cards rendered per vertical page. The rest degrade to a compact list. */
export const CARDS_PER_VERTICAL = 60

/** Cards on the hub's "newest" grid. */
export const HUB_RECENT_COUNT = 24

/**
 * A vertical page with fewer scripts than this is thin by definition, so it is
 * rendered (the internal links still flow) but kept out of the index. Same
 * philosophy as the `/v/[id]` gate: render for humans, index only with substance.
 */
export const MIN_SCRIPTS_TO_INDEX = 4

// ── Taxonomy ────────────────────────────────────────────────────────────────

export type ScriptVertical = {
  /** URL slug. IDENTICAL to the matching /free-ai-shorts/[niche] slug. */
  slug: string
  /** Short label used in nav and breadcrumbs. */
  label: string
  /** The word used inside a sentence: "…scripts about {noun}". */
  noun: string
  /** H1 of /scripts/[vertical]. */
  h1: string
  /** One-paragraph intro, unique per vertical. */
  intro: string
  /** True when a /free-ai-shorts/[slug] page exists to cross-link to. */
  hasNichePage: boolean
  /** `vertical` values from lib/viralTopics.ts that fold into this one. */
  viralVerticals: string[]
  /**
   * Scoring rules. Each entry is a word-boundary regex source plus a weight.
   * Weight 3 = unambiguous topic word, 2 = strong, 1 = supporting evidence.
   */
  keywords: Array<[string, number]>
}

/**
 * Ordered widest-first: the order below is the order the hub renders, and ties
 * in the classifier are broken by this order, so the broadest bucket wins a
 * genuine coin-flip instead of an arbitrary one.
 */
export const SCRIPT_VERTICALS: ScriptVertical[] = [
  {
    slug: 'money',
    label: 'Money & Finance',
    noun: 'money',
    h1: 'Free YouTube Shorts scripts about money',
    intro:
      'Full, ready-to-record money and finance Shorts scripts — the hook, the beats and the payoff, exactly as they were narrated. Copy one, change the numbers to fit your channel, or hand the idea back to the generator and get a new episode.',
    hasNichePage: true,
    viralVerticals: ['money'],
    keywords: [
      ['\\bmoney\\b', 3], ['\\bdollars?\\b', 2], ['\\binvest(?:ing|ment|ors?)?\\b', 3],
      ['\\bsavings?\\b', 3], ['\\bdebt\\b', 3], ['\\bincome\\b', 3], ['\\bsalary\\b', 2],
      ['\\bcompound(?:ing)?\\b', 3], ['\\binterest rate', 3], ['\\bretire(?:ment)?\\b', 3],
      ['\\btaxe?s?\\b', 2], ['\\bbank(?:s|ing)?\\b', 2], ['\\bbudget(?:ing)?\\b', 3],
      ['\\bstock market\\b', 3], ['\\binflation\\b', 3], ['\\bcredit (?:card|score)\\b', 3],
      ['\\bmortgage\\b', 3], ['\\bpaycheck\\b', 3], ['\\bwealth\\b', 2], ['\\b401\\(?k\\)?\\b', 3],
      ['\\bfinancial(?:ly)?\\b', 2], ['\\bportfolio\\b', 2], ['\\bpassive income\\b', 3],
    ],
  },
  {
    slug: 'luxury',
    label: 'Luxury & Billionaires',
    noun: 'billionaires and luxury',
    h1: 'Free YouTube Shorts scripts about billionaires and luxury',
    intro:
      'Billionaire habits, private jets, mega-yachts and the machinery of extreme wealth — written as vertical Shorts scripts with a hook that stops the scroll and a payoff worth saving.',
    hasNichePage: true,
    viralVerticals: ['billionaire'],
    keywords: [
      ['\\bbillionaires?\\b', 3], ['\\bmillionaires?\\b', 3], ['\\bluxury\\b', 3],
      ['\\byachts?\\b', 3], ['\\bprivate jets?\\b', 3], ['\\bmansions?\\b', 3],
      ['\\bmusk\\b', 3], ['\\bbezos\\b', 3], ['\\bbuffett\\b', 3], ['\\bzuckerberg\\b', 3],
      ['\\brolex\\b', 3], ['\\bfortune\\b', 2], ['\\bthe ultra[- ]wealthy\\b', 3],
      ['\\bnet worth\\b', 3], ['\\brichest\\b', 3], ['\\btycoons?\\b', 2], ['\\bempire\\b', 1],
    ],
  },
  {
    slug: 'mystery',
    label: 'Mystery & Unsolved',
    noun: 'mysteries',
    h1: 'Free YouTube Shorts scripts about mysteries',
    intro:
      'Unsolved disappearances, signals nobody can explain, places that should not exist. These are the retention scripts — every beat is written to make the next one unskippable.',
    hasNichePage: true,
    viralVerticals: ['mystery'],
    keywords: [
      ['\\bmyster(?:y|ies|ious)\\b', 3], ['\\bunsolved\\b', 3], ['\\bdisappear(?:ed|ance|ances)\\b', 3],
      ['\\bvanished\\b', 3], ['\\bnobody (?:knows|can explain)\\b', 3], ['\\bunexplained\\b', 3],
      ['\\bstill (?:can\'t|cannot) explain\\b', 3], ['\\bparanormal\\b', 3], ['\\bhaunted\\b', 2],
      ['\\bbermuda triangle\\b', 3], ['\\bufos?\\b', 2], ['\\bcover[- ]?ups?\\b', 2],
      ['\\bconspirac(?:y|ies)\\b', 2], ['\\bstrange\\b', 1], ['\\beerie\\b', 2], ['\\bcurse[ds]?\\b', 2],
    ],
  },
  {
    slug: 'truecrime',
    label: 'True Crime',
    noun: 'true crime',
    h1: 'Free YouTube Shorts scripts about true crime',
    intro:
      'Cold cases, confessions and the one detail that cracked it. Full true-crime Shorts scripts written for a 45-second vertical cut, hook first.',
    hasNichePage: true,
    viralVerticals: ['crime'],
    keywords: [
      ['\\bmurder(?:s|ed|er)?\\b', 3], ['\\bkiller\\b', 3], ['\\bcold case\\b', 3],
      ['\\bdetectives?\\b', 3], ['\\bhomicide\\b', 3], ['\\bcrime scene\\b', 3],
      ['\\bserial killer\\b', 3], ['\\bconfession\\b', 2], ['\\bforensics?\\b', 3],
      ['\\bdna (?:test|evidence)\\b', 3], ['\\bpolice\\b', 2], ['\\bkidnapp?(?:ed|ing)\\b', 3],
      ['\\bverdict\\b', 2], ['\\bconvicted\\b', 3], ['\\bcriminals?\\b', 2],
    ],
  },
  {
    slug: 'history',
    label: 'History',
    noun: 'history',
    h1: 'Free YouTube Shorts scripts about history',
    intro:
      'Empires that fell in a day, wars that lasted minutes, and the small decisions that quietly redirected the world. History scripts already cut to Shorts length.',
    hasNichePage: true,
    viralVerticals: ['history'],
    keywords: [
      ['\\bhistor(?:y|ical|ians?)\\b', 3], ['\\bancient\\b', 3], ['\\bempires?\\b', 3],
      ['\\bcenturies|century\\b', 2], ['\\bmedieval\\b', 3], ['\\bpharaohs?\\b', 3],
      ['\\broman(?:s|\\sempire)?\\b', 3], ['\\bworld war\\b', 3], ['\\bcivili[sz]ations?\\b', 3],
      ['\\barchaeolog(?:y|ists?|ical)\\b', 3], ['\\bb\\.?c\\.?e?\\b', 2], ['\\b1[0-9]{3}s?\\b', 2],
      ['\\bdynast(?:y|ies)\\b', 3], ['\\bkingdoms?\\b', 3], ['\\bruins?\\b', 3],
      ['\\bnapoleon\\b', 3], ['\\begypt(?:ian)?\\b', 3], ['\\bslave(?:ry|s)?\\b', 3],
      ['\\bcolonial|colonis(?:ed|ation)|coloniz(?:ed|ation)\\b', 3], ['\\bbattles?\\b', 2],
      ['\\brevolutions?\\b', 2], ['\\bemperors?\\b', 3], ['\\bpompeii\\b', 3],
      ['\\bvikings?\\b', 3], ['\\bmumm(?:y|ies)\\b', 3], ['\\bpyramids?\\b', 3],
      ['\\btribes?\\b', 2], ['\\byears ago\\b', 2], ['\\bin the 1[0-9]{3}\\b', 3],
      ['\\bwarriors?\\b', 2], ['\\bthe war\\b', 2], ['\\bhistory of\\b', 3],
    ],
  },
  {
    slug: 'geography',
    label: 'Countries & Places',
    noun: 'countries and places',
    h1: 'Free YouTube Shorts scripts about countries and places',
    intro:
      'Countries with impossible rules, cities built on top of cities, islands nobody is allowed to land on. Geography Shorts scripts, hook to payoff.',
    hasNichePage: true,
    viralVerticals: ['country'],
    keywords: [
      ['\\bcountr(?:y|ies)\\b', 3], ['\\bislands?\\b', 3], ['\\bcit(?:y|ies)\\b', 2],
      ['\\bborders?\\b', 3], ['\\bnations?\\b', 1], ['\\bcapital city\\b', 3],
      ['\\bmountains?\\b', 3], ['\\bdeserts?\\b', 3], ['\\bpopulation\\b', 2],
      ['\\bgeograph(?:y|ic|ical)\\b', 3], ['\\bcontinents?\\b', 3], ['\\bvillages?\\b', 2],
      ['\\bjapan(?:ese)?\\b', 2], ['\\biceland\\b', 3], ['\\bnorway\\b', 3], ['\\bdubai\\b', 3],
      ['\\bswitzerland\\b', 3], ['\\bantarctica\\b', 3], ['\\bthe arctic\\b', 3],
      ['\\bafrica[n]?\\b', 2], ['\\bindia[n]?\\b', 2], ['\\bbrazil(?:ian)?\\b', 2],
      ['\\bnigeria[n]?\\b', 2], ['\\bchina|chinese\\b', 2], ['\\brussia[n]?\\b', 2],
      ['\\bmexic(?:o|an)\\b', 2], ['\\bcanada|canadian\\b', 2], ['\\baustralia[n]?\\b', 2],
      ['\\beurope(?:an)?\\b', 2], ['\\bvolcano(?:es)?\\b', 3], ['\\bwaterfalls?\\b', 3],
      ['\\blakes?\\b', 2], ['\\brivers?\\b', 2], ['\\bpeninsulas?\\b', 3], ['\\bglaciers?\\b', 3],
      ['\\btowns?\\b', 2], ['\\bregions?\\b', 1], ['\\bterritor(?:y|ies)\\b', 2],
    ],
  },
  {
    slug: 'space',
    label: 'Space',
    noun: 'space',
    h1: 'Free YouTube Shorts scripts about space',
    intro:
      'Black holes, missing probes, the edge of the observable universe. Space Shorts scripts written so the scale lands in the first two seconds.',
    hasNichePage: true,
    viralVerticals: ['space'],
    keywords: [
      ['\\bspace\\b', 2], ['\\bnasa\\b', 3], ['\\bgalax(?:y|ies)\\b', 3], ['\\bblack holes?\\b', 3],
      ['\\bplanets?\\b', 3], ['\\bmars\\b', 3], ['\\bmoon\\b', 2], ['\\bstars?\\b', 1],
      ['\\bastronauts?\\b', 3], ['\\bthe universe\\b', 3], ['\\bsolar system\\b', 3],
      ['\\btelescopes?\\b', 3], ['\\borbit(?:s|ing)?\\b', 3], ['\\bcomets?\\b', 3],
      ['\\basteroids?\\b', 3], ['\\bjupiter\\b', 3], ['\\bsaturn\\b', 3], ['\\bvenus\\b', 3],
      ['\\blight[- ]years?\\b', 3], ['\\bspacecraft\\b', 3],
    ],
  },
  {
    slug: 'science',
    label: 'Science',
    noun: 'science',
    h1: 'Free YouTube Shorts scripts about science',
    intro:
      'The experiments that broke intuition and the numbers nobody believes the first time. Science Shorts scripts with the payoff engineered to be saveable.',
    hasNichePage: true,
    viralVerticals: ['science'],
    keywords: [
      ['\\bscien(?:ce|tists?|tific)\\b', 3], ['\\bexperiments?\\b', 3], ['\\bphysics\\b', 3],
      ['\\bquantum\\b', 3], ['\\batoms?\\b', 3], ['\\bchemistry\\b', 3], ['\\bmolecul(?:e|es|ar)\\b', 3],
      ['\\bresearchers?\\b', 2], ['\\bgravit(?:y|ational)\\b', 3],
      ['\\bevolution\\b', 2], ['\\btemperatures?\\b', 2], ['\\blaborator(?:y|ies)\\b', 3],
      ['\\bparticles?\\b', 3], ['\\bbiolog(?:y|ical|ists?)\\b', 3], ['\\bneurons?\\b', 3],
      ['\\bdna\\b', 2], ['\\belectric(?:ity|al)\\b', 2], ['\\bmagnetic\\b', 3],
      ['\\bradiation\\b', 3], ['\\bnuclear\\b', 2], ['\\bmathematic(?:s|al)|\\bequations?\\b', 3],
    ],
  },
  {
    slug: 'ai',
    label: 'AI & Tech',
    noun: 'AI and tech',
    h1: 'Free YouTube Shorts scripts about AI and tech',
    intro:
      'What AI just changed, what it is about to change, and the tools that quietly replaced a job last quarter. Tech Shorts scripts written to age slowly.',
    hasNichePage: true,
    viralVerticals: ['ai', 'technology'],
    keywords: [
      ['\\ba\\.?i\\.?\\b', 3], ['\\bartificial intelligence\\b', 3], ['\\bchatgpt\\b', 3],
      ['\\balgorithms?\\b', 2], ['\\bsoftware\\b', 2], ['\\brobots?\\b', 3],
      ['\\bmachine learning\\b', 3], ['\\bautomation\\b', 3], ['\\bsmartphones?\\b', 2],
      ['\\bapps?\\b', 1], ['\\bsilicon valley\\b', 3], ['\\bstartups?\\b', 2],
      ['\\bcomputers?\\b', 2], ['\\bopenai\\b', 3], ['\\btechnolog(?:y|ies|ical)\\b', 2],
      ['\\bdata centers?\\b', 3], ['\\bcrypto(?:currency)?\\b', 2], ['\\bbitcoin\\b', 3],
    ],
  },
  {
    slug: 'psychology',
    label: 'Psychology',
    noun: 'psychology',
    h1: 'Free YouTube Shorts scripts about psychology',
    intro:
      'Why silence makes people talk, why your brain replays embarrassment, and the sentence that ends an argument. Psychology Shorts scripts with a usable takeaway.',
    hasNichePage: true,
    viralVerticals: ['psychology'],
    keywords: [
      ['\\bpsycholog(?:y|ical|ists?)\\b', 3], ['\\byour brain\\b', 3], ['\\bthe brain\\b', 3],
      ['\\bbehaviou?r(?:al)?\\b', 3], ['\\bsubconscious\\b', 3], ['\\bcognitive\\b', 3],
      ['\\bmemor(?:y|ies)\\b', 2], ['\\bemotions?\\b', 2], ['\\bpersonalit(?:y|ies)\\b', 3],
      ['\\bmanipulat(?:e|ion|ive)\\b', 3], ['\\bbody language\\b', 3], ['\\bbias(?:es)?\\b', 3],
      ['\\bpeople (?:instantly|automatically)\\b', 2], ['\\bmind trick\\b', 3],
    ],
  },
  {
    slug: 'motivation',
    label: 'Motivation & Mindset',
    noun: 'motivation and mindset',
    h1: 'Free YouTube Shorts scripts about motivation and mindset',
    intro:
      'Discipline, habits and the uncomfortable truths that actually move the needle. Motivation Shorts scripts that land a specific idea instead of a poster quote.',
    hasNichePage: true,
    viralVerticals: [],
    keywords: [
      ['\\bmotivat(?:ion|ed|ing)\\b', 3], ['\\bdisciplines?\\b', 3], ['\\bhabits?\\b', 3],
      ['\\bmindset\\b', 3], ['\\bsuccess(?:ful)?\\b', 2], ['\\bconsistency\\b', 3],
      ['\\bprocrastinat(?:e|ion|ing)\\b', 3], ['\\byour goals?\\b', 2], ['\\bself[- ]?improvement\\b', 3],
      ['\\bstoic(?:ism)?\\b', 3], ['\\bdiscomfort\\b', 2], ['\\b5 ?a\\.?m\\.?\\b', 2],
      ['\\bevery single day\\b', 1], ['\\bwake up\\b', 1],
    ],
  },
  {
    slug: 'health',
    label: 'Health & Body',
    noun: 'health',
    h1: 'Free YouTube Shorts scripts about health',
    intro:
      'Sleep, food, the body doing something absurd 100,000 times a day. Health Shorts scripts written around one concrete, checkable fact per beat.',
    hasNichePage: true,
    viralVerticals: ['health'],
    keywords: [
      ['\\bhealth(?:y|ier)?\\b', 3], ['\\bsleep(?:ing)?\\b', 3], ['\\bdoctors?\\b', 3],
      ['\\bmuscles?\\b', 3], ['\\bhearts? rate\\b', 3], ['\\bimmune\\b', 3],
      ['\\bdiets?\\b', 3], ['\\bnutriti(?:on|onal|ents?)\\b', 3], ['\\bexercis(?:e|ing)\\b', 3],
      ['\\byour body\\b', 3], ['\\bblood\\b', 2], ['\\bcells?\\b', 2], ['\\bhormones?\\b', 3],
      ['\\bmedical\\b', 2], ['\\bdiseases?\\b', 3], ['\\bstress\\b', 2], ['\\blongevity\\b', 3],
      ['\\bpain\\b', 3], ['\\bherniae?s?\\b', 3], ['\\binjur(?:y|ies|ed)\\b', 3],
      ['\\bsurger(?:y|ies)\\b', 3], ['\\bsymptoms?\\b', 3], ['\\bcancer\\b', 3],
      ['\\bvitamins?\\b', 3], ['\\barthritis\\b', 3], ['\\btherapy\\b', 3],
      ['\\banxiety\\b', 2], ['\\bweight loss\\b', 3], ['\\bobesity\\b', 3],
      ['\\bmental health\\b', 3], ['\\blungs?|kidneys?|liver\\b', 3], ['\\bbones?\\b', 2],
      ['\\bskin\\b', 2], ['\\bteeth|dental\\b', 3], ['\\bpregnan(?:t|cy)\\b', 3],
      ['\\bvirus(?:es)?\\b', 3], ['\\bmedicine\\b', 3],
    ],
  },
  {
    slug: 'animals',
    label: 'Animals & Nature',
    noun: 'animals and nature',
    h1: 'Free YouTube Shorts scripts about animals and nature',
    intro:
      'Immortal jellyfish, octopus intelligence, the ocean floor being less mapped than Mars. Animal and nature Shorts scripts, already trimmed to 45 seconds.',
    hasNichePage: true,
    viralVerticals: ['nature'],
    keywords: [
      ['\\banimals?\\b', 3], ['\\bspecies\\b', 3], ['\\boceans?\\b', 2], ['\\bsharks?\\b', 3],
      ['\\bwhales?\\b', 3], ['\\boctopus(?:es)?\\b', 3], ['\\bbirds?\\b', 3],
      ['\\binsects?\\b', 3], ['\\bpredators?\\b', 3], ['\\bforests?\\b', 3],
      ['\\bjungles?\\b', 3], ['\\bwildlife\\b', 3], ['\\bextinct(?:ion)?\\b', 3],
      ['\\bdinosaurs?\\b', 3], ['\\bspiders?\\b', 3], ['\\bvenom(?:ous)?\\b', 3],
      ['\\bcorals?\\b', 3], ['\\bmigrat(?:e|ion|ing)\\b', 2], ['\\bnature\\b', 2],
      ['\\bsnakes?\\b', 3], ['\\bpenguins?\\b', 3], ['\\bwolves|wolf\\b', 3],
      ['\\blions?\\b', 3], ['\\belephants?\\b', 3], ['\\btigers?\\b', 3], ['\\bbears?\\b', 2],
      ['\\bjellyfish\\b', 3], ['\\bfish\\b', 2], ['\\bbees?\\b', 3], ['\\bants?\\b', 2],
      ['\\bcats?\\b', 2], ['\\bdogs?\\b', 2], ['\\bhorses?\\b', 2], ['\\breptiles?\\b', 3],
      ['\\bmammals?\\b', 3], ['\\bcreatures?\\b', 2], ['\\bturtles?\\b', 3],
      ['\\beagles?\\b', 3], ['\\bcrocodiles?|alligators?\\b', 3], ['\\bmonkeys?|apes?\\b', 3],
      ['\\brainforests?\\b', 3], ['\\bhabitats?\\b', 3], ['\\bwild\\b', 1],
    ],
  },
  {
    slug: 'business',
    label: 'Business',
    noun: 'business',
    h1: 'Free YouTube Shorts scripts about business',
    intro:
      'Companies that died overnight, pricing tricks in plain sight, and the decision that made a brand permanent. Business Shorts scripts with a real case in every beat.',
    hasNichePage: true,
    viralVerticals: [],
    keywords: [
      ['\\bbusinesse?s?\\b', 3], ['\\bcompan(?:y|ies)\\b', 3], ['\\bbrands?\\b', 3],
      ['\\bceos?\\b', 3], ['\\bmarketing\\b', 3], ['\\bcustomers?\\b', 2],
      ['\\brevenue\\b', 3], ['\\bbankrupt(?:cy)?\\b', 3], ['\\bproducts?\\b', 1],
      ['\\bfounders?\\b', 3], ['\\bnetflix\\b', 2], ['\\bamazon\\b', 2], ['\\bnike\\b', 3],
      ['\\bmcdonald\'?s\\b', 3], ['\\bmarket share\\b', 3], ['\\bpricing\\b', 3],
    ],
  },
  {
    slug: 'sports',
    label: 'Sports Legends',
    noun: 'sport',
    h1: 'Free YouTube Shorts scripts about sport',
    intro:
      'The 13 seconds that rewrote a record, the injury nobody came back from, the play coaches still cannot explain. Sports Shorts scripts built around one decisive moment.',
    hasNichePage: true,
    viralVerticals: [],
    keywords: [
      ['\\bfootball\\b', 3], ['\\bsoccer\\b', 3], ['\\bbasketball\\b', 3], ['\\bnba\\b', 3],
      ['\\bfifa|world cup\\b', 3], ['\\bolympics?|olympic\\b', 3], ['\\bathletes?\\b', 3],
      ['\\bmessi|ronaldo|neymar\\b', 3], ['\\bmatch(?:es)?\\b', 2], ['\\bgoalkeepers?\\b', 3],
      ['\\bstadiums?\\b', 3], ['\\bchampionships?\\b', 3], ['\\btournaments?\\b', 3],
      ['\\bboxing|mma|ufc\\b', 3], ['\\btennis\\b', 3], ['\\bcricket\\b', 3],
      ['\\bcoach(?:es)?\\b', 2], ['\\bthe (?:teams?|players?)\\b', 2], ['\\bgoals? (?:in|of)\\b', 2],
      ['\\btrophy|trophies\\b', 3], ['\\bmanchester united|real madrid|barcelona\\b', 3],
    ],
  },
  {
    slug: 'movies',
    label: 'Movies & Pop Culture',
    noun: 'movies and pop culture',
    h1: 'Free YouTube Shorts scripts about movies and pop culture',
    intro:
      'Film details nobody noticed, the scene that was never in the script, the franchise fact that reframes the whole story. Pop-culture Shorts scripts, hook first.',
    hasNichePage: true,
    viralVerticals: [],
    keywords: [
      ['\\bmovies?\\b', 3], ['\\bfilms?\\b', 3], ['\\bhollywood\\b', 3], ['\\bactors?\\b', 3],
      ['\\bactress(?:es)?\\b', 3], ['\\bdirectors?\\b', 2], ['\\bcinema\\b', 3],
      ['\\banime\\b', 3], ['\\bmanga\\b', 3], ['\\bnetflix series|tv series\\b', 3],
      ['\\bscenes?\\b', 2], ['\\bmarvel|dc comics\\b', 3], ['\\bdisney\\b', 3],
      ['\\bone piece|naruto|dragon ball\\b', 3], ['\\bcharacters?\\b', 2],
      ['\\bseasons?\\b', 1], ['\\bstar wars|harry potter\\b', 3], ['\\bmusic videos?\\b', 2],
      ['\\bsingers?|rappers?\\b', 3], ['\\balbums?\\b', 3], ['\\bvideo games?\\b', 3],
      ['\\bpixar\\b', 3], ['\\bcartoons?\\b', 3], ['\\banimation\\b', 3],
      ['\\bcomics?\\b', 3], ['\\bepisodes?\\b', 2], ['\\bplot twist\\b', 3],
      ['\\bcelebrit(?:y|ies)\\b', 3], ['\\bsongs?\\b', 2], ['\\bsoundtrack\\b', 3],
    ],
  },
  {
    slug: 'food',
    label: 'Food & Drink',
    noun: 'food',
    h1: 'Free YouTube Shorts scripts about food',
    intro:
      'What is really in it, why it costs that much, and the dish a whole country argues about. Food Shorts scripts with a fact per beat instead of a recipe.',
    hasNichePage: true,
    viralVerticals: [],
    keywords: [
      ['\\bfoods?\\b', 3], ['\\brecipes?\\b', 3], ['\\bcooking|cooked\\b', 3],
      ['\\bkitchens?\\b', 3], ['\\brestaurants?\\b', 3], ['\\bchefs?\\b', 3],
      ['\\bcoffee\\b', 3], ['\\bchocolate\\b', 3], ['\\bcheese\\b', 3], ['\\bbread\\b', 3],
      ['\\bmeals?\\b', 2], ['\\bflavou?rs?\\b', 3], ['\\bingredients?\\b', 3],
      ['\\bpizza|burgers?|sushi|pasta\\b', 3], ['\\bspices?\\b', 3], ['\\bdishes\\b', 3],
      ['\\bdrinks?\\b', 2], ['\\bwine|beer\\b', 3], ['\\beat(?:ing|en)\\b', 2],
    ],
  },
  {
    slug: 'facts',
    label: 'Mind-Blowing Facts',
    noun: 'surprising facts',
    h1: 'Free YouTube Shorts scripts about surprising facts',
    intro:
      'The catch-all shelf: scripts built on one scroll-stopping fact after another, from everyday objects with absurd backstories to numbers that break intuition.',
    hasNichePage: true,
    viralVerticals: [],
    // Deliberately empty: `facts` is the fallback bucket, never scored. A script
    // that matches nothing specific IS a general-facts Short.
    keywords: [],
  },
]

/** Static list for `generateStaticParams`. Order = render order on the hub. */
export const SCRIPT_VERTICAL_SLUGS: string[] = SCRIPT_VERTICALS.map((v) => v.slug)

/** The bucket a script lands in when nothing scores. */
export const FALLBACK_VERTICAL = 'facts'

const BY_SLUG = new Map(SCRIPT_VERTICALS.map((v) => [v.slug, v]))

export function getScriptVertical(slug: string): ScriptVertical | null {
  return BY_SLUG.get(slug) ?? null
}

/**
 * Compiled once at module load. Building 250-odd RegExp objects per video (×729
 * videos × 15 verticals) inside the render would be the single most expensive
 * thing on the page, and the patterns never change.
 */
const COMPILED: Array<{ slug: string; rules: Array<[RegExp, number]> }> = SCRIPT_VERTICALS.map(
  (v) => ({
    slug: v.slug,
    rules: v.keywords.map(([src, weight]) => [new RegExp(src, 'i'), weight] as [RegExp, number]),
  }),
)

/**
 * Minimum score before a specific vertical beats the `facts` fallback. One
 * incidental mention of "money" inside an animal script must not reclassify it,
 * so a single weight-1 or weight-2 hit is not enough.
 */
const MIN_VERTICAL_SCORE = 5

/**
 * Derive the vertical from the script text.
 *
 * The title is weighted double because it is the first narrated sentence — the
 * hook — and the hook is what the whole Short is actually about. The body is
 * capped at 1200 chars: past that point we are scoring the outro, not the topic.
 */
export function classifyVertical(title: string, transcript: string): string {
  const haystackTitle = ` ${title} `
  const haystackBody = ` ${transcript.slice(0, 1200)} `
  let bestSlug = FALLBACK_VERTICAL
  let bestScore = 0
  for (const { slug, rules } of COMPILED) {
    let score = 0
    for (const [re, weight] of rules) {
      if (re.test(haystackTitle)) score += weight * 2
      else if (re.test(haystackBody)) score += weight
    }
    // Strictly greater: SCRIPT_VERTICALS order breaks ties toward the broader
    // bucket declared first, which keeps the result stable between deploys.
    if (score > bestScore) {
      bestScore = score
      bestSlug = slug
    }
  }
  return bestScore >= MIN_VERTICAL_SCORE ? bestSlug : FALLBACK_VERTICAL
}

// ── Excerpt cleaning ────────────────────────────────────────────────────────

/**
 * Belt-and-braces removal of production residue from a public excerpt.
 *
 * `transcriptParagraphs()` in lib/publicVideos.ts already runs every chunk
 * through `stripScriptMarkers()`, which deletes `[Pexels: …]` brackets, stage
 * prefixes, directive lines and metadata-section bodies — and as measured on
 * 2026-08-03, 100% of the Pexels mentions in production are the bracketed form
 * it handles. This function only guards the shapes that would survive that
 * cleaner if the generator ever emitted them un-bracketed: a bare
 * `Pexels: query` / `B-roll: query` / `Visual prompt: …` / `Footage: …` run.
 */
export function stripFootageResidue(text: string): string {
  return text
    .replace(/\b(?:pexels|b-?roll|footage|visual(?:\s+prompt)?|stock\s+video)\s*[:\-–]\s*[^.!?\n]*/gi, ' ')
    .replace(/\s{2,}/g, ' ')
    .trim()
}

/**
 * A row whose `topic` is not a script at all but the GENERATOR'S OWN PROMPT,
 * stored verbatim — "Create the next episode in the same Short series about …
 * Keep the topic and format recognizable, but use a completely new hook".
 *
 * These USED to clear the length gate in lib/publicVideos.ts (they are long,
 * and the text IS unique), so they stayed in the sitemap; this module refused
 * to card them, but that only cleaned the library, not the index. Featuring a
 * card headlined `Ke". Keep the topic and format recognizable…` was obviously
 * wrong — and so was letting Google read it as an `<h1>`.
 *
 * KINEO-SEO-VIDEO-PAGES-2026-08-11 — the rule moved UP into
 * lib/publicVideos.ts, where it is now a hard gate failure: such a row renders
 * `noindex` and never reaches the sitemap. The regex lives there (this module
 * already imports that one, so the direction is unchanged and there is no
 * cycle) and is re-exported here so the existing call sites keep working.
 *
 * Measured on production 2026-08-03: 9 of 729 completed rows match.
 * Re-measured 2026-08-11: 13 of 914, of which 3 had reached the live sitemap.
 */
export { isPromptScaffolding }

/** A one- or two-sentence card excerpt, clipped on a word boundary. */
export function excerptFor(v: PublicVideo, max = 190): string {
  const body = stripFootageResidue(v.paragraphs.join(' '))
  // Drop the hook if it is already the H1 — repeating it on the card is noise.
  const withoutTitle = body.startsWith(v.title) ? body.slice(v.title.length).trim() : body
  const source = withoutTitle.length >= 60 ? withoutTitle : body
  if (source.length <= max) return source
  return source.slice(0, max).replace(/\s+\S*$/, '') + '…'
}

// ── The collection ──────────────────────────────────────────────────────────

export type LibraryScript = {
  id: string
  title: string
  /** Site-relative href — always `/v/<id>`. */
  href: string
  excerpt: string
  vertical: string
  publishedAt: string
  durationSeconds: number | null
  isStructuredScript: boolean
  wordCount: number
}

export type ScriptLibrary = {
  /** Every indexable script, newest first. */
  scripts: LibraryScript[]
  /** slug → scripts, newest first. Every declared vertical has a key. */
  byVertical: Record<string, LibraryScript[]>
  /** slug → count. Convenience for nav badges. */
  counts: Record<string, number>
  total: number
}

function toLibraryScript(v: PublicVideo): LibraryScript {
  const transcript = stripFootageResidue(v.transcript)
  return {
    id: v.id,
    title: v.title,
    href: `/v/${v.id}`,
    excerpt: excerptFor(v),
    vertical: classifyVertical(v.title, transcript),
    publishedAt: v.publishedAt,
    durationSeconds: v.durationSeconds,
    isStructuredScript: v.isStructuredScript,
    wordCount: transcript.split(/\s+/).filter(Boolean).length,
  }
}

/**
 * In-process memo, deliberately NOT React's `cache()`: @types/react is pinned at
 * 18.3 in this repo and does not export `cache`, so importing it would break
 * `tsc --noEmit`. A short-TTL promise memo achieves the thing that actually
 * matters here — one Supabase read per render pass instead of one per component
 * (`/scripts` needs the counts, the recent grid AND the vertical rails; the
 * static generation of the 15 vertical pages happens in the same process).
 * Longer-term freshness is still owned by each route's `revalidate`; these are
 * ISR pages, never `force-dynamic`.
 */
let memo: { at: number; value: Promise<ScriptLibrary> } | null = null
const MEMO_TTL_MS = 60_000

/**
 * Build the whole library.
 *
 * NEVER throws: `listIndexablePublicVideos()` swallows its own errors and
 * returns `[]`, so a Supabase outage degrades the hub to an empty-but-valid
 * page rather than a 500 across the whole cluster.
 */
export function getScriptLibrary(): Promise<ScriptLibrary> {
  const now = Date.now()
  if (memo && now - memo.at < MEMO_TTL_MS) return memo.value
  const value = buildScriptLibraryCached().catch((err: unknown) => {
    // A rejected promise must not be memoised, or one blip poisons the TTL.
    memo = null
    throw err
  })
  memo = { at: now, value }
  return value
}

// AQUISICAO T4 (14/08) — o memo acima e por INSTANCIA de lambda: o primeiro
// acesso de um /v/[id] recem-compartilhado e o crawler do WhatsApp, batendo
// numa lambda fria, e pagava a varredura completa (ate 2.400 linhas + regex)
// dentro do request — estourou o tempo do scraper, o link circula SEM preview.
// unstable_cache poe a biblioteca no data cache do Next, compartilhado entre
// instancias e deploys: a varredura roda no maximo 1x/hora no cluster inteiro.
// ScriptLibrary e 100% JSON-serializavel (conferido: strings/numeros/bools).
const buildScriptLibraryCached = unstable_cache(buildScriptLibrary, ['script-library-v1'], {
  revalidate: 3600,
})

async function buildScriptLibrary(): Promise<ScriptLibrary> {
  const videos = await listIndexablePublicVideos(LIBRARY_FETCH_LIMIT)
  const scripts = videos
    .filter((v) => !isPromptScaffolding(v.title) && !isPromptScaffolding(v.transcript))
    .map(toLibraryScript)

  const byVertical: Record<string, LibraryScript[]> = {}
  const counts: Record<string, number> = {}
  for (const slug of SCRIPT_VERTICAL_SLUGS) {
    byVertical[slug] = []
    counts[slug] = 0
  }
  for (const s of scripts) {
    const bucket = byVertical[s.vertical] ?? byVertical[FALLBACK_VERTICAL]
    bucket.push(s)
    counts[s.vertical] = (counts[s.vertical] ?? 0) + 1
  }

  return { scripts, byVertical, counts, total: scripts.length }
}

/**
 * Sibling scripts for the "More scripts like this" block on `/v/[id]`.
 *
 * Only members of the library are returned, and every member is by definition
 * an indexable page — so this block can never emit a link to a `noindex` or
 * missing URL. When the video's own vertical is too small to fill the block, the
 * newest scripts overall top it up rather than shipping a two-link rail.
 */
export async function getRelatedScripts(
  videoId: string,
  wanted = 9,
): Promise<{ vertical: string | null; related: LibraryScript[] }> {
  const lib = await getScriptLibrary()
  const self = lib.scripts.find((s) => s.id === videoId) ?? null
  const vertical = self?.vertical ?? null

  const related: LibraryScript[] = []
  const seen = new Set<string>([videoId])
  const push = (s: LibraryScript) => {
    if (seen.has(s.id) || related.length >= wanted) return
    seen.add(s.id)
    related.push(s)
  }

  if (vertical) for (const s of lib.byVertical[vertical] ?? []) push(s)
  if (related.length < Math.min(6, wanted)) for (const s of lib.scripts) push(s)

  return { vertical, related }
}

// ── Conversion ──────────────────────────────────────────────────────────────

/**
 * The "Generate a Short from this script →" hand-off.
 *
 * This reuses the EXACT contract that already exists in the repo — the one
 * app/HomeTopicForm.tsx builds and app/(auth)/signup/page.tsx forwards into
 * /generate: `/signup?prompt=…&create_intent=fast&intent_campaign=…&utm_source=…`.
 * No new querystring contract is invented here.
 *
 * The TITLE is seeded, not the stored script: handing back the full script would
 * regenerate a duplicate of a page we are trying to get indexed. Signup slices
 * `prompt` at 1000 chars; a 160-char idea is comfortably inside that.
 */
export function generateFromScriptHref(title: string, campaign: string): string {
  const params = new URLSearchParams({
    prompt: title.trim().slice(0, 160),
    create_intent: 'fast',
    intent_campaign: campaign,
    utm_source: 'script_library',
    utm_medium: 'organic',
    utm_campaign: campaign,
  })
  return `/signup?${params.toString()}`
}
