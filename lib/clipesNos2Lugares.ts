// KINEO-CLIPES-NOS-2-LUGARES-0411 — fundador 05/11: "Aproveita para colocar uns clipes desse já trocando os do Halloween, já colocando sempre
// nas telas principais. Made by Kineo também. Sempre colocar nos dois lugares, embaralhar, para o aspecto ser maior."
//
// CLIPE NOVO = UMA ENTRADA EM CLIPES_NOVOS, E SÓ. A home e o /made-with-kineo montam a mesma vitrine (components/home/HomeMosaic.tsx),
// e ela lê esta lista: entrou aqui, aparece nos dois lugares. Prévia em public/previews/galeria/<id>.mp4 (540×960, sem som, faststart)
// e pôster em public/posters/galeria/<id>.webp; conferir o `focus` na janela do cartão (~5:6) antes de subir.
//
// Módulo puro, sem import: scripts/test-clipes-nos-2-lugares-0411.mjs o executa direto. Sem preço no cartão; selo = o motor real da
// linha da tabela `clips`, nunca "anúncio feito pela ferramenta de Ads" (estes saíram do /clips e do /images).
export const CLIPES_NOS_2_LUGARES_MARK = 'KINEO-CLIPES-NOS-2-LUGARES-0411'

export interface ClipeNovo {
  id: string
  title: string
  /** Chave de CLIP_ENGINES: o motor que de fato fez o clipe (o selo do cartão sai daqui). */
  engine: 'seedance' | 'hollywood'
  /** Linha da tabela `clips` de onde o clipe saiu. */
  clipId: string
  /** Que faixa do vídeo 9:16 a janela do cartão mostra (object-position), medida quadro a quadro. */
  focus: string
  /** Tem a mesma pessoa em cena: dois assim não ficam colados (a vitrine viraria "a moça de novo"). */
  pessoa: boolean
  /** Texto do clipe, palavra por palavra, para preencher o /clips. null = clipe feito a partir de uma foto: o texto dele só descreve o
   *  movimento ("Keep the same woman…") e sem a foto mentiria; o cartão abre o /clips no motor e a pessoa manda a foto dela. */
  prompt: string | null
}

export const CLIPES_NOVOS: readonly ClipeNovo[] = [
  { id: 'coffee-run-walk', title: 'Coffee run walk', engine: 'seedance', clipId: '010378d7-c383-4987-82f2-0f28bd5f9b04', focus: '50% 12%', pessoa: true, prompt: null },
  { id: 'hair-flip', title: 'Hair flip', engine: 'seedance', clipId: '39e1e298-17ac-4e41-8581-c76cebfdb866', focus: '50% 60%', pessoa: true, prompt: null },
  { id: 'unboxing', title: 'Unboxing', engine: 'seedance', clipId: '0a6fde6b-63a8-45d3-bd0a-eac7f3e28019', focus: '50% 43%', pessoa: true, prompt: null },
  { id: 'first-bite', title: 'First bite', engine: 'seedance', clipId: '6920fdd1-fa01-4685-9565-c2244ad52aeb', focus: '50% 26%', pessoa: true, prompt: null },
  { id: 'beach-sprint', title: 'Beach sprint', engine: 'seedance', clipId: '3c090b26-af8a-4272-a6d0-5cdbec98bc8b', focus: '50% 28%', pessoa: true, prompt: null },
  { id: 'dress-spin', title: 'Dress spin', engine: 'seedance', clipId: 'b0f5c203-dee1-485c-92bf-212356450043', focus: '50% 20%', pessoa: true, prompt: null },
  { id: 'serum-on-hand', title: 'Serum on hand', engine: 'seedance', clipId: '9720a221-c156-4cfe-8233-6b79ecae5611', focus: '50% 35%', pessoa: true, prompt: null },
  { id: 'lime-splash', title: 'Lime splash', engine: 'seedance', clipId: '59480573-ba4c-4cc4-927f-24c5b2c8c643', focus: '50% 30%', pessoa: false, prompt: 'Vertical commercial product shot, one continuous shot. Super slow motion: a thick slice of lime drops into a tall clear glass of iced sparkling water on a bright coral background. Water and bubbles burst upward in a crown splash, droplets hang in the air, ice cubes tumble, the glass stays sharp in the centre of the frame, the camera pushes in slowly. Crisp studio light, vivid colours, high-end drink commercial. The glass is plain with no label. No text, no letters, no logos, no hands, no people.' },
  { id: 'flying-burger', title: 'Flying burger', engine: 'seedance', clipId: 'b248db19-c3fb-4b08-878c-1d10d3b9af7b', focus: '50% 40%', pessoa: false, prompt: 'Vertical commercial food shot, one continuous shot. Super slow motion: a juicy cheeseburger assembles itself in mid-air against a warm dark orange background. The toasted sesame bun, grilled patty, melting cheese, lettuce, tomato and red onion fall from above one after another and land in a perfect stack in the centre of the frame, melted cheese stretches and drips, sesame seeds and tiny crumbs bounce in the air, the camera pushes in slowly. Crisp studio light, rich appetising colours, high-end fast food commercial. No text, no letters, no logos, no packaging, no hands, no people.' },
  { id: 'cream-pour', title: 'Cream pour', engine: 'seedance', clipId: 'a66b156f-4dc5-4de1-a69e-24e6d8769361', focus: '50% 72%', pessoa: false, prompt: 'Vertical commercial skincare shot, one continuous shot, macro. Super slow motion: an open wide frosted glass jar with no lid, completely blank with no label, stands in the centre of the frame on a soft pink and peach background. The jar is half full of silky white face cream. A thick glossy ribbon of the same cream falls from above into the jar and folds in perfect slow swirls, rising to the rim, a few clear water droplets bounce on the surface around the jar, the camera pushes in slowly. The jar keeps the same shape and nothing else appears. Crisp soft studio light, luxury beauty commercial. No lid, no text, no letters, no logos, no hands, no people.' },
  { id: 'spinning-headphones', title: 'Spinning headphones', engine: 'seedance', clipId: '6e6b1249-69c9-4036-b2b3-36e5c157dda1', focus: '50% 43%', pessoa: false, prompt: 'Vertical commercial tech product shot, one continuous shot. Matte black over-ear wireless headphones, completely plain with no logos and no markings, spin slowly in mid-air in the centre of the frame against a deep electric blue background. They rotate a full turn, soft neon cyan and magenta light slides across the curves, the ear cups open outward and fold back, tiny glowing dust particles drift past, the camera pushes in slowly. Crisp studio light, sleek high-end tech commercial. The headphones keep the same shape throughout. No text, no letters, no logos, no hands, no people.' },
  { id: 'perfume-splash', title: 'Perfume splash', engine: 'hollywood', clipId: 'c9d321e0-0fe4-44b7-871b-2407a55bec91', focus: '50% 55%', pessoa: false, prompt: 'Vertical luxury perfume commercial, one continuous shot, no cuts. Super slow motion: one square glass perfume bottle with a gold cap and amber liquid, completely blank with no label, plunges into deep turquoise water from above, a huge crown of water erupts around it, thousands of silver bubbles rush upward, the bottle rotates slowly in the centre of the frame and catches golden light, the camera pushes in. The bottle keeps exactly the same shape and stays sharp. Rich saturated colours, high-end fragrance film. No text, no letters, no logos, no hands, no people.' },
  { id: 'sneaker-drop', title: 'Sneaker drop', engine: 'seedance', clipId: '335980ac-9a5b-4647-9b6c-a226858e430f', focus: '50% 48%', pessoa: false, prompt: 'Vertical sneaker commercial, one continuous shot. Super slow motion: one minimalist knit running sneaker, the whole upper a single solid electric lime green with no panels, no stripes, no shapes and no markings on the side, with a plain white sole and white laces, rotates in mid-air in the centre of the frame against a solid deep violet background, then drops and lands on the ground and a cloud of fine white powder bursts outward around it, the laces whip with the motion, the camera pushes in slowly. The shoe keeps exactly the same shape. Crisp studio light, saturated colours. Exactly one shoe. No text, no letters, no logos, no symbols, no hands, no feet, no people.' },
  { id: 'red-dress-walk', title: 'Red dress walk', engine: 'hollywood', clipId: '39e2587f-df55-4841-b0a9-1242095b3b89', focus: '50% 72%', pessoa: false, prompt: 'Vertical fashion commercial, one continuous tracking shot, no cuts. A young woman in a long flowing bright red silk dress strides confidently toward the camera along an empty sunlit white-walled street, the fabric billows and ripples behind her in strong wind, her dark hair blows back, the camera moves backward with her at walking speed. Golden hour sun, deep blue sky, vivid saturated colours, high-end fashion film. Full body visible, natural walking movement, natural arms and hands, one person only. Plain clothing with no logos. No text, no letters, no signs, no logos anywhere.' },
  { id: 'iced-coffee-pour', title: 'Iced coffee pour', engine: 'seedance', clipId: 'a3576c28-47ba-4c19-a141-b5e8e196c9dd', focus: '50% 35%', pessoa: false, prompt: 'Vertical commercial coffee shot, one continuous shot. Super slow motion: dark espresso pours in a thick glossy stream from above into a tall clear glass of cold milk and ice cubes on a warm caramel background. The coffee plunges down and blooms through the white milk in swirling clouds, ice cubes turn, a few drops splash above the rim, the camera pushes in slowly. Crisp studio light, rich warm colours, high-end drink commercial. The glass is plain with no label and keeps the same shape. No text, no letters, no logos, no hands, no people.' },
]

export const clipeNovoVideo = (c: Pick<ClipeNovo, 'id'>): string => `/previews/galeria/${c.id}.mp4`
export const clipeNovoPoster = (c: Pick<ClipeNovo, 'id'>): string => `/posters/galeria/${c.id}.webp`

/** Para onde o cartão leva (o chamador passa por viaSignup, como todo clipe da vitrine). Nada é gerado sem o clique em Gerar. */
export function clipeNovoDestino(c: Pick<ClipeNovo, 'engine' | 'prompt'>): string {
  const q = new URLSearchParams({ engine: c.engine })
  if (c.prompt) q.set('prompt', c.prompt)
  return '/clips?' + q.toString()
}

/** Fora da vitrine (home e /made-with-kineo) porque a data passou. Nenhum arquivo foi apagado e as páginas próprias seguem no ar
 *  (/ai-halloween-video, /effects/<slug>); na próxima estação é só tirar daqui. O Natal fica: estamos em novembro. */
export const FORA_DE_ESTACAO: Readonly<Record<'clipes' | 'efeitos' | 'imagens', readonly string[]>> = {
  clipes: ['werewolf'],
  efeitos: ['witch', 'zombie', 'werewolf', 'catrina', 'catrina_pet', 'dust_away', 'figurine_3d'], // dust_away e figurine_3d: o nome não diz, mas a cena abre com abóboras de Halloween acesas ao fundo
  imagens: ['pumpkin.webp'],
}

/** O dia da vitrine, em UTC: a mesma resposta em qualquer servidor ou navegador, seja qual for o fuso. */
export function diaDaVitrine(now: number): string {
  return new Date(now).toISOString().slice(0, 10)
}

function semente(texto: string): number { // FNV-1a
  let h = 0x811c9dc5
  for (let i = 0; i < texto.length; i++) { h ^= texto.charCodeAt(i); h = Math.imul(h, 0x01000193) }
  return h >>> 0
}

/** Fisher-Yates com sorteio derivado da data (mulberry32). Mesma data + mesmo sal = mesma ordem; não usa Math.random nem o relógio. */
export function embaralhaDoDia<T>(itens: readonly T[], dia: string, sal: string): T[] {
  let s = semente(`${dia}|${sal}`)
  const sorteio = () => {
    s = (s + 0x6d2b79f5) | 0
    let t = Math.imul(s ^ (s >>> 15), 1 | s)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
  const out = [...itens]
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(sorteio() * (i + 1))
    const guarda = out[i]; out[i] = out[j]; out[j] = guarda
  }
  return out
}

/** Espalha `extras` por `base` em intervalos iguais, começando por um extra. Sem extras, devolve a base como veio. */
export function intercala<T>(base: readonly T[], extras: readonly T[]): T[] {
  if (extras.length === 0) return [...base]
  const passo = Math.max(1, Math.floor(base.length / extras.length))
  const out: T[] = []
  let b = 0
  for (const extra of extras) {
    out.push(extra)
    for (let i = 0; i < passo && b < base.length; i++) out.push(base[b++])
  }
  while (b < base.length) out.push(base[b++])
  return out
}

/** Quebra sequências: mais de `maximo` vizinhos `colado` seguidos e um deles (o último, senão o primeiro) troca de lugar com o próximo que
 *  `podeTrocar` (mesmo tamanho de cartão), para a grade não mudar de desenho. Sem candidato, fica como está. */
export function afastaVizinhos<T>(itens: readonly T[], colado: (t: T) => boolean, podeTrocar: (a: T, b: T) => boolean, maximo = 1): T[] {
  const out = [...itens]
  const seguidos = (i: number, passo: number) => { let n = 0; for (let k = i + passo; k >= 0 && k < out.length && colado(out[k]); k += passo) n++; return n }
  for (let i = 1; i < out.length; i++) {
    if (!colado(out[i])) continue
    const run = seguidos(i, -1) + 1
    if (run <= maximo) continue
    let trocou = false
    for (const alvo of [i, i - run + 1]) {
      for (let j = i + 1; j < out.length && !trocou; j++) {
        if (colado(out[j]) || !podeTrocar(out[alvo], out[j]) || seguidos(j, -1) + seguidos(j, 1) + 1 > maximo) continue
        const guarda = out[alvo]; out[alvo] = out[j]; out[j] = guarda
        trocou = true
      }
      if (trocou) break
    }
  }
  return out
}

/** Tira do fim da fila os itens `largo` (voltam a `cauda` posições antes do fim): cartão largo no fim da grade deixa buraco, porque não sobra
 *  cartão pequeno para fechar a fileira. */
export function semLargoNoFim<T>(itens: readonly T[], largo: (t: T) => boolean, cauda: number): T[] {
  const corte = Math.max(0, itens.length - cauda)
  const fim = itens.slice(corte)
  return [...itens.slice(0, corte), ...fim.filter(largo), ...fim.filter((t) => !largo(t))]
}

function alterna<T>(a: T[], b: T[], n: number): T[] {
  const out: T[] = []
  while (out.length < n && (a.length || b.length)) {
    const x = a.shift(); if (x !== undefined) out.push(x)
    if (out.length >= n) break
    const y = b.shift(); if (y !== undefined) out.push(y)
  }
  return out
}

/** A escalação do dia: 1/4 em cartão grande (mais que isso acaba com as imagens antes dos cartões grandes e abre buraco no fim da grade), o
 *  resto no pequeno, sempre alternando pessoa e produto, para os clipes se misturarem à vitrine sem virar bloco. O grande abre com produto e o pequeno com pessoa: a pessoa não dobra na mesma leva de cartões. */
export function clipesNovosDoDia(dia: string, lista: readonly ClipeNovo[] = CLIPES_NOVOS): { grandes: ClipeNovo[]; pequenos: ClipeNovo[] } {
  const pessoas = embaralhaDoDia(lista.filter((c) => c.pessoa), dia, 'novos-pessoa')
  const produtos = embaralhaDoDia(lista.filter((c) => !c.pessoa), dia, 'novos-produto')
  const nGrandes = Math.ceil(lista.length / 4)
  const grandes = alterna(produtos, pessoas, nGrandes)
  const pequenos = alterna(pessoas, produtos, lista.length - nGrandes)
  return { grandes, pequenos }
}
