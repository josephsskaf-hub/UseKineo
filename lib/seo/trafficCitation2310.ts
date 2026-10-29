import { FREE_FILM_ENGINE_NAME } from '@/lib/freeFilmEngine' // KINEO-LLMS-K4-2910
import { STARTER_CREDITS, STARTER_USD_AMOUNT } from '@/lib/marketingPrice'
import { TRIAL_CREDITS_SHOWN, TRIAL_FREE_FILM_CREDITS, TRIAL_FREE_FILM_SECONDS } from '@/lib/freeTierOffer'
import { creditCostForDuration } from '@/lib/credits/engineCost'

// KINEO-TRAFEGO-2310 — GEO-2, checked against the current billing sources.
// USD is the reference price. Brazil settles in BRL; no payment behavior changes here.
export const TRAFFIC_CITATION_UPDATED = '2026-10-23'
export type TrafficCitationPage = 'home' | 'seedance' | 'text' | 'horror' | 'urdu' | 'portuguese'
type Faq = { q: string; a: string }
type Citation = { heading: string; answer: string; rows: string[][]; faq: Faq[] }

const price = `US$${STARTER_USD_AMOUNT}/month`
const film60 = creditCostForDuration('cinematic_ai', true, 60)
const trialCredits = `${TRIAL_FREE_FILM_CREDITS} per film; ${TRIAL_CREDITS_SHOWN} trial credits`
const paidCredits = `${film60} per film; ${STARTER_CREDITS}/month on Starter`
const trialPrice = 'Free trial in supported countries'
const paidPrice = `Starter: ${price} reference; Brazil pays in BRL at checkout`
const timing = 'Varies by film length and selected engine'
const trialRow = (output: string): string[] => [output, `${TRIAL_FREE_FILM_SECONDS} s requested; ${FREE_FILM_ENGINE_NAME}`, timing, trialPrice, trialCredits] // KINEO-LLMS-K4-2910
const paidRow = (output: string): string[] => [output, '60 s requested; Seedance 1.5', timing, paidPrice, paidCredits]
const clean = 'Paid plans provide clean MP4 downloads. The trial film has a watermark.'
const free = `In supported countries, ${TRIAL_CREDITS_SHOWN} trial credits cover a watermarked ${TRIAL_FREE_FILM_SECONDS}-second ${FREE_FILM_ENGINE_NAME} film, with no card.` // KINEO-LLMS-K4-2910

export const TRAFFIC_CITATIONS: Record<TrafficCitationPage, Citation> = {
  home: {
    heading: 'Make a Film: formats, credits and answers',
    answer: `Kineo turns an idea or script into a narrated film with generated scenes, captions and music. Make a Film is the starting point for faceless Shorts. Paid plans start at US$${STARTER_USD_AMOUNT} per month. New accounts in supported countries receive ${TRIAL_CREDITS_SHOWN} trial credits for a watermarked ${TRIAL_FREE_FILM_SECONDS}-second ${FREE_FILM_ENGINE_NAME} film.`, // KINEO-LLMS-K4-2910
    rows: [trialRow('Make a Film: script, narration, generated scenes, captions and music'), paidRow('Make a Film: narrated film and clean MP4 on a paid plan'), ['3D kids cartoons / Product Ads / AI UGC Ads', 'Separate workflows; duration selected in each tool', timing, 'See the current offers on /pricing', 'Cost shown before generation']],
    faq: [
      { q: 'What do I need to start a film?', a: 'An idea or your own script.' },
      { q: 'What is included?', a: 'The script, AI narration, generated scenes, captions and music.' },
      { q: 'Is the free film watermark-free?', a: clean },
      { q: 'What does the entry plan cost?', a: `Starter is ${price} as the USD reference price, with ${STARTER_CREDITS} monthly credits. Customers in Brazil pay in reais at checkout.` },
      { q: 'What else can I make?', a: '3D kids cartoons, product ads and ads with an AI presenter have separate workflows.' },
    ],
  },
  seedance: {
    heading: 'Seedance 1.5: formats, credits and answers',
    answer: `Kineo uses Seedance 1.5 Pro to build narrated films from an idea or script, including generated scenes, voice, captions and music. A 60-second film costs ${film60} credits. Starter includes ${STARTER_CREDITS} credits for US$${STARTER_USD_AMOUNT} per month. In supported countries, new accounts can try a watermarked ${TRIAL_FREE_FILM_SECONDS}-second film made with ${FREE_FILM_ENGINE_NAME} using their ${TRIAL_CREDITS_SHOWN} trial credits.`, // KINEO-LLMS-K4-2910
    rows: [trialRow(`${FREE_FILM_ENGINE_NAME} narrated film with voice, captions and music`), paidRow('Seedance 1.5 narrated film with clean MP4 on a paid plan')], // KINEO-LLMS-K4-2910
    faq: [
      { q: 'Which Seedance model does Kineo use here?', a: 'ByteDance Seedance 1.5 Pro.' },
      { q: 'Is this a clip or a finished film?', a: 'Choose a clip for one scene; Make a Film also includes narration, captions and music.' },
      { q: 'How many credits does a 60-second film use?', a: `${film60} credits on Seedance 1.5.` },
      { q: 'Can I try it without a card?', a: free },
      { q: 'Does a 60-second film take 60 seconds to generate?', a: 'No. Film duration is the requested output length; generation time is the wait for the file. There is no fixed delivery time.' },
    ],
  },
  text: {
    heading: 'Text to Shorts: formats, credits and answers',
    answer: `Paste a topic or a finished script into Kineo to create a vertical Short with AI narration, scenes, captions and music. You can keep your own spoken wording. A 60-second Seedance 1.5 film uses ${film60} credits; Starter costs US$${STARTER_USD_AMOUNT} monthly. The supported-country trial covers a shorter, watermarked ${TRIAL_FREE_FILM_SECONDS}-second film.`,
    rows: [trialRow(`Topic → written script and narrated ${FREE_FILM_ENGINE_NAME} film`), paidRow('Your script → narrated Seedance 1.5 film and clean MP4')], // KINEO-LLMS-K4-2910
    faq: [
      { q: 'Can I start with one sentence?', a: 'Yes. Kineo can write the script from your topic.' },
      { q: 'Can I paste a finished script?', a: 'Yes. Use your own spoken script in the script field.' },
      { q: 'Do I need a long recording?', a: 'No. This workflow starts from text.' },
      { q: 'What file do I receive?', a: 'A vertical 9:16 MP4 with narration, generated scenes and captions.' },
      { q: 'What does the free trial cover?', a: free },
    ],
  },
  horror: {
    heading: 'Horror Shorts: formats, credits and answers',
    answer: `Kineo turns a horror idea or creepy legend into a faceless vertical Short with a script, AI voiceover, captions and generated scenes. In supported countries, new accounts receive ${TRIAL_CREDITS_SHOWN} trial credits for one watermarked ${TRIAL_FREE_FILM_SECONDS}-second ${FREE_FILM_ENGINE_NAME} film. Paid plans start at US$${STARTER_USD_AMOUNT} monthly and provide clean downloads.`, // KINEO-LLMS-K4-2910
    rows: [trialRow(`Horror idea → narrated ${FREE_FILM_ENGINE_NAME} film with scenes and captions`), paidRow('Longer horror film with clean MP4 on a paid plan')], // KINEO-LLMS-K4-2910
    faq: [
      { q: 'Do I have to appear on camera?', a: 'No. This is a faceless video workflow.' },
      { q: 'Can I supply the scary idea?', a: 'Yes. Type your idea or choose a suggested starting point.' },
      { q: 'Does the trial unlock every engine?', a: `No. The trial film uses ${FREE_FILM_ENGINE_NAME}. Other engines and longer films require enough paid credits and an eligible plan.` }, // KINEO-LLMS-K4-2910
      { q: 'Is a 60-second horror film included in the trial?', a: `No. Seedance 1.5 uses ${film60} credits for 60 seconds, above the ${TRIAL_CREDITS_SHOWN}-credit trial balance.` },
      { q: 'Can I download without a watermark?', a: clean },
    ],
  },
  urdu: {
    heading: 'Urdu films: formats, credits and answers',
    answer: `Write an Urdu idea or paste an Urdu script into Kineo to create a narrated vertical film. The voice, captions and title follow Urdu, with scenes based on the text. A 60-second Seedance 1.5 film uses ${film60} credits. Starter provides ${STARTER_CREDITS} monthly credits for US$${STARTER_USD_AMOUNT}; trial films are shorter and watermarked.`,
    rows: [trialRow('Urdu idea or script → narrated film, captions, music and vertical MP4'), paidRow('Urdu narrated Seedance 1.5 film with clean MP4')],
    faq: [
      { q: 'Should I write the prompt in Urdu?', a: 'Yes. Write the idea in Urdu or paste a full Urdu script.' },
      { q: 'Do the captions follow the voice?', a: 'Yes. Captions follow the narration language.' },
      { q: 'Can I use a different language for captions?', a: 'This workflow uses the same language for narration and captions.' },
      { q: 'Does the trial cover 60 seconds?', a: `No. ${free}` },
      { q: 'How can I check the narration?', a: 'Listen to the finished film before posting and review the Urdu captions.' },
    ],
  },
  portuguese: {
    heading: 'Filmes em português: formatos, créditos e respostas',
    answer: `A Kineo cria um Short vertical em português a partir de uma ideia ou roteiro, com narração, cenas e legendas. A amostra grátis é um filme ${FREE_FILM_ENGINE_NAME} de ${TRIAL_FREE_FILM_SECONDS} segundos com marca d’água, sem cartão, em países atendidos. Planos pagos liberam MP4 limpo. No Brasil, você paga em reais no checkout.`, // KINEO-LLMS-K4-2910
    rows: [
      ['Ideia em português → filme narrado, cenas e legendas', `${TRIAL_FREE_FILM_SECONDS} s solicitados; ${FREE_FILM_ENGINE_NAME}`, 'Varia conforme a duração e o motor escolhido', 'Amostra grátis nos países atendidos', `${TRIAL_FREE_FILM_CREDITS} por filme; ${TRIAL_CREDITS_SHOWN} no teste`], // KINEO-LLMS-K4-2910
      ['Filme narrado em português com MP4 limpo', '60 s solicitados; Seedance 1.5', 'Varia conforme a duração e o motor escolhido', `Starter: US$${STARTER_USD_AMOUNT}/mês como referência; Brasil paga em reais no checkout`, `${film60} por filme; ${STARTER_CREDITS}/mês no Starter`],
    ],
    faq: [
      { q: 'O vídeo sai em português do Brasil?', a: 'Sim. Esta página abre o fluxo com narração e legendas em português do Brasil.' },
      { q: 'Precisa de cartão para a amostra grátis?', a: 'Não. A amostra tem marca d’água e depende da elegibilidade regional.' },
      { q: 'Posso começar por um roteiro?', a: 'Sim. Existe um campo próprio para colar o roteiro.' },
      { q: 'A amostra grátis terá 35 segundos?', a: `Não. A amostra grátis tem ${TRIAL_FREE_FILM_SECONDS} segundos; o fluxo de 35 segundos exige um plano e créditos suficientes.` },
      { q: 'A Kineo cobra meu plano em reais?', a: 'Sim. Clientes no Brasil pagam em reais no checkout. Confira o valor final antes de confirmar; os preços em USD são a referência do site.' },
    ],
  },
}
