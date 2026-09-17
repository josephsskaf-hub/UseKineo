// PROJETO 1 — GOOGLE (docs/PROJETO-1-GOOGLE-2026-09-17.md) — o catálogo das páginas de intenção.
//
// Fundador (17/09/2026 00:40 BRT): "os concorrentes pagam o Google?" — pouco; Fliki tem ~1 milhão de
// visitas/mês quase todas orgânicas, de páginas de intenção ("AI video generator for X", "text to video
// in Hindi", "Fliki alternative"). A Kineo tinha 9 visitantes do Google em 7 dias. Este catálogo gera as
// 100 primeiras páginas em 4 famílias: NICHO (para quem), FORMATO (que vídeo), IDIOMA (em que língua) e
// ALTERNATIVA (em vez de quem). Cada página mostra filmes REAIS da casa (vitrine do fundador, selo do motor
// real), lê preço/trial da fonte única (nunca literal) e abre o Studio com o prompt daquele nicho.
//
// Regras que o guardião (scripts/test-projeto-1-google-2026-09-17.mjs) prende: slugs únicos e em kebab-case,
// prompt de exemplo com ≥ 8 palavras, nenhuma frase proibida (preço/crédito literal, motor pausado como
// disponível, "every engine unlocked"), e a família 'alternative' só afirma o que é verdade sobre a Kineo —
// nunca inventa números do concorrente.

export type IntentFamily = 'niche' | 'format' | 'language' | 'alternative'
export type IntentEngine = 'fast' | 'cinematic_ai'

export interface IntentPage {
  slug: string
  family: IntentFamily
  /** a busca que a página mira, em inglês, como a pessoa digita */
  keyword: string
  title: string
  h1: string
  intro: string
  /** o que a pessoa escreve na caixa — vai pré-preenchido para o Studio */
  examplePrompt: string
  /** motor sugerido: Kineo 1 (stock, cabe no trial) ou Seedance 1.5 (gerado) */
  engine: IntentEngine
  /** por que este motor para este caso */
  engineWhy: string
  /** 3 perguntas próprias da página (preço/trial vêm do template, da fonte única) */
  faq: Array<{ q: string; a: string }>
  /** só na família 'alternative' */
  competitor?: { name: string; differences: string[] }
}

const kebab = (s: string) => s.toLowerCase().replace(/&/g, 'and').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')

// ── NICHO: para quem ─────────────────────────────────────────────────────────────────────────────
type NicheSeed = { name: string; who: string; prompt: string; engine?: IntentEngine; why?: string }
const NICHES: NicheSeed[] = [
  { name: 'faceless YouTube channels', who: 'creators who post daily without showing their face', prompt: '5 places on Earth where compasses stop working, and the science behind each one' },
  { name: 'YouTube Shorts creators', who: 'creators who need a finished vertical Short every day', prompt: 'The one habit that quietly separates people who save money from people who never do' },
  { name: 'TikTok', who: 'creators who need fast, captioned vertical videos with a hook in the first second', prompt: 'Why airplane windows are round: the crash that changed every plane after 1954' },
  { name: 'Instagram Reels creators', who: 'brands and creators posting vertical Reels several times a week', prompt: 'Three morning routines used by athletes that anyone can copy before 8 AM' },
  { name: 'true crime', who: 'channels that narrate real cases with atmosphere and captions', prompt: 'The unsolved disappearance at Dyatlov Pass: what the nine hikers left behind', engine: 'cinematic_ai', why: 'True crime lives on atmosphere; generated scenes give you the snowbound tent and the flashlight without stock footage of someone else’s story.' },
  { name: 'history', who: 'history channels that need period-accurate scenes without a film crew', prompt: 'The last day of Pompeii, told hour by hour from the people who stayed', engine: 'cinematic_ai', why: 'Generated scenes can show 79 AD; a stock library cannot.' },
  { name: 'mystery and unexplained', who: 'channels built on "nobody knows why" stories', prompt: 'The signal from space that lasted 72 seconds and never repeated' },
  { name: 'science explainers', who: 'educators turning one concept into a 60-second explainer', prompt: 'Why the sky is blue and sunsets are red, explained in 60 seconds with no jargon' },
  { name: 'personal finance', who: 'finance creators who post money tips and facts', prompt: 'Compound interest explained with one real number: what $100 a month becomes in 30 years' },
  { name: 'real estate agents', who: 'agents who want listing and neighborhood videos without hiring a videographer', prompt: 'Five things to check before buying your first apartment that most buyers forget' },
  { name: 'motivation and mindset', who: 'creators posting daily motivation with a strong hook', prompt: 'The 5 AM rule billionaires actually follow, and the part nobody tells you' },
  { name: 'kids stories', who: 'parents and channels making short bedtime stories with characters', prompt: 'Leo the orange cat works the night shift collecting lost socks, and one night gets caught', engine: 'cinematic_ai', why: 'A story with a named character needs the same character in every scene; that is what a generative engine does and stock footage cannot.' },
  { name: 'product demos', who: 'founders and marketers showing what a product does in one minute', prompt: 'How a portable power station keeps a home running during a blackout, step by step' },
  { name: 'churches and ministries', who: 'ministries posting a daily verse or sermon clip', prompt: 'A 60-second reflection on Psalm 23 for someone having a hard week' },
  { name: 'coaches and consultants', who: 'coaches turning one lesson into a daily vertical video', prompt: 'The three questions a good coach asks before giving any advice' },
  { name: 'e-commerce stores', who: 'store owners who need a product video for every listing', prompt: 'Why ceramic non-stick pans last longer than Teflon, and how to care for one' },
  { name: 'travel', who: 'travel creators narrating places they have not filmed themselves', prompt: 'The island nobody is allowed to visit: North Sentinel Island explained' },
  { name: 'geography and countries', who: 'channels about places, borders and scale', prompt: 'Why Bhutan measures happiness instead of GDP, and what it changed' },
  { name: 'space and astronomy', who: 'space channels that explain one discovery per video', prompt: 'The object leaving our solar system faster than anything we have ever launched', engine: 'cinematic_ai', why: 'Deep space has no stock footage; generated scenes put the viewer next to the object.' },
  { name: 'health and fitness', who: 'trainers and wellness creators posting daily tips', prompt: 'What happens to your body 10 minutes, 1 hour and 1 day after your last coffee' },
  { name: 'psychology facts', who: 'creators who post one counterintuitive psychology fact a day', prompt: 'Why you remember embarrassing moments for 20 years but forget where you parked' },
  { name: 'language teachers', who: 'teachers posting a daily lesson with captions', prompt: 'Five English phrases native speakers use every day that textbooks never teach' },
  { name: 'news recaps', who: 'creators summarizing one story a day in 60 seconds', prompt: 'What the new EU rule on phone chargers actually changes for you' },
  { name: 'sports stories', who: 'sports channels retelling legendary moments', prompt: 'The goalkeeper who scored from his own box and the 3 seconds that decided the title' },
  { name: 'business and startups', who: 'founders sharing lessons and company stories', prompt: 'The email that saved Airbnb in 2008, and what it said' },
  { name: 'real estate investing', who: 'investors explaining deals and numbers', prompt: 'How the 1% rule tells you in 10 seconds if a rental is worth it' },
  { name: 'crypto and web3', who: 'creators explaining one concept per video, without hype', prompt: 'What a blockchain actually stores, explained with a notebook and a pen' },
  { name: 'AI news', who: 'channels covering one AI announcement a day', prompt: 'What changed in AI video this week and what it means for creators' },
  { name: 'gaming lore', who: 'gaming channels narrating lore and history of games', prompt: 'The secret room in the original Zelda that took 30 years to find' },
  { name: 'horror stories', who: 'horror channels narrating short scary stories', prompt: 'The lighthouse keeper who logged the same visitor every night for a year', engine: 'cinematic_ai', why: 'Fear is built from framing and light; generated scenes give you the corridor, not a stock office.' },
  { name: 'book summaries', who: 'creators summarizing one book idea per video', prompt: 'The one idea from Atomic Habits that actually changes behavior, in 60 seconds' },
  { name: 'cooking and recipes', who: 'food creators who want a narrated recipe video without filming', prompt: 'The 3-ingredient pasta Romans have made for 2,000 years' },
  { name: 'pets and animals', who: 'animal channels sharing facts and stories', prompt: 'Five animals that survive conditions that would kill a human in minutes' },
  { name: 'cars and engineering', who: 'automotive channels explaining how things work', prompt: 'Why F1 cars could drive upside down: downforce explained in 60 seconds' },
  { name: 'local businesses', who: 'restaurants, gyms and shops posting a weekly video', prompt: 'Three reasons the best pizza in town is worth the 20-minute wait' },
  { name: 'nonprofits', who: 'organizations telling one story of impact a week', prompt: 'How one well changed a village of 400 people, told in 60 seconds' },
  { name: 'podcasters', who: 'podcast hosts turning one episode idea into a promo Short', prompt: 'The one question every guest on our show gets asked, and the best answer so far' },
  { name: 'teachers and classrooms', who: 'teachers making short lesson videos for students', prompt: 'How the water cycle works, for a 10-year-old, in one minute' },
  { name: 'affiliate marketers', who: 'creators reviewing products with a narrated video', prompt: 'Three things this budget microphone does better than one that costs four times more' },
  { name: 'agencies', who: 'agencies producing weekly videos for several clients', prompt: 'Why a dental clinic should post one 60-second video a week, with three topic ideas' },
]

// ── FORMATO: que vídeo ───────────────────────────────────────────────────────────────────────────
type FormatSeed = { name: string; what: string; prompt: string; engine?: IntentEngine; why?: string }
const FORMATS: FormatSeed[] = [
  { name: 'YouTube Shorts', what: 'a vertical 9:16 Short up to 60 seconds, captioned, ready to upload', prompt: 'Five facts about the deep ocean that sound fake but are true' },
  { name: 'TikTok videos', what: 'a vertical video with a hook in the first second and burned-in captions', prompt: 'Why your phone battery dies faster in the cold, in 60 seconds' },
  { name: 'Instagram Reels', what: 'a vertical Reel with narration, music and captions', prompt: 'Three small design choices that make a room feel twice as big' },
  { name: '60-second explainers', what: 'one concept, one minute, narrated and captioned', prompt: 'How noise-cancelling headphones actually cancel noise' },
  { name: 'documentary shorts', what: 'a mini documentary with narration and period-accurate scenes', prompt: 'The 1918 flu: how one city closed early and saved thousands', engine: 'cinematic_ai', why: 'A documentary needs scenes that exist only in the past; generation is the only honest way to show them.' },
  { name: 'faceless videos', what: 'a narrated video with no presenter on screen', prompt: 'The money habit that quietly keeps people broke, and how to break it' },
  { name: 'listicle videos', what: 'a numbered list, one scene per item, with captions', prompt: '7 countries where you can live well on $1,000 a month' },
  { name: 'story videos', what: 'a short narrated story with a beginning, a twist and an ending', prompt: 'A plump raccoon plans a Mission Impossible heist on a pie cooling on a windowsill', engine: 'cinematic_ai', why: 'A story with a recurring character needs the same character in every scene.' },
  { name: 'text to video', what: 'you paste text, Kineo turns it into a finished narrated video', prompt: 'In 1972, a plane crashed in the Andes and the survivors lived for 72 days. This is how.' },
  { name: 'script to video', what: 'your script, narrated word for word, with matching scenes and captions', prompt: 'Nobody expected the river to boil. But deep in Peru, one does, and here is why.' },
  { name: 'blog post to video', what: 'a blog post condensed into a 60-second narrated Short', prompt: 'Turn this idea into a Short: why remote teams write better documentation' },
  { name: 'podcast to video', what: 'an episode idea turned into a vertical promo video', prompt: 'Our guest said the one thing every founder gets wrong about hiring. Here it is.' },
  { name: 'tweet to video', what: 'one strong sentence expanded into a captioned 60-second video', prompt: 'Most people do not have a time problem. They have a priority problem.' },
  { name: 'AI voiceover videos', what: 'a natural AI voice narrates your text over matching scenes', prompt: 'The three words that make any apology actually work' },
  { name: 'videos with captions', what: 'every word on screen, timed to the voice, for sound-off viewing', prompt: 'Why 85% of people watch videos with the sound off, and what it means for you' },
  { name: 'vertical videos', what: 'true 9:16 output built for phones, not a cropped landscape video', prompt: 'How to fall asleep in 2 minutes: the method the US Navy teaches pilots' },
  { name: 'square videos', what: 'a 1:1 video for feeds that crop vertical content', prompt: 'Three things to check before you sign any freelance contract' },
  { name: 'widescreen videos', what: 'a 16:9 video for YouTube, websites and presentations', prompt: 'The history of the QWERTY keyboard and why we never changed it' },
  { name: '30-second ads', what: 'a short narrated ad with a single call to action', prompt: 'A 30-second ad for a language app: learn with one 5-minute lesson a day' },
  { name: '90-second videos', what: 'a longer narrated video for stories that need room', prompt: 'The full story of the Mary Celeste, found sailing with nobody aboard' },
  { name: 'educational videos', what: 'a lesson with a hook, three points and a payoff', prompt: 'How vaccines train your immune system, explained for a 12-year-old' },
  { name: 'narrated slideshows', what: 'a narrated sequence of scenes with captions and music', prompt: 'Ten photos that changed how the world saw the Vietnam War, and why' },
  { name: 'AI generated videos', what: 'every scene generated from your text, no stock footage', prompt: 'A lone lighthouse keeper watches a storm swallow the horizon', engine: 'cinematic_ai', why: 'This is the fully generated path: the scene is made from your words.' },
  { name: 'video series', what: 'one episode a day that remembers the previous one', prompt: 'Episode 1 of a series on unsolved internet mysteries: Cicada 3301' },
  { name: 'daily videos', what: 'a repeatable one-video-a-day workflow with a queue of ideas', prompt: 'Day 1: the reason most New Year resolutions die by January 19' },
]

// ── IDIOMA: em que língua ────────────────────────────────────────────────────────────────────────
type LangSeed = { name: string; prompt: string; note: string }
const LANGUAGES: LangSeed[] = [
  { name: 'Spanish', prompt: 'Cinco lugares del mundo donde las brújulas dejan de funcionar, y por qué', note: 'Narration, captions and titles come out in Spanish when you write in Spanish.' },
  { name: 'Portuguese', prompt: 'A cidade brasileira que foi capital do império por um dia e ninguém lembra', note: 'Write in Portuguese and the film is narrated and captioned in Portuguese.' },
  { name: 'Hindi', prompt: 'रामायण की वह कहानी जो स्कूल में नहीं पढ़ाई जाती: राम सेतु का रहस्य', note: 'Hindi narration and Devanagari captions from a Hindi prompt.' },
  { name: 'French', prompt: 'Pourquoi la tour Eiffel grandit de 15 centimètres chaque été', note: 'French prompt in, French narration and captions out.' },
  { name: 'German', prompt: 'Warum die Berliner U-Bahn Linien hat, die nie gebaut wurden', note: 'German narration and captions from a German prompt.' },
  { name: 'Italian', prompt: 'Il giorno in cui Venezia decise di costruire una città sull’acqua', note: 'Italian narration and captions from an Italian prompt.' },
  { name: 'Arabic', prompt: 'المدينة المفقودة التي وجدها الأقمار الصناعية تحت رمال الصحراء', note: 'Arabic narration and captions from an Arabic prompt.' },
  { name: 'Indonesian', prompt: 'Mengapa Krakatau meledak lebih keras dari bom nuklir mana pun', note: 'Indonesian narration and captions from an Indonesian prompt.' },
  { name: 'Turkish', prompt: 'Göbeklitepe: tarımdan önce inşa edilen tapınak', note: 'Turkish narration and captions from a Turkish prompt.' },
  { name: 'Japanese', prompt: '富士山が最後に噴火した日、江戸で何が起きたのか', note: 'Japanese narration and captions from a Japanese prompt.' },
  { name: 'Korean', prompt: '세종대왕이 한글을 만든 진짜 이유', note: 'Korean narration and captions from a Korean prompt.' },
  { name: 'Vietnamese', prompt: 'Vì sao chúng ta say xe: bộ não bị lừa như thế nào', note: 'Vietnamese narration and captions from a Vietnamese prompt.' },
  { name: 'Russian', prompt: 'Почему Тунгусский метеорит до сих пор загадка', note: 'Russian narration and captions from a Russian prompt.' },
  { name: 'Polish', prompt: 'Latająca szkoła z potworami: historia dla dzieci na dobranoc', note: 'Polish narration and captions from a Polish prompt.' },
  { name: 'Dutch', prompt: 'Waarom Nederland onder de zeespiegel bouwt en het toch droog blijft', note: 'Dutch narration and captions from a Dutch prompt.' },
]

// ── ALTERNATIVA: em vez de quem (só o que é verdade sobre a Kineo) ───────────────────────────────
type AltSeed = { name: string; slug?: string; differences: string[]; prompt: string }
const KINEO_TRUTHS = {
  finished: 'Kineo delivers a finished MP4: script, AI voice, matched scenes, captions and music, from one idea or a pasted script.',
  engines: 'You choose the engine per film: Kineo 1 (real footage, fits the free trial) or generative engines such as Seedance 1.5, Veo 3.1, Kling 2.5 and Kling 3.',
  noCard: 'The free trial needs no card; the trial size and every price on this page are read live from the same source as the pricing page.',
  series: 'Every finished film comes with a written next episode, so a channel becomes a series instead of one-off videos.',
}
const ALTERNATIVES: AltSeed[] = [
  { name: 'InVideo', differences: [KINEO_TRUTHS.finished, KINEO_TRUTHS.engines, KINEO_TRUTHS.series], prompt: 'Five facts about the Sahara that sound fake but are true' },
  { name: 'Fliki', differences: [KINEO_TRUTHS.finished, KINEO_TRUTHS.engines, KINEO_TRUTHS.noCard], prompt: 'The strange reason honey never spoils, explained in 60 seconds' },
  { name: 'Pictory', differences: [KINEO_TRUTHS.finished, KINEO_TRUTHS.engines, KINEO_TRUTHS.series], prompt: 'Why the Roman Empire had traffic jams, and how they fixed them' },
  { name: 'Synthesia', differences: ['Kineo makes faceless narrated films with real or generated scenes instead of a presenter avatar reading a script.', KINEO_TRUTHS.engines, KINEO_TRUTHS.noCard], prompt: 'How solar panels make electricity, explained for a 12-year-old' },
  { name: 'HeyGen', differences: ['Kineo makes faceless narrated films with real or generated scenes instead of a talking-head avatar.', KINEO_TRUTHS.finished, KINEO_TRUTHS.series], prompt: 'The three questions to ask before buying any used car' },
  { name: 'Runway', differences: ['Kineo delivers the whole narrated film, not a single generated clip you still have to edit, voice and caption.', KINEO_TRUTHS.engines, KINEO_TRUTHS.noCard], prompt: 'A lone lighthouse keeper watches a storm swallow the horizon' },
  { name: 'Pika', differences: ['Kineo delivers the whole narrated film, not a single generated clip.', KINEO_TRUTHS.finished, KINEO_TRUTHS.series], prompt: 'The day the Earth stopped spinning: what physics says would happen' },
  { name: 'Sora', differences: ['Kineo turns a text idea into a finished captioned Short with voice, not only a generated clip.', KINEO_TRUTHS.engines, KINEO_TRUTHS.noCard], prompt: 'Life in the Mariana Trench, told from the point of view of the pressure' },
  { name: 'CapCut', differences: ['Kineo writes, narrates and assembles the film for you; there is no timeline to edit.', KINEO_TRUTHS.engines, KINEO_TRUTHS.series], prompt: 'Why 85% of people watch videos with the sound off' },
  { name: 'Canva', differences: ['Kineo starts from an idea and ends with a narrated film; it is not a design template.', KINEO_TRUTHS.finished, KINEO_TRUTHS.noCard], prompt: 'Three small design choices that make a room feel twice as big' },
  { name: 'Lumen5', differences: [KINEO_TRUTHS.finished, KINEO_TRUTHS.engines, KINEO_TRUTHS.series], prompt: 'Why remote teams write better documentation, in 60 seconds' },
  { name: 'Steve AI', differences: [KINEO_TRUTHS.finished, KINEO_TRUTHS.engines, KINEO_TRUTHS.noCard], prompt: 'The email that saved Airbnb in 2008, and what it said' },
  { name: 'VEED', differences: ['Kineo generates the scenes and the voice; VEED-style tools edit footage you already have.', KINEO_TRUTHS.engines, KINEO_TRUTHS.series], prompt: 'What happens to your body one day after your last coffee' },
  { name: 'Descript', differences: ['Kineo builds a film from text; it does not require a recording to edit.', KINEO_TRUTHS.finished, KINEO_TRUTHS.noCard], prompt: 'The one question every podcast guest gets asked, and the best answer so far' },
  { name: 'Opus Clip', differences: ['Kineo creates new films from an idea; clip tools cut existing long videos.', KINEO_TRUTHS.engines, KINEO_TRUTHS.series], prompt: 'Five English phrases native speakers use every day that textbooks never teach' },
  { name: 'Vidnoz', differences: [KINEO_TRUTHS.finished, KINEO_TRUTHS.engines, KINEO_TRUTHS.noCard], prompt: 'The goalkeeper who scored from his own box and the 3 seconds that decided the title' },
  { name: 'Elai', differences: ['Kineo makes faceless narrated films instead of avatar presenters.', KINEO_TRUTHS.finished, KINEO_TRUTHS.series], prompt: 'How the 1% rule tells you in 10 seconds if a rental is worth it' },
  { name: 'Kapwing', differences: ['Kineo writes, narrates and assembles; there is no editor to learn.', KINEO_TRUTHS.engines, KINEO_TRUTHS.noCard], prompt: 'Why F1 cars could drive upside down' },
  { name: 'Veed AI', slug: 'veed-ai', differences: [KINEO_TRUTHS.finished, KINEO_TRUTHS.engines, KINEO_TRUTHS.series], prompt: 'How noise-cancelling headphones actually cancel noise' },
  { name: 'Zebracat', differences: [KINEO_TRUTHS.finished, KINEO_TRUTHS.engines, KINEO_TRUTHS.noCard], prompt: 'Seven countries where you can live well on $1,000 a month' },
]

// ── montagem ─────────────────────────────────────────────────────────────────────────────────────
function nichePage(n: NicheSeed): IntentPage {
  const engine = n.engine ?? 'fast'
  return {
    slug: kebab(n.name),
    family: 'niche',
    keyword: `AI video generator for ${n.name}`,
    title: `AI Video Generator for ${n.name.charAt(0).toUpperCase() + n.name.slice(1)} | Kineo`,
    h1: `AI video generator for ${n.name}`,
    intro: `Built for ${n.who}. You type one idea; Kineo writes the hook and the script, records the voice, matches a scene to every line, burns in captions and hands you a vertical MP4, usually in about three minutes.`,
    examplePrompt: n.prompt,
    engine,
    engineWhy: n.why ?? 'Kineo 1 matches real footage to every line and fits inside the free trial, so the first film costs nothing to test.',
    faq: [
      { q: `Do I need to record anything for ${n.name} videos?`, a: 'No. The narration is an AI voice, the scenes are matched or generated from your text, and the captions are timed automatically. You only write the idea or paste a script.' },
      { q: `Can I use my own script for ${n.name}?`, a: 'Yes. Choose "Use my script as is" and Kineo narrates it word for word, then matches scenes to each sentence.' },
      { q: 'Who owns the video?', a: 'You do. Download the MP4 and post it anywhere; there is no platform lock-in.' },
    ],
  }
}
function formatPage(f: FormatSeed): IntentPage {
  const engine = f.engine ?? 'fast'
  return {
    slug: kebab(f.name),
    family: 'format',
    keyword: `AI ${f.name} generator`,
    title: `AI ${f.name.charAt(0).toUpperCase() + f.name.slice(1)} Generator | Kineo`,
    h1: `AI ${f.name} generator`,
    intro: `What you get: ${f.what}. What you write: one idea or a full script. Kineo does the script, the voice, the scenes, the captions and the music.`,
    examplePrompt: f.prompt,
    engine,
    engineWhy: f.why ?? 'Kineo 1 matches real footage to every line and fits inside the free trial.',
    faq: [
      { q: `How long does a ${f.name.replace(/s$/, '')} take?`, a: 'Kineo 1 films are usually ready in about three minutes. Generative engines take longer because every scene is rendered; the screen shows the estimate before you start.' },
      { q: 'Can I pick the length and the format?', a: 'Yes: 35, 60 or 90 seconds, and 9:16, 16:9, 1:1 or 4:5. The default is a 60-second vertical Short.' },
      { q: 'Are captions included?', a: 'Yes. Every word is on screen, timed to the voice, so the video works with the sound off.' },
    ],
  }
}
function languagePage(l: LangSeed): IntentPage {
  return {
    slug: kebab(`${l.name} ai video generator`).replace(/-ai-video-generator$/, ''),
    family: 'language',
    keyword: `AI video generator in ${l.name}`,
    title: `AI Video Generator in ${l.name} | Kineo`,
    h1: `AI video generator in ${l.name}`,
    intro: `${l.note} The idea, the narration, the captions and the title stay in ${l.name}; the scenes are matched or generated from the meaning of the text.`,
    examplePrompt: l.prompt,
    engine: 'fast',
    engineWhy: 'Kineo 1 narrates in the language you write and fits inside the free trial.',
    faq: [
      { q: `Do I have to write the prompt in ${l.name}?`, a: `Write the idea in ${l.name} and the film comes out in ${l.name}. You can also paste a full ${l.name} script and have it narrated word for word.` },
      { q: 'Is the voice natural?', a: 'The narration uses a neural voice in that language; you hear it in the finished film and can regenerate if you want a different tone.' },
      { q: 'Can the captions be in another language than the voice?', a: 'Not yet. Captions follow the narration language so the words on screen match what is heard.' },
    ],
  }
}
function altPage(a: AltSeed): IntentPage {
  return {
    slug: `${a.slug ?? kebab(a.name)}-alternative`,
    family: 'alternative',
    keyword: `${a.name} alternative`,
    title: `${a.name} Alternative for Finished AI Videos | Kineo`,
    h1: `A ${a.name} alternative that delivers the finished film`,
    intro: `If you are comparing ${a.name} with Kineo, the honest difference is what you get at the end: a complete narrated, captioned MP4 from one idea, with the engine of your choice. Below is what Kineo does; we do not describe ${a.name}'s features or prices here because they change and are theirs to state.`,
    examplePrompt: a.prompt,
    engine: 'fast',
    engineWhy: 'Kineo 1 is the fastest way to see the difference: one idea in, a finished film out, inside the free trial.',
    faq: [
      { q: `Can I try Kineo before leaving ${a.name}?`, a: 'Yes. The free trial needs no card, and the first film shows you the full result: script, voice, scenes and captions.' },
      { q: 'Can I bring a script I already wrote?', a: 'Yes. "Use my script as is" narrates it word for word and matches scenes to every sentence.' },
      { q: 'Which engine should I start with?', a: 'Kineo 1 for real footage and speed; Seedance 1.5 when the scene must be generated (a story, a place that cannot be filmed, the past).' },
    ],
    competitor: { name: a.name, differences: a.differences },
  }
}

export const INTENT_PAGES: readonly IntentPage[] = [
  ...NICHES.map(nichePage),
  ...FORMATS.map(formatPage),
  ...LANGUAGES.map(languagePage),
  ...ALTERNATIVES.map(altPage),
]

const BY_SLUG = new Map(INTENT_PAGES.map((p) => [p.slug, p]))
export const INTENT_SLUGS: readonly string[] = INTENT_PAGES.map((p) => p.slug)
export function getIntentPage(slug: string): IntentPage | undefined {
  return BY_SLUG.get(slug)
}
export const INTENT_FAMILY_LABEL: Record<IntentFamily, string> = {
  niche: 'By channel or business',
  format: 'By video format',
  language: 'By language',
  alternative: 'Compared with other tools',
}
export const INTENT_HUB_PATH = '/ai-video-generator/for'
export const intentPagePath = (slug: string) => `${INTENT_HUB_PATH}/${slug}`
