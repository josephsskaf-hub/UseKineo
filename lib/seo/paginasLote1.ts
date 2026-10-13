// KINEO-PAGINAS-LOTE1-2026-10-12 — LOTE 1 das "10 páginas novas por semana no estilo das que já vendem" (fundador, 12/10/2026).
//
// POR QUE ESTAS 10 (medido em 12/10, 30 dias de landing_session_started sem bot + profiles 60 dias, só SELECT):
//   · a família /free-ai-shorts/<nicho> trouxe 221 sessões (69 do ChatGPT, 51 do Google) — horror sozinho 108 sessões e 83
//     cadastros (push63_niche_horror); geography 20 sessões, 16 do Google. As 100 /ai-video-generator/for/* trouxeram 120
//     sessões em 96 páginas (~1,2 cada). Página rica de nicho funciona; página-modelo rasa não.
//   · o que quem chega dessas páginas DIGITA (videos.topic dos cadastros de horror/free-ai-shorts-generator/text-to-video/
//     seedance): desenho 3D infantil (o Creator de 12/10, vindo do Google, fez um dinossauro dançando), "what if/what happens
//     if", terror em 2ª pessoa, filme curto com personagem, e muito espanhol. Daí: 7 nichos novos na família que já traz gente
//     + 2 intenções de compra em inglês (sem marca d'água; curta-metragem) + 1 porta em espanhol (terror, o nicho nº 1).
//   · concorrente que ranqueia essas buscas (revid.ai, mootion, aituber) tem página de categoria por tema ("what-if",
//     "ocean-mystery", "terror" em espanhol) — e mostra exemplos genéricos. Nós mostramos filme REAL da casa, com selo honesto.
//
// REGRAS (as mesmas das vencedoras):
//   · o filme vem SÓ da vitrine do fundador (lib/publicExamples.ts FOUNDER_SHOWCASE/ENGINE_PAGE_LEAD), resolvido por
//     resolveHouseFilm() de lib/seo/houseFilmIdeas.ts (posse confirmada + motor igual ao selo). Nenhum vídeo de cliente,
//     nenhum render novo. Quando a casa não tem filme do tema (desenho), a página DIZ que é o mais próximo;
//   · a ideia do filme é o texto real de videos.topic (lido em 12/10/2026, só SELECT), com o rótulo honesto do caso;
//   · preço, créditos e filmes NUNCA digitados: buyCreatorPrice()/creatorSeedanceFilms() (o mesmo do botão de compra),
//     lib/marketingPrice e TRIAL_FREE_FILM_SECONDS. Desligou o WELCOME20, a frase do 1º mês some no mesmo deploy;
//   · nenhuma frase repetida entre as 10 páginas (o guardião scripts/test-paginas-lote1-1210.mjs confere), e nada de motor
//     aposentado/pausado nem promessa de "sem limite" ou "para sempre".
import { buyCreatorPrice, creatorSeedanceFilms } from '@/lib/growth/buyCreatorOffer'
import { TRIAL_FREE_FILM_SECONDS } from '@/lib/freeTierOffer'
import { FREE_ENTRY_COUNTRY_CLAUSE_MIRROR } from '@/lib/entryPolicy'
import { STARTER_PRICE, STUDIO_PRICE, STUDIO_HOLLYWOOD_FILMS, CREATOR_CINEMATIC_FILMS } from '@/lib/marketingPrice'
import { resolveHouseFilm, type HouseFilm, type HouseFilmEngine, type IdeaSource } from '@/lib/seo/houseFilmIdeas'

export { LOTE1_REVIEWED_ISO } from '@/lib/seo/paginasLote1Paths'

export const LOTE1_MARK = 'KINEO-PAGINAS-LOTE1-2026-10-12'

// ── Verdades de hoje, derivadas (nunca digitadas) ───────────────────────────────────────────────────────────────────────
const PRICE = buyCreatorPrice()
const CREATOR_FILMS = creatorSeedanceFilms()
const FREE_S = TRIAL_FREE_FILM_SECONDS
const WHERE = FREE_ENTRY_COUNTRY_CLAUSE_MIRROR
const WHERE_ES = FREE_ENTRY_COUNTRY_CLAUSE_MIRROR ? ' en los países habilitados' : ''
const CREATOR_DEAL = PRICE.firstMonth
  ? `${PRICE.firstMonth} for the first month (${PRICE.percentOff}% off), then ${PRICE.full}/month`
  : `${PRICE.full}/month`
const CREATOR_DEAL_ES = PRICE.firstMonth
  ? `${PRICE.firstMonth} el primer mes (${PRICE.percentOff}% de descuento) y después ${PRICE.full}/mes`
  : `${PRICE.full}/mes`

export interface Lote1Section { h2: string; paragraphs: string[] }
export interface Lote1Faq { q: string; a: string }
export interface Lote1FilmSeed {
  id: string
  engine: HouseFilmEngine
  idea: string
  source: IdeaSource
  /** como a página chama o filme ("Made in Kineo: <kind>") */
  kind: string
  /** a frase honesta quando o filme NÃO é do tema exato; null quando é */
  honestNote: string | null
  /** rótulo do botão que leva a ideia ao Studio (quando "Make a <nicho> Short from this idea" não faria sentido) */
  ctaLabel?: string
}

export interface Lote1Niche {
  /** a busca que a página mira, como a pessoa digita */
  searchTarget: string
  label: string
  h1: string
  metaTitle: string
  metaDescription: string
  intro: string
  ideas: string[]
  hubCard: { title: string; example: string }
  sections: Lote1Section[]
  faq: Lote1Faq[]
  film: Lote1FilmSeed
}

// ═══ 7 NICHOS NOVOS em /free-ai-shorts/<slug> (a família que já traz visita, botão de compra e formulário) ═══
export const LOTE1_NICHES: Readonly<Record<string, Lote1Niche>> = {
  // O Creator de 12/10 (Google → /free-ai-shorts-generator) pagou 10 min depois de testar um dinossauro dançando em 3D.
  cartoon: {
    searchTarget: 'ai cartoon video generator / 3d animated story shorts',
    label: '3D Cartoon Stories',
    h1: 'Free AI 3D Cartoon Shorts Generator',
    metaTitle: 'AI 3D Cartoon Story Video Generator for Shorts — Kineo',
    metaDescription: `Describe a character and a tiny plot; Kineo writes, narrates and generates every 3D-style scene of a vertical cartoon Short. First ${FREE_S}-second film free on Seedance 1.5 (watermarked).`,
    intro:
      'Type a little story — a dinosaur who cannot stop dancing, a cat who works the night shift — and get back a narrated vertical cartoon with captions. The AI writes the scenes, voices the narrator and renders each shot in a soft 3D animated look. No animation software, no keyframes, no drawing.',
    ideas: [
      'A tiny dinosaur hears music and cannot stop dancing, even at bedtime',
      'Pip the penguin opens an ice-cream shop at the South Pole and nobody buys anything',
      'A shy cloud learns to rain on purpose to save a thirsty sunflower',
      'Two snails race to the garden gate and the slow one wins',
      'A robot vacuum falls in love with the cat it keeps chasing',
    ],
    hubCard: { title: '3D Cartoon Shorts', example: 'A tiny dinosaur who cannot stop dancing' },
    sections: [
      {
        h2: 'What makes an animated Short work in under a minute',
        paragraphs: [
          'One character, one wish, one twist. Children and adults scroll past cartoons that spend ten seconds on setup, so the best animated Shorts open on the character already doing something funny. Give your hero a name, a color and a single goal, then let something get in the way. The narration carries the story, so every scene can stay simple and bright.',
          'Keep the cast small. Generated scenes are rendered shot by shot, and two characters are far easier to keep recognizable than five. A short, vivid description repeated the same way in every scene — "a small green dinosaur with orange spots and a red scarf" — is what holds the look together from the first shot to the last.',
        ],
      },
      {
        h2: 'How to write the prompt for a 3D cartoon look',
        paragraphs: [
          'Ask for the style in plain words: "3D animated, soft studio lighting, rounded shapes, big expressive eyes, bright pastel colors". Avoid naming a studio or a famous character; describe the look instead. Then write the plot as three or four beats: the hero, the problem, the funny attempt, the happy ending.',
          'If you already have the full narration, paste it and choose to keep your script as written. If you only have the idea, let the AI structure it: it writes a hook, splits the story into scenes and directs each shot. Either way you review the setup before anything is generated.',
        ],
      },
      {
        h2: 'Where cartoon Shorts get posted, and how often',
        paragraphs: [
          'Bedtime-story channels, toy and education accounts, and parents making a story starring their kid’s favorite animal all use the same vertical format: 30 to 60 seconds, captions on, a calm narrator. A channel that posts one little story a day builds a recognizable series within weeks — keep the same hero and the same opening line so returning viewers know it instantly.',
          'If the audience is children, mark the video as made for kids where the platform asks, and say it is AI-generated when the platform requires disclosure. Those settings live in YouTube and TikTok, not in Kineo.',
        ],
      },
    ],
    faq: [
      {
        q: 'Can I make a cartoon Short for free?',
        a: `Yes, once: a new account${WHERE} gets one ${FREE_S}-second film on Seedance 1.5 with a watermark and no card. That is enough to see whether your character and style come out the way you pictured before paying anything.`,
      },
      {
        q: 'Will my character look exactly the same in every scene?',
        a: 'Not guaranteed. Each scene is generated separately, so small changes in clothing or proportions can happen. A precise, repeated description and a small cast keep drift low; very long stories with many characters drift more.',
      },
      {
        q: 'How many cartoon films does a paid plan make?',
        a: `Creator is ${CREATOR_DEAL} and holds ${CREATOR_FILMS} watermark-free 60-second Seedance 1.5 films a month. Starter is ${STARTER_PRICE}/month for lighter use, and Studio is ${STUDIO_PRICE}/month for daily series.`,
      },
      {
        q: 'How long does one animated Short take?',
        a: 'About 6 minutes from pressing Generate to a downloadable 9:16 MP4 with narration and captions.',
      },
    ],
    // A casa NÃO tem desenho público (desenho de cliente é privado). O filme mais próximo em clima — calmo, colorido, sem
    // susto — é o das praias que brilham, no Seedance 1.5. A página diz isso com todas as letras.
    film: {
      id: 'c53789d3-a1af-46a7-a2c6-7114204316de',
      engine: 'cinematic_ai',
      source: 'exact_prompt',
      idea: 'At night, some quiet coastlines begin to glow electric blue. The light comes from tiny plankton that store chemical energy during the day. When a wave moves them, they flash for only a fraction of a second. Millions of flashes together make every footprint, paddle, and ripple shine. The glow is not magic, and it is not permanent. Temperature, tides, and nutrients must align. That is why a beach can look ordinary one evening and become a field of stars the next.',
      kind: 'the closest public film we have (not a cartoon)',
      honestNote: 'Honest note: Kineo has no public cartoon film yet — customers’ cartoons stay private. This is a calm, colorful Seedance 1.5 film from the house, shown so you can judge the engine’s light and motion. The 3D cartoon look comes from the style words in your prompt.',
      ctaLabel: 'Open this idea in the Studio →',
    },
  },

  'what-if': {
    searchTarget: 'what if video generator / what happens if ai shorts',
    label: 'What If Scenarios',
    h1: 'Free AI "What If" Shorts Generator',
    metaTitle: 'AI "What If" Video Generator — Hypothetical Shorts | Kineo',
    metaDescription: `Type a hypothetical ("what if the Moon disappeared?") and get a narrated vertical Short that walks through the consequences, scene by scene. One ${FREE_S}-second Seedance 1.5 film free.`,
    intro:
      'Type one hypothetical — what if gravity switched off for ten seconds, what if you swallowed a LEGO brick — and get a narrated vertical Short that walks through the consequences in order: the first second, the first minute, the end of the day. Every scene is generated to match the line being spoken.',
    ideas: [
      'What if gravity switched off for exactly ten seconds?',
      'What happens to your body if you stop sleeping for a week',
      'What if the Moon disappeared tonight — the first 24 hours',
      'What if every ant on Earth vanished at once',
      'What happens if you fall into the Mariana Trench',
    ],
    hubCard: { title: 'What If Shorts', example: 'What if gravity switched off for ten seconds?' },
    sections: [
      {
        h2: 'The structure every viral hypothetical uses',
        paragraphs: [
          'A good "what if" is a countdown of consequences. Open with the premise in under eight words, then escalate on a clock: in the first second this happens, after a minute that, by morning something nobody expected. Each step should be a little bigger than the last, and the final beat should be the one people comment about.',
          'Ground the fantasy in one real number per step — the speed of the Earth’s rotation, the pressure at the bottom of the ocean, the time it takes light to reach us. The number is what makes viewers trust the story enough to finish it, and it is what they quote in the comments.',
        ],
      },
      {
        h2: 'Why generated scenes beat stock footage here',
        paragraphs: [
          'No camera has filmed a supermarket floating in zero gravity or a sky without the Moon. Stock libraries can only show the normal world; a text-to-video engine can show the impossible one. That is why hypothetical channels moved from slideshows of still images to scenes generated line by line.',
          'Write each consequence as something you could see: "shopping carts drift up to the ceiling" works, "physics would be affected" does not. The more visual the line, the better the generated shot.',
        ],
      },
      {
        h2: 'Turning one premise into a series',
        paragraphs: [
          'Hypotheticals binge well. End each video by asking the next question — "but what if it came back?" — and make that the next upload. A batch of five premises on the same theme (space, the human body, animals) gives a week of posts with a consistent hook style.',
        ],
      },
    ],
    faq: [
      {
        q: 'Is there a free way to try a what-if video?',
        a: `Yes. Your first ${FREE_S}-second film on Seedance 1.5 is free${WHERE}, watermarked, with no card — enough for a premise and two consequences.`,
      },
      {
        q: 'Does the AI check the science?',
        a: 'It writes from general knowledge and can be wrong on details. Check every number before you post; hypothetical channels live or die on the comment section catching a mistake.',
      },
      {
        q: 'What do paid plans add for a what-if channel?',
        a: `Full-length, watermark-free films. Creator is ${CREATOR_DEAL}, which covers ${CREATOR_FILMS} Seedance 1.5 films of 60 seconds each month.`,
      },
      {
        q: 'Can I paste my own what-if script?',
        a: 'Yes. Choose to keep your script as written and the narration follows your words; the AI only directs the scenes around them.',
      },
    ],
    film: {
      id: 'fe055601-0668-4d33-be49-82c1cb033779',
      engine: 'cinematic_ai',
      source: 'script_opening',
      idea: 'Something is leaving our solar system right now, and nobody agrees on what it is. It\'s called 3I/ATLAS.',
      kind: 'a real space Short (not a hypothetical)',
      honestNote: 'Honest note: this is a real-event space film, not a what-if. The house what-if film was rendered on an engine that is paused right now, so this page shows the closest Seedance 1.5 film instead: one unsettling premise, escalated scene by scene.',
    },
  },

  ocean: {
    searchTarget: 'ocean mystery shorts / deep sea video generator ai',
    label: 'Ocean Mysteries',
    h1: 'Free AI Ocean Mystery Shorts Generator',
    metaTitle: 'AI Ocean Mystery & Deep Sea Shorts Generator — Kineo',
    metaDescription: `Ghost ships, vanished crews and the deep sea: turn one ocean story into a narrated vertical Short with generated scenes. See a real Seedance 1.5 film and make your first ${FREE_S}-second one free.`,
    intro:
      'Ghost ships found with nobody aboard, signals from the deep, waves taller than skyscrapers — ocean stories are some of the most-watched mysteries on Shorts because the sea is the last place on Earth we cannot see. Type the story and Kineo writes, narrates and generates every scene.',
    ideas: [
      'The ship found drifting with the table set and the crew gone',
      'The sound recorded in the deep Pacific that nobody has identified',
      'Why we have mapped Mars better than our own ocean floor',
      'The rogue wave sailors called a myth until 1995',
      'The lighthouse keepers who vanished from a Scottish island in 1900',
    ],
    hubCard: { title: 'Ocean Mystery Shorts', example: 'The ship found drifting with nobody aboard' },
    sections: [
      {
        h2: 'Why the sea keeps people watching',
        paragraphs: [
          'Ocean mysteries combine two things the algorithm rewards: a clear unanswered question and imagery people have never seen. A brigantine sailing perfectly with no one on deck is a hook in a single frame. Thalassophobia — the fear of deep water — is its own audience, and it comments, saves and shares.',
          'The strongest scripts stay close to the documented record. The Mary Celeste, the Flannan Isles lighthouse, the "Bloop" recording: each has dates, names and a log book. Lead with the fact that does not fit, then lay out the theories in order of plausibility, and leave the last line open.',
        ],
      },
      {
        h2: 'Writing scenes the engine can render well',
        paragraphs: [
          'Describe weather, light and scale: "a wooden ship under grey storm clouds, sails half torn, empty deck, rain on the lens". Generated water looks best in wide shots and close details — a swinging lantern, a half-eaten meal — and weakest when the script asks for exact historical uniforms in close-up.',
          'Underwater shots work when you ask for darkness and a single light source. A diver’s torch beam or a glowing creature in black water reads instantly on a phone screen.',
        ],
      },
      {
        h2: 'A posting plan for an ocean channel',
        paragraphs: [
          'Rotate three formats so the feed does not feel repetitive: vanished crews, deep-sea creatures, and record-breaking waves or storms. Name the ship or place in the first three words of the title, because that is what people search for after hearing about it somewhere else.',
        ],
      },
    ],
    faq: [
      {
        q: 'Can I make an ocean mystery Short for free?',
        a: `One ${FREE_S}-second Seedance 1.5 film is free for new accounts${WHERE}, watermarked, no card. The film on this page was made on the same engine.`,
      },
      {
        q: 'How long should an ocean mystery Short be?',
        a: 'Between 45 and 60 seconds tells one case properly. Under 30 seconds usually cuts the part where the mystery deepens, which is what keeps people to the end.',
      },
      {
        q: 'What does it cost to post several ocean films a month?',
        a: `Creator is ${CREATOR_DEAL} for ${CREATOR_FILMS} clean 60-second films on Seedance 1.5; Studio at ${STUDIO_PRICE}/month adds room for a daily schedule.`,
      },
    ],
    film: {
      id: 'cbd676d0-340a-4728-8a5f-439fd9dd64c5',
      engine: 'cinematic_ai',
      source: 'translated_prompt',
      idea: 'The Mary Celeste: a brigantine found drifting, completely abandoned, in the Atlantic Ocean in 1872 — in perfect condition, but with no sign of the crew.',
      kind: 'a real ocean mystery Short',
      honestNote: null,
    },
  },

  disasters: {
    searchTarget: 'ai disaster documentary shorts / natural disaster video generator',
    label: 'Disasters & Catastrophes',
    h1: 'Free AI Disaster Shorts Generator',
    metaTitle: 'AI Disaster Documentary Shorts Generator — Kineo',
    metaDescription: `Megatsunamis, eruptions and explosions told as cinematic vertical Shorts: script, narration, captions and generated scenes. Watch a real Seedance 1.5 disaster film; first ${FREE_S}-second film free.`,
    intro:
      'Turn a real catastrophe — a megatsunami in an Alaskan bay, a volcano heard 3,000 miles away, a harbor explosion — into a tense documentary Short. Kineo writes the timeline, narrates it like a disaster documentary and generates the scenes no camera captured.',
    ideas: [
      'The wave in Lituya Bay that reached 524 meters',
      'Krakatoa, 1883: the sound heard on the other side of the world',
      'The morning the sky exploded over Tunguska',
      'Pompeii’s last 18 hours, told hour by hour',
      'The molasses flood that swept through Boston in 1919',
    ],
    hubCard: { title: 'Disaster Shorts', example: 'The 524-meter wave in Lituya Bay' },
    sections: [
      {
        h2: 'Tell the disaster on a clock',
        paragraphs: [
          'Disaster Shorts that hold attention are built like a countdown. Start with the calm — a fishing boat anchored at dusk — then let the timestamps do the work: 10:15 the ground shakes, 10:16 the cliff falls, 10:17 the wave. Viewers stay because they know what is coming and want to see how.',
          'Pick one survivor or witness and tell it through them. A number of casualties is information; a fisherman who rode the wave out is a story. Most famous disasters have a documented witness account, and that is your spine.',
        ],
      },
      {
        h2: 'Accuracy and respect',
        paragraphs: [
          'Real disasters had real victims. Keep the facts checkable — dates, heights, distances — and leave out graphic suffering; tension comes from scale and timing, not gore. Platforms restrict shocking imagery, and a respectful tone is also what gets a video recommended to wider audiences.',
          'The AI writes from general knowledge, so verify the figures you narrate against a reliable source before posting. A wrong wave height will be the first comment.',
        ],
      },
      {
        h2: 'What generated scenes add',
        paragraphs: [
          'There is no footage of 1883 or 1908, and archive photos are few and repeated on every channel. Generated scenes let you show the wave from the boat, the ash cloud from the deck of a ship, the sky lighting up over the forest — the moments the record describes but no lens saw.',
          'Anniversaries are your calendar. Most famous catastrophes have a date people remember, and searches for them spike every year on that day. Schedule each film a few days ahead of its anniversary and the channel publishes into demand instead of hoping for it.',
        ],
      },
    ],
    faq: [
      {
        q: 'Is the disaster film on this page AI-generated?',
        a: 'Yes. Every scene in the Lituya Bay film was generated by Seedance 1.5 from the script; nothing is archive footage. The badge on the video names the engine.',
      },
      {
        q: 'Can I try it without paying?',
        a: `Yes — one ${FREE_S}-second film${WHERE}, watermarked, no card. Longer, clean films need a plan.`,
      },
      {
        q: 'Which plan suits a disaster history channel?',
        a: `Creator (${CREATOR_DEAL}) makes ${CREATOR_FILMS} watermark-free Seedance 1.5 films of 60 seconds a month. Starter at ${STARTER_PRICE}/month suits a weekly upload.`,
      },
    ],
    film: {
      id: '83db8b63-b654-491e-a0aa-86ce1bc1f3d7',
      engine: 'cinematic_ai',
      source: 'script_opening',
      idea: 'On July 9th, 1958, an earthquake shook Lituya Bay in Alaska. A cliff face collapsed into the water — thirty million cubic meters of rock, falling all at once.',
      kind: 'a real disaster Short',
      honestNote: null,
    },
  },

  nature: {
    searchTarget: 'ai nature documentary shorts / natural phenomena video generator',
    label: 'Nature Phenomena',
    h1: 'Free AI Nature Phenomena Shorts Generator',
    metaTitle: 'AI Nature Documentary Shorts Generator (Phenomena) — Kineo',
    metaDescription: 'Lightning that never stops, rivers that boil, beaches that glow: turn a natural phenomenon into a narrated vertical documentary Short. See a real Kineo film and start free.',
    intro:
      'Some places on Earth look made up: a lake where lightning strikes all night, a river hot enough to cook in, a coastline that glows blue. Type the phenomenon and Kineo writes the explanation, narrates it like a nature documentary and generates every scene.',
    ideas: [
      'The lake in Venezuela where lightning strikes 260 nights a year',
      'The Amazon river that boils with no volcano nearby',
      'Why some beaches glow electric blue at night',
      'The desert in Chile that bursts into flowers only in rare rainy years',
      'The waterfall in Yosemite that turns to fire every February',
    ],
    hubCard: { title: 'Nature Phenomena Shorts', example: 'The lake where lightning never stops' },
    sections: [
      {
        h2: 'The wonder-then-explanation formula',
        paragraphs: [
          'Nature Shorts win on the gap between how impossible something looks and how simple the reason is. Show the wonder first, with no explanation — the sky over Lake Maracaibo flashing 28 times a minute — then give the cause in one clear sentence: warm wind off the Caribbean meets cold air from the Andes.',
          'End on the human angle. Sailors used the Maracaibo storm as a lighthouse for centuries; that detail is what turns a weather fact into a story people repeat.',
        ],
      },
      {
        h2: 'Prompting landscapes that look real',
        paragraphs: [
          'Ask for the time of day and the weather in every scene: "night, violent lightning over a calm lake, stilt houses in the foreground". Landscapes are where generated video is strongest — water, sky, mist and light — so lean into wide shots and slow camera moves, and keep people small in the frame.',
        ],
      },
      {
        h2: 'Where nature Shorts perform',
        paragraphs: [
          'Calm, beautiful phenomena travel further than shocking ones: they get saved, sent to friends and replayed. A nature channel can post daily without running out of material — every country has two or three phenomena that most of the world has never heard of.',
          'Seasonal timing helps too. Post the cherry blossoms in spring, the northern lights when solar activity makes headlines, the monsoon when the rains arrive. A phenomenon people are already reading about that week gets searched, and your Short is there when they look.',
        ],
      },
    ],
    faq: [
      {
        q: 'Which engine made the storm film on this page?',
        a: 'Kling 3, a premium engine available on paid plans. The free film runs on Seedance 1.5, which is strong on landscapes, water and light.',
      },
      {
        q: 'How do I start for free?',
        a: `Create an account${WHERE} and your first ${FREE_S}-second Seedance 1.5 film is free with a watermark — no card.`,
      },
      {
        q: 'Which plan covers premium engines like Kling 3?',
        a: `Studio (${STUDIO_PRICE}/month) holds ${STUDIO_HOLLYWOOD_FILMS} Kling 3 films of 60 seconds a month. Creator (${CREATOR_DEAL}) is built around ${CREATOR_FILMS} Seedance 1.5 films; the Studio shows the exact credit cost of any engine before you generate.`,
      },
    ],
    film: {
      id: '4b12925e-16e6-4b56-af5a-7047f9ae7a28',
      engine: 'cinematic_hollywood',
      source: 'script_opening',
      idea: 'There is one place on Earth where the storm never ends. Lake Maracaibo, Venezuela. Two hundred and sixty nights a year, the sky above this lake explodes with lightning.',
      kind: 'a real nature phenomenon Short',
      honestNote: null,
    },
  },

  'ancient-mysteries': {
    searchTarget: 'ancient mysteries ai video / lost civilizations shorts generator',
    label: 'Ancient Mysteries',
    h1: 'Free AI Ancient Mysteries Shorts Generator',
    metaTitle: 'AI Ancient Mysteries & Lost Civilizations Shorts — Kineo',
    metaDescription: `Easter Island, the Voynich manuscript, sealed temple doors: turn an ancient mystery into a narrated vertical Short with generated scenes. Real Seedance 1.5 film inside; first ${FREE_S}-second film free.`,
    intro:
      'Statues that walked, a book nobody can read, a temple vault sealed for centuries — ancient mysteries pull viewers in because the evidence is real and the answer is still argued. Kineo turns one of them into a documentary-style Short: script, narration, captions and every scene generated.',
    ideas: [
      'How the Rapa Nui really moved the Easter Island statues',
      'The 600-year-old book written in a language no one can read',
      'The 2,000-year-old computer pulled from a shipwreck in 1901',
      'Göbekli Tepe: the temple built before farming existed',
      'The Nazca lines that only make sense from the sky',
    ],
    hubCard: { title: 'Ancient Mysteries Shorts', example: 'The book nobody has ever been able to read' },
    sections: [
      {
        h2: 'Mystery first, then the newest evidence',
        paragraphs: [
          'The audience for ancient mysteries is curious, not credulous. The videos that grow channels present the old puzzle, then the latest finding — a new dating method, a satellite survey, a machine-learning study — and let the viewer feel smarter at the end. The Easter Island film on this page does exactly that with recent research on Rapa Nui stone gardens.',
          'Avoid claiming aliens or lost super-races as fact. Present the fringe theory as what some people believe, then show what archaeologists found. Platforms increasingly limit reach for misleading content, and an accurate channel ages better.',
        ],
      },
      {
        h2: 'Visual language for the ancient world',
        paragraphs: [
          'Prompt the era through materials and light: "basalt statues on a windswept green hillside at dawn, low clouds, no modern objects". Torchlit interiors, carved stone in raking light and aerial shots of sites read as ancient instantly. Keep crowds small and costumes simple; generated scenes handle landscapes and artifacts better than period-accurate faces.',
        ],
      },
      {
        h2: 'Building a series viewers return to',
        paragraphs: [
          'Group episodes by place — a week on Egypt, a week on the Andes — so each video recommends the next. A recurring opening line ("Everything you were taught about this is incomplete") becomes the channel’s signature after a handful of uploads.',
          'Archaeology news is a steady source of fresh hooks: a new excavation, a reread inscription, a carbon date that moves a timeline by centuries. When a discovery is announced, a 60-second explainer that connects it to the old mystery is exactly what curious viewers search for that week.',
        ],
      },
    ],
    faq: [
      {
        q: 'Is the Easter Island film real Kineo output?',
        a: 'Yes. It is a Kineo-owned film rendered on Seedance 1.5 from the prompt shown next to it, which was typed in Portuguese and narrated in English.',
      },
      {
        q: 'Can I test an ancient mystery Short for free?',
        a: `Yes: one ${FREE_S}-second Seedance 1.5 film${WHERE}, with a watermark, no card required.`,
      },
      {
        q: 'What do I get if I subscribe?',
        a: `Creator is ${CREATOR_DEAL}: ${CREATOR_FILMS} Seedance 1.5 films of 60 seconds a month with no watermark. Starter (${STARTER_PRICE}/month) and Studio (${STUDIO_PRICE}/month) sit on either side.`,
      },
    ],
    film: {
      id: 'a09706da-a79f-4029-b213-69f43d6a2775',
      engine: 'cinematic_ai',
      source: 'translated_prompt',
      idea: 'Easter Island (Rapa Nui): new machine-learning and remote-sensing analyses showed that the Rapanui people did not destroy their civilization through overpopulation, but used ingenious stone gardens to live stably.',
      kind: 'a real ancient mystery Short',
      honestNote: null,
    },
  },

  // Vizinha do horror (a página de nicho nº 1): mesmo público, formato diferente — fato verdadeiro, não história inventada.
  'creepy-facts': {
    searchTarget: 'creepy facts video generator / scary facts shorts ai',
    label: 'Creepy Facts',
    h1: 'Free AI Creepy Facts Shorts Generator',
    metaTitle: 'AI Creepy & Scary Facts Shorts Generator — Kineo',
    metaDescription: 'True facts that sound like horror stories, narrated as vertical Shorts with generated scenes and captions. Real Kineo film inside; start with a free watermarked film.',
    intro:
      'True things that are scarier than fiction: hikers who cut their own tent open from inside, a town that has been burning underground since 1962, a phone call from a number that does not exist. Kineo turns each creepy fact into a narrated Short with atmosphere, captions and generated scenes.',
    ideas: [
      'The nine hikers who fled their tent barefoot into the snow',
      'The Pennsylvania town that has been on fire underground since 1962',
      'Why there is a room in your house where you are statistically most likely to die',
      'The radio station that has broadcast a buzzing tone since the 1970s',
      'The deepest hole ever dug, and why they stopped',
    ],
    hubCard: { title: 'Creepy Facts Shorts', example: 'The hikers who fled their tent into the snow' },
    sections: [
      {
        h2: 'Why creepy facts outperform made-up scares',
        paragraphs: [
          '"This really happened" is the strongest hook in horror. A fictional story asks the viewer to imagine; a documented fact makes them search it afterwards — and come back to comment that it checks out. Creepy-fact channels also avoid the fatigue of invented stories, because the supply of real strange events is endless.',
          'Open with the most disturbing detail stated flatly, no build-up: "Their tent was cut open from the inside." Then explain where and when, then the theories. A calm narrator makes the fact land harder than a dramatic one.',
        ],
      },
      {
        h2: 'Atmosphere without gore',
        paragraphs: [
          'Ask for mood rather than violence: fog, a single flashlight beam, snow blowing over an empty campsite, a ringing phone in a dark kitchen. Generated scenes are excellent at unsettling stillness, and platforms push that kind of video further than graphic content.',
          'Use sound words in the script — wind, static, a door closing — because the narration sets the tone the visuals follow.',
        ],
      },
      {
        h2: 'Fact-check before you post',
        paragraphs: [
          'Creepy facts spread because they are surprising, and surprising "facts" are often wrong. Confirm each one against a primary source — a coroner’s report, a newspaper archive, an official agency page — and say "allegedly" when the record is thin. Your credibility is the channel.',
          'Close every video with a short source line on screen or in the description, such as the year and the agency that documented the case. Viewers who doubt the fact can check it in seconds, and that transparency is what turns a skeptical commenter into a subscriber.',
        ],
      },
    ],
    faq: [
      {
        q: 'Which engine made the Dyatlov Pass film?',
        a: 'Kling 2.5, a paid engine. Your free film uses Seedance 1.5, which handles fog, snow and night scenes well.',
      },
      {
        q: 'What is free?',
        a: `New accounts${WHERE} get one ${FREE_S}-second Seedance 1.5 film with a watermark, without entering a card.`,
      },
      {
        q: 'How much does a creepy facts channel cost to run?',
        a: `Creator at ${CREATOR_DEAL} gives ${CREATOR_FILMS} clean 60-second Seedance 1.5 films a month, or ${CREATOR_CINEMATIC_FILMS} on Kling 2.5. The Studio shows the cost per film before you generate.`,
      },
    ],
    film: {
      id: 'f3de57b0-3486-4400-ba72-c9390774d426',
      engine: 'cinematic_kling',
      source: 'translated_prompt',
      idea: 'The Dyatlov Pass incident: nine experienced hikers died mysteriously in the Ural Mountains in 1959, with their tents torn open from the inside and unexplained injuries.',
      kind: 'a real creepy-fact Short',
      honestNote: null,
    },
  },
}

export const LOTE1_NICHE_SLUGS: readonly string[] = Object.keys(LOTE1_NICHES)

/** O filme real da casa para o nicho do lote 1; null = semente quebrada (o guardião acusa) ou nicho fora do lote. */
export function lote1NicheFilm(slug: string): (HouseFilm & { kind: string; honestNote: string | null; ctaLabel?: string }) | null {
  const n = Object.prototype.hasOwnProperty.call(LOTE1_NICHES, slug) ? LOTE1_NICHES[slug] : null
  if (!n) return null
  try {
    const f = resolveHouseFilm({ id: n.film.id, engine: n.film.engine, idea: n.film.idea, source: n.film.source })
    return { ...f, kind: n.film.kind, honestNote: n.film.honestNote, ctaLabel: n.film.ctaLabel }
  } catch {
    return null
  }
}

// ═══ 3 PÁGINAS DE INTENÇÃO (fora da família de nicho) ═══
export interface Lote1Landing {
  path: string
  /** nome curto da página no intent_campaign do botão de compra (buy_creator_<page>) */
  buyPage: string
  campaign: string
  lang: 'en' | 'es'
  searchTarget: string
  badge: string
  h1: string
  metaTitle: string
  metaDescription: string
  lead: string
  freeCta: string
  form: { label: string; placeholder: string; submit: string; examplesLabel: string; note: string }
  examples: [string, string, string]
  steps: { t: string; d: string }[]
  sections: Lote1Section[]
  faq: Lote1Faq[]
  film: Lote1FilmSeed
  related: { href: string; label: string }[]
  labels: { realOutput: string; howItWorks: string; faqTitle: string; related: string; finalTitle: string; finalCta: string }
}

export const LOTE1_LANDINGS: Readonly<Record<string, Lote1Landing>> = {
  // Intenção de COMPRA: quem busca "sem marca d'água" já decidiu que quer o arquivo limpo. A página diz a verdade (o filme
  // grátis TEM marca d'água) e põe o Creator na primeira dobra.
  'ai-shorts-generator-no-watermark': {
    path: '/ai-shorts-generator-no-watermark',
    buyPage: 'no_watermark',
    campaign: 'lote1_no_watermark',
    lang: 'en',
    searchTarget: 'ai shorts generator no watermark',
    badge: 'No-watermark AI Shorts',
    h1: 'AI Shorts Generator With No Watermark',
    metaTitle: 'AI Shorts Generator With No Watermark — Honest Answer | Kineo',
    metaDescription: `Kineo's free ${FREE_S}-second film carries a watermark; every paid plan exports clean MP4s. Creator is ${CREATOR_DEAL} for ${CREATOR_FILMS} watermark-free 60-second films.`,
    lead:
      'Straight answer first: the free film Kineo gives new accounts carries a small watermark, and every paid plan exports clean files. If you need a Short you can post on a client account or a monetized channel today, the paid route is the honest one — and the first month of Creator is discounted.',
    freeCta: 'Test free first (watermarked)',
    form: {
      label: 'What should your Short be about?',
      placeholder: 'Type a topic or paste a finished script',
      submit: 'Create my Short',
      examplesLabel: 'Try one',
      note: `Your idea travels through signup. The free test is one ${FREE_S}-second film with a watermark; paid exports are clean.`,
    },
    examples: [
      'The internet puzzle that recruited codebreakers and then vanished',
      'Why airplane windows are round',
      'The habit that quietly makes people broke',
    ],
    steps: [
      { t: 'Write or paste', d: 'A one-line idea or a complete script you want narrated word for word.' },
      { t: 'Generate', d: 'Script, AI voiceover, captions and generated scenes come back as one 9:16 film in about 6 minutes.' },
      { t: 'Download clean', d: 'On a paid plan the MP4 has no Kineo mark, ready for YouTube, TikTok, Reels or a client.' },
    ],
    sections: [
      {
        h2: 'Why "free with no watermark" is rare',
        paragraphs: [
          'Generating a video with a text-to-video model costs real money per second on the provider’s side. Tools that advertise free, clean exports usually make it back somewhere else: slideshows of still images with a zoom effect instead of generated footage, a short cap on length, low resolution, or a credit balance that runs out after one clip. Read the fine print before planning a channel around a free tier.',
          'Kineo’s choice is to make the free test a real generated film — the same engine paying customers use — and mark it, so the test shows true quality and the clean file is what the subscription pays for.',
        ],
      },
      {
        h2: 'What changes when you pay',
        paragraphs: [
          'The watermark goes away on every export, films can run 60 seconds and longer, and premium engines like Kling and Veo unlock for scenes that need more spectacle. Your videos are yours to post anywhere, including monetized channels and client work.',
          'Plans are monthly and cancel anytime from the account page. Credits are spent per film, and the Studio shows the cost of each engine and length before you press Generate, so there are no surprises at the end of the month.',
        ],
      },
      {
        h2: 'A quick way to decide',
        paragraphs: [
          'Post once a week or less: test free, then Starter. Post every few days: Creator, which is sized for a steady schedule of 60-second films. Run several channels or a client roster: Studio. The film on this page shows the quality you would be paying for.',
        ],
      },
    ],
    faq: [
      {
        q: 'Is Kineo free with no watermark?',
        a: `No. New accounts${WHERE} get one free ${FREE_S}-second film on Seedance 1.5, and it is watermarked. Any paid plan removes the watermark from every export.`,
      },
      {
        q: 'What is the cheapest plan without a watermark?',
        a: `Starter, at ${STARTER_PRICE}/month. Creator is ${CREATOR_DEAL} and covers ${CREATOR_FILMS} clean 60-second Seedance 1.5 films a month; Studio is ${STUDIO_PRICE}/month.`,
      },
      {
        q: 'Can I remove the watermark from the free film later?',
        a: 'No — the free film is exported with the mark. Upgrade first, then generate the film again to get a clean file.',
      },
      {
        q: 'Can I use the videos commercially?',
        a: 'Yes. You keep ownership of the videos you generate, as stated in the terms of service, and paid exports carry no Kineo branding.',
      },
    ],
    film: {
      id: '1901f2bb-2b87-4e78-acb9-e850505b1cbf',
      engine: 'cinematic_ai',
      source: 'script_opening',
      idea: 'In 2012, a message appeared on the internet looking for highly intelligent individuals. Thousands tried. Almost nobody finished. It was signed 3301.',
      kind: 'a Seedance 1.5 film (preview cut)',
      honestNote: 'This preview is a Kineo-owned film, shown so you can judge the quality you are paying for.',
    },
    related: [
      { href: '/free-ai-shorts-generator', label: 'Free AI Shorts generator' },
      { href: '/text-to-video-shorts', label: 'Text to video Shorts' },
      { href: '/pricing', label: 'Plans and prices' },
    ],
    labels: { realOutput: 'Real Kineo output', howItWorks: 'How it works', faqTitle: 'Questions about the watermark', related: 'Related pages', finalTitle: 'Get clean, watermark-free Shorts', finalCta: 'Start with the free test →' },
  },

  // Quem paga hoje faz FILME com personagem (série policial, carta do pai, dinossauro). Busca de cabeça: "ai short film generator".
  'ai-short-film-generator': {
    path: '/ai-short-film-generator',
    buyPage: 'short_film',
    campaign: 'lote1_short_film',
    lang: 'en',
    searchTarget: 'ai short film generator',
    badge: 'AI short film generator',
    h1: 'AI Short Film Generator: One Paragraph In, a Narrated Film Out',
    metaTitle: 'AI Short Film Generator — Narrated 60-Second Films | Kineo',
    metaDescription: `Write a paragraph or a full script; Kineo directs it into a narrated, captioned vertical short film with generated scenes on Seedance, Kling or Veo. First ${FREE_S}-second film free.`,
    lead:
      'Write the story — a boat found drifting, a letter from a father, a detective’s last case — and Kineo turns it into a narrated short film: it splits the story into shots, directs each scene, records the narrator, adds captions and assembles a vertical MP4. You choose the engine; the Studio shows the cost before you generate.',
    freeCta: 'Make a free test film',
    form: {
      label: 'What is your short film about?',
      placeholder: 'One paragraph of story, or your complete narration',
      submit: 'Start my film',
      examplesLabel: 'Story starters',
      note: `The story stays attached through signup. Your first ${FREE_S}-second film is free and watermarked; nothing renders until you press Generate.`,
    },
    examples: [
      'A boat is found drifting in the Pacific in 1955 with every passenger gone',
      'A son opens his late father’s storage unit and finds a letter addressed to him',
      'A night-shift nurse keeps hearing a call button from an empty room',
    ],
    steps: [
      { t: 'Write the story', d: 'A paragraph is enough. A finished script can be narrated exactly as written.' },
      { t: 'Pick the engine', d: 'Seedance 1.5 for an affordable generated film, Kling or Veo when the scenes need more spectacle.' },
      { t: 'Review, then generate', d: 'Check duration and scenes, press Generate, and download the finished film in about 6 minutes.' },
    ],
    sections: [
      {
        h2: 'Narrated film, not a single clip',
        paragraphs: [
          'Most video models return one clip of five or ten seconds. A short film needs a beginning, a turn and an ending, a voice that carries the viewer between shots, and captions for people watching on mute. Kineo’s job is the part between the model and the finished file: it writes or keeps the narration, plans one shot per line, generates every scene and edits them to the voice.',
          'That is why the result is a film you can post, not a folder of clips to edit. The film on this page — a boat found drifting with 25 people missing — came from a written script and was assembled entirely by the pipeline.',
        ],
      },
      {
        h2: 'Writing a story that fits 60 seconds',
        paragraphs: [
          'Sixty seconds of narration is roughly 140 to 160 spoken words. Spend the first sentence on the strangest fact, the middle on what people found, and the last line on the question nobody answered. Cut adjectives before you cut events. If your story needs more room, choose a 90-second film rather than rushing the ending.',
          'Characters with dialogue and lip sync are a different format; for narrated drama, describe each character the same way every time they appear so the generated shots stay consistent.',
        ],
      },
      {
        h2: 'Choosing the engine for your film',
        paragraphs: [
          'Seedance 1.5 is the everyday engine: generated scenes at the lowest cost per film, and the one used for the free test. Kling 2.5 and Kling 3 bring heavier cinematic light and motion for hero moments, and Veo 3.1 is strong on realistic lighting. Mixing is not required — most creators pick one engine per film and keep it.',
        ],
      },
    ],
    faq: [
      {
        q: 'Can I make an AI short film for free?',
        a: `You can make one: new accounts${WHERE} get a free ${FREE_S}-second Seedance 1.5 film with a watermark, no card. Full-length clean films need a paid plan.`,
      },
      {
        q: 'Which engine made the film on this page, and what does it cost?',
        a: `Kling 3. It is a premium engine: Studio (${STUDIO_PRICE}/month) holds ${STUDIO_HOLLYWOOD_FILMS} Kling 3 films of 60 seconds a month. On Creator (${CREATOR_DEAL}) the same credits make ${CREATOR_FILMS} Seedance 1.5 films of 60 seconds.`,
      },
      {
        q: 'How long can a film be?',
        a: 'Paid films target 35, 60 or 90 seconds. The final cut follows the narration, so a film can run a few seconds past its target instead of cutting the story short.',
      },
      {
        q: 'Do I own the film?',
        a: 'Yes. The terms of service confirm you keep ownership of generated videos, and paid exports have no Kineo watermark.',
      },
    ],
    film: {
      id: '397fa32a-2f35-4e09-950c-9f7d00e23c50',
      engine: 'cinematic_hollywood',
      source: 'script_opening',
      idea: 'In 1955, a boat was found drifting in the Pacific. Everyone on board was gone. The boat was fine.',
      kind: 'a narrated short film on Kling 3',
      honestNote: 'A Kineo-owned film from the founder’s showcase; customer films stay private.',
    },
    related: [
      { href: '/text-to-video-shorts', label: 'Text to video Shorts' },
      { href: '/ai-video-generator/seedance', label: 'Seedance 1.5 engine' },
      { href: '/free-ai-shorts/ocean', label: 'Ocean mystery Shorts' },
    ],
    labels: { realOutput: 'A real Kineo short film', howItWorks: 'From story to film', faqTitle: 'Short film questions', related: 'Related pages', finalTitle: 'Your story, directed and narrated', finalCta: 'Write my first film →' },
  },

  // A porta em ESPANHOL do nicho que mais traz gente (horror). Muitos cadastros digitam em espanhol; o gerador genérico em
  // espanhol já existe (/generador-de-shorts-gratis) — esta mira a busca de terror ("videos de terror con IA").
  'generador-de-videos-de-terror': {
    path: '/generador-de-videos-de-terror',
    buyPage: 'terror_es',
    campaign: 'lote1_terror_es',
    lang: 'es',
    searchTarget: 'generador de videos de terror con ia / historias de terror ia tiktok',
    badge: 'Videos de terror con IA',
    h1: 'Generador de videos de terror con IA para TikTok y Shorts',
    metaTitle: 'Generador de videos de terror con IA (historias de miedo) — Kineo',
    metaDescription: `Escribe una historia de miedo y Kineo crea el video vertical completo: guion, narración en español, subtítulos y escenas generadas. Primer video de ${FREE_S} segundos gratis, con marca de agua.`,
    lead:
      'Escribe una historia de miedo — la regla de las 3 de la mañana, la casa del pueblo que nadie visita, la llamada desde un número que no existe — y Kineo la convierte en un video vertical narrado en español, con subtítulos y escenas generadas por IA. Sin grabar, sin editar y sin mostrar la cara.',
    freeCta: 'Probar gratis',
    form: {
      label: '¿De qué trata tu historia de terror?',
      placeholder: 'Escribe la idea o pega tu guion completo',
      submit: 'Crear mi video de terror',
      examplesLabel: 'Ideas de miedo',
      note: `Tu idea pasa al registro. El primer video (${FREE_S} s, Seedance 1.5) es gratis${WHERE_ES}, con marca de agua y sin tarjeta.`,
    },
    examples: [
      'Si te despiertas a las 3:17 y alguien toca la puerta de tu cuarto, no abras',
      'El barco que encontraron navegando con la cena servida y nadie a bordo',
      'La grabación de una app de sueño que registró una conversación a medianoche',
    ],
    steps: [
      { t: 'Escribe la historia', d: 'Una idea de una línea o el guion completo, palabra por palabra.' },
      { t: 'La IA la dirige', d: 'Narración en español, subtítulos y una escena generada para cada frase.' },
      { t: 'Descarga y publica', d: 'Un MP4 vertical 9:16 en unos 6 minutos, listo para TikTok, Shorts o Reels.' },
    ],
    sections: [
      {
        h2: 'Cómo se escribe un video de terror que la gente termina',
        paragraphs: [
          'Los videos de miedo que se viralizan empiezan en el momento más inquietante, no en el contexto. "A las 3:17 sonó el teléfono de la cocina, y en casa no hay teléfono fijo." Después, tres giros cortos que suben la tensión y un final que deja una duda. En TikTok y Shorts la gente decide en los dos primeros segundos si se queda.',
          'Cuenta la historia en segunda persona o como un testimonio: "me pasó a mí", "si alguna vez te despiertas…". La voz cercana asusta más que un narrador lejano, y hace que los comentarios se llenen de gente contando su propia experiencia.',
        ],
      },
      {
        h2: 'Escenas que dan miedo sin mostrar sangre',
        paragraphs: [
          'Pide atmósfera, no violencia: pasillo oscuro, luz de linterna, niebla en un camino de tierra, una puerta entreabierta. Las escenas generadas funcionan muy bien con quietud y sombras, y las plataformas recomiendan más el terror psicológico que el contenido explícito.',
          'Escribe la idea en español y elige español como idioma de narración en el Studio antes de generar. Si ya tienes el guion terminado, elige mantenerlo tal cual y la narración sigue tus palabras.',
        ],
      },
      {
        h2: 'Una serie de terror para publicar todos los días',
        paragraphs: [
          'Las cuentas de terror que crecen publican a diario con un formato fijo: misma frase de apertura, mismo narrador, misma duración. Leyendas de tu país, historias "reales" de seguidores y reglas de horario ("nunca mires por la ventana después de medianoche") dan material para meses.',
        ],
      },
    ],
    faq: [
      {
        q: '¿Puedo crear un video de terror gratis?',
        a: `Sí, uno: las cuentas nuevas${WHERE_ES} reciben un video de ${FREE_S} segundos en Seedance 1.5, con marca de agua y sin tarjeta.`,
      },
      {
        q: '¿La narración sale en español?',
        a: 'Sí. Kineo narra en español (y en otros idiomas); elige el idioma en el Studio. El ejemplo de esta página fue narrado en inglés.',
      },
      {
        q: '¿Cuánto cuesta publicar seguido?',
        a: `Creator cuesta ${CREATOR_DEAL_ES} e incluye ${CREATOR_FILMS} videos de 60 segundos en Seedance 1.5 sin marca de agua, o ${CREATOR_CINEMATIC_FILMS} en Kling 2.5. Starter cuesta ${STARTER_PRICE}/mes y Studio ${STUDIO_PRICE}/mes. Precio de referencia en USD.`,
      },
      {
        q: '¿Cuánto tarda cada video?',
        a: 'Unos 6 minutos desde que pulsas Generar hasta el MP4 listo para descargar.',
      },
    ],
    film: {
      id: 'fbc5d391-316f-4757-aa54-0565f698cb9f',
      engine: 'cinematic_kling',
      source: 'exact_prompt',
      idea: 'The ship was found sailing perfectly. Dinner still warm on the table. But every single person on board was gone.',
      kind: 'una historia de barco fantasma (Kling 2.5)',
      honestNote: 'Nota honesta: este video de la casa fue narrado en inglés y hecho en Kling 2.5, un motor de pago. Tu video gratis sale en Seedance 1.5 y puede narrarse en español.',
    },
    related: [
      { href: '/generador-de-shorts-gratis', label: 'Generador de Shorts gratis' },
      { href: '/free-ai-shorts/horror', label: 'Horror Shorts (English)' },
      { href: '/pricing', label: 'Planes y precios' },
    ],
    labels: { realOutput: 'Video real hecho en Kineo', howItWorks: 'Cómo funciona', faqTitle: 'Preguntas frecuentes', related: 'Páginas relacionadas', finalTitle: 'Tu historia de miedo, narrada y lista para publicar', finalCta: 'Crear mi primer video →' },
  },
}

export const LOTE1_LANDING_PATHS: readonly string[] = Object.values(LOTE1_LANDINGS).map((l) => l.path)

/** O filme real da casa para a página de intenção; null = semente quebrada (o guardião acusa). */
export function lote1LandingFilm(key: string): (HouseFilm & { kind: string; honestNote: string | null }) | null {
  const l = Object.prototype.hasOwnProperty.call(LOTE1_LANDINGS, key) ? LOTE1_LANDINGS[key] : null
  if (!l) return null
  try {
    const f = resolveHouseFilm({ id: l.film.id, engine: l.film.engine, idea: l.film.idea, source: l.film.source })
    return { ...f, kind: l.film.kind, honestNote: l.film.honestNote }
  } catch {
    return null
  }
}
