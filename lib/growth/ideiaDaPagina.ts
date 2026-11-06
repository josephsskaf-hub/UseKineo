// KINEO-CAIXA-COM-IDEIA-0611 [fundador 06/11: "1-2 task de fluxo"]: a caixa do celular abre o Studio com uma ideia da própria página.
// A ideia só preenche a caixa; o filme nunca começa sozinho. Puro: o guardião executa estas funções e confere cada texto na página de origem.
const NICHOS: Readonly<Record<string, string>> = {
  money: '$200 a month makes you a millionaire — here’s the exact math',
  faith: 'The verse for anyone who is tired of pretending they are fine',
  mystery: 'The disappearance nobody solved in 70 years',
  history: 'Why ancient Rome collapsed in 5 steps',
  motivation: 'The 5am habit that rewires your brain',
  facts: 'The everyday object that’s secretly 1,000 years old',
  ai: 'The AI tool replacing 10 jobs right now',
  geography: 'The country where it’s illegal to die',
  space: 'What NASA found on Mars they never announced',
  truecrime: 'The cold case solved by a single typo',
  psychology: 'Say this one sentence and people instantly trust you',
  sports: 'The shot that ended a career in one second',
  science: 'There’s enough gold in the ocean to make everyone rich — here’s the catch',
  conspiracy: 'The “accident” that destroyed the evidence days before the trial',
  luxury: 'What a $500 million yacht actually costs to run per day',
  stoicism: 'The Stoic rule that kills anxiety in 10 seconds',
  crypto: 'The $100 Bitcoin bet that turned into a fortune',
  business: 'The business that made millions with almost no employees',
  fitness: 'The 20-minute habit that changes your body in 30 days',
  relationships: 'The one text that instantly changes how they see you',
  horror: 'The 3am rule you should never break',
  celebrity: 'The star who went from broke to a billion dollars',
  animals: 'The animal that can survive being frozen solid',
  health: 'The 30-second habit that adds years to your life',
  cars: 'The $3 million car only 10 people can buy',
  gaming: 'The game that was never supposed to exist',
  movies: 'The movie scene that was completely unscripted',
  food: 'The food that never actually expires',
  travel: 'The place tourists are banned from entering',
  localbusiness: 'The one question every customer asks before booking us — answered in 30 seconds',
}

const PAGINAS: Readonly<Record<string, string>> = {
  '/free-ai-shorts-generator': 'The island nobody is allowed to visit',
  '/gerador-de-shorts-gratis': 'A ilha que ninguém pode visitar',
}

/** A ideia que combina com a página; null = a caixa segue com a pergunta de sempre. */
export function ideiaDaPagina(pathname: string | null | undefined): string | null {
  const caminho = String(pathname ?? '').replace(/\/+$/, '')
  if (Object.hasOwn(PAGINAS, caminho)) return PAGINAS[caminho]
  const nicho = caminho.match(/^\/free-ai-shorts\/([a-z0-9-]+)$/)?.[1]
  return nicho && Object.hasOwn(NICHOS, nicho) ? NICHOS[nicho] : null
}

/** Texto que chegou no link: uma linha, sem link solto, até 200 caracteres. Qualquer outra coisa = caixa vazia. */
export function ideiaDoLink(valor: string | string[] | undefined): string {
  if (typeof valor !== 'string') return ''
  const texto = valor.replace(/\s+/g, ' ').trim()
  if (!texto || texto.length > 200 || /^https?:\/\//i.test(texto)) return ''
  return texto
}

export function hrefDaCaixa(ideia: string | null): string {
  const base = '/studio?intent_campaign=home_phone_box'
  return ideia ? `${base}&ideia=${encodeURIComponent(ideia)}` : base
}

export const IDEIAS_DOS_NICHOS = NICHOS
