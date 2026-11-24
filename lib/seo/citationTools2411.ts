import type { IntentPage } from './intentPages'
import type { NarrationLanguage } from '../textLanguage'

export const CITATION_TOOLS_REVIEWED_ISO = '2026-11-24'
export type CitationTool = IntentPage & { language: NarrationLanguage; review: string; example: 'cartoon-videos' | 'animated-story-videos' | 'animal-story-videos'; signal: string; source: string }
const seeds = [
  {
    "slug": "urdu-story-videos",
    "family": "language",
    "language": "ur",
    "h1": "Urdu story video generator",
    "intro": "Turn an Urdu kahani idea or your own Urdu narration into a faceless story video with generated scenes, voice, captions and music. Choose a starting mode below, then review the language and script in Studio before generating.",
    "examplePrompt": "ایک چھوٹا لومڑ رات کی بارش میں گم شدہ چراغ اس کے مالک تک پہنچاتا ہے۔ نرم لہجے میں ایک مختصر کہانی سنائیں۔",
    "question": "How can I turn my Urdu kahani into a narrated video?",
    "answer": "Paste Urdu script and choose Use my script as is, or give an Urdu idea and choose Write from my idea. Check Urdu in Studio before generating. Review pronunciation and right-to-left captions in the finished film; this is not a guarantee of a particular calligraphy style.",
    "review": "Check Urdu pronunciation, right-to-left captions and names. Captions follow the narration language.",
    "example": "animal-story-videos",
    "signal": "/ai-video-generator/for/urdu",
    "source": "https://makestory.video/p/urdu-story-video-maker"
  },
  {
    "slug": "urdu-moral-story-videos",
    "family": "language",
    "language": "ur",
    "h1": "Urdu moral story video maker",
    "intro": "Prepare a short Urdu moral story around one choice and one lesson. Kineo turns your idea or narration script into a faceless video with generated scenes, an Urdu voice, captions and music; review the lesson and language before generating.",
    "examplePrompt": "ایک چڑیا کو سونے کا بیج ملتا ہے۔ وہ اسے اکیلے رکھنے کے بجائے دوستوں کے ساتھ بانٹتی ہے۔ آخر میں دوستی کا سبق دیں۔",
    "question": "Can I make an Urdu moral story video from my own script?",
    "answer": "Yes. Paste your own narration and select Use my script as is to carry that wording into Studio. For an idea, state the character, the choice and the lesson. Review the script for age suitability and check pronunciation; Kineo does not certify educational accuracy.",
    "review": "Read the ending and moral yourself. Review suitability for the intended audience; generated scenes and character details can vary.",
    "example": "animal-story-videos",
    "signal": "/ai-video-generator/for/urdu",
    "source": "https://www.framecompose.com/moral-story-video-maker"
  },
  {
    "slug": "german-faceless-shorts",
    "family": "language",
    "language": "de",
    "h1": "German faceless Shorts generator",
    "intro": "Create a faceless Short from a German idea or narration script without filming yourself. Kineo prepares generated scenes, German narration, captions and music; review the script and language in Studio before you start the film.",
    "examplePrompt": "Ein kleiner Fuchs findet eine alte Uhr, die nur bei Regen tickt. Erzähle eine kurze Geschichte mit einer überraschenden Auflösung.",
    "question": "How do I make faceless Shorts with German narration?",
    "answer": "Write your topic or paste your narration in German. The language choice travels with the text to Studio. Check German before generating, then review names, compound words and caption breaks in the finished film. Uploading to a channel is your own step.",
    "review": "Check pronunciation of names, German compound words and caption line breaks. Channel upload and audience results are not automatic.",
    "example": "animated-story-videos",
    "signal": "/free-shorts-generator/de",
    "source": "https://fliki.ai/features/ai-story-video-generator"
  },
  {
    "slug": "portuguese-story-shorts",
    "family": "language",
    "language": "pt",
    "h1": "Portuguese story Shorts generator",
    "intro": "Turn a Portuguese story idea or your own narration into a faceless Short with generated scenes, voice, captions and music. Keep your script or ask Kineo to write from an idea, then review Portuguese and the film settings in Studio.",
    "examplePrompt": "Uma raposa encontra uma carta que só aparece quando chove. Conte uma história curta com começo, surpresa e um final acolhedor.",
    "question": "Can I turn my Portuguese story into a Short without recording my voice?",
    "answer": "Yes. Enter Portuguese text and continue to Studio with Portuguese selected. An AI voice supplies the narration and captions follow it. Listen to the finished film to check pronunciation and regional wording. No accent or audience outcome is guaranteed.",
    "review": "Check Portuguese pronunciation and regional wording. Revise factual claims and character continuity before uploading.",
    "example": "animated-story-videos",
    "signal": "/gerador-de-shorts-gratis",
    "source": "https://makestory.video/"
  },
  {
    "slug": "bedtime-story-videos",
    "family": "format",
    "language": "en",
    "h1": "Bedtime story video maker",
    "intro": "Prepare a calm bedtime story video from one gentle idea or your own narration. Kineo adds generated scenes, voice, captions and music; review the wording, pace and visuals yourself before showing the finished film to a child.",
    "examplePrompt": "A sleepy fox lends the moon a tiny lantern and follows its warm light home. Tell a gentle bedtime story with no frightening twist.",
    "question": "How can I make a gentle bedtime story video from text?",
    "answer": "Describe a small problem, a reassuring resolution and the calm tone you want, or paste your finished narration. Review every generated scene and the soundtrack before use. The tool does not provide a guarantee of age suitability or a sleep benefit.",
    "review": "Review every scene, narration and music for the intended age. There is no automatic age certification or sleep promise.",
    "example": "cartoon-videos",
    "signal": "/ai-kids-cartoon-videos",
    "source": "https://www.framecompose.com/bedtime-story-video-maker"
  },
  {
    "slug": "moral-story-shorts",
    "family": "format",
    "language": "en",
    "h1": "Moral story Shorts maker",
    "intro": "Make a narrated moral story Short around a character, a decision and its consequence. Start with your own lesson or finished narration; Kineo prepares scenes, voice, captions and music for you to review in Studio.",
    "examplePrompt": "A fox finds two apples and keeps both until a hungry friend arrives. Tell a short fable whose ending shows why sharing matters.",
    "question": "How do I make a moral story Short with a clear lesson?",
    "answer": "State one decision and show its consequence instead of asking for several lessons at once. Use your script as is if you already chose the wording. Review the prepared script and the finished visuals; generated stories can need editing.",
    "review": "Verify that the ending actually supports the lesson and that the story is suitable for its audience.",
    "example": "animal-story-videos",
    "signal": "/free-ai-shorts/cartoon",
    "source": "https://www.framecompose.com/moral-story-video-maker"
  },
  {
    "slug": "scary-story-shorts",
    "family": "format",
    "language": "en",
    "h1": "Scary story Shorts generator",
    "intro": "Turn an original scary premise or your own narration into a faceless horror Short with generated scenes, voice, captions and music. Set the tone in your text and review the finished result; suspense and exact visual details are not guaranteed.",
    "examplePrompt": "An elevator opens onto a quiet floor where every clock has stopped except one. Tell an eerie fictional story with no gore and one final reveal.",
    "question": "Can I make a scary story Short from my own narration?",
    "answer": "Yes. Choose Use my script as is for wording you want to retain, or describe a fictional premise for an AI-written draft. Review timing, continuity and suitability. Do not present an invented incident as a real case or use someone else's protected story without permission.",
    "review": "Review suspense, scene continuity and suitability. This is fictional storytelling, not evidence of a real incident.",
    "example": "animated-story-videos",
    "signal": "/free-ai-shorts/horror",
    "source": "https://slice.video/make/ai-horror-stories"
  },
  {
    "slug": "history-fact-shorts",
    "family": "format",
    "language": "en",
    "h1": "History fact Shorts maker",
    "intro": "Turn a history fact and its source notes into a faceless narrated Short with generated scenes, captions and music. Kineo prepares the video from your text; you verify the dates, names and historical interpretation before publishing.",
    "examplePrompt": "Explain how a lighthouse helped sailors navigate before GPS. Use a short narrated story and clearly label the generated scenes as illustrations.",
    "question": "How can I make a history fact Short without filming?",
    "answer": "Prepare a sourced fact or narration, continue to Studio, and check the script before generating. Generated scenes are illustrations, not archival evidence. Kineo does not automatically verify your sources, historical costume or dates.",
    "review": "Verify dates and names against primary sources. Label generated historical scenes as illustrations and review clothing and objects.",
    "example": "animated-story-videos",
    "signal": "/ai-video-generator/for/documentary-shorts",
    "source": "https://www.revid.ai/tools/faceless-video"
  },
  {
    "slug": "animal-fable-videos",
    "family": "format",
    "language": "en",
    "h1": "Animal fable video maker",
    "intro": "Create a short animal fable from your own characters, one choice and one lesson. Kineo turns the idea or narration into generated scenes, voice, captions and music; review character appearance and the story ending before publishing.",
    "examplePrompt": "A small wolf borrows a lantern from an owl and must choose between taking a shortcut or helping a lost mouse. End with a lesson about kindness.",
    "question": "Can AI make an animal fable video with narration?",
    "answer": "Kineo can prepare narrated scenes, captions and music from your animal story. Describe the same main character clearly and review every scene: identical appearance, exact actions and lip-synced animal dialogue are not guaranteed.",
    "review": "Check recurring animal appearance, actions and the ending. The historical sample is not a render of your prompt.",
    "example": "animal-story-videos",
    "signal": "/scripts/animals",
    "source": "https://ovideo.io/resources/ai-animal-story-video"
  },
  {
    "slug": "cartoon-youtube-shorts",
    "family": "format",
    "language": "en",
    "h1": "Cartoon YouTube Shorts maker",
    "intro": "Prepare a cartoon-style YouTube Short from an original idea or a finished narration. Kineo adds generated scenes, voice, captions and music; review the style, duration and credits in Studio, then upload the finished video yourself.",
    "examplePrompt": "A tiny orange cat opens a bakery for woodland animals, but the first customer is a shy giant. Tell a warm cartoon story with one funny surprise.",
    "question": "How do I make a cartoon YouTube Short from text?",
    "answer": "Describe the story and cartoon style, or paste your own narration. Review the prepared script, selected model and length in Studio before generating. Cartoon appearance and recurring details can vary. Download and upload are separate choices, and monetization is not guaranteed.",
    "review": "Check cartoon style and continuity. Review your rights, the intended audience and YouTube rules before upload.",
    "example": "cartoon-videos",
    "signal": "/free-ai-shorts/cartoon",
    "source": "https://fliki.ai/features/ai-story-video-generator"
  }
] as const
export const CITATION_TOOLS: readonly CitationTool[] = seeds.map(p => ({
 ...p, keyword: p.h1, title: p.h1 + ' | Kineo', engine: 'cinematic_ai',
 engineWhy: 'Review the selected model and credits in Studio before generating.',
 faq: [{q:p.question,a:p.answer},{q:'What should I review before publishing?',a:p.review},{q:'Can I control the narration wording?',a:'Yes. Use an idea for a prepared AI draft or choose Use my script as is for your own narration. Review the text in Studio before generating.'}],
}))
export const getCitationTool = (slug: string): CitationTool | undefined => CITATION_TOOLS.find(p => p.slug === slug)
