// KINEO-MONUMENTO-DURACAO-2026-10-13 — NO SEEDANCE 1.5 (35/60/90 s, MODO IA) A IMAGEM COBRE A FALA INTEIRA.
//
// Achado pós-publicação do monumento (96c67b9b), dry-run em produção, Seedance 1.5, 35 s, "Drone tour of the Palace of
// Versailles": monumento OK (4/4 cenas com o nome), mas FAIL — 4 clipes × 10 s = 40 s de imagem para 106 palavras ≈
// 43,3 s de fala; "o compose repetiria cena para fechar o tempo". Controle de mistério (86 palavras, 37,4 s) passa. Com o
// vocabulário verdadeiro do lugar preservado (KINEO-MONUMENTO-2026-10-13), a fala de monumento fica ~20% maior que a
// imagem: o escritor recebe 4 clipes decididos pela DURAÇÃO (clipCountForDuration), antes de saber quantas palavras vem.
//
// Regra do fundador: passar do alvo é bom; ficar abaixo é defeito; NUNCA amputar a fala nem repetir cena. Aqui: quando a
// fala planejada passa da imagem, a cena de MAIS palavras vira 2 planos (fronteira de frase; senão ';' ':' ','; senão o
// meio), até a imagem cobrir a fala ou o teto de clipes. Nenhuma palavra muda, sai ou é reordenada: as falas, juntas,
// são o MESMO texto. O 2º plano herda o visual da cena com outro enquadramento (é um clipe NOVO, não o mesmo repetido).
// Puro: sem I/O, sem modelo, sem import. Fala que já cabe → o plano volta idêntico (mesmos objetos, mesma ordem).

export const SEEDANCE_CLIP_SECONDS = 10
export const SEEDANCE_COBRE_MAX_CLIPES = 12
/** Plano com menos palavras que isto não se divide (vira fala de 2 s picotada). */
export const SEEDANCE_COBRE_MIN_PALAVRAS = 8
/** O enquadramento novo do 2º plano de uma cena dividida (o visual é o da cena; o clipe é outro). */
export const SEEDANCE_COBRE_VARIACAO = ' A different camera angle from the previous shot of the same subject: closer on a new detail.'

const palavrasDe = (t?: string | null) => String(t ?? '').trim().split(/\s+/).filter(Boolean)

/** Índice da palavra que ABRE a 2ª metade: fronteira de frase mais perto do meio; senão pausa (; : ,); senão o meio. */
export function pontoDeCorte(palavras: ReadonlyArray<string>): number | null {
  const n = palavras.length
  if (n < SEEDANCE_COBRE_MIN_PALAVRAS) return null
  const meio = n / 2
  const minimo = Math.max(3, Math.floor(n * 0.25))
  const candidatos = (re: RegExp) => {
    let melhor: number | null = null
    for (let i = minimo; i <= n - minimo; i++) {
      if (!re.test(palavras[i - 1])) continue
      if (melhor === null || Math.abs(i - meio) < Math.abs(melhor - meio)) melhor = i
    }
    return melhor
  }
  return candidatos(/[.!?…]["”')]*$/) ?? candidatos(/[;:,—–]["”')]*$/) ?? Math.round(meio)
}

export interface CenaSeedance { voiceover: string; caption?: string; description?: string; stockSearchQuery?: string; aiPrompt?: string }
export interface CoberturaDaFala<T> {
  cenas: T[]
  /** índice de origem (0-based) de cada plano, para remapear conjuntos indexados por cena */
  origem: number[]
  /** cenas de origem (1-based) que viraram 2+ planos */
  divididas: number[]
  palavras: number
  fala_s: number
  imagem_antes_s: number
  imagem_depois_s: number
  /** true = mesmo depois do teto/das cenas curtas a imagem não cobre (o ensaio continua apontando) */
  ainda_curta: boolean
}

/**
 * A fala planejada cabe na imagem (n × 10 s)? Se não, divide a cena de mais palavras até caber ou bater o teto.
 * `fazerCena(base, fala, segundaParte)` monta o plano novo (caption etc. ficam com quem chama). Fala que cabe → `cenas`
 * é o MESMO array recebido.
 */
export function cobrirFalaComImagem<T extends CenaSeedance>(
  cenas: T[],
  opts: { wordsPerSecond: number; secondsPerClip?: number; maxClips?: number; fazerCena: (base: T, fala: string, segundaParte: boolean) => T },
): CoberturaDaFala<T> {
  const passo = opts.secondsPerClip && opts.secondsPerClip > 0 ? opts.secondsPerClip : SEEDANCE_CLIP_SECONDS
  const teto = Math.max(cenas.length, opts.maxClips && opts.maxClips > 0 ? opts.maxClips : SEEDANCE_COBRE_MAX_CLIPES)
  const wps = opts.wordsPerSecond > 0 ? opts.wordsPerSecond : 2.5
  const palavras = cenas.reduce((a, c) => a + palavrasDe(c.voiceover).length, 0)
  const fala = Math.round((palavras / wps) * 10) / 10 // ≡ classicDryRunReport (round1)
  const antes = cenas.length * passo
  const base = { palavras, fala_s: fala, imagem_antes_s: antes }
  if (cenas.length === 0 || antes >= fala) return { cenas, origem: cenas.map((_, i) => i), divididas: [], ...base, imagem_depois_s: antes, ainda_curta: false }
  let planos = cenas.map((c, i) => ({ cena: c, origem: i }))
  const divididas = new Set<number>()
  while (planos.length * passo < fala && planos.length < teto) {
    let alvo = -1
    let maior = 0
    planos.forEach((p, k) => { const w = palavrasDe(p.cena.voiceover).length; if (w > maior) { maior = w; alvo = k } })
    const ws = alvo >= 0 ? palavrasDe(planos[alvo].cena.voiceover) : []
    const corte = pontoDeCorte(ws)
    if (alvo < 0 || corte === null) break
    const p = planos[alvo]
    const a = opts.fazerCena(p.cena, ws.slice(0, corte).join(' '), false)
    const b = opts.fazerCena(p.cena, ws.slice(corte).join(' '), true)
    planos = [...planos.slice(0, alvo), { cena: a, origem: p.origem }, { cena: b, origem: p.origem }, ...planos.slice(alvo + 1)]
    divididas.add(p.origem + 1)
  }
  const depois = planos.length * passo
  return { cenas: planos.map((p) => p.cena), origem: planos.map((p) => p.origem), divididas: [...divididas].sort((x, y) => x - y), ...base, imagem_depois_s: depois, ainda_curta: depois < fala }
}
