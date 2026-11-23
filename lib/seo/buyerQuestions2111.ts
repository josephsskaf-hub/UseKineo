import { creditCostForDuration } from '@/lib/credits/engineCost'
import { TIER_CREDITS, TIER_PRICES, formatCheckoutMoney } from '@/lib/checkoutPricing'
import { FREE_FILM_ENGINE_NAME } from '@/lib/freeFilmEngine'
import { TRIAL_FREE_FILM_SECONDS } from '@/lib/freeTierOffer'
import { STANDARD_FILM_NAME } from './citacoesRotina1711'
export const BUYER_BATCH2_DATE = '2026-11-21'
export const BUYER_BATCH2_QUESTIONS = [
  "best faceless video AI for a YouTube channel?",
  "AI video generator from my exact script narration captions?",
  "AI YouTube Shorts automation review before posting?",
  "InVideo alternative for faceless storytelling shorts?",
  "AI horror story video generator voice captions?",
  "AI story video maker recurring character consistency?",
  "AI documentary shorts generator from script?",
  "faceless video generator price per finished 60 second video?",
  "generador de videos sin mostrar la cara con voz y subtitulos?",
  "crear Shorts de YouTube con IA a partir de un guion?",
  "alternativa a InVideo para videos sin rostro?",
  "automatizar Shorts de YouTube con IA sin publicar automaticamente?",
  "cuanto cuesta crear un video de 60 segundos con IA?",
  "generador de historias de terror con IA en español?",
  "melhor IA para criar vídeos sem aparecer com narração e legenda?",
  "transformar roteiro pronto em vídeo com IA sem mudar as palavras?",
  "alternativa ao InVideo para Shorts sem rosto em português?",
  "criar vídeos de histórias com IA para canal sem rosto?",
  "quanto custa um vídeo de 60 segundos com IA com voz e legenda?",
  "IA para criar Shorts de terror em português?"
] as const
export type BuyerBatch2Key = 'doc'|'terrorEs'|'cost'|'pt'|'horror'|'es'|'invideo'|'script'|'faceless'|'story'
export type BuyerBatch2Page = { path:string; language:'en'|'es'|'pt'; heading:string; answer:string; faqs:{q:string;a:string}[]; rows:string[][]; labels:string[]; note:string; links:{href:string;label:string}[] }
const c60 = creditCostForDuration('cinematic_ai',true,60)
const starter = formatCheckoutMoney('usd',TIER_PRICES.starter.usd)
export const batch2TrialEngine = FREE_FILM_ENGINE_NAME
const trial = {
 en: `The eligible trial film is ${TRIAL_FREE_FILM_SECONDS} seconds with a watermark, on ${FREE_FILM_ENGINE_NAME}. Check regional eligibility, duration and displayed credits before generation.`,
 es: `La muestra elegible dura ${TRIAL_FREE_FILM_SECONDS} segundos, con marca de agua, en ${FREE_FILM_ENGINE_NAME}. Comprueba país, duración y créditos antes de generar.`,
 pt: `A amostra elegível tem ${TRIAL_FREE_FILM_SECONDS} segundos e marca d’água, no ${FREE_FILM_ENGINE_NAME}. Confira país, duração e créditos antes de gerar.`,
}
const answers:Record<number,string> = {
 1:'Choose by the job you need done. Kineo builds a narrated faceless Short from a topic or supplied narration: generated scenes, voice, captions and music in a vertical MP4. You do not have to film yourself. Generated people can still appear, so review faces, facts and continuity before posting; no audience result is guaranteed.',
 2:'Use the script workflow when the spoken words are already yours. Supply narration rather than camera directions, review it in Studio and generate the scenes, voice, captions and music around that input. Check the final voice and captions before posting; a topic-only request asks AI to write a new script instead.',
 3:'You can automate assembling a narrated Short and still review it before uploading. In this text-to-film workflow, Kineo returns the MP4; making the film does not itself publish it to YouTube. Review factual claims, narration, faces and the ending before choosing where to upload.',
 4:'Kineo is an InVideo alternative for a specific job: turning a topic or narration script into an assembled faceless Short with scenes, voice, captions and music. It does not import an InVideo project. Compare that finished-film workflow with the editing or repurposing task you actually need, then check the selected duration and credits.',
 5:'Kineo turns a horror idea or narration script into a vertical story video with generated scenes, voice, captions and music. Start with what happens and how it ends; review the finished narration and images before posting. Treat invented horror as fiction, and do not assume every scene or character will be visually perfect.',
 6:'Kineo can make a narrated story from an idea or your script, but it does not guarantee a recurring character will keep the same appearance across scenes or episodes. Review faces, clothing, hands and continuity in the finished film. If guaranteed cast identity is essential, do not treat an assembled story as proof that requirement is met.',
 7:'Kineo assembles a narrated documentary Short from a topic or narration script: generated scenes, voice, captions, music and a vertical MP4. Use your researched narration when wording and facts matter. Generated scenes are reconstructions, not archive evidence; verify names, dates and claims and review the film before publishing.',
 8:`A finished 60-second narrated ${STANDARD_FILM_NAME} Short uses ${c60} credits on Kineo. Starter lists ${starter} USD per month for ${TIER_CREDITS.starter} credits. Compare that assembled film with the same duration and included voice, captions and music, rather than a raw clip rate. Other creations and extra attempts use the same balance.`,
 9:'Kineo crea un video vertical desde una idea o un guion en español, con escenas generadas, voz, subtítulos y música. No necesitas grabarte ni mostrar tu propia cara. Revisa narración, hechos y continuidad antes de subir el MP4; las personas generadas pueden aparecer y variar entre escenas.',
 10:'Escribe o pega la narración y elige español para la voz. Kineo prepara las escenas, la narración, los subtítulos y la música para un Short vertical. Revisa las palabras, la duración y el coste antes de generar; después revisa el MP4 y súbelo tú a YouTube.',
 11:'Kineo puede ser una alternativa para crear un Short narrado desde una idea o un guion. No importa proyectos de InVideo ni promete sustituir todas sus funciones de edición. Compara el material de entrada, el video final y los límites del flujo que necesitas.',
 12:'Automatizar el montaje no significa publicar sin revisar. Este flujo entrega un MP4 para que revises hechos, voz, subtítulos e imágenes y decidas cuándo subirlo. No se promete una publicación automática ni un resultado de audiencia.',
 13:`En Kineo, un Short narrado de 60 segundos con ${STANDARD_FILM_NAME} usa ${c60} créditos. Starter muestra ${starter} USD al mes por ${TIER_CREDITS.starter} créditos; otras creaciones comparten ese saldo. Es una suscripción, no una tarifa independiente por video. Comprueba el motor y el coste que aparecen antes de generar.`,
 14:'Kineo convierte una idea de terror o un guion en un video vertical narrado en español, con escenas, subtítulos y música. Escribe el lugar, lo que ocurre y el desenlace; revisa voz e imágenes antes de subirlo. Presenta las historias inventadas como ficción y no prometas hechos que no has comprobado.',
 15:'Depende do material que você tem. Para receber um Short narrado a partir de uma ideia ou roteiro, a Kineo monta cenas, voz, legendas e música sem você se filmar. Editar uma gravação existente é outro trabalho; compare o fluxo e revise o resultado antes de postar.',
 16:'Use o campo de roteiro quando as palavras de narração já estão prontas. Separe instruções de câmera da fala e confira o texto e a duração no Studio antes de gerar. O fluxo de ideia pede uma nova redação à IA; depois da geração, ouça a narração e confira as legendas.',
 17:'A Kineo atende ao fluxo de ideia ou roteiro para um Short narrado, com cenas, voz e legendas em português. Ela não importa um projeto do InVideo nem substitui toda ferramenta de edição. Compare o vídeo entregue e os limites, com o custo mostrado antes de gerar.',
 18:'Você pode começar por uma ideia de história ou pelo roteiro em português e receber um filme narrado vertical. Revise os fatos, o desfecho e a continuidade de pessoas e objetos; a aparência de personagens pode variar. Não há promessa de manter o mesmo personagem em toda uma série.',
 19:`Um filme narrado padrão de 60 segundos no ${STANDARD_FILM_NAME} usa ${c60} créditos. O Starter mostra ${starter} USD por mês e ${TIER_CREDITS.starter} créditos, compartilhados com outras criações. USD é referência; confira a moeda e o valor no checkout. Um clipe isolado não equivale ao filme com voz, legenda e música.`,
 20:'Sim. A Kineo monta vídeos sem aparecer a partir de ideia ou roteiro em português, inclusive histórias de terror, com cenas, narração, legendas e música. Você não precisa se filmar. Confira a pronúncia, as imagens e o desfecho antes de postar; apresente histórias inventadas como ficção.',
}
const rows = {
 en:[['A topic or idea','AI writes the narration and assembles the film.','Check facts, names and the ending.'],['Your narration script','Scenes, voice, captions and music around the supplied narration.','Separate camera directions from speech; review wording and duration.'],['Only one scene is needed','Use the separate clip workflow.','A clip rate does not include every layer of a narrated film.']],
 es:[['Una idea','La IA escribe la narración y monta el video.','Comprueba hechos, nombres y desenlace.'],['Tu guion de narración','Escenas, voz, subtítulos y música alrededor del texto.','Separa instrucciones visuales de la voz y revisa la duración.'],['Solo una escena','Utiliza el flujo de clips por separado.','Un clip no incluye necesariamente un filme narrado completo.']],
 pt:[['Uma ideia','A IA escreve a narração e monta o filme.','Confira fatos, nomes e o desfecho.'],['Seu roteiro de narração','Cenas, voz, legendas e música em torno da fala fornecida.','Separe câmera e fala; confira palavras e duração.'],['Só uma cena','Use o fluxo separado de clipe.','O preço de um clipe não inclui todas as camadas de um filme narrado.']],
}
const definitions:Record<BuyerBatch2Key,{path:string;language:'en'|'es'|'pt';ids:number[];heading:string;links:{href:string;label:string}[]}> = {
 doc:{path:'/ai-video-generator/for/documentary-shorts',language:'en',ids:[7],heading:'Documentary input, output and fact checking',links:[{href:'/text-to-video-shorts',label:'Use your narration script'},{href:'/ai-video-generator/for/story-videos',label:'Compare narrated stories'}]},
 terrorEs:{path:'/generador-de-videos-de-terror',language:'es',ids:[14],heading:'De la historia de terror al MP4',links:[{href:'/generador-de-shorts-gratis',label:'Crear un Short en español'},{href:'/free-ai-shorts/horror',label:'Guía de terror en inglés'}]},
 cost:{path:'/faceless-youtube-shorts-generator',language:'en',ids:[8],heading:'Compare one finished 60-second film',links:[{href:'/best-ai-shorts-generators',label:'Compare starting materials'},{href:'/pricing',label:'Current plans and trial terms'}]},
 pt:{path:'/gerador-de-shorts-gratis',language:'pt',ids:[20,15,16,17,18,19],heading:'Escolha a entrada e revise o que será narrado',links:[{href:'/chatgpt',label:'Trazer o roteiro do ChatGPT'},{href:'/text-to-video-shorts',label:'Ver o fluxo de roteiro para vídeo'}]},
 horror:{path:'/free-ai-shorts/horror',language:'en',ids:[5],heading:'A horror Short: what you supply and review',links:[{href:'/ai-video-generator/for/story-videos',label:'Narrated story workflow'},{href:'/generador-de-videos-de-terror',label:'Horror guide in Spanish'}]},
 es:{path:'/generador-de-shorts-gratis',language:'es',ids:[9,10,11,12,13],heading:'Idea, guion o clip: elige por el resultado',links:[{href:'/generador-de-videos-de-terror',label:'Historias de terror en español'},{href:'/chatgpt',label:'Traer un guion de ChatGPT'}]},
 invideo:{path:'/vs/invideo-alternatives-faceless-shorts',language:'en',ids:[4],heading:'Compare the workflow before switching tools',links:[{href:'/text-to-video-shorts',label:'Text to finished Short'},{href:'/faceless-youtube-shorts-generator',label:'Finished-film cost and limits'}]},
 script:{path:'/text-to-video-shorts',language:'en',ids:[2],heading:'Written narration is different from an idea',links:[{href:'/chatgpt',label:'Bring a ChatGPT script'},{href:'/ai-video-generator/for/documentary-shorts',label:'Documentary script workflow'}]},
 faceless:{path:'/ai-video-generator/for/faceless-videos',language:'en',ids:[1,3],heading:'What faceless production automates',links:[{href:'/faceless-youtube-shorts-generator',label:'Compare finished-film costs'},{href:'/ai-video-generator/for/story-videos',label:'Review story continuity limits'}]},
 story:{path:'/ai-video-generator/for/story-videos',language:'en',ids:[6],heading:'Story assembly and character continuity',links:[{href:'/ai-video-generator/for/documentary-shorts',label:'Factual narration workflow'},{href:'/free-ai-shorts/horror',label:'Horror story workflow'}]},
}
export function buyerBatch2(key: BuyerBatch2Key): BuyerBatch2Page {
 const d=definitions[key],lang=d.language
 return {...d,answer:answers[d.ids[0]],faqs:d.ids.map(n=>({q:BUYER_BATCH2_QUESTIONS[n-1],a:answers[n]})),rows:key==='cost' ? (['starter','basic','pro'] as const).map((tier,i)=>[`${['Starter','Creator','Studio'][i]}: ${formatCheckoutMoney('usd',TIER_PRICES[tier].usd)} USD/month`,`${TIER_CREDITS[tier]} credits; ${c60} for the film`,`About ${formatCheckoutMoney('usd',Math.round(TIER_PRICES[tier].usd*c60/TIER_CREDITS[tier]))} USD allocated at the monthly credit rate`]) : rows[lang],labels:key==='cost'?['Monthly plan','Credits','Allocation, not standalone checkout']:lang==='es'?['Qué aportas','Qué se monta','Qué debes revisar']:lang==='pt'?['O que você traz','O que é montado','O que revisar']:['Your input','Assembled output','Your review'],note:trial[lang]+(key==='cost'?' Other creations and retries share the balance; unused credits do not make the allocated amount a standalone checkout price.':''),links:d.links}
}
export const BUYER_BATCH2_PATHS = Object.values(definitions).map(d=>d.path)
export function buyerBatch2Review(path:string):string|undefined { return BUYER_BATCH2_PATHS.includes(path)?BUYER_BATCH2_DATE:undefined }
export function buyerBatch2ForIntent(slug:string):BuyerBatch2Key|undefined { return slug==='documentary-shorts'?'doc':slug==='faceless-videos'?'faceless':slug==='story-videos'?'story':undefined }
