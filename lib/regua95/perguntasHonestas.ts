// KINEO-JUIZ-PERGUNTAS-0311 [TRAVA 8.2 — fundador 03/11: "vamos pegar todos esses defeitos que já são conhecidos e arrumar todos, universalizar"]
// O que o filme PEDIA, lido do texto que foi de fato à fal (prompt de cada cena) e, na falta dele, das palavras da história:
//   · a ÉPOCA ("Period setting: 1950 (1950s)", a marca que lib/cinematic/elencoEpoca aplicarEpoca põe no prompt; reserva =
//     epocaDaHistoria sobre pedido + narração, a mesma régua da rota);
//   · as cenas SEM GENTE (a cláusula CLAUSULA_SEM_GENTE de lib/cinematic/personagemAjuste: "No people, no human figures and no
//     faces anywhere in this shot.");
//   · o ESTILO travado do filme ("Film visual medium: …" de lib/cinematic/filmQuality travarEstiloDoFilme; "Style: photoreal." no
//     compacto).
// Por que (docs/revisao-videos/FILA-DEFEITOS.md, 03/11): o pixel_score deu 100 ao piloto de 1950 de jeans (gustavoq) e 98 à planta
// parada 8 s (raisajan); ninguém perguntava "algo depois de {ano}?", "pessoa onde não devia?" nem "plano parado?". Este módulo é
// puro (sem rede): só lê texto. Quem pergunta é o juiz de visão que JÁ roda (lib/regua95/pixelScore.ts) — nenhuma chamada nova.
// O crítico do still (lib/cinematic/criticoStill.ts) tem as MESMAS três leituras em código próprio (o guardião dele proíbe
// import novo); scripts/test-juiz-perguntas-0311.mjs prova que as duas leituras concordam nos mesmos textos.
import { epocaDaHistoria } from '@/lib/cinematic/elencoEpoca'

export const MARCA_JUIZ_PERGUNTAS_0311 = 'KINEO-JUIZ-PERGUNTAS-0311'
export const SEM_GENTE_NO_PROMPT_0311 = 'No people, no human figures and no faces anywhere in this shot'
/** Códigos novos do juiz de visão (só existem com perguntasHonestas). */
export const PIXEL_ISSUES_0311 = ['anachronism', 'invented_person', 'static'] as const
export type EstiloPedido0311 = 'foto' | 'desenho' | null

const limpa = (t: unknown) => String(t ?? '').replace(/\s+/g, ' ').trim()

/** "Period setting: 1950 (1950s)" → "1950"; "Period setting: the 1950s" → "the 1950s"; sem a marca → null. */
export function epocaDoPrompt0311(prompt: unknown): string | null {
  const m = /Period setting:\s*([^.;]+)/i.exec(String(prompt ?? ''))
  if (!m) return null
  const trecho = limpa(m[1])
  const ano = /\b(1[89]\d{2}|200\d)\b(?!s)/.exec(trecho)
  if (ano) return ano[1]
  const rotulo = /\b(?:the\s+)?(1[89]\d0s|200\ds|\d{2}th-century)\b/i.exec(trecho)
  return rotulo ? `the ${rotulo[1]}` : null
}

/** A cena pediu "sem gente"? (a cláusula exata do construtor de prompt) */
export function semGenteNoPrompt0311(prompt: unknown): boolean {
  return String(prompt ?? '').includes(SEM_GENTE_NO_PROMPT_0311)
}

/** O estilo que o filme travou: 'foto' (photoreal/noir), 'desenho' (3D animado, anime, ilustração) ou null (não declarado). */
export function estiloDoPrompt0311(prompt: unknown): EstiloPedido0311 {
  const p = String(prompt ?? '')
  const medio = /Film visual medium:\s*([^\n]+?)\.\s/i.exec(p + ' ')?.[1] ?? /^(?:Style:|Chosen)\s*([\w ]+?)(?:\.|\s+still:)/i.exec(p)?.[1] ?? ''
  if (!medio) return null
  if (/not photorealistic|animated|animation|anime|cartoon|illustrat|cel shading/i.test(medio)) return 'desenho'
  if (/photoreal|noir|live[- ]action/i.test(medio)) return 'foto'
  return null
}

export type ContextoPerguntas0311 = {
  /** "1950" / "the 1950s"; null = história de hoje ou época mista */
  epoca: string | null
  /** cenas (1-based, na ordem das falas) que pedem "sem gente" */
  cenasSemGente: number[]
  /** todas as cenas conhecidas pedem "sem gente" */
  todasSemGente: boolean
  estilo: EstiloPedido0311
}

/** A leitura do filme inteiro: o prompt das cenas manda; sem a marca de época, as palavras da história (a régua da rota). */
export function contextoDasPerguntas0311(c: { asked?: string | null; narration?: string | null; promptByScene?: ReadonlyArray<string> | null }): ContextoPerguntas0311 {
  const prompts = (c.promptByScene ?? []).map((p) => String(p ?? ''))
  let epoca: string | null = null
  for (const p of prompts) { epoca = epocaDoPrompt0311(p); if (epoca) break }
  if (!epoca) {
    const e = epocaDaHistoria(`${String(c.asked ?? '')}\n${String(c.narration ?? '')}`)
    if (e) epoca = e.ano !== null ? String(e.ano) : `the ${e.rotulo}`
  }
  const cenasSemGente = prompts.map((p, i) => (semGenteNoPrompt0311(p) ? i + 1 : 0)).filter((n) => n > 0)
  let estilo: EstiloPedido0311 = null
  for (const p of prompts) { estilo = estiloDoPrompt0311(p); if (estilo) break }
  return { epoca, cenasSemGente, todasSemGente: prompts.length > 0 && cenasSemGente.length === prompts.length, estilo }
}

/**
 * As perguntas novas, positivas (sim/não por quadro), anexadas ao sistema do juiz de visão que já roda. `porCena` = o juiz sabe
 * casar quadro × cena (há a fala por cena na mesma ordem); sem isso só a regra "nenhuma cena tem gente" é perguntada.
 */
export function rubricaHonesta0311(c: ContextoPerguntas0311, porCena: boolean): string {
  const partes: string[] = [
    ' EXTRA CHECKS, for every frame:',
    ' (i) TEXT — our burned-in captions of the NARRATION are expected; a SECOND subtitle line or caption block whose words are not in the narration, a watermark or logo other than the expected editor overlay, or letters generated inside the scene (signs, screens, papers, packaging) are invented_text.',
    ' (ii) STYLE — a recurring character or the main subject switching rendering style between frames (photographic live action vs cartoon, 3D animation, plush toy, doll, figurine, clay or illustration) is an identity change even when colour and species match: list it in identity_changes.' +
      (c.estilo === 'foto' ? ' This film is photorealistic live action.' : c.estilo === 'desenho' ? ' This film is animated (not photographic).' : ''),
    ' (iii) STATIC — add "static" to a frame that shows the same framing, the same subject and the same pose as the previous frame, with no visible motion (a frozen or nearly frozen shot).',
  ]
  if (c.epoca) partes.push(` (iv) ERA — the story is set in ${c.epoca}: add "anachronism" to a frame where something clearly visible was invented or became fashionable only after ${c.epoca}: jeans or denim, hoodies, sneakers, puffer jackets, modern streetwear or haircuts, a smartwatch or modern wristwatch, a smartphone, earbuds, a present-day car, LED screens or lights (period-accurate items are fine; when unsure, do not add it).`)
  if (c.todasSemGente) partes.push(' (v) NO PEOPLE — no shot of this film shows people: add "invented_person" to a frame where a person, human figure or face is clearly visible (a tiny distant silhouette is fine).')
  else if (porCena && c.cenasSemGente.length > 0) partes.push(` (v) NO PEOPLE — shot(s) ${c.cenasSemGente.join(', ')} (same order as the spoken lines) show no people: add "invented_person" to a frame of those shots where a person, human figure or face is clearly visible (a tiny distant silhouette is fine).`)
  const codigos = ['static', ...(c.epoca ? ['anachronism'] : []), ...(c.todasSemGente || (porCena && c.cenasSemGente.length > 0) ? ['invented_person'] : [])]
  partes.push(` Extra issue codes you may also use: ${codigos.join(', ')}.`)
  return partes.join('')
}

/** Segundos do plano parado mais longo: quadros seguidos marcados "static" (ou "repeated") em relação ao anterior, pelo tempo medido. */
export function segundosParados0311(frames: ReadonlyArray<{ t: number | null; issues: ReadonlyArray<string> }>): number {
  let melhor = 0
  let inicio: number | null = null
  for (let k = 1; k < frames.length; k++) {
    const f = frames[k], antes = frames[k - 1]
    const parado = f.issues.includes('static') || f.issues.includes('repeated')
    if (parado && typeof f.t === 'number' && typeof antes.t === 'number') {
      if (inicio === null) inicio = antes.t
      melhor = Math.max(melhor, f.t - inicio)
    } else inicio = null
  }
  return Math.round(melhor * 10) / 10
}
