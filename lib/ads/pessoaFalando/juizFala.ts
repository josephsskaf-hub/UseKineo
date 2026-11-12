// KINEO-ADS-PESSOA-FALANDO-1111 — passo D da spec: o juiz da fala pela TRANSCRIÇÃO do áudio do clipe (whisper-1, verbose_json com palavras). Aprova
// quando: ≥ 85% das palavras da fala aparecem NA ORDEM; nenhuma palavra/expressão repetida em sequência que a fala não tem (o Halo saiu "…and honestly,
// honestly, I'm buying two."); a fala começa até 0,7 s; o clipe dura o pedido ± 0,3 s. Puro: recebe a transcrição pronta.

export interface Transcricao { texto: string; inicio?: number | null }
export interface VeredictoFala { aprovado: boolean; motivos: string[]; cobertura: number }

const tokens = (t: string) => String(t ?? '').toLowerCase().replace(/[’']/gu, "'").match(/[\p{L}\p{N}']+/gu) ?? []

/** Quantas palavras da fala aparecem na transcrição, na ordem (maior subsequência comum) ÷ palavras da fala. */
export function coberturaNaOrdem(fala: string, ouvido: string): number {
  const a = tokens(fala), b = tokens(ouvido)
  if (!a.length) return 0
  const prev = new Array(b.length + 1).fill(0)
  for (let i = 1; i <= a.length; i++) {
    let diag = 0
    for (let j = 1; j <= b.length; j++) { const tmp = prev[j]; prev[j] = a[i - 1] === b[j - 1] ? diag + 1 : Math.max(prev[j], prev[j - 1]); diag = tmp }
  }
  return prev[b.length] / a.length
}

/** Repetições em sequência no ouvido que a fala não tem ("honestly, honestly"; "the ice the ice"), de 1 a 3 palavras. */
export function repeticoes(fala: string, ouvido: string): string[] {
  const b = tokens(ouvido), alvo = ` ${tokens(fala).join(' ')} `, achou: string[] = []
  for (let n = 1; n <= 3; n++) for (let i = 0; i + 2 * n <= b.length; i++) {
    const x = b.slice(i, i + n).join(' '), y = b.slice(i + n, i + 2 * n).join(' ')
    if (x === y && !alvo.includes(` ${x} ${x} `)) achou.push(x)
  }
  return [...new Set(achou)]
}

export function juizDaFala(i: { fala: string; transcricao: Transcricao; segundosPedidos: number; segundosDoClipe: number }): VeredictoFala {
  const motivos: string[] = []
  const cobertura = coberturaNaOrdem(i.fala, i.transcricao.texto)
  if (cobertura < 0.85) motivos.push(`cobertura_${Math.round(cobertura * 100)}`)
  for (const r of repeticoes(i.fala, i.transcricao.texto)) motivos.push(`repetiu_${r}`)
  if (typeof i.transcricao.inicio === 'number' && i.transcricao.inicio > 0.7) motivos.push(`comeca_${i.transcricao.inicio.toFixed(2)}s`)
  if (!(Math.abs(Number(i.segundosDoClipe) - Number(i.segundosPedidos)) <= 0.3)) motivos.push(`duracao_${i.segundosDoClipe}_de_${i.segundosPedidos}`)
  return { aprovado: motivos.length === 0, motivos, cobertura }
}
