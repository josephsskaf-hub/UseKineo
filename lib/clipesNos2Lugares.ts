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
  engine: 'seedance' | 'hollywood' | 'h3'
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
  // KINEO-CLIPES-E-CARDS-0511 [fundador 05/11: "5 clips aprovados, viram vitrine"; "outros modelos de ugc"] — feitos no H3 Max Turbo pela rota interna /api/admin/engine-test; clipId = fal:<pedido>, sem linha na tabela `clips`.
  { id: 'pet-barista', title: 'Dog barista', engine: 'h3', clipId: 'fal:01a1ae37-2f30-7d63-ab53-52234e4ed8c8', focus: '50% 55%', pessoa: true, prompt: null }, // KINEO-CLIPES-E-CARDS-0511
  { id: 'virada-natal', title: 'Christmas sweater flip', engine: 'h3', clipId: 'fal:01a1ae37-2ed6-7493-acb9-3b42c05aae15', focus: '50% 88%', pessoa: true, prompt: null }, // KINEO-CLIPES-E-CARDS-0511
  { id: 'adeus-2026', title: 'Goodbye 2026, hello 2027', engine: 'h3', clipId: 'fal:01a1ae37-3613-75f0-9c89-7722df1bcb94', focus: '50% 45%', pessoa: true, prompt: null }, // KINEO-CLIPES-E-CARDS-0511
  { id: 'bebe-danca', title: 'Baby kitchen dance', engine: 'h3', clipId: 'fal:01a1ae37-3003-76e1-8031-e5613d253e39', focus: '50% 70%', pessoa: true, prompt: null }, // KINEO-CLIPES-E-CARDS-0511
  { id: 'glow-up', title: 'The glow-up reveal', engine: 'h3', clipId: 'fal:01a1ae37-7f7f-7d42-a0d3-18662c36f1f1', focus: '50% 55%', pessoa: true, prompt: null }, // KINEO-CLIPES-E-CARDS-0511
  { id: 'ugc-homem-cafe', title: 'Coffee review', engine: 'h3', clipId: 'fal:01a1ae37-7de0-7b91-8927-ac13fd481ed5', focus: '50% 40%', pessoa: true, prompt: null }, // KINEO-CLIPES-E-CARDS-0511
  { id: 'ugc-idosa-creme', title: 'Face cream review', engine: 'h3', clipId: 'fal:01a1ae37-8225-7641-855d-7b77d62f0a06', focus: '50% 25%', pessoa: true, prompt: null }, // KINEO-CLIPES-E-CARDS-0511
  { id: 'ugc-indiano-fone', title: 'Headphones walk', engine: 'h3', clipId: 'fal:01a1ae37-80fa-7e73-861a-ab40bb2e13c3', focus: '50% 55%', pessoa: true, prompt: null }, // KINEO-CLIPES-E-CARDS-0511
  { id: 'produto-tenis-rua', title: 'Sneaker at sunrise', engine: 'h3', clipId: 'fal:01a1ae37-d069-7270-93f7-f0332a0e4d7c', focus: '50% 50%', pessoa: false, prompt: null }, // KINEO-CLIPES-E-CARDS-0511
  { id: 'produto-perfume-marmore', title: 'Perfume in morning light', engine: 'h3', clipId: 'fal:01a1ae37-ca14-7463-8c1b-6bc50ab14e8b', focus: '50% 65%', pessoa: false, prompt: null }, // KINEO-CLIPES-E-CARDS-0511
  { id: 'produto-burger-mesa', title: 'The burger close-up', engine: 'h3', clipId: 'fal:01a1ae37-cdde-74c1-acd8-a8dc4054634e', focus: '50% 75%', pessoa: false, prompt: null }, // KINEO-CLIPES-E-CARDS-0511
  { id: 'flying-burger', title: 'Flying burger', engine: 'seedance', clipId: 'b248db19-c3fb-4b08-878c-1d10d3b9af7b', focus: '50% 40%', pessoa: false, prompt: 'Vertical commercial food shot, one continuous shot. Super slow motion: a juicy cheeseburger assembles itself in mid-air against a warm dark orange background. The toasted sesame bun, grilled patty, melting cheese, lettuce, tomato and red onion fall from above one after another and land in a perfect stack in the centre of the frame, melted cheese stretches and drips, sesame seeds and tiny crumbs bounce in the air, the camera pushes in slowly. Crisp studio light, rich appetising colours, high-end fast food commercial. No text, no letters, no logos, no packaging, no hands, no people.' },
  { id: 'spinning-headphones', title: 'Spinning headphones', engine: 'seedance', clipId: '6e6b1249-69c9-4036-b2b3-36e5c157dda1', focus: '50% 43%', pessoa: false, prompt: 'Vertical commercial tech product shot, one continuous shot. Matte black over-ear wireless headphones, completely plain with no logos and no markings, spin slowly in mid-air in the centre of the frame against a deep electric blue background. They rotate a full turn, soft neon cyan and magenta light slides across the curves, the ear cups open outward and fold back, tiny glowing dust particles drift past, the camera pushes in slowly. Crisp studio light, sleek high-end tech commercial. The headphones keep the same shape throughout. No text, no letters, no logos, no hands, no people.' },
  { id: 'perfume-splash', title: 'Perfume splash', engine: 'hollywood', clipId: 'c9d321e0-0fe4-44b7-871b-2407a55bec91', focus: '50% 55%', pessoa: false, prompt: 'Vertical luxury perfume commercial, one continuous shot, no cuts. Super slow motion: one square glass perfume bottle with a gold cap and amber liquid, completely blank with no label, plunges into deep turquoise water from above, a huge crown of water erupts around it, thousands of silver bubbles rush upward, the bottle rotates slowly in the centre of the frame and catches golden light, the camera pushes in. The bottle keeps exactly the same shape and stays sharp. Rich saturated colours, high-end fragrance film. No text, no letters, no logos, no hands, no people.' },
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
