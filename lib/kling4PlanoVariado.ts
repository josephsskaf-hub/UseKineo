// KINEO-K4-PLANO-VARIADO-1111 [CEO 11/11, alavanca 2 da proposta "de 7 para 8,5", atrás de interruptor]
// O que os filmes 8+ do revisor têm e os 7 não têm: cada fala vira uma imagem DIFERENTE. Na 2ª prova paga do 657ad797 (8,5) os três
// primeiros quadros eram o mesmo close de rosto (close dos olhos → close da mão → rosto); na prova do 2120f018 (7,5) as metades da
// cena fundida tinham como ação a própria fala abstrata ("This shot shows only this moment: This manifestation is God, not all of God.").
// Aqui, só no pedido do Kling 4 grátis (um pedido, vários planos, multi_prompt):
//   (1) escala diferente de plano para plano — aberto, médio, detalhe —, nunca dois closes seguidos. O plano com imagem-chave
//       (start_image / middle_image) não é tocado: quem decide o enquadramento dele é a imagem; ele só conta como vizinho;
//   (2) nas metades da cena fundida (lib/kling4QuatroPlanos.ts promptDaSecao), a ação passa a ser o objeto concreto da seção
//       ("Main subject of this shot: sunrise over mountains, shown in motion.") e não a fala abstrata.
// Plano que passaria de 512 com a troca fica como estava. Lib PURA. Guardião: scripts/test-k4-plano-variado-1111.mjs.

/** off = ninguém · internal = só contas da casa (isInternalEmail) · public = todo filme grátis do Kling 4. */
export type ModoPlanoVariado = 'off' | 'internal' | 'public'
export const KLING4_PLANO_VARIADO: ModoPlanoVariado = 'public' // KINEO-K4-PLANO-VARIADO-PUBLICO-1111 [CEO 11/11, régua escrita antes: nota ≥ 8,0 abre] — prova paga do 2120f018 (US$ 2,36): 7,0 (original) → 7,5 (1ª prova) → 8,0 com o plano variado; era 'internal'
export const KLING4_PLANO_VARIADO_VERSAO = 'plano_variado_1111_v1'
export const KLING4_TETO_DO_PLANO = 512

export function planoVariadoLigado(modo: ModoPlanoVariado, contaDaCasa: boolean): boolean {
  return modo === 'public' || (modo === 'internal' && contaDaCasa === true)
}

export type Escala = 'aberto' | 'medio' | 'detalhe'
const ORDEM: readonly Escala[] = ['aberto', 'medio', 'detalhe']
const NOME: Record<Escala, string> = { aberto: 'wide shot', medio: 'medium shot', detalhe: 'close-up' }

// a escala escrita no plano: a 1ª que aparece manda
const ESCALAS: ReadonlyArray<{ escala: Escala; re: RegExp }> = [
  { escala: 'detalhe', re: /\b(?:an?\s+)?(?:extreme\s+)?close[- ]?ups?(?:\s+shot)?\b|\b(?:an?\s+)?macro(?:\s+shot)?\b|\b(?:an?\s+)?detail\s+shot\b/iu },
  { escala: 'medio', re: /\b(?:an?\s+)?(?:medium|mid)(?:[- ]close)?[- ]shot\b|\bwaist[- ]up\b/iu },
  { escala: 'aberto', re: /\b(?:an?\s+)?(?:wide|establishing|long|aerial|panoramic|full)(?:[- ]angle)?\s+shot\b|\b(?:an?\s+)?aerial\s+view\b/iu },
]
// sem escala escrita, mas o assunto é parte do rosto/corpo de perto ("a tracking shot following a woman's face")
const DE_PERTO_RE = /\b(?:face|faces|eyes|lips|mouth|hands?|fingers)\b/iu

export type EscalaLida = { escala: Escala; escrita: { ini: number; fim: number } | null }

/** O plano sem a ficha ("expressive dark brown eyes") e sem a proteção do fim ("Mouth closed"), com o mesmo tamanho: nenhum dos dois é o enquadramento. */
function corpoDoPlano(prompt: string): string {
  return String(prompt ?? '').replace(/(?:Identity|Visible(?:, seen from behind)?): [^.]*\./gu, (m) => ' '.repeat(m.length))
    .replace(/,?\s*no readable text[^]*$/u, (m) => ' '.repeat(m.length))
    .replace(/Mouth closed, no speaking\.\s*$/u, (m) => ' '.repeat(m.length))
}

/** A escala do plano (a ação, depois do prefixo de meio/luz/ficha); null = nada a dizer. */
export function escalaDoPlano(prompt: string): EscalaLida | null {
  const corpo = corpoDoPlano(prompt)
  let melhor: EscalaLida | null = null
  for (const { escala, re } of ESCALAS) {
    const m = re.exec(corpo)
    if (m && (!melhor?.escrita || m.index < melhor.escrita.ini)) melhor = { escala, escrita: { ini: m.index, fim: m.index + m[0].length } }
  }
  if (melhor) return melhor
  return DE_PERTO_RE.test(corpo) ? { escala: 'detalhe', escrita: null } : null
}

const comArtigo = (alvo: Escala, original: string) => {
  const temArtigo = /^an?\s/iu.test(original)
  const nome = NOME[alvo]
  const t = temArtigo ? `a ${nome}` : nome
  return /^[A-Z]/u.test(original) ? t.charAt(0).toUpperCase() + t.slice(1) : t
}

/** O plano com a escala trocada: a escrita é substituída no lugar; sem escala escrita, a escala entra logo depois do meio ("Photoreal film."). */
export function comEscala(prompt: string, alvo: Escala, lida: EscalaLida | null): string {
  const p = String(prompt ?? '')
  if (lida?.escrita) return p.slice(0, lida.escrita.ini) + comArtigo(alvo, p.slice(lida.escrita.ini, lida.escrita.fim)) + p.slice(lida.escrita.fim)
  const frase = `${NOME[alvo].charAt(0).toUpperCase()}${NOME[alvo].slice(1)}.`
  const meio = /^[^.]{2,60}\.\s/u.exec(p)?.[0]
  return meio ? `${meio}${frase} ${p.slice(meio.length)}` : `${frase} ${p}`
}

/** A ordem de preferência da escala nova: saindo do close, o plano de mão/rosto/olhos vai ao médio (a pessoa com o objeto), o resto ao aberto. */
function preferidas(anterior: Escala | null, prompt: string): readonly Escala[] {
  if (anterior === 'detalhe' && DE_PERTO_RE.test(corpoDoPlano(prompt))) return ['medio', 'aberto', 'detalhe']
  return ORDEM
}

/** Os planos com escala diferente de vizinho para vizinho (nunca dois closes seguidos). O plano com imagem-chave fica como está. */
export function planosComEscalaVariada(prompts: readonly string[], stills: readonly (string | null)[]): { prompts: string[]; escalas: (Escala | null)[]; trocados: number[] } {
  const lidas = prompts.map(escalaDoPlano)
  const out: string[] = [], escalas: (Escala | null)[] = [], trocados: number[] = []
  let anterior: Escala | null = null
  prompts.forEach((p, i) => {
    const lida = lidas[i]
    const fixo = Boolean(stills[i])
    let alvo: Escala | null = lida?.escala ?? null
    if (!fixo && (alvo === null || alvo === anterior)) {
      const proxima = lidas[i + 1]?.escrita || stills[i + 1] ? (lidas[i + 1]?.escala ?? null) : null // a escala que o vizinho já escreveu (ou a da imagem-chave dele): não repetir
      alvo = preferidas(anterior, p).find((e) => e !== anterior && e !== proxima) ?? preferidas(anterior, p).find((e) => e !== anterior) ?? null
    }
    let novo = p
    if (!fixo && alvo && alvo !== (lida?.escala ?? null)) {
      const troca = comEscala(p, alvo, lida)
      if (Array.from(troca).length <= KLING4_TETO_DO_PLANO) { novo = troca; trocados.push(i) } else alvo = lida?.escala ?? null
    }
    out.push(novo); escalas.push(alvo); anterior = alvo
  })
  return { prompts: out, escalas, trocados }
}
