// KINEO-BANCO-PROVA-2710 [TRAVA 8.2 — vai do fundador 27/10 "aprovo banco"] — a comparação da rodada com a baseline.
// Puro (sem rede, sem fs): rodar.mjs usa para decidir o exit code; scripts/test-banco-prova-2710.mjs o executa com fixtures.
//
// REGRA DO BLOQUEIO (exit ≠ 0 na publicação):
//   1. o TOTAL (média das notas dos casos que têm nota) caiu mais que a tolerância (padrão 1 ponto) em relação à baseline
//      — comparado só sobre os casos presentes nas duas (uma rodada parcial `--casos` não perde para o resto do banco);
//   2. algum caso REGREDIU abaixo do seu limiar: na baseline estava ≥ limiar e agora está < limiar — ou tinha nota e agora
//      só tem erro (rota caiu, sem still, 403…).
// Caso NOVO (sem baseline) nunca bloqueia; caso que já estava abaixo do limiar e continua abaixo é aviso, não bloqueio
// (o bloqueio mede REGRESSÃO; o que já era ruim entra na pauta, não na trava). Caso sumido da rodada é aviso.
export const LIMIAR_PADRAO = 60
export const TOLERANCIA_PADRAO = 1

const num = (x) => (typeof x === 'number' && Number.isFinite(x) ? x : null)
const r1 = (x) => Math.round(x * 10) / 10

/** Média (1 casa) das notas não nulas; null se nenhuma. */
export function totalDaRodada(casos) {
  const notas = (casos ?? []).map((c) => num(c?.nota)).filter((n) => n !== null)
  return notas.length ? r1(notas.reduce((a, b) => a + b, 0) / notas.length) : null
}

export function limiarDoCaso(caso, padrao = LIMIAR_PADRAO) {
  const l = num(caso?.limiar)
  return l !== null && l >= 0 && l <= 100 ? l : padrao
}

/**
 * @param atual  { casos: [{ id, nota, limiar?, erro? }], total? }
 * @param base   idem ou null (sem baseline)
 * @returns { bloqueia, motivos[], regressoes[], avisos[], novos[], sumidos[], total_atual, total_base, total_base_comparavel, queda }
 */
export function compararRodadas(atual, base, opts = {}) {
  const tolerancia = num(opts.tolerancia) ?? TOLERANCIA_PADRAO
  const limiarPadrao = num(opts.limiarPadrao) ?? LIMIAR_PADRAO
  const casosAtual = Array.isArray(atual?.casos) ? atual.casos : []
  const casosBase = Array.isArray(base?.casos) ? base.casos : []
  const porIdBase = new Map(casosBase.map((c) => [String(c?.id ?? ''), c]))
  const porIdAtual = new Map(casosAtual.map((c) => [String(c?.id ?? ''), c]))
  const regressoes = []
  const avisos = []
  const novos = []
  for (const c of casosAtual) {
    const id = String(c?.id ?? '')
    const limiar = limiarDoCaso(c, limiarPadrao)
    const na = num(c?.nota)
    const b = porIdBase.get(id)
    if (!b) { novos.push(id); if (na === null) avisos.push(`${id}: novo e sem nota (${c?.erro ?? 'erro'})`); else if (na < limiar) avisos.push(`${id}: novo e abaixo do limiar (${na} < ${limiar})`); continue }
    const nb = num(b?.nota)
    if (na === null) {
      if (nb !== null) regressoes.push({ id, nota_base: nb, nota_atual: null, limiar, motivo: `tinha nota ${nb} e agora só erro (${c?.erro ?? 'sem nota'})` })
      else avisos.push(`${id}: sem nota nas duas rodadas (${c?.erro ?? 'erro'})`)
      continue
    }
    if (nb !== null && nb >= limiar && na < limiar) regressoes.push({ id, nota_base: nb, nota_atual: na, limiar, motivo: `caiu de ${nb} para ${na} (limiar ${limiar})` })
    else if (na < limiar) avisos.push(`${id}: continua abaixo do limiar (${nb ?? '—'} → ${na} < ${limiar})`)
  }
  const sumidos = casosBase.map((c) => String(c?.id ?? '')).filter((id) => id && !porIdAtual.has(id))
  for (const id of sumidos) avisos.push(`${id}: estava na baseline e não rodou`)
  const totalAtual = totalDaRodada(casosAtual)
  const totalBase = base ? totalDaRodada(casosBase) : null
  const totalBaseComparavel = base ? totalDaRodada(casosBase.filter((c) => porIdAtual.has(String(c?.id ?? '')))) : null
  const queda = totalAtual !== null && totalBaseComparavel !== null ? r1(totalBaseComparavel - totalAtual) : null
  const motivos = []
  if (queda !== null && queda > tolerancia) motivos.push(`total caiu ${queda} pontos (${totalBaseComparavel} → ${totalAtual}; tolerância ${tolerancia})`)
  for (const r of regressoes) motivos.push(`${r.id}: ${r.motivo}`)
  return { bloqueia: motivos.length > 0, motivos, regressoes, avisos, novos, sumidos, total_atual: totalAtual, total_base: totalBase, total_base_comparavel: totalBaseComparavel, queda, tolerancia, limiar_padrao: limiarPadrao }
}

const falhasTxt = (f) => Object.entries(f ?? {}).filter(([, n]) => n > 0).map(([k, n]) => `${k}×${n}`).join(' ') || '—'

/** Tabela markdown da rodada (uma linha por caso) + o veredito da comparação. */
export function tabelaMarkdown(rodada, comparacao) {
  const base = new Map((comparacao?.casos_base ?? []).map((c) => [c.id, c]))
  const linhas = ['| caso | idioma | nota | crítico | expectativas | falhas | stills | base | estado |', '|---|---|---:|---:|---:|---|---:|---:|---|']
  const reg = new Set((comparacao?.regressoes ?? []).map((r) => r.id))
  for (const c of rodada?.casos ?? []) {
    const nota = num(c.nota)
    const limiar = limiarDoCaso(c, comparacao?.limiar_padrao)
    const estado = c.erro && nota === null ? `ERRO ${c.erro}` : reg.has(c.id) ? 'REGREDIU' : nota !== null && nota < limiar ? 'abaixo' : (comparacao?.novos ?? []).includes(c.id) ? 'novo' : 'ok'
    const exp = c.expectativas_aplicaveis ? `${c.expectativas_cumpridas}/${c.expectativas_aplicaveis}` : '—'
    linhas.push(`| ${c.id} | ${c.idioma ?? ''} | ${nota ?? '—'} | ${num(c.nota_critico) ?? '—'} | ${exp} | ${falhasTxt(c.falhas)} | ${c.cenas_com_still ?? '—'}/${c.cenas ?? '—'} | ${num(base.get(c.id)?.nota) ?? '—'} | ${estado} |`)
  }
  const cab = [
    `# Banco de pedidos-prova — rodada ${rodada?.quando ?? ''}`,
    '',
    `URL: ${rodada?.url ?? ''} · casos: ${(rodada?.casos ?? []).length} · total: **${comparacao?.total_atual ?? totalDaRodada(rodada?.casos)}**` + (comparacao?.total_base_comparavel !== null && comparacao?.total_base_comparavel !== undefined ? ` (baseline comparável ${comparacao.total_base_comparavel}, queda ${comparacao.queda})` : ' (sem baseline)') + ` · custo estimado US$ ${num(rodada?.custo_usd)?.toFixed(2) ?? '—'}`,
    '',
    comparacao ? (comparacao.bloqueia ? `## BLOQUEIA a publicação\n${comparacao.motivos.map((m) => `- ${m}`).join('\n')}` : '## Libera a publicação (nenhuma regressão)') : '## Sem baseline — nada a comparar',
    '',
  ]
  const av = (comparacao?.avisos ?? []).length ? ['', '### Avisos', ...comparacao.avisos.map((a) => `- ${a}`)] : []
  return [...cab, ...linhas, ...av, ''].join('\n')
}
