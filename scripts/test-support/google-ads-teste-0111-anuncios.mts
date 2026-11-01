// KINEO-GOOGLE-ADS-TESTE-0111 — o texto da campanha de teste no Google Search (palavras-chave, negativas e anúncios).
// Função PURA: todo número (preço, crédito) entra por parâmetro, lido pelo gerador/guardião das fontes únicas
// (lib/checkoutPricing.ts TIER_PRICES/TIER_CREDITS, lib/kling4PaidPricing.ts, lib/marketingPrice.ts). Nenhum número digitado.
// Gerador: scripts/gerar-google-ads-teste-0111.mts (escreve o bloco do doc). Guardião: scripts/test-google-landing-0111.mts.
//
// Regras de cópia (fundador): nada de recurso que não existe, nada de "free" (a busca de grátis é negativa e o anúncio é
// para quem quer o motor premium), preço só como "from $X/mo" porque é verdade (Starter é o plano mais barato à venda).

export type Numeros = {
  /** "$9.90" — formatCheckoutMoney('usd', TIER_PRICES.starter.usd) */
  starter: string
  /** "$19.90" — formatCheckoutMoney('usd', TIER_PRICES.basic.usd) */
  creator: string
  creatorCredits: number
  k4: { 15: number; 30: number; 60: number }
  /** créditos de um filme de 60 s no Seedance 1.5 (creditsPerReferenceVideo('cinematic_ai')) */
  seedance60: number
  /** créditos de um filme de 60 s no Veo 3.1 Fast (creditsPerReferenceVideo('cinematic_veo')) */
  veo60: number
}

export type Anuncio = { rotulo: string; caminho: [string, string]; titulos: string[]; descricoes: string[] }
export type GrupoCopia = {
  key: 'kling4' | 'seedance' | 'veo'
  titulo: string
  exatas: string[]
  frases: string[]
  negativasDoGrupo: string[]
  anuncios: [Anuncio, Anuncio]
}

/** Negativas da campanha. Ampla = qualquer busca com a palavra; frase = a sequência. */
export const NEGATIVAS_AMPLAS = [
  'free', 'gratis', 'download', 'apk', 'mod', 'crack', 'cracked', 'torrent', 'pirate', 'github', 'huggingface', 'comfyui',
  'api', 'jobs', 'job', 'careers', 'career', 'hiring', 'salary', 'internship', 'course', 'courses', 'tutorial', 'tutorials',
  'class', 'udemy', 'wiki', 'wikipedia', 'news', 'leak', 'leaked', 'arxiv', 'paper', 'benchmark', 'reddit',
  'discord', 'login', 'nsfw', 'nude', 'nudes', 'porn', 'sex', 'xxx', 'uncensored', 'hentai', 'stock', 'shares', 'ipo',
  'earnings', 'dreamina', 'capcut', 'jimeng', 'doubao', 'volcengine', 'byteplus', 'klingai', 'kuaishou', 'vertex',
  'gemini', 'replicate', 'wavespeed', 'runway', 'pika', 'sora',
] as const
export const NEGATIVAS_FRASE = [
  'hugging face', 'open source', 'model weights', 'api key', 'what is', 'release date', 'technical report', 'log in',
  'sign in', 'customer service', 'cancel subscription', 'google flow', 'ai studio', 'fal ai', 'share price', 'how to use',
  'no sign up', 'without login', 'unlimited free',
] as const

export function montarGrupos(n: Numeros): GrupoCopia[] {
  // Títulos e descrições que valem para os três grupos (todos verdadeiros em qualquer motor da casa).
  const comuns = {
    plano: `Plans From ${n.starter}/mo`,
    filmes: 'Finished Films, Not Clips',
    trilha: 'Narration, Captions and Music',
    ideia: 'Type an Idea, Get a Film',
    vertical: 'Vertical 9:16, Ready to Post',
    mp4: 'Clean MP4 on Paid Plans',
    cancela: 'Cancel Anytime',
    roteiro: 'Script, Scenes and Edit Done',
    semCamera: 'No Camera, No Editing',
    creator: `Creator: ${n.creatorCredits} Credits/mo`,
  }
  const descPlano = `Plans from ${n.starter}/mo. Paid plans export clean MP4s with no watermark. Cancel anytime.`
  const descMp4 = 'One vertical MP4, ready to post. No editing and no stitching raw clips together.'
  const descSemMarca = 'Type one idea. Kineo writes the script, renders every scene and edits the film for you.'
  const descTrilha = 'Narration, captions and music arrive in the same file, already timed to the scenes.'

  const semMarca = (caminho: [string, string], extra: string[]): Anuncio => ({
    rotulo: 'B — sem marca de terceiro (segue rodando se o A for reprovado por marca)',
    caminho,
    titulos: [
      ...extra,
      comuns.filmes, comuns.trilha, comuns.ideia, comuns.roteiro, comuns.vertical, comuns.plano, comuns.creator,
      comuns.mp4, comuns.cancela, comuns.semCamera,
    ],
    descricoes: [descSemMarca, descTrilha, descPlano, descMp4],
  })

  return [
    {
      key: 'kling4',
      titulo: 'G1 — Kling 4.0',
      exatas: [
        'kling 4', 'kling 4.0', 'kling 4 app', 'kling 4.0 app', 'kling 4 online', 'kling 4.0 online', 'kling 4 video generator',
        'kling 4.0 video generator', 'kling 4 ai video', 'use kling 4', 'kling 4 price', 'kling 4 pricing',
      ],
      frases: [
        'kling 4 app', 'kling 4.0 online', 'kling 4 video generator', 'kling 4 ai video generator', 'use kling 4',
        'kling 4 text to video', 'where to use kling 4', 'kling 4.0 access',
      ],
      negativasDoGrupo: ['3.0', '2.5', '2.1', '1.6'],
      anuncios: [
        {
          rotulo: 'A — com o nome do motor (clique melhor; pode ser reprovado por marca)',
          caminho: ['Kling-4', 'Films'],
          titulos: [
            'Kling 4.0 Online', 'Try Kling 4.0 in Kineo', 'Kling 4.0 AI Video Generator', 'Kling 4.0 Films With Music',
            '15, 30 or 60-Second Films', `60-Second Film: ${n.k4[60]} Credits`, comuns.filmes, comuns.trilha, comuns.ideia,
            comuns.plano, comuns.vertical, 'No Waitlist', comuns.mp4, comuns.cancela, comuns.roteiro,
          ],
          descricoes: [
            'Type one idea. Kineo directs Kling 4.0 scenes and adds narration, captions and music.',
            `Kling 4.0 films of 15, 30 or 60 seconds cost ${n.k4[15]}, ${n.k4[30]} or ${n.k4[60]} credits.`,
            descPlano,
            descMp4,
          ],
        },
        semMarca(['AI-Video', 'Films'], ['Cinematic AI Films Online', '15, 30 or 60-Second Films', 'Premium AI Video Models', 'AI Video With Voiceover', 'One Idea, One Finished Film']),
      ],
    },
    {
      key: 'seedance',
      titulo: 'G2 — Seedance',
      exatas: [
        'seedance', 'seedance ai', 'seedance app', 'seedance online', 'seedance 1.5', 'seedance 1.5 pro', 'seedance pro',
        'seedance video generator', 'seedance ai video generator', 'bytedance seedance', 'use seedance', 'seedance price',
      ],
      frases: [
        'seedance app', 'seedance online', 'seedance video generator', 'seedance ai video', 'seedance 1.5 pro',
        'seedance text to video', 'where to use seedance', 'bytedance video generator',
      ],
      negativasDoGrupo: ['2.0'],
      anuncios: [
        {
          rotulo: 'A — com o nome do motor (clique melhor; pode ser reprovado por marca)',
          caminho: ['Seedance', 'Films'],
          titulos: [
            'Seedance 1.5 Online', 'Seedance AI Video Generator', 'Use Seedance 1.5 in Kineo', 'Seedance Films, Fully Edited',
            `60-Second Film: ${n.seedance60} Credits`, comuns.filmes, comuns.trilha, comuns.ideia, comuns.plano, comuns.vertical,
            comuns.creator, comuns.mp4, comuns.cancela, comuns.roteiro, 'Every Scene Generated',
          ],
          descricoes: [
            'Type one idea. Kineo writes the script, generates Seedance 1.5 scenes and edits it.',
            `A finished 60-second Seedance 1.5 film costs ${n.seedance60} credits, with narration and captions.`,
            descPlano,
            descMp4,
          ],
        },
        semMarca(['AI-Video', 'Films'], ['Cinematic AI Films Online', 'Every Scene Generated', 'Premium AI Video Models', 'AI Video With Voiceover', 'One Idea, One Finished Film']),
      ],
    },
    {
      key: 'veo',
      titulo: 'G3 — Veo 3 alternative / AI video generator premium',
      exatas: [
        'veo 3.1', 'veo 3.1 app', 'veo 3.1 online', 'veo 3.1 fast', 'veo 3 app', 'veo 3 online', 'use veo 3', 'veo 3 alternative',
        'veo 3.1 video generator', 'veo 3 video generator', 'premium ai video generator', 'best ai video generator with voice',
      ],
      frases: [
        'veo 3 alternative', 'veo 3.1 app', 'veo 3.1 online', 'veo 3 video generator', 'ai video generator with voiceover',
        'premium ai video generator', 'cinematic ai video generator', 'veo without google plan',
      ],
      negativasDoGrupo: ['flow'],
      anuncios: [
        {
          rotulo: 'A — com o nome do motor (clique melhor; pode ser reprovado por marca)',
          caminho: ['Veo-3-1', 'Films'],
          titulos: [
            'Veo 3.1 Fast Online', 'Veo 3.1 Without a Google Plan', 'Veo 3.1 AI Video Generator', 'Veo 3.1 Fast, Fully Edited',
            `60-Second Film: ${n.veo60} Credits`, comuns.filmes, comuns.trilha, comuns.ideia, comuns.plano, comuns.vertical,
            comuns.creator, comuns.mp4, comuns.cancela, comuns.roteiro, 'Premium AI Video Models',
          ],
          descricoes: [
            'Kineo runs Veo 3.1 Fast and turns one idea into a narrated, captioned vertical film.',
            `A finished 60-second Veo 3.1 film costs ${n.veo60} credits. No Google plan needed.`,
            descPlano,
            descMp4,
          ],
        },
        semMarca(['AI-Video', 'Premium'], ['Premium AI Video Generator', 'Cinematic AI Films Online', 'AI Video With Voiceover', 'One Idea, One Finished Film', 'Every Scene Generated']),
      ],
    },
  ]
}

/** Contagem do Google: cada caractere conta 1 (inclusive $ e espaço). */
export const car = (s: string): number => [...s].length

/** O bloco do doc (entre os marcadores), gerado — o guardião confere que o doc é igual a isto. */
export function blocoDoDoc(n: Numeros, urlFinal: (key: GrupoCopia['key']) => { base: string; sufixo: string; clique: string }): string {
  const linhas: string[] = []
  for (const g of montarGrupos(n)) {
    linhas.push(`### ${g.titulo}`, '')
    const u = urlFinal(g.key)
    linhas.push(`**URL de pouso (o que a pessoa abre):** \`${u.clique}\``, '')
    linhas.push(`Campo **URL final** do anúncio: \`${u.base}\` · campo **Sufixo do URL final** (grupo): \`${u.sufixo}\``, '')
    linhas.push(`**Palavras-chave — exata (${g.exatas.length}):** ${g.exatas.map((k) => `\`[${k}]\``).join(' · ')}`, '')
    linhas.push(`**Palavras-chave — frase (${g.frases.length}):** ${g.frases.map((k) => `\`"${k}"\``).join(' · ')}`, '')
    linhas.push(`**Negativas só deste grupo (ampla):** ${g.negativasDoGrupo.map((k) => `\`${k}\``).join(' · ')}`, '')
    for (const a of g.anuncios) {
      linhas.push(`**Anúncio ${a.rotulo}** · caminho exibido: usekineo.com/${a.caminho[0]}/${a.caminho[1]}`, '')
      linhas.push('| # | Título (≤ 30) | car. |', '|---|---|---|')
      a.titulos.forEach((t, i) => linhas.push(`| ${i + 1} | ${t} | ${car(t)} |`))
      linhas.push('', '| # | Descrição (≤ 90) | car. |', '|---|---|---|')
      a.descricoes.forEach((d, i) => linhas.push(`| ${i + 1} | ${d} | ${car(d)} |`))
      linhas.push('')
    }
  }
  linhas.push('### Negativas da campanha (valem para os 3 grupos)', '')
  linhas.push(`**Ampla (${NEGATIVAS_AMPLAS.length}):** ${NEGATIVAS_AMPLAS.map((k) => `\`${k}\``).join(' · ')}`, '')
  linhas.push(`**Frase (${NEGATIVAS_FRASE.length}):** ${NEGATIVAS_FRASE.map((k) => `\`"${k}"\``).join(' · ')}`)
  return linhas.join('\n')
}
